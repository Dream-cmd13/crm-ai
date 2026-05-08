begin;

-- 先删除 seed 创建的 auth identities（外键依赖，必须先于 users 删除）
delete from auth.identities where provider_id in (
  'admin@example.com',
  'sales_manager@example.com',
  'sales_a@example.com',
  'fae@example.com',
  'pm@example.com',
  'qc@example.com',
  'it@example.com',
  'finance@example.com',
  'purchasing@example.com',
  'cs@example.com',
  'hr@example.com'
);

-- 再删除 seed 创建的 auth 用户，确保重跑 seed 时密码能重置
delete from auth.users where email in (
  'admin@example.com',
  'sales_manager@example.com',
  'sales_a@example.com',
  'fae@example.com',
  'pm@example.com',
  'qc@example.com',
  'it@example.com',
  'finance@example.com',
  'purchasing@example.com',
  'cs@example.com',
  'hr@example.com'
);

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
