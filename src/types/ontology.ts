export interface Property {
  id: string;
  name: string;
  code: string;
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'DateTime' | 'Enum' | 'Text' | 'List' | 'Image' | 'Attachment';
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface Relation {
  id: string;
  targetObject: string;
  relationType: '1:1' | '1:N' | 'N:1' | 'N:N';
  description: string;
}

export interface WorkflowFlow {
  id: string;
  name: string;
  description: string;
  triggerType: 'button' | 'auto' | 'timed';
  triggerCondition?: string; // For auto and timed
  triggerFrequency?: string; // For timed
  triggerRule?: {
    mode: 'manual' | 'on_create' | 'on_approve' | 'on_field_change';
    fieldCode?: string;
    expectedValue?: string;
  };
  sopTaskConfig?: {
    enabled?: boolean;
    taskType?: string;
    titleTemplate?: string;
    descriptionTemplate?: string;
    assigneeRule?: 'current';
    dueOffsetDays?: number;
    priority?: 'high' | 'medium' | 'low';
    fields?: string[];
    fieldMappings?: Array<{ taskField: string; sourceField: string }>;
  };
  sopOqarConfig?: {
    enabled?: boolean;
    suggestedQuestions?: string[];
    replyPrompt?: string;
    unifiedPrompt?: string;
  };
  sopPromptConfig?: {
    prefix?: string;
    contextSources?: string[];
    modelId?: string;
  };
  progressionCheck?: {
    enabled?: boolean;
    promptTemplate?: string;
  };
  nodes: ProcessingNode[];
  uiData?: {
    reactFlowNodes: any[];
    reactFlowEdges: any[];
  };
}

export interface AIInputParameter {
  id: string;
  name: string;
  type: 'ontology' | 'current_field';
  ontologyCode?: string;
  idField?: string;
  fields?: string[];
  currentFieldCode?: string;
  isOntologyField?: boolean; // True if it's a field of the ontology, false if it's just a value
  channel?: string;
  limit?: number;
}

export interface AIInputFormat {
  ontologyObject: string;
  idField: string;
  parameters: string[];
}

export interface AIOutputFormat {
  successField: string;
  updates: { field: string; valueSource: string }[];
  failureReasonField: string;
}

export interface AIGoalConfig {
  id: string;
  title: string;
  prompt: string;
}

export interface AIConfig {
  model?: string;
  promptTemplate: string;
  // 线索场景：按客户行动类型覆盖 SPIN 提示词
  spinPromptByAction?: Record<string, string>;
  inputs: AIInputParameter[];
  goals?: AIGoalConfig[];
  inputFormat?: string | AIInputFormat;
  apiEndpoint?: string;
  apiKey?: string;
  outputFormat?: string | AIOutputFormat;
}

export interface ManualTaskBindingConfig {
  customerMode?: 'field' | 'fixed';
  customerIdField?: string;
  customerNameField?: string;
  fixedCustomerId?: string;
  fixedCustomerName?: string;
  assigneeMode?: 'current' | 'field' | 'fixed';
  assigneeIdField?: string;
  assigneeNameField?: string;
  fixedAssigneeId?: string;
  fixedAssigneeName?: string;
  dueDateMode?: 'field' | 'fixed' | 'rule';
  dueDateField?: string;
  fixedDueDate?: string;
  offsetDays?: number;
  requireConfirm?: boolean;
  generateTask?: boolean;
}

export interface DiscoveryCanvasItem {
  id: string;
  label: string;
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
  questionPrompt?: string;
  taskPrompt?: string;
  taskTemplate?: string;
  evidenceField?: string;
  completionRule?: string;
  missingTaskTitle?: string;
  missingTaskType?: string;
}

export interface DiscoveryCanvasConfig {
  enabled: boolean;
  items: DiscoveryCanvasItem[];
}

export interface OqarFeedbackPromptConfig {
  answerTemplate?: string;
  mustAsk?: string[];
}

export interface OqarAssistConfig {
  enabled: boolean;
  globalTemplate?: string;
  openingPrompt?: string;
  openingCount?: number;
  followupPrompt?: string;
  minClosedQuestions?: number;
  minOpenQuestions?: number;
  feedbackTypePrompts?: Record<string, OqarFeedbackPromptConfig>;
}

export interface NodeAction {
  id?: string;
  type: 'update_field' | 'add_sub_table';
  targetField?: string;
  targetSubTable?: string;
  valueSource?: string; // Key in AI output
  mapping?: { sourceField: string; targetField: string }[];
}

export interface ProcessingNode {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automatic' | 'push_down' | 'condition';
  condition?: string; // For condition nodes
  taskType?: string; // For manual task nodes
  
  // Automatic Task Configuration (formerly AI Node)
  automaticConfig?: {
    apiEndpoint: string;
    apiKey: string;
    inputs: AIInputParameter[];
    outputFormat: string;
    actions: NodeAction[];
    promptTemplate: string;
  };

  // Manual Task Configuration
  manualConfig?: {
    isAiAssisted: boolean;
    aiConfig?: AIConfig;
    aiInputFormat?: string | AIInputFormat;
    aiOutputFormat?: string | AIOutputFormat;
    aiApiEndpoint?: string;
    aiApiKey?: string;
    fields: {
      fieldId: string; // From ontology properties
      label: string;
      type: string;
      updateTarget: string; // Which ontology field to update
    }[];
    targets?: { id: string; description: string; isAiAssisted: boolean; aiConfig?: AIConfig }[];
    templateId?: string; // Standard template
    customTemplate?: string;
    fieldDefaults?: string;
    taskType?: string; // e.g. "普通任务", "客户拜访"
    assigneeRule?: string; // e.g. "当前处理人", "部门主管"
    taskBinding?: ManualTaskBindingConfig;
    personaFieldIds?: string[];
    discoveryCanvas?: DiscoveryCanvasConfig;
    oqarAssist?: OqarAssistConfig;
  };

  // Push-down Task Configuration
  pushDownConfig?: {
    targetOntologyCode: string;
    mapping: { sourceField: string; targetField: string }[];
  };

  // Condition Task Configuration
  conditionConfig?: {
    field: string;
    operator: string;
    value?: string;
    results: { id: string; label: string; value: string }[];
  };

  assignedRole?: string;
}

export interface OntologyRule {
  id: string;
  name: string;
  triggerPoint: 'before_save' | 'after_save' | 'before_delete' | 'after_delete';
  condition: string;
  actionType: 'terminate' | 'warning' | 'execute_flow';
  actionValue?: string; // For execute_flow, this would be the flow ID
  actionMessage?: string; // For warning/terminate
}

export interface OntologyObject {
  id: string;
  name: string;
  code: string;
  description: string;
  systemLink: string;
  isSubTable?: boolean;
  properties: Property[];
  relations: Relation[];
  flows: WorkflowFlow[];
  rules: OntologyRule[];
  statusAnalysis?: {
    enabled: boolean;
    model: string;
    promptTemplate: string;
    inputs: AIInputParameter[];
  };
}

export interface SystemFunction {
  id: string;
  name: string;
  code: string;
  associatedOntologyId?: string;
  basicFeatures: string[]; // 'add', 'edit', 'save', 'delete', 'submit_review', 'approve'
  customFlows: string[]; // IDs of WorkflowFlows
}
