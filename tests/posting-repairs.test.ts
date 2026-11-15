import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getJobScheduleError, parseLegacyJobSchedule } from '@/services/job-schedule';
import { draftPriceValues, getPriceSliderMaximum, getRangeError, parsePriceAmount } from '@/services/pricing';
import { getProfileEditorProgress, isHiringProfileInputComplete, isWorkProfileInputComplete, resolveProfileSelections } from '@/services/profile-readiness';
import { validateJobPayload, validateServicePayload } from '@/services/listing-validation';
import { clearReviewSnapshots, putReviewSnapshot, readReviewSnapshot } from '@/services/posting-review';
import { runtimeService } from './helpers/runtime-service';
import type { CoreProfileInput, ProfileCompletionStatus, WorkProfileInput, HiringProfileInput } from '@/types/profile.types';

type Result = { data: ProfileCompletionStatus | null; error: string | null };
type Profiles = { getMyProfileCompletion(): Promise<Result>; saveWorkProfile(input: WorkProfileInput): Promise<Result>; saveHiringProfile(input: HiringProfileInput): Promise<Result> };
const work: WorkProfileInput = { headline: '', bio: 'Careful home help', offeredServices: ['Cleaning'], customOfferedServices: [], serviceArea: 'San Pedro', availability: 'Weekends' };
const hiring: HiringProfileInput = { headline: '', bio: 'Home help needed', neededServices: ['Cleaning'], customNeededServices: [], coordinationStyle: 'App messages', preferredSchedule: 'Weekends' };

function profileFixture() {
  const rows: Record<string, Record<string, unknown> | unknown[] | null> = {
    profiles: { id: 'resident', first_name: 'Audit', last_name: 'Resident', full_name: 'Audit Resident', street: 'Area', barangay: 'San Pedro', city: 'Santo Tomas', preferred_contact_method: 'app_message', barangay_verified_at: '2026-11-13', about: 'Resident intro' },
    provider_profiles: { service_type: 'Cleaning', headline: '', bio: work.bio, service_area: work.serviceArea, availability: work.availability, services_confirmed: false },
    client_profiles: { headline: '', bio: hiring.bio, needed_services: ['Cleaning'], coordination_style: hiring.coordinationStyle, preferred_schedule: hiring.preferredSchedule, services_confirmed: false },
    user_preferences: { offered_services: ['Laundry help'], needed_services: ['Encoding'], custom_offered_services: [], custom_needed_services: [] },
    credentials: [], verifications: null, user_roles: { role: 'provider' },
  };
  const failures = new Set<string>();
  const supabase = { from(table: string) {
    let write: Record<string, unknown> | undefined;
    const query = {
      select() { return query; }, eq() { return query; }, order() { return query; }, limit() { return query; }, maybeSingle() { return query; },
      upsert(value: Record<string, unknown>) { write = value; return query; }, insert(value: Record<string, unknown>) { write = value; return query; },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        if (write && !failures.has(table)) rows[table] = { ...rows[table], ...write };
        return Promise.resolve({ data: failures.has(table) ? null : rows[table], error: failures.has(table) ? { message: 'Connection failed' } : null }).then(resolve, reject);
      },
    };
    return query;
  } };
  const service = runtimeService<Profiles>('@/services/profile-completion.service', {
    '@/utils/supabase': { supabase }, '@/services/session.service': { getSessionUser: async () => ({ user: { id: 'resident', email: null }, error: null }) },
    '@/services/onboarding.service': { DEFAULT_BARANGAY: 'San Pedro', DEFAULT_CITY: 'Santo Tomas', DEFAULT_PROVINCE: 'Batangas' },
    '@/services/content-visibility.service': {}, '@/utils/image-processing': {},
  });
  return { service, rows, failures };
}

