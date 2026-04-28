# 产品本体属性关系表实施计划

## 1. 需求分析

根据用户需求，需要新增一个产品本体对应的属性关系表，包含以下字段：
- 物料ID
- 主键（int类型、无符号、自动递增、唯一主键）
- 产品ID
- 品类状态（0下架 1正常 10违规）
- 商品状态（0下架 1正常 10违规）
- 产品名称
- 属性ID
- 属性名称
- 属性值
- 属性值ID
- 分类ID
- 分类名称

同时需要：
1. 同步修改new_version下supabase_tables.md文件
2. 在new_version文件夹下的migrations文件生成新修改的SQL

## 2. 实施步骤

### 步骤1：创建属性关系表的SQL迁移文件
- 在new_version/migrations目录下创建新的SQL文件
- 文件名建议：add_product_property_relation_table.sql
- 包含创建表的SQL语句，定义所有字段及其约束

### 步骤2：更新supabase_tables.md文档
- 在new_version/supabase_tables.md文件中添加新表的结构说明
- 按照现有文档格式，添加表结构的详细信息

### 步骤3：验证实施
- 确保SQL语句语法正确
- 确保文档更新完整准确
- 确保所有字段都已正确定义

## 3. 技术实现细节

### 表结构设计

| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|-------|------|
| id | int | not null unsigned auto_increment primary key | | 主键 |
| material_id | text | not null | | 物料ID |
| product_id | int | references ba_cpinfo(id) | | 产品ID |
| spu_status | int | not null | 1 | 品类状态（0下架 1正常 10违规） |
| product_status | int | not null | 1 | 商品状态（0下架 1正常 10违规） |
| product_name | text | not null | | 产品名称 |
| property_id | int | | | 属性ID |
| property_name | text | | | 属性名称 |
| property_value | text | | | 属性值 |
| property_value_id | int | | | 属性值ID |
| category_id | int | references ba_cptype(id) | | 分类ID |
| category_name | text | | | 分类名称 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### SQL创建语句

```sql
CREATE TABLE IF NOT EXISTS ba_product_property_relation (
    id int not null unsigned auto_increment primary key,
    material_id text not null,
    product_id int references ba_cpinfo(id),
    spu_status int not null default 1,
    product_status int not null default 1,
    product_name text not null,
    property_id int,
    property_name text,
    property_value text,
    property_value_id int,
    category_id int references ba_cptype(id),
    category_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

### 文档更新

在supabase_tables.md文件中添加新表的说明，按照现有格式组织。

## 4. 风险评估

- **风险1**：字段类型或约束定义不正确
  - 缓解措施：参考现有表结构，确保字段类型和约束与系统其他部分保持一致

- **风险2**：SQL语法错误
  - 缓解措施：仔细检查SQL语句，确保语法正确

- **风险3**：文档更新不完整
  - 缓解措施：对照表结构，确保文档中包含所有字段和约束

## 5. 预期结果

- 成功创建产品本体属性关系表
- 文档更新完整准确
- 生成正确的SQL迁移文件

## 6. 后续建议

- 考虑添加适当的索引以提高查询性能
- 考虑添加触发器或函数以自动更新updated_at字段
- 测试表的创建和基本操作