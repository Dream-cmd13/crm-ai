# 更新 supabase_tables.md 文档计划

## 任务目标
根据 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/init.sql` 的内容，更新 `/Users/hvai/trae/crm-ai-v3.8/new_version/supabase_tables.md` 文档。

## 分析结果

### 1. 缺少的 ENUM 类型定义
SQL 文件定义了以下 ENUM，但当前文档未包含：
- `crm_inquiry_status_enum` ('待处理', '已转线索', '关闭')
- `crm_inquiry_source_channel_enum` ('万连', '电子谷', '1688', '爱采购', '胜蓝', '新电子谷', '其他', '淘宝', '官网', '展会')
- `crm_lead_status_enum` ('未跟进', '跟进中', '关闭', '转商机')
- `crm_lead_customer_action_enum` ('寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料')
- `crm_lead_source_type_enum` ('企业微信', '注册', '在线', '微信', '邮件', '电话', '其他')
- `crm_lead_source_status_enum` ('客服', '自己开发')
- `crm_lead_product_industry_enum` ('基础接插件', '新能源', '线束', '定制', '胜蓝', '胜蓝电气', '工业')
- `crm_opportunity_status_enum` ('未跟进', '跟进中', '关闭', '转项目')
- `crm_project_status_enum` ('跟进中', '样品/小批量', '已合作', '关闭', '暂停')
- `crm_project_stage_enum` ('需求阶段', '设计阶段', '报价阶段', '样品制作', '样品承认', '试产阶段', '重复试产', '量产阶段')
- `crm_product_line_enum` ('接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他')

### 2. 缺少的表
文档未包含以下 SQL 中定义的表：
- `public_property_name` (公共属性名称表)
- `public_property_value` (公共属性值表)
- `crm_competitor` (竞争对手表)
- `crm_customer_competitor` (客户竞争对手表)
- `crm_customer_focus_swot` (客户SWOT分析表)
- `crm_customer_focus_competitor` (客户竞争对手聚焦表)
- `crm_customer_follow_strategy_config` (客户跟进策略配置表)
- `crm_customer_faq_library_config` (客户FAQ库配置表)
- `crm_stakeholder_assessment` (干系人评估表)
- `crm_quotation` (报价单表)
- `crm_quotation_item` (报价单明细表)
- `crm_sales_order` (销售订单表)
- `crm_sales_order_item` (销售订单明细表)
- `crm_sample_order` (样品订单表)
- `crm_sample_order_item` (样品订单明细表)
- `crm_return_order` (退货订单表)
- `crm_return_order_item` (退货订单明细表)
- `crm_ontology_object` (本体对象表)
- `crm_ontology_property` (本体属性表)
- `crm_ontology_relation` (本体关系表)
- `crm_ontology_flow` (本体流程表)
- `crm_ontology_node` (本体节点表)
- `crm_ontology_flow_draft` (本体流程草稿表)
- `crm_ontology_node_draft` (本体节点草稿表)
- `crm_ontology_flow_publish_history` (本体流程发布历史表)
- `crm_system_config` (系统配置表)
- `crm_potential_customer` (潜在客户表)
- `crm_wechat_session` (微信会话表)
- `crm_wechat_message` (微信消息表)
- `crm_wechat_group` (微信群表)
- `crm_wechat_group_message` (微信群消息表)

### 3. 需要修正的表结构
- `crm_customer_contact.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `crm_customer_persona.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `crm_inquiry.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `crm_lead.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `crm_opportunity.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `crm_project.customer_id` - SQL 中为 `integer`，文档错误写为 `text`
- `ba_spu` 表结构 - SQL 与文档差异较大

### 4. 索引信息
SQL 定义了多个索引，文档未包含

### 5. 触发器和函数
SQL 定义了 `app_meta.set_updated_at()` 和 `app_meta.attach_updated_at_trigger()` 函数

### 6. RLS 策略
SQL 为所有表应用了开放的 RLS 策略

## 实施步骤

1. **添加 ENUM 类型定义章节** - 在文档开头添加所有 ENUM 类型的定义
2. **修正表结构错误** - 修正 `crm_customer_contact`、`crm_customer_persona`、`crm_inquiry`、`crm_lead`、`crm_opportunity`、`crm_project` 表中 `customer_id` 的数据类型
3. **更新 ba_spu 表结构** - 根据 SQL 重新定义 ba_spu 表（SQL 中只有 id, name, brand_id, category_id, category_name, created_at, updated_at）
4. **新增缺失的表** - 按类别添加所有缺失的表结构文档：
   - 基础资料：public_property_name, public_property_value
   - 竞争对手/SWOT：crm_competitor, crm_customer_competitor, crm_customer_focus_swot, crm_customer_focus_competitor
   - 配置表：crm_customer_follow_strategy_config, crm_customer_faq_library_config, crm_system_config, crm_potential_customer
   - 干系人评估：crm_stakeholder_assessment
   - 销售文档：crm_quotation, crm_quotation_item, crm_sales_order, crm_sales_order_item, crm_sample_order, crm_sample_order_item, crm_return_order, crm_return_order_item
   - 本体/Ontology：crm_ontology_object, crm_ontology_property, crm_ontology_relation, crm_ontology_flow, crm_ontology_node, crm_ontology_flow_draft, crm_ontology_node_draft, crm_ontology_flow_publish_history
   - 微信管理：crm_wechat_session, crm_wechat_message, crm_wechat_group, crm_wechat_group_message
5. **添加索引章节** - 记录所有索引定义
6. **添加触发器/函数章节** - 记录 app_meta schema 下的函数
7. **添加 RLS 策略说明** - 说明开放的 RLS 策略配置
