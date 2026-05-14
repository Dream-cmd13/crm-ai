begin;

-- 删除 seed 创建的 auth identities（外键依赖，必须先于 auth.users 删除）
delete from auth.identities where provider_id in (
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
);

-- 删除 seed 创建的 auth 用户，确保重跑 users_seed 时密码能重置
delete from auth.users where email in (
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
);

-- 只清空 users 表（用户表无 FK 引用，不会级联删除业务数据）
truncate table public.users restart identity cascade;

commit;
