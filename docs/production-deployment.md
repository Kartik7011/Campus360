# Production deployment

This repository builds a static Campus360 client and ships a non-root Nginx container. It does not provision a Supabase project, university accounts, SMTP delivery, or staff MFA enrollment. A university administrator must own and operate those services.

## Required configuration

- A production Supabase project in the university-approved India region, separate from development and staging.
- Provision university-managed email/password accounts for students and staff through the approved campus IT process. Configure verified email, a 12-character minimum password, password reset redirects, rate limits, and the university-controlled SMTP service. Staff accounts must use TOTP MFA; RLS requires MFA before granting staff access.
- Parent accounts must be provisioned from active student consent records and use email one-time links. Configure approved SMTP delivery and abuse limits for both password resets and parent sign-in links.
- Run database migrations `001_init.sql` through `008_ticket_service_write_guard.sql` in numeric order. Do not apply `supabase/seed.sql` to production. It contains sample people, academic records, fees, payments and opportunities.
- Replace the `staff-admin` sample row inserted by migration 005 with the designated university IT administrator before provisioning auth accounts. Review every profile/role link after provisioning and first sign-in.
- Import only institution-approved records using the university's controlled process. ERP integration is out of scope here; define who owns manual refreshes, validation, corrections and stale-data notices.
- Configure Supabase backups/PITR and confirm retention, recovery objectives, and an actual restore drill. No application code can prove that provider-level recovery is active.
- Choose a malware scanning service and retention/deletion policy for uploaded evidence. The storage bucket enforces private access, extension-derived MIME types, and size caps, but it does not scan file contents.

## Build and run the container

The Supabase URL and anon key are public client configuration and become part of the static bundle. Never pass a service-role key or database password to this build.

```sh
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-public-anon-key \
  -t campus360:release .
docker run --rm -p 8080:8080 campus360:release
```

The container listens on port 8080, serves the single-page app with security headers, and exposes `/healthz` for a liveness check. Put it behind the institution's TLS-terminating load balancer, configure HSTS at that edge, and update the Content Security Policy if the approved Supabase or model-download hosts differ from the defaults in `deploy/security-headers.conf`.

Use immutable image tags and pin the base image digests in the institution's release pipeline. Promote the same tested image from staging to production. Keep Supabase URL/anon key changes as reviewed build configuration; rotate provider secrets only in the provider dashboard.

## Before opening access

- Confirm production account-provisioning and password reset settings, redirect origins, parent OTP delivery, and staff MFA enrollment with real university accounts.
- Verify the migration chain and role behavior in staging. Confirm that parents cannot see placement, resumes, private requests, or other students; staff roles see only their office queues; files are readable only by the student and the responsible office.
- Check that the production build has no sample names or demo passwords and that payment initiation remains disabled. The test `pay_charges()` RPC is revoked from client roles; approved payments and refunds need a separately reviewed provider integration.
- Validate manual data-load reconciliation and record corrections against the university source. The static app is not an ERP replacement or an automatic source of truth.
- Configure monitoring, alert ownership, staging, security/VAPT review, accessibility review, incident response, and restore drills.
- Run a representative 40,000-student load test. Current staff screens page through network response windows but still load whole authorized collections into browser memory; do not promise full-campus scale until those screens use server-side filters and pagination.

Do not put real student records into the demo project, sample seed, or local browser mode.
