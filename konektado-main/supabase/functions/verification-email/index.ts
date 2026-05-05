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
  idempotencyKey?: string | null;
  requestId?: string | null;
  template?: VerificationEmailTemplateName | null;
};

const EMAIL_LAYOUT_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{Subject}}</title>
    <style>
      @media screen and (max-width: 480px) {
        .email-shell {
          width: 100% !important;
        }

        .email-padding {
          padding-left: 28px !important;
          padding-right: 28px !important;
        }

        .brand-logo {
          width: 227px !important;
        }

        .body-title {
          font-size: 22px !important;
          line-height: 30px !important;
        }

        .body-copy,
        .bullet-copy,
        .info-copy {
          font-size: 15px !important;
          line-height: 22px !important;
        }

        .details-list {
          padding-left: 24px !important;
        }

        .button-wrap {
          padding-top: 16px !important;
        }

        .button {
          width: 100% !important;
        }

        .legal-copy {
          width: 100% !important;
        }
      }

      @media (prefers-color-scheme: dark) {
        .logo-light {
          display: none !important;
        }

        .logo-dark {
          display: block !important;
        }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #ffffff">
    <div
      style="
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        color: transparent;
        line-height: 1px;
        mso-hide: all;
      "
    >
      {{Preheader}}
    </div>

    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="background: #ffffff; border-collapse: collapse; font-family: Satoshi, Arial, Helvetica, sans-serif"
    >
      <tr>
        <td style="height: 8px; background: #f2e640; font-size: 0; line-height: 0">&nbsp;</td>
      </tr>
      <tr>
        <td align="center">
          <table
            class="email-shell"
            role="presentation"
            width="726"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="width: 726px; max-width: 100%; border-collapse: collapse; background: #ffffff"
          >
            <tr>
              <td class="email-padding" style="padding: 40px 48px 32px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding: 25px 0 50px">
                      <img
                        class="brand-logo logo-light"
                        alt="Konektado"
                        src="https://dudlohdeydcbsvgccexd.supabase.co/storage/v1/object/public/brand/konektado-logo.png"
                        width="227"
                        style="display: block; width: 227px; max-width: 100%; height: auto; border: 0"
                      />
                      <img
                        class="brand-logo logo-dark"
                        alt="Konektado"
                        src="https://dudlohdeydcbsvgccexd.supabase.co/storage/v1/object/public/brand/konektado-logo-light.png"
                        width="227"
                        style="display: none; width: 227px; max-width: 100%; height: auto; border: 0"
                      />
                      <div
                        style="
                          padding-top: 4px;
                          font-size: 12px;
                          line-height: 15px;
                          color: #333333;
                          font-weight: 500;
                          letter-spacing: -0.5px;
                        "
                      >
                        Kapitbahay. Kabuhayan. Konektado.
                      </div>
                    </td>
                  </tr>

                  {{Content}}

                  <tr>
                    <td class="button-wrap" align="center" style="padding-top: 32px">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse">
                        <tr>
                          <td align="center">
                            <a
                              class="button"
                              href="{{CTA URL}}"
                              style="
                                display: inline-block;
                                min-width: 0;
                                padding: 6px 22px;
                                background: #0d99ff;
                                border-radius: 42px;
                                color: #ffffff;
                                font-size: 14px;
                                line-height: 28px;
                                font-weight: 900;
                                text-decoration: none;
                                text-align: center;
                              "
                            >
                              {{CTA Label}}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-top: 32px">
                      <p
                        style="
                          margin: 0;
                          padding: 0;
                          font-size: 16px;
                          line-height: 22px;
                          color: #333333;
                        "
                      >
                        Best Regards,
                      </p>
                      <p
                        style="
                          margin: 0;
                          padding: 0;
                          font-size: 16px;
                          line-height: 22px;
                          font-weight: 500;
                        "
                      >
                        <span style="color: #69a4ec">Konektado team</span><span style="color: #892cdc">.</span>
                      </p>
                    </td>
                  </tr>

                  {{Info Note Section}}

                  <tr>
                    <td style="padding-top: 22px">
                      <div style="height: 1px; background: #d9d9d9; line-height: 1px; font-size: 1px">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding-top: 14px">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 0 4.62px">
                            <a href="{{Instagram URL}}" style="display: inline-block; text-decoration: none; border: 0">
                              <img
                                alt="Instagram"
                                src="https://dudlohdeydcbsvgccexd.supabase.co/storage/v1/object/public/brand/instagram.png"
                                width="32"
                                height="32"
                                style="display: block; border: 0; width: 32px; height: 32px"
                              />
                            </a>
                          </td>
                          <td style="padding: 0 4.62px">
                            <a href="{{Facebook URL}}" style="display: inline-block; text-decoration: none; border: 0">
                              <img
                                alt="Facebook"
                                src="https://dudlohdeydcbsvgccexd.supabase.co/storage/v1/object/public/brand/facebook.png"
                                width="32"
                                height="32"
                                style="display: block; border: 0; width: 32px; height: 32px"
                              />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-top: 14px">
                      <div style="height: 1px; background: #d9d9d9; line-height: 1px; font-size: 1px">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding-top: 16px">
                      <p
                        style="
                          margin: 0;
                          padding: 0;
                          font-size: 10px;
                          line-height: 14px;
                          color: #000000;
                        "
                      >
                        &copy; 2026 KONEKTADO. All rights reserved.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding-top: 28px">
                      <p
                        class="legal-copy"
                        style="
                          width: 540px;
                          max-width: 100%;
                          margin: 0;
                          padding: 0;
                          font-size: 9px;
                          line-height: 14px;
                          color: #000000;
                          text-align: center;
                          font-weight: 500;
                        "
                      >
                        You are receiving this mail because you registered to join the Konektado platform. This also shows that you agree to our Terms of use and Privacy Policies.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding-top: 8px">
                      <p
                        style="
                          margin: 0;
                          padding: 0;
                          font-size: 10px;
                          line-height: 14px;
                          color: #333333;
                        "
                      >
                        <a href="{{Privacy URL}}" style="color: #333333; text-decoration: underline">Privacy policy</a>
                        <span style="color: #999999"> &bull; </span>
                        <a href="{{Terms URL}}" style="color: #333333; text-decoration: underline">Terms of service</a>
                        <span style="color: #999999"> &bull; </span>
                        <a href="{{Help URL}}" style="color: #333333; text-decoration: underline">Help center</a>
                        <span style="color: #999999"> &bull; </span>
                        <a href="{{Unsubscribe URL}}" style="color: #333333; text-decoration: underline">Unsubscribe</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const CONTENT_TEMPLATES: Record<VerificationEmailTemplateName, string> = {
  verification_approved: `<tr>
  <td>
    <h1
      class="body-title"
      style="margin: 0; padding: 0; font-size: 24px; line-height: 32px; font-weight: 800; color: #000000"
    >
      Barangay verification approved
    </h1>
  </td>
</tr>
<tr>
  <td style="padding-top: 22px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      Hi {{Name}},<br /><br />
      Your barangay verification has been approved.<br /><br />
      Your account is now verified on <span style="font-weight: 500; color: #0d99ff">Konektado</span>. Clients and workers can now see your verified status, helping build trust when you post jobs, apply, or connect with others.<br /><br />
      You can now access trusted features such as posting, applying, messaging, saving, and reviews.
    </p>
  </td>
</tr>`,
  verification_needs_more_info: `<tr>
  <td>
    <h1
      class="body-title"
      style="margin: 0; padding: 0; font-size: 24px; line-height: 32px; font-weight: 800; color: #000000"
    >
      More information needed
    </h1>
  </td>
</tr>
<tr>
  <td style="padding-top: 22px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      Hi {{Name}},<br /><br />
      We need more information to continue reviewing your barangay verification.<br /><br />
      Your submitted details were reviewed, but we could not complete the verification yet. Please update or resend the required information so we can continue the review.
    </p>
  </td>
</tr>
<tr>
  <td style="padding-top: 14px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 37px; color: #333333">
      <strong>Reason:</strong>
    </p>
    <ul class="details-list" style="margin: 0; padding: 0 0 0 48px">
      <li class="bullet-copy" style="font-size: 16px; line-height: 37px; color: #333333; font-weight: 700">
        {{Admin Reason}}
      </li>
    </ul>
  </td>
</tr>
<tr>
  <td style="padding-top: 21px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      <strong>What to do next</strong><br /><br />
      Please open your verification status to review the requested correction, then upload or update the required information and submit your verification again.
    </p>
  </td>
</tr>`,
  verification_rejected: `<tr>
  <td>
    <h1
      class="body-title"
      style="margin: 0; padding: 0; font-size: 24px; line-height: 32px; font-weight: 800; color: #000000"
    >
      Barangay verification could not be approved
    </h1>
  </td>
</tr>
<tr>
  <td style="padding-top: 22px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      Hi {{Name}},<br /><br />
      Your barangay verification could not be approved.<br /><br />
      We reviewed your submitted information, but we could not verify your account based on the details provided.
    </p>
  </td>
</tr>
<tr>
  <td style="padding-top: 14px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 37px; color: #333333">
      <strong>Reason:</strong>
    </p>
    <ul class="details-list" style="margin: 0; padding: 0 0 0 48px">
      <li class="bullet-copy" style="font-size: 16px; line-height: 37px; color: #333333; font-weight: 700">
        {{Admin Reason}}
      </li>
    </ul>
  </td>
</tr>
<tr>
  <td style="padding-top: 21px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      You may review your details and submit again if the information can be corrected.
    </p>
  </td>
</tr>`,
  verification_submitted: `<tr>
  <td>
    <h1
      class="body-title"
      style="margin: 0; padding: 0; font-size: 24px; line-height: 32px; font-weight: 800; color: #000000"
    >
      Barangay verification submitted
    </h1>
  </td>
</tr>
<tr>
  <td style="padding-top: 22px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      Hi {{Name}},<br /><br />
      Your barangay verification has been submitted.<br /><br />
      We&apos;ve received your barangay verification and it is now under review. Once approved, your account will show a verified badge and you&apos;ll be able to access trusted features like posting, applying, messaging, saving, and reviews.
    </p>
  </td>
</tr>
<tr>
  <td style="padding-top: 14px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 37px; color: #333333">
      <strong>Submitted Details:</strong>
    </p>
    <ul class="details-list" style="margin: 0; padding: 0 0 0 48px; color: #333333">
      <li class="bullet-copy" style="margin-bottom: 11px; font-size: 16px; line-height: 22px">
        <strong>Name:</strong> {{Full Name}}
      </li>
      <li class="bullet-copy" style="margin-bottom: 11px; font-size: 16px; line-height: 22px">
        <strong>Barangay:</strong> {{Barangay}}
      </li>
      <li class="bullet-copy" style="margin-bottom: 11px; font-size: 16px; line-height: 22px">
        <strong>Submitted on:</strong> {{Submitted Date}}
      </li>
      <li class="bullet-copy" style="font-size: 16px; line-height: 22px">
        <strong>Status:</strong> <span style="font-weight: 500; color: #fcc03b">Pending Review</span>
      </li>
    </ul>
  </td>
</tr>
<tr>
  <td style="padding-top: 21px">
    <p class="body-copy" style="margin: 0; padding: 0; font-size: 16px; line-height: 22px; color: #333333">
      <strong>What happens next:</strong><br /><br />
      Our team will review your submitted information. You will receive another email once your verification is approved or if more information is needed.
    </p>
  </td>
</tr>`,
};

const TEMPLATE_META: Record<
  VerificationEmailTemplateName,
  {
    ctaLabel: string;
    subject: string;
    preheader: string;
    statusLabel: string;
  }
> = {
  verification_approved: {
    ctaLabel: 'Open Konektado',
    subject: 'Barangay verification approved',
    preheader: 'Your barangay verification has been approved.',
    statusLabel: 'Approved',
  },
  verification_needs_more_info: {
    ctaLabel: 'Update verification',
    subject: 'More information needed',
    preheader: 'Your barangay verification needs a few more details.',
    statusLabel: 'More information needed',
  },
  verification_rejected: {
    ctaLabel: 'Review and resubmit',
    subject: 'Barangay verification could not be approved',
    preheader: 'Your barangay verification was reviewed and could not be approved.',
    statusLabel: 'Could not be approved',
  },
  verification_submitted: {
    ctaLabel: 'View verification status',
    subject: 'Barangay verification submitted',
    preheader: 'We received your barangay verification request.',
    statusLabel: 'Submitted',
  },
};

const DEFAULT_CTA_URL = Deno.env.get('VERIFICATION_EMAIL_CTA_URL') ?? 'konektado://verification';
const DEFAULT_SITE_URL = Deno.env.get('VERIFICATION_EMAIL_SITE_URL') ?? 'https://konektado.app';
const PRIVACY_URL = Deno.env.get('VERIFICATION_EMAIL_PRIVACY_URL') ?? `${DEFAULT_SITE_URL}/privacy`;
const TERMS_URL = Deno.env.get('VERIFICATION_EMAIL_TERMS_URL') ?? `${DEFAULT_SITE_URL}/terms`;
const HELP_URL = Deno.env.get('VERIFICATION_EMAIL_HELP_URL') ?? `${DEFAULT_SITE_URL}/help`;
const UNSUBSCRIBE_URL = Deno.env.get('VERIFICATION_EMAIL_UNSUBSCRIBE_URL') ?? DEFAULT_SITE_URL;
const INSTAGRAM_URL = Deno.env.get('VERIFICATION_EMAIL_INSTAGRAM_URL') ?? DEFAULT_SITE_URL;
const FACEBOOK_URL = Deno.env.get('VERIFICATION_EMAIL_FACEBOOK_URL') ?? DEFAULT_SITE_URL;
const RESEND_API_KEY = Deno.env.get('VERIFICATION_EMAIL_RESEND_API_KEY') ?? Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('VERIFICATION_EMAIL_FROM_EMAIL') ?? Deno.env.get('EMAIL_FROM_EMAIL');
const RESEND_FROM_NAME = Deno.env.get('VERIFICATION_EMAIL_FROM_NAME') ?? Deno.env.get('EMAIL_FROM_NAME') ?? 'Konektado';
const EMAIL_PROVIDER_WEBHOOK = Deno.env.get('VERIFICATION_EMAIL_WEBHOOK_URL') ?? Deno.env.get('EMAIL_WEBHOOK_URL');
const EMAIL_PROVIDER_SECRET =
  Deno.env.get('VERIFICATION_EMAIL_WEBHOOK_SECRET') ?? Deno.env.get('EMAIL_WEBHOOK_SECRET');
const SMTP_HOST = Deno.env.get('VERIFICATION_EMAIL_SMTP_HOST') ?? Deno.env.get('EMAIL_SMTP_HOST');
const SMTP_PORT = Number(Deno.env.get('VERIFICATION_EMAIL_SMTP_PORT') ?? Deno.env.get('EMAIL_SMTP_PORT') ?? '587');
const SMTP_USER = Deno.env.get('VERIFICATION_EMAIL_SMTP_USER') ?? Deno.env.get('EMAIL_SMTP_USER');
const SMTP_PASS = Deno.env.get('VERIFICATION_EMAIL_SMTP_PASS') ?? Deno.env.get('EMAIL_SMTP_PASS');
const SMTP_FROM_EMAIL = Deno.env.get('VERIFICATION_EMAIL_FROM_EMAIL') ?? Deno.env.get('EMAIL_FROM_EMAIL');
const SMTP_FROM_NAME = Deno.env.get('VERIFICATION_EMAIL_FROM_NAME') ?? Deno.env.get('EMAIL_FROM_NAME') ?? 'Konektado';

const supabaseUrl = Deno.env.get('PROJECT_URL');
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

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
    { rawTokens: new Set(['Content', 'Info Note Section']) },
  );
}

