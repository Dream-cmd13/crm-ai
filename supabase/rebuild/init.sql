begin;

create extension if not exists "pgcrypto";
create schema if not exists app_meta;
create schema if not exists wechat_raw;

-- ========= ENUMS =========
do $$
begin
  if not exists (select 1 from pg_type where typname = 'crm_inquiry_status_enum') then
    create type public.crm_inquiry_status_enum as enum ('待处理', '已转线索', '关闭');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_inquiry_source_channel_enum') then
    create type public.crm_inquiry_source_channel_enum as enum (
      '万连', '电子谷', '1688', '爱采购', '胜蓝', '新电子谷', '其他', '淘宝', '官网', '展会'
    );
  end if;
  if exists (
    select 1
    from pg_type t
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'crm_inquiry_source_channel_enum'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typnamespace = 'public'::regnamespace
      and t.typname = 'crm_inquiry_source_channel_enum'
      and e.enumlabel = '展会'
  ) then
    alter type public.crm_inquiry_source_channel_enum add value '展会';
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_lead_status_enum') then
    create type public.crm_lead_status_enum as enum ('未跟进', '跟进中', '关闭', '转商机');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_lead_customer_action_enum') then
    create type public.crm_lead_customer_action_enum as enum ('寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_lead_source_type_enum') then
    create type public.crm_lead_source_type_enum as enum ('企业微信', '注册', '在线', '微信', '邮件', '电话', '其他');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_lead_source_status_enum') then
    create type public.crm_lead_source_status_enum as enum ('客服', '自己开发');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_lead_product_industry_enum') then
    create type public.crm_lead_product_industry_enum as enum ('基础接插件', '新能源', '线束', '定制', '胜蓝', '胜蓝电气', '工业');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_opportunity_status_enum') then
    create type public.crm_opportunity_status_enum as enum ('未跟进', '跟进中', '关闭', '转项目');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_project_status_enum') then
    create type public.crm_project_status_enum as enum ('跟进中', '样品/小批量', '已合作', '关闭', '暂停');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_project_stage_enum') then
    create type public.crm_project_stage_enum as enum ('需求阶段', '设计阶段', '报价阶段', '样品制作', '样品承认', '试产阶段', '重复试产', '量产阶段');
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_product_line_enum') then
    create type public.crm_product_line_enum as enum ('接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他');
  end if;
  -- 新增枚举类型
  if not exists (select 1 from pg_type where typname = 'crm_sample_order_status_enum') then
    create type public.crm_sample_order_status_enum as enum (
      'leader_reject', 'wait_leader_examine', 'completed', 'stay_follow_up', 'cancellation', 'closure'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_sales_order_status_enum') then
    create type public.crm_sales_order_status_enum as enum (
      'un_paid', 'partial_payment', 'monthly_paid_audit', 'monthly_paid_audit_failed',
      'offline_payment_audit', 'offline_payment_audit_failed', 'waiting_delivery',
      'partial_delivery', 'delivered', 'await_comment', 'completed', 'not_submit',
      'cancellation', 'admin_cancellation', 'admin_cancellation_audit', 'system_cancel',
      'await_follow', 'await_refund', 'await_receipt_refund', 'completed_refund'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'crm_quotation_status_enum') then
    create type public.crm_quotation_status_enum as enum (
      'quotation_complete', 'terminated', 'manual_quotation', 'timeout_cancellation', 'user_cancelled'
    );
  end if;
end
$$;

-- ========= BASE TABLES =========
create table if not exists public.ba_employeeinfo (
  id text primary key,
  no text,
  name text not null,
  username text not null,
  email text,
  role text,
  department text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 品牌表
create table if not exists public.ba_brand (
  id serial not null primary key,
  name text not null,
  status integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 归属小组表
create table if not exists public.ba_group (
  id serial not null primary key,
  name text not null,
  manager text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 产品线表
create table if not exists public.ba_product_line (
  id serial not null primary key,
  parent_id integer references public.ba_product_line(id),
  name text not null,
  manager text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 公共属性名称表
create table if not exists public.public_property_name (
  id serial not null primary key,
  specification_name text not null,
  group_name text,
  image text,
  is_searchable int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 公共属性值表
create table if not exists public.public_property_value (
  id serial not null primary key,
  property_id int not null,
  property_value text not null,
  property_value_image text,
  public_property_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (property_id) references public.public_property_name(id)
);

create table if not exists public.ba_cptype (
  id serial not null primary key,
  parent_id integer references public.ba_cptype(id),
  name text not null,
  image text,
  fab_features text not null default '',
  fab_advantages text not null default '',
  fab_benefits text not null default '',
  status integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- crm_product_series - 修改 id 为 integer
create table if not exists public.crm_product_series (
  id integer generated by default as identity primary key,
  series_no text not null default '',
  name text not null,
  category_id integer references public.ba_cptype(id) on delete set null,
  description text not null default '',
  fab_features text not null default '',
  fab_advantages text not null default '',
  fab_benefits text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_product_series_id_unsigned check (id > 0)
);

-- SPU表
create table if not exists public.ba_spu (
  id serial primary key,
  name text not null,
  brand_id integer references public.ba_brand(id),
  category_id integer references public.ba_cptype(id),
  category_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ba_cpinfo (
  id serial not null primary key,
  category_id integer references public.ba_cptype(id),
  category_name text,
  material_no text not null,
  material_name text not null,
  specification text,
  unit text not null,
  price numeric(18,2) not null default 0,
  min_price numeric(18,2),
  status integer not null default 1,
  brand_id integer references public.ba_brand(id),
  brand_name text,
  min_pack_qty numeric(18,2) default 0,
  min_order_qty numeric(18,2) default 0,
  outsource_supplier_drawing text,
  drawing_3d text,
  supplier text,
  supplier_no text,
  supplier_material_no text,
  supplier_material_name text,
  product_line_level1_id integer references public.ba_product_line(id),
  product_line_level2_id integer references public.ba_product_line(id),
  product_belonging integer default -1,
  group_id integer references public.ba_group(id),
  group_name text,
  outsource_customer_drawing text,
  customer_original_drawing text,
  change_drawing_detail text,
  specification_doc text,
  inspection_standard text,
  spu_id integer references public.ba_spu(id),
  spu_name text,
  platform_material_no text,
  material_lead_time integer,
  packaging_method text,
  packaging_spec text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 产品属性关系表
create table if not exists public.ba_product_property_relation (
  id serial not null primary key,
  material_id text not null,
  product_id int references public.ba_cpinfo(id),
  spu_status int not null default 1,
  product_status int not null default 1,
  product_name text not null,
  property_id int,
  property_name text,
  property_value text,
  property_value_id int,
  category_id int references public.ba_cptype(id),
  category_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ba_manucustinfo (
  id serial primary key,
  customer_number text not null,
  name text not null,
  level text not null default '普通客户',
  status integer not null default 1,
  industry text,
  source integer,
  region integer,
  sales_rep text,
  payment_term integer,
  has_payment_term integer default 0,
  customer_type integer,
  merchandiser text,
  merchandiser_id text,
  is_public_pool boolean default false,
  month_settlement_apply_status integer default 0,
  business_manager text,
  currency text,
  currency_id integer,
  customer_category integer default 0,
  group_name text,
  is_listed_company boolean default false,
  short_name text,
  english_name text,
  insured_count integer,
  paid_in_capital text,
  last_visit_date date,
  last_contact_time timestamptz,
  last_contact_action text,
  legal_person text,
  registered_capital text,
  industry_level_1 text,
  industry_level_2 text,
  industry_level_3 text,
  employee_count text,
  establishment_date date,
  unified_social_credit_code text,
  company_address text,
  company_type text,
  fax_number text,
  month_settlement_attachment text,
  month_settlement_agreement text,
  business_scope text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ba_customer_user (
  id serial not null primary key,
  customer_id integer not null references public.ba_manucustinfo(id),
  member_name text not null,
  contact_name text,
  phone text,
  email text,
  is_primary integer not null default 0,
  status integer not null default 1,
  source integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ba_customer_user is '用户表';
comment on column public.ba_customer_user.id is '主键';
comment on column public.ba_customer_user.customer_id is '客户ID';
comment on column public.ba_customer_user.member_name is '会员名称';
comment on column public.ba_customer_user.contact_name is '联系人';
comment on column public.ba_customer_user.phone is '手机号';
comment on column public.ba_customer_user.email is '邮箱';
comment on column public.ba_customer_user.is_primary is '是否首联系人（0否，1是）';
comment on column public.ba_customer_user.status is '账户状态（1正常，0冻结）';
comment on column public.ba_customer_user.source is '账户来源（1线上，2后台，3公众号注册，4短信推广注册，5微信小程序）';
comment on column public.ba_customer_user.created_at is '创建时间';
comment on column public.ba_customer_user.updated_at is '更新时间';

-- 修复客户编号生成触发器，避免历史 CASE/WHEN 类型错误
drop trigger if exists trigger_set_customer_number on public.ba_manucustinfo;
drop function if exists public.set_customer_number();
drop function if exists public.generate_customer_number();

create or replace function public.generate_customer_number()
returns text
language plpgsql
as $$
declare
  today_str text;
  current_max integer;
begin
  today_str := to_char(current_date, 'YYYYMMDD');

  select coalesce(max(substring(customer_number from '([0-9]{3})$')::integer), 0)
    into current_max
    from public.ba_manucustinfo
   where customer_number ~ ('^CUS-' || today_str || '-[0-9]{3}$');

  return 'CUS-' || today_str || '-' || lpad((current_max + 1)::text, 3, '0');
end;
$$;

create or replace function public.set_customer_number()
returns trigger
language plpgsql
as $$
begin
  if new.customer_number is null
     or btrim(new.customer_number) = ''
     or lower(btrim(new.customer_number)) = 'null' then
    new.customer_number := public.generate_customer_number();
  end if;
  return new;
end;
$$;

create trigger trigger_set_customer_number
before insert on public.ba_manucustinfo
for each row
execute function public.set_customer_number();

drop function if exists public.generate_business_number(text, text, integer);
drop function if exists public.generate_business_number(text, text, text, integer);
create or replace function public.generate_business_number(prefix text, table_name text, column_name text, pad_len integer default 4)
returns text
language plpgsql
as $$
declare
  today_str text;
  current_max integer;
  sql_text text;
begin
  today_str := to_char(current_date, 'YYYYMMDD');
  sql_text := format(
    'select coalesce(max(substring(no from ''([0-9]{%1$s})$'')::integer), 0)
       from (
         select %2$I as no
           from public.%3$I
          where %2$I ~ %4$L
       ) t',
    pad_len,
    column_name,
    table_name,
    '^' || prefix || '-' || today_str || '-[0-9]{' || pad_len::text || '}$'
  );

  execute sql_text into current_max;
  return prefix || '-' || today_str || '-' || lpad((current_max + 1)::text, pad_len, '0');
end;
$$;

drop function if exists public.set_inquiry_no();
create or replace function public.set_inquiry_no()
returns trigger
language plpgsql
as $$
begin
  if new.inquiry_no is null or btrim(new.inquiry_no) = '' then
    new.inquiry_no := public.generate_business_number('INQ', 'crm_inquiry', 'inquiry_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_lead_no();
create or replace function public.set_lead_no()
returns trigger
language plpgsql
as $$
begin
  if new.lead_no is null or btrim(new.lead_no) = '' then
    new.lead_no := public.generate_business_number('LEAD', 'crm_lead', 'lead_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_opportunity_no();
create or replace function public.set_opportunity_no()
returns trigger
language plpgsql
as $$
begin
  if new.opportunity_no is null or btrim(new.opportunity_no) = '' then
    new.opportunity_no := public.generate_business_number('OPP', 'crm_opportunity', 'opportunity_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_project_no();
create or replace function public.set_project_no()
returns trigger
language plpgsql
as $$
begin
  if new.project_no is null or btrim(new.project_no) = '' then
    new.project_no := public.generate_business_number('PRJ', 'crm_project', 'project_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_quote_no();
create or replace function public.set_quote_no()
returns trigger
language plpgsql
as $$
begin
  if new.quote_no is null or btrim(new.quote_no) = '' then
    new.quote_no := public.generate_business_number('QT', 'crm_quotation', 'quote_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_sales_order_no();
create or replace function public.set_sales_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null or btrim(new.order_no) = '' then
    new.order_no := public.generate_business_number('SO', 'crm_sales_order', 'order_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_sample_no();
create or replace function public.set_sample_no()
returns trigger
language plpgsql
as $$
begin
  if new.sample_no is null or btrim(new.sample_no) = '' then
    new.sample_no := public.generate_business_number('SAM', 'crm_sample_order', 'sample_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_return_no();
create or replace function public.set_return_no()
returns trigger
language plpgsql
as $$
begin
  if new.return_no is null or btrim(new.return_no) = '' then
    new.return_no := public.generate_business_number('RET', 'crm_return_order', 'return_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_purchase_quote_no();
create or replace function public.set_purchase_quote_no()
returns trigger
language plpgsql
as $$
begin
  if new.purchase_quote_no is null or btrim(new.purchase_quote_no) = '' then
    new.purchase_quote_no := public.generate_business_number('PQT', 'crm_purchase_quotation', 'purchase_quote_no', 4);
  end if;
  return new;
end;
$$;

create table if not exists public.crm_customer_contact (
  id text primary key,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  name text not null,
  position text,
  department text,
  phone text,
  email text,
  is_primary boolean default false,
  buying_role text,
  buying_mode text,
  appellation text,
  wechat_id text,
  manager_contact_id text references public.crm_customer_contact(id) on delete set null,
  faction text not null default '',
  attitude_to_us text not null default '中性评价',
  attitude_score int not null default 0,
  role_tag text not null default 'I',
  influence_level int not null default 3,
  relation_level int not null default 2,
  graduation_school text not null default '',
  hometown text not null default '',
  hobbies text[] not null default '{}',
  family_situation text not null default '',
  personality text not null default '',
  preferences text not null default '',
  key_concerns text not null default '',
  follow_strategy text not null default '',
  video_channel_profile text not null default '',
  douyin_profile text not null default '',
  xiaohongshu_profile text not null default '',
  social_media_behavior text not null default '',
  gender text,
  office_phone text,
  fax_number text,
  is_employed boolean,
  marital_status text,
  birth_date date,
  highest_education text,
  native_place text,
  religion text,
  entry_date date,
  is_key_person boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_persona (
  id text primary key,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  scale text,
  main_products text,
  org_structure text,
  buying_mode text,
  pain_points text,
  competitive_supplier text,
  competitive_preference text,
  unique_needs text,
  rd_requirements text,
  sample_requirements text,
  production_requirements text,
  last_updated date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========= CORE PIPELINE =========
-- crm_inquiry - 修改 id 为 integer
create table if not exists public.crm_inquiry (
  id integer generated by default as identity primary key,
  inquiry_no text not null default '',
  customer_id integer references public.ba_manucustinfo(id),
  company_name text not null,
  customer_name text,
  contact text,
  source_channel public.crm_inquiry_source_channel_enum,
  category text,
  product_series text not null default '',
  province text,
  situation text,
  status public.crm_inquiry_status_enum not null default '待处理',
  classification text,
  unconvert_reason text,
  customer_inquiry text,
  unconverted_time date,
  notes text,
  associated_lead text,
  attachments jsonb,
  create_date date not null default current_date,
  update_date date,
  creator_id text,
  creator_name text,
  updater text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_inquiry_id_unsigned check (id > 0)
);

-- crm_lead - 修改 id 为 integer
create table if not exists public.crm_lead (
  id integer generated by default as identity primary key,
  lead_no text not null default '',
  customer_id integer references public.ba_manucustinfo(id),
  customer_type text,
  customer_name text not null,
  name text,
  phone text,
  customer_action public.crm_lead_customer_action_enum,
  industry text,
  status public.crm_lead_status_enum not null default '未跟进',
  classification text,
  assignee text,
  entry_time text,
  source_channel public.crm_inquiry_source_channel_enum,
  source_type public.crm_lead_source_type_enum,
  product_category text,
  product_series text,
  source_status public.crm_lead_source_status_enum,
  inquiry_id integer references public.crm_inquiry(id),
  contact_id text references public.crm_customer_contact(id),
  intent_score numeric(10,2),
  buying_mode text,
  buyer_role text,
  product_industry public.crm_lead_product_industry_enum,
  close_time date,
  close_reason text,
  customer_opportunity text,
  attachments jsonb,
  create_date date not null default current_date,
  creator_id text,
  creator_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_lead_id_unsigned check (id > 0)
);

alter table if exists public.crm_lead
  add column if not exists customer_type text;

-- crm_opportunity - 修改 id 为 integer
create table if not exists public.crm_opportunity (
  id integer generated by default as identity primary key,
  opportunity_no text not null default '',
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text not null,
  opp_date date not null default current_date,
  status public.crm_opportunity_status_enum not null default '未跟进',
  opp_summary text,
  product_line public.crm_product_line_enum,
  sales_rep text,
  project_manager text,
  product_owner text,
  opp_level text,
  intent_amount numeric(18,2),
  associated_project text,
  end_customer text,
  end_project text,
  sales_type text,
  product_industry public.crm_lead_product_industry_enum,
  completeness numeric(5,2),
  contact_person text,
  lead_id integer references public.crm_lead(id),
  inquiry_id integer references public.crm_inquiry(id),
  application_scenario text,
  estimated_usage text,
  estimated_mass_production_date date,
  close_time date,
  close_reason text,
  attachments jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_opportunity_id_unsigned check (id > 0)
);

-- crm_project - 修改 id 为 integer
create table if not exists public.crm_project (
  id integer generated by default as identity primary key,
  project_no text not null default '',
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text not null,
  project_name text not null,
  status public.crm_project_status_enum not null default '跟进中',
  stage public.crm_project_stage_enum not null default '需求阶段',
  manager text,
  amount numeric(18,2),
  project_type text,
  project_level text,
  wechat_group text,
  team jsonb,
  notes jsonb,
  requirements jsonb,
  progress jsonb,
  tasks jsonb,
  samples jsonb,
  purchasing_quotes jsonb,
  quotations jsonb,
  requirement_changes jsonb,
  communication_details jsonb,
  is_key_project boolean default false,
  ai_analysis jsonb,
  creator_id text,
  creator_no text,
  creator_name text,
  create_date date,
  end_customer text,
  opp_summary text,
  application_scenario text,
  intent_amount numeric(18,2),
  end_project text,
  product_industry public.crm_lead_product_industry_enum,
  estimated_usage text,
  estimated_mass_production_date date,
  customer_action public.crm_lead_customer_action_enum,
  sales_rep text,
  product_owner text,
  quality_owner text,
  purchaser text,
  fae text,
  lead_id integer references public.crm_lead(id),
  opportunity_id integer references public.crm_opportunity(id),
  inquiry_id integer references public.crm_inquiry(id),
  close_time date,
  close_reason text,
  product_line public.crm_product_line_enum,
  start_date date,
  end_date date,
  attachments jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_project_id_unsigned check (id > 0)
);

-- ========= INTERACTION / TASK =========
create table if not exists public.crm_communication_log (
  id text primary key,
  source_id text,
  customer_id integer references public.ba_manucustinfo(id),
  date text,
  sender text,
  content text,
  type text,
  attachment_url text,
  duration int,
  source_group text,
  is_summarized boolean default false,
  created_at timestamptz not null default now()
);

-- ========= WECHAT RAW / PROJECTION =========
create table if not exists wechat_raw.wechat_group_message_events (
  id bigserial primary key,
  dedupe_key text not null unique,
  guid text not null,
  notify_type integer not null,
  event_time timestamptz,
  seq bigint,
  msg_id text,
  appinfo text,
  sender text,
  sender_name text,
  receiver text,
  roomid text not null,
  sendtime timestamptz,
  content_type integer,
  msg_type integer,
  referid text,
  flag bigint,
  content text,
  at_list jsonb,
  quote_content text,
  quote_appinfo text,
  send_flag integer,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  local_media_path text,
  voice_trans_text text,
  media_task_status text,
  media_task_updated_at timestamptz,
  remote_media_url text,
  sender_display_name text,
  sender_alias text,
  room_name text,
  room_remark_name text
);

create table if not exists wechat_raw.wechat_private_message_events (
  id bigserial primary key,
  dedupe_key text not null unique,
  guid text not null,
  notify_type integer not null,
  event_time timestamptz,
  seq bigint,
  msg_id text,
  appinfo text,
  sender text,
  sender_name text,
  receiver text,
  roomid text not null default '0',
  sendtime timestamptz,
  content_type integer,
  msg_type integer,
  referid text,
  flag bigint,
  content text,
  at_list jsonb,
  quote_content text,
  quote_appinfo text,
  send_flag integer,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  local_media_path text,
  voice_trans_text text,
  media_task_status text,
  media_task_updated_at timestamptz,
  remote_media_url text,
  sender_display_name text,
  sender_alias text,
  receiver_display_name text,
  peer_display_name text
);

create index if not exists idx_wechat_group_message_events_sendtime
  on wechat_raw.wechat_group_message_events (sendtime);
create index if not exists idx_wechat_private_message_events_sendtime
  on wechat_raw.wechat_private_message_events (sendtime);

create table if not exists public.crm_wx_conversation (
  id bigint generated always as identity primary key,
  conversation_key text not null unique,
  source_guid text not null,
  conversation_type text not null check (conversation_type in ('private', 'group')),
  conversation_identity_type text not null default 'private_direct'
    check (conversation_identity_type in ('group', 'private_direct', 'private_forward_batch', 'private_internal', 'private_name')),
  is_internal_chat boolean not null default false,
  forward_batch_key text,
  my_wechat_id text,
  my_wechat_name text,
  peer_wechat_id text,
  peer_wechat_name text,
  peer_name_tokens text[] not null default '{}',
  room_username text,
  conversation_name text,
  room_name text,
  room_remark_name text,
  customer_id text,
  primary_contact_id text,
  owner_employee_id text,
  status text not null default 'active' check (status in ('active', 'archived')),
  last_message_id bigint,
  last_message_at timestamptz,
  last_message_preview text,
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_member_sync_version bigint not null default 0,
  last_member_synced_at timestamptz
);

create index if not exists idx_crm_wx_conversation_guid_type
  on public.crm_wx_conversation (source_guid, conversation_type);
create index if not exists idx_crm_wx_conversation_guid_last_message_at
  on public.crm_wx_conversation (source_guid, last_message_at desc);
create index if not exists idx_crm_wx_conversation_private_identity
  on public.crm_wx_conversation (source_guid, conversation_type, conversation_identity_type, is_internal_chat, my_wechat_id);
create index if not exists idx_crm_wx_conversation_forward_batch_key
  on public.crm_wx_conversation (forward_batch_key);
create index if not exists idx_crm_wx_conversation_peer_name_tokens
  on public.crm_wx_conversation using gin (peer_name_tokens);
create index if not exists idx_crm_wx_conversation_customer_id
  on public.crm_wx_conversation (customer_id);
create index if not exists idx_crm_wx_conversation_primary_contact_id
  on public.crm_wx_conversation (primary_contact_id);

create table if not exists public.crm_wx_message (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,
  source_guid text not null,
  message_scope text not null check (message_scope in ('private', 'group')),
  message_origin_type text not null default 'unknown'
    check (message_origin_type in ('private_forward', 'group_forward', 'group_live', 'unknown')),
  raw_event_table text not null check (raw_event_table in (
    'wechat_raw.wechat_private_message_events',
    'wechat_raw.wechat_group_message_events',
    'wechat_raw.wework_private_message_events',
    'wechat_raw.wework_group_message_events'
  )),
  raw_event_dedupe_key text not null,
  raw_msg_id text,
  sender_wechat_id text,
  sender_display_name text,
  sender_alias text,
  receiver_wechat_id text,
  receiver_display_name text,
  peer_display_name text,
  forward_batch_key text,
  room_username text,
  room_name text,
  room_remark_name text,
  msg_type integer,
  content text,
  quote_content text,
  quote_msg_type integer,
  quote_remote_media_url text,
  quote_file_name text,
  send_time timestamptz,
  remote_media_url text,
  local_media_path text,
  voice_trans_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raw_event_table, raw_event_dedupe_key)
);

create index if not exists idx_crm_wx_message_conversation_send_time
  on public.crm_wx_message (conversation_id, send_time desc);
create index if not exists idx_crm_wx_message_source_guid_send_time
  on public.crm_wx_message (source_guid, send_time desc);
create index if not exists idx_crm_wx_message_sender_wechat_id
  on public.crm_wx_message (sender_wechat_id);
create index if not exists idx_crm_wx_message_room_username
  on public.crm_wx_message (room_username);

create table if not exists public.crm_wx_conversation_member (
  id bigint generated always as identity primary key,
  conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,
  wechat_id text not null,
  display_name text,
  member_type text not null default 'external_unknown'
    check (member_type in ('customer_contact', 'employee', 'external_unknown')),
  contact_id text,
  employee_id text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, wechat_id)
);

create index if not exists idx_crm_wx_conversation_member_contact_id
  on public.crm_wx_conversation_member (contact_id);
create index if not exists idx_crm_wx_conversation_member_wechat_id
  on public.crm_wx_conversation_member (wechat_id);

create table if not exists public.crm_customer_message_session (
  id text primary key,
  customer_id text not null,
  contact_id text,
  channel text not null default 'wechat_private'
    check (channel in ('wechat_private', 'wechat_group')),
  source_sender_key text not null,
  source_sender_wechat_id text,
  source_sender_display_name text,
  title text not null,
  message_count integer not null default 0,
  last_message_at timestamptz,
  last_message_preview text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_customer_message_session_customer_id
  on public.crm_customer_message_session (customer_id, created_at desc);
create index if not exists idx_crm_customer_message_session_contact_id
  on public.crm_customer_message_session (contact_id);
create index if not exists idx_crm_customer_message_session_sender_key
  on public.crm_customer_message_session (source_sender_key);

create table if not exists public.crm_customer_message_session_item (
  id bigint generated always as identity primary key,
  session_id text not null references public.crm_customer_message_session(id) on delete cascade,
  wx_message_id bigint not null references public.crm_wx_message(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, wx_message_id),
  unique (wx_message_id)
);

create index if not exists idx_crm_customer_message_session_item_session_id
  on public.crm_customer_message_session_item (session_id, sort_order asc, wx_message_id asc);

drop view if exists public.crm_wx_sender_inbox_v;
create view public.crm_wx_sender_inbox_v as
with private_messages as (
  select
    m.id,
    m.send_time,
    coalesce(m.content, '') as content,
    nullif(btrim(c.my_wechat_id), '') as sender_wechat_id,
    nullif(btrim(c.my_wechat_name), '') as sender_display_name,
    coalesce(
      nullif(btrim(c.my_wechat_id), ''),
      lower(nullif(btrim(c.my_wechat_name), ''))
    ) as sender_key
  from public.crm_wx_message m
  join public.crm_wx_conversation c on c.id = m.conversation_id
  where m.message_scope = 'private'
    and coalesce(nullif(btrim(c.my_wechat_id), ''), nullif(btrim(c.my_wechat_name), '')) is not null
),
latest_messages as (
  select distinct on (pm.sender_key)
    pm.sender_key,
    pm.send_time as last_message_at,
    pm.content as last_message_preview
  from private_messages pm
  order by pm.sender_key, pm.send_time desc nulls last, pm.id desc
)
select
  pm.sender_key,
  max(pm.sender_wechat_id) filter (where pm.sender_wechat_id is not null) as sender_wechat_id,
  max(pm.sender_display_name) filter (where pm.sender_display_name is not null) as sender_display_name,
  count(*)::integer as message_count,
  lm.last_message_at,
  lm.last_message_preview,
  count(cmsi.wx_message_id)::integer as archived_message_count
from private_messages pm
join latest_messages lm on lm.sender_key = pm.sender_key
left join public.crm_customer_message_session_item cmsi on cmsi.wx_message_id = pm.id
group by pm.sender_key, lm.last_message_at, lm.last_message_preview;

create table if not exists public.crm_wx_projection_jobs (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  source_guid text not null,
  raw_event_table text not null,
  raw_event_dedupe_key text not null,
  job_type text not null check (job_type in ('project_message')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'success', 'failed')),
  attempt_count integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  processing_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_wx_projection_jobs_poll
  on public.crm_wx_projection_jobs (status, next_retry_at, created_at);
create index if not exists idx_crm_wx_projection_jobs_source_guid
  on public.crm_wx_projection_jobs (source_guid, created_at desc);

alter table if exists public.crm_wx_conversation
  add column if not exists last_member_sync_version bigint not null default 0,
  add column if not exists last_member_synced_at timestamptz,
  add column if not exists room_name text,
  add column if not exists room_remark_name text,
  add column if not exists my_wechat_name text,
  add column if not exists peer_wechat_name text,
  add column if not exists conversation_identity_type text not null default 'private_direct',
  add column if not exists is_internal_chat boolean not null default false,
  add column if not exists forward_batch_key text,
  add column if not exists peer_name_tokens text[] not null default '{}';

alter table if exists public.crm_wx_message
  add column if not exists room_remark_name text,
  add column if not exists sender_alias text,
  add column if not exists message_origin_type text,
  add column if not exists quote_content text,
  add column if not exists quote_msg_type integer,
  add column if not exists quote_remote_media_url text,
  add column if not exists quote_file_name text,
  add column if not exists forward_batch_key text;

create table if not exists public.crm_task_type (
  id text primary key,
  name text not null,
  default_hours int default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_task (
  id text primary key,
  title text not null,
  description text,
  module text,
  related_id text,
  source_type text,
  source_id text,
  task_type text,
  objectives jsonb,
  auxiliary_json jsonb,
  status text,
  importance text,
  urgency text,
  assignee_id text,
  assignee_name text,
  due_date date,
  create_date date,
  creator_id text,
  creator_name text,
  ai_context_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========= COMPETITOR / SWOT =========
create table if not exists public.crm_competitor (
  id text primary key,
  name text not null,
  advantages text,
  disadvantages text,
  positioning text,
  product_matrix jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_competitor (
  id text primary key,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  competitor_id text not null references public.crm_competitor(id) on delete cascade,
  threat_level text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_focus_swot (
  id text primary key,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  customer_focus text not null default '',
  key_contact text not null default '',
  focus_level int not null default 3,
  our_strengths jsonb not null default '[]'::jsonb,
  our_weaknesses jsonb not null default '[]'::jsonb,
  ai_script text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_focus_competitor (
  id text primary key,
  focus_id text not null references public.crm_customer_focus_swot(id) on delete cascade,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  competitor_name text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_follow_strategy_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_customer_faq_library_config (
  id text primary key,
  config jsonb not null default '{"categories":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 修复问题：评估直接基于联系人，不再依赖未落地的 crm_customer_stakeholder。
create table if not exists public.crm_stakeholder_assessment (
  id text primary key,
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,
  stakeholder_id text not null references public.crm_customer_contact(id) on delete cascade,
  assessment_date date not null default current_date,
  need_level_score int,
  power_score int,
  attitude_score int,
  relation_score int,
  business_alignment_score int,
  confidence_score int default 60,
  conclusion text,
  strategy_suggestion text,
  source_type text default 'manual',
  ai_model text,
  created_by text,
  created_at timestamptz not null default now()
);

-- ========= SALES DOCS =========
-- crm_quotation - 修改 id 为 integer
create table if not exists public.crm_quotation (
  id integer generated by default as identity primary key,
  quote_no text,
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text,
  project_id integer references public.crm_project(id),
  project_name text,
  quote_date date,
  status public.crm_quotation_status_enum,
  audit_status text,
  tax_included_total_amount numeric(18,2) default 0,
  tax_excluded_total_amount numeric(18,2) default 0,
  total_amount numeric(18,2) default 0,
  contact_person text,
  valid_until date,
  delivery_method text,
  delivery_time timestamptz,
  payment_method int,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_quotation_id_unsigned check (id > 0)
);

-- crm_quotation_item - 修改 id 为 integer
create table if not exists public.crm_quotation_item (
  id integer generated by default as identity primary key,
  quotation_id integer not null references public.crm_quotation(id) on delete cascade,
  product_id integer references public.ba_cpinfo(id),
  product_name text,
  material_no text,
  quantity numeric(18,4) default 0,
  tax_type text,
  tax_rate numeric(8,4) default 0,
  tax_included_price numeric(18,4) default 0,
  tax_excluded_price numeric(18,4) default 0,
  tax_included_amount numeric(18,2) default 0,
  tax_excluded_amount numeric(18,2) default 0,
  tax_amount numeric(18,2) default 0,
  currency text,
  lead_time text,
  mpq numeric(18,4),
  moq numeric(18,4),
  sample_price numeric(18,4) default 0,
  remark text,
  customer_material_no text,
  material_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_quotation_item_id_unsigned check (id > 0)
);

-- crm_sales_order - 修改 id 为 integer
create table if not exists public.crm_sales_order (
  id integer generated by default as identity primary key,
  order_no text unique,
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text,
  project_id integer references public.crm_project(id),
  project_name text,
  order_date date,
  status public.crm_sales_order_status_enum,
  audit_status text,
  tax_included_total_amount numeric(18,2) default 0,
  tax_excluded_total_amount numeric(18,2) default 0,
  total_amount numeric(18,2) default 0,
  actual_received_amount numeric(18,2) default 0,
  pending_amount numeric(18,2) default 0,
  order_type int,
  payment_status int default 0,
  payment_method int,
  payment_time timestamptz,
  province text,
  city text,
  district text,
  shipping_address text,
  consignee_name text,
  consignee_phone text,
  customer_purchase_order_no text,
  third_party_transaction_no text,
  sales_rep text,
  merchandiser text,
  receipt_time timestamptz,
  receipt_voucher text,
  source_document_no text,
  source_after_sale_no text,
  advance_stock_attachment text,
  advance_stock_reason text,
  is_advance_stock int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_sales_order_id_unsigned check (id > 0)
);

-- crm_sales_order_item - 修改 id 为 integer
create table if not exists public.crm_sales_order_item (
  id integer generated by default as identity primary key,
  sales_order_id integer not null references public.crm_sales_order(id) on delete cascade,
  product_id integer references public.ba_cpinfo(id),
  product_name text,
  material_no text,
  quantity numeric(18,4) default 0,
  tax_type text,
  tax_rate numeric(8,4) default 0,
  tax_included_price numeric(18,4) default 0,
  tax_excluded_price numeric(18,4) default 0,
  tax_included_amount numeric(18,2) default 0,
  tax_excluded_amount numeric(18,2) default 0,
  tax_amount numeric(18,2) default 0,
  order_no text,
  customer_name text,
  product_no text,
  customer_material_no text,
  list_price numeric(18,4) default 0,
  sales_unit_price numeric(18,4) default 0,
  line_total numeric(18,2) default 0,
  original_line_total numeric(18,2) default 0,
  order_type int,
  customer_due_date date,
  due_date date,
  packaging_unit text,
  shipping_method text,
  tax_excluded_unit_price numeric(18,4) default 0,
  tax_excluded_line_total numeric(18,2) default 0,
  discount_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_sales_order_item_id_unsigned check (id > 0)
);

-- crm_sample_order - 修改 id 为 integer
create table if not exists public.crm_sample_order (
  id integer generated by default as identity primary key,
  sample_no text,
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text,
  applicant text,
  project_id integer references public.crm_project(id),
  project_name text,
  status public.crm_sample_order_status_enum,
  audit_status text,
  tax_included_total_amount numeric(18,2) default 0,
  tax_excluded_total_amount numeric(18,2) default 0,
  total_amount numeric(18,2) default 0,
  sales_rep text,
  merchandiser text,
  created_by text,
  created_time timestamptz,
  recipient text,
  mobile_phone text,
  province text,
  city text,
  district text,
  detail_address text,
  reject_reason text,
  reject_time timestamptz,
  sample_application_note text,
  application_attachments jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_sample_order_id_unsigned check (id > 0)
);

-- crm_sample_order_item - 修改 id 为 integer
create table if not exists public.crm_sample_order_item (
  id integer generated by default as identity primary key,
  sample_order_id integer not null references public.crm_sample_order(id) on delete cascade,
  product_id integer references public.ba_cpinfo(id),
  product_name text,
  material_no text,
  quantity numeric(18,4) default 0,
  tax_type text,
  tax_rate numeric(8,4) default 0,
  tax_included_price numeric(18,4) default 0,
  tax_excluded_price numeric(18,4) default 0,
  tax_included_amount numeric(18,2) default 0,
  tax_excluded_amount numeric(18,2) default 0,
  tax_amount numeric(18,2) default 0,
  sample_no text,
  material_name text,
  unit_price numeric(18,4) default 0,
  line_total numeric(18,2) default 0,
  customer_material_no text,
  customer_material_name text,
  customer_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_sample_order_item_id_unsigned check (id > 0)
);

-- crm_return_order - 修改 id 为 integer
create table if not exists public.crm_return_order (
  id integer generated by default as identity primary key,
  return_no text,
  order_no text,
  original_order_no text,
  customer_id integer references public.ba_manucustinfo(id),
  customer_name text,
  reason text,
  handler text,
  sales_rep text,
  merchandiser text,
  project_id integer references public.crm_project(id),
  project_name text,
  status text,
  audit_status text,
  tax_included_total_amount numeric(18,2) default 0,
  tax_excluded_total_amount numeric(18,2) default 0,
  after_sale_no text,
  after_sale_qty numeric(18,4) not null default 0,
  after_sale_type integer not null default 1,
  after_sale_reason text,
  after_sale_status integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_return_order_id_unsigned check (id > 0),
  constraint chk_crm_return_order_after_sale_type check (after_sale_type in (1,2,3)),
  constraint chk_crm_return_order_after_sale_status check (after_sale_status in (0,1,2,3,4))
);

-- crm_return_order_item - 修改 id 为 integer
create table if not exists public.crm_return_order_item (
  id integer generated by default as identity primary key,
  return_order_id integer not null references public.crm_return_order(id) on delete cascade,
  product_id integer references public.ba_cpinfo(id),
  product_name text,
  material_no text,
  quantity numeric(18,4) default 0,
  tax_type text,
  tax_rate numeric(8,4) default 0,
  tax_included_price numeric(18,4) default 0,
  tax_excluded_price numeric(18,4) default 0,
  tax_included_amount numeric(18,2) default 0,
  tax_excluded_amount numeric(18,2) default 0,
  tax_amount numeric(18,2) default 0,
  order_no text,
  return_no text,
  material_id text,
  material_name text,
  expected_after_sale_method text,
  after_sale_reason text,
  after_sale_material_image text,
  issue_description text,
  return_tracking_no text,
  final_handling_method text,
  return_qty numeric(18,4),
  return_method text,
  after_sale_order_id integer references public.crm_return_order(id) on delete set null,
  after_sale_no text,
  material_qty numeric(18,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_crm_return_order_item_id_unsigned check (id > 0)
);

-- 新增采购报价单表
create table if not exists public.crm_purchase_quotation (
  id integer generated by default as identity primary key,
  purchase_quote_no text not null,
  project_id integer references public.crm_project(id) on delete set null,
  quote_time timestamptz,
  supplier text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now(),
  customer_name text,
  customer_id integer references public.ba_manucustinfo(id) on delete set null,
  valid_until date,
  constraint chk_crm_purchase_quotation_id_unsigned check (id > 0)
);

create table if not exists public.crm_purchase_quotation_item (
  id integer generated by default as identity primary key,
  material_no text,
  material_desc text,
  tax_included_unit_price numeric(18,4) not null default 0,
  tax_excluded_unit_price numeric(18,4) not null default 0,
  sample_price numeric(18,4) not null default 0,
  unit text,
  lead_time text,
  moq numeric(18,4),
  mpq numeric(18,4),
  remark text,
  drawing text,
  purchase_quotation_id integer not null references public.crm_purchase_quotation(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now(),
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint chk_crm_purchase_quotation_item_id_unsigned check (id > 0)
);

drop trigger if exists trigger_set_inquiry_no on public.crm_inquiry;
create trigger trigger_set_inquiry_no
before insert on public.crm_inquiry
for each row
execute function public.set_inquiry_no();

drop trigger if exists trigger_set_lead_no on public.crm_lead;
create trigger trigger_set_lead_no
before insert on public.crm_lead
for each row
execute function public.set_lead_no();

drop trigger if exists trigger_set_opportunity_no on public.crm_opportunity;
create trigger trigger_set_opportunity_no
before insert on public.crm_opportunity
for each row
execute function public.set_opportunity_no();

drop trigger if exists trigger_set_project_no on public.crm_project;
create trigger trigger_set_project_no
before insert on public.crm_project
for each row
execute function public.set_project_no();

drop trigger if exists trigger_set_quote_no on public.crm_quotation;
create trigger trigger_set_quote_no
before insert on public.crm_quotation
for each row
execute function public.set_quote_no();

drop trigger if exists trigger_set_sales_order_no on public.crm_sales_order;
create trigger trigger_set_sales_order_no
before insert on public.crm_sales_order
for each row
execute function public.set_sales_order_no();

drop trigger if exists trigger_set_sample_no on public.crm_sample_order;
create trigger trigger_set_sample_no
before insert on public.crm_sample_order
for each row
execute function public.set_sample_no();

drop trigger if exists trigger_set_return_no on public.crm_return_order;
create trigger trigger_set_return_no
before insert on public.crm_return_order
for each row
execute function public.set_return_no();

drop trigger if exists trigger_set_purchase_quote_no on public.crm_purchase_quotation;
create trigger trigger_set_purchase_quote_no
before insert on public.crm_purchase_quotation
for each row
execute function public.set_purchase_quote_no();

-- ========= ONTOLOGY / CONFIG =========
create table if not exists public.crm_ontology_object (
  id text primary key,
  name text not null,
  code text not null unique,
  description text,
  system_link text,
  is_sub_table boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_ontology_property (
  id text primary key,
  object_code text not null references public.crm_ontology_object(code) on delete cascade,
  name text not null,
  code text not null,
  type text,
  required boolean default false,
  options_json jsonb default '[]'::jsonb
);

create table if not exists public.crm_ontology_relation (
  id text primary key,
  object_code text not null references public.crm_ontology_object(code) on delete cascade,
  target_object_code text not null,
  relation_type text,
  description text
);

create table if not exists public.crm_ontology_flow (
  id text primary key,
  object_code text not null references public.crm_ontology_object(code) on delete cascade,
  name text not null,
  description text,
  trigger_type text,
  trigger_condition text,
  trigger_frequency text
);

create table if not exists public.crm_ontology_node (
  id text primary key,
  flow_id text not null references public.crm_ontology_flow(id) on delete cascade,
  name text,
  description text,
  type text,
  config_json jsonb default '{}'::jsonb
);

create table if not exists public.crm_ontology_flow_draft (
  id text primary key,
  object_code text not null references public.crm_ontology_object(code) on delete cascade,
  name text not null,
  description text,
  trigger_type text,
  trigger_condition text,
  trigger_frequency text
);

create table if not exists public.crm_ontology_node_draft (
  id text primary key,
  flow_id text not null references public.crm_ontology_flow_draft(id) on delete cascade,
  name text,
  description text,
  type text,
  config_json jsonb default '{}'::jsonb
);

create table if not exists public.crm_ontology_flow_publish_history (
  id uuid primary key default gen_random_uuid(),
  object_code text not null references public.crm_ontology_object(code) on delete cascade,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_system_config (
  id text primary key,
  name text,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_potential_customer (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========= INDEXES =========
create index if not exists idx_ba_manucustinfo_name on public.ba_manucustinfo(name);
create index if not exists idx_ba_manucustinfo_customer_number on public.ba_manucustinfo(customer_number);
create index if not exists idx_ba_customer_user_customer_id on public.ba_customer_user(customer_id);
create index if not exists idx_crm_customer_contact_customer on public.crm_customer_contact(customer_id);
create index if not exists idx_crm_customer_contact_wechat_id on public.crm_customer_contact(wechat_id);
create index if not exists idx_crm_customer_persona_customer on public.crm_customer_persona(customer_id);
create index if not exists idx_crm_inquiry_customer on public.crm_inquiry(customer_id);
create index if not exists idx_crm_lead_customer on public.crm_lead(customer_id);
create index if not exists idx_crm_opportunity_customer on public.crm_opportunity(customer_id);
create index if not exists idx_crm_project_customer on public.crm_project(customer_id);
create index if not exists idx_crm_task_module on public.crm_task(module);
create index if not exists idx_crm_customer_competitor_customer on public.crm_customer_competitor(customer_id);
create index if not exists idx_crm_focus_swot_customer on public.crm_customer_focus_swot(customer_id);
create index if not exists idx_crm_focus_competitor_focus on public.crm_customer_focus_competitor(focus_id);
create index if not exists idx_crm_stakeholder_assessment_customer on public.crm_stakeholder_assessment(customer_id);
create index if not exists idx_crm_stakeholder_assessment_stakeholder on public.crm_stakeholder_assessment(stakeholder_id, assessment_date desc);
create index if not exists idx_crm_potential_customer_name on public.crm_potential_customer(name);

-- 新表索引
create index if not exists idx_ba_brand_status on public.ba_brand(status);
create index if not exists idx_ba_product_line_parent_id on public.ba_product_line(parent_id);
create index if not exists idx_public_property_value_property_id on public.public_property_value(property_id);
create index if not exists idx_ba_product_property_relation_product_id on public.ba_product_property_relation(product_id);
create index if not exists idx_ba_product_property_relation_category_id on public.ba_product_property_relation(category_id);
create index if not exists idx_ba_spu_brand_id on public.ba_spu(brand_id);
create index if not exists idx_ba_spu_category_id on public.ba_spu(category_id);

-- ba_cpinfo 索引
create index if not exists idx_ba_cpinfo_category_id on public.ba_cpinfo(category_id);
create index if not exists idx_ba_cpinfo_brand_id on public.ba_cpinfo(brand_id);
create index if not exists idx_ba_cpinfo_product_line_level1_id on public.ba_cpinfo(product_line_level1_id);
create index if not exists idx_ba_cpinfo_product_line_level2_id on public.ba_cpinfo(product_line_level2_id);
create index if not exists idx_ba_cpinfo_group_id on public.ba_cpinfo(group_id);
create index if not exists idx_ba_cpinfo_spu_id on public.ba_cpinfo(spu_id);
create index if not exists idx_ba_cpinfo_status on public.ba_cpinfo(status);
create index if not exists idx_ba_cpinfo_material_no on public.ba_cpinfo(material_no);

-- crm_product_series 索引
create index if not exists idx_crm_product_series_category_id on public.crm_product_series(category_id);

-- crm_inquiry 索引
create index if not exists idx_crm_inquiry_customer_id on public.crm_inquiry(customer_id);

-- crm_lead 索引
create index if not exists idx_crm_lead_customer_id on public.crm_lead(customer_id);

-- crm_opportunity 索引
create index if not exists idx_crm_opportunity_customer_id on public.crm_opportunity(customer_id);

-- crm_project 索引
create index if not exists idx_crm_project_customer_id on public.crm_project(customer_id);

-- crm_quotation 索引
create index if not exists idx_crm_quotation_customer_id on public.crm_quotation(customer_id);
create index if not exists idx_crm_quotation_project_id on public.crm_quotation(project_id);
create index if not exists idx_crm_quotation_item_quotation_id on public.crm_quotation_item(quotation_id);

-- crm_sample_order 索引
create index if not exists idx_crm_sample_order_sample_no on public.crm_sample_order(sample_no);
create index if not exists idx_crm_sample_order_status on public.crm_sample_order(status);
create index if not exists idx_crm_sample_order_customer_id on public.crm_sample_order(customer_id);
create index if not exists idx_crm_sample_order_item_sample_order_id on public.crm_sample_order_item(sample_order_id);
create index if not exists idx_crm_sample_order_item_sample_no on public.crm_sample_order_item(sample_no);

-- crm_return_order 索引
create index if not exists idx_crm_return_order_after_sale_no on public.crm_return_order(after_sale_no);
create index if not exists idx_crm_return_order_after_sale_status on public.crm_return_order(after_sale_status);
create index if not exists idx_crm_return_order_item_after_sale_order_id on public.crm_return_order_item(after_sale_order_id);

-- crm_purchase_quotation 索引
create index if not exists idx_crm_purchase_quotation_project_id on public.crm_purchase_quotation(project_id);
create index if not exists idx_crm_purchase_quotation_customer_id on public.crm_purchase_quotation(customer_id);
create index if not exists idx_crm_purchase_quotation_item_purchase_id on public.crm_purchase_quotation_item(purchase_quotation_id);

create unique index if not exists uq_crm_inquiry_inquiry_no on public.crm_inquiry(inquiry_no);
create unique index if not exists uq_crm_lead_lead_no on public.crm_lead(lead_no);
create unique index if not exists uq_crm_opportunity_opportunity_no on public.crm_opportunity(opportunity_no);
create unique index if not exists uq_crm_project_project_no on public.crm_project(project_no);
create unique index if not exists uq_crm_quotation_quote_no on public.crm_quotation(quote_no);
create unique index if not exists uq_crm_sales_order_order_no on public.crm_sales_order(order_no);
create unique index if not exists uq_crm_sample_order_sample_no on public.crm_sample_order(sample_no);
create unique index if not exists uq_crm_return_order_return_no on public.crm_return_order(return_no);
create unique index if not exists uq_crm_purchase_quotation_purchase_quote_no on public.crm_purchase_quotation(purchase_quote_no);

-- ========= COMMON TRIGGER =========
create or replace function app_meta.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_meta.attach_updated_at_trigger(target_table text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists trg_set_updated_at on public.%I', target_table);
  execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function app_meta.set_updated_at()', target_table);
end;
$$;

do $$
declare
  t text;
  updated_tables text[] := array[
    'ba_employeeinfo','ba_cptype','crm_product_series','ba_cpinfo','ba_manucustinfo','ba_customer_user',
    'crm_customer_contact','crm_customer_persona','crm_inquiry','crm_lead','crm_opportunity','crm_project',
    'crm_task_type','crm_task','crm_competitor','crm_customer_competitor','crm_customer_focus_swot',
    'crm_customer_focus_competitor','crm_customer_follow_strategy_config','crm_customer_faq_library_config','crm_quotation','crm_quotation_item',
    'crm_sales_order','crm_sales_order_item','crm_sample_order','crm_sample_order_item',
    'crm_return_order','crm_return_order_item','crm_ontology_object','crm_system_config','crm_potential_customer',
    'ba_brand','ba_group','ba_product_line','public_property_name','public_property_value','ba_product_property_relation','ba_spu',
    'crm_purchase_quotation','crm_purchase_quotation_item'
  ];
begin
  foreach t in array updated_tables loop
    perform app_meta.attach_updated_at_trigger(t);
  end loop;
end
$$;

-- ========= OPEN RLS POLICIES (anon + authenticated) =========
create or replace function app_meta.apply_open_policies(target_table text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', target_table);
  execute format('drop policy if exists p_open_read on public.%I', target_table);
  execute format('drop policy if exists p_open_insert on public.%I', target_table);
  execute format('drop policy if exists p_open_update on public.%I', target_table);
  execute format('drop policy if exists p_open_delete on public.%I', target_table);
  execute format('create policy p_open_read on public.%I for select to anon, authenticated using (true)', target_table);
  execute format('create policy p_open_insert on public.%I for insert to anon, authenticated with check (true)', target_table);
  execute format('create policy p_open_update on public.%I for update to anon, authenticated using (true) with check (true)', target_table);
  execute format('create policy p_open_delete on public.%I for delete to anon, authenticated using (true)', target_table);
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
  loop
    perform app_meta.apply_open_policies(r.tablename);
  end loop;
end
$$;

-- ========= IDENTITY SEQUENCE RESYNC =========
do $$
declare
  t text;
  id_tables text[] := array[
    'crm_quotation','crm_quotation_item',
    'crm_sales_order','crm_sales_order_item',
    'crm_sample_order','crm_sample_order_item',
    'crm_return_order','crm_return_order_item',
    'crm_purchase_quotation','crm_purchase_quotation_item'
  ];
begin
  foreach t in array id_tables loop
    execute format(
      'select setval(pg_get_serial_sequence(''public.%I'',''id''), coalesce((select max(id) from public.%I), 0) + 1, false)',
      t, t
    );
  end loop;
end
$$;

commit;
