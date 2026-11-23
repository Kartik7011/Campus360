-- Narrow personal-data access, enforce private upload limits and keep helpdesk history immutable.

-- Do not let a parent inherit access to private requests, placement records or resumes merely because
-- they can read the student's academic and fee records.
do $$
declare t text;
begin
  foreach t in array array[
    'course_results', 'semester_results', 'mark_changes', 'credit_transfers', 'issued_documents',
    'document_requests', 'course_attendance', 'condonation_requests', 'exam_registrations', 'exam_attendance',
    'attendance_disputes', 'ufm_cases', 'exam_applications', 'exam_application_items', 'withdrawal_requests',
    'fee_charges', 'payments', 'settlements', 'scholarships', 'tickets', 'mentor_bookings', 'no_dues',
    'career_records', 'notice_reads', 'notifications', 'recheck_requests', 'consents'
  ] loop
    execute format('drop policy if exists "read own or permitted" on %I', t);
  end loop;
end $$;

-- RLS accepts university OAuth/SAML sessions for students and staff, and only one-time links
-- for parent accounts. A password-authenticated session must not bypass the production login UI.
create or replace function campus_auth_method_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      (p.role = 'parent' and exists (
        select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as methods(entry)
        where entry ->> 'method' in ('otp', 'magiclink')
      )) or
      (p.role in ('student', 'admin', 'exam', 'accounts', 'placement', 'mentor', 'hod', 'dean', 'registrar')
        and exists (
          select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as methods(entry)
          where entry ->> 'method' in ('oauth', 'sso/saml')
        )
        and (p.role in ('student') or auth.jwt() ->> 'aal' = 'aal2')
      )
    )
  )
$$;

create or replace function my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select p.student_id from profiles p
  where p.id = auth.uid()
    and campus_auth_method_allowed()
    and (p.role = 'student' or (p.role = 'parent' and exists (
      select 1 from consents c
      where c.student_id = p.student_id and c.parent_access and lower(c.parent_email) = lower(auth.jwt() ->> 'email')
    )))
$$;

create or replace function has_role(variadic roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = any(roles)
      and campus_auth_method_allowed()
      and (p.role in ('student', 'parent') or auth.jwt() ->> 'aal' = 'aal2')
  )
$$;

