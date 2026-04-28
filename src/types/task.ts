export interface TaskField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'customer' | 'project' | 'user' | 'priority';
  options?: string[]; // For select type
  required: boolean;
}

export interface ResponseTimeRule {
  id: string;
  condition: {
    fieldId: string;
    operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
    value: string;
  }[];
  hours: number;
}

export interface TaskCompletionConfig {
  requireCompletionTime: boolean;
  requireCompletionEffect: boolean;
  requireCompletionNote: boolean;
}

export interface TaskType {
  id: string;
  name: string;
  defaultHours: number;
  fields?: TaskField[];
  responseTimeRules?: ResponseTimeRule[];
  completionConfig?: TaskCompletionConfig;
}

export interface CustomerType {
  id: string;
  name: string;
  visitFrequency: number;
  sop: string;
  conditionDescription?: string;
  inactiveDays?: number;
  activationTemplateId?: string;
}

export interface TaskHistory {
  id: string;
  timestamp: string;
  action: string;
  operator: string;
  details?: string;
}

export interface TodoTask {
  id: string;
  taskNo?: string;
  title: string;
  description: string;
  status: '待办' | '进行中' | '已完成' | '已取消';
  dueDate: string;
  assignee: string;
  assigneeId?: string;
  assigneeName?: string;
  assignorId?: string;
  assignorName?: string;
  assistants?: string[];
  urgency?: '非常紧急' | '紧急' | '正常' | '闲时';
  importance?: '高' | '中' | '低';
  taskType: string;
  sourceType: 'inquiry' | 'lead' | 'opportunity' | 'project' | 'customer' | 'chat' | 'visit' | 'ai_agent' | 'manual' | 'task_decomposition' | 'quotation' | 'order' | 'sample' | 'return';
  sourceId?: string;
  associatedProject?: string;
  associatedProjectId?: string;
  associatedCustomerName?: string;
  associatedCustomerId?: string;
  associatedContactId?: string;
  associatedContactName?: string;
  creatorId: string;
  creatorNo: string;
  creatorName: string;
  createDate: string;
  
  // Follow-up specific
  contactName?: string;
  visitType?: '现场拜访' | '微信/电话' | '视频会议' | '其他';
  actualContent?: string;
  completionTime?: string;
  completionNote?: string;
  
  // AI Agent specific
  aiConfidence?: number;
  requiresHumanApproval?: boolean;
  aiDraftContent?: any;
  aiContextId?: string; // Phase 1: 绑定专属大模型会话
  objectives?: any; // Phase 1: 多目标任务模型 (JSONB)

  // New fields for enhanced task management
  originatingFlowId?: string;
  originatingFlowName?: string;
  originatingOntologyName?: string;
  goal?: string;
  aiSuggestions?: string[];
  history?: TaskHistory[];
  audioBlob?: Blob;
  checked?: boolean;
  auxiliaryData?: any;
  
  // Scheduling
  isDelayed?: boolean;
  delayWarningSent?: boolean;
  parentId?: string;
  hiddenFromMain?: boolean;
}
