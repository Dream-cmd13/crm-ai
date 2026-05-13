alter table if exists public.crm_inquiry
  add column if not exists classification_product_line integer;

alter table if exists public.crm_lead
  add column if not exists classification_product_line integer;

do $$
begin
  if not exists (
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

do $$
begin
  if not exists (
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
