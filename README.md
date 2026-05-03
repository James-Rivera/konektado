# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Current feature slices

### Slice 1 – Auth + onboarding

- Supabase email OTP signup plus email/password login wired through session gating in `app/_layout.tsx`.
- Role selection screen (`client` or `provider`) stored in `profiles.role`.
- Profile setup flow that runs immediately after selecting a role and blocks entry to tabs until completed.

### Slice 2 – Detailed profile management

- Profile onboarding is now a multi-screen flow (`app/(auth)/profile-setup/*`) that walks through personal info, location, profession, and an optional certification review step instead of dumping every field on one form.
- Saying "yes" on the certification step writes `profiles.certification_status = 'pending'` and sends the user to a waiting screen until barangay admins approve the documents; skipping drops them right into the tabs experience.
- Profile tab (`app/(tabs)/profile.tsx`) shows government-friendly identity info (derived age, address, contact details) and provides an inline edit form plus sign-out.
- `hooks/use-profile.ts` centralizes access to the extended profile schema while `hooks/use-profile-status.ts` ensures the tabs stay behind the guard if any required data is missing or if certifications are pending.

### Upcoming slices (planned)

1. Provider services & barangay verification (certificate uploads, admin approval).
2. Role hierarchy tooling (barangay admin vs superadmin dashboards).
3. Job marketplace (clients post tasks, providers apply).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction). The current navigation flow is:

```
login/register → role selection → profile setup (personal → location → profession → certifications) → tabs (home/explore/profile)
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Supabase profile schema

Slice 2 requires the `profiles` table to include richer identity fields. Run this SQL inside the Supabase SQL editor (adjust column types if you already created them):

```sql
alter table profiles
   add column if not exists first_name text,
   add column if not exists last_name text,
   add column if not exists birthdate date,
   add column if not exists street_address text,
   add column if not exists city text,
   add column if not exists service_type text,
   add column if not exists phone text,
   add column if not exists about text,
   add column if not exists availability text,
   add column if not exists verified_at timestamptz,
   add column if not exists has_certifications boolean default false,
   add column if not exists certification_details text,
   add column if not exists certification_status text default 'not_required';
```

The same script lives in [sql/20260329_profile_details.sql](sql/20260329_profile_details.sql) so you can re-run or tweak it later.

All existing policies remain valid; authenticated users must be able to `select` their own `profiles` rows for the new screens to load.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
