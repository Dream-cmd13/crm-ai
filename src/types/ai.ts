export interface AIAgent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'learning' | 'inactive';
  handledCount: number;
  successRate: number;
  description: string;
  model: string;
  systemPrompt: string;
  triggerConditions: string[];
  accessibleDataModels: string[];
  assignedOntologyNodes: string[];
  apiUrl?: string;
  apiInputPermissions?: string[];
  apiOutputMappings?: {
    sourceField: string;
    targetModel: string;
    targetField: string;
    action: 'create' | 'update';
    description: string;
  }[];
}

export interface AIAgentLog {
  id: string;
  agentId: string;
  timestamp: string;
  action: string;
  status: 'success' | 'failed' | 'running';
  details: string;
  targetId?: string;
}

export interface WorkOntologyNode {
  id: string;
  name: string;
  category: string;
  description: string;
  automationLevel: number;
  assignedAgentId?: string;
  humanFallbackRole: string;
  complexity: '低' | '中' | '高';
}
