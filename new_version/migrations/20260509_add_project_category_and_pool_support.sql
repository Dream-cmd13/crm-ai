-- 为项目表新增项目类别字段（定制项目/标准项目）
alter table if exists public.crm_project
  add column if not exists project_category text;

-- 增加取值约束（兼容历史数据允许为空）
do $$
begin
  if not exists (
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

comment on column public.crm_project.project_category is '项目类别：定制项目/标准项目';
