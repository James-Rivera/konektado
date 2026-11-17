import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runtimeService } from './helpers/runtime-service';

function fixture() {
  const failures = new Set<string>();
  const rows: Record<string, unknown> = { profiles: { first_name: 'Ana', last_name: 'Cruz' }, user_preferences: { intent: 'provider', offered_services: [] }, user_roles: [], provider_profiles: { service_type: 'Cleaning' } };
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: 'a', user_metadata: {} } }, error: null }) }, from(table: string) {
    const q = { select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; }, maybeSingle() { return q; }, then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) { return Promise.resolve({ data: failures.has(table) ? null : rows[table], error: failures.has(table) ? { message: 'offline' } : null }).then(resolve, reject); } }; return q;
  } };
  const service = runtimeService<{ loadOnboardingDraft(): Promise<{ data: unknown; error: string | null }> }>('@/services/onboarding.service', { '@/utils/supabase': { supabase }, '@/services/session.service': {}, '@/utils/save-role': {} });
  return { service, failures };
}
for (const table of ['profiles', 'user_preferences', 'user_roles', 'provider_profiles']) {
  it(`draft read failure for ${table} blocks editing and succeeds on retry`, async () => {
    const { service, failures } = fixture(); failures.add(table);
    const failed = await service.loadOnboardingDraft(); assert.equal(failed.data, null); assert.ok(failed.error);
    failures.delete(table); const recovered = await service.loadOnboardingDraft(); assert.ok(recovered.data); assert.equal(recovered.error, null);
  });
}
