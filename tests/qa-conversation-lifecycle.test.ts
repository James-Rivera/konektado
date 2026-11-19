import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import ts from 'typescript';

import { runtimeService } from './helpers/runtime-service';

// Execute real service code and extracted render expressions, replacing external
// I/O only. These regressions do not certify React Navigation or Android.
function sourceFile(filename: string) {
  return ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function execute<T>(source: string, context: Record<string, unknown>): T {
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, ...context });
  return module.exports as T;
}

function expression(filename: string, name: string, context: Record<string, unknown>) {
  const ast = sourceFile(filename);
  let initializer: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(initializer, `${name} must exist`);
  return execute<unknown>(`module.exports = (${initializer.getText(ast)});`, context);
}

function declaredFunction<T>(filename: string, name: string, context: Record<string, unknown> = {}) {
  const ast = sourceFile(filename);
  const fn = ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn, `${name} must exist`);
  return execute<T>(`${fn.getText(ast)}\nmodule.exports = ${name};`, context);
}

function focusCallback(context: Record<string, unknown>) {
  const ast = sourceFile('app/conversation/[conversationId]/details.tsx');
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useFocusEffect') callback = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(callback, 'Details must refresh on navigation focus');
  return execute<() => (() => void)>(`module.exports = (${callback.getText(ast)});`, { useCallback: (fn: unknown) => fn, ...context });
}

function lifecycleHelpers() {
  const filename = 'utils/marketplace-lifecycle.ts';
  if (!fs.existsSync(filename)) return {};
  return runtimeService<Record<string, unknown>>('@/utils/marketplace-lifecycle', {});
}

const now = '2026-11-19T00:00:00Z';
const fullJob = { id: 'job', status: 'in_progress', acceptedProviderId: 'worker', budgetMin: 500, budgetMax: 800, scheduleText: 'Tomorrow morning', locationText: 'San Pedro' };
const fullService = { id: 'service', isActive: false, rateMin: 300, rateMax: 500, locationText: 'San Pedro' };

function conversationRuntime(kind: 'job' | 'service' = 'job') {
  let savedReports = 0;
  let statusWrites = 0;
  let failListings = false;
  let failInbox = false;
  let readsAfterReport = 0;
  const inboxRow = { id: 'chat', conversation_id: 'chat', job_id: kind === 'job' ? 'job' : null, service_id: kind === 'service' ? 'service' : null, client_id: 'client', provider_id: 'worker', started_by: 'worker', status: 'hired', hired_at: now, created_at: now, updated_at: now, conversation_created_at: now, conversation_updated_at: now, job_title: 'Synthetic job' };
  const client = { id: 'client' };
  const worker = { id: 'worker' };
  const service = runtimeService<{
    getConversationSummary(id: string): Promise<{ data: Record<string, unknown> | null; error: string | null }>;
    reportConversation(input: { conversationId: string; reason: string }): Promise<{ data: Record<string, unknown> | null; error: string | null }>;
  }>('@/services/conversation.service', {
    '@/utils/supabase': { supabase: {
      rpc: async () => failInbox ? { data: null, error: { code: 'PGRST202', message: 'Synthetic missing inbox RPC' } } : { data: [inboxRow], error: null },
      from(table: string) {
        if (savedReports > 0) readsAfterReport++;
        let updating = false;
        const result = () => updating
          ? { data: null, error: { message: 'Hired-state guard denied status change' } }
          : failListings && ['jobs', 'services'].includes(table)
            ? { data: null, error: { message: 'Synthetic listing read failure' } }
            : { data: table === 'conversations' ? inboxRow : table === 'jobs' ? { id: 'job' } : table === 'services' ? { id: 'service' } : [], error: null };
        const query = {
          select() { return query; }, eq() { return query; }, in() { return query; }, order() { return query; },
          update() { updating = true; statusWrites++; return query; },
          maybeSingle: async () => result(),
          then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
            const value = result();
            return Promise.resolve(!updating && ['jobs', 'services'].includes(table) && !value.error ? { ...value, data: [value.data] } : value).then(resolve, reject);
          },
        };
        return query;
      },
    } },
    '@/utils/image-processing': {},
    '@/services/job.service': {},
    '@/services/service-profile.service': {},
    '@/services/profile-completion.service': {},
    '@/services/report.service': { createReport: async () => { savedReports++; return { data: { id: 'report' }, error: null }; } },
    '@/services/marketplace.helpers': {
      compactText: (value?: string | null) => value?.trim() || '', formatPublicLocation: () => 'San Pedro',
      getCurrentUserId: async () => ({ data: 'client', error: null }), requireVerifiedUser: async () => ({ data: 'client', error: null }),
      loadPublicProfiles: async () => new Map([['client', client], ['worker', worker]]),
      mapJob: () => fullJob, mapService: () => fullService,
    },
  });
  return { service, reports: () => savedReports, statusWrites: () => statusWrites, readsAfterReport: () => readsAfterReport, failListings: () => { failListings = true; }, failInbox: () => { failInbox = true; } };
}

