import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type DbLlmModelConfig = {
  name?: string;
  provider?: 'gemini' | 'openai_compatible' | string;
  endpoint?: string;
  enabled?: boolean;
  // 仅用于保存到后端；不会写入本地缓存
  apiKey?: string;
  // 前端展示用：表示服务端已保存密钥
  apiKeySet?: boolean;
};

export type DbLlmConfig = {
  defaultModel?: string;
  models?: Record<string, DbLlmModelConfig>;
  temperature?: number;
  maxTokens?: number;
};

const DEFAULT_CONFIG: DbLlmConfig = {
  defaultModel: '',
  models: {
    'gemini-3-flash-preview': { name: 'Gemini 3 Flash', provider: 'gemini', endpoint: '', enabled: true },
    'gemini-3.1-pro-preview': { name: 'Gemini 3.1 Pro', provider: 'gemini', endpoint: '', enabled: true },
    'deepseek-v4-pro': { name: 'DeepSeek V4 Pro', provider: 'openai_compatible', endpoint: 'https://api.deepseek.com/v1/chat/completions', enabled: true }
  },
  temperature: 0.7,
  maxTokens: 1000
};

const mergeWithDefaults = (config: DbLlmConfig): DbLlmConfig => {
  const mergedModels: Record<string, DbLlmModelConfig> = {
    ...(DEFAULT_CONFIG.models || {}),
    ...(config.models || {})
  };
  const requestedDefault = String(config.defaultModel || '').trim();
  const hasDefault = requestedDefault && mergedModels[requestedDefault];
  return {
    ...DEFAULT_CONFIG,
    ...config,
    defaultModel: hasDefault ? requestedDefault : '',
    models: mergedModels
  };
};

const stripSensitiveFields = (config: DbLlmConfig): DbLlmConfig => {
  const models = config.models || {};
  const sanitizedModels: Record<string, DbLlmModelConfig> = {};
  Object.entries(models).forEach(([id, model]) => {
    const hasKey = Boolean((model as any)?.apiKey || (model as any)?.apiKeySet);
    sanitizedModels[id] = {
      ...model,
      apiKey: undefined,
      apiKeySet: hasKey
    };
  });
  return {
    ...config,
    models: sanitizedModels
  };
};

export const fetchLlmConfigFromSupabase = async (): Promise<DbLlmConfig> => {
  if (!isSupabaseConfigured()) return DEFAULT_CONFIG;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_system_config').select('value_json').eq('id', 'llm_config').limit(1);
  if (error) throw error;
  const remoteRaw = mergeWithDefaults((data?.[0]?.value_json as DbLlmConfig) || DEFAULT_CONFIG);
  const remote = stripSensitiveFields(remoteRaw);
  return remote;
};

export const saveLlmConfigToSupabase = async (config: DbLlmConfig): Promise<DbLlmConfig> => {
  const merged = mergeWithDefaults(config);
  const sanitized = stripSensitiveFields(merged);
  if (!isSupabaseConfigured()) return sanitized;
  const supabase = getSupabaseClient();
  const payload = { id: 'llm_config', name: '大模型配置', value_json: merged, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return sanitized;
};
