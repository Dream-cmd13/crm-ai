import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type ActivationTaskTemplate = {
  title: string;
  description: string;
  objectives: Array<{ id: string; title: string }>;
};

export type ActivationThresholdRule = {
  id: string;
  customerTypeId?: string;
  isPotential?: boolean;
  inactiveDays: number;
};

export type ActivationFlowTemplate = {
  id: string;
  name: string;
  description?: string;
  customerTypeId?: string;
  isPotential?: boolean;
  inactiveDays?: number;
  triggerCondition?: string;
  nodes: Array<{
    id: string;
    name: string;
    description?: string;
    aiPromptTemplate?: string;
    aiModelId?: string;
    contextSources?: string[];
    aiGoals?: Array<{ id: string; title: string; prompt: string }>;
  }>;
};

export type VisitActivationConfig = {
  defaultInactiveDays: number;
  thresholdRules: ActivationThresholdRule[]; // 兼容旧数据，前端新配置使用 flows.inactiveDays
  templatesByType: Record<string, ActivationTaskTemplate>;
  defaultTemplate: ActivationTaskTemplate;
  flows: ActivationFlowTemplate[];
  frameworkPromptTemplate?: string;
};

const CONFIG_ID = 'visit_activation_config';
const DEFAULT_ACTIVATION_CONTEXT_SOURCES = ['customer_name', 'customer_profile', 'contact_persona', 'chat_records', 'customer_focus_archive'];
const DEFAULT_ACTIVATION_PROMPT_TEMPLATE =
  '你是华为大客户销售顾问，请基于华为销售法（LTC/SPIN/Blue Sheet）深度分析当前客户状态，并给出可执行的客户激活策略。\\n' +
  '输入信息：\\n' +
  '- 客户名称：{custname}\\n' +
  '- 客户画像：{profile}\\n' +
  '- 联系人画像：{contact_persona}\\n' +
  '- 最近沟通记录：{chat}\\n' +
  '- 客户关注点档案：{customer_focus_archive}\\n' +
  '输出要求：\\n' +
  '1）先判断客户当前阶段、关键阻塞与激活机会；\\n' +
  '2）给出一个完整的激活策略块（含目标、关键动作、风险应对、下一步推进）；\\n' +
  '3）语言专业、务实、可直接执行。';

export const defaultVisitActivationConfig: VisitActivationConfig = {
  defaultInactiveDays: 30,
  thresholdRules: [],
  templatesByType: {},
  defaultTemplate: {
    title: '客户激活任务',
    description: '基于沉睡周期触发的客户激活跟进任务',
    objectives: [
      { id: 'obj_1', title: '寒暄并发送最新资料' },
      { id: 'obj_2', title: '确认近期采购计划' },
      { id: 'obj_3', title: '邀约一次线上/线下拜访' }
    ]
  },
  flows: []
  ,
  frameworkPromptTemplate:
    '你是华为大客户销售专家。请基于客户资料、历史拜访/聊天记录、客户画像、联系人、关注点与竞品SWOT，输出“阶次拜访框架”。\n要求：\n1) 输出4-6个阶段；\n2) 每个阶段包含：阶段名、目标、关键动作、退出标准；\n3) 最后给出“下一阶段建议生成规则”。\n请使用易读分段文本。'
};

