// Pure authorization decision shared by the handler and its negative tests.
export type VerificationEmailState = 'pending' | 'approved' | 'rejected' | 'needs_more_info';

export function authorizeVerificationEmail(input: {
  callerId: string;
  ownerId: string;
  isAdmin: boolean;
  status: string;
}) {
  if (!input.callerId || (!input.isAdmin && input.callerId !== input.ownerId)) {
    throw new Error('Forbidden');
  }
  // Residents may request their submission acknowledgement, never an admin decision email.
  if (!input.isAdmin && input.status !== 'pending') throw new Error('Forbidden');
  const templates = {
    pending: 'verification_submitted',
    approved: 'verification_approved',
    rejected: 'verification_rejected',
    needs_more_info: 'verification_needs_more_info',
  } as const;
  if (!Object.hasOwn(templates, input.status)) throw new Error('Unsupported verification state');
  return templates[input.status as VerificationEmailState];
}
