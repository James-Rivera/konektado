# Checkpoint and approved releases

## Approved main/demo release (2026-11-15)

After staging provisioning was blocked by the free-project limit, the user approved a coordinated main/demo release: commit the remaining release tooling separately, make and verify private database and Storage backups, apply the two pending November migrations in order, then push to `main`, monitor the Git-triggered Vercel deployment, and smoke-test it. This approval does not authorize resetting data, seeding, deleting projects, changing plans, or submitting Android builds to a store. Staging provisioning remains pending, and the staging-only workflow guards remain in force.

Before this release, GitHub `main` is `e9c5c8ee48ccd0d9bc517a966a44320ba8382f63`; the last ready production deployment is `dpl_9scUfMQhrCuPUffjRSHmpt79czT6`. Preserve these references. Restoring that client alone does not reverse database changes or guarantee compatibility with the new validation rules.

The pending database sequence is `20261113090000_posting_profile_repairs.sql`, then `20261115090000_durable_listing_edits_and_schedules.sql`. The new client requires their columns and RPCs, so complete database verification before pushing the Git-integrated production branch. Each migration is transactional individually; the pair is not one transaction. Use the canonical committed versions through the linked CLI, with a dry-run that shows only these two files. Do not substitute a freshly timestamped MCP migration.

Release status must be recorded from observed results. Approval and a successful dry-run do not mean a backup, migration, push, or deployment has completed. CLI and MCP login sessions are separate; a fresh CLI login may require the user to complete provider authentication without sharing credentials in chat.

### Completed preflight before the main push

The release tooling is preserved separately in commit `8c549b4`. On 2026-11-15, lint, application TypeScript, all 241 application tests, all 16 release-guard tests, and a fresh static web export passed. All 111 export files were checked against the local server-only credentials, with no matches. The served app at `https://konektado-nu.vercel.app` was verified to use the expected demo project and a publishable key. `konektado.app` currently serves the separate landing page; do not change its deployment or domains as part of this app release.

Private recovery files are under `%USERPROFILE%/.konektado-private/releases/main-20261115/`, with access limited to the owner and SYSTEM. They include a full logical database archive, an application recovery archive covering `public`, `app_private`, `auth`, `storage`, and migration history, a roles export without role passwords, manifests and SHA-256 hashes, and all 69 Storage objects across seven buckets. The first app/Auth/Storage archive omitted the private function schema; retain it as evidence, but use `database-app-recovery-complete.dump` for application recovery. The full archive already includes that schema.

The complete application recovery archive was restored successfully into a new private, password-protected localhost PostgreSQL 18 cluster. Both November migrations passed on that restored copy with the checked user/profile/listing/draft/Storage row counts unchanged. The local rehearsal retained the existing `public` schema, assigned object ownership to local `postgres`, and normalized role membership grantors to the restore administrator. It does not certify a full managed Supabase platform restore, Auth service operation, or extension parity. The original archives and roles export remain unmodified; the scratch cluster is stopped and retained. Local backups are not encrypted off-device backups.

The reviewed hosted dry-run contained exactly `20261113090000,20261115090000`. Both were then applied through `supabase db push --linked --yes`, preserving their canonical versions. Hosted history now matches all 41 committed migrations. Checked row counts match the baseline, the new edit/publication RPCs deny `anon` and allow `authenticated`, and every public table retains RLS. Existing security-advisor findings were recorded before the release, including the visibility view, mutable function search paths and executable SECURITY DEFINER functions; this release does not claim to resolve that separate security backlog. Browser/native end-to-end acceptance remains distinct from these database and automated checks.

### Live API correction

The first authenticated API smoke exposed a missing column grant: the new client selects `jobs.content_version`, but the jobs table intentionally uses column-level SELECT grants to protect `private_location_notes`. Add `20261115111133_grant_job_content_version_read.sql` after the two November migrations. It grants authenticated SELECT on that one public version column, without a table-wide grant or anonymous access. The SQL security regression now reads the version under an authenticated role as well as checking the private-note boundary. This correction is required for the release's job queries; successful schema/RPC inspection alone did not catch it.

