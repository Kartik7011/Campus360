# Campus360

Campus360 is a student portal for academic records, exams, fees and placements. Students see their marks and documents, apply for exams and pay fees, and track every request without visiting an office. Each university office (exam cell, accounts, placement cell, mentors, HoDs, deans, registrar) works from its own queue, and every staff change is logged.

The full requirements are in [requirement.md](requirement.md); section 9 lists what is built.

## Features

**Students**

- **Overview** – what needs attention now (blocked hall ticket, fees due, notices to acknowledge, absences to dispute), CGPA, deadlines, mentor.
- **Academic record** – standing, credits, APAAR/ABC ID, attendance per course with the classes needed to recover, condonation requests, mentor appointments, unfair-means case status.
- **Results & documents** – marks per subject (each assessment component, every attempt, and the history of any change: rechecking, revaluation, moderation, grace marks), SGPA/CGPA per semester with a trend chart, withheld results with the reason, transferred credits. Grade sheets and a consolidated marks statement as PDFs with a QR code. Official document requests (transcript, degree, migration, bonafide…) with fees and tracking.
- **Exams** – timetable, clash warnings and hall ticket (PDF) with the exact reason when it's blocked; exam-hall attendance with a 7-day dispute window; back and special exam applications with a confirmation step and duplicate prevention (one active application per subject per session); withdrawal requests; rechecking, revaluation and answer-sheet copies with fees, deadlines and escalation.
- **Fees** – each fee head with concessions, what's paid and left, late fees by the published rule; payment (test gateway) that can't charge twice; receipts, credit notes and an annual fee certificate as PDFs; a running ledger; refunds and adjustments with their status; scholarships. Payments the bank hasn't confirmed show as Processing, never Due.
- **Notices & calendar** – notices targeted by school, programme, semester or batch; mandatory ones need an acknowledgement; academic calendar of exams, deadlines and fee dates.
- **Placement hub** – rule-by-rule eligibility (Pass / Fail / Unknown; missing data never passes), apply with a choice of what to share, one-offer policy with dream openings, the criteria in force when you applied, internship and offer-letter uploads.
- **Resume checker** – PDF/DOCX/TXT upload and match against a job description, with optional meaning-based skill matching in the browser.
- **Help & requests** – searchable FAQ, tickets routed to the right office with answer deadlines and escalation, the grievance committee, no-dues clearance.
- **Profile & privacy** – privacy notice accepted at first sign-in, parent access (on/off), download of all your data.
- **Notifications** – in-app alerts for results, mark changes, attendance, decisions, payments, refunds and placement stages.

**Parents** (only while the student allows it) – read-only results, attendance, exams, fees and notices.

**Staff**, each limited to their office:

| Role | Workspace |
|---|---|
| Exam cell | Import and declare results, correct marks with a reason; key exam-hall attendance twice (two different people) with sheet scans and CSV import; disputes; rechecking queue; special-exam approvals; withdrawals (including after hall tickets); document requests; unfair-means cases; record corrections |
| Accounts | Refunds and adjustments with maker–checker approval; students with credit; payment reconciliation (confirms pending payments, refunds double charges); fees, concessions and late fines; scholarships |
| Placement cell | Openings (criteria changes create a new version), application stages, overrides with a reason, verification of internship/offer letters, export of only the data each student agreed to share |
| Mentor | Mentees with early warnings, appointment requests, private notes |
| Head of Department | Condonation decisions, department dashboard, mentor notes |
| Dean | School dashboard |
| Registrar | University dashboard, grievance committee, documents, no-dues, change log |
| IT administrator | Staff accounts, notices, change log (no access to academic or fee records) |

Anyone can check a downloaded document at `/#/verify/<serial>` (the QR code links there); it shows live figures from the record, so an edited PDF won't match.

## Local demo accounts (development only)

The sample accounts below are public demo credentials. They must never be used for a real deployment. Demo mode is disabled by default and can only run in the Vite development server.

