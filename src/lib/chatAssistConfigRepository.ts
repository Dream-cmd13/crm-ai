import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type ChatAssistDataSource =
  | 'chat_context'
  | 'intent'
  | 'faq'
  | 'persona'
  | 'focus_competitor'
  | 'customer_profile'
  | 'customer_demand'
  | 'customer_cases'
  | 'product_fab'
  | 'department_prompt';

export type ChatAssistFlowNode = {
  id: string;
  name: string;
  enabled: boolean;
  dataSources: ChatAssistDataSource[];
  instruction: string;
  // 支持在节点中按变量模板定义细化指令：{{chat_context}} / {{faq_context}} / {{node_result_xxx}}
  promptTemplate?: string;
  // 节点输出变量名，可供后续节点引用
  outputVar?: string;
  // 与竞品SWOT一致的背景参数配置（AiContextConfig key 列表）
  contextSources?: string[];
};

export type ChatAssistFlow = {
  id: string;
  name: string;
  description?: string;
  modelId?: string;
  enabled: boolean;
  isDefault?: boolean;
  nodes: ChatAssistFlowNode[];
};

export type ChatAssistConfig = {
  useFaqAnswer: boolean;
  usePersonaAnswer: boolean;
  useFocusCompetitorAnswer: boolean;
  strictMode: boolean;
  responseTone: string;
  responseLength: 'short' | 'medium' | 'long';
  mustInclude: string;
  forbidden: string;
  customPromptSuffix: string;
  retrieval: {
    faqTopN: number;
    faqMinScore: number;
    focusTopN: number;
    caseTopN: number;
    seriesTopN: number;
  };
  intentCategories: Array<{
    id: string;
    name: string;
    keywords: string[];
    strategyHint: string;
  }>;
  analysisSteps: string[];
  departmentPrompts: Array<{
    id: string;
    department: string;
    prompt: string;
    enabled: boolean;
  }>;
  // 兼容字段：旧版单流程节点（读取时会迁移到 flows）
  flowNodes?: ChatAssistFlowNode[];
  // 新版多流程配置
  flows: ChatAssistFlow[];
  defaultFlowId: string;
};

