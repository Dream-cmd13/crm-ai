begin;

alter table if exists public.crm_inquiry
  add column if not exists product_series text not null default '';

comment on column public.crm_inquiry.product_series is '询盘产品系列（兼容历史库补齐）';

commit;
