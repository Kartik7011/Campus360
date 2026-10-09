# Campus360

Campus360 is a student portal that puts academic status and placement readiness in one place. A student can see their CGPA, backlogs and mentor, follow notices and rechecking requests, check whether they meet each company's criteria (and why), track their application rounds, and get feedback on how well their resume matches a job description.

## Features

- **Overview dashboard** – CGPA, semester, active backlogs, debarment status, upcoming deadlines, mentor and application summary.
- **Academic record** – academic standing, credits, mentor contact and a rechecking request tracker.
- **Notices & deadlines** – search, category filters, priority toggle and time-left labels.
- **Placement hub** – openings with a rule-by-rule eligibility check (CGPA, branch, active backlogs, graduation year, debarment). Each rule is Pass, Fail or Unknown; missing data is never treated as a pass.
- **Application tracker** – Applied → Aptitude → Technical → HR → Selected.
- **Resume checker** – compares a resume with one job description across seven weighted categories and lists strengths, gaps and suggested edits. It is guidance only, not a hiring prediction or an eligibility decision.
- **Admin panel** (admin sign-in only) – edit student records, publish or remove notices, add openings and update application stages.

## Sample accounts

| Role | Email | Password |
|---|---|---|
| Student | kartik.chauhan@galgotiasuniversity.ac.in | Kartik@360 |
| Student | shreyansh.pandey@galgotiasuniversity.ac.in | Shreyansh@360 |
| Admin (use the **Admin** tab) | admin@galgotiasuniversity.ac.in | Admin@360 |

Students see their own dashboard, academic record, notices, placements and resume checker. The admin sees only the admin panel.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, lucide-react icons, Vitest.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

On Windows, if PowerShell blocks `npm` scripts, use `npm.cmd install` and `npm.cmd run dev`.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (eligibility rules, resume analysis) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |

## Project structure

```text
src/
  components/   App shell, sign-in screen, shared UI
  pages/        Dashboard, academic, notices, placements, resume checker, admin
  data.ts       Sample records the app starts with
  types.ts      Shared types
  utils.ts      Eligibility rules, resume analysis, date helpers
  App.tsx       App state, persistence and navigation
```

Eligibility and resume analysis are pure functions in `src/utils.ts`, so they can be tested on their own and moved behind an API later without changing behaviour.

## Current limitations

- Data is stored in the browser (`localStorage`). The app ships with sample students, companies and notices. To reset, clear the site data.
- Sign-in is checked in the browser against the sample accounts in `src/auth.ts`. It separates student and admin views but is not real security; it needs a server before real data is used.
- The resume checker uses exact keyword and section matching on plain text (paste or `.txt`). PDF/DOCX import is not supported yet.

## Roadmap

- Backend API and database
- Server-side authentication (hashed passwords, sessions) and an audit log for admin edits
- Rechecking request submission
- PDF/DOCX resume import and better skill matching (synonyms and related terms)
