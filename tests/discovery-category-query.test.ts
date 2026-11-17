import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runtimeService } from './helpers/runtime-service';
import { buildDefaultDiscoveryFilters, matchesJobDiscoveryFilters } from '@/utils/discovery-session';
import type { JobSummary } from '@/types/marketplace.types';

type Row = { id: string; owner_id: string; client_id: string; status: string; title: string; category: string | null; service_needed: string | null; budget_min: number; budget_max: number };
type Filters = { discoveryCategory?: string; discoveryWorkType?: string; serviceNeeded?: string; serviceNeededIn?: string[]; text?: string; budgetMin?: number; budgetMax?: number; limit?: number; excludeUserId?: string };

function fixture(rows: Row[]) {
  const operations: string[] = [];
  const supabase = { from(table: string) {
    let selected = ''; let limit = Infinity; const predicates: ((row: Row) => boolean)[] = [];
    const q = {
      select(value: string) { selected = value; return q; },
      order() { return q; },
      in(field: keyof Row, values: string[]) { predicates.push(row => values.includes(String(row[field]))); return q; },
      neq(field: keyof Row, value: string) { predicates.push(row => row[field] !== value); return q; },
      eq(field: keyof Row, value: string) { predicates.push(row => row[field] === value); return q; },
      gte(field: keyof Row, value: number) { predicates.push(row => Number(row[field]) >= value); return q; },
      lte(field: keyof Row, value: number) { predicates.push(row => Number(row[field]) <= value); return q; },
      or(expression: string) {
        operations.push(expression);
        if (expression.startsWith('category.in.') || expression.startsWith('service_needed.in.')) {
          const match = /^category\.in\.\((.*?)\),service_needed\.in\.\((.*?)\)$/.exec(expression);
          const restricted = /^service_needed\.in\.\((.*?)\),and\(service_needed\.is\.null,category\.in\.\((.*?)\)\)$/.exec(expression);
          assert.ok(match || restricted, 'category clauses must be one grouped OR');
          const parse = (value: string) => Array.from(value.matchAll(/"((?:\\.|[^"\\])*)"/g), item => item[1].replace(/\\([\\"])/g, '$1'));
          const categories = parse(match ? match[1] : restricted![2]); const services = parse(match ? match[2] : restricted![1]);
          predicates.push(row => services.includes(row.service_needed ?? '') || ((!restricted || row.service_needed === null) && categories.includes(row.category ?? '')));
        } else {
          const match = /title\.ilike\.%([^%]*)%/.exec(expression); assert.ok(match);
          const text = match[1].toLowerCase();
          predicates.push(row => [row.title, row.category, row.service_needed].some(value => value?.toLowerCase().includes(text)));
        }
        return q;
      },
      limit(value: number) { operations.push('limit'); limit = value; return q; },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        const data = table === 'jobs' && selected.includes('description') ? rows.filter(row => predicates.every(test => test(row))).slice(0, limit) : [];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    }; return q;
  } };
  const service = runtimeService<{ searchJobs(filters: Filters): Promise<{ data: { id: string }[] | null; error: string | null }> }>('@/services/job.service', {
    '@/utils/supabase': { supabase },
    '@/services/marketplace.helpers': { compactText: (v: string | undefined) => v?.trim() ?? '', getCurrentUserId: async () => ({ data: null }), doesRateOverlap: () => true, loadPublicProfiles: async () => new Map(), mapJob: (row: Row) => ({ id: row.id, clientId: row.client_id, client: {} }), isPublicProfileVerified: () => true },
    '@/services/content-visibility.service': { applyPublicPhotoVisibilityToRows: async (value: Row[]) => value },
    '@/services/profile-completion.service': {},
  });
  return { service, operations };
}
const row = (id: string, category: string | null, service_needed: string | null, overrides: Partial<Row> = {}): Row => ({ id, category, service_needed, owner_id: 'other', client_id: 'other', status: 'open', title: 'Help needed', budget_min: 200, budget_max: 500, ...overrides });

it('broad inherited category matches legacy category and aliases before the limit, while other filters stay ANDed', async () => {
  const irrelevant = Array.from({ length: 80 }, (_, i) => row('other' + i, 'Food & Personal Services', 'Baking'));
  const { service, operations } = fixture([...irrelevant, row('legacy', 'Home & Local Help', null), row('alias', 'House cleaning', null), row('canonical', null, 'Cleaning'), row('excluded', 'Home & Local Help', null, { owner_id: 'self' }), row('expensive', 'Home & Local Help', null, { budget_min: 1000, budget_max: 1200 })]);
  const result = await service.searchJobs({ discoveryCategory: 'Home & Local Help', text: 'help', budgetMax: 700, excludeUserId: 'self', limit: 3 });
  assert.equal(result.error, null); assert.deepEqual(Array.from(result.data ?? [], item => item.id), ['legacy', 'alias', 'canonical']);
  assert.ok(operations[0].startsWith('category.in.')); assert.ok(operations.indexOf('limit') > 0);
});

it('specific service selection does not widen to the broad category', async () => {
  const { service } = fixture([row('legacy', 'Home & Local Help', null), row('cleaning', 'Home & Local Help', 'Cleaning'), row('carpentry', 'Home & Local Help', 'Carpentry')]);
  const result = await service.searchJobs({ discoveryCategory: 'Home & Local Help', serviceNeeded: 'Cleaning' });
  assert.deepEqual(Array.from(result.data ?? [], item => item.id), ['cleaning']);
});

it('client filtering recognizes both category and service aliases without relaxing refinements', () => {
  const filters = { ...buildDefaultDiscoveryFilters(), category: 'Home & Local Help' as const };
  const job = (category: string | null, serviceNeeded: string | null) => ({ category, serviceNeeded } as JobSummary);
  assert.equal(matchesJobDiscoveryFilters(job('Home & Local Help', null), filters), true);
  assert.equal(matchesJobDiscoveryFilters(job('House cleaning', null), filters), true);
  assert.equal(matchesJobDiscoveryFilters(job('House cleaning', null), { ...filters, workType: 'physical' }), true);
  assert.equal(matchesJobDiscoveryFilters(job(null, 'House cleaning'), filters), true);
  assert.equal(matchesJobDiscoveryFilters(job('Food & Personal Services', 'Baking'), filters), false);
  assert.equal(matchesJobDiscoveryFilters(job('Home & Local Help', null), { ...filters, workType: 'digital' }), false);
  assert.equal(matchesJobDiscoveryFilters(job('Home & Local Help', null), { ...filters, serviceGroup: 'Home & Errands' }), false);
});

it('work type is applied before the limit, including null-service legacy category aliases', async () => {
  const wrong = Array.from({ length: 80 }, (_, i) => row('digital' + i, 'Learning & Digital Help', 'Encoding'));
  const { service } = fixture([...wrong, row('inconsistent', 'Tutoring', 'Encoding'), row('tutoring', 'Learning & Digital Help', 'Tutoring'), row('legacy', 'Tutoring', null)]);
  const result = await service.searchJobs({ discoveryCategory: 'Learning & Digital Help', discoveryWorkType: 'physical', limit: 2 });
  assert.deepEqual(Array.from(result.data ?? [], item => item.id), ['tutoring', 'legacy']);
});
