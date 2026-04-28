# 订单表完善实施计划

## 1. 需求分析

用户要求完善销售订单表（crm_sales_order）和明细表（crm_sales_order_item），需要：

### 1.1 主表新增/修改字段
- id 修改为 int 类型、自动递增、唯一主键
- 新增：实收金额、待收金额、订单类型、付款状态、支付方式、付款时间、省份、城市、区域、收货详细地址、收货人姓名、收货手机号码、客户内部采购单号、第三方支付平台交易单号、业务员、跟单员、收款时间、收款凭证、源单据号、源售后单号、先备货附件、先备货原因、是否备货

### 1.2 细表新增/修改字段
- id 修改为 int 类型、自动递增、唯一主键
- 新增：订单编号、客户名称、产品编号、客户物料号、物料面价、商品销售单价、金额小记、原价小计、订单类型、客户交期、交期、包装单位、发货方式、未税单价、未税小计、折扣方式

### 1.3 状态枚举定义
需要创建订单状态枚举：crm_sales_order_status_enum

### 1.4 当前已有字段（无需重复创建）
主表已有：id、order_no、customer_id、customer_name、project_id、project_name、order_date、status、audit_status、tax_included_total_amount、tax_excluded_total_amount、total_amount、created_at、updated_at

明细表已有：id、sales_order_id、product_id、product_name、material_no、quantity、tax_type、tax_rate、tax_included_price、tax_excluded_price、tax_included_amount、tax_excluded_amount、tax_amount、created_at、updated_at

## 2. 实施步骤

### 步骤1：添加订单状态枚举类型
在 ENUM 类型定义部分添加 crm_sales_order_status_enum

### 步骤2：修改 crm_sales_order 主表
- 修改 id 字段为 int auto_increment
- 添加新增字段

### 步骤3：修改 crm_sales_order_item 明细表
- 修改 id 字段为 int auto_increment
- 添加新增字段

### 步骤4：生成数据库迁移 SQL 文件

## 3. 风险处理
- 修改主键类型需要注意数据迁移
- 需要确保枚举类型在表创建前定义
- 外键关联需要注意引用关系

## 4. 输出文件
- /Users/hvai/trae/crm-ai-v3.8/new_version/supabase_tables.md（更新）
- /Users/hvai/trae/crm-ai-v3.8/new_version/migrations/20260428_03_add_sales_order_schema.sql（新建）