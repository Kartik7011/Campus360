# Campus360 – Requirements Specification

| | |
|---|---|
| Product | Campus360: student-centric academic and career transparency platform |
| Issued by | Office of the Dean (Academics) |
| Scale | 20,000–40,000 students, about 1,500 faculty, multiple schools |
| Status | Draft for review |
| Last updated | 25 October 2026 |

Requirement IDs (for example `FR-MRK-03`) are used for traceability in design, tests and status reports. Priority uses MoSCoW: **M** = must have for launch, **S** = should have, **C** = could have later.

---

## 1. Purpose and principles

Campus360 gives every student one place to see their academic record, exams, fees and placement standing, and to act on them without visiting an office.

1. **Not a second source of truth.** The university ERP/SIS owns academic and fee records. Campus360 displays them, explains them and runs request workflows; it never computes official grades or balances itself.
2. **Explainable.** Every status shown to a student (eligibility, result withheld, fee overdue, hall ticket blocked) states the rule, the data it used and the office that can fix it.
3. **Missing data is never a pass.** When data needed for a decision is missing, the result is *Cannot determine*, not *Eligible*.
4. **Every staff action is accountable.** Who changed what, when, and from what value to what value.
5. **Mobile first.** Most students will use low-end Android phones on mobile data.

### Success measures

| ID | Measure | Target |
|---|---|---|
| KPI-1 | Walk-in and email queries to the exam, accounts and placement offices | 40% lower within 12 months |
| KPI-2 | Median rechecking/revaluation turnaround | 14 days or less |
| KPI-3 | Eligibility disputes caused by wrong data in Campus360 | 0 |
| KPI-4 | Monthly active students | 70% or more of enrolled students |
| KPI-5 | Availability during result and placement weeks | 99.9% |
| KPI-6 | Duplicate exam-fee payments still unrefunded after 15 working days | 0 |

---

## 2. Users and roles

| Role | Access |
|---|---|
| Student | Own records only; raise requests; apply for exams and openings; pay fees; download documents |
| Parent/guardian (S) | Read-only view of a student's results, attendance and fee status, only with the student's consent |
| Faculty mentor | Read-only view of assigned mentees; adds advising notes |
| Head of Department / School Dean | Read-only dashboards for their department or school |
| Exam cell | Results publication, exam attendance entry, rechecking/revaluation, back/special exams, withdrawals, hall tickets |
| Accounts office | Fee ledger, reconciliation, adjustments, refunds |
| Placement cell | Companies, openings, eligibility criteria, application stages, debarments |
| Invigilator (C) | Exam-day attendance capture (phase 3 app) |
| Registrar | Read-only access to every audit log; approves policy overrides |
| Super admin (IT) | User and role management; **cannot** edit academic or fee records |

- `NFR-SEC-01` (M) Access is least-privilege and scoped by school, department and programme.
- `NFR-SEC-02` (M) No shared staff accounts. Every staff user signs in as themselves.

---

## 3. Functional requirements

### 3.1 Student profile and academic summary

| ID | Pri | Requirement |
|---|---|---|
| FR-PRO-01 | M | Show programme, branch, semester, batch, enrolment number, mentor, CGPA, active backlogs, credits earned/required and debarment status (with reason). |
| FR-PRO-02 | M | Each value shows its source system and a "last synced" time. |
| FR-PRO-03 | M | Records are read-only in Campus360. A student who believes a value is wrong raises a correction request (FR-HLP-01), which is resolved in the ERP. |
| FR-PRO-04 | S | Show the student's APAAR / Academic Bank of Credits (ABC) ID and credits banked. |

### 3.2 Marks: subject-wise and semester-wise