describe('profile persistence and readiness regressions', () => {
  it('removing onboarding services survives actual Work and Hiring save/reload', async () => {
    const { service, rows } = profileFixture();
    assert.equal((await service.getMyProfileCompletion()).data!.work.offeredServices.includes('Laundry help'), true);
    await service.saveWorkProfile(work); await service.saveHiringProfile(hiring);
    const status = (await service.getMyProfileCompletion()).data!;
    assert.equal(status.work.offeredServices.join(','), 'Cleaning');
    assert.equal(status.hiring.neededServices.join(','), 'Cleaning');
    assert.equal((rows.user_preferences as Record<string, string[]>).needed_services[0], 'Encoding', 'private discovery preference is not silently overwritten');
  });
  it('an intentionally empty saved list stays empty and blocks readiness', async () => {
    const { service } = profileFixture();
    await service.saveWorkProfile({ ...work, offeredServices: [] });
    const status = (await service.getMyProfileCompletion()).data!;
    assert.equal(status.work.offeredServices.length, 0); assert.equal(status.workComplete, false);
  });
  for (const table of ['profiles','provider_profiles','client_profiles','user_preferences','credentials','verifications']) {
    it(`${table} query failure cannot become an editable empty profile`, async () => {
      const { service, failures } = profileFixture(); failures.add(table);
      const result = await service.getMyProfileCompletion(); assert.equal(result.data, null); assert.ok(result.error);
    });
  }
  it('one introduction yields matching save timestamp and readiness', async () => {
    const { service, rows } = profileFixture();
    const result = await service.saveHiringProfile(hiring);
    assert.equal(result.data!.hiringComplete, true); assert.ok((rows.client_profiles as Record<string, unknown>).profile_completed_at);
    assert.equal(isWorkProfileInputComplete(work), true); assert.equal(isHiringProfileInputComplete(hiring), true);
  });
  it('a partial save does not become ready through stale shared intro or preferences', async () => {
    const { service } = profileFixture();
    const result = await service.saveWorkProfile({ ...work, bio: '', headline: '' });
    assert.equal(result.error, null); assert.equal(result.data!.workComplete, false);
  });
  it('unconfirmed legacy selections retain onboarding defaults', () => {
    assert.deepEqual(resolveProfileSelections(false, ['Cleaning'], ['Laundry help']), ['Cleaning','Laundry help']);
    assert.deepEqual(resolveProfileSelections(true, [], ['Laundry help']), []);
  });
});

describe('price entry and publication validation', () => {
  it('preserves cents, comma amounts, fixed prices, and amounts above the slider scale', () => {
    assert.equal(parsePriceAmount('1,200.75'),1200.75); assert.equal(parsePriceAmount('25000'),25000);
    assert.equal(getRangeError(350,350),null); assert.equal(getPriceSliderMaximum(20000,25000),25000);
  });
  for (const text of ['0','-1','1e3','1,00','₱200','100.123','Infinity']) it(`rejects invalid pasted price ${text}`, () => assert.equal(Number.isNaN(parsePriceAmount(text)),true));
  it('rejects missing/reversed ranges instead of quietly reordering them', () => {
    assert.ok(getRangeError(null,200)); assert.ok(getRangeError(500,200));
  });
  const job = { title:'Shelf assembly', description:'Assemble a small shelf', category:'Home & Local Help', serviceNeeded:'Carpentry', barangay:'San Pedro', budgetMin:200, budgetMax:300, rateType:'per_job' as const, workersNeeded:1, schedule:{date:'2050-11-13',timePreference:'morning' as const,flexibility:'flexible' as const,timeZone:'Asia/Manila' as const},scheduleText:'Translated display text' };
  it('validates category relationships and the actual hiring capacity', () => {
    assert.equal(validateJobPayload(job),null); assert.ok(validateJobPayload({ ...job, category:'Food & Personal Services' })); assert.ok(validateJobPayload({ ...job, workersNeeded:3 }));
  });
  const service = { title:'Cleaning', description:'Careful cleaning', category:'Cleaning', barangay:'San Pedro', rateMin:200, rateMax:300, rateType:'per_visit' as const };
  it('blocks UI-bypass service payloads', () => {
    assert.equal(validateServicePayload(service),null); assert.ok(validateServicePayload({ ...service, description:'' }));
    assert.ok(validateServicePayload({ ...service, category:'Other service', customCategory:'plumbing' }));
    assert.ok(validateServicePayload({ ...service, rateMin:100.123 }));
  });
});

