import { TaskType, CustomerType, TodoTask } from '../types';

export const mockTaskTypes: TaskType[] = [
  { 
    id: 'T1', 
    name: '客户激活任务', 
    defaultHours: 72,
    fields: [
      { id: 'customer', name: '客户', type: 'customer', required: true },
      { id: 'contact', name: '客户联系人', type: 'text', required: false },
      { id: 'assignee', name: '负责人', type: 'user', required: true },
      { id: 'priority', name: '优先级', type: 'priority', required: false }
    ]
  },
  { 
    id: 'T2', 
    name: '项目跟进', 
    defaultHours: 48,
    fields: [
      { id: 'project', name: '项目', type: 'project', required: false },
      { id: 'assignee', name: '负责人', type: 'user', required: true },
      { id: 'priority', name: '优先级', type: 'priority', required: false }
    ]
  },
  { id: 'T3', name: '客诉处理', defaultHours: 4 },
  { id: 'T4', name: '报价审批', defaultHours: 12 },
  { id: 'T5', name: '样品申请', defaultHours: 24 }
];

export const mockCustomerTypes: CustomerType[] = [
  {
    id: 'CT1',
    name: '战略客户',
    visitFrequency: 7,
    sop: '1. 每周至少一次高层拜访\n2. 每月一次业务对齐会\n3. 季度业务回顾(QBR)'
  },
  {
    id: 'CT2',
    name: '成长型客户',
    visitFrequency: 14,
    sop: '1. 每两周一次现场拜访\n2. 每月提供行业分析报告\n3. 积极跟进新项目机会'
  },
  {
    id: 'CT3',
    name: '普通客户',
    visitFrequency: 30,
    sop: '1. 每月一次电话/微信跟进\n2. 节假日问候\n3. 关注复购情况'
  }
];