const DEFAULT_CHAT_ASSIST_CONFIG: ChatAssistConfig = {
  useFaqAnswer: true,
  usePersonaAnswer: true,
  useFocusCompetitorAnswer: true,
  strictMode: true,
  responseTone: '专业、口语化、可直接发送',
  responseLength: 'medium',
  mustInclude: '匹配判断；建议回复话术；下一步推进动作',
  forbidden: '空话套话；夸大承诺；无法落地的建议',
  customPromptSuffix: '优先贴合当前聊天语境，不要重复客户已明确拒绝的点。',
  retrieval: {
    faqTopN: 3,
    faqMinScore: 2,
    focusTopN: 3,
    caseTopN: 2,
    seriesTopN: 2
  },
  intentCategories: [
    { id: 'intent_tech', name: '技术与选型', keywords: ['技术', '参数', '规格', '兼容', '认证', '可靠性'], strategyHint: '优先给可验证技术依据与验证路径' },
    { id: 'intent_price', name: '商务与价格', keywords: ['价格', '成本', '折扣', '账期', '付款', '条款'], strategyHint: '先价值锚定，再给可谈判边界' },
    { id: 'intent_delivery', name: '交付与风险', keywords: ['交期', '产能', '风险', '延期', '备货', '质量'], strategyHint: '给保供方案、异常预案和升级路径' },
    { id: 'intent_competitor', name: '竞品对比', keywords: ['竞品', '对手', '替代', '比较', '优势', '劣势'], strategyHint: '给差异化证据，避免贬损式表达' }
  ],
  analysisSteps: [
    '识别当前发言人与角色（决策/技术/采购/使用）',
    '识别本轮会话意图与阶段（探询/异议/谈判/推进）',
    '按意图检索FAQ、联系人画像、关注点与竞品、客户需求、案例与FAB',
    '产出匹配判断、建议话术、下一步动作与风险提示'
  ],
  departmentPrompts: [
    { id: 'dept_mgmt', department: '管理层', prompt: '强调业务价值、ROI、风险控制与推进决策。', enabled: true },
    { id: 'dept_rd', department: '研发/技术', prompt: '强调技术适配、验证路径、可靠性与落地计划。', enabled: true },
    { id: 'dept_procurement', department: '采购/供应链', prompt: '强调成本结构、交付保障、条款与长期稳定供给。', enabled: true },
    { id: 'dept_ops', department: '生产/质量', prompt: '强调质量一致性、批次稳定、异常闭环与售后响应。', enabled: true }
  ],
  flowNodes: [
    {
      id: 'node_role_intent',
      name: '识别发言人和意图',
      enabled: true,
      dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'],
      instruction: '先判断当前发言人角色、部门与意图，再决定后续检索方向。',
      promptTemplate: '基于{{chat_context}}，识别发言人角色与意图，并输出可执行判断。',
      outputVar: 'role_intent_result',
      contextSources: ['customer_name', 'contact_persona', 'chat_records']
    },
    {
      id: 'node_evidence',
      name: '检索证据资料',
      enabled: true,
      dataSources: ['faq', 'focus_competitor', 'customer_profile', 'customer_demand', 'customer_cases', 'product_fab'],
      instruction: '按意图检索FAQ、关注点/竞品、客户需求、案例与FAB，优先高相关证据。',
      promptTemplate: '结合意图{{intent_summary}}与上一步{{role_intent_result}}，汇总FAQ/背景证据。',
      outputVar: 'evidence_result',
      contextSources: ['customer_profile', 'customer_focus_archive', 'wechat_records', 'wechat_group_records', 'meeting_records']
    },
    {
      id: 'node_reply',
      name: '生成建议话术',
      enabled: true,
      dataSources: ['chat_context', 'faq', 'persona', 'focus_competitor', 'customer_cases', 'product_fab'],
      instruction: '输出匹配判断、建议话术、下一步动作和风险提示，内容可直接发送。',
      promptTemplate: '根据{{chat_context}}与{{evidence_result}}输出最终话术。',
      outputVar: 'reply_result',
      contextSources: ['customer_name', 'customer_profile', 'chat_records', 'customer_focus_archive']
    }
  ],
  flows: [
    {
      id: 'flow_default_huawei',
      name: '华为标准流程',
      description: '标准大客户会话分析与回复流程',
      modelId: '',
      enabled: true,
      isDefault: true,
      nodes: [
        {
          id: 'node_role_intent',
          name: '识别发言人和意图',
          enabled: true,
          dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'],
          instruction: '先判断当前发言人角色、部门与意图，再决定后续检索方向。',
          promptTemplate: '基于{{chat_context}}，识别发言人角色与意图，并输出可执行判断。',
          outputVar: 'role_intent_result',
          contextSources: ['customer_name', 'contact_persona', 'chat_records']
        },
        {
          id: 'node_evidence',
          name: '检索证据资料',
          enabled: true,
          dataSources: ['faq', 'focus_competitor', 'customer_profile', 'customer_demand', 'customer_cases', 'product_fab'],
          instruction: '按意图检索FAQ、关注点/竞品、客户需求、案例与FAB，优先高相关证据。',
          promptTemplate: '结合意图{{intent_summary}}与上一步{{role_intent_result}}，汇总FAQ/背景证据。',
          outputVar: 'evidence_result',
          contextSources: ['customer_profile', 'customer_focus_archive', 'wechat_records', 'wechat_group_records', 'meeting_records']
        },
        {
          id: 'node_reply',
          name: '生成建议话术',
          enabled: true,
          dataSources: ['chat_context', 'faq', 'persona', 'focus_competitor', 'customer_cases', 'product_fab'],
          instruction: '输出匹配判断、建议话术、下一步动作和风险提示，内容可直接发送。',
          promptTemplate: '根据{{chat_context}}与{{evidence_result}}输出最终话术。',
          outputVar: 'reply_result',
          contextSources: ['customer_name', 'customer_profile', 'chat_records', 'customer_focus_archive']
        }
      ]
    }
  ],
  defaultFlowId: 'flow_default_huawei'
};

const normalizeFlowNodes = (nodes: any[], fallbackPrefix: string): ChatAssistFlowNode[] =>
  (nodes || []).map((x: any, idx: number) => ({
    id: String(x?.id || `${fallbackPrefix}_${idx + 1}`),
    name: String(x?.name || `流程节点${idx + 1}`),
    enabled: x?.enabled !== false,
    dataSources: Array.isArray(x?.dataSources) ? x.dataSources.map((s: any) => String(s)) as ChatAssistDataSource[] : [],
    instruction: String(x?.instruction || ''),
    promptTemplate: String(x?.promptTemplate || ''),
    outputVar: String(x?.outputVar || `node_result_${idx + 1}`),
    contextSources: Array.isArray(x?.contextSources) ? x.contextSources.map((k: any) => String(k || '').trim()).filter(Boolean) : []
  }));

