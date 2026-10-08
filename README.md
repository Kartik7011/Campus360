# Campus360 — Capstone-I MTE MVP

Campus360 is a student-centric academic and career transparency dashboard for the Capstone-I MTE. It brings a student’s academic snapshot, mentor contact, notices, rechecking requests, placement rules, application stages, and resume-to-role feedback into one focused demo flow.

This MVP is intentionally local-first. It uses seeded TypeScript data and browser `localStorage` so the demo works without a backend, database, or external AI API. The data layer is isolated in `src/data.ts` and the rule/checker logic is isolated in `src/utils.ts`, making it straightforward to replace with an API later.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

### Windows PowerShell note

If PowerShell shows `npm.ps1 cannot be loaded because running scripts is disabled`, use the Windows command shim instead:

```powershell
npm.cmd install
npm.cmd run dev
```

This avoids changing the machine-wide execution policy. A temporary alternative for the current PowerShell window is `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

Useful verification commands:

```bash
npm test       # deterministic eligibility and resume-checker tests
npm run build  # TypeScript check + production Vite build
npm run preview # serve the production build locally after `npm run build`
```

## Demo access

The login screen has two passwordless demo profiles:

- **Kartik Chauhan** — Computer Science & Engineering, Semester 7, CGPA 8.42, one active backlog.
- **Shreyansh Pandey** — Electronics & Communication Engineering, Semester 7, CGPA 7.86, no active backlogs.

Choose either profile to enter. There is no real authentication in this MTE build; the flow is a clearly labelled demo authentication experience.

## Suggested 5–7 minute demo script

1. Log in as **Kartik Chauhan** and start on **Overview**. Point out the CGPA, semester, backlog, debarment, high-priority notices, mentor contact, and application snapshot.
2. Open **Academic record**. Show the academic fields, credits progress, mentor availability, and the two rechecking requests with request date, status, remarks, and expected resolution date.
3. Open **Notices & deadlines**. Filter by Placement or Rechecking and toggle High priority. Show that every notice has a source, audience, priority, and deadline/time-left label.
4. Open **Placement hub**. Expand each opportunity’s “Show rule explanation” section. Explain the difference between **Eligible**, **Not Eligible**, and **Cannot Determine** and show the individual CGPA, branch, backlog, graduation-year, and debarment rules.
5. Scroll to **Placement stage tracker** and show the Applied → Aptitude → Technical → HR → Selected pipeline.
6. Open **Resume checker**, choose a company/role, select one of the sample resumes, and click **Run match check**. Show the score, seven-category breakdown, strengths, weak areas, and suggestions. Emphasize the scope note: it is resume-to-job-description alignment only, not a hiring prediction or official eligibility decision.
7. Open **Admin demo panel**. Edit a student record, add a notice, add an opportunity, or move an application stage. Navigate back to the student views to show that local changes are reflected.

## Project structure

```text
src/
  components/       App shell, login, shared UI primitives
  pages/            Dashboard, academic, notices, placements, resume, admin views
  data.ts           Seed users, notices, companies, opportunities, requests, resumes
  types.ts          Shared domain types
  utils.ts          Eligibility engine, date helpers, deterministic resume analysis
  App.tsx           Local state, persistence, view routing, mutation callbacks
```

## MTE scope and honest boundaries

- Student authentication is a passwordless demo selector, not production identity management.
- Data is stored in `localStorage` for the current browser. Clear the site’s local storage to reset to the seed data.
- Placement eligibility is a rule-based explanation layer. It never makes an official college or company decision.
- Resume scoring is deterministic and works without an external provider. It compares the submitted text with the selected role’s job description and required/preferred skills; it is not a hiring prediction.
- The admin panel is a local demo control surface. It is not connected to a real SIS, examination portal, or placement portal.

## After MTE

The next practical additions would be a real authentication/API boundary, role-based admin permissions, a PostgreSQL/Supabase schema for students and notices, audit history for record edits, file storage plus PDF/DOCX text extraction, official placement-cell integrations, and an optional AI provider behind an environment variable with clear privacy controls.
