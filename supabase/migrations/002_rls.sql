-- Row-level security: a student reads only their own rows, the admin reads everything,
-- and every write is admin-only except a student's own rechecking requests, resumes and resume results.

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create function my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select student_id from profiles where id = auth.uid()
$$;

alter table students enable row level security;
alter table profiles enable row level security;
alter table mentors enable row level security;
alter table notices enable row level security;
alter table companies enable row level security;
alter table opportunities enable row level security;
alter table applications enable row level security;
alter table recheck_requests enable row level security;
alter table resumes enable row level security;
alter table resume_results enable row level security;
alter table audit_log enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());

-- tables a student may read only for themselves
create policy "read own" on students for select using (id = my_student_id() or is_admin());
create policy "read own" on applications for select using (student_id = my_student_id() or is_admin());
create policy "read own" on recheck_requests for select using (student_id = my_student_id() or is_admin());
create policy "read own" on resumes for select using (student_id = my_student_id() or is_admin());
create policy "read own" on resume_results for select using (student_id = my_student_id() or is_admin());

-- shared tables any signed-in user may read
create policy "signed in read" on mentors for select to authenticated using (true);
create policy "signed in read" on notices for select to authenticated using (true);
create policy "signed in read" on companies for select to authenticated using (true);
create policy "signed in read" on opportunities for select to authenticated using (true);

-- admin writes
create policy "admin write" on students for all using (is_admin()) with check (is_admin());
create policy "admin write" on mentors for all using (is_admin()) with check (is_admin());
create policy "admin write" on notices for all using (is_admin()) with check (is_admin());
create policy "admin write" on companies for all using (is_admin()) with check (is_admin());
create policy "admin write" on opportunities for all using (is_admin()) with check (is_admin());
create policy "admin write" on applications for all using (is_admin()) with check (is_admin());
create policy "admin write" on recheck_requests for all using (is_admin()) with check (is_admin());
create policy "admin read" on audit_log for select using (is_admin());

-- student inserts: only new Submitted requests, and their own resumes and results
create policy "student insert" on recheck_requests for insert
  with check (student_id = my_student_id() and status = 'Submitted');
create policy "student insert" on resumes for insert with check (student_id = my_student_id());
create policy "student insert" on resume_results for insert with check (student_id = my_student_id());

-- storage: resumes/<auth uid>/<file>, written only by the owner, readable by the owner and the admin
create policy "own resume files" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own resume files" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