-- Parent UI needs a label for the linked student, but not their full private profile row.
create or replace function parent_student_summary()
returns table (id text, name text, initials text, enrolment_no text, semester int, branch text, program text,
               cgpa numeric, credits_completed int, total_credits int, status text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.initials, s.enrolment_no, s.semester, s.branch, s.program,
         s.cgpa, s.credits_completed, s.total_credits, s.status
  from students s
  where my_role() = 'parent' and s.id = my_student_id()
$$;
revoke all on function parent_student_summary() from public, anon;
grant execute on function parent_student_summary() to authenticated;

-- Only the Registrar role may inspect audit rows; IT administration must not imply access to record contents.
drop policy if exists "admin read" on audit_log;
drop policy if exists "registrar reads audit" on audit_log;
create policy "registrar reads audit" on audit_log for select using (has_role('registrar'));

-- Publish notices only from the office responsible for their category.
drop policy if exists "staff publish" on notices;
create policy "office publishes notices" on notices for all using (
  has_role('admin', 'registrar') or
  (category in ('Academic', 'Rechecking', 'Exams') and has_role('exam')) or
  (category = 'Placement' and has_role('placement')) or
  (category = 'Fees' and has_role('accounts'))
) with check (
  has_role('admin', 'registrar') or
  (category in ('Academic', 'Rechecking', 'Exams') and has_role('exam')) or
  (category = 'Placement' and has_role('placement')) or
  (category = 'Fees' and has_role('accounts'))
);

-- The IT administrator manages identity and deployment settings, not student academic or fee records.
drop policy if exists "read own or permitted" on students;
create policy "student and academic office student read" on students for select using (
  (my_role() = 'student' and id = my_student_id()) or
  (has_role('exam', 'accounts', 'registrar') and can_see_student(id)) or
  (has_role('mentor', 'hod', 'dean') and can_see_student(id)) or
  (has_role('placement') and exists (
    select 1 from applications a where a.student_id = students.id
  ))
);

-- Academic/exam information is available to the student, an explicitly consented parent, and scoped offices.
do $$
declare t text;
begin
  foreach t in array array[
    'course_results', 'semester_results', 'mark_changes', 'credit_transfers', 'issued_documents',
    'course_attendance', 'exam_registrations'
  ] loop
    execute format(
      'create policy "scoped academic read" on %I for select using (' ||
      '(my_role() in (''student'', ''parent'') and student_id = my_student_id()) or ' ||
      '(has_role(''exam'', ''registrar'', ''hod'', ''dean'', ''mentor'') and can_see_student(student_id)))', t
    );
  end loop;
end $$;

-- Request details and supporting evidence are private to the student and the offices deciding them.
do $$
declare t text;
begin
  foreach t in array array[
    'document_requests', 'condonation_requests', 'attendance_disputes', 'ufm_cases',
    'exam_applications', 'exam_application_items', 'withdrawal_requests', 'recheck_requests'
  ] loop
    execute format(
      'create policy "private request read" on %I for select using (' ||
      '(my_role() = ''student'' and student_id = my_student_id()) or ' ||
      '(has_role(''exam'', ''registrar'', ''hod'') and can_see_student(student_id)))', t
    );
  end loop;
end $$;

-- Fee and payment records are limited to the student/consented parent and the responsible offices.
do $$
declare t text;
begin
  foreach t in array array['fee_charges', 'payments', 'settlements', 'scholarships'] loop
    execute format(
      'create policy "scoped finance read" on %I for select using (' ||
      '(my_role() in (''student'', ''parent'') and student_id = my_student_id()) or ' ||
      '(has_role(''accounts'', ''registrar'') and can_see_student(student_id))' ||
      case when t in ('fee_charges', 'payments') then
        ' or (has_role(''exam'') and can_see_student(student_id))' else '' end || ')', t
    );
  end loop;
end $$;

-- A ticket is visible only to its owner and to the office that owns its category.
create policy "routed ticket read" on tickets for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (has_role('registrar') and can_see_student(student_id)) or
  (category = 'Fees' and has_role('accounts') and can_see_student(student_id)) or
  (category in ('Exams', 'Data correction') and has_role('exam') and can_see_student(student_id)) or
  (category = 'Placements' and has_role('placement') and can_see_student(student_id)) or
  (category = 'Other' and has_role('mentor', 'hod', 'dean') and can_see_student(student_id))
);
drop policy if exists "office write" on tickets;
create policy "routed ticket update" on tickets for update using (
  (has_role('registrar') and can_see_student(student_id)) or
  (category = 'Fees' and has_role('accounts') and can_see_student(student_id)) or
  (category in ('Exams', 'Data correction') and has_role('exam') and can_see_student(student_id)) or
  (category = 'Placements' and has_role('placement') and can_see_student(student_id)) or
  (category = 'Other' and has_role('mentor', 'hod', 'dean') and can_see_student(student_id))
) with check (
  (has_role('registrar') and can_see_student(student_id)) or
  (category = 'Fees' and has_role('accounts') and can_see_student(student_id)) or
  (category in ('Exams', 'Data correction') and has_role('exam') and can_see_student(student_id)) or
  (category = 'Placements' and has_role('placement') and can_see_student(student_id)) or
  (category = 'Other' and has_role('mentor', 'hod', 'dean') and can_see_student(student_id))
);

-- These records are private to the student and placement staff; parents and unrelated offices do not get them.
create or replace function can_read_shared_resume_owner(owner_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('placement') and exists (
    select 1 from profiles p join applications a on a.student_id = p.student_id
    where p.id::text = owner_uid and a.stage <> 'Rejected' and a.shared @> array['Resume']::text[]
  )
$$;

drop policy if exists "read own or permitted" on applications;
create policy "student and placement application read" on applications for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (has_role('placement') and can_see_student(student_id))
);

drop policy if exists "read own or permitted" on resumes;
create policy "student and consented placement resume read" on resumes for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (has_role('placement') and exists (
    select 1 from applications a
    where a.student_id = resumes.student_id and a.stage <> 'Rejected' and a.shared @> array['Resume']::text[]
  ))
);

drop policy if exists "read own" on resume_results;
create policy "student resume analysis read" on resume_results for select using (
  my_role() = 'student' and student_id = my_student_id()
);