The correction was verified against the restored snapshot and a clean replay of all **42** migrations, including the SQL security, posting/profile, durable edit, stale-write, rollback/retry and concurrent publication/edit suites. It was committed as `ef59398`, dry-run checked as the sole pending migration, and applied through the linked CLI. A real public-API smoke using the existing dedicated client demo account then passed job/service queries, private draft reads, both role profile reads, listing repair RPC resolution, anonymous edit-RPC denial, and private job-note column denial. No application rows were published or edited by this smoke test. Hosted migration history now contains 42 versions.

## Preserved baseline

The user approved the local 70-file source/test/docs/migration checkpoint on 2026-11-15. Commit `e3ee4794832a7b3f2921c94a19d15b852dacf887` preserves that exact reviewed snapshot. Release-tooling changes are separate from this commit.

All 52 original screenshots remain in `docs/audit-assets/`, explicitly ignored and not tracked. The primary verified ZIP and SHA-256 manifest are outside the repository under `%USERPROFILE%/.konektado-private/checkpoints/posting-profile-20261115-e3ee479/`, with inherited access removed and access limited to the owner and SYSTEM. An ignored working copy also remains in `.test-build/private-evidence/`; workspace copies and original screenshots are not a substitute for that protected backup. This is a local backup, not an off-device backup or encrypted archive. Do not upload it or commit raw evidence without a privacy review. Retained PostgreSQL test data elsewhere in `.test-build` is not disposable cache.

## Current connections and provisioning

- GitHub MCP is authenticated as `James-Rivera` and has repository push access. Local `gh` authentication is expired; this does not invalidate the MCP connection.
- Supabase MCP is connected and CLI login was refreshed. The existing Konektado demo project is `dudlohdeydcbsvgccexd` in `ap-southeast-1`. Its migration history now matches all 42 local migrations, including November 13, November 15, and the job-version column grant correction, after the approved backup and restore checks above.
- Vercel MCP is connected. Existing app project: `prj_D6ULsLK7sHN55AKJydvVOxEKcOJo`; team: `team_jNjTicXGGTGrjk1DePtFJYCy`. Vercel is already Git-linked to `James-Rivera/konektado`. Do not change the separate landing-page project.
- The user selected staging first. Supabase quoted $0/month for a separate Singapore staging project, and the user approved empty-project creation. Creation failed because the account has reached its two-active-free-project limit. No project was created, and no existing project was paused, deleted, upgraded, migrated, or seeded. The user subsequently chose to keep staging pending.
- EAS CLI identity is verified as `avera_tech`. An initial sandboxed request could not resolve `api.expo.dev`; the read-only check succeeded with normal network access. Existing signing/project configuration is retained; no build was started. CI still requires its own `EXPO_TOKEN`.

MCP authorizations and CI credentials are separate. An MCP connection does not automatically supply GitHub Actions with a provider token or database password. Never copy a service-role key into client variables or use it as a substitute for CLI database credentials.

## Release tooling

`quality.yml` runs lint, TypeScript, pure release-guard tests, and the existing TypeScript suite on pushes/PRs or manual dispatch. It does not build or deploy the app and needs no service secrets. Actions are pinned to reviewed commit SHAs.

`staging-release.yml` has only `workflow_dispatch`. Each run selects one action: `plan-database`, `apply-database`, `deploy-web`, or `build-android`. It does not chain a database change into an unapproved deployment. All actions reject the existing demo project reference; missing staging configuration fails before remote operations. There is no production release path.

Provider credentials are scoped to the steps that authenticate. The initial guard receives only presence markers; dependency installation and source checks do not receive provider tokens. Vercel uses `VERCEL_TOKEN` through the environment, never command-line token arguments. Supabase CLI stays on the v2 version pinned by `package-lock.json`; a v3 upgrade requires reviewing its changed targeting/confirmation behavior.

The user has approved committing and pushing this setup as part of the coordinated main release described above. GitHub's manual Run workflow UI requires the workflow to exist on the default branch. Staging workflow execution still requires its own configured staging target and action approval.

