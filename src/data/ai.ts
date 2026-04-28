import { AIAgent, AIAgentLog, WorkOntologyNode } from '../types';

export const mockAIAgentLogs: AIAgentLog[] = [
  { id: 'L1', agentId: 'A1', timestamp: '2026-03-30 09:15:22', action: '执行企查查背调', status: 'success', details: '成功获取"大疆创新"工商信息，更新客户画像。', targetId: 'CUS-20260310-002' },
  { id: 'L4', agentId: 'A3', timestamp: '2026-03-30 10:06:30', action: '生成BOM草稿', status: 'failed', details: '无法在ERP中找到匹配的"耐高温防水接头"物料，已转交人工处理。', targetId: 'XM2603173188' },
];

export const mockWorkOntology: WorkOntologyNode[] = [
  { id: 'WO1', name: '全网公域线索抓取', category: '线索获取', description: '从展会、企查查、招投标网自动抓取潜在客户', automationLevel: 0.95, assignedAgentId: 'A1', humanFallbackRole: 'SDR主管', complexity: '低' },
  { id: 'WO2', name: '客户背景深度背调', category: '线索获取', description: '自动生成客户画像、财务状况、风险提示', automationLevel: 0.9, assignedAgentId: 'A1', humanFallbackRole: 'SDR主管', complexity: '中' },
  { id: 'WO3', name: '多轮意向探寻对话', category: '商机转化', description: '通过微信/邮件自动发送开发信并进行多轮对话', automationLevel: 0.85, assignedAgentId: 'A2', humanFallbackRole: '业务员', complexity: '中' },
  { id: 'WO4', name: '高价值客户面访', category: '商机转化', description: '针对战略客户的线下深度拜访与关系维护', automationLevel: 0.05, humanFallbackRole: '业务员', complexity: '高' },
  { id: 'WO5', name: '需求解析与BOM生成', category: '方案设计', description: '解析客户图纸/需求，匹配内部物料库生成BOM', automationLevel: 0.75, assignedAgentId: 'A3', humanFallbackRole: 'FAE', complexity: '高' },
  { id: 'WO6', name: '阶梯报价单自动生成', category: '报价商务', description: '根据BOM成本、客户等级、历史价格自动生成报价', automationLevel: 0.8, assignedAgentId: 'A3', humanFallbackRole: '业务员', complexity: '中' },
  { id: 'WO7', name: '商务合同法务审核', category: '报价商务', description: '自动比对标准合同条款，识别法务风险', automationLevel: 0.9, assignedAgentId: 'A3', humanFallbackRole: '法务', complexity: '高' },
  { id: 'WO8', name: '生产进度节点同步', category: '交付履约', description: '打通ERP/MES，自动向客户同步生产与发货节点', automationLevel: 0.98, assignedAgentId: 'A4', humanFallbackRole: '跟单员', complexity: '低' },
  { id: 'WO9', name: '客诉情绪安抚与分发', category: '售后服务', description: '第一时间响应客诉，安抚情绪并自动分发给对应部门', automationLevel: 0.85, assignedAgentId: 'A4', humanFallbackRole: '客服主管', complexity: '中' },
  { id: 'WO10', name: '重大客诉现场处理', category: '售后服务', description: '针对批量不良或核心客户投诉的现场处理', automationLevel: 0.0, humanFallbackRole: '品质主管', complexity: '高' },
];