const toSafeConfig = (value: any): VisitActivationConfig => {
  if (!value || typeof value !== 'object') return defaultVisitActivationConfig;
  const defaultInactiveDays = Number(value.defaultInactiveDays || 30);
  const defaultTemplate = value.defaultTemplate || defaultVisitActivationConfig.defaultTemplate;
  const templatesByType = value.templatesByType && typeof value.templatesByType === 'object' ? value.templatesByType : {};
  const thresholdRules = Array.isArray(value.thresholdRules) ? value.thresholdRules : [];
  const flows = Array.isArray(value.flows) ? value.flows : [];
  const normalizedRules: ActivationThresholdRule[] = thresholdRules
    .map((r: any, idx: number) => ({
      id: String(r?.id || `rule_${idx + 1}`),
      customerTypeId: r?.customerTypeId ? String(r.customerTypeId) : undefined,
      isPotential: typeof r?.isPotential === 'boolean' ? r.isPotential : undefined,
      inactiveDays: Number(r?.inactiveDays || 0) || 30
    }))
    .filter((r: ActivationThresholdRule) => Number(r.inactiveDays) > 0);
  return {
    defaultInactiveDays: Number.isFinite(defaultInactiveDays) && defaultInactiveDays > 0 ? defaultInactiveDays : 30,
    thresholdRules: normalizedRules,
    defaultTemplate: {
      title: String(defaultTemplate.title || defaultVisitActivationConfig.defaultTemplate.title),
      description: String(defaultTemplate.description || defaultVisitActivationConfig.defaultTemplate.description),
      objectives: Array.isArray(defaultTemplate.objectives) && defaultTemplate.objectives.length > 0
        ? defaultTemplate.objectives.map((o: any, idx: number) => ({
            id: String(o?.id || `obj_${idx + 1}`),
            title: String(o?.title || '')
          })).filter((o: any) => o.title)
        : defaultVisitActivationConfig.defaultTemplate.objectives
    },
    templatesByType,
    flows: flows.map((f: any, idx: number) => ({
      id: String(f?.id || `flow_${idx + 1}`),
      name: String(f?.name || `激活流程${idx + 1}`),
      description: String(f?.description || ''),
      customerTypeId: f?.customerTypeId ? String(f.customerTypeId) : undefined,
      isPotential: typeof f?.isPotential === 'boolean' ? f.isPotential : undefined,
      inactiveDays: Number(f?.inactiveDays || 0) || normalizedRules.find((r) => {
        const typeMatched = !r.customerTypeId || r.customerTypeId === (f?.customerTypeId ? String(f.customerTypeId) : undefined);
        const potentialMatched = typeof r.isPotential !== 'boolean' || r.isPotential === (typeof f?.isPotential === 'boolean' ? f.isPotential : undefined);
        return typeMatched && potentialMatched;
      })?.inactiveDays || (Number(value.defaultInactiveDays || 30) || 30),
      triggerCondition: String(f?.triggerCondition || '客户长时间未联系'),
      nodes: Array.isArray(f?.nodes)
        ? f.nodes.map((n: any, i: number) => ({
            id: String(n?.id || `node_${i + 1}`),
            name: String(n?.name || `节点${i + 1}`),
            description: String(n?.description || ''),
            aiPromptTemplate: String(n?.aiPromptTemplate || n?.manualConfig?.aiConfig?.promptTemplate || DEFAULT_ACTIVATION_PROMPT_TEMPLATE),
            aiModelId: String(n?.aiModelId || n?.manualConfig?.aiConfig?.model || ''),
            contextSources: Array.isArray(n?.contextSources)
              ? n.contextSources.map((x: any) => String(x || '').trim()).filter(Boolean)
              : (Array.isArray(n?.manualConfig?.aiConfig?.contextSources)
                ? n.manualConfig.aiConfig.contextSources.map((x: any) => String(x || '').trim()).filter(Boolean)
                : DEFAULT_ACTIVATION_CONTEXT_SOURCES),
            aiGoals: Array.isArray(n?.aiGoals) ? n.aiGoals : []
          }))
        : []
    })),
    frameworkPromptTemplate: String(value.frameworkPromptTemplate || defaultVisitActivationConfig.frameworkPromptTemplate || '')
  };
};

export const fetchVisitActivationConfig = async (): Promise<VisitActivationConfig> => {
  if (!isSupabaseConfigured()) return defaultVisitActivationConfig;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_system_config')
    .select('value_json')
    .eq('id', CONFIG_ID)
    .limit(1);
  if (error) throw error;
  return toSafeConfig(data?.[0]?.value_json);
};

export const saveVisitActivationConfig = async (config: VisitActivationConfig) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = {
    id: CONFIG_ID,
    name: '客户激活设置',
    value_json: toSafeConfig(config),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};
