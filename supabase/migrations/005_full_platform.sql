-- Results, exams, fees, helpdesk, mentoring and staff roles (requirement.md).
-- Workflows run in the app as pure functions; this file enforces who may write what, and the rules a
-- browser must not be trusted with: duplicates, fees, payments, two-person approval and time windows.

-- ── existing tables ─────────────────────────────────────────────────────────

alter table students
  add column enrolment_no text not null default '',
  add column apaar_id text,
  add column school text not null default '',
  add column batch int not null default 0,
  add column lateral_entry boolean not null default false,
  add column status text not null default 'Enrolled' check (status in ('Enrolled', 'Graduated')),
  add column mentor_id text not null default '',
  add column debarred_reason text,
  add column source text not null default 'University ERP',
  add column synced_at timestamptz not null default now();

alter table mentors add column slots text[] not null default '{}';

alter table notices drop constraint notices_category_check;
alter table notices
  add constraint notices_category_check check (category in ('Academic', 'Placement', 'Rechecking', 'Exams', 'Fees')),
  add column target jsonb,
  add column mandatory boolean not null default false;

alter table recheck_requests drop constraint recheck_requests_status_check;
update recheck_requests set status = case status when 'Under Review' then 'Under review' when 'Resolved' then 'Result published' else status end;
alter table recheck_requests
  add constraint recheck_requests_status_check check (status in ('Submitted', 'Under review', 'Result published', 'Rejected')),
  add column service text not null default 'Rechecking' check (service in ('Rechecking', 'Revaluation', 'Answer-sheet copy')),
  add column session_id text not null default '',
  add column outcome text,
  add column closed_on date;

alter table opportunities add column dream boolean not null default false, add column criteria_version int not null default 1;
alter table applications add column criteria jsonb, add column shared text[] not null default '{}', add column override_reason text;

-- ── new tables ──────────────────────────────────────────────────────────────

create table staff (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'exam', 'accounts', 'placement', 'mentor', 'hod', 'dean', 'registrar')),
  department text not null default ''
);

-- the existing admin login becomes the IT administrator's staff record
insert into staff (id, name, email, role) values ('staff-admin', 'IT Administrator', 'admin@galgotiasuniversity.ac.in', 'admin');

alter table profiles drop constraint profiles_role_check;
alter table profiles drop constraint profiles_check;
alter table profiles add column staff_id text references staff on delete cascade;
update profiles set staff_id = 'staff-admin' where role = 'admin';
alter table profiles
  add constraint profiles_role_check check (role in ('student', 'parent', 'admin', 'exam', 'accounts', 'placement', 'mentor', 'hod', 'dean', 'registrar')),
  add constraint profiles_link_check check (
    (role in ('student', 'parent')) = (student_id is not null) and (role in ('student', 'parent')) = (staff_id is null)
  );

create table courses (
  id text primary key,
  code text not null unique,
  title text not null,
  credits int not null,
  semester int not null,
  branch text not null
);

create table course_results (
  id text primary key,
  student_id text not null references students on delete cascade,
  course_code text not null,
  semester int not null,
  session_id text not null,
  attempt text not null check (attempt in ('Regular', 'Back', 'Special')),
  components jsonb not null,
  total int,
  grade text,
  grade_points int,
  passed boolean,
  status text not null check (status in ('Provisional', 'Declared'))
);

create table semester_results (
  id text primary key,
  student_id text not null references students on delete cascade,
  semester int not null,
  session_id text not null,
  sgpa numeric(4, 2),
  cgpa numeric(4, 2),
  credits_earned int not null,
  credits_registered int not null,
  status text not null check (status in ('Pass', 'Pass with backlog', 'Withheld', 'Detained', 'Awaited')),
  withheld_reason text,
  declared_on date
);

create table mark_changes (
  id text primary key,
  result_id text not null,
  student_id text not null references students on delete cascade,
  course_code text not null,
  from_total int not null,
  to_total int not null,
  from_grade text not null,
  to_grade text not null,
  reason text not null check (reason in ('Rechecking', 'Revaluation', 'Moderation', 'Grace marks', 'Correction')),
  note text not null default '',
  changed_on date not null
);

create table credit_transfers (
  id text primary key,
  student_id text not null references students on delete cascade,
  source text not null,
  course text not null,
  credits int not null,
  approved_on date not null
);

