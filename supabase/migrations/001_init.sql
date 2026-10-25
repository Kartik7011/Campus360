-- Tables mirror src/types.ts (snake_case columns); src/api.ts maps them back to camelCase.

create table students (
  id text primary key,
  name text not null,
  initials text not null,
  email text not null unique,
  phone text not null default '',
  semester int not null,
  branch text not null,
  program text not null,
  cgpa numeric(4, 2),
  active_backlogs int,
  backlog_subjects text[] not null default '{}',
  debarred boolean,
  graduation_year int,
  attendance int not null default 0,
  credits_completed int not null default 0,
  total_credits int not null default 0,
  skills text[] not null default '{}',
  profile_note text not null default ''
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('student', 'admin')),
  student_id text references students on delete cascade,
  check ((role = 'student') = (student_id is not null))
);

create table mentors (
  id text primary key,
  name text not null,
  initials text not null,
  department text not null,
  email text not null,
  phone text not null,
  office_hours text not null,
  availability text not null,
  focus text not null
);

create table notices (
  id text primary key,
  title text not null,
  category text not null check (category in ('Academic', 'Placement', 'Rechecking')),
  summary text not null,
  date date not null,
  deadline date,
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  audience text not null,
  source text not null
);

create table companies (
  id text primary key,
  name text not null,
  initials text not null,
  sector text not null,
  location text not null,
  website text not null,
  description text not null,
  accent text not null
);

create table opportunities (
  id text primary key,
  company_id text not null references companies,
  title text not null,
  location text not null,
  work_mode text not null check (work_mode in ('On-site', 'Hybrid', 'Remote')),
  deadline date not null,
  posted date not null,
  min_cgpa numeric(4, 2),
  allowed_branches text[] not null default '{}',
  max_active_backlogs int,
  graduation_years int[],
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  job_description text not null,
  package text not null,
  job_type text not null check (job_type in ('Full-time', 'Internship + PPO')),
  status text not null check (status in ('Open', 'Closing soon', 'Closed'))
);

create table applications (
  id text primary key,
  student_id text not null references students on delete cascade,
  opportunity_id text not null references opportunities on delete cascade,
  stage text not null check (stage in ('Applied', 'Aptitude', 'Technical', 'HR', 'Selected', 'Rejected')),
  applied_on date not null,
  note text not null default ''
);

create table recheck_requests (
  id text primary key,
  student_id text not null references students on delete cascade,
  subject text not null check (length(trim(subject)) > 0),
  code text not null check (length(trim(code)) > 0),
  request_date date not null,
  status text not null check (status in ('Submitted', 'Under Review', 'Resolved')),
  remarks text not null default '',
  expected_by date not null
);

create table resumes (
  id text primary key,
  student_id text not null references students on delete cascade,
  name text not null,
  text text not null,
  updated_at date not null,
  -- path of the original upload in the private "resumes" storage bucket, if there was one
  file_path text
);

create table resume_results (
  id bigint generated always as identity primary key,
  student_id text not null references students on delete cascade,
  opportunity_id text not null references opportunities on delete cascade,
  score int not null check (score between 0 and 100),
  categories jsonb not null,
  scoring_version text not null check (scoring_version in ('v1-keyword', 'v2-semantic')),
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  actor_email text,
  table_name text not null,
  row_id text,
  action text not null,
  old jsonb,
  new jsonb,
  at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
