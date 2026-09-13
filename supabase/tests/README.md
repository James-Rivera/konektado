# Backend security regression tests

These tests use an **isolated local PostgreSQL cluster**, never the linked Supabase project. `local-platform.sql` supplies minimal Auth/Storage contracts, not a full Supabase installation. Do not run it against hosted or personal databases.

## Run

Install PostgreSQL and an official PostgREST Windows binary (tested PostgreSQL 18.1/PostgREST 16.3). Start a disposable cluster bound to `127.0.0.1:55439` with a local postgres login. No Docker reset, production credentials, or real email is required.

```powershell
$env:TEST_PSQL = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$env:TEST_POSTGREST = 'C:\path\to\postgrest.exe'
node scripts/test-database-security.cjs
node scripts/test-verification-email-security.cjs
npx tsc --noEmit
npm run lint
```

`TEST_PGPORT` and `TEST_HTTP_PORT` optionally override ports 55439 and 55440. The runner creates a uniquely named `konektado_security_test_*` database, replays every migration transactionally, runs `security-permissions.sql`, starts PostgREST only on localhost, runs authenticated HTTP tests, then stops its server and drops only its own database. Its test JWT secret is deliberately public and must never be used elsewhere. Cluster-wide test roles remain in the disposable cluster.

On Windows, if Expo's existing lint cache is inaccessible, use:

```powershell
npm run lint -- --no-cache -- --cache-location C:/konektado/node_modules/.cache/audit-eslint
```

SQL tests exercise normal signup, admin verification, pending credentials, publishing, messaging, hiring, completion and reciprocal reviews, plus negative role/field/RLS/storage cases. Fixtures roll back. HTTP tests exercise direct PostgREST bypasses and legitimate paths, including concurrent hires and forced second-write failure. Email tests run the actual handler with mocked Auth/database/provider boundaries and send no email.

## Deployment preflight and manual QA

1. Inspect the linked migration history and apply the new corrective migration using the normal reviewed `supabase db push` process. Do not edit old migrations. Deploy the updated application services and `verification-email` function in the same release. Old direct-write hiring clients will be rejected.
2. Inspect existing hiring inconsistencies before deploying. The unique index intentionally aborts on multiple hired conversations instead of deleting history:

```sql
select job_id, count(*) from public.conversations
where job_id is not null and hired_at is not null
group by job_id having count(*) > 1;

select j.id, j.status, j.accepted_provider_id, c.id as conversation_id,
       c.provider_id, c.status as conversation_status
from public.jobs j
left join public.conversations c on c.job_id = j.id and c.hired_at is not null
where (j.status in ('in_progress', 'completed') and
       (c.id is null or c.status <> 'hired' or j.accepted_provider_id is distinct from c.provider_id))
   or (c.id is not null and (j.status not in ('in_progress', 'completed')
       or j.accepted_provider_id is distinct from c.provider_id));
```

Resolve any legacy inconsistencies with an explicit reviewed data repair; this migration does not guess historical hiring outcomes. Also inspect any old approved verification records without profile verification timestamps.

3. Confirm both verification/credential buckets remain private, signed URLs work only for owner/admin, and unrelated authenticated users cannot read metadata or object contents. Check actual hosted column grants and exposed schemas; `app_private` must not be an exposed API schema. Test hosted PostgREST job queries with explicit safe columns (including inserts with returned rows).
4. Confirm signed-in owner acknowledgement and actual admin approval/rejection/needs-info emails. Test invalid JWTs and unrelated callers. Confirm server email secrets/CTA settings, delivery, and provider deduplication. `scripts/test-verification-email.js <requestId>` sends a **real** email and now requires `VERIFICATION_EMAIL_ACCESS_TOKEN` plus the public API key; no service-role bearer substitute.
5. On devices, test signup/email OTP/password login, contact proof, upload failure cancellation, resubmission/name correction, and admin review. Then test both complete/incomplete role profiles, posting/editing, message sending/realtime/inbox archive, Mark Hired from two clients, completion, reciprocal reviews, public credentials, and private-note editing. Confirm existing admin demo creation/editing with verified seed profiles. No Expo server is started by these tests.

The local platform stub does not implement Auth signup/email delivery, Storage HTTP signing, or Realtime. Those are explicitly hosted/device QA items.
