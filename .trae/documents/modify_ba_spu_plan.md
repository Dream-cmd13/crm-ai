# 品类表（ba_spu）修改计划

## 1. 任务目标

修改现有的品类表（ba_spu）结构，使其符合以下要求：
- 主键为int类型、无符号、自动递增、唯一主键
- 品牌ID关联品牌表（ba_brand）
- 同步更新supabase_tables.md文档
- 生成SQL迁移文件

## 2. 现有表结构分析

根据new_version/supabase_tables.md文件，当前ba_spu表结构如下：

| 字段名                      | 数据类型        | 约束                                            | 默认值    | 描述               |
| ------------------------ | ----------- | --------------------------------------------- | ------ | ---------------- |
| id                       | int         | not null unsigned auto_increment primary key | <br /> | 主键               |
| spu_no                  | text        | not null                                      | <br /> | 品类编号             |
| spu_name                | text        | not null                                      | <br /> | 品类名称             |
| category_id             | int         | references ba_cptype(id)                     | <br /> | 分类ID             |
| category_name           | text        | <br />                                        | <br /> | 分类名称             |
| product_drawing         | text        | <br />                                        | <br /> | 产品图纸             |
| status                   | int         | not null                                      | 1      | 状态（0下架 1正常 10违规） |
| brand                    | text        | <br />                                        | <br /> | 品牌               |
| supplier                 | text        | <br />                                        | <br /> | 供应商              |
| supplier_no             | text        | <br />                                        | <br /> | 供应商号             |
| supplier_material_no   | text        | <br />                                        | <br /> | 供应商物料号           |
| supplier_material_name | text        | <br />                                        | <br /> | 供应商物料名称          |
| brand_id                | text        | <br />                                        | <br /> | 品牌ID             |
| brand_name              | text        | <br />                                        | <br /> | 品牌名称             |
| created_at              | timestamptz | not null                                      | now()  | 创建时间             |
| updated_at              | timestamptz | not null                                      | now()  | 更新时间             |

## 3. 需要修改的内容

1. **主键类型**：保持int类型，但需要确保是无符号、自动递增、唯一主键
2. **品牌ID关联**：将brand_id字段类型从text改为int，并添加外键关联到ba_brand(id)
3. **移除冗余字段**：brand字段可能是冗余的，因为已经有brand_id和brand_name

## 4. 实施步骤

### 步骤1：更新supabase_tables.md文档

修改ba_spu表的结构定义，主要修改：
- 确保id字段的约束正确
- 将brand_id字段类型改为int，并添加外键约束
- 移除冗余的brand字段

### 步骤2：生成SQL迁移文件

创建新的SQL迁移文件，包含：
- 修改ba_spu表结构的SQL语句
- 确保brand_id字段与ba_brand表的关联

### 步骤3：验证修改

确保修改后的表结构符合要求，特别是：
- 主键设置正确
- 品牌ID关联正确
- 所有字段都已正确定义

## 5. 风险评估

- **数据迁移风险**：如果表中已有数据，修改brand_id字段类型可能会导致数据丢失或类型转换错误
- **外键约束风险**：添加外键约束可能会导致现有数据违反约束

## 6. 解决方案

- 对于数据迁移风险：建议在修改前备份数据，或使用适当的类型转换
- 对于外键约束风险：确保所有brand_id值都对应ba_brand表中的有效ID

## 7. 预期结果

- ba_spu表结构符合要求
- supabase_tables.md文档已更新
- 生成了相应的SQL迁移文件
- 表结构能够正确关联品牌表