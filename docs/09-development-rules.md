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
- Never import `Alert` from `react-native`. `react-native-web` ships it as a no-op, so on web the dialog never renders and any action behind its buttons becomes unreachable. Use `showAlert` from `utils/alert.ts` instead; it keeps native `Alert` and falls back to browser dialogs on web.
- Every failure path must be visible on both native and web. Prefer inline errors or `FeedbackProvider` toasts; reserve `showAlert` for confirmations and interruptions.

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

## Service Taxonomy and Listing Classification Rules

- `constants/service-taxonomy.ts` is the single source of truth. Keep `MVP_SERVICES_BY_CATEGORY` and the metadata maps declared with `as const satisfies`: a plain `Record<..., string[]>` annotation widens the literals, silently turns `MvpServiceOption` into `string`, and makes every metadata map non-exhaustive.
- Adding a canonical service must stay a compile error until its work type and service tags exist. `npm run test:service-classification` proves this; do not weaken it to make an expansion compile.
- Canonical categories are STORED (`jobs.category`, `services.category`). Discovery groups are DISPLAY-ONLY and never persisted, so renaming a group is a code change, while renaming a stored category or service would be a data migration.
- Home renders `HOME_DISCOVERY_GROUPS` (eight primary groups). `SEARCH_DISCOVERY_GROUPS` adds `More services` for Search only. Never add `More services` to the Home grid (DEC-111).
- Every listing has exactly ONE primary canonical service (DEC-108). Bundled extras belong in the title, description, or tags. Never introduce a second primary classification.
- A listing owns its classification snapshot (DEC-109). Work Profile edits must never rewrite, reclassify, or unclassify a published listing. Only editing the listing changes it.
- Classification is deterministic and offline (DEC-107). Never add an AI, LLM, embedding, or remote classifier to this path, and never let inference assign a service without explicit resident confirmation.
- Classification must always be visible to the resident and always changeable.
- A more specific wording under a known service is a specialty, not an unknown service: store the canonical value in `category` and the wording in `custom_category` with review status `none` (DEC-110).
- Do not claim custom services are reviewed before they appear. `custom_category_review_status` is an editorial backlog signal, not a gate.
- Keep `BLOCKED_SERVICE_TERMS` current so the custom-service field cannot be used to post excluded trades, and always tell the resident plainly instead of dropping their input.

## Work Profile Skill Rules

- Residents manage skills as a flat list of plain-language abilities (DEC-112). Never surface canonical categories or discovery groups while they are managing skills.
- Every free-text skill or service entry point must go through `addSkillToList` (DEC-115). It is the single place that resolves aliases, de-duplicates on normalized text, enforces product-scope exclusions, and applies the cap. Do not re-implement any of those rules in a screen.
- Adding a skill is search-first and searches the WHOLE taxonomy (DEC-113). Never scope skill search to the selected category; that is what made `karpintero` and `birthday cake` return nothing.
- Matching suggests, the resident confirms (DEC-114). Never store an inferred service without an explicit tap. No AI, LLM, embedding, or remote classifier in this path.
- `MAX_WORK_PROFILE_SKILLS` is 15 (DEC-116). Aliases and spelling variants must collapse before the cap is applied, so a duplicate never consumes a slot.
- Skills are self-declared (DEC-119). Never label a skill verified, certified, or endorsed, and do not add a skill-review or endorsement workflow.
- Work Profile skills feed provider / Find Work ranking through `withWorkProfileSkills` (DEC-118). Never merge them into `neededServices`; offered and needed are separate signals.
- The eight Home discovery tiles are positionally stable (DEC-117). Do not sort them by preference, role, or mode. `getOrderedDiscoveryGroupsForMode` is for Search only.
- Skill pills are read-only. Creating a listing is a separately labelled action (DEC-120), and both entry points open the same Create Service editor.

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

