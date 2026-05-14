begin;

insert into public.users(id, username, name, email, role, employee_no, department_id, is_active, wechat_name) values
  ('00000000-0000-0000-0000-000000000001', 'admin', '系统管理员', 'admin@app.local', 'Admin', 'E001', 'dept-executive', true, null),
  ('00000000-0000-0000-0000-000000000002', 'sales_manager', '销售经理', 'sales_manager@app.local', 'Admin', 'E002', 'dept-sales', true, '销售经理'),
  ('00000000-0000-0000-0000-000000000003', 'sales_a', '业务员A', 'sales_a@app.local', 'User', 'E003', 'dept-sales', true, '业务员A'),
  ('00000000-0000-0000-0000-000000000004', 'fae_engineer', 'FAE工程师', 'fae@app.local', 'User', 'E004', 'dept-fae', true, null),
  ('00000000-0000-0000-0000-000000000005', 'product_manager', '产品经理', 'pm@app.local', 'Admin', 'E005', 'dept-product', true, null),
  ('00000000-0000-0000-0000-000000000006', 'quality_engineer', '品质工程师', 'qc@app.local', 'User', 'E006', 'dept-quality', true, '品质工程师'),
  ('00000000-0000-0000-0000-000000000007', 'it_engineer', 'IT开发工程师', 'it@app.local', 'User', 'E007', 'dept-it', true, null),
  ('00000000-0000-0000-0000-000000000008', 'finance_accountant', '财务会计', 'finance@app.local', 'User', 'E008', 'dept-finance', true, null),
  ('00000000-0000-0000-0000-000000000009', 'purchasing_specialist', '采购专员', 'purchasing@app.local', 'User', 'E009', 'dept-1774349542675', true, null),
  ('00000000-0000-0000-0000-00000000000a', 'cs_specialist', '客服专员', 'cs@app.local', 'User', 'E010', 'dept-1774349760986', true, null),
  ('00000000-0000-0000-0000-00000000000b', 'hr_specialist', '招聘专员', 'hr@app.local', 'User', 'E011', 'dept-hr', true, null)
on conflict (id) do nothing;

-- 创建 auth.users 用于登录认证（密码均为 dev 环境密码，勿用于生产）
-- 所有用户的密码均为 888888
do $$
declare
  v_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-00000000000a',
    '00000000-0000-0000-0000-00000000000b'
  ];
  v_emails text[] := array[
    'admin@app.local',
    'sales_manager@app.local',
    'sales_a@app.local',
    'fae@app.local',
    'pm@app.local',
    'qc@app.local',
    'it@app.local',
    'finance@app.local',
    'purchasing@app.local',
    'cs@app.local',
    'hr@app.local'
  ];
  v_names text[] := array[
    '系统管理员',
    '销售经理',
    '业务员A',
    'FAE工程师',
    '产品经理',
    '品质工程师',
    'IT开发工程师',
    '财务会计',
    '采购专员',
    '客服专员',
    '招聘专员'
  ];
  v_id uuid;
  i int;
begin
  create extension if not exists pgcrypto;

  for i in 1..array_length(v_ids, 1) loop
    v_id := v_ids[i];
    if not exists (select 1 from auth.users where id = v_id) then
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, reauthentication_token, email_change, phone, phone_change, phone_change_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values (
        v_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_emails[i],
        crypt('888888', gen_salt('bf')),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        null,
        '',
        '',
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', v_names[i]),
        now(),
        now()
      );
    end if;

    -- 创建对应的 auth.identities 记录（缺失会导致登录报 invalid_credentials）
    if not exists (select 1 from auth.identities where user_id = v_id and provider = 'email') then
      insert into auth.identities (user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (
        v_id,
        jsonb_build_object('sub', v_id::text, 'email', v_emails[i], 'email_verified', true),
        'email',
        v_emails[i],
        now(),
        now(),
        now()
      );
    end if;
  end loop;
end;
$$;

-- 关联 public.users.auth_id ↔ auth.users.id（种子数据使用了相同的 ID）
update public.users u
set auth_id = a.id
from auth.users a
where u.id = a.id::text
  and u.auth_id is null;

commit;