create table issued_documents (
  id text primary key,
  serial text not null unique,
  student_id text not null references students on delete cascade,
  kind text not null check (kind in ('Grade sheet', 'Consolidated marks statement', 'Fee receipt', 'Credit note', 'Hall ticket', 'Fee certificate')),
  title text not null,
  ref text not null,
  issued_on date not null,
  superseded_on date
);

create table document_requests (
  id text primary key,
  student_id text not null references students on delete cascade,
  kind text not null check (kind in ('Transcript', 'Signed grade sheet', 'Degree certificate', 'Migration certificate', 'Bonafide certificate', 'Character certificate')),
  copies int not null check (copies between 1 and 10),
  delivery text not null check (delivery in ('Collect', 'Post', 'Email')),
  address text not null default '',
  purpose text not null default '',
  requested_on date not null,
  status text not null check (status in ('Requested', 'Processing', 'Ready', 'Dispatched', 'Collected', 'Rejected')),
  remarks text not null default ''
);

create table course_attendance (
  id text primary key,
  student_id text not null references students on delete cascade,
  course_code text not null,
  semester int not null,
  held int not null,
  attended int not null check (attended <= held),
  updated_on date not null
);

create table condonation_requests (
  id text primary key,
  student_id text not null references students on delete cascade,
  course_code text not null,
  reason text not null check (reason in ('Medical', 'Official university duty')),
  details text not null,
  files jsonb not null default '[]',
  requested_on date not null,
  decision text check (decision in ('Approved', 'Rejected')),
  decision_reason text,
  decided_by text,
  decided_on date
);

create table exam_sessions (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('End-term', 'Back & special')),
  semester_parity text not null check (semester_parity in ('Odd', 'Even')),
  starts_on date not null,
  ends_on date not null,
  application_opens date,
  application_closes date,
  hall_tickets_from date not null,
  result_declared_on date
);

create table exam_papers (
  id text primary key,
  session_id text not null references exam_sessions on delete cascade,
  course_code text not null,
  date date not null,
  slot text not null check (slot in ('Morning', 'Afternoon')),
  time text not null,
  venue text not null
);

create table exam_registrations (
  id text primary key,
  student_id text not null references students on delete cascade,
  session_id text not null,
  course_code text not null,
  room text,
  seat text
);

create table exam_attendance (
  id text primary key,
  student_id text not null references students on delete cascade,
  session_id text not null,
  course_code text not null,
  entry1 jsonb,
  entry2 jsonb,
  -- the two keyed entries must be made by different people (FR-EXA-02)
  check (entry1 is null or entry2 is null or entry1 ->> 'by' <> entry2 ->> 'by' or entry1 ->> 'by' like '%(dispute upheld)')
);

create table exam_sheet_scans (
  id text primary key,
  session_id text not null,
  course_code text not null,
  file jsonb not null,
  uploaded_by text not null,
  uploaded_on date not null
);

create table attendance_disputes (
  id text primary key,
  student_id text not null references students on delete cascade,
  attendance_id text not null references exam_attendance on delete cascade,
  hall_ticket_no text not null,
  seat_no text not null,
  answer_sheet_barcode text not null default '',
  raised_on date not null,
  decision text check (decision in ('Upheld', 'Rejected')),
  decision_reason text,
  decided_by text,
  decided_on date,
  unique (attendance_id)
);

create table ufm_cases (
  id text primary key,
  student_id text not null references students on delete cascade,
  session_id text not null,
  course_code text not null,
  status text not null check (status in ('Reported', 'Hearing scheduled', 'Decided')),
  hearing_on date,
  outcome text
);

create table exam_applications (
  id text primary key,
  student_id text not null references students on delete cascade,
  session_id text not null references exam_sessions,
  kind text not null check (kind in ('Back', 'Special')),
  reason text check (reason in ('Medical', 'Official university duty', 'Timetable clash')),
  missed_session_id text,
  details text not null default '',
  files jsonb not null default '[]',
  submitted_on date not null,
  decision text check (decision in ('Approved', 'Rejected')),
  decision_reason text,
  decided_by text,
  decided_on date,
  source text not null default 'Campus360' check (source in ('Campus360', 'ERP import'))
);