const normalizeConfig = (raw: any): ChatAssistConfig => {
  const legacyNodes = Array.isArray(raw?.flowNodes) && raw.flowNodes.length > 0
    ? normalizeFlowNodes(raw.flowNodes, 'flow_legacy_node')
    : [];
  const normalizedFlows: ChatAssistFlow[] = Array.isArray(raw?.flows) && raw.flows.length > 0
    ? raw.flows.map((flow: any, idx: number) => ({
        id: String(flow?.id || `flow_${idx + 1}`),
        name: String(flow?.name || `流程${idx + 1}`),
        description: String(flow?.description || ''),
        modelId: String(flow?.modelId || ''),
        enabled: flow?.enabled !== false,
        isDefault: flow?.isDefault === true,
        nodes: normalizeFlowNodes(Array.isArray(flow?.nodes) ? flow.nodes : [], `flow_${idx + 1}_node`)
      }))
    : [{
        id: 'flow_default_huawei',
        name: '华为标准流程',
        description: '由旧版flowNodes自动迁移',
        modelId: '',
        enabled: true,
        isDefault: true,
        nodes: legacyNodes.length > 0 ? legacyNodes : DEFAULT_CHAT_ASSIST_CONFIG.flows[0].nodes
      }];

  const fallbackDefaultFlowId = normalizedFlows.find((f) => f.isDefault)?.id || normalizedFlows[0]?.id || DEFAULT_CHAT_ASSIST_CONFIG.defaultFlowId;

  return ({
  useFaqAnswer: raw?.useFaqAnswer ?? DEFAULT_CHAT_ASSIST_CONFIG.useFaqAnswer,
  usePersonaAnswer: raw?.usePersonaAnswer ?? DEFAULT_CHAT_ASSIST_CONFIG.usePersonaAnswer,
  useFocusCompetitorAnswer: raw?.useFocusCompetitorAnswer ?? DEFAULT_CHAT_ASSIST_CONFIG.useFocusCompetitorAnswer,
  strictMode: raw?.strictMode ?? DEFAULT_CHAT_ASSIST_CONFIG.strictMode,
  responseTone: String(raw?.responseTone ?? DEFAULT_CHAT_ASSIST_CONFIG.responseTone),
  responseLength: (['short', 'medium', 'long'].includes(String(raw?.responseLength)) ? raw.responseLength : DEFAULT_CHAT_ASSIST_CONFIG.responseLength) as 'short' | 'medium' | 'long',
  mustInclude: String(raw?.mustInclude ?? DEFAULT_CHAT_ASSIST_CONFIG.mustInclude),
  forbidden: String(raw?.forbidden ?? DEFAULT_CHAT_ASSIST_CONFIG.forbidden),
  customPromptSuffix: String(raw?.customPromptSuffix ?? DEFAULT_CHAT_ASSIST_CONFIG.customPromptSuffix),
  retrieval: {
    faqTopN: Number(raw?.retrieval?.faqTopN ?? DEFAULT_CHAT_ASSIST_CONFIG.retrieval.faqTopN),
    faqMinScore: Number(raw?.retrieval?.faqMinScore ?? DEFAULT_CHAT_ASSIST_CONFIG.retrieval.faqMinScore),
    focusTopN: Number(raw?.retrieval?.focusTopN ?? DEFAULT_CHAT_ASSIST_CONFIG.retrieval.focusTopN),
    caseTopN: Number(raw?.retrieval?.caseTopN ?? DEFAULT_CHAT_ASSIST_CONFIG.retrieval.caseTopN),
    seriesTopN: Number(raw?.retrieval?.seriesTopN ?? DEFAULT_CHAT_ASSIST_CONFIG.retrieval.seriesTopN)
  },
  intentCategories: Array.isArray(raw?.intentCategories) && raw.intentCategories.length > 0
    ? raw.intentCategories.map((x: any, idx: number) => ({
        id: String(x?.id || `intent_${idx + 1}`),
        name: String(x?.name || `意图${idx + 1}`),
        keywords: Array.isArray(x?.keywords) ? x.keywords.map((k: any) => String(k || '').trim()).filter(Boolean) : [],
        strategyHint: String(x?.strategyHint || '')
      }))
    : DEFAULT_CHAT_ASSIST_CONFIG.intentCategories,
  analysisSteps: Array.isArray(raw?.analysisSteps) && raw.analysisSteps.length > 0
    ? raw.analysisSteps.map((x: any) => String(x || '').trim()).filter(Boolean)
    : DEFAULT_CHAT_ASSIST_CONFIG.analysisSteps,
  departmentPrompts: Array.isArray(raw?.departmentPrompts) && raw.departmentPrompts.length > 0
    ? raw.departmentPrompts.map((x: any, idx: number) => ({
        id: String(x?.id || `dept_${idx + 1}`),
        department: String(x?.department || `部门${idx + 1}`),
        prompt: String(x?.prompt || ''),
        enabled: x?.enabled !== false
      }))
    : DEFAULT_CHAT_ASSIST_CONFIG.departmentPrompts,
  flowNodes: legacyNodes.length > 0 ? legacyNodes : (normalizedFlows.find((f) => f.id === fallbackDefaultFlowId)?.nodes || DEFAULT_CHAT_ASSIST_CONFIG.flowNodes),
  flows: normalizedFlows,
  defaultFlowId: String(raw?.defaultFlowId || fallbackDefaultFlowId)
});
};

export const fetchChatAssistConfigFromSupabase = async (): Promise<ChatAssistConfig> => {
  if (!isSupabaseConfigured()) return DEFAULT_CHAT_ASSIST_CONFIG;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_system_config')
    .select('value_json')
    .eq('id', 'chat_assist_config')
    .limit(1);
  if (error) throw error;
  const raw = data?.[0]?.value_json || {};
  return normalizeConfig(raw);
};

export const saveChatAssistConfigToSupabase = async (config: ChatAssistConfig): Promise<ChatAssistConfig> => {
  const normalized = normalizeConfig(config);
  if (!isSupabaseConfigured()) return normalized;
  const supabase = getSupabaseClient();
  const payload = {
    id: 'chat_assist_config',
    name: '聊天会话AI辅助设置',
    value_json: normalized,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return normalized;
};

export const defaultChatAssistConfig = DEFAULT_CHAT_ASSIST_CONFIG;
