# Migration 合并计划

## 任务概述

将 `/Users/hvai/trae/crm-ai-v3.8/new_version/migrations/` 文件夹下的 6 个 SQL 文件合并到 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/init.sql`，并更新 `seed.sql` 以适配新的表结构。

## Migration 文件分析

| 文件 | 内容 |
|------|------|
| 01_add_purchase_quotation_tables.sql | 新增采购报价单表（crm_purchase_quotation、crm_purchase_quotation_item） |
| 02_upgrade_sample_order_schema.sql | 升级样品订单表，添加新字段，将 id 改为 integer，添加枚举类型 |
| 03_add_sales_order_schema.sql | 修改销售订单表，添加新字段，将 id 改为 integer，添加枚举类型 |
| 04_upgrade_after_sale_schema.sql | 升级售后订单表，添加新字段，将 id 改为 integer |
| 05_update_quotation_tables.sql | 修改报价单表，添加新字段，将 id 改为 integer，添加枚举类型 |
| 06_modify_crm_tables_id.sql | 修改多个 CRM 表（product_series、inquiry、lead、opportunity、project）的 id 类型为 integer |

## 实施步骤

### 步骤 1：合并 migration 到 init.sql

需要更新/新增以下内容：

1. **新增枚举类型**：
   - crm_sample_order_status_enum
   - crm_sales_order_status_enum
   - crm_quotation_status_enum

2. **新增表**：
   - crm_purchase_quotation
   - crm_purchase_quotation_item

3. **修改表结构**（将 id 从 text 改为 serial/integer）：
   - crm_sales_order / crm_sales_order_item
   - crm_sample_order / crm_sample_order_item
   - crm_return_order / crm_return_order_item
   - crm_quotation / crm_quotation_item
   - crm_product_series
   - crm_inquiry
   - crm_lead
   - crm_opportunity
   - crm_project

4. **添加新字段**：各表的新增业务字段

5. **更新索引和约束**

### 步骤 2：更新 seed.sql

根据新的表结构更新种子数据，特别是：
- 将 id 字段改为 integer 类型
- 添加新字段的种子数据
- 确保外键关联正确

### 步骤 3：验证 SQL 语法

使用 psql 或其他工具验证生成的 SQL 文件是否正确。

## 注意事项

1. migration 文件中的一些逻辑是针对已有数据的迁移（如 alter column type），在 init.sql 中需要转换为创建表时直接使用正确的类型
2. 需要处理外键依赖关系，确保引用完整性
3. 需要保持触发器和 RLS 策略的一致性

## 文件修改清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| supabase/rebuild/init.sql | 重写 | 合并所有 migration 变更 |
| supabase/rebuild/seed.sql | 更新 | 适配新表结构 |

## 执行顺序

1. 先创建/更新 init.sql
2. 验证 init.sql 语法
3. 更新 seed.sql
4. 验证 seed.sql 语法
