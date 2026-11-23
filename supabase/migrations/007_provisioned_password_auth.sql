-- Campus IT provisions student and staff Supabase email/password accounts. Parents remain
-- restricted to student-approved one-time email links.
-- Staff roles continue to require aal2 in has_role() from migration 006.
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
          where entry ->> 'method' = 'password'
        )
        and (p.role = 'student' or auth.jwt() ->> 'aal' = 'aal2')
      )
    )
  )
$$;