| ID | Pri | Requirement |
|---|---|---|
| FR-MRK-01 | M | For every course in every semester show: course code, title, credits, each assessment component (internal/CA, mid-term, end-term, practical/viva) with marks obtained and maximum, total, grade, grade points and pass/fail. |
| FR-MRK-02 | M | Show the **attempt** for each result: regular, back or special, and the exam session (for example "Back – May 2027"). All attempts for a course are listed, the latest counting. |
| FR-MRK-03 | M | Show per semester: SGPA, CGPA up to that semester, credits earned vs registered, and result status (Pass / Pass with backlog / Withheld / Detained). |
| FR-MRK-04 | M | A withheld result shows the reason and the office to contact (for example "Withheld: exam fee due – Accounts office"). |
| FR-MRK-05 | M | Marks appear only after the exam cell declares the result. Internal marks may appear earlier, labelled **Provisional**. |
| FR-MRK-06 | M | When marks change (rechecking, revaluation, moderation, grace marks, correction), the previous and new values are both kept with the reason and date, and the student sees this history. |
| FR-MRK-07 | M | Grades, SGPA and CGPA come from the ERP; Campus360 does not calculate official values. |
| FR-MRK-08 | S | SGPA trend chart across semesters. |
| FR-MRK-09 | S | Show grace marks or moderation applied to a course, labelled as such, with the policy reference. |

### 3.3 Report card, transcript and certificates

| ID | Pri | Requirement |
|---|---|---|
| FR-DOC-01 | M | Download a semester grade sheet and a consolidated marks statement (all semesters) as PDF. |
| FR-DOC-02 | M | Each PDF has a unique serial number, generation date and a QR code linking to a public university page that verifies it. |
| FR-DOC-03 | M | Self-service PDFs carry a "Provisional – for information only" watermark. |
| FR-DOC-04 | M | When a result changes, earlier PDFs show **Superseded** on verification and a new one can be downloaded. |
| FR-DOC-05 | S | Request official documents (signed grade sheet, transcript, degree, migration certificate, bonafide certificate, character certificate) with fee payment and delivery mode (collect / post / email), and track status to dispatch or collection. |
| FR-DOC-06 | S | Push final grade sheets and degrees to DigiLocker / National Academic Depository. |
| FR-DOC-07 | S | Graduates keep read-only access to documents for at least 5 years after leaving. |

### 3.4 Class attendance

| ID | Pri | Requirement |
|---|---|---|
| FR-ATT-01 | M | Show attendance per course and overall for the current semester, synced from the ERP. |
| FR-ATT-02 | M | Warn the student and their mentor when any course falls below the required percentage (for example 75%), and show how many classes they must attend to recover. |
| FR-ATT-03 | S | Students detained for low attendance can apply for condonation (medical or official duty) with documents; the HoD decides with a recorded reason. |

### 3.5 Exam schedule, hall ticket and seating

| ID | Pri | Requirement |
|---|---|---|
| FR-EXM-01 | M | Show the student's exam timetable (regular, back and special papers) with date, time and venue. |
| FR-EXM-02 | M | Download the hall ticket once all conditions are met. If blocked, show exactly what blocks it (fee amount due, attendance detention, debarment) at least 7 days before hall tickets are issued. |
| FR-EXM-03 | M | Detect and flag timetable clashes between a student's papers (for example a back paper and a regular paper in the same slot). A clash makes the student eligible to apply for a special exam for one of them. |
| FR-EXM-04 | S | Show room and seat number once the seating plan is published. |

### 3.6 Exam-day attendance (recorded on paper)

Attendance in exam halls is marked on signed paper sheets. Campus360 must digitise it reliably and let students check it.

