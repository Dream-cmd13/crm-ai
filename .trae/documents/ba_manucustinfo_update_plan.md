# ba_manucustinfo 表更新计划

## 1. 任务概述

本计划旨在更新 `ba_manucustinfo` 表（客户本体），添加新字段并修改现有字段类型，以满足业务需求。同时同步更新相关文件并生成迁移 SQL。

## 2. 现有表结构分析

当前 `ba_manucustinfo` 表结构如下：

| 字段名                              | 数据类型        | 约束          | 默认值    | 描述       |
| -------------------------------- | ----------- | ----------- | ------ | -------- |
| id                               | text        | primary key | <br /> | 客户ID     |
| name                             | text        | not null    | <br /> | 客户名称     |
| level                            | text        | not null    | '普通客户' | 客户等级     |
| status                           | text        | not null    | '活跃'   | 状态       |
| industry                         | text        | <br />      | <br /> | 行业       |
| source                           | text        | <br />      | <br /> | 来源       |
| region                           | text        | <br />      | <br /> | 地区       |
| sales_rep                        | text        | <br />      | <br /> | 销售代表     |
| payment_term                     | text        | <br />      | <br /> | 付款条件     |
| has_payment_term                 | boolean     | <br />      | false  | 是否有付款条件  |
| customer_type                    | text        | <br />      | <br /> | 客户类型     |
| merchandiser                     | text        | <br />      | <br /> | 跟单员      |
| is_public_pool                   | boolean     | <br />      | false  | 是否公共池    |
| month_settlement_apply_status    | text        | <br />      | <br /> | 月结申请状态   |
| business_manager                 | text        | <br />      | <br /> | 业务经理     |
| currency                         | text        | <br />      | <br /> | 货币       |
| customer_category                | text        | <br />      | <br /> | 客户类别     |
| group_name                       | text        | <br />      | <br /> | 集团名称     |
| is_listed_company                | boolean     | <br />      | false  | 是否上市公司   |
| short_name                       | text        | <br />      | <br /> | 简称       |
| english_name                     | text        | <br />      | <br /> | 英文名      |
| insured_count                    | int         | <br />      | <br /> | 参保人数     |
| paid_in_capital                  | text        | <br />      | <br /> | 实缴资本     |
| last_visit_date                  | date        | <br />      | <br /> | 最后访问日期   |
| last_contact_time                | timestamptz | <br />      | <br /> | 最后联系时间   |
| last_contact_action              | text        | <br />      | <br /> | 最后联系动作   |
| legal_person                     | text        | <br />      | <br /> | 法人       |
| registered_capital               | text        | <br />      | <br /> | 注册资本     |
| industry_level_1                 | text        | <br />      | <br /> | 行业一级     |
| industry_level_2                 | text        | <br />      | <br /> | 行业二级     |
| industry_level_3                 | text        | <br />      | <br /> | 行业三级     |
| employee_count                   | text        | <br />      | <br /> | 员工数量     |
| establishment_date               | date        | <br />      | <br /> | 成立日期     |
| unified_social_credit_code       | text        | <br />      | <br /> | 统一社会信用代码 |
| company_address                  | text        | <br />      | <br /> | 公司地址     |
| company_type                     | text        | <br />      | <br /> | 公司类型     |
| fax_number                       | text        | <br />      | <br /> | 传真号码     |
| month_settlement_attachment      | text        | <br />      | <br /> | 月结附件     |
| month_settlement_agreement       | text        | <br />      | <br /> | 月结协议     |
| business_scope                   | text        | <br />      | <br /> | 经营范围     |
| website                          | text        | <br />      | <br /> | 网站       |
| created_at                       | timestamptz | not null    | now()  | 创建时间     |
| updated_at                       | timestamptz | not null    | now()  | 更新时间     |

## 3. 需要进行的修改

### 3.1 字段类型修改