async function sendEmail({
  html,
  subject,
  idempotencyKey,
  to,
}: {
  html: string;
  subject: string;
  idempotencyKey: string;
  to: string;
}) {
  if (RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL || 'no-reply@konektado.app'}>`,
        html,
        subject,
        text: html
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        to,
      }),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Idempotency-Key': idempotencyKey,
        'content-type': 'application/json',
        'User-Agent': 'Konektado verification-email',
      },
      method: 'POST',
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(message || `Resend returned ${response.status}`);
    }
    return;
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

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    throw new Error('No verification email transport is configured.');
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

function buildInfoNoteSection(value: string) {
  if (!value.trim()) {
    return '';
  }

  return `<tr>
    <td style="padding-top: 32px">
      <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="
          border-collapse: separate;
          border-spacing: 0;
          background: #f5f5ef;
          border-radius: 13px;
        "
      >
        <tr>
          <td width="26" valign="top" style="padding: 16px 0 16px 16px">
            <div
              style="
                width: 18px;
                height: 18px;
                border: 2px solid #0d99ff;
                border-radius: 999px;
                color: #0d99ff;
                font-size: 13px;
                line-height: 18px;
                text-align: center;
                font-weight: 800;
              "
            >
              i
            </div>
          </td>
          <td style="padding: 16px 20px 16px 12px">
            <p
              class="info-copy"
              style="
                margin: 0;
                padding: 0;
                font-size: 14px;
                line-height: 21px;
                color: #46576c;
              "
            >
              ${escapeHtml(value)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildInfoNote(template: VerificationEmailTemplateName) {
  switch (template) {
    case 'verification_approved':
      return 'Your verified status helps others know that your account has passed barangay verification.';
    case 'verification_submitted':
      return 'For your privacy, uploaded IDs and documents are not attached to this email.';
    default:
      return '';
  }
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
    'Facebook URL': FACEBOOK_URL,
    'Full Name': context.fullName,
    'Help URL': HELP_URL,
    'Info Note Section': buildInfoNoteSection(buildInfoNote(template)),
    'Instagram URL': INSTAGRAM_URL,
    'Name': context.firstName,
    'Preheader': meta.preheader,
    'Privacy URL': PRIVACY_URL,
    'Status': meta.statusLabel,
    'Subject': meta.subject,
    'Submitted Date': context.submittedDate,
    'Terms URL': TERMS_URL,
    'Unsubscribe URL': UNSUBSCRIBE_URL,
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
  idempotencyKey?: string,
) {
  const meta = TEMPLATE_META[template];
  const layout = EMAIL_LAYOUT_TEMPLATE;
  const content = CONTENT_TEMPLATES[template];
  const context = await loadVerificationContext(requestId);

  const html = renderTemplate(layout, content, buildEmailValues(template, context, ctaUrl));

  await sendEmail({
    html,
    idempotencyKey: idempotencyKey || `verification-email:${template}:${requestId}`,
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
    const idempotencyKey = body.idempotencyKey?.trim();
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
      idempotencyKey || undefined,
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