create table exam_application_items (
  id text primary key,
  application_id text not null references exam_applications on delete cascade,
  student_id text not null references students on delete cascade,
  session_id text not null,
  course_code text not null,
  kind text not null check (kind in ('Back', 'Special')),
  fee int not null,
  withdrawn_on date,
  source text not null default 'Campus360' check (source in ('Campus360', 'ERP import'))
);

-- one active application per subject per session, whatever its kind (FR-DUP-01/02); ERP imports predate the rule
create unique index exam_items_one_per_subject on exam_application_items (student_id, session_id, course_code)
  where withdrawn_on is null and source = 'Campus360';

create table withdrawal_requests (
  id text primary key,
  student_id text not null references students on delete cascade,
  application_id text not null references exam_applications on delete cascade,
  item_ids text[] not null,
  reason text not null,
  requested_on date not null,
  requested_by text not null,
  decision text check (decision in ('Approved', 'Rejected')),
  decision_reason text,
  decided_by text,
  decided_on date
);

create table fee_rates (head text primary key, amount int not null);

create table fee_charges (
  id text primary key,
  student_id text not null references students on delete cascade,
  semester int not null,
  head text not null check (head in ('Tuition', 'Exam', 'Hostel', 'Transport', 'Library', 'Late fine', 'Back exam', 'Special exam', 'Rechecking', 'Revaluation', 'Answer-sheet copy', 'Document')),
  description text not null,
  amount int not null check (amount >= 0),
  concession int not null default 0 check (concession >= 0),
  due_date date not null,
  created_on date not null,
  ref text,
  cancelled_on date
);

create table payments (
  id text primary key,
  student_id text not null references students on delete cascade,
  amount int not null check (amount > 0),
  method text not null check (method in ('UPI', 'Card', 'Net banking')),
  status text not null check (status in ('Success', 'Pending', 'Failed')),
  gateway_ref text not null,
  receipt_no text unique,
  created_on timestamptz not null,
  confirmed_on timestamptz,
  allocations jsonb not null,
  idempotency_key text not null unique
);

create table settlements (
  id text primary key,
  student_id text not null references students on delete cascade,
  kind text not null check (kind in ('Adjustment', 'Refund')),
  amount int not null check (amount > 0),
  to_charge_id text references fee_charges,
  reason text not null,
  ref text,
  status text not null check (status in ('Requested', 'Approved', 'Rejected', 'Sent', 'Credited')),
  created_by text not null,
  created_on date not null,
  approved_by text,
  approved_on date,
  bank_ref text,
  sent_on date,
  credited_on date,
  credit_note_no text,
  -- maker–checker: the approver is never the creator (FR-RFD-04)
  check (approved_by is null or approved_by <> created_by),
  check ((kind = 'Adjustment') = (to_charge_id is not null))
);

create table scholarships (
  id text primary key,
  student_id text not null references students on delete cascade,
  name text not null,
  portal text not null,
  amount int not null,
  status text not null check (status in ('Applied', 'Verified', 'Sanctioned', 'Credited', 'Rejected')),
  expected_on date
);

create table tickets (
  id text primary key,
  student_id text not null references students on delete cascade,
  category text not null check (category in ('Data correction', 'Fees', 'Exams', 'Placements', 'Other')),
  subject text not null,
  messages jsonb not null,
  created_on date not null,
  status text not null check (status in ('Open', 'In progress', 'Resolved', 'With grievance committee', 'Closed')),
  resolved_on date,
  committee_outcome text
);

create table mentor_bookings (
  id text primary key,
  student_id text not null references students on delete cascade,
  mentor_id text not null,
  date date not null,
  slot text not null,
  topic text not null,
  status text not null check (status in ('Requested', 'Confirmed', 'Declined'))
);

create table mentor_notes (
  id text primary key,
  student_id text not null references students on delete cascade,
  mentor_id text not null,
  text text not null,
  created_on date not null
);

create table no_dues (
  id text primary key,
  student_id text not null references students on delete cascade,
  office text not null check (office in ('Library', 'Hostel', 'Accounts', 'Department', 'Placement cell')),
  status text not null check (status in ('Pending', 'Cleared')),
  remarks text not null default '',
  cleared_on date
);

create table career_records (
  id text primary key,
  student_id text not null references students on delete cascade,
  kind text not null check (kind in ('Internship', 'Offer letter')),
  company text not null,
  role text not null,
  "from" date not null,
  "to" date,
  file jsonb not null,
  verified boolean not null default false
);

