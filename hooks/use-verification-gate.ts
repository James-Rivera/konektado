import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { useProfile } from '@/hooks/use-profile';
import { showAlert } from '@/utils/alert';
import {
  getVerificationGateCopy,
  resolveVerificationGateStatus,
  type GatedAction,
  type VerificationGateCopy,
  type VerificationGateStatus,
} from '@/utils/verification-gate';

/**
 * The single verification gate for resident interactions.
 *
 * Screens used to compute `isVerified` inline and send every non-approved
 * resident back into the verification flow, so someone who had already
 * submitted was asked to "verify" again. This hook tells the states apart:
 *
 *   unverified        -> opens the verification flow
 *   pending           -> explains the request is under review (browsing continues)
 *   needs_correction  -> explains what is needed and offers the flow
 *   rejected          -> same as needs_correction
 *   approved          -> allows the action
 */
export function useVerificationGate() {
  const router = useRouter();
  const { latestVerificationStatus, profile } = useProfile();

  const status: VerificationGateStatus = resolveVerificationGateStatus({
    barangayVerifiedAt: profile?.barangay_verified_at,
    latestStatus: latestVerificationStatus,
    verifiedAt: profile?.verified_at,
  });
  const isVerified = status === 'approved';

  const openVerification = useCallback(() => {
    router.push('/verification' as never);
  }, [router]);

  /**
   * Returns true when the action may proceed. Otherwise it explains the gate
   * (or opens verification for a resident who has not started) and returns false.
   */
  const requireVerified = useCallback(
    (action: GatedAction) => {
      if (status === 'approved') return true;

      if (status === 'unverified') {
        openVerification();
        return false;
      }

      const copy = getVerificationGateCopy(status, action);
      showAlert(copy.title, copy.body, [
        { style: 'cancel', text: 'OK' },
        { onPress: openVerification, text: copy.actionLabel },
      ]);
      return false;
    },
    [openVerification, status],
  );

  const getCopy = useCallback(
    (action: GatedAction): VerificationGateCopy | null =>
      status === 'approved' ? null : getVerificationGateCopy(status, action),
    [status],
  );

  return useMemo(
    () => ({
      getCopy,
      isPending: status === 'pending',
      isVerified,
      openVerification,
      requireVerified,
      status,
    }),
    [getCopy, isVerified, openVerification, requireVerified, status],
  );
}
