// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import nodemailer from 'npm:nodemailer@6.10.1';

type VerificationEmailTemplateName =
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_needs_more_info'
  | 'verification_rejected';

type VerificationRow = {
  id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
  user_id: string;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  barangay: string | null;
};

type RequestBody = {
  ctaUrl?: string | null;
  requestId?: string | null;
  template?: VerificationEmailTemplateName | null;
};

const TEMPLATE_META: Record<
  VerificationEmailTemplateName,
  {
    ctaLabel: string;
    contentFile: string;
    subject: string;
    preheader: string;
    statusLabel: string;
  }
> = {
  verification_approved: {
    ctaLabel: 'View status',
    contentFile: 'verification-approved-content.html',
    subject: 'Barangay verification approved',
    preheader: 'Your barangay verification has been approved.',
    statusLabel: 'Approved',
  },
  verification_needs_more_info: {
    ctaLabel: 'Review details',
    contentFile: 'verification-needs-more-info-content.html',
    subject: 'More information needed',
    preheader: 'Your barangay verification needs a few more details.',
    statusLabel: 'More information needed',
  },
  verification_rejected: {
    ctaLabel: 'Review details',
    contentFile: 'verification-rejected-content.html',
    subject: 'Barangay verification could not be approved',
    preheader: 'Your barangay verification was reviewed and could not be approved.',
    statusLabel: 'Could not be approved',
  },
  verification_submitted: {
    ctaLabel: 'View status',
    contentFile: 'verification-submitted-content.html',
    subject: 'Barangay verification submitted',
    preheader: 'We received your barangay verification request.',
    statusLabel: 'Submitted',
  },
};

const DEFAULT_CTA_URL = Deno.env.get('VERIFICATION_EMAIL_CTA_URL') ?? 'konektado://verification';
const EMAIL_PROVIDER_WEBHOOK = Deno.env.get('VERIFICATION_EMAIL_WEBHOOK_URL') ?? Deno.env.get('EMAIL_WEBHOOK_URL');
const EMAIL_PROVIDER_SECRET =
  Deno.env.get('VERIFICATION_EMAIL_WEBHOOK_SECRET') ?? Deno.env.get('EMAIL_WEBHOOK_SECRET');
const SMTP_HOST = Deno.env.get('VERIFICATION_EMAIL_SMTP_HOST') ?? Deno.env.get('EMAIL_SMTP_HOST');
const SMTP_PORT = Number(Deno.env.get('VERIFICATION_EMAIL_SMTP_PORT') ?? Deno.env.get('EMAIL_SMTP_PORT') ?? '587');
const SMTP_USER = Deno.env.get('VERIFICATION_EMAIL_SMTP_USER') ?? Deno.env.get('EMAIL_SMTP_USER');
const SMTP_PASS = Deno.env.get('VERIFICATION_EMAIL_SMTP_PASS') ?? Deno.env.get('EMAIL_SMTP_PASS');
const SMTP_FROM_EMAIL = Deno.env.get('VERIFICATION_EMAIL_FROM_EMAIL') ?? Deno.env.get('EMAIL_FROM_EMAIL');
const SMTP_FROM_NAME = Deno.env.get('VERIFICATION_EMAIL_FROM_NAME') ?? Deno.env.get('EMAIL_FROM_NAME') ?? 'Konektado';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Verification email function missing Supabase env vars.');
}

const supabase = createClient(supabaseUrl ?? '', serviceRoleKey ?? '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function replaceTokens(
  source: string,
  values: Record<string, string>,
  { rawTokens = new Set<string>() }: { rawTokens?: Set<string> } = {},
) {
  let output = source;

  for (const [token, value] of Object.entries(values)) {
    const tokenPattern = new RegExp(`{{\\s*${escapeRegExp(token)}\\s*}}`, 'g');
    const bracePattern = new RegExp(`{\\s*${escapeRegExp(token)}\\s*}`, 'g');
    const replacement = rawTokens.has(token) ? value : escapeHtml(value);
    output = output.replace(tokenPattern, replacement);
    output = output.replace(bracePattern, replacement);
  }

  return output;
}

function renderTemplate(layout: string, content: string, values: Record<string, string>): string {
  const renderedContent = replaceTokens(content, values);
  return replaceTokens(
    layout,
    {
      ...values,
      Content: renderedContent,
    },
    { rawTokens: new Set(['Content']) },
  );
}

async function loadTemplate(fileName: string) {
  return Deno.readTextFile(new URL(`./templates/${fileName}`, import.meta.url));
}