describe('private review transport', () => {
  it('keeps private content out of tokens and scopes/clears ephemeral edits', () => {
    const token = putReviewSnapshot('job',{ privateLocationNotes:'Private meeting instructions' });
    assert.equal(token.includes('Private'),false); assert.equal(readReviewSnapshot(token,'service'),null);
    assert.equal((readReviewSnapshot<{privateLocationNotes:string}>(token,'job'))!.privateLocationNotes,'Private meeting instructions');
    clearReviewSnapshots(); assert.equal(readReviewSnapshot(token,'job'),null);
  });
});

describe('actual draft and publication service boundaries', () => {
  for (const kind of ['job', 'service'] as const) {
    it(`${kind} draft keeps reversed and invalid raw prices when reopened`, async () => {
      let saved: Record<string, unknown> = {};
      const repository = {
        saveOwnDraftRow: async ({ payload }: { payload: Record<string, unknown> }) => {
          saved = { ...payload, id: 'private-draft', user_id: 'owner' };
          return { data: saved, error: null };
        },
        getOwnDraftRow: async () => ({ data: saved, error: null }),
      };
      const service = runtimeService<Record<string, (args: unknown) => Promise<{ data: { priceInput: { minimum: string; maximum: string } }; error: string | null }>>>(`@/services/${kind}-draft.service`, {
        '@/services/marketplace-draft.repository': repository,
        '@/services/marketplace.helpers': { compactText: (value?: string) => value?.trim() ?? '', normalizeRateType: (value: string) => value, normalizeExperienceLevel: (value: string) => value },
      });
      for (const input of [{ minimum: '500', maximum: '100' }, { minimum: 'oops', maximum: '100' }]) {
        const capital = kind === 'job' ? 'Job' : 'Service';
        await service[`save${capital}Draft`]({ input: { priceInput: input, ...(kind === 'job' ? { budgetMin: parsePriceAmount(input.minimum), budgetMax: 100 } : { rateMin: parsePriceAmount(input.minimum), rateMax: 100 }) } });
        const loaded = await service[`get${capital}Draft`]('private-draft');
        assert.equal(loaded.data.priceInput.minimum, input.minimum);
        assert.equal(loaded.data.priceInput.maximum, input.maximum);
        assert.equal(saved[kind === 'job' ? 'budget_min' : 'rate_min'], null);
        assert.equal(saved[kind === 'job' ? 'budget_max' : 'rate_max'], null);
      }
      assert.deepEqual(draftPriceValues(100.25, 200.75), { minimum: 100.25, maximum: 200.75 });
    });
    it(`${kind} publication can retry after the listing read fails`, async () => {
      let reads = 0;
      const calls: unknown[] = [];
      const lookup = async () => ++reads === 1 ? { data: null, error: 'Network disconnected after publication' } : { data: { id: 'one-listing' }, error: null };
      const service = runtimeService<{ publishJobDraft(id: string): Promise<Result>; publishServiceDraft(id: string): Promise<Result> }>('@/services/posting-publish.service', {
        '@/services/profile-completion.service': { requireVerifiedCompleteProfile: async () => ({ data: 'owner', error: null }) },
        '@/services/job.service': { getJobDetail: lookup }, '@/services/service-profile.service': { getMyService: lookup },
        '@/utils/supabase': { supabase: { rpc: async (name: string, params: unknown) => { calls.push({ name, params }); return { data: 'one-listing', error: null }; } } },
      });
      const publish = kind === 'job' ? service.publishJobDraft : service.publishServiceDraft;
      assert.ok((await publish('private-draft')).error);
      assert.equal((await publish('private-draft')).error, null);
      assert.equal(JSON.stringify(calls[0]), JSON.stringify(calls[1]));
    });
    it(`${kind} search sends range and unit filters before the page limit`, async () => {
      const calls: string[] = [];
      const query = new Proxy({}, { get(_target, key: string) {
        if (key === 'then') return (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
        return (...args: unknown[]) => { calls.push(`${key}:${JSON.stringify(args)}`); return query; };
      } });
      const service = runtimeService<{ searchJobs(input: unknown): Promise<unknown>; searchServices(input: unknown): Promise<unknown> }>(`@/services/${kind === 'job' ? 'job' : 'service-profile'}.service`, {
        '@/utils/supabase': { supabase: { from: () => query } },
        '@/services/marketplace.helpers': { compactText: (value?: string) => value?.trim() ?? '', getCurrentUserId: async () => ({ data: null, error: null }), loadPublicProfiles: async () => new Map() },
        '@/services/content-visibility.service': { applyPublicPhotoVisibilityToRows: async (rows: unknown) => rows },
        '@/services/profile-completion.service': {},
      });
      const search = kind === 'job' ? service.searchJobs : service.searchServices;
      await search({ rateType: 'hourly', budgetMin: 200, budgetMax: 500, rateMin: 200, rateMax: 500, excludeCurrentUser: false, limit: 10 });
      const limit = calls.findIndex(call => call.startsWith('limit:'));
      for (const method of ['gte:', 'lte:', 'eq:["rate_type","hourly"]']) assert.ok(calls.findIndex(call => call.startsWith(method)) >= 0 && calls.findIndex(call => call.startsWith(method)) < limit, calls.join('\n'));
    });
  }
  it('public formatting retains centavos and flags reversed ranges', () => {
    const helpers = runtimeService<{ formatRateRange(input: object): string }>('@/services/marketplace.helpers', {
      '@/utils/supabase': {}, '@/services/session.service': {}, '@/services/content-visibility.service': {}, '@/utils/image-processing': {},
    });
    assert.match(helpers.formatRateRange({ min: 200.25, max: 300.75, rateType: 'per_visit' }), /200\.25.*300\.75/);
    assert.match(helpers.formatRateRange({ min: 500, max: 200, rateType: 'hourly' }), /Check/);
  });
});

describe('job schedule contract', () => {
  const now = new Date('2026-11-13T01:00:00Z');
  it('accepts today, future exact times and the current picker labels', () => {
    assert.equal(getJobScheduleError({date:'2026-11-13',timePreference:'morning',flexibility:'flexible',timeZone:'Asia/Manila'}, now), null);
    assert.equal(getJobScheduleError({date:'2026-11-14',timePreference:'exact',exactTime:'09:30',flexibility:'fixed',timeZone:'Asia/Manila'}, now), null);
  });
  it('rejects impossible dates, past days and free text bypasses', () => {
    for (const value of ['Feb 30, 2027 · Morning · Can coordinate', 'Nov 12, 2026 · Morning · Can coordinate', 'Tomorrow morning', 'Nov 14, 2026 · 25:00 AM · Can coordinate']) assert.ok(getJobScheduleError(parseLegacyJobSchedule(value), now));
  });
});

it('profile progress reflects current role edits before saving', () => {
  const core = {} as CoreProfileInput;
  assert.equal(getProfileEditorProgress('work',core,work,hiring).completedSteps, 4);
  const progress = getProfileEditorProgress('work',core,{...work,bio:'',headline:'',offeredServices:[]},hiring);
  assert.equal(progress.completedSteps,2);
  assert.deepEqual(progress.missingItems.map(item=>item.label), ['Add an introduction','Choose services']);
});
