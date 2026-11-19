import { useEffect, useRef, useState } from 'react';

import { useFeedback } from '@/components/FeedbackProvider';
import type { ReportSheetSubmitValue } from '@/components/ReportSheet';
import { useProfile } from '@/hooks/use-profile';
import { useVerificationGate } from '@/hooks/use-verification-gate';
import { createReport } from '@/services/report.service';
import type { Review } from '@/types/marketplace.types';
import { showAlert } from '@/utils/alert';

/** Review reporting uses the shared resident gate and a service-owned target. */
export function useReviewReport() {
  const { profile } = useProfile();
  const { requireVerified } = useVerificationGate();
  const { showSuccessToast } = useFeedback();
  const [target, setTarget] = useState<{ review: Review; userId: string } | null>(null);
  const [submission, setSubmission] = useState<{ id: number; userId: string } | null>(null);
  const pending = useRef<{ id: number; userId: string } | null>(null);
  const sequence = useRef(0);
  const account = useRef(profile?.id);
  const [lastUserId, setLastUserId] = useState(profile?.id);
  if (lastUserId !== profile?.id) {
    setLastUserId(profile?.id);
    setTarget(null);
    setSubmission(null);
  }
  useEffect(() => {
    account.current = profile?.id;
    pending.current = null;
    return () => { account.current = undefined; pending.current = null; };
  }, [profile?.id]);
  const currentTarget = target?.userId === profile?.id ? target : null;
  const submitting = Boolean(submission && submission.userId === profile?.id);

  const open = (review: Review) => {
    if (!profile?.id) {
      showAlert('Sign in required', 'Sign in before reporting a review.');
      return;
    }
    if (requireVerified('report')) setTarget({ review, userId: profile.id });
  };

  const submit = async ({ reason, details }: ReportSheetSubmitValue) => {
    if (!currentTarget || pending.current || !requireVerified('report')) return;
    const request = { id: ++sequence.current, userId: currentTarget.userId };
    pending.current = request;
    setSubmission(request);
    try {
      const result = await createReport({ reviewId: currentTarget.review.id, reason, details });
      if (account.current !== request.userId || pending.current?.id !== request.id) return;
      if (result.error || !result.data) {
        showAlert('Report review', result.error ?? 'Could not submit this report. Please try again.');
        return;
      }
      setTarget(null);
      showSuccessToast('Review reported to barangay staff');
    } catch {
      if (account.current === request.userId && pending.current?.id === request.id) showAlert('Report review', 'Could not submit this report. Please try again.');
    } finally {
      if (pending.current?.id === request.id) {
        pending.current = null;
        setSubmission(null);
      }
    }
  };

  return {
    open,
    sheet: {
      visible: Boolean(currentTarget),
      submitting,
      onClose: () => { if (!pending.current) setTarget(null); },
      onSubmit: submit,
      title: 'Report review',
      targetLabel: currentTarget ? `this ${currentTarget.review.rating}/5 review` : null,
    },
  };
}
