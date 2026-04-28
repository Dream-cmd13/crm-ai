import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const CONFIG_ID = 'persona_ai_config';

export const defaultPersonaAiConfig = {
  model: '',
  temperature: 0.7,
  maxTokens: 2000,
  basePrompt: '你是资深B2B客户研究分析师。请围绕“客户画像”任务进行多源信息交叉验证，只输出客户画像，不要生成跟进建议、话术、方案、任务等其他内容。\n客户名称：{custname}\n客户ID：{customer_id}\n默认背景信息：\n{default_context}',
  analysisPrompt: '请基于输入背景与可获取的公开信息进行多源验证（官网/新闻/招投标/招聘/工商等），严格按维度输出客户画像。\n输出要求：\n1) 仅输出JSON对象；\n2) 仅包含已定义维度ID（如F1/F2）；\n3) 每个value使用固定结构：\n【分析结论】...\n【关键依据】...\n【待验证点】...\n【可信度】高/中/低（并说明）\n4) 所有维度必须都有值，证据不足也要给占位；\n5) 绝对不要输出维度以外字段，不要输出跟进建议/营销话术。',
  followUpPrompt: '请参考华为大客户销售方法（LTC/MSP），基于客户画像输出AI跟进建议，并必须给出该客户的“客户阶次拜访框架”。\n输出要求：\n1. 先输出客户阶次拜访框架（4-6阶段，每阶段含目标/关键动作/退出标准）；\n2. 再输出关键人（A/D/S/E/I）推进策略；\n3. 输出本周/本月可执行动作与里程碑；\n4. 输出风险与备选预案。\n格式：标题+分点，可直接用于拜访与任务安排。',
  analysisContextSources: ['customer_name', 'customer_focus_archive', 'chat_records', 'meeting_records', 'contact_persona'],
  followUpContextSources: ['customer_name', 'customer_profile', 'customer_focus_archive', 'contact_persona', 'meeting_records', 'project_solution'],
  fields: [
    {
      id: 'F1',
      name: '公司概要',
      description: '公司位置、行业地位、体量、发展阶段',
      analysisPrompt: '提炼客户公司简介、所在行业、规模与阶段判断；标注不确定信息。',
      suggestionPrompt: '输出“应重点验证的3个公司层面问题”。',
      contextSources: ['customer_name', 'customer_focus_archive', 'chat_records', 'meeting_records']
    },
    {
      id: 'F2',
      name: '主营业务',
      description: '产品线、应用场景、业务增长方向',
      analysisPrompt: '识别客户主营业务和关键应用场景，给出业务方向与机会点。',
      suggestionPrompt: '输出“我方可对齐的2-3个业务价值点”。',
      contextSources: ['customer_name', 'customer_focus_archive', 'project_solution', 'chat_records']
    },
    {
      id: 'F3',
      name: '财务状况',
      description: '预算能力、投入周期、回款与成本偏好',
      analysisPrompt: '判断客户预算敏感度、投入周期与采购决策节奏，区分已证实/待验证。',
      suggestionPrompt: '输出“报价策略建议（保守/均衡/进攻）及理由”。',
      contextSources: ['customer_focus_archive', 'chat_records', 'meeting_records', 'email_records']
    },
    {
      id: 'F4',
      name: '客户解读',
      description: '客户关注点、诉求与风险顾虑',
      analysisPrompt: '提炼客户最关心的目标、痛点和顾虑，按优先级排序。',
      suggestionPrompt: '输出“下次沟通必须覆盖的3个问题”。',
      contextSources: ['customer_name', 'customer_focus_archive', 'chat_records', 'project_solution']
    },
    {
      id: 'F5',
      name: '客户地图',
      description: '组织架构、关键角色、决策链路',
      analysisPrompt: '识别决策链关键人，按A/D/S/E/I角色输出，并给出初始态度判断。',
      suggestionPrompt: '输出“本周优先触达对象+目标动作”。',
      contextSources: ['customer_focus_archive', 'contact_persona', 'chat_records', 'meeting_records']
    },
    {
      id: 'F6',
      name: '关键人物（KP）',
      description: '关键人画像、需求层次、影响方式',
      analysisPrompt: '对关键人物进行简画像：职位影响力、偏好、潜在诉求、对我方态度。',
      suggestionPrompt: '输出每位关键人的“沟通策略一句话”。',
      contextSources: ['customer_focus_archive', 'contact_persona', 'wechat_records', 'chat_records']
    },
    {
      id: 'F7',
      name: '供应商管理',
      description: '现有供应商格局与替换窗口',
      analysisPrompt: '分析客户现有供应商结构、切换门槛与可切入环节。',
      suggestionPrompt: '输出“可切入环节 + 证据不足项”。',
      contextSources: ['customer_focus_archive', 'chat_records', 'meeting_records', 'project_solution']
    },
    {
      id: 'F8',
      name: '流程&IT',
      description: '采购流程、系统与协同节点',
      analysisPrompt: '识别采购流程、审批链、系统化程度（如ERP/PLM/CRM）及影响。',
      suggestionPrompt: '输出“流程推进关键节点和卡点”。',
      contextSources: ['customer_name', 'customer_focus_archive', 'contact_persona', 'chat_records']
    }
  ]
};

const isValidConfig = (config: any) => {
  return Boolean(config && Array.isArray(config.fields) && config.fields.length > 0 && typeof config.model === 'string');
};

const resolveValidModelId = (model: string) => {
  return String(model || '').trim();
};

const normalizeConfig = (config: any) => {
  const safe = isValidConfig(config) ? config : defaultPersonaAiConfig;
  const isLegacyFields = !Array.isArray(safe.fields) || safe.fields.length < 6;
  const normalizeContextSources = (input: any, fallback: string[]) => {
    const arr = Array.isArray(input) ? input : fallback;
    const merged = Array.from(new Set(['customer_focus_archive', ...arr.map((x: any) => String(x || '').trim()).filter(Boolean)]));
    return merged.filter((x) => x !== 'persona_summary');
  };
  return {
    ...safe,
    analysisPrompt: String(safe.analysisPrompt || defaultPersonaAiConfig.analysisPrompt),
    followUpPrompt: String(safe.followUpPrompt || defaultPersonaAiConfig.followUpPrompt),
    analysisContextSources: normalizeContextSources(safe.analysisContextSources, defaultPersonaAiConfig.analysisContextSources),
    followUpContextSources: normalizeContextSources(safe.followUpContextSources, defaultPersonaAiConfig.followUpContextSources),
    fields: (isLegacyFields ? defaultPersonaAiConfig.fields : safe.fields).map((field: any) => ({
      ...field,
      contextSources: normalizeContextSources(field?.contextSources, ['customer_focus_archive'])
    })),
    model: resolveValidModelId(String(safe.model || ''))
  };
};

export const fetchPersonaAiConfig = async () => {
  if (!isSupabaseConfigured()) return normalizeConfig(defaultPersonaAiConfig);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_system_config')
    .select('value_json')
    .eq('id', CONFIG_ID)
    .limit(1);
  if (error) throw error;
  const remote = data?.[0]?.value_json;
  return normalizeConfig(isValidConfig(remote) ? remote : defaultPersonaAiConfig);
};

export const savePersonaAiConfig = async (config: any) => {
  const normalized = normalizeConfig(config);
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = {
    id: CONFIG_ID,
    name: '客户画像AI设置',
    value_json: normalized,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};
