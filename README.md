# Campus360

Campus360 is a student portal that puts academic status and placement readiness in one place. A student can see their CGPA, backlogs and mentor, follow notices and rechecking requests, check whether they meet each company's criteria (and why), track their application rounds, and get feedback on how well their resume matches a job description.

## Features

- **Overview dashboard** – CGPA, semester, active backlogs, debarment status, upcoming deadlines, mentor and application summary.
- **Academic record** – academic standing, credits, mentor contact, and rechecking requests that students file and the admin resolves.
- **Notices & deadlines** – search, category filters, priority toggle and time-left labels.
- **Placement hub** – openings with a rule-by-rule eligibility check (CGPA, branch, active backlogs, graduation year, debarment). Each rule is Pass, Fail or Unknown; missing data is never treated as a pass.
- **Application tracker** – Applied → Aptitude → Technical → HR → Selected.
- **Resume checker** – upload a PDF, DOCX or TXT resume (read in the browser) or paste text, then compare it with one job description across seven weighted categories, with strengths, gaps and suggested edits. Optional meaning-based skill matching (a small sentence-embedding model run in the browser) credits a skill written differently, e.g. "ReactJS" for React, and shows the resume phrase that matched. It is guidance only, not a hiring prediction or an eligibility decision.
- **Admin panel** (admin sign-in only) – edit student records, publish or remove notices, add openings, update application stages, resolve rechecking requests, and see a log of recent changes.

## Sample accounts

| Role | Email | Password |
|---|---|---|
| Student | kartik.chauhan@galgotiasuniversity.ac.in | Kartik@360 |
| Student | shreyansh.pandey@galgotiasuniversity.ac.in | Shreyansh@360 |
| Admin (use the **Admin** tab) | admin@galgotiasuniversity.ac.in | Admin@360 |

Students see their own dashboard, academic record, notices, placements and resume checker. The admin sees only the admin panel.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, lucide-react icons, Vitest. Supabase (PostgreSQL, Auth, Storage) for the backend. pdf.js and mammoth for resume files, Transformers.js (`all-MiniLM-L6-v2`) for skill matching.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

On Windows, if PowerShell blocks `npm` scripts, use `npm.cmd install` and `npm.cmd run dev`.

Without a `.env.local` the app runs on the sample data, saved in the browser. To use the database, set up Supabase as below.

## Database (Supabase)

1. Create a Supabase project.
2. In the SQL editor, run `supabase/migrations/001_init.sql`, `002_rls.sql` and `003_audit.sql`, in that order.
3. Under Authentication → Users, add the three accounts from the table above, with passwords of your choice.
4. Run `supabase/seed.sql` in the SQL editor. It loads the sample data and links each account to its student record or the admin role by email. (After changing `src/data.ts`, regenerate it with `npm run seed:sql`.)
5. Copy `.env.example` to `.env.local` and fill in the project URL and the **anon** key (Project Settings → API). Never put the service-role key in the front end.
6. Restart `npm run dev` and sign in.

Row-level security lets a student read only their own record, applications, rechecking requests and resumes; shared tables (notices, companies, openings) are readable by any signed-in user; all other writes are admin-only. Database triggers write every change to student records, notices, openings, applications and rechecking requests into `audit_log`, which the admin sees under **Recent changes**.

To check the policies on your project:

```bash
KARTIK_PASSWORD=... ADMIN_PASSWORD=... npm run check:rls
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (eligibility, resume analysis, file reading, skill matching, sign-in) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/data.ts` |
| `npm run check:rls` | Check row-level security on the Supabase project in `.env.local` |

## Project structure

```text
src/
  components/   App shell, sign-in screen, shared UI
  pages/        Dashboard, academic, notices, placements, resume checker, admin
  data.ts       Sample records the app starts with
  types.ts      Shared types
  utils.ts      Eligibility rules, resume analysis, date helpers
  api.ts        Database reads and writes (Supabase)
  auth.ts       Sign-in (Supabase Auth, or sample accounts without a database)
  resumeText.ts PDF/DOCX/TXT text extraction
  semantic.ts   Skill matching by meaning
  App.tsx       App state, persistence and navigation
supabase/       Schema, row-level security, audit triggers, seed data
scripts/        Seed generator and row-level security check
```

Eligibility and resume analysis are pure functions in `src/utils.ts`, so they can be tested on their own and moved behind an API later without changing behaviour.

## Current limitations

- Without `.env.local`, data is stored in the browser (`localStorage`) and sign-in is checked in the browser against the sample accounts in `src/auth.ts`. That mode is for trying the app on sample data only; it is not real security.
- Scanned (image-only) PDFs have no text to read; the checker asks for a text PDF or pasted text instead.
- Meaning-based skill matching needs a one-time model download (about 23 MB). If it can't load, the checker falls back to exact keyword matching and says so. Its similarity threshold (0.75) was set from a small set of spot checks and still needs calibrating on labelled examples.
- Records are not yet synced with the university's student information system or placement portal.

## Roadmap

- Deployment (Vercel or Netlify) on the Supabase backend
- Calibrate the skill-matching threshold on labelled resume phrases
- Sync with the university's student information system