export const mockTodoTasks: TodoTask[] = [
  {
    id: 'T001',
    title: '确认二季度交付计划',
    description: '来自群聊：某科技公司-项目沟通群',
    status: '待办',
    dueDate: '2024-03-20',
    assignee: '业务员',
    taskType: '项目跟进',
    sourceType: 'chat',
    sourceId: 'GC001',
    creatorId: 'U001',
    creatorNo: '001',
    creatorName: '业务员',
    createDate: '2024-03-16'
  },
  {
    id: 't1',
    taskNo: 'RW2603175167',
    title: '料号确认最新价格',
    description: '五款料号请确认最新价格',
    status: '进行中',
    dueDate: '2026-03-17 16:00:00',
    assignee: '杨喜梅',
    taskType: '项目跟进',
    sourceType: 'project',
    sourceId: 'XM2603173188',
    associatedProject: '海康威视-安防摄像头线束定制',
    associatedProjectId: 'XM2603173188',
    importance: '高',
    urgency: '闲时',
    creatorId: 'U004',
    creatorNo: 'E004',
    creatorName: '业务-王芳',
    createDate: '2026-03-17'
  },
  {
    id: 'FUP1',
    title: '客户激活任务：联系王总确认5G天线项目进度',
    description: '客户激活跟进，确认5G天线项目推进节奏',
    status: '已完成',
    dueDate: '2026-03-22',
    assignee: '张三',
    taskType: '客户激活任务',
    sourceType: 'customer',
    sourceId: 'CUS-20260317-001',
    associatedCustomerName: '四信通信',
    associatedCustomerId: 'CUS-20260317-001',
    contactName: '王总',
    actualContent: '已完成拜访，王总对样品满意，准备进入小批量产阶段阶段。',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-15'
  },
  {
    id: 'FUP2',
    title: '客户激活任务：电话跟进云台排线样品测试情况',
    description: '客户激活跟进云台排线样品测试情况',
    status: '待办',
    dueDate: '2026-03-22',
    assignee: '张三',
    taskType: '客户激活任务',
    sourceType: 'customer',
    sourceId: 'CUS-20260317-002',
    associatedCustomerName: '大疆创新',
    associatedCustomerId: 'CUS-20260317-002',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-15'
  },
  {
    id: 'AI_T001',
    title: '审核大疆创新M12防水接头报价单',
    description: 'Solution Agent 已根据客户需求和历史价格生成了阶梯报价单草稿，请人工审核并确认发送。',
    status: '待办',
    dueDate: '2026-03-31',
    assignee: '业务员',
    taskType: '常规任务',
    sourceType: 'ai_agent',
    sourceId: 'A3',
    associatedCustomerName: '大疆创新',
    importance: '高',
    urgency: '非常紧急',
    creatorId: 'A3',
    creatorNo: 'A3',
    creatorName: 'Solution Agent',
    createDate: '2026-03-31',
    aiConfidence: 0.85,
    requiresHumanApproval: true,
    originatingFlowId: 'flow_quote_approval',
    originatingFlowName: '报价审批流程',
    originatingOntologyName: '商机',
    goal: '完成大疆创新M12防水接头的阶梯报价审核，确保毛利率不低于25%',
    aiSuggestions: [
      '建议参考去年同期的原材料价格波动',
      '可以尝试捆绑销售防水密封圈以提高客单价',
      '检查该客户的历史回款记录，考虑是否需要预付款'
    ],
    history: [
      { id: 'h1', timestamp: '2026-03-31 09:00', action: '触发流程', operator: '系统', details: '商机状态变更为“方案报价”' },
      { id: 'h2', timestamp: '2026-03-31 09:05', action: 'AI 预处理', operator: 'Solution Agent', details: '自动提取物料清单并匹配历史成交价' },
      { id: 'h3', timestamp: '2026-03-31 09:10', action: '创建任务', operator: '系统', details: '指派给业务员进行人工审核' }
    ],
    aiDraftContent: {
      "quoteNo": "Q20260331001",
      "customerName": "大疆创新",
      "items": [
        { "partNumber": "M12-4P-M-A", "description": "M12 4芯 公头 A-Code", "quantity": 1000, "unitPrice": 12.5 },
        { "partNumber": "M12-4P-M-A", "description": "M12 4芯 公头 A-Code", "quantity": 5000, "unitPrice": 11.2 },
        { "partNumber": "M12-4P-M-A", "description": "M12 4芯 公头 A-Code", "quantity": 10000, "unitPrice": 10.5 }
      ],
      "totalAmount": "阶梯报价",
      "validUntil": "2026-04-30"
    }
  },
  {
    id: 'AI_T002',
    title: '跟进异常客诉：防水线束漏水',
    description: 'Delivery Agent 识别到客户邮件中包含严重的质量投诉情绪，已自动建单并转交人工处理。',
    status: '待办',
    dueDate: '2026-03-31',
    assignee: '品质主管',
    taskType: '客诉处理',
    sourceType: 'ai_agent',
    sourceId: 'A4',
    associatedCustomerName: '海康威视',
    importance: '高',
    urgency: '非常紧急',
    creatorId: 'A4',
    creatorNo: 'A4',
    creatorName: 'Delivery Agent',
    createDate: '2026-03-31',
    aiConfidence: 0.95,
    requiresHumanApproval: true,
    aiDraftContent: "客户邮件摘要：上周交付的1000条防水线束在户外测试中发现有30条出现渗水现象，导致设备短路。客户情绪激动，要求立即给出解决方案并退换货。"
  },
  {
    id: 't-design-001',
    taskNo: 'RW2603175168',
    title: '技术方案设计: 海康威视-安防摄像头线束定制',
    description: '进行技术方案设计，包括物料清单和图纸初步设计。',
    status: '进行中',
    dueDate: '2026-03-25',
    assignee: '研发部',
    taskType: '项目跟进',
    sourceType: 'project',
    sourceId: 'XM2603173188',
    associatedProjectId: 'XM2603173188',
    importance: '高',
    urgency: '正常',
    creatorId: 'U2',
    creatorNo: 'E002',
    creatorName: '李四',
    createDate: '2026-03-17'
  }
];

export const mockTasks = mockTodoTasks;
