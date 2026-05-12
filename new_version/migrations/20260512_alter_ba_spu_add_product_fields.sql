-- 为产品品类表补充业务字段
alter table if exists public.ba_spu
  add column if not exists product_no text,
  add column if not exists industry text,
  add column if not exists eco_property text,
  add column if not exists certification_standard text,
  add column if not exists product_drawings jsonb not null default '[]'::jsonb,
  add column if not exists product_image text,
  add column if not exists packaging_method text,
  add column if not exists min_order_qty numeric(18,2);

comment on column public.ba_spu.product_no is '产品编号';
comment on column public.ba_spu.industry is '所属行业';
comment on column public.ba_spu.eco_property is '环保性质';
comment on column public.ba_spu.certification_standard is '认证标准';
comment on column public.ba_spu.product_drawings is '产品图纸（附件数组）';
comment on column public.ba_spu.product_image is '产品主图（URL或dataURL）';
comment on column public.ba_spu.packaging_method is '包装方式';
comment on column public.ba_spu.min_order_qty is '最小起订量';

-- 产品编号唯一（兼容历史数据允许为空/空字符串重复）
create unique index if not exists idx_ba_spu_product_no_unique
  on public.ba_spu (product_no)
  where product_no is not null and product_no <> '';
