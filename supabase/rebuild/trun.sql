begin;

do $$
declare
  stmt text;
begin
  select
    'truncate table ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' restart identity cascade'
  into stmt
  from pg_tables
  where schemaname = 'public'
    and tablename not like 'pg_%';

  if stmt is not null and length(stmt) > 0 then
    execute stmt;
  end if;
end
$$;

commit;

