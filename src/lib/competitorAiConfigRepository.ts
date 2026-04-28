import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const CONFIG_ID = 'competitor_swot_ai_config';

export const defaultCompetitorAiConfig = {
  model: '',
  promptTemplate:
    '你是华为大客户销售顾问。请基于客户关注点与竞品对比数据，按照“价值对齐、证据优先、风险前置、阶段推进”的原则，输出可执行的话术与解决方案。\n客户名称：{custname}\n客户画像：{customer_profile}\n聊天记录：{chat_records}\n客户关注点档案：{customer_focus_archive}\n任务指令：{task_instruction}\n输出要求：\n1. 先给出沟通定位与目标；\n2. 再给出面对客户关注点及我方/竞品优劣势的应对话术；\n3. 给出解决方案设计原则与下一步动作；\n4. 语言务实，可直接用于拜访。',
  contextSources: [
    'customer_name',
    'customer_profile',
    'customer_focus_archive',
    'customer_focus_swot',
    'current_focus_record',
    'competitor_compare',
    'chat_records',
    'email_records',
    'wechat_records',
    'wechat_group_records',
    'meeting_records'
  ]
};

const CONTEXT_SOURCE_ALLOWLIST = new Set(defaultCompetitorAiConfig.contextSources);

const safeConfig = (raw: any) => {
  if (!raw || typeof raw !== 'object') return defaultCompetitorAiConfig;
  const contextSources = Array.isArray(raw.contextSources) ? raw.contextSources : defaultCompetitorAiConfig.contextSources;
  const normalizeKey = (item: any) => (typeof item === 'string' ? item : item?.key);
  const mergedContexts = Array.from(
    new Set([...defaultCompetitorAiConfig.contextSources, ...contextSources.map(normalizeKey).filter(Boolean)])
  ).filter((k) => CONTEXT_SOURCE_ALLOWLIST.has(k));
  return {
    model: String(raw.model || '').trim(),
    promptTemplate: String(
      raw.promptTemplate ||
      raw.globalScriptPrompt ||
      raw.focusScriptPrompt ||
      raw.scriptPrompt ||
      defaultCompetitorAiConfig.promptTemplate
    ),
    // legacy compatibility fields (readers may still reference old keys)
    basePrompt: String(raw.basePrompt || ''),
    analysisPrompt: String(raw.analysisPrompt || ''),
    focusScriptPrompt: String(raw.focusScriptPrompt || raw.scriptPrompt || ''),
    globalScriptPrompt: String(raw.globalScriptPrompt || ''),
    scriptPrompt: String(raw.focusScriptPrompt || raw.scriptPrompt || ''),
    contextSources: mergedContexts
  };
};

export const fetchCompetitorAiConfig = async () => {
  if (!isSupabaseConfigured()) return safeConfig(defaultCompetitorAiConfig);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_system_config').select('value_json').eq('id', CONFIG_ID).limit(1);
  if (error) throw error;
  return safeConfig(data?.[0]?.value_json);
};

export const saveCompetitorAiConfig = async (config: any) => {
  const safe = safeConfig(config);
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = {
    id: CONFIG_ID,
    name: '客户竞品SWOT AI设置',
    value_json: safe,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};
