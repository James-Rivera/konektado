# Konektado Supabase Email Templates

Use `magic-link-otp.html` as the body for both of these Supabase Auth templates:

- `Magic link`
- `Confirm sign up`

Use `password-recovery-otp.html` as the body for this Supabase Auth template:

- `Password Recovery`

For the current app signup flow, the email is sent from `Magic Link` because the app calls `signInWithOtp()` with `shouldCreateUser: true`, then verifies the 6-digit code before the user creates their real password.

For the current app forgot-password flow, the email is sent from `Password Recovery` because the app calls `resetPasswordForEmail()`, verifies the 6-digit recovery code, then lets the user create a new password in app.

Keep all OTP-based templates aligned around `{{ .Token }}`, and configure Supabase Auth's OTP length to **6 digits**. If Supabase is set to 8 digits while these templates only display six boxes, every code entered in the app will be rejected.

The logo in this template is plain styled text, not inline SVG. That is intentional for email-client compatibility.

Upload both of these PNGs to your public `brand` bucket:

- `konektado-logo.png`
- `konektado-logo-light.png`

The template uses `prefers-color-scheme` as a best-effort dark-mode swap. Email client support varies, so the light logo is the default fallback.

Set the subject on `Magic link` and `Confirm sign up` to:

```text
Your Konektado verification code
```

Set the subject on `Password Recovery` to:

```text
Reset your Konektado password
```

Both templates use `{{ slice .Token 0 1 }}` through `{{ slice .Token 5 6 }}` to display the 6-digit Supabase OTP in separate boxes.
