import { Property } from '../types/ontology';

type Preset = Record<string, Array<{ code: string; name: string; type: Property['type']; required?: boolean }>>;

export const ontologyDbFieldPresets: Preset = {
  ba_manucustinfo: [
    { code: 'id', name: '客户ID', type: 'String', required: true },
    { code: 'name', name: '客户名称', type: 'String' },
    { code: 'status', name: '客户状态', type: 'Enum' },
    { code: 'level', name: '客户级别', type: 'Enum' },
    { code: 'customer_type', name: '客户类型', type: 'String' },
    { code: 'address', name: '地址', type: 'String' },
    { code: 'contact_person', name: '联系人', type: 'String' },
    { code: 'contact_phone', name: '联系电话', type: 'String' },
    { code: 'last_visit_date', name: '最近拜访日期', type: 'Date' },
    { code: 'last_contact_time', name: '最近联系时间', type: 'DateTime' },
    { code: 'last_contact_action', name: '最近联系动作', type: 'String' },
    { code: 'created_at', name: '创建时间', type: 'DateTime' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_inquiry: [
    { code: 'id', name: '询盘ID', type: 'String', required: true },
    { code: 'title', name: '询盘主题', type: 'String' },
    { code: 'content', name: '询盘内容', type: 'Text' },
    { code: 'status', name: '状态', type: 'Enum' },
    { code: 'priority', name: '优先级', type: 'Enum' },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'customer_name', name: '客户名称', type: 'String' },
    { code: 'owner', name: '负责人', type: 'String' },
    { code: 'due_date', name: '截止日期', type: 'Date' },
    { code: 'created_at', name: '创建时间', type: 'DateTime' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_lead: [
    { code: 'id', name: '线索ID', type: 'String', required: true },
    { code: 'title', name: '线索主题', type: 'String' },
    { code: 'status', name: '状态', type: 'Enum' },
    { code: 'source_type', name: '来源类型', type: 'String' },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'customer_name', name: '客户名称', type: 'String' },
    { code: 'owner', name: '负责人', type: 'String' },
    { code: 'due_date', name: '截止日期', type: 'Date' },
    { code: 'created_at', name: '创建时间', type: 'DateTime' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_opportunity: [
    { code: 'id', name: '商机ID', type: 'String', required: true },
    { code: 'title', name: '商机主题', type: 'String' },
    { code: 'status', name: '状态', type: 'Enum' },
    { code: 'amount', name: '金额', type: 'Number' },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'customer_name', name: '客户名称', type: 'String' },
    { code: 'owner', name: '负责人', type: 'String' },
    { code: 'expected_sign_date', name: '预计签约日期', type: 'Date' },
    { code: 'created_at', name: '创建时间', type: 'DateTime' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_project: [
    { code: 'id', name: '项目ID', type: 'String', required: true },
    { code: 'project_name', name: '项目名称', type: 'String' },
    { code: 'status', name: '状态', type: 'Enum' },
    { code: 'stage', name: '阶段', type: 'Enum' },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'customer_name', name: '客户名称', type: 'String' },
    { code: 'owner', name: '负责人', type: 'String' },
    { code: 'due_date', name: '截止日期', type: 'Date' },
    { code: 'created_at', name: '创建时间', type: 'DateTime' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_customer_contact: [
    { code: 'id', name: '联系人ID', type: 'String', required: true },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'name', name: '姓名', type: 'String' },
    { code: 'position', name: '职位', type: 'String' },
    { code: 'phone', name: '电话', type: 'String' },
    { code: 'email', name: '邮箱', type: 'String' },
    { code: 'wechat_id', name: '微信ID', type: 'String' }
  ],
  crm_communication_log: [
    { code: 'id', name: '沟通ID', type: 'String', required: true },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'date', name: '沟通日期', type: 'DateTime' },
    { code: 'type', name: '沟通类型', type: 'String' },
    { code: 'sender', name: '发送人', type: 'String' },
    { code: 'content', name: '沟通内容', type: 'Text' },
    { code: 'source_group', name: '来源组', type: 'String' }
  ],
  crm_customer_persona: [
    { code: 'id', name: '画像ID', type: 'String', required: true },
    { code: 'customer_id', name: '客户ID', type: 'String' },
    { code: 'scale', name: '规模', type: 'String' },
    { code: 'main_products', name: '主营产品', type: 'Text' },
    { code: 'pain_points', name: '痛点', type: 'Text' },
    { code: 'rd_requirements', name: '研发要求', type: 'Text' },
    { code: 'updated_at', name: '更新时间', type: 'DateTime' }
  ],
  crm_task: [
    { code: 'id', name: '任务ID', type: 'String', required: true },
    { code: 'title', name: '标题', type: 'String' },
    { code: 'description', name: '描述', type: 'Text' },
    { code: 'status', name: '状态', type: 'Enum' },
    { code: 'module', name: '模块', type: 'String' },
    { code: 'related_id', name: '关联ID', type: 'String' },
    { code: 'create_date', name: '创建日期', type: 'Date' },
    { code: 'due_date', name: '截止日期', type: 'Date' }
  ]
};

