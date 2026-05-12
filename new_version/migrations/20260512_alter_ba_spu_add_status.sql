-- 为产品品类表补充状态字段（0下架 1正常 10违规）
alter table if exists public.ba_spu
  add column if not exists status integer not null default 1;

do $$
begin
  if not exists (
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

comment on column public.ba_spu.status is '状态（0下架 1正常 10违规）';