| ID | Pri | Requirement |
|---|---|---|
| FR-EXA-01 | M | Within 48 hours of each paper, the exam cell enters each student's status: Present / Absent / Unfair means (UFM) / Debarred. |
| FR-EXA-02 | M | Entry is done twice by two different staff; any mismatch is flagged and is **not** shown to the student until resolved. |
| FR-EXA-03 | M | The scanned signed sheet is attached to the paper and session. Students never see the scan (it contains other students' details). |
| FR-EXA-04 | M | Students see their own status for each paper and the date it was recorded. |
| FR-EXA-05 | M | A student marked Absent who was present may raise a dispute within 7 days, giving hall ticket number, seat number and, optionally, the answer-sheet barcode. The exam cell checks the scan and the answer-sheet register and records the outcome and reason. |
| FR-EXA-06 | M | An Absent status (after any dispute is resolved) feeds special-exam eligibility (FR-SPL-01). |
| FR-EXA-07 | S | UFM cases show the case status and hearing date to the student, without the evidence details. |
| FR-EXA-08 | C | Phase 3: invigilators scan the QR code on each hall ticket with a mobile app; paper becomes the backup, not the record. |

### 3.7 Rechecking, revaluation and answer-sheet copy

| Service | What happens | Possible outcome |
|---|---|---|
| Rechecking | Totals and any unmarked answers are verified | Marks corrected only if an error is found |
| Revaluation | Another examiner re-evaluates the answer sheet | Marks may go up or down, per published policy |
| Answer-sheet copy | Scanned copy is provided to the student | Student may then apply for revaluation |

| ID | Pri | Requirement |
|---|---|---|
| FR-RCK-01 | M | Apply per subject, per service, only inside the published window (for example 10 days after result declaration). Outside the window the option is shown as closed with the dates. |
| FR-RCK-02 | M | Fee per subject per service, paid through the university gateway; the request is linked to its receipt. |
| FR-RCK-03 | M | Status: Submitted → Fee confirmed → Under review → Result published (or Rejected with reason). The student is notified at each change. |
| FR-RCK-04 | M | The exam cell works from a queue with a 14-day SLA timer; requests older than 14 days are escalated to the Controller of Examinations. |
| FR-RCK-05 | M | A changed result updates marks with history (FR-MRK-06) and supersedes the grade sheet (FR-DOC-04). |
| FR-RCK-06 | M | The same subject cannot have two open requests for the same service. |

### 3.8 Back (reappear) and special exams

| | Back exam | Special exam |
|---|---|---|
| For | Subjects the student **failed** | Subjects the student **missed** for a genuine reason: medical, official university duty, timetable clash |
| Eligibility | Automatic from the declared result | Absent on that paper (FR-EXA-06) or a clash (FR-EXM-03), **and** an approved application with documents |
| Approval | None | HoD / exam cell approves or rejects with a recorded reason |
| Fee | Per subject, at application | Per subject, payable only after approval |

| ID | Pri | Requirement |
|---|---|---|
| FR-BCK-01 | M | The back-exam form lists only the subjects the student is eligible for in that session. Ineligible subjects cannot be selected. |
| FR-BCK-02 | M | Applications open and close on published dates; late applications follow the published late-fee rule or are blocked. |
| FR-SPL-01 | M | The special-exam form lists only papers the student was Absent for (or had a clash on) in the relevant session. The student uploads supporting documents (PDF/image, up to 5 MB each). |
| FR-SPL-02 | M | Special-exam applications show: Submitted → Under review → Approved / Rejected (with reason) → Fee paid → Hall ticket issued. |
| FR-BCK-03 | M | A paid back or special application adds the paper to the student's timetable and hall ticket. Its result appears as a new attempt (FR-MRK-02). |
| FR-BCK-04 | S | Show the maximum number of attempts remaining for a course under the academic regulations. |

### 3.9 Duplicate or mistaken applications, withdrawals and refunds

**Prevention**

| ID | Pri | Requirement |
|---|---|---|
| FR-DUP-01 | M | The same subject cannot appear in both a back and a special application for the same exam session. The system blocks it at the time of applying and explains why. |
| FR-DUP-02 | M | The same subject cannot be applied for twice in the same category and session. |
| FR-DUP-03 | M | Before payment, a confirmation screen lists every subject with its category and fee, and the total. |
| FR-DUP-04 | M | The system must be safe against double submission (double click, retry after timeout): one application and at most one successful charge per submission. |

**Withdrawal requests**

| ID | Pri | Requirement |
|---|---|---|
| FR-WDR-01 | M | A student can raise a **Withdraw application** request for one or more subjects in an application, with a reason. |
| FR-WDR-02 | M | Students can raise it until hall tickets are issued; after that only the exam cell can withdraw a paper, with a recorded reason. |
| FR-WDR-03 | M | The exam cell approves or rejects it with a reason. Approval removes the paper from the timetable and hall ticket. |
| FR-WDR-04 | M | Status is visible to the student: Requested → Approved / Rejected → (if fees apply) Refund in progress → Completed. |

**Fee adjustment and refund**

| Situation | Required handling |
|---|---|
| Withdrawn before payment | Cancelled; nothing to refund |
| Paid for both back and special for the same subject (duplicate) | Fee for the one kept stands. The other is **adjusted** against the student's other outstanding dues first; any remainder is **refunded in full** |
| Charged twice for one payment (gateway or bank error) | Found by reconciliation (FR-FEE-07) and refunded automatically, without a request from the student |
| Withdrawn by choice (not a duplicate) | Refund per published policy (for example full before the application deadline, none after hall tickets are issued) |
| Special exam rejected after a fee was collected | Full refund |

| ID | Pri | Requirement |
|---|---|---|
| FR-RFD-01 | M | Refunds go to the original payment method. The student sees amount, method, status (Requested → Approved by Accounts → Sent → Credited) and bank reference. |
| FR-RFD-02 | M | Accounts approves or rejects within 7 working days; money is credited within 15 working days of approval. |
| FR-RFD-03 | M | Every adjustment and refund appears in the student's fee ledger with a downloadable credit note PDF. |
| FR-RFD-04 | M | Maker–checker: an adjustment or refund is created by one Accounts user and approved by a different one. |
| FR-RFD-05 | S | If the original payment method can't be refunded (closed account), the student can submit bank details once, verified by a penny-drop check. |

### 3.10 Fees and receipts

| ID | Pri | Requirement |
|---|---|---|
| FR-FEE-01 | M | Show, per semester, every fee head (tuition, exam, hostel, transport, library, fines), amount due, scholarship or concession applied, amount paid, balance and due date. |
| FR-FEE-02 | M | Status per head and overall: Paid / Partially paid / Due / Overdue. |
| FR-FEE-03 | M | Late fines are calculated by the published rule and shown together with that rule. |
| FR-FEE-04 | M | A full ledger of every charge, payment, adjustment and refund in date order, with a running balance that always reconciles. |
| FR-FEE-05 | M | Pay online through the university payment gateway (UPI, cards, net banking). Partial payment allowed only where policy permits. |
| FR-FEE-06 | M | A receipt is generated automatically on successful payment: PDF with receipt number, transaction ID, fee heads, amount, date and a verification QR code. It can be re-downloaded at any time. |
| FR-FEE-07 | M | Reconciliation with the gateway/bank runs at least hourly. A payment debited at the bank but not confirmed is resolved automatically; if still unresolved after 48 hours the student can raise a ticket with the bank reference attached. |
| FR-FEE-08 | M | A student must never be shown as unpaid for an amount that was actually received. |
| FR-FEE-09 | S | Show scholarship applications (university and government portals) with status and the amount expected to be credited to fees. |
| FR-FEE-10 | S | Instalment plans where approved, with each instalment's due date. |
| FR-FEE-11 | S | Downloadable annual fee certificate (for income-tax and education-loan purposes). |

### 3.11 Placements and eligibility

| ID | Pri | Requirement |
|---|---|---|
| FR-PLC-01 | M | For each opening, check eligibility rule by rule (CGPA, branch, active backlogs, graduation year, debarment, and any company-specific rule). Each rule is Pass, Fail or Unknown. |
| FR-PLC-02 | M | Overall result is Eligible, Not Eligible or **Cannot determine**; for Cannot determine, name the missing data and the office that can supply it. |
| FR-PLC-03 | M | One-click apply, blocked when Not Eligible. The placement cell may override with a recorded reason. |
| FR-PLC-04 | M | Track stages: Applied → Aptitude → Technical → HR → Selected / Rejected, with notifications. |
| FR-PLC-05 | M | Company criteria are versioned; a student can see the criteria in force when they applied. |
| FR-PLC-06 | S | Configurable offer policy (for example one offer per student, dream-company exception) enforced at apply time. |
| FR-PLC-07 | S | Only the data the student consented to share for that application is sent to the company. |
| FR-PLC-08 | S | Record internships and offer letters (upload), with verification by the placement cell. |

### 3.12 Resume checker

| ID | Pri | Requirement |
|---|---|---|
| FR-RES-01 | M | Upload a PDF/DOCX/TXT resume (up to 2 MB) or paste text; compare with a selected job description; show category scores, strengths, gaps and suggested edits. |
| FR-RES-02 | M | Clearly labelled as guidance only. It is never used to shortlist or reject a student. |
| FR-RES-03 | M | A resume is visible only to the student, and to the placement cell only for openings the student applied to. |
| FR-RES-04 | S | Match skills by meaning (for example "ReactJS" for React) and show the resume phrase that matched. |

### 3.13 Notices and notifications

| ID | Pri | Requirement |
|---|---|---|
| FR-NOT-01 | M | Notices target a school, programme, semester, batch, a list of students, or everyone. |
| FR-NOT-02 | M | Delivery in the app and by email; High priority also by push notification or SMS. |
| FR-NOT-03 | M | Read receipts for notices marked mandatory. |
| FR-NOT-04 | M | Automatic notifications for: result declared; marks changed; exam attendance recorded or dispute decided; application approved/rejected; hall ticket ready or blocked; payment received or failed; refund sent; withdrawal decided; placement stage changed; attendance shortage warning. Money-related events also go by SMS. |
| FR-NOT-05 | S | Students choose channels per category, except mandatory ones. |
| FR-NOT-06 | S | Academic calendar view with key dates (registration, exams, result, rechecking windows, fee due dates). |

### 3.14 Mentoring

| ID | Pri | Requirement |
|---|---|---|
| FR-MNT-01 | M | Each student sees their mentor and contact details and can book office hours. |
| FR-MNT-02 | S | Mentors get an early-warning list: attendance below threshold, a new backlog, a CGPA drop of more than 0.5, or an unpaid fee blocking the hall ticket. |
| FR-MNT-03 | S | Mentors record advising notes, visible to the mentor and HoD only. |

### 3.15 Helpdesk and grievances

| ID | Pri | Requirement |
|---|---|---|
| FR-HLP-01 | M | One ticketing system for all queries (data correction, fee issue, exam issue, placement issue), routed to the right office by category. |
| FR-HLP-02 | M | Each ticket has an SLA by category (for example 3 working days), auto-escalation when breached, and a visible status history. |
| FR-HLP-03 | M | Grievances can be escalated to the Student Grievance Redressal Committee, as required by UGC regulations, with the outcome recorded. |
| FR-HLP-04 | S | FAQ and help articles shown before a ticket is raised, to deflect common questions. |

### 3.16 Staff work queues and dashboards

| ID | Pri | Requirement |
|---|---|---|
| FR-ADM-01 | M | Each office has a queue of its pending requests with filters, SLA timers and bulk actions. |
| FR-ADM-02 | M | Bulk import/export in CSV/Excel (for example exam attendance entry, results, placement lists). |
| FR-ADM-03 | M | Reports for NAAC/NIRF/AISHE: results, pass percentages, placements, fee collection. |
| FR-ADM-04 | S | Dean and HoD dashboards: pass rates by course, backlog trends, rechecking volumes and turnaround, placement rates, fee collection, at-risk students. |

### 3.17 Student lifecycle cases

| ID | Pri | Requirement |
|---|---|---|
| FR-LIF-01 | M | Handle lateral-entry students (records start from their entry semester). |
| FR-LIF-02 | S | Handle programme or branch change, year-back / re-admission, and credit transfer (including MOOC/NPTEL credits), keeping earlier records. |
| FR-LIF-03 | S | No-dues clearance across library, hostel, accounts and departments before final documents are issued, tracked in one place. |

---

## 4. Non-functional requirements

### 4.1 Performance and scale

| ID | Pri | Requirement |
|---|---|---|
| NFR-PER-01 | M | Support 40,000 student accounts and 10,000 concurrent users on result day without slowdown. |
| NFR-PER-02 | M | Pages load in 2 seconds or less on a 4G phone; eligibility checks respond in 500 ms or less. |
| NFR-PER-03 | M | A grade sheet or receipt PDF is generated in 3 seconds or less. |
| NFR-PER-04 | M | Load-tested at 1.5× expected peak before each result season. |

### 4.2 Availability and recovery

| ID | Pri | Requirement |
|---|---|---|
| NFR-AVL-01 | M | 99.5% uptime overall; 99.9% during result and placement weeks. |
| NFR-AVL-02 | M | Maintenance announced 48 hours ahead and never during result, exam-application or placement weeks. |
| NFR-AVL-03 | M | Daily backups with point-in-time recovery; data loss of at most 1 hour (RPO) and service restored within 4 hours (RTO). Restore tested every semester. |

### 4.3 Security

| ID | Pri | Requirement |
|---|---|---|
| NFR-SEC-03 | M | Single sign-on with university Google/Microsoft accounts; no separate passwords. |
| NFR-SEC-04 | M | Multi-factor authentication for all staff roles. |
| NFR-SEC-05 | M | Access rules enforced on the server/database, never only in the browser. |
| NFR-SEC-06 | M | Every staff action is written to an append-only audit log (who, what, when, old and new value), kept for at least 3 years and readable by the Registrar. |
| NFR-SEC-07 | M | Payment card data never touches Campus360 servers (gateway-hosted payment pages). |
| NFR-SEC-08 | M | Independent vulnerability assessment and penetration test (VAPT) before launch and yearly. |
| NFR-SEC-09 | M | Sessions expire after inactivity (staff 30 minutes, students 7 days on a trusted device). |
| NFR-SEC-10 | S | Uploaded documents are virus-scanned and stored privately. |

### 4.4 Privacy and compliance

| ID | Pri | Requirement |
|---|---|---|
| NFR-PRV-01 | M | Comply with the Digital Personal Data Protection Act, 2023: consent notice at first sign-in, stated purpose per data type, a named grievance officer. |
| NFR-PRV-02 | M | Personal data hosted in India. |
| NFR-PRV-03 | M | Retention schedule per data type (for example exam scans kept per university ordinance, resumes deleted 1 year after graduation unless the student keeps them). |
| NFR-PRV-04 | M | Parent/guardian access only with the student's recorded consent, revocable at any time. |
| NFR-PRV-05 | S | Students can download a copy of their personal data. |

### 4.5 Integration

| ID | Pri | Requirement |
|---|---|---|
| NFR-INT-01 | M | Read records from the ERP/SIS through its API: at least nightly, and within 15 minutes during result publication and fee deadlines. |
| NFR-INT-02 | M | A failed sync alerts IT, and affected screens say the data may be out of date; stale data is never shown as current. |
| NFR-INT-03 | M | Write-backs (applications, withdrawals, refunds, tickets) go to the ERP through its API with retries and no duplicates. |
| NFR-INT-04 | M | Payment gateway with webhook confirmation and daily settlement reconciliation. |
| NFR-INT-05 | S | SMS and email providers with delivery reports; DigiLocker/NAD; APAAR/ABC. |

### 4.6 Usability, accessibility and language

| ID | Pri | Requirement |
|---|---|---|
| NFR-USE-01 | M | Mobile-first; usable on a 360 px wide screen and on slow 3G. |
| NFR-USE-02 | M | WCAG 2.1 AA (screen readers, keyboard use, contrast). |
| NFR-USE-03 | S | English and Hindi. |
| NFR-USE-04 | S | System Usability Scale score of 70 or more in pilot testing. |

### 4.7 Operations

| ID | Pri | Requirement |
|---|---|---|
| NFR-OPS-01 | M | Monitoring and alerting for errors, slow pages, failed syncs and failed payments. |
| NFR-OPS-02 | M | Separate test (staging) environment with synthetic data only; real student data is never used for testing. |
| NFR-OPS-03 | M | Automated tests and build checks run on every change before deployment. |

---

## 5. Rollout

| Phase | Scope | Gate to the next phase |
|---|---|---|
| Pilot (1 semester) | One school, about 2,000 students: profile, marks, report card, notices, rechecking, fee status and receipts | Under 1% data mismatches against the ERP; SUS 70 or more |
| Phase 2 | All schools; back/special exams with withdrawals and refunds; exam attendance entry; placements and eligibility; helpdesk | Exam cell and Accounts sign off on workflows; load test passed |
| Phase 3 | Resume checker, mentoring alerts, parent access, Hindi, DigiLocker, invigilator QR app | Support queries down 40% |

---

## 6. Acceptance tests

1. A student who failed subject X can apply for X as a back exam; adding X as a special exam in the same session is blocked with an explanation.
2. Withdrawing one of two paid applications for the same subject produces exactly one adjustment/refund of the correct amount, and the fee ledger balances.
3. A payment debited at the bank but not confirmed is reconciled automatically within 24 hours, and the receipt becomes available.
4. Double-clicking Pay creates one application and one charge.
5. Downloaded grade sheets and receipts verify by QR code; a superseded grade sheet shows **Superseded**.
6. An exam-attendance entry that differs between the two data-entry staff is flagged and never shown to the student until resolved.
7. A student can never read another student's marks, fees, attendance, applications or resume, through the app or the API.
8. A hall ticket blocked by fees shows the exact amount due and how to pay.
9. A rechecking request older than 14 days appears as escalated in the Controller's queue.
10. At 10,000 concurrent users, pages load in 2 seconds or less and PDFs generate in 3 seconds or less.

---

## 7. Policy decisions needed before build

These are university decisions, not software decisions. The system will implement whatever is approved.

1. Refund policy for withdrawals by choice: amounts and cut-off dates.
2. Whether revaluation can lower marks, and by how much a change must differ to be applied.
3. Accepted reasons and documents for special exams; who approves (HoD, exam cell or both).
4. Required class attendance percentage and condonation rules.
5. Maximum attempts per course and the time limit to clear backlogs.
6. Whether unpaid fees can block results, or only hall tickets and documents.
7. Retention period for scanned exam attendance sheets and answer-sheet copies.
8. Offer policy for placements (one offer per student, dream-company rule).
9. Whether parents get access, and at what age or consent level.

---

## 8. Out of scope

- Learning management (course content, assignments, quizzes) – stays in the LMS.
- Timetable creation and exam seating generation – done in the ERP; Campus360 only displays them.
- Hostel room allocation and mess management.
- Payroll and staff HR.
- Official grade or CGPA calculation – done in the ERP.

---

## 9. Implementation status (current build)

| Area | Status | Notes |
|---|---|---|
| Student profile and academic summary | Partly built | Single CGPA, backlog count, credits, mentor; no subject or semester detail |
| Marks (subject-wise, semester-wise) | Not built | |
| Report card PDFs and verification | Not built | |
| Class attendance | Partly built | Overall percentage only |
| Exam schedule, hall ticket, exam-day attendance | Not built | |
| Rechecking | Partly built | Submit and admin status/remarks; no fee, service types or SLA |
| Back/special exams, withdrawals, refunds | Not built | |
| Fees, ledger, receipts, payments | Not built | |
| Placement eligibility (3-state, rule by rule) | Built | Criteria versioning and offer policy not built |
| Application stage tracking | Built | |
| Resume checker (upload, meaning-based matching) | Built | Threshold not yet calibrated |
| Notices | Partly built | No targeting, email/SMS/push or read receipts |
| Role-based access on the database | Built | Student and admin roles only; other staff roles not built |
| Audit log of staff changes | Built | Database triggers; admin view |
| Single sign-on, staff MFA | Not built | Email and password sign-in today |
| ERP integration | Not built | Sample data |
| Helpdesk, mentoring alerts, dashboards | Not built | |
| Hosting in India | Not met | Database is in Seoul; Supabase offers a Mumbai region |
| Automated tests and CI | Built | Runs on every push |
