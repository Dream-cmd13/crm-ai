# Seed 数据更新计划

## 任务概述

根据 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/init.sql` 的表结构，更新 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/seed.sql`，为每个表生成 5-10 条种子数据。

## 数据量要求

每个表 5-10 条记录。

## 详细计划

### 需要扩展数据的表（当前不足 5 条）

| 表名 | 当前记录数 | 目标记录数 |
|------|----------|----------|
| ba_employeeinfo | 3 | 8 |
| ba_brand | 3 | 6 |
| ba_group | 3 | 5 |
| ba_cptype | 2 | 6 |
| ba_spu | 2 | 5 |
| public_property_name | 4 | 8 |
| public_property_value | 8 | 15 |
| crm_product_series | 2 | 6 |
| ba_cpinfo | 2 | 8 |
| ba_product_property_relation | 3 | 10 |
| ba_manucustinfo | 2 | 8 |
| ba_customer_user | 4 | 12 |
| crm_customer_contact | 2 | 10 |
| crm_customer_persona | 2 | 8 |
| crm_inquiry | 2 | 8 |
| crm_lead | 1 | 6 |
| crm_opportunity | 1 | 6 |
| crm_project | 1 | 6 |
| crm_task | 1 | 8 |
| crm_competitor | 2 | 6 |
| crm_customer_competitor | 1 | 8 |
| crm_customer_focus_swot | 1 | 8 |
| crm_customer_focus_competitor | 1 | 8 |
| crm_stakeholder_assessment | 1 | 6 |
| crm_quotation | 1 | 6 |
| crm_quotation_item | 1 | 8 |
| crm_sales_order | 1 | 8 |
| crm_sales_order_item | 1 | 10 |
| crm_sample_order | 1 | 6 |
| crm_sample_order_item | 1 | 8 |
| crm_return_order | 1 | 5 |
| crm_return_order_item | 1 | 6 |
| crm_purchase_quotation | 1 | 5 |
| crm_purchase_quotation_item | 1 | 8 |
| crm_potential_customer | 2 | 6 |
| crm_task_type | 3 | 5 |

### 已有足够数据的表（保持现状）

- ba_product_line (6)
- crm_ontology_object (5)
- crm_ontology_property (待定)
- crm_ontology_relation (待定)
- crm_ontology_flow (待定)
- crm_ontology_node (待定)

### 数据关联关系

需要保持外键关联的正确性：

1. **客户相关**：ba_manucustinfo (8条) → ba_customer_user (12条) → crm_customer_contact (10条)
2. **产品相关**：ba_cptype → ba_cpinfo → ba_product_property_relation
3. **CRM 管道**：crm_inquiry (8条) → crm_lead (6条) → crm_opportunity (6条) → crm_project (6条)
4. **销售文档**：crm_quotation (6条) → crm_quotation_item (8条)
5. **订单**：crm_sales_order (8条) → crm_sales_order_item (10条)
6. **样品订单**：crm_sample_order (6条) → crm_sample_order_item (8条)
7. **售后**：crm_return_order (5条) → crm_return_order_item (6条)
8. **采购报价**：crm_purchase_quotation (5条) → crm_purchase_quotation_item (8条)

## 实施步骤

1. 扩展基础表数据（ba_employeeinfo, ba_brand, ba_group, ba_cptype, ba_spu）
2. 扩展属性表数据（public_property_name, public_property_value）
3. 扩展产品相关表（crm_product_series, ba_cpinfo, ba_product_property_relation）
4. 扩展客户相关表（ba_manucustinfo, ba_customer_user, crm_customer_contact, crm_customer_persona）
5. 扩展 CRM 管道表（crm_inquiry, crm_lead, crm_opportunity, crm_project）
6. 扩展任务和竞争对手表（crm_task, crm_competitor, crm_customer_competitor, crm_customer_focus_swot, crm_customer_focus_competitor, crm_stakeholder_assessment）
7. 扩展销售文档表（crm_quotation, crm_quotation_item）
8. 扩展订单表（crm_sales_order, crm_sales_order_item）
9. 扩展样品订单表（crm_sample_order, crm_sample_order_item）
10. 扩展售后表（crm_return_order, crm_return_order_item）
11. 扩展采购报价表（crm_purchase_quotation, crm_purchase_quotation_item）
12. 扩展潜在客户表（crm_potential_customer, crm_task_type）

## 文件修改

- `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/seed.sql` - 重写，更新所有数据