drop policy if exists "read own or permitted" on career_records;
create policy "student and placement career read" on career_records for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (has_role('placement') and can_see_student(student_id))
);

drop policy if exists "read own or permitted" on mentor_bookings;
create policy "student and assigned mentor booking read" on mentor_bookings for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (has_role('mentor', 'hod') and can_see_student(student_id))
);

drop policy if exists "read own or permitted" on no_dues;
create policy "student and responsible office no-dues read" on no_dues for select using (
  (my_role() = 'student' and student_id = my_student_id()) or
  (office = 'Accounts' and has_role('accounts') and can_see_student(student_id)) or
  (office = 'Placement cell' and has_role('placement') and can_see_student(student_id)) or
  (office = 'Department' and has_role('hod') and can_see_student(student_id)) or
  (has_role('registrar') and can_see_student(student_id))
);

drop policy if exists "office write" on no_dues;
create policy "office writes own no-dues queue" on no_dues for all using (
  (office = 'Accounts' and has_role('accounts')) or
  (office = 'Placement cell' and has_role('placement')) or
  (office = 'Department' and has_role('hod') and can_see_student(student_id)) or
  (has_role('registrar') and can_see_student(student_id))
) with check (
  (office = 'Accounts' and has_role('accounts')) or
  (office = 'Placement cell' and has_role('placement')) or
  (office = 'Department' and has_role('hod') and can_see_student(student_id)) or
  (has_role('registrar') and can_see_student(student_id))
);

drop policy if exists "hod decides" on condonation_requests;
create policy "scoped hod decides" on condonation_requests for update
using (has_role('hod') and can_see_student(student_id))
with check (has_role('hod') and can_see_student(student_id));

drop policy if exists "exam and hod decide" on exam_applications;
create policy "scoped exam and hod decide" on exam_applications for update
using (has_role('exam') or (has_role('hod') and can_see_student(student_id)))
with check (has_role('exam') or (has_role('hod') and can_see_student(student_id)));

drop policy if exists "mentor write" on mentor_bookings;
create policy "assigned mentor booking write" on mentor_bookings for update
using (has_role('mentor') and can_see_student(student_id))
with check (has_role('mentor') and can_see_student(student_id));

drop policy if exists "read own or permitted" on notice_reads;
create policy "student notice read receipt" on notice_reads for select using (
  my_role() = 'student' and student_id = my_student_id()
);
drop policy if exists "read own or permitted" on notifications;
create policy "student notification read" on notifications for select using (
  my_role() = 'student' and student_id = my_student_id()
);

-- Only placement staff may read a saved resume file after the student included Resume in an application.
revoke all on function can_read_shared_resume_owner(text) from public, anon;
grant execute on function can_read_shared_resume_owner(text) to authenticated;

drop policy if exists "read own resume files" on storage.objects;
create policy "student or consented placement resume files" on storage.objects for select to authenticated
using (
  bucket_id = 'resumes' and (
    (my_role() = 'student' and (storage.foldername(name))[1] = auth.uid()::text) or
    can_read_shared_resume_owner((storage.foldername(name))[1])
  )
);

-- Documents carry health and employment evidence. Keep their paths purpose-scoped and staff access minimal.
drop policy if exists "own uploads" on storage.objects;
drop policy if exists "own or staff read" on storage.objects;
create policy "student uploads scoped evidence" on storage.objects for insert to authenticated
with check (
  bucket_id = 'documents' and my_role() = 'student' and
  (storage.foldername(name))[1] in ('exam-evidence', 'placement-evidence') and
  (storage.foldername(name))[2] = my_student_id()
);
create policy "student and assigned office read evidence" on storage.objects for select to authenticated
using (
  bucket_id = 'documents' and (
    (my_role() = 'student' and (storage.foldername(name))[2] = my_student_id()) or
    ((storage.foldername(name))[1] = 'exam-evidence' and has_role('exam', 'hod', 'registrar') and
      can_see_student((storage.foldername(name))[2])) or
    ((storage.foldername(name))[1] = 'placement-evidence' and has_role('placement') and
      can_see_student((storage.foldername(name))[2]))
  )
);

-- Enforce size and MIME at Storage, not only in the browser. The resume UI limit is 2 MB.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']::text[]
where id in ('documents', 'exam-sheets');
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]::text[]
where id = 'resumes';