create table consents (
  id text primary key,
  student_id text not null unique references students on delete cascade,
  privacy_accepted_on date,
  parent_access boolean not null default false,
  parent_email text not null default '',
  updated_on date not null
);

create table notice_reads (
  id text primary key,
  notice_id text not null references notices on delete cascade,
  student_id text not null references students on delete cascade,
  read_on date not null,
  unique (notice_id, student_id)
);

create table notifications (
  id text primary key,
  student_id text not null references students on delete cascade,
  title text not null,
  body text not null,
  view text not null,
  created_on timestamptz not null,
  read_on timestamptz
);

-- ── who is signed in ────────────────────────────────────────────────────────

create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- Staff permissions need a second factor (NFR-SEC-04): a staff session that hasn't passed MFA
-- (aal1) has no staff rights at all.
create or replace function has_role(variadic roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = any(roles)
      and (role in ('student', 'parent') or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
  )
$$;

create or replace function is_staff() returns boolean language sql stable as $$
  select has_role('admin', 'exam', 'accounts', 'placement', 'mentor', 'hod', 'dean', 'registrar')
$$;

create or replace function is_admin() returns boolean language sql stable as $$ select has_role('admin') $$;

create or replace function my_staff() returns staff
language sql stable security definer set search_path = public as $$
  select s.* from staff s join profiles p on p.staff_id = s.id where p.id = auth.uid()
$$;

-- A parent sees their child's records only while the student's consent is on (NFR-PRV-04).
create or replace function my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select p.student_id from profiles p
  where p.id = auth.uid()
    and (p.role = 'student' or (p.role = 'parent' and exists (
      select 1 from consents c
      where c.student_id = p.student_id and c.parent_access and lower(c.parent_email) = lower(auth.jwt() ->> 'email'))))
$$;

create or replace function is_student() returns boolean language sql stable as $$ select has_role('student') $$;

-- Offices see every student; mentors their mentees; HoDs their department; deans their school.
create or replace function can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select sid = my_student_id()
    or has_role('admin', 'exam', 'accounts', 'placement', 'registrar')
    or (has_role('mentor') and exists (select 1 from students where id = sid and mentor_id = (my_staff()).id))
    or (has_role('hod') and exists (select 1 from students where id = sid and branch = (my_staff()).department))
    or (has_role('dean') and exists (select 1 from students where id = sid and school = (my_staff()).department))
$$;

-- ── row-level security ──────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['staff', 'courses', 'course_results', 'semester_results', 'mark_changes', 'credit_transfers',
    'issued_documents', 'document_requests', 'course_attendance', 'condonation_requests', 'exam_sessions', 'exam_papers',
    'exam_registrations', 'exam_attendance', 'exam_sheet_scans', 'attendance_disputes', 'ufm_cases', 'exam_applications',
    'exam_application_items', 'withdrawal_requests', 'fee_rates', 'fee_charges', 'payments', 'settlements', 'scholarships',
    'tickets', 'mentor_bookings', 'mentor_notes', 'no_dues', 'career_records', 'consents', 'notice_reads', 'notifications']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;

  -- student-owned records: readable by the student (or consenting parent) and the staff who may see them
  foreach t in array array['course_results', 'semester_results', 'mark_changes', 'credit_transfers', 'issued_documents',
    'document_requests', 'course_attendance', 'condonation_requests', 'exam_registrations', 'exam_attendance',
    'attendance_disputes', 'ufm_cases', 'exam_applications', 'exam_application_items', 'withdrawal_requests',
    'fee_charges', 'payments', 'settlements', 'scholarships', 'tickets', 'mentor_bookings', 'no_dues', 'career_records',
    'consents', 'notice_reads', 'notifications']
  loop
    execute format('create policy "read own or permitted" on %I for select using (can_see_student(student_id))', t);
  end loop;

  -- reference data any signed-in user may read
  foreach t in array array['courses', 'exam_sessions', 'exam_papers', 'fee_rates']
  loop
    execute format('create policy "signed in read" on %I for select to authenticated using (true)', t);
  end loop;
end $$;

-- the earlier student/applications/resume policies used my_student_id(); widen staff reads to the new roles
drop policy "read own" on students;
create policy "read own or permitted" on students for select using (can_see_student(id));
drop policy "read own" on applications;
create policy "read own or permitted" on applications for select using (can_see_student(student_id));
drop policy "read own" on recheck_requests;
create policy "read own or permitted" on recheck_requests for select using (can_see_student(student_id));
drop policy "read own" on resumes;
create policy "read own or permitted" on resumes for select using (can_see_student(student_id));
drop policy "own profile" on profiles;
create policy "own profile" on profiles for select using (id = auth.uid() or has_role('admin'));
create policy "admin manages roles" on profiles for update using (has_role('admin')) with check (has_role('admin'));

create policy "staff read" on staff for select using (is_staff());
create policy "admin write" on staff for all using (has_role('admin')) with check (has_role('admin'));
create policy "mentor and hod read" on mentor_notes for select using (has_role('mentor', 'hod') and can_see_student(student_id));
create policy "exam read" on exam_sheet_scans for select using (has_role('exam', 'registrar'));
create policy "registrar reads audit" on audit_log for select using (has_role('registrar', 'admin'));

-- office writes; the IT administrator manages accounts and notices but not academic or fee records
create policy "exam write" on course_results for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on semester_results for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on mark_changes for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on courses for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_sessions for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_papers for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_registrations for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_attendance for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_sheet_scans for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on attendance_disputes for update using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on ufm_cases for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on withdrawal_requests for all using (has_role('exam')) with check (has_role('exam'));
create policy "exam write" on exam_application_items for update using (has_role('exam')) with check (has_role('exam'));
create policy "exam and hod decide" on exam_applications for update using (has_role('exam', 'hod')) with check (has_role('exam', 'hod'));
create policy "exam supersede" on issued_documents for update using (has_role('exam')) with check (has_role('exam'));
create policy "exam corrections" on students for update using (has_role('exam')) with check (has_role('exam'));
create policy "hod decides" on condonation_requests for update using (has_role('hod')) with check (has_role('hod'));
-- exam fees: the exam cell raises special-exam fees and reduces fees of withdrawn papers
create policy "exam and accounts write" on fee_charges for all using (has_role('exam', 'accounts')) with check (has_role('exam', 'accounts'));
create policy "accounts write" on payments for update using (has_role('accounts')) with check (has_role('accounts'));
create policy "accounts write" on settlements for all using (has_role('accounts')) with check (has_role('accounts'));
create policy "accounts write" on scholarships for all using (has_role('accounts')) with check (has_role('accounts'));
create policy "accounts write" on fee_rates for all using (has_role('accounts')) with check (has_role('accounts'));
create policy "placement write" on career_records for update using (has_role('placement')) with check (has_role('placement'));
create policy "mentor write" on mentor_bookings for update using (has_role('mentor')) with check (has_role('mentor'));
create policy "mentor write" on mentor_notes for insert with check (has_role('mentor') and can_see_student(student_id));
create policy "office write" on document_requests for update using (has_role('exam', 'registrar')) with check (has_role('exam', 'registrar'));
create policy "office write" on tickets for update using (is_staff()) with check (is_staff());
create policy "office write" on no_dues for all using (has_role('accounts', 'registrar', 'placement', 'hod')) with check (has_role('accounts', 'registrar', 'placement', 'hod'));
create policy "staff notify" on notifications for insert with check (is_staff());

drop policy "admin write" on notices;
create policy "staff publish" on notices for all using (is_staff()) with check (is_staff());
drop policy "admin write" on students;
drop policy "admin write" on applications;
create policy "placement write" on applications for all using (has_role('placement')) with check (has_role('placement'));
drop policy "admin write" on opportunities;
create policy "placement write" on opportunities for all using (has_role('placement')) with check (has_role('placement'));
drop policy "admin write" on companies;
create policy "placement write" on companies for all using (has_role('placement')) with check (has_role('placement'));
drop policy "admin write" on recheck_requests;
create policy "exam write" on recheck_requests for update using (has_role('exam')) with check (has_role('exam'));
drop policy "admin write" on mentors;
create policy "admin write" on mentors for all using (has_role('admin')) with check (has_role('admin'));

-- what a student may create, always as themselves and never in a decided state
drop policy "student insert" on recheck_requests;
create policy "student insert" on recheck_requests for insert
  with check (is_student() and student_id = my_student_id() and status = 'Submitted');
create policy "student insert" on exam_applications for insert
  with check (is_student() and student_id = my_student_id() and decision is null and source = 'Campus360');
create policy "student insert" on exam_application_items for insert
  with check (is_student() and student_id = my_student_id() and withdrawn_on is null and source = 'Campus360');
create policy "student insert" on withdrawal_requests for insert
  with check (is_student() and student_id = my_student_id() and decision is null);
create policy "student insert" on attendance_disputes for insert
  with check (is_student() and student_id = my_student_id() and decision is null);
create policy "student insert" on condonation_requests for insert
  with check (is_student() and student_id = my_student_id() and decision is null);
create policy "student insert" on document_requests for insert
  with check (is_student() and student_id = my_student_id() and status = 'Requested');
create policy "student insert" on tickets for insert
  with check (is_student() and student_id = my_student_id() and status = 'Open');
create policy "student update" on tickets for update using (is_student() and student_id = my_student_id());
create policy "student insert" on mentor_bookings for insert
  with check (is_student() and student_id = my_student_id() and status = 'Requested');
create policy "student insert" on career_records for insert
  with check (is_student() and student_id = my_student_id() and not verified);
create policy "student insert" on issued_documents for insert
  with check (is_student() and student_id = my_student_id() and superseded_on is null);
create policy "student insert" on fee_charges for insert with check (is_student() and student_id = my_student_id());
create policy "student own" on consents for all using (is_student() and student_id = my_student_id())
  with check (is_student() and student_id = my_student_id());
create policy "student own" on notice_reads for insert with check (is_student() and student_id = my_student_id());
create policy "student own" on notifications for update using (is_student() and student_id = my_student_id());
create policy "student insert" on applications for insert
  with check (is_student() and student_id = my_student_id() and stage = 'Applied' and override_reason is null);

-- ── guards the policies can't express ───────────────────────────────────────

-- Students may change only the listed columns of rows they own.
create function student_columns_only() returns trigger language plpgsql as $$
begin
  if my_role() = 'student' and (to_jsonb(new) - tg_argv) <> (to_jsonb(old) - tg_argv) then
    raise exception 'You can only change %', array_to_string(tg_argv, ', ');
  end if;
  return new;
end $$;
create trigger student_columns before update on notifications for each row execute function student_columns_only('read_on');
create trigger student_columns before update on tickets for each row execute function student_columns_only('messages', 'status');

-- a student may only reopen a decided ticket to the grievance committee, not resolve or close it
create function ticket_status_guard() returns trigger language plpgsql as $$
begin
  if my_role() = 'student' and new.status <> old.status
     and not (new.status = 'With grievance committee' and old.status in ('Resolved', 'Closed')) then
    raise exception 'Only the office can change a ticket''s status';
  end if;
  return new;
end $$;
create trigger ticket_status before update on tickets for each row execute function ticket_status_guard();

-- Fees a student raises on themselves must match the published rate and belong to their own request.
create function student_charge_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare rate int;
begin
  if my_role() is distinct from 'student' then return new; end if;
  if new.head in ('Back exam') then
    select fee into rate from exam_application_items where id = new.ref and student_id = new.student_id and kind = 'Back';
  elsif new.head in ('Rechecking', 'Revaluation', 'Answer-sheet copy') then
    if not exists (select 1 from recheck_requests where id = new.ref and student_id = new.student_id and service = new.head) then
      raise exception 'Unknown request';
    end if;
    select amount into rate from fee_rates where head = new.head;
  elsif new.head = 'Document' then
    select r.amount * d.copies into rate from document_requests d join fee_rates r on r.head = 'Document:' || d.kind
    where d.id = new.ref and d.student_id = new.student_id;
  else
    raise exception 'Students cannot raise % fees', new.head;
  end if;
  if rate is null or new.amount <> rate or new.concession <> 0 or new.cancelled_on is not null then
    raise exception 'Fee does not match the published rate';
  end if;
  if new.head = 'Back exam' and rate <> (select amount from fee_rates where head = 'Back exam') then
    raise exception 'Fee does not match the published rate';
  end if;
  return new;
end $$;
create trigger student_charge before insert on fee_charges for each row execute function student_charge_guard();

-- Back/special applications: open window, eligible subject, never the same subject twice in a session.
create function exam_item_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare s exam_sessions; passed_latest boolean;
begin
  if new.source = 'Campus360' and exists (select 1 from exam_application_items where student_id = new.student_id and session_id = new.session_id
             and course_code = new.course_code and withdrawn_on is null and id <> new.id) then
    raise exception 'This subject is already in an active exam application for this session';
  end if;
  if my_role() is distinct from 'student' then return new; end if;
  select * into s from exam_sessions where id = new.session_id;
  if s.application_opens is null or current_date not between s.application_opens and s.application_closes then
    raise exception 'Applications for this session are not open';
  end if;
  if new.fee <> (select amount from fee_rates where head = new.kind || ' exam') then
    raise exception 'Fee does not match the published rate';
  end if;
  if new.kind = 'Back' then
    select r.passed into passed_latest from course_results r join exam_sessions e on e.id = r.session_id
    where r.student_id = new.student_id and r.course_code = new.course_code and r.status = 'Declared'
    order by e.starts_on desc limit 1;
    if passed_latest is distinct from false then raise exception 'Not eligible for a back exam in %', new.course_code; end if;
  end if;
  return new;
end $$;
create trigger exam_item before insert on exam_application_items for each row execute function exam_item_guard();

create function dispute_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare a exam_attendance;
begin
  select * into a from exam_attendance where id = new.attendance_id and student_id = new.student_id;
  if a.id is null or a.entry1 ->> 'status' <> 'Absent' or a.entry2 ->> 'status' <> 'Absent'
     or current_date - greatest((a.entry1 ->> 'at')::date, (a.entry2 ->> 'at')::date) > 7 then
    raise exception 'A dispute can be raised only within 7 days of a recorded absence';
  end if;
  return new;
end $$;
create trigger dispute before insert on attendance_disputes for each row execute function dispute_guard();

create function withdrawal_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if my_role() = 'student' and current_date >= (select e.hall_tickets_from from exam_applications a
      join exam_sessions e on e.id = a.session_id where a.id = new.application_id) then
    raise exception 'Hall tickets have been issued; ask the exam cell';
  end if;
  return new;
end $$;
create trigger withdrawal before insert on withdrawal_requests for each row execute function withdrawal_guard();

-- Placement applications by students must pass every published rule and the one-offer policy (FR-PLC-03/06).
create function placement_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare s students; o opportunities;
begin
  if my_role() is distinct from 'student' then return new; end if;
  select * into s from students where id = new.student_id;
  select * into o from opportunities where id = new.opportunity_id;
  if o.status = 'Closed' or o.deadline < current_date
     or s.cgpa is null or o.min_cgpa is null or s.cgpa < o.min_cgpa
     or not (lower(s.branch) = any (select lower(b) from unnest(o.allowed_branches) b))
     or s.active_backlogs is null or o.max_active_backlogs is null or s.active_backlogs > o.max_active_backlogs
     or (coalesce(array_length(o.graduation_years, 1), 0) > 0 and (s.graduation_year is null or not s.graduation_year = any (o.graduation_years)))
     or s.debarred is distinct from false then
    raise exception 'Not eligible for this opening';
  end if;
  if not o.dream and exists (select 1 from applications where student_id = s.id and stage = 'Selected') then
    raise exception 'One-offer policy: only dream openings are open to students who hold an offer';
  end if;
  return new;
end $$;
create trigger placement before insert on applications for each row execute function placement_guard();

-- ── payments (test gateway) ─────────────────────────────────────────────────

-- shortcut: stands in for a payment gateway. A real gateway confirms through a server webhook;
-- swap this for that before taking real money. Same allocation rules as makePayment() in src/domain/fees.ts.
create function pay_charges(p_charge_ids text[], p_method text, p_key text) returns payments
language plpgsql security definer set search_path = public as $$
declare sid text := my_student_id(); result payments; allocs jsonb := '[]'; total int := 0; c fee_charges; due int;
begin
  if not is_student() then raise exception 'Only students can pay'; end if;
  select * into result from payments where idempotency_key = p_key;
  if found then
    if result.student_id <> sid then raise exception 'Invalid payment key'; end if;
    return result;
  end if;
  for c in select * from fee_charges where id = any (p_charge_ids) and student_id = sid and cancelled_on is null loop
    due := c.amount - c.concession
      - coalesce((select sum((a ->> 'amount')::int) from payments p, jsonb_array_elements(p.allocations) a
                  where p.status in ('Success', 'Pending') and a ->> 'chargeId' = c.id), 0)
      - coalesce((select sum(amount) from settlements where kind = 'Adjustment' and to_charge_id = c.id and status = 'Approved'), 0);
    if due > 0 then
      allocs := allocs || jsonb_build_object('chargeId', c.id, 'amount', due);
      total := total + due;
    end if;
  end loop;
  if total = 0 then raise exception 'Nothing is due on the selected fees'; end if;
  insert into payments (id, student_id, amount, method, status, gateway_ref, receipt_no, created_on, confirmed_on, allocations, idempotency_key)
  values ('payment-' || substr(md5(random()::text), 1, 13), sid, total, p_method, 'Success',
          'TEST-' || upper(substr(md5(random()::text), 1, 8)),
          'RCPT-' || extract(year from now())::int || '-' || upper(substr(md5(random()::text), 1, 8)),
          now(), now(), allocs, p_key)
  returning * into result;
  return result;
end $$;

-- ── public verification of issued documents (FR-DOC-02) ─────────────────────

-- Anyone with the QR code can check a document. It returns live figures from the database, not
-- anything the holder supplied, so an edited PDF won't match.
create function verify_document(p_serial text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'serial', d.serial, 'kind', d.kind, 'title', d.title, 'issuedOn', d.issued_on, 'supersededOn', d.superseded_on,
    'holder', s.name, 'enrolmentNo', s.enrolment_no, 'program', s.program || ' ' || s.branch,
    'figures', case
      when d.kind = 'Grade sheet' then (select jsonb_build_object('SGPA', r.sgpa, 'CGPA', r.cgpa, 'Result', r.status)
        from semester_results r where r.student_id = s.id and r.semester::text = d.ref)
      when d.kind = 'Consolidated marks statement' then jsonb_build_object('CGPA', s.cgpa)
      when d.kind = 'Fee receipt' then (select jsonb_build_object('Receipt', p.receipt_no, 'Amount', p.amount, 'Status', p.status)
        from payments p where p.id = d.ref)
      else '{}'::jsonb end)
  from issued_documents d join students s on s.id = d.student_id
  where d.serial = p_serial
$$;
grant execute on function verify_document(text) to anon, authenticated;

-- ── audit, accounts, storage ────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['staff', 'course_results', 'semester_results', 'mark_changes', 'issued_documents', 'document_requests',
    'course_attendance', 'condonation_requests', 'exam_sessions', 'exam_papers', 'exam_registrations', 'exam_attendance',
    'exam_sheet_scans', 'attendance_disputes', 'ufm_cases', 'exam_applications', 'exam_application_items',
    'withdrawal_requests', 'fee_rates', 'fee_charges', 'payments', 'settlements', 'scholarships', 'tickets',
    'mentor_bookings', 'mentor_notes', 'no_dues', 'career_records', 'consents', 'companies', 'profiles']
  loop
    execute format('create trigger audit after insert or update or delete on %I for each row execute function log_change()', t);
  end loop;
end $$;

create or replace function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, actor_email, table_name, row_id, action, old, new)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    tg_table_name,
    case when tg_op = 'DELETE' then to_jsonb(old) ->> 'id' else to_jsonb(new) ->> 'id' end,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end
$$;

-- New accounts get their role from the email: staff list, then student records, then a parent named in a consent.
create or replace function link_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, staff_id)
  select new.id, s.role, s.id from staff s where lower(s.email) = lower(new.email)
  on conflict (id) do nothing;
  if not found then
    insert into profiles (id, role, student_id)
    select new.id, 'student', s.id from students s where lower(s.email) = lower(new.email)
    on conflict (id) do nothing;
  end if;
  if not found then
    insert into profiles (id, role, student_id)
    select new.id, 'parent', c.student_id from consents c where lower(c.parent_email) = lower(new.email) limit 1
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

insert into storage.buckets (id, name, public) values ('documents', 'documents', false), ('exam-sheets', 'exam-sheets', false);
create policy "own uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own or staff read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));
create policy "exam cell sheets" on storage.objects for all to authenticated
  using (bucket_id = 'exam-sheets' and has_role('exam', 'registrar'))
  with check (bucket_id = 'exam-sheets' and has_role('exam'));
