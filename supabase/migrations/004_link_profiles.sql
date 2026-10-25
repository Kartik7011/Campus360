-- Gives each new Supabase Auth account its role, matching on email: a student email links to that
-- student's record, the placement office email becomes the admin. Other accounts get no profile and can't sign in.

create function link_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'admin@galgotiasuniversity.ac.in' then
    insert into profiles (id, role) values (new.id, 'admin') on conflict (id) do nothing;
  else
    insert into profiles (id, role, student_id)
    select new.id, 'student', s.id from students s where lower(s.email) = lower(new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end
$$;

create trigger link_profile after insert on auth.users for each row execute function link_profile();