async function sendEmail({
  html,
  subject,
  to,
}: {
  html: string;
  subject: string;
  to: string;
}) {
  if (!EMAIL_PROVIDER_WEBHOOK) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
      throw new Error('No verification email transport is configured.');
    }
  }

  if (EMAIL_PROVIDER_WEBHOOK) {
    const response = await fetch(EMAIL_PROVIDER_WEBHOOK, {
      body: JSON.stringify({
        html,
        subject,
        to,
      }),
      headers: {
        'content-type': 'application/json',
        ...(EMAIL_PROVIDER_SECRET ? { 'x-konektado-email-secret': EMAIL_PROVIDER_SECRET } : {}),
      },
      method: 'POST',
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Email relay returned ${response.status}`);
    }
    return;
  }

  const transport = nodemailer.createTransport({
    auth: {
      pass: SMTP_PASS,
      user: SMTP_USER,
    },
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
  });

  await transport.sendMail({
    from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
    html,
    subject,
    text: html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    to,
  });
}

function buildFooterCopy() {
  return 'Uploaded IDs and documents are never attached to verification emails. If you need help, reply to this email or contact Konektado support.';
}

function buildEmailValues(
  template: VerificationEmailTemplateName,
  context: Awaited<ReturnType<typeof loadVerificationContext>>,
  ctaUrl: string,
) {
  const meta = TEMPLATE_META[template];

  return {
    'Admin Reason': context.reviewerNote || 'No admin reason was provided.',
    'Approved Date': context.reviewedDate,
    'Barangay': context.barangay,
    'CTA Label': meta.ctaLabel,
    'CTA URL': ctaUrl,
    'Footer': buildFooterCopy(),
    'Full Name': context.fullName,
    'Name': context.firstName,
    'Preheader': meta.preheader,
    'Status': meta.statusLabel,
    'Subject': meta.subject,
    'Submitted Date': context.submittedDate,
  };
}

async function loadVerificationContext(requestId: string) {
  const { data: verification, error: verificationError } = await supabase
    .from('verifications')
    .select('id, status, created_at, reviewed_at, reviewer_note, user_id')
    .eq('id', requestId)
    .maybeSingle<VerificationRow>();

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  if (!verification) {
    throw new Error('Verification request not found.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, full_name, first_name, last_name, barangay')
    .eq('id', verification.user_id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.email) {
    throw new Error('Verification recipient email is missing.');
  }

  const fullName =
    profile.full_name?.trim() ||
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    'Konektado resident';

  const firstName = profile.first_name?.trim() || fullName.split(' ')[0] || 'there';
  const barangay = profile.barangay?.trim() || 'Barangay San Pedro';

  return {
    barangay,
    email: profile.email,
    fullName,
    firstName,
    reviewedDate: formatDate(verification.reviewed_at ?? verification.created_at),
    reviewerNote: verification.reviewer_note?.trim() || '',
    status: verification.status,
    submittedDate: formatDate(verification.created_at),
  };
}

async function sendVerificationTemplate(
  template: VerificationEmailTemplateName,
  requestId: string,
  ctaUrl = DEFAULT_CTA_URL,
) {
  const meta = TEMPLATE_META[template];
  const layout = await loadTemplate('layout.html');
  const content = await loadTemplate(meta.contentFile);
  const context = await loadVerificationContext(requestId);

  const html = renderTemplate(layout, content, buildEmailValues(template, context, ctaUrl));

  await sendEmail({
    html,
    subject: meta.subject,
    to: context.email,
  });

  return {
    email: context.email,
    template,
  };
}

export async function sendVerificationSubmittedEmail(input: {
  ctaUrl?: string | null;
  requestId: string;
}) {
  return sendVerificationTemplate('verification_submitted', input.requestId, input.ctaUrl ?? undefined);
}

export async function sendVerificationApprovedEmail(input: {
  ctaUrl?: string | null;
  requestId: string;
}) {
  return sendVerificationTemplate('verification_approved', input.requestId, input.ctaUrl ?? undefined);
}

export async function sendVerificationNeedsInfoEmail(input: {
  ctaUrl?: string | null;
  requestId: string;
}) {
  return sendVerificationTemplate('verification_needs_more_info', input.requestId, input.ctaUrl ?? undefined);
}

export async function sendVerificationRejectedEmail(input: {
  ctaUrl?: string | null;
  requestId: string;
}) {
  return sendVerificationTemplate('verification_rejected', input.requestId, input.ctaUrl ?? undefined);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const template = body.template;
    const requestId = body.requestId?.trim();

    if (!template || !(template in TEMPLATE_META)) {
      return new Response(JSON.stringify({ error: 'Invalid verification email template.' }), {
        headers: { 'content-type': 'application/json' },
        status: 400,
      });
    }

    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing verification request id.' }), {
        headers: { 'content-type': 'application/json' },
        status: 400,
      });
    }

    const result = await sendVerificationTemplate(
      template as VerificationEmailTemplateName,
      requestId,
      body.ctaUrl?.trim() || undefined,
    );

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send verification email.';
    return new Response(JSON.stringify({ error: message }), {
      headers: { 'content-type': 'application/json' },
      status: 500,
    });
  }
});
