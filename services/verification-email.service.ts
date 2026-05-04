import { supabase } from '@/utils/supabase';

export type VerificationEmailTemplateName =
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_needs_more_info'
  | 'verification_rejected';

export type SendVerificationEmailInput = {
  requestId: string;
  ctaUrl?: string;
};

type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

async function sendVerificationEmail(
  template: VerificationEmailTemplateName,
  input: SendVerificationEmailInput,
): Promise<ServiceResult<void>> {
  const { error } = await supabase.functions.invoke('verification-email', {
    body: {
      requestId: input.requestId,
      ctaUrl: input.ctaUrl ?? null,
      template,
    },
  });

  if (error) {
    return { data: null, error: error.message || 'Could not send verification email.' };
  }

  return { data: undefined, error: null };
}

export function sendVerificationSubmittedEmail(input: SendVerificationEmailInput) {
  return sendVerificationEmail('verification_submitted', input);
}

export function sendVerificationApprovedEmail(input: SendVerificationEmailInput) {
  return sendVerificationEmail('verification_approved', input);
}

export function sendVerificationNeedsInfoEmail(input: SendVerificationEmailInput) {
  return sendVerificationEmail('verification_needs_more_info', input);
}

export function sendVerificationRejectedEmail(input: SendVerificationEmailInput) {
  return sendVerificationEmail('verification_rejected', input);
}
