import type { VerificationStatus } from '@/types/verification.types';

/**
 * One resident-facing verification state, resolved from the profile's approval
 * timestamps plus the latest `verifications` row.
 *
 * Approval timestamps win: a resident whose profile is approved is verified even
 * if an older request row says otherwise. Without them, the latest request
 * decides. `cancelled`, `skipped`, and "no request yet" all mean the resident has
 * not submitted anything that is waiting on barangay staff.
 */
export type VerificationGateStatus =
  | 'approved'
  | 'pending'
  | 'needs_correction'
  | 'rejected'
  | 'unverified';

/** Interactions that barangay verification unlocks (docs/04-user-flows.md). */
export type GatedAction = 'message' | 'save' | 'post' | 'hire' | 'review';

export function resolveVerificationGateStatus({
  barangayVerifiedAt,
  latestStatus,
  verifiedAt,
}: {
  barangayVerifiedAt: string | null | undefined;
  latestStatus: VerificationStatus | null | undefined;
  verifiedAt: string | null | undefined;
}): VerificationGateStatus {
  if (barangayVerifiedAt || verifiedAt) return 'approved';
  if (latestStatus === 'pending') return 'pending';
  if (latestStatus === 'needs_more_info') return 'needs_correction';
  if (latestStatus === 'rejected') return 'rejected';
  return 'unverified';
}

const ACTION_PHRASE: Record<GatedAction, string> = {
  hire: 'hiring',
  message: 'messaging',
  post: 'posting',
  review: 'leaving reviews',
  save: 'saving posts',
};

export type VerificationGateCopy = {
  /** Short button label for a locked primary action, e.g. on a detail screen. */
  ctaLabel: string;
  /** One line shown above a locked action explaining why it is locked. */
  helper: string;
  /** Dialog title when the resident taps a locked action. */
  title: string;
  /** Dialog body when the resident taps a locked action. */
  body: string;
  /** Label for the dialog's route into the verification screen. */
  actionLabel: string;
};

/**
 * Copy for a locked interaction. A pending resident has already done their part,
 * so they are told it is under review, never asked to "verify" again.
 */
export function getVerificationGateCopy(
  status: Exclude<VerificationGateStatus, 'approved'>,
  action: GatedAction,
): VerificationGateCopy {
  const phrase = ACTION_PHRASE[action];
  const verb = action === 'message' ? 'message' : action === 'save' ? 'save' : action;

  if (status === 'pending') {
    return {
      actionLabel: 'View status',
      body: `Barangay staff are checking your documents. You can keep browsing, and ${phrase} unlocks as soon as you are approved. We will notify you.`,
      ctaLabel: 'Verification in review',
      helper: `Your verification is under review. You can ${verb} once you are approved.`,
      title: 'Your verification is under review',
    };
  }

  if (status === 'needs_correction' || status === 'rejected') {
    return {
      actionLabel: 'Review verification',
      body: `Barangay staff need you to update your verification before ${phrase} unlocks.`,
      ctaLabel: 'Update verification',
      helper: 'Your verification needs attention before you can continue.',
      title: 'Your verification needs attention',
    };
  }

  return {
    actionLabel: 'Start verification',
    body: `Verify with your barangay to unlock ${phrase}. It takes about 2 to 3 minutes.`,
    ctaLabel: action === 'message' ? 'Verify to message' : 'Verify to continue',
    helper: 'Complete barangay verification to message workers and clients.',
    title: 'Verify your identity first',
  };
}
