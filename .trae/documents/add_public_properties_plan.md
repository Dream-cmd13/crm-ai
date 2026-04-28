# 新增公共属性表计划

## 1. 需求分析

用户要求新增两个公共属性相关的表：

### 1.1 公共属性名表
- 字段：规格名称、主键、分组名称、图、是否参与搜索（1是 0否）
- 主键为int类型、无符号、自动递增、唯一主键

### 1.2 公共规格属性值表
- 字段：主键、所属属性ID、属性值、属性值图、公共属性名
- 主键为int类型、无符号、自动递增、唯一主键

## 2. 实现计划

### 2.1 更新 supabase_tables.md 文件
- 在 `new_version/supabase_tables.md` 文件中添加两个新表的定义
- 遵循现有的表结构格式和命名规范
- 确保字段类型和约束符合要求

### 2.2 生成迁移 SQL 文件
- 在 `new_version/migrations/` 目录下创建新的迁移文件
- 包含创建两个新表的 SQL 语句
- 确保主键设置正确（int类型、无符号、自动递增、唯一）
- 添加适当的外键约束（公共规格属性值表引用公共属性名表）

### 2.3 表结构设计

#### 公共属性名表 (`public_property_name`)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|-------|------|
| id | int | not null unsigned auto_increment primary key | | 主键 |
| specification_name | text | not null | | 规格名称 |
| group_name | text | | | 分组名称 |
| image | text | | | 图 |
| is_searchable | int | not null | 1 | 是否参与搜索（1是 0否） |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

#### 公共规格属性值表 (`public_property_value`)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|-------|------|
| id | int | not null unsigned auto_increment primary key | | 主键 |
| property_id | int | not null references public_property_name(id) | | 所属属性ID |
| property_value | text | not null | | 属性值 |
| property_value_image | text | | | 属性值图 |
| public_property_name | text | not null | | 公共属性名 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 3. 执行步骤

1. **更新 supabase_tables.md**：添加两个新表的定义
2. **创建迁移文件**：生成包含创建表语句的 SQL 文件
3. **验证结构**：确保表结构符合要求，特别是主键设置和外键约束

## 4. 风险评估

- **数据类型**：确保所有字段类型选择正确，特别是主键类型
- **外键约束**：确保公共规格属性值表正确引用公共属性名表
- **命名规范**：确保表名和字段名符合项目现有的命名规范
- **默认值**：为适当的字段设置合理的默认值

## 5. 预期结果

- 两个新表成功添加到数据库结构中
- 迁移文件正确生成，可用于数据库更新
- 表结构符合用户要求的所有字段和约束