| Role | Email | Password |
|---|---|---|
| Student | kartik.chauhan@galgotiasuniversity.ac.in | Kartik@360 |
| Student (back/special exams, refunds) | shreyansh.pandey@galgotiasuniversity.ac.in | Shreyansh@360 |
| Student (attendance shortage, holds an offer) | aditi.sharma@galgotiasuniversity.ac.in | Aditi@360 |
| Student (withheld result) | rohan.verma@galgotiasuniversity.ac.in | Rohan@360 |
| Parent of Kartik (**Parent** tab) | parent.kartik@example.com | Parent@360 |
| Exam cell (**Staff** tab) | exam.rakesh@ / exam.priya@galgotiasuniversity.ac.in | Staff@360 |
| Accounts | accounts.anil@ / accounts.sunita@galgotiasuniversity.ac.in | Staff@360 |
| Placement cell | placement@galgotiasuniversity.ac.in | Staff@360 |
| Mentor | avinash.dwivedi@galgotiasuniversity.ac.in | Staff@360 |
| HoD (CSE) | hod.cse@galgotiasuniversity.ac.in | Staff@360 |
| Dean (SCSE) | dean.scse@galgotiasuniversity.ac.in | Staff@360 |
| Registrar | registrar@galgotiasuniversity.ac.in | Staff@360 |
| IT administrator | admin@galgotiasuniversity.ac.in | Admin@360 |

Two exam-cell and two accounts accounts exist because double entry and refund approval each need a second person.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, lucide-react, Vitest. Supabase (PostgreSQL, Auth with TOTP MFA, Storage). pdf.js and mammoth for resume files, Transformers.js (`all-MiniLM-L6-v2`) for skill matching, jsPDF and qrcode for documents.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). On Windows, if PowerShell blocks `npm` scripts, use `npm.cmd install` and `npm.cmd run dev`.

To run the local sample experience, copy `.env.example` to `.env.local`, leave the Supabase settings blank, and set `VITE_ENABLE_DEMO_MODE=true`. Sample data is stored in this browser only. With the flag omitted or false, local development displays no demo workspace. A production app requires both Supabase settings and never permits browser-only demo authentication.

## Database (Supabase)

### New project

1. Create a Supabase project in the **Mumbai** region or the university-approved India region.
2. In the SQL editor, run all eight files in `supabase/migrations/` in order. **Do not run `supabase/seed.sql` in a production project**; it contains synthetic student, staff, marks, fee and placement records.
3. Enable Supabase email/password authentication for university-provisioned student and staff accounts. Configure verified email, a 12-character minimum password, password reset redirects, rate limits, and university-controlled SMTP. Staff must complete TOTP MFA. Parents use a one-time email link and must be provisioned against an active consent record.
4. Replace the sample `staff-admin` record with the university's actual IT administrator before provisioning auth accounts. Load reviewed university data through the institution's authorized process.
5. Copy `.env.example` to `.env.local` for local development. Use only the project URL and **anon / publishable** key in the client build. Never put the service-role or secret key in the front end.
6. Apply the auth, database, storage and recovery settings in [production deployment](docs/production-deployment.md) before opening access to students.

### Upgrading a project set up with migrations 001–004

Run `supabase/migrations/005_full_platform.sql` through `008_ticket_service_write_guard.sql` in order. Never run the sample seed against production. Replace sample role rows with real staff records and provision student/staff identities and parent email links through the university's approved account process.

### What the database enforces

- **Row-level security**: students (and parents with consent) read only their own records; mentors read their mentees, HoDs their department, deans their school; university offices read everyone. Each office can write only its own tables.
- **Staff need a second factor**: a staff session without MFA has no staff rights at all.
- **Guards** the browser can't skip: one active exam application per subject per session; back exams only for failed subjects and only while applications are open; student-raised fees match `fee_rates`; payment simulation RPC is revoked in production; disputes only within 7 days of a recorded absence; exam attendance keyed by two different people; refunds approved by someone other than their creator; placement applications only when every rule passes.
- **Audit log**: triggers record every insert, update and delete with who made it.

