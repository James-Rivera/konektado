# Konektado Supabase Email Templates

Use `magic-link-otp.html` as the body for both of these Supabase Auth templates:

- `Magic link`
- `Confirm sign up`

For the current app signup flow, the email is sent from `Magic Link` because the app calls `signInWithOtp()` with `shouldCreateUser: true`, then verifies the 6-digit code before the user creates their real password.

Keep both templates aligned with the same `{{ .Token }}` body, and configure Supabase Auth's OTP length to **6 digits**. If Supabase is set to 8 digits while this template only displays six boxes, every code entered in the app will be rejected.

The logo in this template is plain styled text, not inline SVG. That is intentional for email-client compatibility.

Upload both of these PNGs to your public `brand` bucket:

- `konektado-logo.png`
- `konektado-logo-light.png`

The template uses `prefers-color-scheme` as a best-effort dark-mode swap. Email client support varies, so the light logo is the default fallback.

Set the subject on both templates to:

```text
Your Konektado verification code
```

The template uses `{{ slice .Token 0 1 }}` through `{{ slice .Token 5 6 }}` to display the 6-digit Supabase OTP in separate boxes.
