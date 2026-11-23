-- Allow trusted migration/service writes to import existing ticket histories, while keeping
-- authenticated student/staff edits append-only and server-stamped.
create or replace function ticket_message_guard() returns trigger
language plpgsql set search_path = public as $$
declare old_count int; new_count int; i int; last_index int; last_message jsonb;
begin
  if auth.uid() is null or auth.jwt() ->> 'role' = 'service_role' then return new; end if;

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
  if new.messages is not distinct from old.messages then return new; end if;
  if not (my_role() = 'student' or is_staff()) or jsonb_typeof(old.messages) <> 'array' or jsonb_typeof(new.messages) <> 'array' then
    raise exception 'Ticket message update is not allowed';
  end if;

  old_count := jsonb_array_length(old.messages);
  new_count := jsonb_array_length(new.messages);
  if new_count <> old_count + 1 then raise exception 'Ticket messages are append-only'; end if;
  for i in 0..old_count - 1 loop
    if new.messages -> i is distinct from old.messages -> i then raise exception 'Ticket messages are append-only'; end if;
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
