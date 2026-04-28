type LlmModelConfig = {
  name?: string;
  provider?: 'gemini' | 'openai_compatible' | string;
  endpoint?: string;
  enabled?: boolean;
  apiKeySet?: boolean;
};

export type LlmConfig = {
  defaultModel?: string;
  models?: Record<string, LlmModelConfig>;
  temperature?: number;
  maxTokens?: number;
};

export const loadLlmConfig = (): LlmConfig => {
  // 已禁用本地读取：LLM 配置统一从 Supabase 仓储异步获取。
  return {};
};

export const getEnabledModels = (config?: LlmConfig) => {
  const llm = config || loadLlmConfig();
  const models = llm.models || {};
  return Object.entries(models)
    .filter(([, m]) => m && m.enabled !== false)
    .map(([id, m]) => ({ id, name: m.name || id, provider: m.provider || '', endpoint: m.endpoint || '' }));
};

export const resolveModelConfig = (modelId?: string) => {
  const llm = loadLlmConfig();
  const id = modelId || llm.defaultModel || '';
  const model = (llm.models || {})[id] || {};
  return {
    modelId: id,
    provider: model.provider || '',
    endpoint: model.endpoint || '',
    temperature: typeof llm.temperature === 'number' ? llm.temperature : 0.7,
    maxTokens: typeof llm.maxTokens === 'number' ? llm.maxTokens : 1000
  };
};
