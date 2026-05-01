# Development Rules

## Tech Stack

- Expo.
- React Native.
- TypeScript.
- Expo Router.
- Supabase Auth.
- Supabase PostgreSQL.
- Supabase Storage.
- ESLint through Expo.

## Folder Structure

Target structure:

```text
/app                 Expo Router screens and navigation only
/components          Reusable UI components
/components/ui       Smaller base UI components
/constants           Theme tokens and app constants
/hooks               Reusable React hooks
/services            Backend/service-layer functions
/stores              Global state if needed
/types               Shared TypeScript types
/utils               Low-level utilities such as Supabase client
/sql                 Database migrations and SQL notes
/docs                Source-of-truth project documentation
/assets              Fonts, images, icons
```

Current prototype note:

- Some screens currently call Supabase directly.
- As features are completed, move those queries into `/services`.
- Current app screens still reflect an older Home/Explore/Profile prototype. Replace them with the Figma-aligned Home/Post/Messages/Profile structure.

## Coding Rules

- Use TypeScript for all app code.
- Keep screens thin.
- Screens should handle layout, local form state, and user interaction.
- Services should handle backend calls, data mapping, and permission-sensitive logic.
- Hooks should compose services and expose loading/error/data state.
- Components should receive data through props and avoid database access.
- Shared types belong in `/types`.
- Avoid duplicating Supabase queries across screens.
- Prefer clear simple code over clever abstractions.

## Naming Conventions

Files:

- Components: `PascalCase.tsx` for reusable components.
- Hooks: `use-something.ts`.
- Services: `something.service.ts`.
- Types: `something.types.ts`.
- Screens: follow Expo Router file naming.

Types:

- `Profile`
- `PublicProfile`
- `CreateJobInput`
- `JobStatus`
- `ServiceResult<T>`

Functions:

- Service functions use verbs: `createJob`, `searchJobs`, `startJobConversation`, `sendMessage`, `markWorkerHired`.
- Hooks start with `use`: `useProfile`, `useJobs`.

## State Management Rules

Use the simplest state tool that works:

- Local component state for form fields and simple UI state.
- Custom hooks for server data loading.
- `/stores` only for global state that multiple unrelated screens need.
- Avoid global state for data that can be loaded by a service/hook.

Good candidates for `/stores`:

- Current active role.
- Lightweight app preferences.
- Temporary onboarding draft if it spans multiple screens.

Avoid storing:

- Passwords.
- Private file URLs beyond the current workflow.
- Large lists that should come from queries.

## Service-Layer Rules

Every backend feature should have a service contract.

Rules:

- No database queries directly inside UI components.
- Services return typed results.
- Services map database rows into app-friendly types.
- Services hide Supabase-specific details from screens where practical.
- Services should be easy to replace with HTTP calls later.
- Services must enforce business rules even if the UI hides disallowed buttons.

Example pattern:

```ts
const result = await JobService.createJob(input);

if (result.error) {
  showError(result.error);
  return;
}

router.push(`/jobs/${result.data.id}`);
```

## Error Handling Rules

- Show user-friendly errors in screens.
- Log technical errors only during development or through a controlled logger.
- Do not show raw SQL or Supabase errors directly to users.
- Validate form inputs before calling services.
- Services should normalize common errors like duplicate job conversations.
- Destructive actions require confirmation.

Examples:

- Good: "You already have a conversation for this job."
- Bad: "duplicate key value violates unique constraint conversations_job_id_provider_id_key"

## Testing and Debugging Rules

Minimum checks before marking a feature done:

- Run `npm run lint`.
- Test the main happy path in Expo Go or emulator.
- Test at least one validation error.
- Test signed-out behavior for protected screens.
- Test with provider and client roles if the feature is role-based.

Manual test examples:

- Register -> role selection -> onboarding -> tabs.
- Provider creates service -> client sees provider.
- Client posts job -> provider sees job -> provider messages client.
- Client marks interested worker hired from Messages.
- Admin approves verification -> badge appears.

## Dependency Rules

- Prefer existing Expo-compatible libraries.
- Avoid adding dependencies for small utilities that can be written clearly.
- Check React Native and Expo compatibility before installing.
- Avoid backend libraries that lock the app to Supabase-specific UI patterns.
- Keep migration-friendly architecture by isolating Supabase in `/services` and `/utils/supabase.ts`.

## Database Rules

- Use SQL migrations in `/sql`.
- Keep table names plural and snake_case.
- Use UUID primary keys.
- Use `created_at` and `updated_at` timestamps on app tables.
- Enable Row Level Security for all app tables.
- Use indexes for foreign keys and search/filter fields.
- Prefer status fields over hard deletes for business records.

## Git and Documentation Rules

- Update `/docs` when product scope, data model, permissions, or architecture changes.
- Record major decisions in `docs/11-decision-log.md`.
- Keep README short and link to `/docs` once documentation is stable.

