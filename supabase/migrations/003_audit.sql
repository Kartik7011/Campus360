-- Every insert, update and delete on these tables is logged by the database itself,
-- so an edit made from the browser cannot skip the log.

create function log_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, actor_email, table_name, row_id, action, old, new)
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end
$$;

create trigger audit after insert or update or delete on students for each row execute function log_change();
create trigger audit after insert or update or delete on notices for each row execute function log_change();
create trigger audit after insert or update or delete on opportunities for each row execute function log_change();
create trigger audit after insert or update or delete on applications for each row execute function log_change();
create trigger audit after insert or update or delete on recheck_requests for each row execute function log_change();