To check the live policies from your machine:

```bash
KARTIK_ACCESS_TOKEN=... STAFF_EMAIL=exam.rakesh@galgotiasuniversity.ac.in STAFF_AAL1_ACCESS_TOKEN=... npm run check:rls
```

Use short-lived tokens from provisioned test accounts in a non-production project only. Never place real tokens in the repository or shell history.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests |
| `npm run build` | Type-check and build the frontend |
| `docker build --build-arg VITE_SUPABASE_URL=… --build-arg VITE_SUPABASE_ANON_KEY=… -t campus360 .` | Build the production static container; both Supabase values are required |
| `npm run preview` | Serve the production build |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/data.ts` |
| `npm run check:rls` | Check row-level security on the Supabase project in `.env.local` |

## Project structure

```text
src/
  domain/       Workflows as pure functions: exams, fees, results, placements, notices, helpdesk, dashboards
  pages/        Student pages; staff/ has each office's workspace
  components/   App shell, sign-in, shared UI
  policy.ts     University rules (fees, windows, thresholds) in one place
  ops.ts        Row changes a workflow returns, applied to state, the database and the audit log
  api.ts        Database reads and writes (Supabase)
  auth.ts       University-provisioned sign-in, password recovery and MFA
  demoAuth.ts   Sample sign-in credentials for local development only
  pdf.ts        Grade sheets, receipts, hall tickets and certificates with QR verification
  data.ts       Sample records
supabase/       Schema, row-level security, guards, audit triggers, seed data
scripts/        Seed generator and row-level security check
```

Workflows return the row changes they need instead of writing anywhere, so they are tested on their own (`src/domain/*.test.ts`) and the same code runs in browser demo and database modes.

## Current limitations

- **Sample data, not the ERP.** Records are seeded, not synced from the university ERP; the exam cell's CSV import and record corrections stand in for it. Connecting the ERP's API is needed before real use.
- **Payments are disabled in production.** The portal displays fee records but cannot initiate a payment or send a refund. The local demo payment simulation cannot be called through production RLS.
- **In-app notifications only.** Email, SMS and push need the university's messaging providers.
- **Not tuned for 40,000 students yet.** Remote reads now page through responses rather than silently stopping at 10,000 rows, but authorized staff collections are still materialized in browser memory. Collection-specific server-side paging/search and load testing remain required before full scale.
- **Account provisioning and email delivery** must be operated by university IT. Students/staff sign in with provisioned email/password accounts; staff also use TOTP MFA. Parents use a provisioned one-time email link.
- **Not built:** Hindi, DigiLocker/APAAR integration, malware scanning of uploads, invigilator QR app, monitoring and alerting, a separate staging environment.
- Browser-only demo mode is explicitly opt-in in local development, keeps sample data in the browser and never stores original upload files. It is for trying the app with sample data only.
- Meaning-based skill matching downloads a 23 MB model once; its 0.75 threshold still needs calibrating on labelled examples.

## Production release gates

The app fails closed to a configuration screen when Supabase is missing, production student/staff sign-in uses university-provisioned email/password accounts with staff MFA, parent sign-in uses an email link, and payment initiation is disabled. The repository contains no active university deployment configuration or production credentials, so an authorized university team still needs to complete these release gates:

- Provision and review a production Supabase project in the approved India region; configure backups, recovery, retention, and production-only credentials.
- Import institution-approved student and staff records securely before access opens. ERP integration is out of scope for this release; define a verified manual data refresh and correction process.
- Add server-side pagination and search for staff workspaces, then run load tests at the university's expected peak size.
- Configure server-enforced upload limits and malware scanning for private files.
- Set up staging, monitoring, alerting, incident response, and an operational support owner.
- Complete institution-led privacy, accessibility, security/VAPT, and disaster-recovery reviews; validate staff roles, MFA enrollment, and account lifecycle procedures.

Do not use sample credentials or seed data for real users. `npm run build` verifies that the frontend compiles; it does not provision these services or certify the application for production.
