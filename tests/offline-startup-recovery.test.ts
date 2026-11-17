import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runtimeHook } from './helpers/runtime-hook';

const resident = { id: 'account-a', email: 'a@example.test', role: 'client', active_role: 'client', full_name: 'A Resident', first_name: 'A', last_name: 'Resident' };
const completePreferences = { intent: 'client', onboardingCompletedAt: '2026-01-01' };
const ok = (data: unknown) => ({ data, error: null });
const failed = (message = 'Network unavailable') => ({ data: null, error: { message } });

function setup(options: { session?: any; profile?: any; preferences?: any; roles?: any; sessionError?: string | null } = {}) {
  let session = options.session === undefined ? { id: resident.id, user_metadata: { role: 'client' } } : options.session;
  let profileResult = options.profile ?? ok(resident);
  let preferencesResult = options.preferences ?? ok(completePreferences);
  let rolesResult = options.roles ?? ok([{ role: 'client', is_active: true }]);
  let authListener: ((event: string, session?: any) => void) | undefined;
  let profileDeferred: Promise<any> | null = null;
  let profileDeferredStarted = false;
  let rolesDeferred: Promise<any> | null = null;
  let rolesDeferredStarted = false;
  let sessionError: string | null = options.sessionError ?? null;
  const appStateListener: { current?: (state: string) => void } = {};
  const query = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => { if (table === 'user_roles' && rolesDeferred) { const deferred = rolesDeferred; rolesDeferred = null; rolesDeferredStarted = true; return deferred; } return table === 'user_roles' ? rolesResult : Promise.resolve(ok([])); },
      maybeSingle: () => { if (table === 'profiles' && profileDeferred) { const deferred = profileDeferred; profileDeferred = null; profileDeferredStarted = true; return deferred; } return Promise.resolve(table === 'profiles' ? profileResult : ok(null)); },
    };
    return chain;
  };
  const supabase = {
    from: query,
    getChannels: () => [], removeChannel: async () => 'ok',
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    auth: {
      getSession: async () => ({ data: { session: session ? { user: session } : null }, error: null }),
      onAuthStateChange: (listener: typeof authListener) => { authListener = listener; return { data: { subscription: { unsubscribe() {} } } }; },
    },
  };
  const harness = runtimeHook<any>('@/hooks/use-profile', {
    '@/utils/supabase': { supabase },
    '@/services/session.service': { getSessionUser: async () => ({ error: sessionError, user: sessionError ? null : session }) },
    '@/services/onboarding.service': { getMyUserPreferences: async () => preferencesResult },
    '@/services/verification.service': { getLatestVerificationStatus: async () => ok(null) },
    'react-native': { AppState: { addEventListener: (_event: string, listener: (state: string) => void) => { appStateListener.current = listener; return { remove() {} }; } } },
  });
  const wait = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await harness.render(); };
  return {
    harness, wait,
    setProfile(value: any) { profileResult = value; },
    setPreferences(value: any) { preferencesResult = value; },
    setRoles(value: any) { rolesResult = value; },
    setSession(value: any) { session = value; },
    emit(event: string, value?: any) { authListener?.(event, value ? { user: value } : null); },
    setProfileDeferred(promise: Promise<any>) { profileDeferred = promise; },
    get profileDeferredStarted() { return profileDeferredStarted; },
    setRolesDeferred(promise: Promise<any>) { rolesDeferred = promise; },
    get rolesDeferredStarted() { return rolesDeferredStarted; },
    setSessionError(value: string | null) { sessionError = value; },
    activate() { appStateListener.current?.('active'); },
  };
}