export const mockAIAgents: AIAgent[] = [
  { 
    id: 'A1', 
    name: 'SDR Agent (线索挖掘)', 
    role: 'SDR', 
    status: 'active', 
    handledCount: 12540, 
    successRate: 0.85, 
    description: '全网抓取数据，自动发送开发信，多轮对话判断意向。',
    model: 'gemini-3.1-pro-preview',
    systemPrompt: '你是专业的SDR（销售开发代表）。你的目标是通过全网公开信息寻找潜在客户，并通过邮件和微信进行初步接触，判断其购买意向。',
    triggerConditions: ['定时任务: 每天上午9点', '新建线索时'],
    accessibleDataModels: ['线索表 (Lead)', '客户画像表 (CustomerPersona)'],
    assignedOntologyNodes: ['WO1', 'WO2'],
    apiUrl: 'https://api.internal.com/v1/agents/sdr/execute',
    apiInputPermissions: ['read:leads', 'read:customer_personas', 'write:leads'],
    apiOutputMappings: [
      { sourceField: 'lead_score', targetModel: 'Lead', targetField: 'aiConfidence', action: 'update', description: '更新线索AI评分' },
      { sourceField: 'extracted_persona', targetModel: 'CustomerPersona', targetField: 'details', action: 'create', description: '创建或更新客户画像' }
    ]
  },
  { 
    id: 'A2', 
    name: 'Nurture Agent (客户培育)', 
    role: 'Nurture', 
    status: 'active', 
    handledCount: 5430, 
    successRate: 0.92, 
    description: '定期推送行业报告，维持活跃度。',
    model: 'gemini-3-flash-preview',
    systemPrompt: '你是客户培育专家。你的任务是根据客户的行业和兴趣，定期生成并发送有价值的行业报告 and 资讯，保持客户活跃度。',
    triggerConditions: ['客户状态变更为"跟进中"', '距离上次联系超过7天'],
    accessibleDataModels: ['客户表 (Customer)', '跟进记录表 (FollowUp)', '知识库 (KnowledgeItem)'],
    assignedOntologyNodes: ['WO3'],
    apiUrl: 'https://api.internal.com/v1/agents/nurture/execute',
    apiInputPermissions: ['read:customers', 'read:knowledge', 'write:followups'],
    apiOutputMappings: [
      { sourceField: 'generated_content', targetModel: 'FollowUp', targetField: 'content', action: 'create', description: '生成跟进记录' },
      { sourceField: 'customer_interest_level', targetModel: 'Customer', targetField: 'status', action: 'update', description: '更新客户活跃状态' }
    ]
  },
  { 
    id: 'A3', 
    name: 'Solution Agent (方案报价)', 
    role: 'Solution', 
    status: 'learning', 
    handledCount: 850, 
    successRate: 0.65, 
    description: '解析需求，匹配本体论知识库，生成BOM和报价单草稿。',
    model: 'gemini-3.1-pro-preview',
    systemPrompt: '你是资深FAE和商务专家。你的任务是解析客户的技术需求，从产品库中匹配合适的物料生成BOM，并根据客户等级和历史价格生成阶梯报价单。',
    triggerConditions: ['项目阶段变更为"报价阶段"', '收到客户新的需求文档'],
    accessibleDataModels: ['项目表 (Project)', '产品表 (Product)', '报价单表 (Quotation)'],
    assignedOntologyNodes: ['WO5', 'WO6', 'WO7'],
    apiUrl: 'https://api.internal.com/v1/agents/solution/execute',
    apiInputPermissions: ['read:projects', 'read:products', 'write:quotations'],
    apiOutputMappings: [
      { sourceField: 'bom_list', targetModel: 'Quotation', targetField: 'items', action: 'create', description: '生成报价单明细' },
      { sourceField: 'total_amount', targetModel: 'Quotation', targetField: 'amount', action: 'update', description: '更新报价总额' }
    ]
  },
  { 
    id: 'A4', 
    name: 'Delivery Agent (交付售后)', 
    role: 'Delivery', 
    status: 'active', 
    handledCount: 3200, 
    successRate: 0.98, 
    description: '同步生产进度，初步安抚客诉情绪。',
    model: 'gemini-3-flash-preview',
    systemPrompt: '你是交付与售后客服。你的任务是监控订单生产进度并自动同步给客户。当收到客诉时，第一时间进行情绪安抚，并提取关键信息分发给对应部门。',
    triggerConditions: ['订单状态变更', '收到新的客户反馈 (CustomerFeedback)'],
    accessibleDataModels: ['订单表 (SalesOrder)', '客诉反馈表 (CustomerFeedback)', '微信聊天记录 (GroupChat)'],
    assignedOntologyNodes: ['WO8', 'WO9'],
    apiUrl: 'https://api.internal.com/v1/agents/delivery/execute',
    apiInputPermissions: ['read:sales_orders', 'read:feedback', 'write:messages'],
    apiOutputMappings: [
      { sourceField: 'reply_message', targetModel: 'GroupChat', targetField: 'message', action: 'create', description: '发送安抚消息' },
      { sourceField: 'extracted_issue', targetModel: 'CustomerFeedback', targetField: 'issueType', action: 'update', description: '更新客诉类型' }
    ]
  }
];