## One-time staging setup, after capacity is available

1. Create the separately approved staging Supabase project. Do not pause or upgrade other projects to make room without explicit approval.
2. Configure a GitHub Actions environment named `staging`. Add a required reviewer and restrict allowed branches to the reviewed release branch/default branch. Confirm these protections exist before supplying deployment credentials; they are not created by these files.
3. Add environment **variables**: `SUPABASE_PROJECT_REF`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` (publishable/anon only), `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Public Supabase values must belong to staging, not the current demo.
4. Add environment **secrets** through provider/GitHub settings: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`, and `EXPO_TOKEN` for the operations being enabled. Use scoped provider tokens where available. Do not paste credentials into chat, command history, source files, or workflow inputs.
5. For Vercel, configure staging Supabase public values in **Preview**, scoped to the release branch. Preserve Production variables. Before any approved push, review Vercel's automatic Git deployment settings: an existing Git integration may otherwise start a build independently of these manual Actions. Pushing remains a separate approval.
6. For Android, verify EAS's existing `preview` environment contains the staging URL/key and uses the existing project/keystore. Then set GitHub variable `EAS_PREVIEW_SUPABASE_PROJECT_REF` to that verified staging ref. This is an operator attestation, not a live EAS environment inspection. Update Android version code in a separately reviewed change before distributing the next artifact.

The existing local `Konektado-preview.apk` matches the older October artifact. It does not contain the November repairs. No new installed-APK validation is claimed.

## Approving one operation

- Select the reviewed commit/branch and dispatch `plan-database` to inspect migration history and a dry-run. It changes no application schema.
- For a write/build, provide `action:<full-40-character-workflow-commit-SHA>` as `confirmation`, for example `apply-database:<SHA>`. Inputs are passed through environment variables, not interpolated into shell code.
- For `apply-database`, provide a verified backup reference (or a documented verified-empty staging baseline) and an exact expected migration set. `all-local` is appropriate only for a new empty staging project after reviewing all migrations; otherwise use explicit comma-separated versions or `none`. The preflight rejects missing/unexpected versions or unrecognized dry-run output. The migrations are applied in filename order. Do not run concurrent changes outside this workflow between plan and apply.
- A fresh empty staging project needs all **42** current migrations. The demo release applied November 13, November 15, then the job-version grant correction; the demo remains deliberately forbidden by this staging workflow. Do not include `supabase/seed.sql`, reseeds, test fixtures, or `db reset` in deployment.
- `deploy-web` requires no pending local migrations and verifies Vercel's pulled Preview URL/key match the approved staging values. It runs a preview build/deploy, never `--prod` or domain promotion. It does not certify hosted Auth, Storage, RLS, or native behavior.
- `build-android` starts one internal APK build after explicit approval. It does not submit to a store, apply migrations, or deploy web. Retain the existing signing key.

Use the posting/draft/conflict/profile/search checklist from the checkpoint review and `posting-followup-implementation-2026-11-15.md` before accepting a release. Restore points, Storage-file backups, migration-plan review, native keyboard/Back/TalkBack testing, and rollback compatibility remain release responsibilities. Database backups do not include Storage file contents.

## MCP and rollback

The connected tools can inspect GitHub, Supabase migration history, and Vercel configuration/deployments. Every push, schema change, build, deployment, promotion, or destructive operation still needs its corresponding user approval. Keep Supabase migration history aligned with the committed timestamped files; do not substitute ad hoc SQL or blindly generate differently versioned MCP migrations for this CLI-managed chain.

Keep the checkpoint and last compatible client artifacts. Prefer a reviewed forward database correction preserving durable drafts/publication history. A Git revert or migration-history repair is not a database rollback. A full restore needs explicit approval and accounting for writes after the recovery point; an old client must be tested against the migrated schema before reuse.

References: [Supabase environments](https://supabase.com/docs/guides/deployment/managing-environments), [GitHub deployment reviews](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments), [Vercel CI](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel), [EAS CI](https://docs.expo.dev/build/building-on-ci/).
