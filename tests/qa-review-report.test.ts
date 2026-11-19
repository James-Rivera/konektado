import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runtimeService } from './helpers/runtime-service';

type HookValue = { open: (review: unknown) => void; sheet: { visible: boolean; submitting: boolean; onSubmit: (value: { reason: string; details: string | null }) => Promise<void> } };

it('an old account report response cannot close or clear a new account submission', async () => {
  // Execute the actual hook with a minimal hook scheduler and deferred service
  // boundary. This tests account/request ownership, not native rendering.
  const slots: { value?: unknown; deps?: unknown[]; cleanup?: () => void }[] = [];
  let cursor = 0;
  let dirty = false;
  const effects: (() => void)[] = [];
  let userId = 'account-a';
  const toasts: string[] = [];
  const alerts: unknown[] = [];
  const requests: { reviewId: string; resolve: (value: unknown) => void }[] = [];
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, (value: unknown) => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; dirty = true; }];
    },
    useRef(initial: unknown) { const index = cursor++; slots[index] ??= { value: { current: initial } }; return slots[index].value; },
    useEffect(effect: () => (() => void), deps: unknown[]) {
      const index = cursor++;
      const prior = slots[index];
      if (!prior || deps.some((value, position) => value !== prior.deps?.[position])) {
        slots[index] = { ...prior, deps };
        effects.push(() => { prior?.cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  const { useReviewReport: runHook } = runtimeService<{ useReviewReport: () => HookValue }>('@/hooks/use-review-report', {
    react,
    '@/components/FeedbackProvider': { useFeedback: () => ({ showSuccessToast: (message: string) => toasts.push(message) }) },
    '@/hooks/use-profile': { useProfile: () => ({ profile: { id: userId } }) },
    '@/hooks/use-verification-gate': { useVerificationGate: () => ({ requireVerified: () => true }) },
    '@/services/report.service': { createReport: (input: { reviewId: string }) => new Promise((resolve) => requests.push({ reviewId: input.reviewId, resolve })) },
    '@/utils/alert': { showAlert: (...args: unknown[]) => alerts.push(args) },
  });
  function render() {
    let value: HookValue;
    do { cursor = 0; dirty = false; value = runHook(); } while (dirty);
    while (effects.length) effects.shift()!();
    return value;
  }

  let view = render();
  view.open({ id: 'review-a', rating: 1 });
  view = render();
  const oldSubmission = view.sheet.onSubmit({ reason: 'Synthetic concern', details: null });
  assert.equal(render().sheet.submitting, true);

  userId = 'account-b';
  view = render();
  assert.equal(view.sheet.visible, false, 'old account target must close');
  assert.equal(view.sheet.submitting, false, 'old account busy state must not block the new actor');
  view.open({ id: 'review-b', rating: 2 });
  view = render();
  const newSubmission = view.sheet.onSubmit({ reason: 'Another concern', details: null });
  assert.deepEqual(requests.map((item) => item.reviewId), ['review-a', 'review-b']);

  requests[0].resolve({ data: { id: 'report-a' }, error: null });
  await oldSubmission;
  view = render();
  assert.equal(view.sheet.visible, true);
  assert.equal(view.sheet.submitting, true, 'old finally must not clear the current request');
  assert.equal(toasts.length, 0, 'old account must not receive feedback in the new session');
  requests[1].resolve({ data: { id: 'report-b' }, error: null });
  await newSubmission;
  view = render();
  assert.equal(view.sheet.visible, false);
  assert.equal(view.sheet.submitting, false);
  assert.equal(toasts.length, 1);
  assert.equal(alerts.length, 0);
});
