# Supabase 表结构对照网格

## 1. 基础表结构

### ba_employeeinfo (员工信息表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 员工ID |
| no | text | | | 员工编号 |
| name | text | not null | | 员工姓名 |
| username | text | not null | | 用户名 |
| email | text | | | 邮箱 |
| role | text | | | 角色 |
| department | text | | | 部门 |
| is_active | boolean | | true | 是否激活 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### ba_cptype (产品分类表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 分类ID |
| parent_id | text | references ba_cptype(id) | | 父分类ID |
| name | text | not null | | 分类名称 |
| image | text | | | 分类图片 |
| fab_features | text | not null | '' | FAB特性 |
| fab_advantages | text | not null | '' | FAB优势 |
| fab_benefits | text | not null | '' | FAB益处 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_product_series (产品系列表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 系列ID |
| name | text | not null | | 系列名称 |
| category_id | text | references ba_cptype(id) on delete set null | | 分类ID |
| description | text | not null | '' | 描述 |
| fab_features | text | not null | '' | FAB特性 |
| fab_advantages | text | not null | '' | FAB优势 |
| fab_benefits | text | not null | '' | FAB益处 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### ba_cpinfo (产品信息表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 产品ID |
| category_id | text | references ba_cptype(id) | | 分类ID |
| category_name | text | | | 分类名称 |
| material_no | text | not null | | 物料编号 |
| material_name | text | not null | | 物料名称 |
| specification | text | | | 规格 |
| unit | text | not null | | 单位 |
| price | numeric(18,2) | not null | 0 | 价格 |
| min_price | numeric(18,2) | | | 最低价格 |
| status | text | not null | '{}' | 状态 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### ba_manucustinfo (客户信息表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 客户ID |
| name | text | not null | | 客户名称 |
| level | text | not null | '普通客户' | 客户等级 |
| status | text | not null | '活跃' | 状态 |
| industry | text | | | 行业 |
| source | text | | | 来源 |
| region | text | | | 地区 |
| sales_rep | text | | | 销售代表 |
| payment_term | text | | | 付款条件 |
| has_payment_term | boolean | | false | 是否有付款条件 |
| customer_type | text | | | 客户类型 |
| merchandiser | text | | | 跟单员 |
| is_public_pool | boolean | | false | 是否公共池 |
| month_settlement_apply_status | text | | | 月结申请状态 |
| business_manager | text | | | 业务经理 |
| currency | text | | | 货币 |
| customer_category | text | | | 客户类别 |
| group_name | text | | | 集团名称 |
| is_listed_company | boolean | | false | 是否上市公司 |
| short_name | text | | | 简称 |
| english_name | text | | | 英文名 |
| insured_count | int | | | 参保人数 |
| paid_in_capital | text | | | 实缴资本 |
| last_visit_date | date | | | 最后访问日期 |
| last_contact_time | timestamptz | | | 最后联系时间 |
| last_contact_action | text | | | 最后联系动作 |
| legal_person | text | | | 法人 |
| registered_capital | text | | | 注册资本 |
| industry_level_1 | text | | | 行业一级 |
| industry_level_2 | text | | | 行业二级 |
| industry_level_3 | text | | | 行业三级 |
| employee_count | text | | | 员工数量 |
| establishment_date | date | | | 成立日期 |
| unified_social_credit_code | text | | | 统一社会信用代码 |
| company_address | text | | | 公司地址 |
| company_type | text | | | 公司类型 |
| fax_number | text | | | 传真号码 |
| month_settlement_attachment | text | | | 月结附件 |
| month_settlement_agreement | text | | | 月结协议 |
| business_scope | text | | | 经营范围 |
| website | text | | | 网站 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 2. 客户管理

### crm_customer_contact (客户联系人表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 联系人ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| name | text | not null | | 联系人姓名 |
| position | text | | | 职位 |
| department | text | | | 部门 |
| phone | text | | | 电话 |
| email | text | | | 邮箱 |
| is_primary | boolean | | false | 是否主要联系人 |
| buying_role | text | | | 采购角色 |
| buying_mode | text | | | 采购模式 |
| appellation | text | | | 称呼 |
| wechat_id | text | | | 微信号 |
| manager_contact_id | text | references crm_customer_contact(id) on delete set null | | 经理联系人ID |
| faction | text | not null | '' | 派系 |
| attitude_to_us | text | not null | '中性评价' | 对我们的态度 |
| attitude_score | int | not null | 0 | 态度评分 |
| role_tag | text | not null | 'I' | 角色标签 |
| influence_level | int | not null | 3 | 影响力等级 |
| relation_level | int | not null | 2 | 关系等级 |
| graduation_school | text | not null | '' | 毕业学校 |
| hometown | text | not null | '' | 家乡 |
| hobbies | text[] | not null | '{}' | 爱好 |
| family_situation | text | not null | '' | 家庭情况 |
| personality | text | not null | '' | 性格 |
| preferences | text | not null | '' | 偏好 |
| key_concerns | text | not null | '' | 关键关注点 |
| follow_strategy | text | not null | '' | 跟进策略 |
| video_channel_profile | text | not null | '' | 视频号资料 |
| douyin_profile | text | not null | '' | 抖音资料 |
| xiaohongshu_profile | text | not null | '' | 小红书资料 |
| social_media_behavior | text | not null | '' | 社交媒体行为 |
| gender | text | | | 性别 |
| office_phone | text | | | 办公电话 |
| fax_number | text | | | 传真号码 |
| is_employed | boolean | | | 是否在职 |
| marital_status | text | | | 婚姻状况 |
| birth_date | date | | | 出生日期 |
| highest_education | text | | | 最高学历 |
| native_place | text | | | 籍贯 |
| religion | text | | | 宗教信仰 |
| entry_date | date | | | 入职日期 |
| is_key_person | boolean | | | 是否关键人物 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_customer_persona (客户画像表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 画像ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| scale | text | | | 规模 |
| main_products | text | | | 主要产品 |
| org_structure | text | | | 组织结构 |
| buying_mode | text | | | 采购模式 |
| pain_points | text | | | 痛点 |
| competitive_supplier | text | | | 竞争供应商 |
| competitive_preference | text | | | 竞争偏好 |
| unique_needs | text | | | 独特需求 |
| rd_requirements | text | | | 研发需求 |
| sample_requirements | text | | | 样品需求 |
| production_requirements | text | | | 生产需求 |
| last_updated | date | | | 最后更新日期 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 3. 销售流程

### crm_inquiry (询盘表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 询盘ID |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| company_name | text | not null | | 公司名称 |
| customer_name | text | | | 客户姓名 |
| contact | text | | | 联系方式 |
| source_channel | crm_inquiry_source_channel_enum | | | 来源渠道 |
| category | text | | | 分类 |
| product_series | text | not null | '' | 产品系列 |
| province | text | | | 省份 |
| situation | text | | | 情况 |
| status | crm_inquiry_status_enum | not null | '待处理' | 状态 |
| classification | text | | | 分类 |
| unconvert_reason | text | | | 未转化原因 |
| customer_inquiry | text | | | 客户询盘内容 |
| unconverted_time | date | | | 未转化时间 |
| notes | text | | | 备注 |
| associated_lead | text | | | 关联线索 |
| attachments | jsonb | | | 附件 |
| create_date | date | not null | current_date | 创建日期 |
| update_date | date | | | 更新日期 |
| creator_id | text | | | 创建者ID |
| creator_name | text | | | 创建者姓名 |
| updater | text | | | 更新者 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_lead (线索表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 线索ID |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | not null | | 客户名称 |
| name | text | | | 联系人姓名 |
| phone | text | | | 电话 |
| customer_action | crm_lead_customer_action_enum | | | 客户动作 |
| industry | text | | | 行业 |
| status | crm_lead_status_enum | not null | '未跟进' | 状态 |
| classification | text | | | 分类 |
| assignee | text | | | 负责人 |
| entry_time | text | | | 录入时间 |
| source_channel | crm_inquiry_source_channel_enum | | | 来源渠道 |
| source_type | crm_lead_source_type_enum | | | 来源类型 |
| product_category | text | | | 产品分类 |
| product_series | text | | | 产品系列 |
| source_status | crm_lead_source_status_enum | | | 来源状态 |
| inquiry_id | text | references crm_inquiry(id) | | 询盘ID |
| contact_id | text | references crm_customer_contact(id) | | 联系人ID |
| intent_score | numeric(10,2) | | | 意向评分 |
| buying_mode | text | | | 采购模式 |
| buyer_role | text | | | 采购角色 |
| product_industry | crm_lead_product_industry_enum | | | 产品行业 |
| close_time | date | | | 关闭时间 |
| close_reason | text | | | 关闭原因 |
| customer_opportunity | text | | | 客户机会 |
| attachments | jsonb | | | 附件 |
| create_date | date | not null | current_date | 创建日期 |
| creator_id | text | | | 创建者ID |
| creator_name | text | | | 创建者姓名 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_opportunity (商机表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 商机ID |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | not null | | 客户名称 |
| opp_date | date | not null | current_date | 商机日期 |
| status | crm_opportunity_status_enum | not null | '未跟进' | 状态 |
| opp_summary | text | | | 商机摘要 |
| product_line | crm_product_line_enum | | | 产品线 |
| sales_rep | text | | | 销售代表 |
| project_manager | text | | | 项目经理 |
| product_owner | text | | | 产品负责人 |
| opp_level | text | | | 商机等级 |
| intent_amount | numeric(18,2) | | | 意向金额 |
| associated_project | text | | | 关联项目 |
| end_customer | text | | | 终端客户 |
| end_project | text | | | 终端项目 |
| sales_type | text | | | 销售类型 |
| product_industry | crm_lead_product_industry_enum | | | 产品行业 |
| completeness | numeric(5,2) | | | 完整度 |
| contact_person | text | | | 联系人 |
| lead_id | text | references crm_lead(id) | | 线索ID |
| inquiry_id | text | references crm_inquiry(id) | | 询盘ID |
| application_scenario | text | | | 应用场景 |
| estimated_usage | text | | | 预计用量 |
| estimated_mass_production_date | date | | | 预计量产日期 |
| close_time | date | | | 关闭时间 |
| close_reason | text | | | 关闭原因 |
| attachments | jsonb | | | 附件 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_project (项目表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 项目ID |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | not null | | 客户名称 |
| project_name | text | not null | | 项目名称 |
| status | crm_project_status_enum | not null | '跟进中' | 状态 |
| stage | crm_project_stage_enum | not null | '需求阶段' | 阶段 |
| manager | text | | | 经理 |
| amount | numeric(18,2) | | | 金额 |
| project_type | text | | | 项目类型 |
| project_level | text | | | 项目等级 |
| wechat_group | text | | | 微信群 |
| team | jsonb | | | 团队 |
| notes | jsonb | | | 备注 |
| requirements | jsonb | | | 需求 |
| progress | jsonb | | | 进度 |
| tasks | jsonb | | | 任务 |
| samples | jsonb | | | 样品 |
| purchasing_quotes | jsonb | | | 采购报价 |
| quotations | jsonb | | | 报价单 |
| requirement_changes | jsonb | | | 需求变更 |
| communication_details | jsonb | | | 沟通详情 |
| is_key_project | boolean | | false | 是否关键项目 |
| ai_analysis | jsonb | | | AI分析 |
| creator_id | text | | | 创建者ID |
| creator_no | text | | | 创建者编号 |
| creator_name | text | | | 创建者姓名 |
| create_date | date | | | 创建日期 |
| end_customer | text | | | 终端客户 |
| opp_summary | text | | | 商机摘要 |
| application_scenario | text | | | 应用场景 |
| intent_amount | numeric(18,2) | | | 意向金额 |
| end_project | text | | | 终端项目 |
| product_industry | crm_lead_product_industry_enum | | | 产品行业 |
| estimated_usage | text | | | 预计用量 |
| estimated_mass_production_date | date | | | 预计量产日期 |
| customer_action | crm_lead_customer_action_enum | | | 客户动作 |
| sales_rep | text | | | 销售代表 |
| product_owner | text | | | 产品负责人 |
| quality_owner | text | | | 质量负责人 |
| purchaser | text | | | 采购 |
| fae | text | | | 技术支持 |
| lead_id | text | | | 线索ID |
| opportunity_id | text | | | 商机ID |
| inquiry_id | text | | | 询盘ID |
| close_time | date | | | 关闭时间 |
| close_reason | text | | | 关闭原因 |
| product_line | crm_product_line_enum | | | 产品线 |
| start_date | date | | | 开始日期 |
| end_date | date | | | 结束日期 |
| attachments | jsonb | | | 附件 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 4. 沟通与任务

### crm_communication_log (沟通记录表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 日志ID |
| source_id | text | | | 来源ID |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| date | text | | | 日期 |
| sender | text | | | 发送者 |
| content | text | | | 内容 |
| type | text | | | 类型 |
| attachment_url | text | | | 附件URL |
| duration | int | | | 时长 |
| source_group | text | | | 来源组 |
| is_summarized | boolean | | false | 是否已总结 |
| created_at | timestamptz | not null | now() | 创建时间 |

### crm_task_type (任务类型表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 类型ID |
| name | text | not null | | 类型名称 |
| default_hours | int | | 24 | 默认小时数 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_task (任务表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 任务ID |
| title | text | not null | | 标题 |
| description | text | | | 描述 |
| module | text | | | 模块 |
| related_id | text | | | 相关ID |
| source_type | text | | | 来源类型 |
| source_id | text | | | 来源ID |
| task_type | text | | | 任务类型 |
| objectives | jsonb | | | 目标 |
| auxiliary_json | jsonb | | | 辅助JSON |
| status | text | | | 状态 |
| importance | text | | | 重要性 |
| urgency | text | | | 紧急性 |
| assignee_id | text | | | 负责人ID |
| assignee_name | text | | | 负责人姓名 |
| due_date | date | | | 截止日期 |
| create_date | date | | | 创建日期 |
| creator_id | text | | | 创建者ID |
| creator_name | text | | | 创建者姓名 |
| ai_context_id | text | | | AI上下文ID |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 5. 微信管理

### crm_wechat_session (微信会话表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | uuid | default gen_random_uuid() primary key | | 会话ID |
| my_wechat_id | text | not null | | 我的微信ID |
| peer_wechat_id | text | not null | | 对方微信ID |
| customer_id | text | | | 客户ID |
| contact_id | text | | | 联系人ID |
| created_at | timestamptz | not null | timezone('utc'::text, now()) | 创建时间 |
| unique(my_wechat_id, peer_wechat_id) | | | | 唯一约束 |

### crm_wechat_message (微信消息表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | uuid | default gen_random_uuid() primary key | | 消息ID |
| session_id | uuid | references crm_wechat_session(id) on delete cascade | | 会话ID |
| sender_wechat_id | text | not null | | 发送者微信ID |
| msg_type | text | | 'text' | 消息类型 |
| content | text | not null | | 内容 |
| send_time | timestamptz | not null | timezone('utc'::text, now()) | 发送时间 |

### crm_wechat_group (微信群表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | uuid | default gen_random_uuid() primary key | | 群ID |
| group_id | text | not null unique | | 群聊ID |
| group_name | text | not null | | 群名称 |
| customer_id | text | | | 客户ID |
| created_at | timestamptz | not null | timezone('utc'::text, now()) | 创建时间 |

### crm_wechat_group_message (微信群消息表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | uuid | default gen_random_uuid() primary key | | 消息ID |
| group_id | uuid | references crm_wechat_group(id) on delete cascade | | 群ID |
| sender_wechat_id | text | not null | | 发送者微信ID |
| msg_type | text | | 'text' | 消息类型 |
| content | text | not null | | 内容 |
| send_time | timestamptz | not null | timezone('utc'::text, now()) | 发送时间 |

## 6. 竞争对手与SWOT

### crm_competitor (竞争对手表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 竞争对手ID |
| name | text | not null | | 竞争对手名称 |
| advantages | text | | | 优势 |
| disadvantages | text | | | 劣势 |
| positioning | text | | | 定位 |
| product_matrix | jsonb | not null | '[]'::jsonb | 产品矩阵 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_customer_competitor (客户竞争对手表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| competitor_id | text | not null references crm_competitor(id) on delete cascade | | 竞争对手ID |
| threat_level | text | | | 威胁等级 |
| notes | text | | | 备注 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_customer_focus_swot (客户关注点SWOT表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| customer_focus | text | not null | '' | 客户关注点 |
| key_contact | text | not null | '' | 关键联系人 |
| focus_level | int | not null | 3 | 关注等级 |
| our_strengths | jsonb | not null | '[]'::jsonb | 我们的优势 |
| our_weaknesses | jsonb | not null | '[]'::jsonb | 我们的劣势 |
| ai_script | text | not null | '' | AI脚本 |
| sort_order | int | not null | 0 | 排序顺序 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_customer_focus_competitor (客户关注点竞争对手表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | ID |
| focus_id | text | not null references crm_customer_focus_swot(id) on delete cascade | | 关注点ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| competitor_name | text | not null | '' | 竞争对手名称 |
| strengths | jsonb | not null | '[]'::jsonb | 优势 |
| weaknesses | jsonb | not null | '[]'::jsonb | 劣势 |
| sort_order | int | not null | 0 | 排序顺序 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_stakeholder_assessment (利益相关者评估表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 评估ID |
| customer_id | text | not null references ba_manucustinfo(id) on delete cascade | | 客户ID |
| stakeholder_id | text | not null references crm_customer_contact(id) on delete cascade | | 利益相关者ID |
| assessment_date | date | not null | current_date | 评估日期 |
| need_level_score | int | | | 需求等级评分 |
| power_score | int | | | 权力评分 |
| attitude_score | int | | | 态度评分 |
| relation_score | int | | | 关系评分 |
| business_alignment_score | int | | | 业务一致性评分 |
| confidence_score | int | | 60 | 信心评分 |
| conclusion | text | | | 结论 |
| strategy_suggestion | text | | | 策略建议 |
| source_type | text | | 'manual' | 来源类型 |
| ai_model | text | | | AI模型 |
| created_by | text | | | 创建者 |
| created_at | timestamptz | not null | now() | 创建时间 |

## 7. 销售文档

### crm_quotation (报价单表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 报价单ID |
| quote_no | text | | | 报价单号 |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | | | 客户名称 |
| project_id | text | references crm_project(id) | | 项目ID |
| project_name | text | | | 项目名称 |
| quote_date | date | | | 报价日期 |
| status | text | | | 状态 |
| audit_status | text | | | 审核状态 |
| tax_included_total_amount | numeric(18,2) | | 0 | 含税总金额 |
| tax_excluded_total_amount | numeric(18,2) | | 0 | 不含税总金额 |
| total_amount | numeric(18,2) | | 0 | 总金额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_quotation_item (报价单明细表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 明细ID |
| quotation_id | text | not null references crm_quotation(id) on delete cascade | | 报价单ID |
| product_id | text | references ba_cpinfo(id) | | 产品ID |
| product_name | text | | | 产品名称 |
| material_no | text | | | 物料编号 |
| quantity | numeric(18,4) | | 0 | 数量 |
| tax_type | text | | | 税种 |
| tax_rate | numeric(8,4) | | 0 | 税率 |
| tax_included_price | numeric(18,4) | | 0 | 含税价格 |
| tax_excluded_price | numeric(18,4) | | 0 | 不含税价格 |
| tax_included_amount | numeric(18,2) | | 0 | 含税金额 |
| tax_excluded_amount | numeric(18,2) | | 0 | 不含税金额 |
| tax_amount | numeric(18,2) | | 0 | 税额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_sales_order (销售订单表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 订单ID |
| order_no | text | | | 订单号 |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | | | 客户名称 |
| project_id | text | references crm_project(id) | | 项目ID |
| project_name | text | | | 项目名称 |
| order_date | date | | | 订单日期 |
| status | text | | | 状态 |
| audit_status | text | | | 审核状态 |
| tax_included_total_amount | numeric(18,2) | | 0 | 含税总金额 |
| tax_excluded_total_amount | numeric(18,2) | | 0 | 不含税总金额 |
| total_amount | numeric(18,2) | | 0 | 总金额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_sales_order_item (销售订单明细表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 明细ID |
| sales_order_id | text | not null references crm_sales_order(id) on delete cascade | | 销售订单ID |
| product_id | text | references ba_cpinfo(id) | | 产品ID |
| product_name | text | | | 产品名称 |
| material_no | text | | | 物料编号 |
| quantity | numeric(18,4) | | 0 | 数量 |
| tax_type | text | | | 税种 |
| tax_rate | numeric(8,4) | | 0 | 税率 |
| tax_included_price | numeric(18,4) | | 0 | 含税价格 |
| tax_excluded_price | numeric(18,4) | | 0 | 不含税价格 |
| tax_included_amount | numeric(18,2) | | 0 | 含税金额 |
| tax_excluded_amount | numeric(18,2) | | 0 | 不含税金额 |
| tax_amount | numeric(18,2) | | 0 | 税额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_sample_order (样品订单表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 样品订单ID |
| sample_no | text | | | 样品单号 |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | | | 客户名称 |
| applicant | text | | | 申请人 |
| project_id | text | references crm_project(id) | | 项目ID |
| project_name | text | | | 项目名称 |
| status | text | | | 状态 |
| audit_status | text | | | 审核状态 |
| tax_included_total_amount | numeric(18,2) | | 0 | 含税总金额 |
| tax_excluded_total_amount | numeric(18,2) | | 0 | 不含税总金额 |
| total_amount | numeric(18,2) | | 0 | 总金额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_sample_order_item (样品订单明细表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 明细ID |
| sample_order_id | text | not null references crm_sample_order(id) on delete cascade | | 样品订单ID |
| product_id | text | references ba_cpinfo(id) | | 产品ID |
| product_name | text | | | 产品名称 |
| material_no | text | | | 物料编号 |
| quantity | numeric(18,4) | | 0 | 数量 |
| tax_type | text | | | 税种 |
| tax_rate | numeric(8,4) | | 0 | 税率 |
| tax_included_price | numeric(18,4) | | 0 | 含税价格 |
| tax_excluded_price | numeric(18,4) | | 0 | 不含税价格 |
| tax_included_amount | numeric(18,2) | | 0 | 含税金额 |
| tax_excluded_amount | numeric(18,2) | | 0 | 不含税金额 |
| tax_amount | numeric(18,2) | | 0 | 税额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_return_order (退货订单表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 退货订单ID |
| return_no | text | | | 退货单号 |
| order_no | text | | | 订单号 |
| original_order_no | text | | | 原始订单号 |
| customer_id | text | references ba_manucustinfo(id) | | 客户ID |
| customer_name | text | | | 客户名称 |
| reason | text | | | 原因 |
| handler | text | | | 处理人 |
| sales_rep | text | | | 销售代表 |
| merchandiser | text | | | 跟单员 |
| project_id | text | references crm_project(id) | | 项目ID |
| project_name | text | | | 项目名称 |
| status | text | | | 状态 |
| audit_status | text | | | 审核状态 |
| tax_included_total_amount | numeric(18,2) | | 0 | 含税总金额 |
| tax_excluded_total_amount | numeric(18,2) | | 0 | 不含税总金额 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_return_order_item (退货订单明细表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 明细ID |
| return_order_id | text | not null references crm_return_order(id) on delete cascade | | 退货订单ID |
| product_id | text | references ba_cpinfo(id) | | 产品ID |
| product_name | text | | | 产品名称 |
| material_no | text | | | 物料编号 |
| quantity | numeric(18,4) | | 0 | 数量 |
| tax_type | text | | | 税种 |
| tax_rate | numeric(8,4) | | 0 | 税率 |
| tax_included_price | numeric(18,4) | | 0 | 含税价格 |
| tax_excluded_price | numeric(18,4) | | 0 | 不含税价格 |
| tax_included_amount | numeric(18,2) | | 0 | 含税金额 |
| tax_excluded_amount | numeric(18,2) | | 0 | 不含税金额 |
| tax_amount | numeric(18,2) | | 0 | 税额 |
| order_no | text | | | 订单号 |
| return_no | text | | | 退货单号 |
| material_id | text | | | 物料ID |
| material_name | text | | | 物料名称 |
| expected_after_sale_method | text | | | 期望售后方式 |
| after_sale_reason | text | | | 售后原因 |
| after_sale_material_image | text | | | 售后物料图片 |
| issue_description | text | | | 问题描述 |
| return_tracking_no | text | | | 退货追踪号 |
| final_handling_method | text | | | 最终处理方式 |
| return_qty | numeric(18,4) | | | 退货数量 |
| return_method | text | | | 退货方式 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 8. 本体与配置

### crm_ontology_object (本体对象表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 对象ID |
| name | text | not null | | 对象名称 |
| code | text | not null unique | | 对象代码 |
| description | text | | | 描述 |
| system_link | text | | | 系统链接 |
| is_sub_table | boolean | | false | 是否子表 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_ontology_property (本体属性表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 属性ID |
| object_code | text | not null references crm_ontology_object(code) on delete cascade | | 对象代码 |
| name | text | not null | | 属性名称 |
| code | text | not null | | 属性代码 |
| type | text | | | 类型 |
| required | boolean | | false | 是否必填 |
| options_json | jsonb | | '[]'::jsonb | 选项JSON |

### crm_ontology_relation (本体关系表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 关系ID |
| object_code | text | not null references crm_ontology_object(code) on delete cascade | | 对象代码 |
| target_object_code | text | not null | | 目标对象代码 |
| relation_type | text | | | 关系类型 |
| description | text | | | 描述 |

### crm_ontology_flow (本体流程表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 流程ID |
| object_code | text | not null references crm_ontology_object(code) on delete cascade | | 对象代码 |
| name | text | not null | | 流程名称 |
| description | text | | | 描述 |
| trigger_type | text | | | 触发类型 |
| trigger_condition | text | | | 触发条件 |
| trigger_frequency | text | | | 触发频率 |

### crm_ontology_node (本体节点表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 节点ID |
| flow_id | text | not null references crm_ontology_flow(id) on delete cascade | | 流程ID |
| name | text | | | 节点名称 |
| description | text | | | 描述 |
| type | text | | | 类型 |
| config_json | jsonb | | '{}'::jsonb | 配置JSON |

### crm_ontology_flow_draft (本体流程草稿表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 草稿ID |
| object_code | text | not null references crm_ontology_object(code) on delete cascade | | 对象代码 |
| name | text | not null | | 流程名称 |
| description | text | | | 描述 |
| trigger_type | text | | | 触发类型 |
| trigger_condition | text | | | 触发条件 |
| trigger_frequency | text | | | 触发频率 |

### crm_ontology_node_draft (本体节点草稿表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 节点ID |
| flow_id | text | not null references crm_ontology_flow_draft(id) on delete cascade | | 流程ID |
| name | text | | | 节点名称 |
| description | text | | | 描述 |
| type | text | | | 类型 |
| config_json | jsonb | | '{}'::jsonb | 配置JSON |

### crm_ontology_flow_publish_history (本体流程发布历史表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | uuid | primary key default gen_random_uuid() | | 历史ID |
| object_code | text | not null references crm_ontology_object(code) on delete cascade | | 对象代码 |
| snapshot_json | jsonb | not null | | 快照JSON |
| created_at | timestamptz | not null | now() | 创建时间 |

### crm_system_config (系统配置表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 配置ID |
| name | text | | | 配置名称 |
| value_json | jsonb | not null | '{}'::jsonb | 值JSON |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_potential_customer (潜在客户表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 潜在客户ID |
| name | text | not null | | 潜在客户名称 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 9. 配置表

### crm_customer_follow_strategy_config (客户跟进策略配置表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 配置ID |
| config | jsonb | not null | '{}'::jsonb | 配置 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### crm_customer_faq_library_config (客户FAQ库配置表)
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|--------|------|
| id | text | primary key | | 配置ID |
| config | jsonb | not null | '{"categories":[]}'::jsonb | 配置 |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

## 10. 枚举类型

### crm_inquiry_status_enum (询盘状态枚举)
- 待处理
- 已转线索
- 关闭

### crm_inquiry_source_channel_enum (询盘来源渠道枚举)
- 万连
- 电子谷
- 1688
- 爱采购
- 胜蓝
- 新电子谷
- 其他
- 淘宝
- 官网
- 展会

### crm_lead_status_enum (线索状态枚举)
- 未跟进
- 跟进中
- 关闭
- 转商机

### crm_lead_customer_action_enum (线索客户动作枚举)
- 寻替代料
- 寻替代品
- 找货寻料
- 指定料号
- 指定物料

### crm_lead_source_type_enum (线索来源类型枚举)
- 企业微信
- 注册
- 在线
- 微信
- 邮件
- 电话
- 其他

### crm_lead_source_status_enum (线索来源状态枚举)
- 客服
- 自己开发

### crm_lead_product_industry_enum (线索产品行业枚举)
- 基础接插件
- 新能源
- 线束
- 定制
- 胜蓝
- 胜蓝电气
- 工业

### crm_opportunity_status_enum (商机状态枚举)
- 未跟进
- 跟进中
- 关闭
- 转项目

### crm_project_status_enum (项目状态枚举)
- 跟进中
- 样品/小批量
- 已合作
- 关闭
- 暂停

### crm_project_stage_enum (项目阶段枚举)
- 需求阶段
- 设计阶段
- 报价阶段
- 样品制作
- 样品承认
- 试产阶段
- 重复试产
- 量产阶段

### crm_product_line_enum (产品线枚举)
- 接插件
- 线束
- 工业连接器
- IO连接器
- 电子电气
- 其他