| 字段名                              | 当前类型    | 新类型 | 说明                              |
| -------------------------------- | ------- | ---- | ------------------------------- |
| id                               | text    | int  | 修改为自增主键                         |
| status                           | text    | int  | 1正常, 0冻结                        |
| source                           | text    | int  | 1:展会收集, 2:朋友介绍, 3:网络推广, 4:客户转介绍, 5:个人观察, 6:网上搜索, 7:电商平台 |
| payment_term                     | text    | int  | 3:30天, 6:60天, 9:90天, 12:12天      |
| has_payment_term                 | boolean | int  | 0:未有账期, 1:有账期                    |
| customer_type                    | text    | int  | 0:普通企业, 1:认证企业, 2:个人            |
| month_settlement_apply_status    | text    | int  | 0:未申请, 1:申请中, 2:已通过, 3:已拒绝       |
| customer_category                | text    | int  | 0:空, 1:直销商, 2:经销商                  |
| region                           | text    | int  | 1:东北地区, 2:华北地区, 3:西北地区, 4:华东地区, 5:华南地区, 6:西南地区, 7:港澳台地区, 8:国外, 9:华中地区 |

### 3.2 新增字段

| 字段名           | 数据类型 | 约束 | 默认值 | 描述         |
| ------------- | ---- | ---- | --- | ---------- |
| customer_number | text | not null | <br /> | 客户编号       |
| merchandiser_id | text | <br /> | <br /> | 跟单员ID      |
| currency_id    | int  | <br /> | <br /> | 币别ID (1:人民币, 2:美元) |

## 4. 实现步骤

1. **修改 supabase_tables.md 文件**：
   - 更新 `ba_manucustinfo` 表的字段定义，包括类型修改和新增字段

2. **生成迁移 SQL 文件**：
   - 创建新的迁移文件 `modify_ba_manucustinfo.sql`
   - 包含字段类型修改和新增字段的 SQL 语句

3. **验证修改**：
   - 确保所有字段都已正确定义
   - 确保迁移 SQL 语句正确无误

## 5. 技术实现细节

### 5.1 字段类型修改

- 将 `id` 字段从 `text` 类型修改为 `int` 类型，并设置为自增主键
- 将多个字段从 `text` 或 `boolean` 类型修改为 `int` 类型，以支持枚举值

### 5.2 新增字段

- 添加 `customer_number` 字段，使用与之前系统生成 id 相同的规则
- 添加 `merchandiser_id` 字段，用于存储跟单员的 ID
- 添加 `currency_id` 字段，用于存储币别的 ID

### 5.3 迁移 SQL 生成

- 使用 `ALTER TABLE` 语句修改现有字段类型
- 使用 `ADD COLUMN` 语句添加新字段
- 确保迁移过程中不会丢失现有数据

## 6. 风险评估

1. **数据类型转换风险**：将字段类型从 `text` 或 `boolean` 转换为 `int` 可能会导致数据丢失，需要确保转换过程中数据的一致性。

2. **主键修改风险**：将 `id` 字段从 `text` 类型修改为 `int` 类型可能会影响依赖此字段的其他表，需要确保所有相关表都能正确处理这种变化。

3. **业务逻辑影响**：字段类型和枚举值的变化可能会影响现有的业务逻辑，需要确保所有相关代码都能正确处理这些变化。

## 7. 解决方案

1. **数据类型转换**：
   - 对于 `status`、`source` 等字段，需要先将现有文本值映射到对应的枚举值
   - 对于 `has_payment_term` 字段，需要将 `true` 映射为 1，`false` 映射为 0

2. **主键修改**：
   - 由于修改主键类型是一个复杂的操作，可能需要创建新表并迁移数据
   - 或者使用数据库的特定功能来实现类型转换

3. **业务逻辑调整**：
   - 确保所有依赖这些字段的代码都能正确处理新的类型和枚举值
   - 更新相关的前端和后端代码以适应这些变化

## 8. 总结

本计划详细说明了如何更新 `ba_manucustinfo` 表，包括字段类型修改和新增字段。通过仔细的规划和实施，可以确保这些变化不会影响现有业务逻辑，同时满足新的业务需求。