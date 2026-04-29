begin;

do $$
declare
  stmt_public text;
  stmt_wechat_raw text;
begin
  select
    'truncate table ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' restart identity cascade'
  into stmt_public
  from pg_tables
  where schemaname = 'public'
    and tablename not like 'pg_%';

  if stmt_public is not null and length(stmt_public) > 0 then
    execute stmt_public;
  end if;

  select
    'truncate table ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' restart identity cascade'
  into stmt_wechat_raw
  from pg_tables
  where schemaname = 'wechat_raw'
    and tablename not like 'pg_%';

  if stmt_wechat_raw is not null and length(stmt_wechat_raw) > 0 then
    execute stmt_wechat_raw;
  end if;
end
$$;

commit;
