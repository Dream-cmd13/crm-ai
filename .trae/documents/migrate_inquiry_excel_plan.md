# 询盘数据 Excel 迁移计划

## 概要

创建一个基于 Node.js、`@supabase/supabase-js` 和 `xlsx` 的幂等增量迁移脚本，将从老系统导出的《询盘登记》Excel 文件解析并同步到新系统 PostgreSQL 的 `crm_inquiry` 表中。由于老系统持续产生数据，脚本需通过 `inquiry_no` 进行对比缓存，将记录分为 Insert 和 Upsert 两批执行，避免重复数据和唯一键冲突。

## 当前状态分析

1. **数据源**：老系统导出的 Excel 文件（如 `询盘登记_20260514.xlsx`），包含平铺的业务字段和一些关联的跟进表字段（多余的列如 `id_1`、`create_by_1`）。
2. **目标表**：`public.crm_inquiry`。其中 `id` 现已修改为 `integer`，旧系统的字符串 ID（如 `2054802322739798016`）无法直接映射到新库的 `id`。
3. **唯一标识**：`inquiry_no` 存在唯一约束，可作为幂等迁移的去重键。

## 迁移策略与提议更改

1. **构建迁移脚本**：在项目目录创建独立脚本 `migrate_inquiries_excel.js`。
2. **读取与解析**：使用 `xlsx` 库读取传入的 Excel 文件，提取第一张表的数据（过滤掉空行和因左连接产生的冗余列）。
3. **建立全量缓存池**：

   * 分页拉取目标库 `crm_inquiry` 的所有 `inquiry_no`，避免分页限制导致数据不全。

   * 分页拉取目标库 `ba_manucustinfo` 的 `name` -> `id` 映射，用于将询盘关联到系统客户 (`customer_id`)。
4. **数据清洗与批次分离**：

   * 根据预设的映射关系转换枚举、日期和分类值。

   * 判断 `inquiry_no` 是否存在于缓存池：若存在，放入 Upsert 批次；若不存在，放入 Insert 批次。
5. **执行同步**：按批次将数据写入 Supabase。

## 字段映射关系（请您核对调整）

| Excel 字段                       | 对应表字段 (`crm_inquiry`)         | 映射规则 / 处理逻辑                                     |
| :----------------------------- | :---------------------------- | :---------------------------------------------- |
| `inquiry_number` (询盘编号)        | `inquiry_no`                  | 唯一键，作为 Insert/Upsert 的判断依据                      |
| `name` (公司名称)                  | `company_name`                | 直接写入，并用于在 `ba_manucustinfo` 中查找对应 `customer_id` |
| `customer_name` (客户名称)         | `customer_name`               | 直接写入                                            |
| `contact_information` (联系方式)   | `contact`                     | 直接写入                                            |
| `source` (来源(渠道))              | `source_channel`              | 匹配枚举，映射: `其它` -> `其他`，空值跳过                      |
| `product_line` (分类(产品线))       | `classification_product_line` | 映射: IO:1, 工业:2, 加工:3, 接插件:4, 线束:5, 新能源:6, 原厂:7  |
| `product_series` (产品系列)        | `product_series`              | 直接写入                                            |
| `customer_situation` (客户情况)    | `situation`                   | 直接写入                                            |
| `customer_consultation` (客户咨询) | `customer_inquiry`            | 直接写入                                            |
| `remarks` (备注)                 | `notes`                       | 直接写入                                            |
| `related_clues` (关联线索)         | `associated_lead`             | 直接写入                                            |
| `enter_date` (日期)              | `create_date`                 | 日期格式清洗后写入                                       |
| `reason_for_non_conversion`    | `unconvert_reason`            | 直接写入                                            |
| `state` (状态)                   | `status`                      | 映射: `未转线索`->`关闭`, `转线索`->`已转线索`, `关闭`->`关闭`     |
| `create_by` (创建人)              | `creator_name`                | 直接写入                                            |
| `update_by` (更新人)              | `updater`                     | 直接写入                                            |
| `create_time` (创建日期)           | `created_at`                  | 转换至 PostgreSQL 兼容的 timestamptz 格式               |
| `update_time` (更新日期)           | `updated_at`                  | 转换至 PostgreSQL 兼容的 timestamptz 格式               |

**说明**：Excel 中未在上述列表中的字段（如旧 `id`、审核人、审批时间、单据状态、关联跟进信息如 `follow_up_with_n` 等）由于新表无对应字段，将暂时丢弃。若您需要保留某些额外字段，请在反馈中告知。

## 假设与决定

* **去重标识**：使用 `inquiry_number` 作为记录的唯一匹配标识，实现幂等（重复执行脚本不会产生脏数据）。

* **ID 策略**：旧系统产生的长整型 `id` 不被写入新系统，因为新系统的 `crm_inquiry.id` 约束为 `integer`（自动递增）。

* **外部依赖**：将利用 `xlsx` 和 `@supabase/supabase-js` 包来处理解析和入库操作。

## 验证步骤

1. 提供本计划让用户确认字段映射是否有误。
2. 确认无误后编写并执行 Node.js 迁移脚本。
3. 检查控制台输出的 Insert 和 Upsert 统计数量，验证 `crm_inquiry` 目标表中数据、枚举值和 `customer_id` 是否准确挂载。

