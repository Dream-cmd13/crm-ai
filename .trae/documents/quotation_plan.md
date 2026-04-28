# 业务报价单完善计划

## 一、需求分析

### 用户提供的报价单主表字段
| 字段名 | 描述 | 特殊说明 |
|--------|------|----------|
| 报价编号 | 报价单唯一编号 | |
| 主键 | 自增主键 | int类型、无符号、自动递增、唯一主键 |
| 客户名称 | 客户名称 | |
| 关联项目 | 关联的项目ID | |
| 报状态 | 状态枚举 | quotation_complete(报单完成)、terminated(已终止)、manual_quotation(人工报价中)、timeout_cancellation(超时取消)、user_cancelled(用户取消) |
| 联系人 | 联系人姓名 | |
| 有效时间 | 报价单有效期 | |
| 交货方式 | 交货方式 | |
| 交货时间 | 交货时间 | |
| 付款方式 | 付款方式 | 1月结，2对公转账，3微信，4支付宝 |
| 报价单价格 | 报价单总价格 | |
| 联系人电话 | 联系人电话 | |

### 用户提供的报价单细表字段
| 字段名 | 描述 | 特殊说明 |
|--------|------|----------|
| 报价编号 | 关联报价单编号 | |
| 报价单主键 | 关联报价单ID | |
| 万连料号 | 物料编号 | |
| 物料描述 | 物料描述 | |
| 单位 | 计量单位 | |
| 含税单价 | 含税单价 | |
| 币别 | 货币类型 | |
| 金额 | 金额 | |
| 数量 | 数量 | |
| L/T | 交期 | |
| MPQ | 最小包装量 | |
| MOQ | 最小起订量 | |
| 样品价 | 样品价格 | |
| 备注 | 备注信息 | |
| 客户物料号 | 客户侧物料号 | |
| 物料交期 | 物料交期 | |

## 二、现有表结构对比

### 现有 `crm_quotation` 表（supabase_tables.md:808-825）
| 字段名 | 现有类型 | 需修改 | 缺失 |
|--------|----------|--------|------|
| id | text | ✅ 改为 int | - |
| quote_no | text | - | - |
| customer_id | integer | - | - |
| customer_name | text | - | - |
| project_id | text | - | - |
| project_name | text | - | - |
| quote_date | date | - | - |
| status | text | ✅ 改为枚举 | - |
| audit_status | text | - | - |
| tax_included_total_amount | numeric(18,2) | - | - |
| tax_excluded_total_amount | numeric(18,2) | - | - |
| total_amount | numeric(18,2) | - | - |
| created_at | timestamptz | - | - |
| updated_at | timestamptz | - | - |
| **联系人** | - | - | ✅ |
| **有效时间** | - | - | ✅ |
| **交货方式** | - | - | ✅ |
| **交货时间** | - | - | ✅ |
| **付款方式** | - | - | ✅ |
| **联系人电话** | - | - | ✅ |

### 现有 `crm_quotation_item` 表（supabase_tables.md:827-845）
| 字段名 | 现有类型 | 需修改 | 缺失 |
|--------|----------|--------|------|
| id | text | ✅ 改为 int | - |
| quotation_id | text | ✅ 改为 int | - |
| product_id | integer | - | - |
| product_name | text | - | - |
| material_no | text | - | - |
| quantity | numeric(18,4) | - | - |
| tax_type | text | - | - |
| tax_rate | numeric(8,4) | - | - |
| tax_included_price | numeric(18,4) | - | - |
| tax_excluded_price | numeric(18,4) | - | - |
| tax_included_amount | numeric(18,2) | - | - |
| tax_excluded_amount | numeric(18,2) | - | - |
| tax_amount | numeric(18,2) | - | - |
| created_at | timestamptz | - | - |
| updated_at | timestamptz | - | - |
| **币别** | - | - | ✅ |
| **L/T** | - | - | ✅ |
| **MPQ** | - | - | ✅ |
| **MOQ** | - | - | ✅ |
| **样品价** | - | - | ✅ |
| **备注** | - | - | ✅ |
| **客户物料号** | - | - | ✅ |
| **物料交期** | - | - | ✅ |

## 三、修改计划

### 1. 创建状态枚举类型 `crm_quotation_status_enum`
```sql
create type crm_quotation_status_enum as enum (
    'quotation_complete',
    'terminated',
    'manual_quotation',
    'timeout_cancellation',
    'user_cancelled'
);
```

### 2. 修改 `crm_quotation` 表
- 将 `id` 字段改为 `int` 类型、无符号、自动递增、唯一主键
- 将 `status` 字段改为枚举类型 `crm_quotation_status_enum`
- 添加缺失字段：`contact_person`, `valid_until`, `delivery_method`, `delivery_time`, `payment_method`, `contact_phone`

### 3. 修改 `crm_quotation_item` 表
- 将 `id` 字段改为 `int` 类型、无符号、自动递增、唯一主键
- 将 `quotation_id` 字段改为 `int` 类型
- 添加缺失字段：`currency`, `lead_time`, `mpq`, `moq`, `sample_price`, `remark`, `customer_material_no`, `material_delivery_date`

## 四、文件修改清单

| 文件路径 | 修改内容 |
|----------|----------|
| `/new_version/supabase_tables.md` | 更新 crm_quotation 和 crm_quotation_item 表结构 |
| `/new_version/migrations/20260428_05_update_quotation_tables.sql` | 创建新的迁移文件 |

## 五、执行步骤

1. 更新 supabase_tables.md 文档中的表结构定义
2. 创建新的 SQL 迁移文件
3. 通知用户审核并确认执行