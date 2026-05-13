alter table public.ba_manucustinfo
  add column if not exists potential_customer_id text;

create index if not exists idx_ba_manucustinfo_potential_customer_id
  on public.ba_manucustinfo(potential_customer_id);

update public.ba_manucustinfo
set potential_customer_id = customer_number
where level = '潜在客户'
  and coalesce(btrim(potential_customer_id), '') = ''
  and customer_number is not null
  and customer_number !~ '^KH[0-9]{8}[0-9]{6}$';

update public.ba_manucustinfo
set customer_number = public.generate_customer_number()
where level = '潜在客户'
  and potential_customer_id is not null
  and customer_number !~ '^KH[0-9]{8}[0-9]{6}$';
