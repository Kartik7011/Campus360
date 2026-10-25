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

## Sample accounts (browser-only mode)

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

Without a `.env.local` the app runs on the sample data, saved in the browser. To use the database, set up Supabase as below.

## Database (Supabase)

### New project

1. Create a Supabase project (choose the **Mumbai** region to keep personal data in India).
2. In the SQL editor, run the five files in `supabase/migrations/` in order, then `supabase/seed.sql`.
3. Under Authentication → Users, add the accounts you need from the table above with passwords of your choice, ticking **Auto Confirm User**. Each account gets its role from its email when it is created.
4. Copy `.env.example` to `.env.local` and fill in the project URL and the **anon / publishable** key. Never put the service-role or secret key in the front end.
5. Restart `npm run dev` and sign in. Staff are asked to set up an authenticator app on first sign-in.

### Upgrading a project set up with migrations 001–004

Run `supabase/migrations/005_full_platform.sql`, then `supabase/seed.sql` again (it updates existing rows instead of duplicating them). Then add the new staff accounts in Authentication → Users. The existing admin account becomes the IT administrator and must set up two-step sign-in at its next sign-in.

### What the database enforces

- **Row-level security**: students (and parents with consent) read only their own records; mentors read their mentees, HoDs their department, deans their school; university offices read everyone. Each office can write only its own tables.
- **Staff need a second factor**: a staff session without MFA has no staff rights at all.
- **Guards** the browser can't skip: one active exam application per subject per session; back exams only for failed subjects and only while applications are open; fees students raise must match `fee_rates`; payments only through `pay_charges()` (idempotent); disputes only within 7 days of a recorded absence; exam attendance keyed by two different people; refunds approved by someone other than their creator; placement applications only when every rule passes.
- **Audit log**: triggers record every insert, update and delete with who made it.

To check the live policies from your machine:

```bash
KARTIK_PASSWORD=... STAFF_EMAIL=exam.rakesh@galgotiasuniversity.ac.in STAFF_PASSWORD=... npm run check:rls
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests |
| `npm run build` | Type-check and build for production |
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
  auth.ts       Sign-in, SSO and MFA (or sample accounts without a database)
  pdf.ts        Grade sheets, receipts, hall tickets and certificates with QR verification
  data.ts       Sample records
supabase/       Schema, row-level security, guards, audit triggers, seed data
scripts/        Seed generator and row-level security check
```

Workflows return the row changes they need instead of writing anywhere, so they are tested on their own (`src/domain/*.test.ts`) and the same code runs in browser-only and database modes.

## Current limitations

- **Sample data, not the ERP.** Records are seeded, not synced from the university ERP; the exam cell's CSV import and record corrections stand in for it. Connecting the ERP's API is needed before real use.
- **Test payment gateway.** `pay_charges()` records payments without moving money and "Send refund" generates the bank reference. A real gateway (webhook confirmation, refund API) must replace both before taking money.
- **In-app notifications only.** Email, SMS and push need the university's messaging providers.
- **Not tuned for 40,000 students yet.** Staff screens load every row they may see; server-side paging and search are needed before full scale, followed by a load test.
- **Google/Microsoft sign-in** works once the providers are enabled in the Supabase dashboard; email and password sign-in stays available.
- **Hosting region.** The current Supabase project is in Seoul; the requirements ask for India (Mumbai).
- **Not built:** Hindi, DigiLocker/APAAR integration, virus scanning of uploads, invigilator QR app, monitoring and alerting, a separate staging environment.
- Browser-only mode keeps the names of uploaded files but not the files, and checks passwords in the browser. It is for trying the app with sample data only.
- Meaning-based skill matching downloads a 23 MB model once; its 0.75 threshold still needs calibrating on labelled examples.
