# ba_manucustinfo 客户编号字段更新计划

## 1. 任务概述

本计划旨在更新 `ba_manucustinfo` 表的客户编号字段，定义其生成规则为系统自动生成，格式如 CUS-20260317-001。

## 2. 需要进行的修改

### 2.1 更新 supabase_tables.md 文件

修改 `customer_number` 字段的描述，说明其生成规则：
- 格式：CUS-YYYYMMDD-XXX
- 说明：系统自动生成，CUS为前缀，YYYYMMDD为日期，XXX为当天序号

### 2.2 更新迁移 SQL 文件

确保迁移 SQL 文件中包含客户编号字段的正确定义和数据迁移逻辑。

## 3. 实现步骤

1. **修改 supabase_tables.md 文件**：
   - 更新 `ba_manucustinfo` 表中 `customer_number` 字段的描述

2. **更新迁移 SQL 文件**：
   - 更新 `modify_ba_manucustinfo.sql` 文件，确保客户编号字段的定义正确

## 4. 字段格式说明

客户编号格式为：CUS-YYYYMMDD-XXX
- CUS：固定前缀
- YYYYMMDD：创建日期（年月日）
- XXX：当天序号（三位数字，从001开始）

示例：CUS-20260317-001 表示 2026年3月17日创建的第一个客户

## 5. 总结

本计划详细说明了如何更新客户编号字段的定义，确保其符合系统自动生成的规则要求。