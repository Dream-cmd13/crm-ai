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

-- 部门表（与 okr-ai 共用）
create table if not exists public.departments (
  id text primary key,                              -- 部门ID（主键）
  name text not null,                               -- 部门名称
  manager_name text,                                -- 部门主管姓名
  responsibilities text,                            -- 部门职责描述
  roles jsonb,                                      -- 部门角色列表（JSON数组）
  role_members jsonb,                               -- 角色成员映射（JSON对象）
  attributes text,                                  -- 部门属性
  sub_departments jsonb,                            -- 子部门列表（JSON数组）
  parent_id text,                                   -- 父部门ID（兼容 wanlian pid 树）
  type smallint default 0,                          -- 类型（0=部门 1=办事处）
  okrs jsonb,                                       -- OKR目标（JSON）
  reviews jsonb,                                    -- 复盘记录（JSON）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 品牌表
create table if not exists public.ba_brand (
  id serial not null primary key,                   -- 品牌ID（自增主键）
  name text not null,                               -- 品牌名称
  status integer not null default 1,                -- 状态（1=正常 0=禁用）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 归属小组表
create table if not exists public.ba_group (
  id serial not null primary key,                   -- 小组ID（自增主键）
  name text not null,                               -- 小组名称
  manager text,                                     -- 小组负责人
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 产品线表（树形结构）
create table if not exists public.ba_product_line (
  id serial not null primary key,                   -- 产品线ID（自增主键）
  parent_id integer references public.ba_product_line(id), -- 父产品线ID（树形结构）
  name text not null,                               -- 产品线名称
  manager text,                                     -- 产品线负责人
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 产品公共属性名称表（如接口类型、额定电流等）
create table if not exists public.public_property_name (
  id serial not null primary key,                   -- 属性名称ID（自增主键）
  specification_name text not null,                 -- 规格属性名称（如接口类型、额定电流）
  group_name text,                                  -- 属性分组名称（如基本属性、电气属性）
  image text,                                       -- 属性示意图（URL）
  is_searchable int not null default 1,             -- 是否可搜索（1=是 0=否）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 产品公共属性值表（如接口类型下的8Pin、12Pin）
create table if not exists public.public_property_value (
  id serial not null primary key,                   -- 属性值ID（自增主键）
  property_id int not null,                         -- 关联的属性名称ID
  property_value text not null,                     -- 属性值（如8Pin、10A）
  property_value_image text,                        -- 属性值示意图（URL）
  public_property_name text not null,               -- 冗余属性名称（如接口类型）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now(),    -- 更新时间
  foreign key (property_id) references public.public_property_name(id)
);

create table if not exists public.ba_cptype (
  id serial not null primary key,                   -- 品类ID（自增主键）
  parent_id integer references public.ba_cptype(id), -- 父品类ID（树形结构）
  name text not null,                               -- 品类名称
  image text,                                       -- 品类图片（URL）
  fab_features text not null default '',            -- FAB特性（Features 产品特征）
  fab_advantages text not null default '',          -- FAB优势（Advantages 对比优势）
  fab_benefits text not null default '',            -- FAB利益（Benefits 客户利益）
  status integer not null default 1,                -- 状态（1=正常 0=禁用）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 产品系列表
create table if not exists public.crm_product_series (
  id integer generated by default as identity primary key, -- 产品系列ID（自增主键）
  series_no text not null default '',               -- 产品系列编号
  name text not null,                               -- 产品系列名称
  category_id integer references public.ba_cptype(id) on delete set null, -- 所属品类ID
  description text not null default '',             -- 产品系列描述
  fab_features text not null default '',            -- FAB特性（Features）
  fab_advantages text not null default '',          -- FAB优势（Advantages）
  fab_benefits text not null default '',            -- FAB利益（Benefits）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now(),    -- 更新时间
  constraint chk_crm_product_series_id_unsigned check (id > 0)
);

-- SPU表（标准产品单元）
create table if not exists public.ba_spu (
  id serial primary key,                            -- SPU ID（自增主键）
  name text not null,                               -- SPU名称
  brand_id integer references public.ba_brand(id),  -- 品牌ID
  category_id integer references public.ba_cptype(id), -- 品类ID
  category_name text,                               -- 品类名称（冗余）
  product_no text,                                  -- 产品编号
  industry text,                                    -- 所属行业
  eco_property text,                                -- 环保性质
  certification_standard text,                      -- 认证标准
  product_drawings jsonb not null default '[]'::jsonb, -- 产品图纸（附件数组）
  product_image text,                               -- 产品主图（URL或dataURL）
  packaging_method text,                            -- 包装方式
  min_order_qty numeric(18,2),                      -- 最小起订量
  status integer not null default 1,                -- 状态（0下架 1正常 10违规）
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ba_spu' and column_name = 'product_no'
  ) then
    create unique index if not exists idx_ba_spu_product_no_unique
      on public.ba_spu (product_no)
      where product_no is not null and product_no <> '';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ba_spu' and column_name = 'status'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'chk_ba_spu_status'
      and conrelid = 'public.ba_spu'::regclass
  ) then
    alter table public.ba_spu
      add constraint chk_ba_spu_status
      check (status in (0, 1, 10));
  end if;
end
$$;

-- 产品物料表（基础信息，含图纸/供应商/包装等完整字段）
create table if not exists public.ba_cpinfo (
  id serial not null primary key,                   -- 物料ID（自增主键）
  category_id integer references public.ba_cptype(id), -- 产品品类ID
  category_name text,                               -- 产品品类名称（冗余）
  material_no text not null,                        -- 物料编号（料号）
  material_name text not null,                      -- 物料名称
  specification text,                               -- 规格描述
  unit text not null,                               -- 计量单位（如pcs、m）
  price numeric(18,2) not null default 0,           -- 销售价
  min_price numeric(18,2),                          -- 最低销售价
  status integer not null default 1,                -- 状态（1=正常 0=禁用）
  brand_id integer references public.ba_brand(id),  -- 品牌ID
  brand_name text,                                  -- 品牌名称（冗余）
  min_pack_qty numeric(18,2) default 0,             -- 最小包装数量（MPQ）
  min_order_qty numeric(18,2) default 0,            -- 最小起订量（MOQ）
  outsource_supplier_drawing text,                  -- 外协供应商图纸
  drawing_3d text,                                  -- 3D图纸
  supplier text,                                    -- 供应商名称
  supplier_no text,                                 -- 供应商编号
  supplier_material_no text,                        -- 供应商物料编号
  supplier_material_name text,                      -- 供应商物料名称
  product_line_level1_id integer references public.ba_product_line(id), -- 一级产品线ID
  product_line_level2_id integer references public.ba_product_line(id), -- 二级产品线ID
  product_belonging integer default -1,             -- 产品归属标识（-1=未指定）
  group_id integer references public.ba_group(id),  -- 归属销售小组ID
  group_name text,                                  -- 归属销售小组名称（冗余）
  outsource_customer_drawing text,                  -- 外协客户图纸
  customer_original_drawing text,                   -- 客户原始图纸
  change_drawing_detail text,                       -- 图纸变更详情
  specification_doc text,                           -- 规格书文件
  inspection_standard text,                         -- 检验标准
  spu_id integer references public.ba_spu(id),      -- SPU ID
  spu_name text,                                    -- SPU名称（冗余）
  platform_material_no text,                        -- 平台物料编号
  material_lead_time integer,                       -- 物料交期（天数）
  packaging_method text,                            -- 包装方式
  packaging_spec text,                              -- 包装规格
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 产品与公共属性关联关系表
create table if not exists public.ba_product_property_relation (
  id serial not null primary key,                     -- 关联ID（自增主键）
  material_id text not null,                          -- 物料编号（冗余料号）
  product_id int references public.ba_cpinfo(id),     -- 产品（物料）ID
  spu_status int not null default 1,                  -- SPU状态（1=正常）
  product_status int not null default 1,              -- 产品状态（1=正常）
  product_name text not null,                         -- 产品名称（冗余）
  property_id int,                                    -- 属性名称ID
  property_name text,                                 -- 属性名称（冗余）
  property_value text,                                -- 属性值
  property_value_id int,                              -- 属性值ID
  category_id int references public.ba_cptype(id),    -- 品类ID
  category_name text,                                 -- 品类名称（冗余）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户主数据表（客户公司基本信息）
create table if not exists public.ba_manucustinfo (
  id serial primary key,                              -- 客户ID（自增主键）
  customer_number text not null,                      -- 客户编号（格式KH+YYYYMMDD+6位序号）
  potential_customer_id text,                         -- 潜在客户ID（转为正式客户前的临时标识）
  name text not null,                                 -- 客户公司名称
  level text not null default '普通客户',                 -- 客户等级（战略客户/成长型客户/普通客户/潜在客户）
  status integer not null default 1,                  -- 客户状态（1=活跃 2=休眠 3=流失）
  industry text,                                      -- 所属行业
  source integer,                                     -- 客户来源（1=展会收集 2=朋友介绍 3=网络推广 4=客户转介绍 5=个人观察 6=网上搜索 7=电商平台）
  region integer,                                     -- 所属区域（1=东北 2=华北 3=西北 4=华东 5=华南 6=西南 7=港澳台 8=国外 9=华中）
  sales_rep text,                                     -- 销售负责人（用户ID）
  payment_term integer,                               -- 账期天数（3=30天 6=60天 9=90天 12=120天）
  has_payment_term integer default 0,                 -- 是否有账期（1=有 0=无）
  customer_type integer,                              -- 客户类型（0=普通企业 1=认证企业 2=个人）
  merchandiser text,                                  -- 跟单员姓名
  merchandiser_id text,                               -- 跟单员ID
  is_public_pool boolean default false,               -- 是否公海客户
  month_settlement_apply_status integer default 0,    -- 月结申请状态（0=未申请）
  business_manager text,                              -- 商务负责人
  currency text,                                      -- 交易币种（如CNY、USD）
  currency_id integer,                                -- 币种ID
  customer_category integer default 0,                -- 客户分类（0=默认）
  group_name text,                                    -- 归属小组名称
  is_listed_company boolean default false,            -- 是否上市公司
  short_name text,                                    -- 公司简称
  english_name text,                                  -- 公司英文名称
  insured_count integer,                              -- 参保人数
  paid_in_capital text,                               -- 实缴资本
  last_visit_date date,                               -- 最近拜访日期
  last_contact_time timestamptz,                      -- 最近联系时间
  last_contact_action text,                           -- 最近联系动作
  legal_person text,                                  -- 法定代表人
  registered_capital text,                            -- 注册资本
  industry_level_1 text,                              -- 一级行业分类
  industry_level_2 text,                              -- 二级行业分类
  industry_level_3 text,                              -- 三级行业分类
  employee_count text,                                -- 员工人数
  establishment_date date,                            -- 成立日期
  unified_social_credit_code text,                    -- 统一社会信用代码
  company_address text,                               -- 公司地址
  company_type text,                                  -- 公司类型（如股份有限公司、有限责任公司）
  fax_number text,                                    -- 传真号码
  month_settlement_attachment text,                   -- 月结合同附件
  month_settlement_agreement text,                    -- 月结协议
  business_scope text,                                -- 经营范围
  website text,                                       -- 公司网址
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ba_manucustinfo' and column_name = 'potential_customer_id'
  ) then
    create index if not exists idx_ba_manucustinfo_potential_customer_id
      on public.ba_manucustinfo(potential_customer_id);
  end if;
end
$$;

-- 用户表
create table if not exists public.ba_customer_user (
  id serial not null primary key,                     -- 主键
  customer_id integer not null references public.ba_manucustinfo(id),  -- 客户ID
  member_name text not null,                          -- 会员名称
  contact_name text,                                  -- 联系人
  phone text,                                         -- 手机号
  email text,                                         -- 邮箱
  is_primary integer not null default 0,              -- 是否首联系人（0否，1是）
  status integer not null default 1,                  -- 账户状态（1正常，0冻结）
  source integer not null,                            -- 账户来源（1线上，2后台，3公众号注册，4短信推广注册，5微信小程序）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


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
  where customer_number ~ ('^KH' || today_str || '[0-9]{6}$');

  return 'KH' || today_str || lpad((current_max + 1)::text, 6, '0');
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
  date_str text;
  current_max integer;
  sql_text text;
begin
  date_str := to_char(current_date, 'YYMMDD');
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
    '^' || prefix || '[0-9]{6}[0-9]{' || pad_len::text || '}$'
  );

  execute sql_text into current_max;
  return prefix || date_str || lpad((current_max + 1)::text, pad_len, '0');
end;
$$;

create or replace function public.generate_business_number(prefix text, table_name text, pad_len integer default 4)
returns text
language plpgsql
as $$
declare
  guessed_column text;
begin
  guessed_column := case table_name
    when 'crm_inquiry' then 'inquiry_no'
    when 'crm_lead' then 'lead_no'
    when 'crm_opportunity' then 'opportunity_no'
    when 'crm_project' then 'project_no'
    when 'crm_quotation' then 'quote_no'
    when 'crm_sales_order' then 'order_no'
    when 'crm_sample_order' then 'sample_no'
    when 'crm_return_order' then 'return_no'
    when 'crm_purchase_quotation' then 'purchase_quote_no'
    else 'id'
  end;
  return public.generate_business_number(prefix, table_name, guessed_column, pad_len);
end;
$$;

drop function if exists public.set_inquiry_no() cascade;
create or replace function public.set_inquiry_no()
returns trigger
language plpgsql
as $$
begin
  if new.inquiry_no is null or btrim(new.inquiry_no) = '' then
    new.inquiry_no := public.generate_business_number('XJ', 'crm_inquiry', 'inquiry_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_lead_no() cascade;
create or replace function public.set_lead_no()
returns trigger
language plpgsql
as $$
begin
  if new.lead_no is null or btrim(new.lead_no) = '' then
    new.lead_no := public.generate_business_number('XS', 'crm_lead', 'lead_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_opportunity_no() cascade;
create or replace function public.set_opportunity_no()
returns trigger
language plpgsql
as $$
begin
  if new.opportunity_no is null or btrim(new.opportunity_no) = '' then
    new.opportunity_no := public.generate_business_number('JH', 'crm_opportunity', 'opportunity_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_project_no() cascade;
create or replace function public.set_project_no()
returns trigger
language plpgsql
as $$
begin
  if new.project_no is null or btrim(new.project_no) = '' then
    new.project_no := public.generate_business_number('XM', 'crm_project', 'project_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_quote_no() cascade;
create or replace function public.set_quote_no()
returns trigger
language plpgsql
as $$
begin
  if new.quote_no is null or btrim(new.quote_no) = '' then
    new.quote_no := public.generate_business_number('BJ', 'crm_quotation', 'quote_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_sales_order_no() cascade;
create or replace function public.set_sales_order_no()
returns trigger
language plpgsql
as $$
begin
  if new.order_no is null or btrim(new.order_no) = '' then
    new.order_no := public.generate_business_number('DD', 'crm_sales_order', 'order_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_sample_no() cascade;
create or replace function public.set_sample_no()
returns trigger
language plpgsql
as $$
begin
  if new.sample_no is null or btrim(new.sample_no) = '' then
    new.sample_no := public.generate_business_number('YP', 'crm_sample_order', 'sample_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_return_no() cascade;
create or replace function public.set_return_no()
returns trigger
language plpgsql
as $$
begin
  if new.return_no is null or btrim(new.return_no) = '' then
    new.return_no := public.generate_business_number('TH', 'crm_return_order', 'return_no', 4);
  end if;
  return new;
end;
$$;

drop function if exists public.set_purchase_quote_no() cascade;
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

-- 客户联系人表
create table if not exists public.crm_customer_contact (
  id text primary key,                                -- 联系人ID（主键）
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 所属客户ID
  name text not null,                                 -- 联系人姓名
  position text,                                      -- 职位
  department text,                                    -- 所在部门
  phone text,                                         -- 手机号
  email text,                                         -- 邮箱
  is_primary boolean default false,                   -- 是否首要联系人
  buying_role text,                                   -- 采购角色（经济买家/技术买家/使用者/Coach等）
  buying_mode text,                                   -- 采购模式（竞争性招标/技术先行/指定供应商等）
  appellation text,                                   -- 称呼（如王总、李工）
  wechat_id text,                                     -- 联系人微信ID（系统自动回填）
  wechat_name text,                                   -- 联系人微信昵称（人工预设，用于匹配）
  manager_contact_id text references public.crm_customer_contact(id) on delete set null,  -- 上级联系人ID
  faction text not null default '',                   -- 所属派系（如总部派、技术线）
  attitude_to_us text not null default '中性评价',        -- 对我方态度（正面评价/中性评价/负面评价）
  attitude_score int not null default 0,              -- 态度评分（-1负面 0中性 1正面）
  role_tag text not null default 'I',                 -- 决策角色标签（A=Approver审批 D=Decision决策 S=Support支持 E=Expert技术 I=Influencer影响者）
  influence_level int not null default 3,             -- 影响力等级（1-5，5最高）
  relation_level int not null default 2,              -- 关系等级（1-5，5最亲密）
  graduation_school text not null default '',         -- 毕业院校
  hometown text not null default '',                  -- 籍贯/家乡
  hobbies text[] not null default '{}',               -- 兴趣爱好（数组）
  family_situation text not null default '',          -- 家庭情况
  personality text not null default '',               -- 性格特征描述
  preferences text not null default '',               -- 沟通偏好
  key_concerns text not null default '',              -- 核心关注点
  follow_strategy text not null default '',           -- 跟进策略
  video_channel_profile text not null default '',     -- 视频号画像
  douyin_profile text not null default '',            -- 抖音画像
  xiaohongshu_profile text not null default '',       -- 小红书画像
  social_media_behavior text not null default '',     -- 社媒行为特征总结
  gender text,                                        -- 性别
  office_phone text,                                  -- 办公电话
  fax_number text,                                    -- 传真号码
  is_employed boolean,                                -- 是否在职
  marital_status text,                                -- 婚姻状况
  birth_date date,                                    -- 出生日期
  highest_education text,                             -- 最高学历
  native_place text,                                  -- 籍贯
  religion text,                                      -- 宗教信仰
  entry_date date,                                    -- 入职日期
  is_key_person boolean,                              -- 是否关键人物
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户画像表
create table if not exists public.crm_customer_persona (
  id text primary key,                                -- 画像ID（主键）
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 所属客户ID
  scale text,                                         -- 客户规模
  main_products text,                                 -- 主要产品
  org_structure text,                                 -- 组织架构
  buying_mode text,                                   -- 采购模式
  pain_points text,                                   -- 痛点
  competitive_supplier text,                          -- 竞争对手供应商
  competitive_preference text,                        -- 对竞品的偏好
  unique_needs text,                                  -- 独特需求
  rd_requirements text,                               -- 研发需求
  sample_requirements text,                           -- 打样需求
  production_requirements text,                       -- 量产需求
  last_updated date,                                  -- 最近更新日期
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- ========= CORE PIPELINE =========
-- 询盘表（销售管道第一阶段）
create table if not exists public.crm_inquiry (
  id integer generated by default as identity primary key,  -- 询盘ID（自增主键）
  inquiry_no text not null default '',                -- 询盘编号（格式XJ+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  company_name text not null,                         -- 客户公司名称
  customer_name text,                                 -- 联系人姓名
  contact text,                                       -- 联系方式
  source_channel public.crm_inquiry_source_channel_enum,  -- 来源渠道（万连/电子谷/1688等）
  category text,                                      -- 品类
  product_series text not null default '',            -- 产品系列
  province text,                                      -- 省份
  situation text,                                     -- 询盘情况描述
  status public.crm_inquiry_status_enum not null default '待处理',  -- 状态（待处理/已转线索/关闭）
  classification text,                                -- 分类
  unconvert_reason text,                              -- 未转化原因
  customer_inquiry text,                              -- 客户询盘内容
  unconverted_time date,                              -- 未转化时间
  notes text,                                         -- 备注
  associated_lead text,                               -- 关联线索
  attachments jsonb,                                  -- 附件列表（JSON数组）
  create_date date not null default current_date,     -- 创建日期
  update_date date,                                   -- 更新日期
  creator_id text,                                    -- 创建人ID
  creator_name text,                                  -- 创建人姓名
  updater text,                                       -- 更新人
  classification_product_line integer,                -- 分类产品线（1-7整型编码）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_inquiry_id_unsigned check (id > 0)
);


do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'crm_inquiry' and column_name = 'classification_product_line'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'chk_crm_inquiry_classification_product_line'
      and conrelid = 'public.crm_inquiry'::regclass
  ) then
    alter table public.crm_inquiry
      add constraint chk_crm_inquiry_classification_product_line
      check (
        classification_product_line is null
        or classification_product_line in (1, 2, 3, 4, 5, 6, 7)
      );
  end if;
end
$$;

-- 线索表（销售管道第二阶段）
create table if not exists public.crm_lead (
  id integer generated by default as identity primary key,  -- 线索ID（自增主键）
  lead_no text not null default '',                   -- 线索编号（格式XS+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_type text,                                 -- 客户类型
  customer_name text not null,                        -- 客户公司名称
  name text,                                          -- 联系人姓名
  phone text,                                         -- 联系电话
  customer_action public.crm_lead_customer_action_enum,  -- 客户动作（寻替代料/寻替代品/找货寻料/指定料号/指定物料）
  industry text,                                      -- 行业
  status public.crm_lead_status_enum not null default '未跟进',  -- 线索状态（未跟进/跟进中/关闭/转商机）
  classification text,                                -- 线索分类
  assignee text,                                      -- 负责人
  entry_time text,                                    -- 录入时间
  source_channel public.crm_inquiry_source_channel_enum,  -- 来源渠道
  source_type public.crm_lead_source_type_enum,       -- 来源类型（企业微信/注册/在线/微信/邮件/电话/其他）
  product_category text,                              -- 产品品类
  product_series text,                                -- 产品系列
  source_status public.crm_lead_source_status_enum,   -- 线索来源状态（客服/自己开发）
  inquiry_id integer references public.crm_inquiry(id),  -- 来源询盘ID
  contact_id text references public.crm_customer_contact(id),  -- 关联联系人ID
  intent_score numeric(10,2),                         -- 意向评分（0-100）
  buying_mode text,                                   -- 采购模式
  buyer_role text,                                    -- 采购角色
  product_industry public.crm_lead_product_industry_enum,  -- 产品行业（基础接插件/新能源/线束/定制/胜蓝/胜蓝电气/工业）
  close_time date,                                    -- 关闭时间
  close_reason text,                                  -- 关闭原因
  customer_opportunity text,                          -- 客户商机描述
  attachments jsonb,                                  -- 附件列表（JSON数组）
  create_date date not null default current_date,     -- 创建日期
  creator_id text,                                    -- 创建人ID
  creator_name text,                                  -- 创建人姓名
  classification_product_line integer,                -- 分类产品线（1-7整型编码）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_lead_id_unsigned check (id > 0)
);


do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'crm_lead' and column_name = 'classification_product_line'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'chk_crm_lead_classification_product_line'
      and conrelid = 'public.crm_lead'::regclass
  ) then
    alter table public.crm_lead
      add constraint chk_crm_lead_classification_product_line
      check (
        classification_product_line is null
        or classification_product_line in (1, 2, 3, 4, 5, 6, 7)
      );
  end if;
end
$$;

-- 商机表（销售管道第三阶段）
create table if not exists public.crm_opportunity (
  id integer generated by default as identity primary key,  -- 商机ID（自增主键）
  opportunity_no text not null default '',            -- 商机编号（格式JH+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_type text,                                 -- 客户类型
  customer_name text not null,                        -- 客户公司名称
  opp_date date not null default current_date,        -- 商机日期
  status public.crm_opportunity_status_enum not null default '未跟进',  -- 商机状态（未跟进/跟进中/关闭/转项目）
  opp_summary text,                                   -- 商机摘要
  product_line public.crm_product_line_enum,          -- 产品线（接插件/线束/工业连接器/IO连接器/电子电气/其他）
  sales_rep text,                                     -- 销售负责人
  project_manager text,                               -- 项目经理
  product_owner text,                                 -- 产品负责人
  opp_level text,                                     -- 商机等级
  intent_amount numeric(18,2),                        -- 意向金额
  associated_project text,                            -- 关联项目
  end_customer text,                                  -- 终端客户
  end_project text,                                   -- 终端项目
  sales_type text,                                    -- 销售类型
  product_industry public.crm_lead_product_industry_enum,  -- 产品行业
  product_series text,                                -- 产品系列
  completeness numeric(5,2),                          -- 信息完整度（百分比）
  contact_person text,                                -- 联系人
  lead_id integer references public.crm_lead(id),     -- 来源线索ID
  inquiry_id integer references public.crm_inquiry(id),  -- 来源询盘ID
  application_scenario text,                          -- 应用场景
  estimated_usage text,                               -- 预计用量
  estimated_mass_production_date date,                -- 预计量产日期
  close_time date,                                    -- 关闭时间
  close_reason text,                                  -- 关闭原因
  attachments jsonb,                                  -- 附件列表（JSON数组）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_opportunity_id_unsigned check (id > 0)
);


-- 项目表（销售管道第四阶段）
create table if not exists public.crm_project (
  id integer generated by default as identity primary key,  -- 项目ID（自增主键）
  project_no text not null default '',                -- 项目编号（格式XM+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_name text not null,                        -- 客户公司名称
  project_name text not null,                         -- 项目名称
  status public.crm_project_status_enum not null default '跟进中',  -- 项目状态（跟进中/样品/小批量/已合作/关闭/暂停）
  stage public.crm_project_stage_enum not null default '需求阶段',  -- 项目阶段（需求阶段/设计阶段/报价阶段/样品制作/样品承认/试产阶段/重复试产/量产阶段）
  manager text,                                       -- 项目负责人
  amount numeric(18,2),                               -- 项目金额
  project_type text,                                  -- 项目类型
  project_level text,                                 -- 项目等级
  project_category text,                              -- 项目类别：定制项目/标准项目
  wechat_group text,                                  -- 关联企业微信群
  team jsonb,                                         -- 项目团队（JSON对象）
  notes jsonb,                                        -- 备注（JSON对象）
  requirements jsonb,                                 -- 需求列表（JSON对象）
  progress jsonb,                                     -- 进度记录（JSON对象）
  tasks jsonb,                                        -- 任务列表（JSON对象）
  samples jsonb,                                      -- 样品记录（JSON对象）
  purchasing_quotes jsonb,                            -- 采购报价记录（JSON对象）
  quotations jsonb,                                   -- 报价记录（JSON对象）
  requirement_changes jsonb,                          -- 需求变更记录（JSON对象）
  communication_details jsonb,                        -- 沟通详情（JSON对象）
  is_key_project boolean default false,               -- 是否重点项目
  ai_analysis jsonb,                                  -- AI分析结果（JSON对象）
  creator_id text,                                    -- 创建人ID
  creator_no text,                                    -- 创建人工号
  creator_name text,                                  -- 创建人姓名
  create_date date,                                   -- 创建日期
  end_customer text,                                  -- 终端客户
  opp_summary text,                                   -- 商机摘要
  application_scenario text,                          -- 应用场景
  intent_amount numeric(18,2),                        -- 意向金额
  end_project text,                                   -- 终端项目
  product_industry public.crm_lead_product_industry_enum,  -- 产品行业
  estimated_usage text,                               -- 预计用量
  estimated_mass_production_date date,                -- 预计量产日期
  customer_action public.crm_lead_customer_action_enum,  -- 客户动作
  sales_rep text,                                     -- 销售负责人
  product_owner text,                                 -- 产品负责人
  quality_owner text,                                 -- 质量负责人
  purchaser text,                                     -- 采购负责人
  fae text,                                           -- FAE工程师
  lead_id integer references public.crm_lead(id),     -- 来源线索ID
  opportunity_id integer references public.crm_opportunity(id),  -- 来源商机ID
  inquiry_id integer references public.crm_inquiry(id),  -- 来源询盘ID
  close_time date,                                    -- 关闭时间
  close_reason text,                                  -- 关闭原因
  product_line public.crm_product_line_enum,          -- 产品线
  start_date date,                                    -- 项目开始日期
  end_date date,                                      -- 项目结束日期
  attachments jsonb,                                  -- 附件列表（JSON数组）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_project_id_unsigned check (id > 0)
);



do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'crm_project' and column_name = 'project_category'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'chk_crm_project_project_category'
      and conrelid = 'public.crm_project'::regclass
  ) then
    alter table public.crm_project
      add constraint chk_crm_project_project_category
      check (project_category in ('定制项目', '标准项目') or project_category is null);
  end if;
end
$$;

-- ========= INTERACTION / TASK =========
create table if not exists public.crm_communication_log (
  id text primary key,                                -- 日志ID（主键）
  source_id text,                                     -- 来源ID（关联原始消息/邮件）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  date text,                                          -- 沟通日期
  sender text,                                        -- 发送人
  content text,                                       -- 沟通内容
  type text,                                          -- 沟通类型（wechat=微信 wechat_group=微信群 email=邮件 phone=电话 meeting=会议 screenshot=截图 voice=语音）
  attachment_url text,                                -- 附件URL
  duration int,                                       -- 沟通时长（分钟）
  source_group text,                                  -- 来源群组
  is_summarized boolean default false,                -- 是否已AI总结
  created_at timestamptz not null default now()       -- 创建时间
);


-- ========= WECHAT RAW / PROJECTION =========
create table if not exists wechat_raw.wechat_group_message_events (
  id bigserial primary key,                           -- 事件ID（自增主键）
  dedupe_key text not null unique,                    -- 去重键（唯一约束）
  guid text not null,                                 -- 消息GUID
  notify_type integer not null,                       -- 通知类型
  event_time timestamptz,                             -- 事件时间
  seq bigint,                                         -- 消息序号
  msg_id text,                                        -- 消息ID
  appinfo text,                                       -- 应用信息
  sender text,                                        -- 发送人微信ID
  sender_name text,                                   -- 发送人微信昵称
  receiver text,                                      -- 接收人ID
  roomid text not null,                               -- 群ID
  sendtime timestamptz,                               -- 消息发送时间
  content_type integer,                               -- 内容类型
  msg_type integer,                                   -- 消息类型（文本/图片/文件等）
  referid text,                                       -- 引用消息ID
  flag bigint,                                        -- 消息标识
  content text,                                       -- 消息内容
  at_list jsonb,                                      -- @列表（JSON数组）
  quote_content text,                                 -- 引用消息内容
  quote_appinfo text,                                 -- 引用消息应用信息
  send_flag integer,                                  -- 发送标识
  payload jsonb not null,                             -- 原始消息负载（完整JSON）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  local_media_path text,                              -- 本地媒体文件路径
  voice_trans_text text,                              -- 语音转文字结果
  media_task_status text,                             -- 媒体处理任务状态
  media_task_updated_at timestamptz,                  -- 媒体任务更新时间
  remote_media_url text,                              -- 远程媒体文件URL
  sender_display_name text,                           -- 发送人显示名
  sender_alias text,                                  -- 发送人别名
  room_name text,                                     -- 群名称
  room_remark_name text                               -- 群备注名
);


-- 企业微信私聊消息事件原始数据表
create table if not exists wechat_raw.wechat_private_message_events (
  id bigserial primary key,                           -- 事件ID（自增主键）
  dedupe_key text not null unique,                    -- 去重键（唯一约束）
  guid text not null,                                 -- 消息GUID
  notify_type integer not null,                       -- 通知类型
  event_time timestamptz,                             -- 事件时间
  seq bigint,                                         -- 消息序号
  msg_id text,                                        -- 消息ID
  appinfo text,                                       -- 应用信息
  sender text,                                        -- 发送人微信ID
  sender_name text,                                   -- 发送人微信昵称
  receiver text,                                      -- 接收人ID
  roomid text not null default '0',                   -- 群ID（私聊固定为0）
  sendtime timestamptz,                               -- 消息发送时间
  content_type integer,                               -- 内容类型
  msg_type integer,                                   -- 消息类型（文本/图片/文件等）
  referid text,                                       -- 引用消息ID
  flag bigint,                                        -- 消息标识
  content text,                                       -- 消息内容
  at_list jsonb,                                      -- @列表（JSON数组）
  quote_content text,                                 -- 引用消息内容
  quote_appinfo text,                                 -- 引用消息应用信息
  send_flag integer,                                  -- 发送标识
  payload jsonb not null,                             -- 原始消息负载（完整JSON）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  local_media_path text,                              -- 本地媒体文件路径
  voice_trans_text text,                              -- 语音转文字结果
  media_task_status text,                             -- 媒体处理任务状态
  media_task_updated_at timestamptz,                  -- 媒体任务更新时间
  remote_media_url text,                              -- 远程媒体文件URL
  sender_display_name text,                           -- 发送人显示名
  sender_alias text,                                  -- 发送人别名
  receiver_display_name text,                         -- 接收人显示名
  peer_display_name text                              -- 对方显示名（从消息中提取）
);


create index if not exists idx_wechat_group_message_events_sendtime
  on wechat_raw.wechat_group_message_events (sendtime);
create index if not exists idx_wechat_private_message_events_sendtime
  on wechat_raw.wechat_private_message_events (sendtime);

-- 企业微信会话投影表
create table if not exists public.crm_wx_conversation (
  id bigint generated always as identity primary key,  -- 会话ID（自增主键）
  conversation_key text not null unique,              -- 会话唯一键
  source_guid text not null,                          -- 来源设备GUID
  conversation_type text not null check (conversation_type in ('private', 'group')),  -- 会话类型（private=私聊 group=群聊）
  conversation_identity_type text not null default 'private_direct'  -- 会话身份类型（group/private_direct/private_forward_batch/private_internal/private_name）
    check (conversation_identity_type in ('group', 'private_direct', 'private_forward_batch', 'private_internal', 'private_name')),
  is_internal_chat boolean not null default false,    -- 是否内部聊天
  forward_batch_key text,                             -- 转发批次键（用于归因同批次转发消息）
  my_wechat_id text,                                  -- 我方微信ID
  my_wechat_name text,                                -- 我方微信昵称
  peer_wechat_id text,                                -- 对方微信ID
  peer_wechat_name text,                              -- 对方微信昵称
  peer_name_tokens text[] not null default '{}',      -- 对方名称分词数组（用于匹配）
  room_username text,                                 -- 群用户名
  conversation_name text,                             -- 会话名称
  room_name text,                                     -- 群名称
  room_remark_name text,                              -- 群备注名
  customer_id text,                                   -- 关联客户ID
  primary_contact_id text,                            -- 首要联系人ID
  owner_employee_id text,                             -- 负责人员工ID
  status text not null default 'active' check (status in ('active', 'archived')),  -- 会话状态（active/archived）
  last_message_id bigint,                             -- 最后消息ID
  last_message_at timestamptz,                        -- 最后消息时间
  last_message_preview text,                          -- 最后消息预览
  message_count integer not null default 0,           -- 消息总数
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  last_member_sync_version bigint not null default 0,  -- 最后成员同步版本号
  last_member_synced_at timestamptz                   -- 最后成员同步时间
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

-- 企业微信消息投影表
create table if not exists public.crm_wx_message (
  id bigint generated always as identity primary key,  -- 消息ID（自增主键）
  conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,  -- 所属会话ID
  source_guid text not null,                          -- 来源设备GUID
  message_scope text not null check (message_scope in ('private', 'group')),  -- 消息范围（private/group）
  message_origin_type text not null default 'unknown'  -- 消息来源类型（private_forward/group_forward/group_live/unknown）
    check (message_origin_type in ('private_forward', 'group_forward', 'group_live', 'unknown')),
  raw_event_table text not null check (raw_event_table in (
    'wechat_raw.wechat_private_message_events',
    'wechat_raw.wechat_group_message_events',
    'wechat_raw.wework_private_message_events',
    'wechat_raw.wework_group_message_events'
  )),                                              -- 原始事件表名
  raw_event_dedupe_key text not null,                 -- 原始事件去重键
  raw_msg_id text,                                    -- 原始消息ID
  sender_wechat_id text,                              -- 发送人微信ID
  sender_display_name text,                           -- 发送人显示名
  sender_alias text,                                  -- 发送人别名
  receiver_wechat_id text,                            -- 接收人微信ID
  receiver_display_name text,                         -- 接收人显示名
  peer_display_name text,                             -- 对方显示名
  forward_batch_key text,                             -- 转发批次键
  room_username text,                                 -- 群用户名
  room_name text,                                     -- 群名称
  room_remark_name text,                              -- 群备注名
  msg_type integer,                                   -- 消息类型编码
  content text,                                       -- 消息内容
  quote_content text,                                 -- 引用消息内容
  quote_msg_type integer,                             -- 引用消息类型
  quote_remote_media_url text,                        -- 引用消息媒体URL
  quote_file_name text,                               -- 引用消息文件名
  send_time timestamptz,                              -- 发送时间
  remote_media_url text,                              -- 远程媒体文件URL
  local_media_path text,                              -- 本地媒体文件路径
  voice_trans_text text,                              -- 语音转文字结果
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
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

-- 企业微信群成员投影表
create table if not exists public.crm_wx_conversation_member (
  id bigint generated always as identity primary key,  -- 成员记录ID（自增主键）
  conversation_id bigint not null references public.crm_wx_conversation(id) on delete cascade,  -- 所属会话ID
  wechat_id text not null,                            -- 微信ID
  display_name text,                                  -- 显示名称
  member_type text not null default 'external_unknown'  -- 成员类型（customer_contact=客户联系人 employee=员工 external_unknown=未识别）
    check (member_type in ('customer_contact', 'employee', 'external_unknown')),
  contact_id text,                                    -- 关联联系人ID
  employee_id text,                                   -- 关联员工ID
  is_internal boolean not null default false,         -- 是否内部成员
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  unique (conversation_id, wechat_id)
);


create index if not exists idx_crm_wx_conversation_member_contact_id
  on public.crm_wx_conversation_member (contact_id);
create index if not exists idx_crm_wx_conversation_member_wechat_id
  on public.crm_wx_conversation_member (wechat_id);

-- 客户消息会话表（按发送人聚合的会话视图）
create table if not exists public.crm_customer_message_session (
  id text primary key,                                -- 会话ID（主键）
  customer_id text not null,                          -- 关联客户ID
  contact_id text,                                    -- 关联联系人ID
  channel text not null default 'wechat_private'      -- 渠道（wechat_private/wechat_group）
    check (channel in ('wechat_private', 'wechat_group')),
  source_sender_key text not null,                    -- 来源发送人键
  source_sender_wechat_id text,                       -- 来源发送人微信ID
  source_sender_display_name text,                    -- 来源发送人显示名
  title text not null,                                -- 会话标题
  message_count integer not null default 0,           -- 消息数量
  last_message_at timestamptz,                        -- 最后消息时间
  last_message_preview text,                          -- 最后消息预览
  status text not null default 'active'               -- 状态（active/archived）
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


create index if not exists idx_crm_customer_message_session_customer_id
  on public.crm_customer_message_session (customer_id, created_at desc);
create index if not exists idx_crm_customer_message_session_contact_id
  on public.crm_customer_message_session (contact_id);
create index if not exists idx_crm_customer_message_session_sender_key
  on public.crm_customer_message_session (source_sender_key);

-- 客户消息会话明细表（会话与微信消息的多对多关联）
create table if not exists public.crm_customer_message_session_item (
  id bigint generated always as identity primary key,  -- 明细ID（自增主键）
  session_id text not null references public.crm_customer_message_session(id) on delete cascade,  -- 会话ID
  wx_message_id bigint not null references public.crm_wx_message(id) on delete cascade,  -- 微信消息ID
  sort_order integer not null default 0,              -- 排序序号
  created_at timestamptz not null default now(),      -- 创建时间
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

-- 企业微信消息投影任务表（异步处理队列）
create table if not exists public.crm_wx_projection_jobs (
  id bigint generated always as identity primary key,  -- 任务ID（自增主键）
  dedupe_key text not null unique,                    -- 去重键（唯一）
  source_guid text not null,                          -- 来源设备GUID
  raw_event_table text not null,                      -- 原始事件表名
  raw_event_dedupe_key text not null,                 -- 原始事件去重键
  job_type text not null check (job_type in ('project_message')),  -- 任务类型（project_message）
  status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'success', 'failed')),  -- 任务状态（pending/processing/retrying/success/failed）
  attempt_count integer not null default 0,           -- 重试次数
  next_retry_at timestamptz,                          -- 下次重试时间
  last_error text,                                    -- 最近错误信息
  processing_started_at timestamptz,                  -- 处理开始时间
  completed_at timestamptz,                           -- 完成时间
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


create index if not exists idx_crm_wx_projection_jobs_poll
  on public.crm_wx_projection_jobs (status, next_retry_at, created_at);
create index if not exists idx_crm_wx_projection_jobs_source_guid
  on public.crm_wx_projection_jobs (source_guid, created_at desc);

-- ========= WECHAT IDENTITY BINDING =========
-- 微信账号绑定表（一个wxid只能绑定一个员工或一个客户联系人）
create table if not exists public.crm_wechat_binding (
  id bigint generated always as identity primary key,  -- 绑定ID（自增主键）
  wechat_id text not null,                            -- 微信ID
  wechat_name text,                                   -- 微信昵称
  bind_type text not null                             -- 绑定类型（employee=员工 customer_contact=客户联系人）
    check (bind_type in ('employee', 'customer_contact')),
  bind_id text not null,                              -- 绑定对象ID（员工ID或联系人ID）
  match_source text not null default 'nickname'       -- 匹配来源（nickname=昵称匹配 group_member=群成员匹配 manual_confirm=人工确认）
    check (match_source in ('nickname', 'group_member', 'manual_confirm')),
  is_verified boolean not null default false,         -- 是否已验证
  verified_at timestamptz,                            -- 验证时间
  verified_by text,                                   -- 验证人
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  unique (wechat_id)
);


create index if not exists idx_crm_wechat_binding_lookup
  on public.crm_wechat_binding (wechat_id);
create index if not exists idx_crm_wechat_binding_bind
  on public.crm_wechat_binding (bind_type, bind_id);

-- 昵称快照表（机器人从群成员/好友列表采集的昵称↔wxid映射）
-- 匹配规则：用户填写的 wechat_name 与 original_nickname 完全一致（含大小写、特殊字符）才匹配
create table if not exists public.crm_wechat_name_snapshot (
  id bigint generated always as identity primary key,  -- 快照ID（自增主键）
  original_nickname text not null,                    -- 原始昵称（精确匹配键）
  display_name text,                                  -- 显示名称
  wechat_id text not null,                            -- 微信ID
  source_table text not null,                         -- 来源表名
  source_context text,                                -- 来源上下文（如群用户名）
  first_seen_at timestamptz not null default now(),   -- 首次发现时间
  last_seen_at timestamptz not null default now(),    -- 最近发现时间
  created_at timestamptz not null default now(),      -- 创建时间
  unique (original_nickname, wechat_id)
);


create index if not exists idx_crm_wx_name_snapshot_lookup
  on public.crm_wechat_name_snapshot (original_nickname);
create index if not exists idx_crm_wx_name_snapshot_wxid
  on public.crm_wechat_name_snapshot (wechat_id);

-- 未解析重名队列（同一昵称匹配到多个wxid时写入，等待人工选择）
create table if not exists public.crm_wechat_unresolved_nickname (
  id bigint generated always as identity primary key,  -- 记录ID（自增主键）
  nickname text not null,                             -- 微信昵称
  candidate_wxids jsonb default '[]'::jsonb,          -- 候选微信ID列表（JSON数组）
  status text not null default 'pending'              -- 状态（pending/resolved/ignored）
    check (status in ('pending', 'resolved', 'ignored')),
  resolved_wxid text,                                 -- 已确认的微信ID
  resolved_bind_type text,                            -- 已确认的绑定类型
  resolved_bind_id text,                              -- 已确认的绑定对象ID
  resolved_by text,                                   -- 处理人
  resolved_at timestamptz,                            -- 处理时间
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  unique (nickname)
);


do $$
begin
  if to_regclass('public.crm_wechat_unresolved_nickname') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'crm_wechat_unresolved_nickname_nickname_key'
         and conrelid = 'public.crm_wechat_unresolved_nickname'::regclass
     ) then
    alter table public.crm_wechat_unresolved_nickname
      add constraint crm_wechat_unresolved_nickname_nickname_key unique (nickname);
  end if;
end;
$$;

create index if not exists idx_crm_wechat_unresolved_status
  on public.crm_wechat_unresolved_nickname (status, created_at desc);

-- 任务类型定义表
create table if not exists public.crm_task_type (
  id text primary key,                                -- 任务类型ID（主键）
  name text not null,                                 -- 任务类型名称
  default_hours int default 24,                       -- 默认完成时限（小时）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- CRM任务表
create table if not exists public.crm_task (
  id text primary key,                                -- 任务ID（主键）
  title text not null,                                -- 任务标题
  description text,                                   -- 任务描述
  module text,                                        -- 所属模块（task_center/customer_visit/客户/项目/报价/订单/样品/退货）
  related_id text,                                    -- 关联业务对象ID
  source_type text,                                   -- 来源类型（inquiry/lead/opportunity/project/customer/chat/visit/ai_agent/manual/task_decomposition/quotation/order/sample/return）
  source_id text,                                     -- 来源ID
  task_type text,                                     -- 任务类型
  objectives jsonb,                                   -- 任务目标（JSON）
  auxiliary_json jsonb,                               -- 辅助数据（JSON）
  status text,                                        -- 任务状态
  importance text,                                    -- 重要性（高/中/低）
  urgency text,                                       -- 紧急程度（非常紧急/紧急/正常/闲时）
  assignee_id text,                                   -- 负责人ID
  assignee_name text,                                 -- 负责人姓名
  due_date date,                                      -- 截止日期
  create_date date,                                   -- 创建日期
  creator_id text,                                    -- 创建人ID
  creator_name text,                                  -- 创建人姓名
  ai_context_id text,                                 -- AI上下文ID
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);

-- 销售案例库表
create table if not exists crm_case_library (
  id text primary key,                                -- 案例ID（主键）
  title text not null,                                -- 案例标题
  customer_name text,                                 -- 客户名称
  industry text,                                      -- 行业
  pain_points text,                                   -- 痛点描述
  solution text,                                      -- 解决方案
  metrics text,                                       -- 关键指标
  value_statement text,                               -- 价值陈述
  tags text,                                          -- 标签
  attachments text,                                   -- 附件
  images text,                                        -- 图片
  product_category_ids text,                          -- 关联产品品类ID
  product_series_ids text,                            -- 关联产品系列ID
  created_at timestamptz default now(),               -- 创建时间
  updated_at timestamptz default now()                -- 更新时间
);


-- 案例与产品关联表
create table if not exists crm_case_product_rel (
  id uuid primary key default gen_random_uuid(),      -- 关联ID（主键，UUID）
  case_id text not null references crm_case_library(id) on delete cascade,  -- 案例ID
  product_id integer not null references ba_cpinfo(id) on delete cascade  -- 产品ID
);


-- 案例与品类关联表
create table if not exists crm_case_category_rel (
  id uuid primary key default gen_random_uuid(),      -- 关联ID（主键，UUID）
  case_id text not null references crm_case_library(id) on delete cascade,  -- 案例ID
  category_id integer not null references ba_cptype(id) on delete cascade  -- 品类ID
);

-- ========= COMPETITOR / SWOT =========
create table if not exists public.crm_competitor (
  id text primary key,                                -- 竞品ID（主键）
  name text not null,                                 -- 竞品名称
  advantages text,                                    -- 竞品优势
  disadvantages text,                                 -- 竞品劣势
  positioning text,                                   -- 市场定位
  product_matrix jsonb not null default '[]'::jsonb,  -- 产品矩阵（JSON数组）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户与竞品关联表
create table if not exists public.crm_customer_competitor (
  id text primary key,                                -- 关联ID（主键）
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 客户ID
  competitor_id text not null references public.crm_competitor(id) on delete cascade,  -- 竞品ID
  threat_level text,                                  -- 威胁等级
  notes text,                                         -- 备注
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户关注点SWOT分析表
create table if not exists public.crm_customer_focus_swot (
  id text primary key,                                -- SWOT记录ID（主键）
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 客户ID
  customer_focus text not null default '',            -- 客户关注点
  key_contact text not null default '',               -- 关键联系人
  focus_level int not null default 3,                 -- 关注优先级（1-5）
  our_strengths jsonb not null default '[]'::jsonb,   -- 我方优势（JSON数组）
  our_weaknesses jsonb not null default '[]'::jsonb,  -- 我方劣势（JSON数组）
  ai_script text not null default '',                 -- AI生成话术
  sort_order int not null default 0,                  -- 排序序号
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户关注点-竞品对标表
create table if not exists public.crm_customer_focus_competitor (
  id text primary key,                                -- 记录ID（主键）
  focus_id text not null references public.crm_customer_focus_swot(id) on delete cascade,  -- 关联SWOT关注点ID
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 客户ID
  competitor_name text not null default '',           -- 竞品名称
  strengths jsonb not null default '[]'::jsonb,       -- 竞品优势（JSON数组）
  weaknesses jsonb not null default '[]'::jsonb,      -- 竞品劣势（JSON数组）
  sort_order int not null default 0,                  -- 排序序号
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户跟进策略配置表
create table if not exists public.crm_customer_follow_strategy_config (
  id text primary key,                                -- 配置ID（主键）
  config jsonb not null default '{}'::jsonb,          -- 配置内容（JSON）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 客户FAQ知识库配置表
create table if not exists public.crm_customer_faq_library_config (
  id text primary key,                                -- 配置ID（主键）
  config jsonb not null default '{"categories":[]}'::jsonb,  -- 配置内容（JSON）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now()       -- 更新时间
);


-- 干系人评估表（基于联系人）
create table if not exists public.crm_stakeholder_assessment (
  id text primary key,                                -- 评估ID（主键）
  customer_id integer not null references public.ba_manucustinfo(id) on delete cascade,  -- 客户ID
  stakeholder_id text not null references public.crm_customer_contact(id) on delete cascade,  -- 干系人（联系人）ID
  assessment_date date not null default current_date,  -- 评估日期
  need_level_score int,                               -- 需求度评分
  power_score int,                                    -- 权力评分
  attitude_score int,                                 -- 态度评分
  relation_score int,                                 -- 关系评分
  business_alignment_score int,                       -- 业务契合度评分
  confidence_score int default 60,                    -- 综合信心评分（0-100）
  conclusion text,                                    -- 评估结论
  strategy_suggestion text,                           -- 策略建议
  source_type text default 'manual',                  -- 来源类型（manual=人工 ai=AI生成）
  ai_model text,                                      -- AI模型名称
  created_by text,                                    -- 创建人
  created_at timestamptz not null default now()       -- 创建时间
);


-- ========= SALES DOCS =========
-- 报价单表
create table if not exists public.crm_quotation (
  id integer generated by default as identity primary key,  -- 报价单ID（自增主键）
  quote_no text,                                      -- 报价单编号（格式BJ+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_name text,                                 -- 客户名称
  project_id integer references public.crm_project(id),  -- 关联项目ID
  project_name text,                                  -- 项目名称
  quote_date date,                                    -- 报价日期
  status public.crm_quotation_status_enum,            -- 报价状态（quotation_complete/terminated/manual_quotation/timeout_cancellation/user_cancelled）
  audit_status text,                                  -- 审核状态
  tax_included_total_amount numeric(18,2) default 0,  -- 含税总金额
  tax_excluded_total_amount numeric(18,2) default 0,  -- 不含税总金额
  total_amount numeric(18,2) default 0,               -- 总金额
  contact_person text,                                -- 联系人
  valid_until date,                                   -- 有效期至
  delivery_method text,                               -- 交付方式
  delivery_time timestamptz,                          -- 交付时间
  payment_method int,                                 -- 付款方式（整型编码）
  contact_phone text,                                 -- 联系电话
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_quotation_id_unsigned check (id > 0)
);


-- 报价单明细表
create table if not exists public.crm_quotation_item (
  id integer generated by default as identity primary key,  -- 明细ID（自增主键）
  quotation_id integer not null references public.crm_quotation(id) on delete cascade,  -- 报价单ID
  product_id integer references public.ba_cpinfo(id),  -- 产品（物料）ID
  product_name text,                                  -- 产品名称
  material_no text,                                   -- 物料编号
  quantity numeric(18,4) default 0,                   -- 数量
  tax_type text,                                      -- 税类型
  tax_rate numeric(8,4) default 0,                    -- 税率
  tax_included_price numeric(18,4) default 0,         -- 含税单价
  tax_excluded_price numeric(18,4) default 0,         -- 不含税单价
  tax_included_amount numeric(18,2) default 0,        -- 含税金额
  tax_excluded_amount numeric(18,2) default 0,        -- 不含税金额
  tax_amount numeric(18,2) default 0,                 -- 税额
  currency text,                                      -- 币种
  lead_time text,                                     -- 交期
  mpq numeric(18,4),                                  -- 最小包装数量
  moq numeric(18,4),                                  -- 最小起订量
  sample_price numeric(18,4) default 0,               -- 样品单价
  remark text,                                        -- 备注
  customer_material_no text,                          -- 客户物料编号
  material_delivery_date date,                        -- 物料交付日期
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_quotation_item_id_unsigned check (id > 0)
);


-- 销售订单表
create table if not exists public.crm_sales_order (
  id integer generated by default as identity primary key,  -- 订单ID（自增主键）
  order_no text unique,                               -- 订单编号（格式DD+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_name text,                                 -- 客户名称
  project_id integer references public.crm_project(id),  -- 关联项目ID
  project_name text,                                  -- 项目名称
  order_date date,                                    -- 订单日期
  status public.crm_sales_order_status_enum,          -- 订单状态（un_paid/partial_payment/delivered/completed等）
  audit_status text,                                  -- 审核状态
  tax_included_total_amount numeric(18,2) default 0,  -- 含税总金额
  tax_excluded_total_amount numeric(18,2) default 0,  -- 不含税总金额
  total_amount numeric(18,2) default 0,               -- 总金额
  actual_received_amount numeric(18,2) default 0,     -- 实际已收金额
  pending_amount numeric(18,2) default 0,             -- 待收金额
  order_type int,                                     -- 订单类型（整型编码）
  payment_status int default 0,                       -- 付款状态（0=未付款）
  payment_method int,                                 -- 付款方式（整型编码）
  payment_time timestamptz,                           -- 付款时间
  province text,                                      -- 省份
  city text,                                          -- 城市
  district text,                                      -- 区县
  shipping_address text,                              -- 收货地址
  consignee_name text,                                -- 收货人姓名
  consignee_phone text,                               -- 收货人电话
  customer_purchase_order_no text,                    -- 客户采购订单号
  third_party_transaction_no text,                    -- 第三方交易号
  sales_rep text,                                     -- 销售负责人
  merchandiser text,                                  -- 跟单员
  receipt_time timestamptz,                           -- 签收时间
  receipt_voucher text,                               -- 签收凭证
  source_document_no text,                            -- 来源单据号
  source_after_sale_no text,                          -- 来源售后单号
  advance_stock_attachment text,                      -- 提前备货附件
  advance_stock_reason text,                          -- 提前备货原因
  is_advance_stock int default 0,                     -- 是否提前备货（1=是 0=否）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_sales_order_id_unsigned check (id > 0)
);


-- 销售订单明细表
create table if not exists public.crm_sales_order_item (
  id integer generated by default as identity primary key,  -- 明细ID（自增主键）
  sales_order_id integer not null references public.crm_sales_order(id) on delete cascade,  -- 销售订单ID
  product_id integer references public.ba_cpinfo(id),  -- 产品（物料）ID
  product_name text,                                  -- 产品名称
  material_no text,                                   -- 物料编号
  quantity numeric(18,4) default 0,                   -- 数量
  tax_type text,                                      -- 税类型
  tax_rate numeric(8,4) default 0,                    -- 税率
  tax_included_price numeric(18,4) default 0,         -- 含税单价
  tax_excluded_price numeric(18,4) default 0,         -- 不含税单价
  tax_included_amount numeric(18,2) default 0,        -- 含税金额
  tax_excluded_amount numeric(18,2) default 0,        -- 不含税金额
  tax_amount numeric(18,2) default 0,                 -- 税额
  order_no text,                                      -- 订单编号（冗余）
  customer_name text,                                 -- 客户名称（冗余）
  product_no text,                                    -- 产品编号
  customer_material_no text,                          -- 客户物料编号
  list_price numeric(18,4) default 0,                 -- 目录价
  sales_unit_price numeric(18,4) default 0,           -- 销售单价
  line_total numeric(18,2) default 0,                 -- 行总金额
  original_line_total numeric(18,2) default 0,        -- 原始行总金额
  order_type int,                                     -- 订单类型
  customer_due_date date,                             -- 客户要求交期
  due_date date,                                      -- 承诺交期
  packaging_unit text,                                -- 包装单位
  shipping_method text,                               -- 运输方式
  tax_excluded_unit_price numeric(18,4) default 0,    -- 不含税单价
  tax_excluded_line_total numeric(18,2) default 0,    -- 不含税行总金额
  discount_method text,                               -- 折扣方式
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_sales_order_item_id_unsigned check (id > 0)
);


-- 样品单表
create table if not exists public.crm_sample_order (
  id integer generated by default as identity primary key,  -- 样品单ID（自增主键）
  sample_no text,                                     -- 样品单编号（格式YP+YYMMDD+4位序号）
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_name text,                                 -- 客户名称
  applicant text,                                     -- 申请人
  project_id integer references public.crm_project(id),  -- 关联项目ID
  project_name text,                                  -- 项目名称
  status public.crm_sample_order_status_enum,         -- 样品单状态（leader_reject/wait_leader_examine/completed/stay_follow_up/cancellation/closure）
  audit_status text,                                  -- 审核状态
  tax_included_total_amount numeric(18,2) default 0,  -- 含税总金额
  tax_excluded_total_amount numeric(18,2) default 0,  -- 不含税总金额
  total_amount numeric(18,2) default 0,               -- 总金额
  sales_rep text,                                     -- 销售负责人
  merchandiser text,                                  -- 跟单员
  created_by text,                                    -- 创建人
  created_time timestamptz,                           -- 创建时间
  recipient text,                                     -- 收件人
  mobile_phone text,                                  -- 收件人手机号
  province text,                                      -- 省份
  city text,                                          -- 城市
  district text,                                      -- 区县
  detail_address text,                                -- 详细地址
  reject_reason text,                                 -- 驳回原因
  reject_time timestamptz,                            -- 驳回时间
  sample_application_note text,                       -- 样品申请备注
  application_attachments jsonb,                      -- 申请附件（JSON数组）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_sample_order_id_unsigned check (id > 0)
);


-- 样品单明细表
create table if not exists public.crm_sample_order_item (
  id integer generated by default as identity primary key,  -- 明细ID（自增主键）
  sample_order_id integer not null references public.crm_sample_order(id) on delete cascade,  -- 样品单ID
  product_id integer references public.ba_cpinfo(id),  -- 产品（物料）ID
  product_name text,                                  -- 产品名称
  material_no text,                                   -- 物料编号
  quantity numeric(18,4) default 0,                   -- 数量
  tax_type text,                                      -- 税类型
  tax_rate numeric(8,4) default 0,                    -- 税率
  tax_included_price numeric(18,4) default 0,         -- 含税单价
  tax_excluded_price numeric(18,4) default 0,         -- 不含税单价
  tax_included_amount numeric(18,2) default 0,        -- 含税金额
  tax_excluded_amount numeric(18,2) default 0,        -- 不含税金额
  tax_amount numeric(18,2) default 0,                 -- 税额
  sample_no text,                                     -- 样品单编号（冗余）
  material_name text,                                 -- 物料名称
  unit_price numeric(18,4) default 0,                 -- 单价
  line_total numeric(18,2) default 0,                 -- 行总金额
  customer_material_no text,                          -- 客户物料编号
  customer_material_name text,                        -- 客户物料名称
  customer_due_date date,                             -- 客户要求交期
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_sample_order_item_id_unsigned check (id > 0)
);


-- 售后/退货单表
create table if not exists public.crm_return_order (
  id integer generated by default as identity primary key,  -- 退货单ID（自增主键）
  return_no text,                                     -- 退货单编号（格式TH+YYMMDD+4位序号）
  order_no text,                                      -- 关联销售订单号
  original_order_no text,                             -- 原始销售订单号
  customer_id integer references public.ba_manucustinfo(id),  -- 客户ID
  customer_name text,                                 -- 客户名称
  reason text,                                        -- 退货原因
  handler text,                                       -- 处理人
  sales_rep text,                                     -- 销售负责人
  merchandiser text,                                  -- 跟单员
  project_id integer references public.crm_project(id),  -- 关联项目ID
  project_name text,                                  -- 项目名称
  status text,                                        -- 退货单状态（待处理/处理中/已完成）
  audit_status text,                                  -- 审核状态
  tax_included_total_amount numeric(18,2) default 0,  -- 含税总金额
  tax_excluded_total_amount numeric(18,2) default 0,  -- 不含税总金额
  after_sale_no text,                                 -- 售后单编号
  after_sale_qty numeric(18,4) not null default 0,    -- 售后数量
  after_sale_type integer not null default 1,         -- 售后类型（1=退货 2=换货 3=维修）
  after_sale_reason text,                             -- 售后原因
  after_sale_status integer not null default 0,       -- 售后状态（0=待处理 1=处理中 2=已完成 3=已拒绝 4=已关闭）
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_return_order_id_unsigned check (id > 0),
  constraint chk_crm_return_order_after_sale_type check (after_sale_type in (1,2,3)),
  constraint chk_crm_return_order_after_sale_status check (after_sale_status in (0,1,2,3,4))
);


-- 售后/退货单明细表
create table if not exists public.crm_return_order_item (
  id integer generated by default as identity primary key,  -- 明细ID（自增主键）
  return_order_id integer not null references public.crm_return_order(id) on delete cascade,  -- 退货单ID
  product_id integer references public.ba_cpinfo(id),  -- 产品（物料）ID
  product_name text,                                  -- 产品名称
  material_no text,                                   -- 物料编号
  quantity numeric(18,4) default 0,                   -- 数量
  tax_type text,                                      -- 税类型
  tax_rate numeric(8,4) default 0,                    -- 税率
  tax_included_price numeric(18,4) default 0,         -- 含税单价
  tax_excluded_price numeric(18,4) default 0,         -- 不含税单价
  tax_included_amount numeric(18,2) default 0,        -- 含税金额
  tax_excluded_amount numeric(18,2) default 0,        -- 不含税金额
  tax_amount numeric(18,2) default 0,                 -- 税额
  order_no text,                                      -- 销售订单编号（冗余）
  return_no text,                                     -- 退货单编号（冗余）
  material_id text,                                   -- 物料ID（冗余）
  material_name text,                                 -- 物料名称
  expected_after_sale_method text,                    -- 期望售后处理方式
  after_sale_reason text,                             -- 售后原因
  after_sale_material_image text,                     -- 售后物料图片
  issue_description text,                             -- 问题描述
  return_tracking_no text,                            -- 退货物流单号
  final_handling_method text,                         -- 最终处理方式
  return_qty numeric(18,4),                           -- 退货数量
  return_method text,                                 -- 退货方式
  after_sale_order_id integer references public.crm_return_order(id) on delete set null,  -- 关联售后单ID
  after_sale_no text,                                 -- 售后单编号
  material_qty numeric(18,4) not null default 0,      -- 物料数量
  created_at timestamptz not null default now(),      -- 创建时间
  updated_at timestamptz not null default now(),      -- 更新时间
  constraint chk_crm_return_order_item_id_unsigned check (id > 0)
);


-- 采购报价单表
create table if not exists public.crm_purchase_quotation (
  id integer generated by default as identity primary key,  -- 采购报价单ID（自增主键）
  purchase_quote_no text not null,                    -- 采购报价单编号（格式PQT+YYMMDD+4位序号）
  project_id integer references public.crm_project(id) on delete set null,  -- 关联项目ID
  quote_time timestamptz,                             -- 报价时间
  supplier text,                                      -- 供应商
  created_by text,                                    -- 创建人
  created_at timestamptz not null default now(),      -- 创建时间
  updated_by text,                                    -- 更新人
  updated_at timestamptz not null default now(),      -- 更新时间
  customer_name text,                                 -- 客户名称
  customer_id integer references public.ba_manucustinfo(id) on delete set null,  -- 客户ID
  valid_until date,                                   -- 有效期至
  constraint chk_crm_purchase_quotation_id_unsigned check (id > 0)
);


-- 采购报价单明细表
create table if not exists public.crm_purchase_quotation_item (
  id integer generated by default as identity primary key,  -- 明细ID（自增主键）
  material_no text,                                   -- 物料编号
  material_desc text,                                 -- 物料描述
  tax_included_unit_price numeric(18,4) not null default 0,  -- 含税单价
  tax_excluded_unit_price numeric(18,4) not null default 0,  -- 不含税单价
  sample_price numeric(18,4) not null default 0,      -- 样品单价
  unit text,                                          -- 单位
  lead_time text,                                     -- 交期
  moq numeric(18,4),                                  -- 最小起订量
  mpq numeric(18,4),                                  -- 最小包装数量
  remark text,                                        -- 备注
  drawing text,                                       -- 图纸
  purchase_quotation_id integer not null references public.crm_purchase_quotation(id) on delete cascade,  -- 采购报价单ID
  created_by text,                                    -- 创建人
  created_at timestamptz not null default now(),      -- 创建时间
  updated_by text,                                    -- 更新人
  updated_at timestamptz not null default now(),      -- 更新时间
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
before insert or update on public.crm_quotation
for each row
execute function public.set_quote_no();

drop trigger if exists trigger_set_sales_order_no on public.crm_sales_order;
create trigger trigger_set_sales_order_no
before insert or update on public.crm_sales_order
for each row
execute function public.set_sales_order_no();

drop trigger if exists trigger_set_sample_no on public.crm_sample_order;
create trigger trigger_set_sample_no
before insert or update on public.crm_sample_order
for each row
execute function public.set_sample_no();

drop trigger if exists trigger_set_return_no on public.crm_return_order;
create trigger trigger_set_return_no
before insert or update on public.crm_return_order
for each row
execute function public.set_return_no();

drop trigger if exists trigger_set_purchase_quote_no on public.crm_purchase_quotation;
create trigger trigger_set_purchase_quote_no
before insert or update on public.crm_purchase_quotation
for each row
execute function public.set_purchase_quote_no();

-- ========= ONTOLOGY / CONFIG =========
-- 本体对象定义表
create table if not exists public.crm_ontology_object (
  id text primary key,                              -- 对象ID（主键）
  name text not null,                               -- 对象名称
  code text not null unique,                        -- 对象编码（唯一）
  description text,                                 -- 描述
  system_link text,                                 -- 关联系统表名
  is_sub_table boolean default false,               -- 是否子表
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 本体属性定义表
create table if not exists public.crm_ontology_property (
  id text primary key,                              -- 属性ID（主键）
  object_code text not null references public.crm_ontology_object(code) on delete cascade, -- 所属对象编码
  name text not null,                               -- 属性名称
  code text not null,                               -- 属性编码
  type text,                                        -- 属性类型
  required boolean default false,                   -- 是否必填
  options_json jsonb default '[]'::jsonb            -- 选项配置（JSON数组）
);

-- 本体关系定义表
create table if not exists public.crm_ontology_relation (
  id text primary key,                              -- 关系ID（主键）
  object_code text not null references public.crm_ontology_object(code) on delete cascade, -- 源对象编码
  target_object_code text not null,                 -- 目标对象编码
  relation_type text,                               -- 关系类型
  description text                                  -- 关系描述
);

-- 本体流程定义表（已发布版本）
create table if not exists public.crm_ontology_flow (
  id text primary key,                              -- 流程ID（主键）
  object_code text not null references public.crm_ontology_object(code) on delete cascade, -- 所属对象编码
  name text not null,                               -- 流程名称
  description text,                                 -- 流程描述（__flow_json__元数据）
  trigger_type text,                                -- 触发类型
  trigger_condition text,                           -- 触发条件
  trigger_frequency text                            -- 触发频率
);

-- 本体节点定义表（已发布版本）
create table if not exists public.crm_ontology_node (
  id text primary key,                              -- 节点ID（主键）
  flow_id text not null references public.crm_ontology_flow(id) on delete cascade, -- 所属流程ID
  name text,                                        -- 节点名称
  description text,                                 -- 节点描述
  type text,                                        -- 节点类型
  config_json jsonb default '{}'::jsonb             -- 节点配置（JSON）
);

-- 本体流程定义表（草稿版本）
create table if not exists public.crm_ontology_flow_draft (
  id text primary key,                              -- 流程ID（主键）
  object_code text not null references public.crm_ontology_object(code) on delete cascade, -- 所属对象编码
  name text not null,                               -- 流程名称
  description text,                                 -- 流程描述
  trigger_type text,                                -- 触发类型
  trigger_condition text,                           -- 触发条件
  trigger_frequency text                            -- 触发频率
);

-- 本体节点定义表（草稿版本）
create table if not exists public.crm_ontology_node_draft (
  id text primary key,                              -- 节点ID（主键）
  flow_id text not null references public.crm_ontology_flow_draft(id) on delete cascade, -- 所属流程ID
  name text,                                        -- 节点名称
  description text,                                 -- 节点描述
  type text,                                        -- 节点类型
  config_json jsonb default '{}'::jsonb             -- 节点配置（JSON）
);

-- 本体流程发布历史表
create table if not exists public.crm_ontology_flow_publish_history (
  id uuid primary key default gen_random_uuid(),    -- 历史记录ID（UUID主键）
  object_code text not null references public.crm_ontology_object(code) on delete cascade, -- 所属对象编码
  snapshot_json jsonb not null,                     -- 快照数据（完整JSON）
  created_at timestamptz not null default now()     -- 发布时间
);

drop function if exists public.crm_prepare_flow_draft(text);
create or replace function public.crm_prepare_flow_draft(p_object_code text)
returns void
language plpgsql
as $$
declare
  v_object_code text;
begin
  v_object_code := btrim(coalesce(p_object_code, ''));
  if v_object_code = '' then
    raise exception 'p_object_code is required';
  end if;

  delete from public.crm_ontology_node_draft
   where flow_id in (select id from public.crm_ontology_flow_draft where object_code = v_object_code);
  delete from public.crm_ontology_flow_draft where object_code = v_object_code;

  insert into public.crm_ontology_flow_draft (id, object_code, name, description, trigger_type, trigger_condition, trigger_frequency)
  select id, object_code, name, description, trigger_type, trigger_condition, trigger_frequency
    from public.crm_ontology_flow
   where object_code = v_object_code;

  insert into public.crm_ontology_node_draft (id, flow_id, name, description, type, config_json)
  select n.id, n.flow_id, n.name, n.description, n.type, coalesce(n.config_json, '{}'::jsonb)
    from public.crm_ontology_node n
    join public.crm_ontology_flow f on f.id = n.flow_id
   where f.object_code = v_object_code;
end;
$$;

drop function if exists public.crm_discard_flow_draft(text);
create or replace function public.crm_discard_flow_draft(p_object_code text)
returns void
language plpgsql
as $$
declare
  v_object_code text;
begin
  v_object_code := btrim(coalesce(p_object_code, ''));
  if v_object_code = '' then
    raise exception 'p_object_code is required';
  end if;
  delete from public.crm_ontology_node_draft
   where flow_id in (select id from public.crm_ontology_flow_draft where object_code = v_object_code);
  delete from public.crm_ontology_flow_draft where object_code = v_object_code;
end;
$$;

drop function if exists public.crm_publish_flow_draft(text);
create or replace function public.crm_publish_flow_draft(p_object_code text)
returns void
language plpgsql
as $$
declare
  v_object_code text;
begin
  v_object_code := btrim(coalesce(p_object_code, ''));
  if v_object_code = '' then
    raise exception 'p_object_code is required';
  end if;

  insert into public.crm_ontology_flow_publish_history(object_code, snapshot_json)
  values (
    v_object_code,
    jsonb_build_object(
      'flows', coalesce((select jsonb_agg(to_jsonb(f)) from public.crm_ontology_flow f where f.object_code = v_object_code), '[]'::jsonb),
      'nodes', coalesce((
        select jsonb_agg(to_jsonb(n))
          from public.crm_ontology_node n
          join public.crm_ontology_flow f on f.id = n.flow_id
         where f.object_code = v_object_code
      ), '[]'::jsonb),
      'created_at', now()
    )
  );

  delete from public.crm_ontology_node
   where flow_id in (select id from public.crm_ontology_flow where object_code = v_object_code);
  delete from public.crm_ontology_flow where object_code = v_object_code;

  insert into public.crm_ontology_flow (id, object_code, name, description, trigger_type, trigger_condition, trigger_frequency)
  select id, object_code, name, description, trigger_type, trigger_condition, trigger_frequency
    from public.crm_ontology_flow_draft
   where object_code = v_object_code;

  insert into public.crm_ontology_node (id, flow_id, name, description, type, config_json)
  select n.id, n.flow_id, n.name, n.description, n.type, coalesce(n.config_json, '{}'::jsonb)
    from public.crm_ontology_node_draft n
    join public.crm_ontology_flow_draft f on f.id = n.flow_id
   where f.object_code = v_object_code;
end;
$$;

drop function if exists public.crm_rollback_flow_published(text);
create or replace function public.crm_rollback_flow_published(p_object_code text)
returns void
language plpgsql
as $$
declare
  v_object_code text;
  v_snapshot jsonb;
begin
  v_object_code := btrim(coalesce(p_object_code, ''));
  if v_object_code = '' then
    raise exception 'p_object_code is required';
  end if;

  select snapshot_json
    into v_snapshot
    from public.crm_ontology_flow_publish_history
   where object_code = v_object_code
   order by created_at desc
   limit 1;

  if v_snapshot is null then
    return;
  end if;

  delete from public.crm_ontology_node
   where flow_id in (select id from public.crm_ontology_flow where object_code = v_object_code);
  delete from public.crm_ontology_flow where object_code = v_object_code;

  insert into public.crm_ontology_flow (id, object_code, name, description, trigger_type, trigger_condition, trigger_frequency)
  select
    (f->>'id')::text,
    (f->>'object_code')::text,
    (f->>'name')::text,
    (f->>'description')::text,
    (f->>'trigger_type')::text,
    (f->>'trigger_condition')::text,
    (f->>'trigger_frequency')::text
  from jsonb_array_elements(coalesce(v_snapshot->'flows', '[]'::jsonb)) as f;

  insert into public.crm_ontology_node (id, flow_id, name, description, type, config_json)
  select
    (n->>'id')::text,
    (n->>'flow_id')::text,
    (n->>'name')::text,
    (n->>'description')::text,
    (n->>'type')::text,
    coalesce(n->'config_json', '{}'::jsonb)
  from jsonb_array_elements(coalesce(v_snapshot->'nodes', '[]'::jsonb)) as n;
end;
$$;

-- 系统配置表
create table if not exists public.crm_system_config (
  id text primary key,                              -- 配置项ID（主键，如llm_config、chat_assist_config）
  name text,                                        -- 配置项名称
  value_json jsonb not null default '{}'::jsonb,    -- 配置值（JSON）
  updated_at timestamptz not null default now()     -- 更新时间
);

-- 潜在客户表
create table if not exists public.crm_potential_customer (
  id text primary key,                              -- 潜在客户ID（主键）
  name text not null,                               -- 潜在客户名称
  created_at timestamptz not null default now(),    -- 创建时间
  updated_at timestamptz not null default now()     -- 更新时间
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
    'users','departments','ba_cptype','crm_product_series','ba_cpinfo','ba_manucustinfo','ba_customer_user',
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

-- ========= WECHAT BINDING RPC FUNCTIONS =========

-- 从群成员和好友列表刷新昵称快照表（源表不存在时静默跳过）
create or replace function public.refresh_wechat_name_snapshot()
returns void
language plpgsql
as $$
begin
  if to_regclass('wechat_raw.wechat_chatroom_members') is not null then
    insert into public.crm_wechat_name_snapshot
      (original_nickname, display_name, wechat_id, source_table, source_context)
    select distinct on (
      trim(m.nickname),
      m.username
    )
      trim(m.nickname),
      m.display_name,
      m.username,
      'wechat_chatroom_members',
      m.room_username
    from wechat_raw.wechat_chatroom_members m
    where m.is_deleted = false
      and nullif(trim(m.nickname), '') is not null
    order by 1, 3, m.updated_at desc nulls last
    on conflict (original_nickname, wechat_id)
    do update set
      display_name = excluded.display_name,
      source_context = excluded.source_context,
      last_seen_at = now();
  end if;

  if to_regclass('wechat_raw.wechat_contacts') is not null then
    insert into public.crm_wechat_name_snapshot
      (original_nickname, wechat_id, source_table)
    select distinct on (
      trim(c.nickname),
      c.username
    )
      trim(c.nickname),
      c.username,
      'wechat_contacts'
    from wechat_raw.wechat_contacts c
    where c.is_deleted = false
      and nullif(trim(c.nickname), '') is not null
    order by 1, 2, c.updated_at desc nulls last
    on conflict (original_nickname, wechat_id)
    do update set
      last_seen_at = now();
  end if;
end;
$$;

-- 自动匹配：根据预设的 wechat_name 匹配 snapshot 中的 wxid，回填并写入绑定
create or replace function public.auto_match_wechat_bindings()
returns table(matched_type text, matched_name text, matched_wxid text, bind_id text)
language plpgsql
as $$
declare
  v_record record;
  v_count int;
begin
  -- ========= 匹配员工 =========
  for v_record in
    select
      u.id as user_id,
      u.name as user_name,
      u.wechat_name as seed_nickname,
      sn.wechat_id as found_wxid,
      sn.original_nickname as found_nickname,
      sn.original_nickname as matched_nickname_key
    from public.users u
    join public.crm_wechat_name_snapshot sn
      on sn.original_nickname = trim(u.wechat_name)
    where u.wechat_id is null
      and u.wechat_name is not null
      and trim(u.wechat_name) != ''
      and not exists (
        -- 排除重名（同一昵称匹配到多个不同wxid）
        select 1 from public.crm_wechat_name_snapshot sn2
        where sn2.original_nickname = sn.original_nickname
          and sn2.wechat_id != sn.wechat_id
      )
  loop
    -- 安全检查①：该 wxid 是否已在绑定表中（已属于其他人）
    if exists (select 1 from public.crm_wechat_binding where wechat_id = v_record.found_wxid) then
      continue;
    end if;

    -- 安全检查②：该 wxid 是否已被其他用户占用（防止同名昵称的第二人被错误覆盖）
    if exists (select 1 from public.users where wechat_id = v_record.found_wxid and id != v_record.user_id) then
      continue;
    end if;

    -- 回填 users.wechat_id
    update public.users
    set wechat_id = v_record.found_wxid,
        wechat_name = v_record.found_nickname
    where id = v_record.user_id;

    -- 写入绑定表
    insert into public.crm_wechat_binding (wechat_id, wechat_name, bind_type, bind_id, match_source)
    values (v_record.found_wxid, v_record.found_nickname, 'employee', v_record.user_id, 'nickname')
    on conflict (wechat_id) do nothing;

    -- 回填已有真实 wxid 的会话成员
    update public.crm_wx_conversation_member
    set member_type = 'employee',
        employee_id = v_record.user_id,
        is_internal = true,
        updated_at = now()
    where wechat_id = v_record.found_wxid
      and member_type = 'external_unknown';

    -- 迁移占位成员（name:xxx → 真实 wxid）
    -- 先更新同会话中已存在的真实 wxid 条目（如果有），再删除占位条目避免唯一约束冲突
    update public.crm_wx_conversation_member
    set member_type = 'employee',
        employee_id = v_record.user_id,
        is_internal = true,
        updated_at = now()
    where wechat_id = v_record.found_wxid
      and member_type = 'external_unknown';
    -- 删除占位条目（其会话+wxid组合将被真实条目替代）
    delete from public.crm_wx_conversation_member
    where wechat_id = 'name:' || v_record.matched_nickname_key
      and exists (
        select 1 from public.crm_wx_conversation_member real
        where real.wechat_id = v_record.found_wxid
          and real.conversation_id = crm_wx_conversation_member.conversation_id
      );
    -- 剩余占位条目（没有冲突的）直接改键
    update public.crm_wx_conversation_member
    set wechat_id = v_record.found_wxid,
        member_type = 'employee',
        employee_id = v_record.user_id,
        is_internal = true,
        updated_at = now()
    where wechat_id = 'name:' || v_record.matched_nickname_key
      and member_type = 'external_unknown';

    matched_type := 'employee';
    matched_name := v_record.user_name;
    matched_wxid := v_record.found_wxid;
    bind_id := v_record.user_id;
    return next;
  end loop;

  -- ========= 匹配客户联系人 =========
  for v_record in
    select
      con.id as contact_id,
      con.name as contact_name,
      con.wechat_name as seed_nickname,
      sn.wechat_id as found_wxid,
      sn.original_nickname as found_nickname,
      sn.original_nickname as matched_nickname_key
    from public.crm_customer_contact con
    join public.crm_wechat_name_snapshot sn
      on sn.original_nickname = trim(con.wechat_name)
    where con.wechat_id is null
      and con.wechat_name is not null
      and trim(con.wechat_name) != ''
      and not exists (
        select 1 from public.crm_wechat_name_snapshot sn2
        where sn2.original_nickname = sn.original_nickname
          and sn2.wechat_id != sn.wechat_id
      )
  loop
    -- 安全检查①：该 wxid 是否已在绑定表中
    if exists (select 1 from public.crm_wechat_binding where wechat_id = v_record.found_wxid) then
      continue;
    end if;

    -- 安全检查②：该 wxid 是否已被其他联系人占用（防止同名昵称的第二人被错误覆盖）
    if exists (select 1 from public.crm_customer_contact where wechat_id = v_record.found_wxid and id != v_record.contact_id) then
      continue;
    end if;

    update public.crm_customer_contact
    set wechat_id = v_record.found_wxid,
        wechat_name = v_record.found_nickname
    where id = v_record.contact_id;

    insert into public.crm_wechat_binding (wechat_id, wechat_name, bind_type, bind_id, match_source)
    values (v_record.found_wxid, v_record.found_nickname, 'customer_contact', v_record.contact_id, 'nickname')
    on conflict (wechat_id) do nothing;

    -- 回填已有真实 wxid 的会话成员
    update public.crm_wx_conversation_member
    set member_type = 'customer_contact',
        contact_id = v_record.contact_id,
        updated_at = now()
    where wechat_id = v_record.found_wxid
      and member_type = 'external_unknown';

    -- 迁移占位成员（name:xxx → 真实 wxid）
    update public.crm_wx_conversation_member
    set member_type = 'customer_contact',
        contact_id = v_record.contact_id,
        updated_at = now()
    where wechat_id = v_record.found_wxid
      and member_type = 'external_unknown';
    delete from public.crm_wx_conversation_member
    where wechat_id = 'name:' || v_record.matched_nickname_key
      and exists (
        select 1 from public.crm_wx_conversation_member real
        where real.wechat_id = v_record.found_wxid
          and real.conversation_id = crm_wx_conversation_member.conversation_id
      );
    update public.crm_wx_conversation_member
    set wechat_id = v_record.found_wxid,
        member_type = 'customer_contact',
        contact_id = v_record.contact_id,
        updated_at = now()
    where wechat_id = 'name:' || v_record.matched_nickname_key
      and member_type = 'external_unknown';

    matched_type := 'customer_contact';
    matched_name := v_record.contact_name;
    matched_wxid := v_record.found_wxid;
    bind_id := v_record.contact_id;
    return next;
  end loop;

  -- ========= 收集重名冲突 =========
  insert into public.crm_wechat_unresolved_nickname
    (nickname, candidate_wxids, status)
  select
    u.wechat_name,
    jsonb_agg(distinct jsonb_build_object(
      'wxid', sn.wechat_id,
      'nickname', sn.original_nickname,
      'source', sn.source_table
    )),
    'pending'
  from public.users u
  join public.crm_wechat_name_snapshot sn
    on sn.original_nickname = trim(u.wechat_name)
  where u.wechat_id is null
    and u.wechat_name is not null
    and trim(u.wechat_name) != ''
  group by u.wechat_name
  having count(distinct sn.wechat_id) > 1
  on conflict (nickname) do update
    set candidate_wxids = excluded.candidate_wxids,
        updated_at = now();

  insert into public.crm_wechat_unresolved_nickname
    (nickname, candidate_wxids, status)
  select
    con.wechat_name,
    jsonb_agg(distinct jsonb_build_object(
      'wxid', sn.wechat_id,
      'nickname', sn.original_nickname,
      'source', sn.source_table
    )),
    'pending'
  from public.crm_customer_contact con
  join public.crm_wechat_name_snapshot sn
    on sn.original_nickname = trim(con.wechat_name)
  where con.wechat_id is null
    and con.wechat_name is not null
    and trim(con.wechat_name) != ''
  group by con.wechat_name
  having count(distinct sn.wechat_id) > 1
  on conflict (nickname) do update
    set candidate_wxids = excluded.candidate_wxids,
        updated_at = now();
end;
$$;

-- 自动归因：转发消息 peer_name_tokens 匹配到联系人 → 回填 conversation 的 customer_id
-- 路径①: token → snapshot → wxid → binding → contact → customer（需要快照和绑定）
-- 路径②: token → 直接匹配 crm_customer_contact.wechat_name → contact → customer（不需快照）
create or replace function public.auto_link_forwarded_conversations()
returns table(conversation_id bigint, linked_customer_id text, linked_contact_id text, match_path text)
language plpgsql
as $$
declare
  v_conv record;
  v_token text;
  v_wxid text;
  v_bind record;
  v_contact record;
begin
  for v_conv in
    select * from public.crm_wx_conversation
    where customer_id is null
      and peer_name_tokens is not null
      and array_length(peer_name_tokens, 1) > 0
  loop
    foreach v_token in array v_conv.peer_name_tokens
    loop
      -- ===== 路径①：token → snapshot → wxid → binding → contact =====
      select wechat_id into v_wxid
      from public.crm_wechat_name_snapshot
      where original_nickname = trim(v_token)
      limit 1;

      if v_wxid is not null then
        select bind_type, bind_id into v_bind
        from public.crm_wechat_binding
        where wechat_id = v_wxid
          and bind_type = 'customer_contact';

        if v_bind.bind_id is not null then
          select id, customer_id into v_contact
          from public.crm_customer_contact
          where id = v_bind.bind_id;

          if v_contact.customer_id is not null then
            update public.crm_wx_conversation
            set customer_id = v_contact.customer_id::text,
                primary_contact_id = v_contact.id
            where id = v_conv.id;

            -- 更新已有 wxid 的成员行
            update public.crm_wx_conversation_member
            set member_type = 'customer_contact',
                contact_id = v_contact.id
            where wechat_id = v_wxid
              and conversation_id = v_conv.id;

            conversation_id := v_conv.id;
            linked_customer_id := v_contact.customer_id::text;
            linked_contact_id := v_contact.id;
            match_path := 'snapshot';
            return next;
            exit;  -- 匹配到即停
          end if;
        end if;
      end if;

      -- ===== 路径②：token → 直接匹配 crm_customer_contact.wechat_name =====
      select id, customer_id into v_contact
      from public.crm_customer_contact
      where wechat_name = trim(v_token)
      limit 1;

      if v_contact.customer_id is null then
        continue;
      end if;

      -- 更新 conversation
      update public.crm_wx_conversation
      set customer_id = v_contact.customer_id::text,
          primary_contact_id = v_contact.id
      where id = v_conv.id;

      -- 更新 name:xxx 占位 member 行
      update public.crm_wx_conversation_member
      set member_type = 'customer_contact',
          contact_id = v_contact.id
      where wechat_id = 'name:' || trim(v_token)
        and conversation_id = v_conv.id;

      conversation_id := v_conv.id;
      linked_customer_id := v_contact.customer_id::text;
      linked_contact_id := v_contact.id;
      match_path := 'wechat_name';
      return next;
      exit;
    end loop;
  end loop;
end;
$$;

-- ========= AUTO-MATCH TRIGGERS (前端填写 wechat_name 后自动触发匹配) =========
create or replace function public.trg_on_wechat_name_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- 只在 wechat_name 从空→有值 或 值变化时触发
  if NEW.wechat_name is not null
     and (TG_OP = 'INSERT' or OLD.wechat_name is null or OLD.wechat_name <> NEW.wechat_name) then
    -- 先确保快照是最新的
    perform public.refresh_wechat_name_snapshot();
    -- 再执行自动匹配
    perform public.auto_match_wechat_bindings();
    -- 最后归因转发消息会话
    perform public.auto_link_forwarded_conversations();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_users_wechat_name on public.users;
create trigger trg_users_wechat_name
  after insert or update of wechat_name on public.users
  for each row execute function public.trg_on_wechat_name_change();

drop trigger if exists trg_contact_wechat_name on public.crm_customer_contact;
create trigger trg_contact_wechat_name
  after insert or update of wechat_name on public.crm_customer_contact
  for each row execute function public.trg_on_wechat_name_change();

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
      and tablename not in ('users', 'departments')
  loop
    perform app_meta.apply_open_policies(r.tablename);
  end loop;
end
$$;

-- ========= AUTH-BASED RLS POLICIES (departments) =========
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

-- departments 表：所有认证用户可读，仅管理员可写
alter table public.departments enable row level security;
drop policy if exists departments_select on public.departments;
drop policy if exists departments_insert on public.departments;
drop policy if exists departments_update on public.departments;
drop policy if exists departments_delete on public.departments;
create policy departments_select on public.departments for select to authenticated using (true);
create policy departments_insert on public.departments for insert to authenticated with check (public.is_admin());
create policy departments_update on public.departments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy departments_delete on public.departments for delete to authenticated using (public.is_admin());

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
