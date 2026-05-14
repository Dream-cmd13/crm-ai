begin;

-- 用户表（与 okr-ai 共用，在 okr-ai users 表基础上扩展）
create table if not exists public.users (
  id text primary key,                              -- 用户ID（主键）
  auth_id uuid unique,                              -- 关联 Supabase Auth
  username text not null,                           -- 用户名
  name text not null,                               -- 姓名
  email text,                                       -- 邮箱
  phone text,                                       -- 手机号
  english_name text,                                -- 英文名
  employee_no text,                                 -- 工号
  role text not null default 'User',                -- 角色（Admin/User）
  department_id text,                               -- 部门ID
  is_active boolean default true,                   -- 是否启用
  wechat_name text,                                 -- 员工微信昵称（人工预设，用于匹配）
  wechat_id text,                                   -- 员工微信ID（系统自动回填，不可手动编辑）
  crm_id text,                                      -- 关联CRM系统用户ID（数据迁移用）
  saas_id text,                                     -- 关联SaaS系统用户ID（数据迁移用）
  pad_permissions jsonb,                            -- PAD权限配置（JSON）
  reviews jsonb,                                    -- 复盘记录（JSON）
  system_role_ids jsonb,                            -- 系统角色ID列表（JSON）
  custom_permissions jsonb,                         -- 自定义权限配置（JSON）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

create index if not exists idx_users_auth_id on public.users(auth_id);
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_department_id on public.users(department_id);
create index if not exists idx_users_wechat_id on public.users(wechat_id);
create index if not exists idx_users_wechat_name on public.users(wechat_name);

-- is_admin 函数（departments RLS 也依赖此函数，使用 create or replace 确保幂等）
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where auth_id = auth.uid() and role = 'Admin'
  );
end;
$$ language plpgsql security definer stable;

create or replace function public.current_user_id()
returns text as $$
  select id from public.users where auth_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- users RLS 策略：所有认证用户可读，仅管理员可写/删，用户可更新自身
alter table public.users enable row level security;
drop policy if exists users_select on public.users;
drop policy if exists users_insert on public.users;
drop policy if exists users_update on public.users;
drop policy if exists users_delete on public.users;
create policy users_select on public.users for select to authenticated using (true);
create policy users_insert on public.users for insert to authenticated with check (public.is_admin());
create policy users_update on public.users for update to authenticated
  using (auth_id = auth.uid() or public.is_admin())
  with check (auth_id = auth.uid() or public.is_admin());
create policy users_delete on public.users for delete to authenticated using (public.is_admin());

commit;
