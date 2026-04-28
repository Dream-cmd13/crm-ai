# ba_cpinfo（产品本体）表结构修改计划

## 1. 任务概述

修改 `ba_cpinfo`（产品本体）表结构，包括：
- id 字段改为 int 类型、自动递增、唯一主键
- 新增多个业务字段
- 商品状态值修改
- 同步更新 supabase_tables.md 文档
- 生成 migration SQL 文件

---

## 2. 详细实施步骤

### 2.1 分析现有 ba_cpinfo 表结构

**当前表结构** (`new_version/supabase_tables.md` 第 49-64 行)：

| 字段名            | 数据类型          | 约束                        | 默认值    | 描述   |
| -------------- | ------------- | ------------------------- | ------ | ---- |
| id             | text          | primary key               | <br /> | 产品ID |
| category_id   | int           | references ba_cptype(id) | <br /> | 分类ID |
| category_name | text          | <br />                    | <br /> | 分类名称 |
| material_no   | text          | not null                  | <br /> | 物料编号 |
| material_name | text          | not null                  | <br /> | 物料名称 |
| specification  | text          | <br />                    | <br /> | 规格   |
| unit           | text          | not null                  | <br /> | 单位   |
| price          | numeric(18,2) | not null                  | 0      | 价格   |
| min_price     | numeric(18,2) | <br />                    | <br /> | 最低价格 |
| status         | text          | not null                  | '{}'   | 状态   |
| created_at    | timestamptz   | not null                  | now()  | 创建时间 |
| updated_at    | timestamptz   | not null                  | now()  | 更新时间 |

---

### 2.2 新增字段清单

| 序号 | 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
| --- | --- | --- | --- | --- | --- |
| 1 | brand_id | int | references ba_brand(id) | null | 品牌ID |
| 2 | brand_name | text | - | null | 品牌名称 |
| 3 | min_pack_qty | numeric(18,2) | - | 0 | 最小包装量 |
| 4 | min_order_qty | numeric(18,2) | - | 0 | 最小起订量 |
| 5 | outsource_supplier_drawing | text | - | null | 外发供应商图纸 |
| 6 | drawing_3d | text | - | null | 3D图纸 |
| 7 | supplier | text | - | null | 供应商 |
| 8 | supplier_no | text | - | null | 供应商号 |
| 9 | supplier_material_no | text | - | null | 供应商物料号 |
| 10 | supplier_material_name | text | - | null | 供应商物料名称 |
| 11 | product_line_level1_id | int | references ba_product_line(id) | null | 产品线一级id |
| 12 | product_line_level2_id | int | references ba_product_line(id) | null | 产品线二级id |
| 13 | product_belonging | int | - | -1 | 产品归属 (0胜蓝平移/1万连自制/2委外料号/3生产料号/4万连生产料号/-1无) |
| 14 | group_id | int | references ba_group(id) | null | 归属小组ID |
| 15 | group_name | text | - | null | 归属小组名称 |
| 16 | outsource_customer_drawing | text | - | null | 外发客户图纸 |
| 17 | customer_original_drawing | text | - | null | 客户原图纸 |
| 18 | change_drawing_detail | text | - | null | 变更图纸详情 |
| 19 | specification_doc | text | - | null | 规格书 |
| 20 | inspection_standard | text | - | null | 检验基准书 |
| 21 | spu_id | int | references ba_spu(id) | null | 品类ID |
| 22 | spu_name | text | - | null | 品类名称 |
| 23 | platform_material_no | text | - | null | 平台料号 |
| 24 | material_lead_time | int | - | null | 物料交期(天) |
| 25 | packaging_method | text | - | null | 包装方式 |
| 26 | packaging_spec | text | - | null | 包装规格 |

---

### 2.3 字段修改清单

| 序号 | 字段名 | 原类型 | 新类型 | 约束变化 |
| --- | --- | --- | --- | --- |
| 1 | id | text | int | primary key, auto_increment, not null |
| 2 | status | text | int | not null, 默认 1 (正常) |

---

### 2.4 修改文件清单

1. **`new_version/supabase_tables.md`**
   - 更新 ba_cpinfo 表定义，新增字段，修改 id 和 status 字段

2. **`new_version/migrations/modify_ba_cpinfo.sql`** (新建)
   - 创建 migration SQL 文件，包含完整的表结构修改

---

### 2.5 具体实施步骤

#### 步骤 1: 创建 migration SQL 文件

文件: `new_version/migrations/modify_ba_cpinfo.sql`