describe('offline startup and profile status hooks', () => {
  it('keeps a cold offline session authenticated and recovers to complete status on retry', async () => {
    const app = setup({ profile: failed(), preferences: failed() });
    await app.harness.render(); await app.wait();
    let state = app.harness.output as any;
    assert.equal(state.profile.authenticated, true);
    assert.equal(state.profile.dataReady, false);
    assert.equal(state.status.authenticated, true);
    assert.equal(state.status.unavailable, true);
    assert.equal(state.status.needsProfile, false);
    app.setProfile(ok(resident)); app.setPreferences(ok(completePreferences));
    await state.profile.refresh(); await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.dataReady, true);
    assert.equal(state.status.needsProfile, false);
    assert.equal(state.status.unavailable, false);
  });

  it('does not infer onboarding from a cold transient session read error and retries the stored account', async () => {
    const app = setup({ sessionError: 'Temporary session storage/network error' });
    await app.harness.render(); await app.wait();
    let state = app.harness.output as any;
    assert.equal(state.status.unavailable, true);
    assert.equal(state.status.needsRole, false);
    assert.equal(state.status.needsProfile, false);
    app.setSessionError(null);
    await state.profile.refresh(); await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.authenticated, true);
    assert.equal(state.profile.user.id, resident.id);
    assert.equal(state.status.needsProfile, false);
    assert.equal(state.status.unavailable, false);
  });

  it('preserves warm profile and preferences after profile or preferences read failure', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let state = app.harness.output as any;
    const cachedProfile = state.profile.profile;
    const cachedPreferences = state.profile.preferences;
    app.setProfile(failed('offline')); await state.profile.refresh(); await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.profile, cachedProfile);
    assert.equal(state.profile.preferences, cachedPreferences);
    assert.equal(state.status.needsProfile, false);
    app.setProfile(ok(resident)); app.setPreferences(failed('prefs offline'));
    await state.profile.refresh(); await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.profile, cachedProfile);
    assert.equal(state.profile.preferences, cachedPreferences);
    assert.equal(state.status.needsProfile, false);
  });

  it('routes only a successful missing/incomplete profile read to onboarding status', async () => {
    const app = setup({ profile: ok(null), preferences: ok({ intent: 'client', onboardingCompletedAt: null }) });
    await app.harness.render(); await app.wait();
    const state = app.harness.output as any;
    assert.equal(state.profile.dataReady, true);
    assert.equal(state.status.unavailable, false);
    assert.equal(state.status.needsRole, false);
    assert.equal(state.status.needsProfile, true);
  });

  it('clears account state after a confirmed signed-out session', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    app.setSession(null); app.emit('SIGNED_OUT'); await app.wait();
    const state = app.harness.output as any;
    assert.equal(state.profile.authenticated, false);
    assert.equal(state.profile.profile, null);
    assert.equal(state.profile.preferences, null);
    assert.equal(state.status.authenticated, false);
    assert.equal(state.status.needsProfile, false);
  });

  it('ignores a delayed old-account profile result after signout and account switch', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let resolveOld!: (value: any) => void;
    app.setProfileDeferred(new Promise((resolve) => { resolveOld = resolve; }));
    const state = app.harness.output as any;
    const oldRefresh = state.profile.refresh();
    for (let i = 0; i < 10 && !app.profileDeferredStarted; i++) await Promise.resolve();
    assert.equal(app.profileDeferredStarted, true, 'old-account profile query should be in flight before switching');
    const accountB = { id: 'account-b', email: 'b@example.test', user_metadata: { role: 'client' } };
    app.setProfile(ok({ ...resident, id: 'account-b', full_name: 'B Resident' }));
    app.setSession(accountB); app.emit('SIGNED_IN', accountB); await app.wait();
    resolveOld(ok({ ...resident, id: 'account-a', full_name: 'Stale A' }));
    await oldRefresh; await app.wait();
    const after = app.harness.output as any;
    assert.equal(after.profile.user.id, 'account-b');
    assert.equal(after.profile.profile?.full_name, 'B Resident');
  });

  it('does not apply an old-account profile rejection to the new account or block its queued load', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let rejectOld!: (error: Error) => void;
    app.setProfileDeferred(new Promise((_resolve, reject) => { rejectOld = reject; }));
    let state = app.harness.output as any;
    const oldRefresh = state.profile.refresh();
    for (let i = 0; i < 10 && !app.profileDeferredStarted; i++) await Promise.resolve();
    assert.equal(app.profileDeferredStarted, true, 'old-account profile query should be in flight before switching');
    const accountB = { id: 'account-b', email: 'b@example.test', user_metadata: { role: 'client' } };
    app.setProfile(ok({ ...resident, id: 'account-b', full_name: 'B Resident' }));
    app.setSession(accountB); app.emit('SIGNED_IN', accountB); await app.wait();
    rejectOld(new Error('old account offline'));
    await oldRefresh; await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.user.id, 'account-b');
    assert.equal(state.profile.profile?.full_name, 'B Resident');
    assert.equal(state.profile.error, null);
    assert.equal(state.status.needsProfile, false);
  });

  it('keeps password-recovery priority when the warm user_roles read fails', async () => {
    const recoveryUser = { ...resident, user_metadata: { role: 'client', password_recovery_pending: true } };
    const app = setup({ session: recoveryUser }); await app.harness.render(); await app.wait();
    app.setRoles(failed('roles offline'));
    const state = app.harness.output as any;
    await state.profile.refresh(); await app.wait();
    const after = app.harness.output as any;
    assert.equal(after.status.authenticated, true);
    assert.equal(after.status.needsPasswordRecovery, true);
    assert.equal(after.status.needsProfile, false);
  });

  it('discards a pending old role result across same-account signout and re-entry', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let resolveOldRole!: (value: any) => void;
    app.setRolesDeferred(new Promise((resolve) => { resolveOldRole = resolve; }));
    let state = app.harness.output as any;
    await state.profile.refresh(); await app.wait();
    for (let i = 0; i < 10 && !app.rolesDeferredStarted; i++) await Promise.resolve();
    assert.equal(app.rolesDeferredStarted, true, 'old role query should be pending before re-entry');
    const accountA = { id: resident.id, email: resident.email, user_metadata: { role: 'client' } };
    app.setSession(null); app.emit('SIGNED_OUT'); await app.wait();
    app.setSession(accountA); app.emit('SIGNED_IN', accountA); await app.wait();
    resolveOldRole(ok([{ role: 'barangay_admin', is_active: true }]));
    await app.wait();
    state = app.harness.output as any;
    assert.equal(state.status.authenticated, true);
    assert.equal(state.status.isAdmin, false);
    assert.match(state.status.accountKey, /^account-a:/);
  });

  it('applies same-account recovery event metadata immediately when session reload fails', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let state = app.harness.output as any;
    const cachedProfile = state.profile.profile;
    const recoveryUser = { ...resident, user_metadata: { role: 'client', password_recovery_pending: true } };
    app.setSessionError('offline');
    app.emit('PASSWORD_RECOVERY', recoveryUser);
    await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.authenticated, true);
    assert.equal(state.profile.user.id, resident.id);
    assert.equal(state.profile.profile, cachedProfile);
    assert.equal(state.status.needsPasswordRecovery, true);
  });

  it('does not discard same-user cached data on USER_UPDATED', async () => {
    const app = setup(); await app.harness.render(); await app.wait();
    let state = app.harness.output as any;
    const cachedProfile = state.profile.profile;
    app.setSessionError('offline');
    app.emit('USER_UPDATED', { ...resident, user_metadata: { role: 'client' } });
    await app.wait();
    state = app.harness.output as any;
    assert.equal(state.profile.authenticated, true);
    assert.equal(state.profile.profile, cachedProfile);
  });
});
