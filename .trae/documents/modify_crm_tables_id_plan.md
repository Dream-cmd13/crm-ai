# CRM表ID字段修改计划

## 需求分析

根据业务需求，需要对以下5个CRM相关表进行结构调整：

| 表名 | 修改内容 |
|------|----------|
| crm_product_series | id改为int类型、无符号、自动递增、唯一主键；新增系列编号字段 |
| crm_inquiry | id改为int类型、无符号、自动递增、唯一主键；新增询盘编号字段 |
| crm_lead | id改为int类型、无符号、自动递增、唯一主键；新增线索编号字段 |
| crm_opportunity | id改为int类型、无符号、自动递增、唯一主键；新增商机编号字段 |
| crm_project | id改为int类型、无符号、自动递增、唯一主键；新增项目编号字段 |

## 涉及文件

1. **new_version/supabase_tables.md** - 表结构文档，需要同步更新
2. **new_version/migrations/** - 需要生成新的SQL迁移文件

## 修改方案

### 1. supabase_tables.md 修改

对每个表进行以下修改：
- `id`字段：将`text primary key`改为`int not null auto_increment primary key`
- 新增编号字段：`{table_prefix}_no`（如`series_no`），类型为`text`，默认值为空字符串

### 2. 生成迁移SQL文件

创建新的迁移文件 `20260428_06_modify_crm_tables_id.sql`，包含：

#### crm_product_series 表
- 添加新的自增ID字段
- 转换现有数据
- 删除旧ID字段并重命名新字段
- 添加无符号约束
- 添加系列编号字段

#### crm_inquiry 表
- 添加新的自增ID字段
- 转换现有数据（处理外键关系）
- 删除旧ID字段并重命名新字段
- 添加无符号约束
- 添加询盘编号字段

#### crm_lead 表
- 添加新的自增ID字段
- 转换现有数据（处理外键关系）
- 删除旧ID字段并重命名新字段
- 添加无符号约束
- 添加线索编号字段

#### crm_opportunity 表
- 添加新的自增ID字段
- 转换现有数据（处理外键关系）
- 删除旧ID字段并重命名新字段
- 添加无符号约束
- 添加商机编号字段

#### crm_project 表
- 添加新的自增ID字段
- 转换现有数据（处理外键关系）
- 删除旧ID字段并重命名新字段
- 添加无符号约束
- 添加项目编号字段

## 依赖关系分析

需要注意以下外键依赖关系：

| 表名 | 被引用字段 | 引用表 | 引用字段 |
|------|-----------|--------|---------|
| crm_lead | inquiry_id | crm_inquiry | id |
| crm_lead | contact_id | crm_customer_contact | id |
| crm_opportunity | lead_id | crm_lead | id |
| crm_opportunity | inquiry_id | crm_inquiry | id |
| crm_project | lead_id | crm_lead | id |
| crm_project | opportunity_id | crm_opportunity | id |
| crm_project | inquiry_id | crm_inquiry | id |

由于涉及外键关系，需要按照正确顺序执行迁移：
1. crm_product_series（无外键依赖）
2. crm_inquiry
3. crm_lead
4. crm_opportunity
5. crm_project

## 执行步骤

1. 修改 `new_version/supabase_tables.md` 文档中5个表的结构定义
2. 在 `new_version/migrations/` 目录下创建新的迁移SQL文件
3. 确保SQL文件遵循现有格式规范（使用do块、exists检查等）

## 风险评估

- **数据迁移风险**：修改主键字段涉及数据迁移，需要确保数据完整性
- **外键依赖风险**：需要正确处理外键关系，避免数据丢失
- **回滚风险**：建议在执行前备份数据库

## 输出文件

1. `new_version/supabase_tables.md` - 更新后的表结构文档
2. `new_version/migrations/20260428_06_modify_crm_tables_id.sql` - 新的迁移SQL文件