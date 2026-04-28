# 合并 migrations 到 init/seed 执行计划

## 1. Summary

- 目标：将 `new_version/migrations` 下已生成的 SQL 变更合并进 `supabase/rebuild/init.sql`，并据此更新 `supabase/rebuild/seed.sql`。
- 约束：保持初始化脚本可重复执行（idempotent）和可在空库直接落地；不把“历史数据修复”逻辑塞入初始化路径。
- 验收口径：以 `init.sql` 执行成功且随后 `seed.sql` 执行成功为通过标准（无报错）。

## 2. Current State Analysis

- 已确认迁移目录：`new_version/migrations` 当前包含 3 个文件：
  - `add_ba_customer_user.sql`
  - `fix_ba_manucustinfo_trigger_case_when_error.sql`
  - `merge_customer_number_migration.sql`
- `supabase/rebuild/init.sql` 当前已包含主体 schema、`app_meta` 触发器工具函数、全表开放 RLS 策略、索引与事务边界。
- `supabase/rebuild/seed.sql` 当前未包含 `ba_customer_user` 的种子数据；其余主数据与业务样例数据较完整。
- 关键冲突点：
  - `merge_customer_number_migration.sql` 含面向历史库的数据 `UPDATE` 与结尾验证 `SELECT`，属于迁移修复语义，不适合直接并入“空库初始化”主路径。
  - `add_ba_customer_user.sql` 含独立 `begin/commit` 与策略语句，需要按 `init.sql` 结构做内联整合（避免嵌套事务片段风格不一致）。

## 3. Proposed Changes

### 3.1 修改 `supabase/rebuild/init.sql`

- 合并 `add_ba_customer_user.sql` 的结构性变更：
  - 在基础表定义区域新增 `public.ba_customer_user` 建表语句（保留与 `ba_manucustinfo(id)` 的外键关联）。
  - 合并该表注释、索引（`idx_ba_customer_user_customer_id`）、`updated_at` 触发器接入、RLS 开放策略覆盖。
- 合并客户编号触发器修复逻辑（结构对象）：
  - 采用 `fix_ba_manucustinfo_trigger_case_when_error.sql` 中的 `generate_customer_number()`、`set_customer_number()`、`trigger_set_customer_number` 实现。
  - 在 `init.sql` 内以 `drop if exists + create or replace` 方式定义，保证可重复执行。
- 处理 `merge_customer_number_migration.sql`：
  - 仅吸收“结构对象层”有效内容（函数/触发器/索引思想），不并入历史数据 `UPDATE`、临时序列迁移与末尾验收 `SELECT`。
  - 最终以 `fix` 脚本逻辑为准，避免初始化脚本携带数据迁移副作用。
- 兼容性与顺序控制：
  - 保证 `ba_manucustinfo` 表定义在触发器创建前。
  - 保证 `app_meta` 函数定义在 `attach_updated_at_trigger('ba_customer_user')` 调用前，或沿用现有批量附加机制把 `ba_customer_user` 纳入 `updated_tables`。

### 3.2 修改 `supabase/rebuild/seed.sql`

- 新增 `ba_customer_user` 种子数据：
  - 基于现有 `ba_manucustinfo` 种子主键（如 `1/2`）插入 2~4 条联系人/账号样例数据。
  - 字段覆盖 `member_name/contact_name/phone/email/is_primary/status/source`，确保业务字段可用。
- 对齐新初始化约束与语义：
  - 检查并确保 `seed.sql` 中所有外键引用在插入顺序上满足依赖（先客户后客户用户）。
  - 对可能受客户编号触发器影响的场景保持显式值可插入，不引入与触发器逻辑冲突的语句。
- 维持可重放特性：
  - 保持当前 `begin/commit` 结构，不引入会导致二次执行硬冲突的新主键样例（按现有脚本风格处理）。

### 3.3 验收与无报错检查

- 以“空库初始化 + 种子导入”验证：
  1. 执行 `init.sql`，确认事务提交成功、无 SQL 报错。
  2. 在同库执行 `seed.sql`，确认事务提交成功、无 SQL 报错。
- 建议附加快速检查（作为执行时的辅助输出，不改变验收主标准）：
  - `ba_customer_user` 可查询且有数据。
  - 客户编号函数与触发器对象存在（`pg_proc` / `pg_trigger`）。

## 4. Assumptions & Decisions

- 已确认决策：
  - `merge_customer_number_migration.sql` 采用“仅并入结构对象”的策略。
  - 验收标准为“`init.sql` + `seed.sql` 全量执行成功不报错”。
- 关键假设：
  - 本次“migrations 文件夹”即 `new_version/migrations` 当前 3 个 SQL 文件。
  - 验收环境为可执行 PostgreSQL/Supabase SQL 的标准环境（本地或远端均可），以执行结果为准。

## 5. Verification Steps

1. 语义核对：逐条对照 3 个 migration 文件，确认应合并项都已进入 `init.sql`，应剔除的数据迁移项未进入。
2. 依赖核对：确认 `ba_customer_user` 外键、索引、触发器、RLS 在 `init.sql` 中顺序正确。
3. 执行核对：在空库顺序执行 `init.sql` 与 `seed.sql`，记录无报错结果。
4. 结果核对：抽查 `ba_customer_user`、`ba_manucustinfo`、相关触发器对象存在性与基础可查询性。