内容应包含：
```sql
-- 修改 ba_cpinfo 表结构
-- 1. id 改为 int 类型、自动递增、唯一主键
-- 2. 新增多个业务字段
-- 3. status 改为 int 类型
```

#### 步骤 2: 更新 supabase_tables.md 文档

在 `new_version/supabase_tables.md` 中找到 ba_cpinfo 表定义 (第 49-64 行)，替换为新的表结构。

#### 步骤 3: 验证修改

确认所有新增字段、修改字段、约束关系正确。

---

## 3. 新的 ba_cpinfo 表结构

```
### ba_cpinfo (产品信息表)

| 字段名                          | 数据类型          | 约束                                               | 默认值      | 描述                   |
| ---------------------------- | ------------- | ------------------------------------------------ | -------- | -------------------- |
| id                           | int           | not null auto_increment primary key              | <br />   | 产品ID                |
| category_id                  | int           | references ba_cptype(id)                         | <br />   | 分类ID                |
| category_name                | text          | <br />                                           | <br />   | 分类名称                |
| material_no                  | text          | not null                                         | <br />   | 物料编号                |
| material_name                | text          | not null                                         | <br />   | 物料名称                |
| specification                | text          | <br />                                           | <br />   | 规格                   |
| unit                         | text          | not null                                         | <br />   | 单位                   |
| price                        | numeric(18,2) | not null                                         | 0        | 价格                   |
| min_price                    | numeric(18,2) | <br />                                           | <br />   | 最低价格                |
| status                       | int           | not null                                         | 1        | 状态（0下架 1正常 10违规） |
| brand_id                     | int           | references ba_brand(id)                          | <br />   | 品牌ID                 |
| brand_name                   | text          | <br />                                           | <br />   | 品牌名称                |
| min_pack_qty                 | numeric(18,2) | <br />                                           | 0        | 最小包装量               |
| min_order_qty                | numeric(18,2) | <br />                                           | 0        | 最小起订量               |
| outsource_supplier_drawing   | text          | <br />                                           | <br />   | 外发供应商图纸             |
| drawing_3d                   | text          | <br />                                           | <br />   | 3D图纸                 |
| supplier                     | text          | <br />                                           | <br />   | 供应商                  |
| supplier_no                  | text          | <br />                                           | <br />   | 供应商号                 |
| supplier_material_no         | text          | <br />                                           | <br />   | 供应商物料号              |
| supplier_material_name       | text          | <br />                                           | <br />   | 供应商物料名称             |
| product_line_level1_id       | int           | references ba_product_line(id)                   | <br />   | 产品线一级id             |
| product_line_level2_id       | int           | references ba_product_line(id)                   | <br />   | 产品线二级id             |
| product_belonging            | int           | <br />                                           | -1       | 产品归属(0/1/2/3/4/-1)  |
| group_id                     | int           | references ba_group(id)                           | <br />   | 归属小组ID               |
| group_name                   | text          | <br />                                           | <br />   | 归属小组名称              |
| outsource_customer_drawing   | text          | <br />                                           | <br />   | 外发客户图纸              |
| customer_original_drawing    | text          | <br />                                           | <br />   | 客户原图纸               |
| change_drawing_detail        | text          | <br />                                           | <br />   | 变更图纸详情              |
| specification_doc            | text          | <br />                                           | <br />   | 规格书                  |
| inspection_standard          | text          | <br />                                           | <br />   | 检验基准书               |
| spu_id                       | int           | references ba_spu(id)                             | <br />   | 品类ID                 |
| spu_name                     | text          | <br />                                           | <br />   | 品类名称                |
| platform_material_no         | text          | <br />                                           | <br />   | 平台料号                |
| material_lead_time           | int           | <br />                                           | <br />   | 物料交期(天)             |
| packaging_method             | text          | <br />                                           | <br />   | 包装方式                |
| packaging_spec               | text          | <br />                                           | <br />   | 包装规格                |
| created_at                   | timestamptz   | not null                                         | now()    | 创建时间                |
| updated_at                   | timestamptz   | not null                                         | now()    | 更新时间                |
```

---

## 4. 实施顺序

1. **创建 migration SQL 文件** (`new_version/migrations/modify_ba_cpinfo.sql`)
2. **更新 supabase_tables.md 文档** 中的 ba_cpinfo 表定义

---

## 5. 注意事项

- id 字段从 text 改为 int 类型，需要处理数据迁移
- status 字段从 text 改为 int，值从 JSON 字符串改为整数枚举
- 新增的外键字段需要确保引用的表存在且字段类型匹配
- product_belonging 字段使用 -1 表示"无"，这是考虑到历史数据兼容性