-- The installed payment RPC is a simulation. Remove the public/client execution path until an approved
-- gateway integration replaces it with server-verified payment and refund processing.
revoke all on function pay_charges(text[], text, text) from public, anon, authenticated;

create or replace function block_unverified_refund_updates() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('Sent', 'Credited') and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Refund completion must be confirmed by the payment provider';
  end if;
  return new;
end $$;
create trigger settlement_provider_confirmation
before insert or update on settlements
for each row execute function block_unverified_refund_updates();

-- Prevent forged ticket replies and protect the original author/date/content of existing messages.
create or replace function ticket_message_guard() returns trigger
language plpgsql set search_path = public as $$
declare old_count int; new_count int; i int; last_index int; last_message jsonb;
begin
  if tg_op = 'INSERT' then
    if my_role() <> 'student' or jsonb_typeof(new.messages) <> 'array' or jsonb_array_length(new.messages) <> 1 then
      raise exception 'A new ticket must start with one student message';
    end if;
    last_index := 0;
    last_message := new.messages -> last_index;
    if last_message ->> 'role' is distinct from 'student' or length(trim(coalesce(last_message ->> 'text', ''))) not between 1 and 4000 then
      raise exception 'Ticket message is invalid';
    end if;
    new.messages := jsonb_set(new.messages, '{0,by}', to_jsonb(coalesce(auth.jwt() ->> 'email', 'Student')));
    new.messages := jsonb_set(new.messages, '{0,at}', to_jsonb(clock_timestamp()::text));
    return new;
  end if;

  if is_staff() and (to_jsonb(new) - array['messages', 'status', 'resolved_on', 'committee_outcome'])
    is distinct from (to_jsonb(old) - array['messages', 'status', 'resolved_on', 'committee_outcome']) then
    raise exception 'Ticket identity and category cannot be changed';
  end if;
  if new.messages is not distinct from old.messages then
    return new;
  end if;

  if not (my_role() = 'student' or is_staff()) or jsonb_typeof(old.messages) <> 'array' or jsonb_typeof(new.messages) <> 'array' then
    raise exception 'Ticket message update is not allowed';
  end if;
  old_count := jsonb_array_length(old.messages);
  new_count := jsonb_array_length(new.messages);
  if new_count <> old_count + 1 then raise exception 'Ticket messages are append-only'; end if;
  for i in 0..old_count - 1 loop
    if new.messages -> i is distinct from old.messages -> i then
      raise exception 'Ticket messages are append-only';
    end if;
  end loop;
  last_index := new_count - 1;
  last_message := new.messages -> last_index;
  if length(trim(coalesce(last_message ->> 'text', ''))) not between 1 and 4000 then
    raise exception 'Ticket message is invalid';
  end if;
  if my_role() = 'student' and last_message ->> 'role' is distinct from 'student' then
    raise exception 'Students may only add student messages';
  elsif is_staff() and last_message ->> 'role' is distinct from 'staff' then
    raise exception 'Staff may only add staff messages';
  end if;
  new.messages := jsonb_set(new.messages, array[last_index::text, 'by'], to_jsonb(coalesce(auth.jwt() ->> 'email', 'Campus360')));
  new.messages := jsonb_set(new.messages, array[last_index::text, 'at'], to_jsonb(clock_timestamp()::text));
  return new;
end $$;
create trigger ticket_messages_guard before insert or update on tickets
for each row execute function ticket_message_guard();

-- Index the high-volume foreign-key and queue filters used by the app.
create index if not exists course_results_student_session_idx on course_results (student_id, session_id);
create index if not exists semester_results_student_semester_idx on semester_results (student_id, semester);
create index if not exists exam_attendance_student_session_idx on exam_attendance (student_id, session_id);
create index if not exists fee_charges_student_due_idx on fee_charges (student_id, due_date) where cancelled_on is null;
create index if not exists payments_student_created_idx on payments (student_id, created_on desc);
create index if not exists tickets_office_queue_idx on tickets (category, status, created_on desc);
create index if not exists tickets_student_created_idx on tickets (student_id, created_on desc);
create index if not exists applications_student_stage_idx on applications (student_id, stage);
create index if not exists resumes_student_idx on resumes (student_id);
create index if not exists career_records_student_idx on career_records (student_id);
create index if not exists students_scope_idx on students (mentor_id, branch, school);