describe('QA conversation lifecycle regressions', () => {
  for (const kind of ['job', 'service'] as const) {
    it(`hydrates actual ${kind} context for realtime summary refresh`, async () => {
      const { service } = conversationRuntime(kind);
      const result = await service.getConversationSummary('chat');
      assert.equal(result.error, null);
      assert.deepEqual(result.data?.[kind], kind === 'job' ? fullJob : fullService);
    });
  }

  it('does not replace listing details with placeholders after a failed listing read', async () => {
    const runtime = conversationRuntime();
    runtime.failListings();
    const result = await runtime.service.getConversationSummary('chat');
    assert.equal(result.data, null);
    assert.equal(result.error, 'Synthetic listing read failure');
  });

  it('returns complaint success without attempting to change hired history', async () => {
    const runtime = conversationRuntime();
    const result = await runtime.service.reportConversation({ conversationId: 'chat', reason: 'Synthetic concern' });
    assert.equal(result.error, null);
    assert.equal(runtime.reports(), 1);
    assert.equal(runtime.statusWrites(), 0);
    assert.equal(runtime.readsAfterReport(), 0, 'no post-save refresh can turn durable complaint success into an error');
    assert.equal(result.data?.status, 'hired');
    assert.equal(result.data?.hiredAt, now);
  });

  it('also propagates listing failures on the legacy inbox fallback', async () => {
    const runtime = conversationRuntime();
    runtime.failInbox();
    runtime.failListings();
    const result = await runtime.service.getConversationSummary('chat');
    assert.equal(result.data, null);
    assert.equal(result.error, 'Synthetic listing read failure');
  });

  it('changes the actual screen review key after completion and refocus', () => {
    const base = { reviewJobId: 'job', profile: { id: 'client' }, conversation: { id: 'chat', status: 'hired', job: fullJob }, reviewRefresh: 0, ...lifecycleHelpers() };
    const key = (context: Record<string, unknown>) => expression('app/conversation/[conversationId]/details.tsx', 'reviewKey', context);
    const before = key(base);
    const completed = key({ ...base, conversation: { ...base.conversation, job: { ...fullJob, status: 'completed' } } });
    assert.notEqual(before, completed, 'server completion must invalidate pre-completion eligibility');
    assert.notEqual(before, key({ ...base, reviewRefresh: 1 }), 'refocus must invalidate stale review results');
  });

  it('ignores an earlier Details load after refocus/account change', async () => {
    const pending: ((result: unknown) => void)[] = [];
    const loaded: unknown[] = [];
    const loadRequestRef = { current: 0 };
    const viewGenerationRef = { current: 0 };
    const context = {
      conversationId: 'chat', profile: { id: 'client' }, loadRequestRef, viewGenerationRef,
      getConversation: () => new Promise((resolve) => pending.push(resolve)),
      setConversation: (value: unknown) => loaded.push(value), setReviewRefresh() {}, setLoading() {},
      setCompleting() {}, setReviewSubmitting() {}, setReporting() {}, showAlert() {},
      setCancellationBusy() {}, setCancellationVisible() {}, cancellationPendingWrite: { current: false },
    };
    const firstCleanup = focusCallback(context)();
    firstCleanup();
    const secondCleanup = focusCallback({ ...context, profile: { id: 'another-account' } })();
    pending[0]({ data: { id: 'old-response' }, error: null });
    pending[1]({ data: { id: 'current-response' }, error: null });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(loaded, [{ id: 'current-response' }]);
    secondCleanup();
  });

  it('requires an active eligible job conversation to expose Mark Hired', () => {
    const { canHireFromConversation } = lifecycleHelpers() as { canHireFromConversation: (conversation: unknown, userId: string) => boolean };
    const eligible = { clientId: 'client', jobId: 'job', hiredAt: null, status: 'active', job: { status: 'open', acceptedProviderId: null } };
    assert.equal(canHireFromConversation(eligible, 'client'), true);
    assert.equal(canHireFromConversation({ ...eligible, jobRequestExpired: true }, 'client'), false);
    assert.equal(canHireFromConversation(eligible, 'worker'), false);
    for (const status of ['hired', 'declined', 'reported', 'archived']) assert.equal(canHireFromConversation({ ...eligible, status }, 'client'), false);
    for (const status of ['in_progress', 'completed', 'closed', 'cancelled']) assert.equal(canHireFromConversation({ ...eligible, job: { ...eligible.job, status } }, 'client'), false);
    assert.equal(canHireFromConversation({ ...eligible, job: { ...eligible.job, acceptedProviderId: 'another-worker' } }, 'client'), false);
  });

  it('offers supported owner actions for every job lifecycle state', () => {
    const getActions = declaredFunction<(input: Record<string, unknown>) => { label: string }[]>('app/job/[jobId].tsx', 'getOwnerJobActions', lifecycleHelpers());
    const expected: Record<string, string[]> = {
      open: ['Edit job', 'Pause job', 'Cancel job request'], reviewing: ['Edit job', 'Pause job', 'Cancel job request'],
      cancelled: ['Edit job', 'Reactivate job', 'Cancel job request'], in_progress: ['Manage cancellation'], completed: [], closed: [],
    };
    for (const [status, labels] of Object.entries(expected)) {
      const result = getActions({ job: { status }, updating: false, onClose() {}, onDeactivate() {}, onEdit() {}, onManageCancellation() {}, onReactivate() {} });
      assert.deepEqual(Array.from(result, (item) => item.label), labels, status);
    }
  });

  it('keeps unsupported actions out of Your Posts and preserves completed-job reviews', () => {
    const getActions = declaredFunction<(input: Record<string, unknown>) => { label: string }[]>('app/post/active.tsx', 'getJobManagementActions', lifecycleHelpers());
    const labels = (status: string, reviewState: object | null = null) => Array.from(getActions({
      job: { status }, updating: false, reviewState,
      onView() {}, onClose() {}, onDeactivate() {}, onEdit() {}, onManageCancellation() {}, onReactivate() {}, onReview() {},
    }), (item) => item.label);

    assert.deepEqual(labels('in_progress'), ['View', 'Manage cancellation']);
    assert.deepEqual(labels('open'), ['View', 'Edit job', 'Pause job', 'Cancel job request']);
    assert.deepEqual(labels('cancelled'), ['View', 'Edit job', 'Reactivate job', 'Cancel job request']);
    assert.deepEqual(labels('completed', { eligible: true }), ['View', 'Review worker']);
    assert.deepEqual(labels('completed', { reason: 'already_reviewed' }), ['View', 'View submitted review']);
  });
});
