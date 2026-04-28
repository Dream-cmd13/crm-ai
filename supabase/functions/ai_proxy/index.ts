import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type LlmConfig = {
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  models?: Record<string, { name?: string; provider?: string; endpoint?: string; enabled?: boolean; apiKey?: string }>;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const getConfig = async (supabase: any): Promise<LlmConfig> => {
  const { data, error } = await supabase.from('crm_system_config').select('value_json').eq('id', 'llm_config').limit(1);
  if (error) throw error;
  return ((data as any)?.[0]?.value_json as LlmConfig) || {};
};

const resolveModel = (cfg: LlmConfig, requestedModelId?: string) => {
  const id = requestedModelId || cfg.defaultModel || 'gemini-3-flash-preview';
  const models = cfg.models || {};
  const model = models[id] || {};
  const provider = model.provider || (id.startsWith('gemini-') ? 'gemini' : 'openai_compatible');
  return {
    modelId: id,
    provider,
    endpoint: model.endpoint || '',
    apiKey: model.apiKey || '',
    temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.7,
    maxTokens: typeof cfg.maxTokens === 'number' ? cfg.maxTokens : 1000
  };
};

const getProviderKey = (provider: string, modelId: string, modelApiKey?: string) => {
  if (modelApiKey) return modelApiKey;
  const p = String(provider || '').toLowerCase();
  const mid = String(modelId || '').toLowerCase();
  if (p === 'gemini') return Deno.env.get('GEMINI_API_KEY') || '';
  if (p.includes('deepseek') || mid.includes('deepseek')) return Deno.env.get('DEEPSEEK_API_KEY') || '';
  if (p.includes('qwen') || p.includes('dashscope') || mid.includes('qwen')) return Deno.env.get('QWEN_API_KEY') || '';
  if (p.includes('minimax') || mid.includes('minimax')) return Deno.env.get('MINIMAX_API_KEY') || '';
  return Deno.env.get('OPENAI_API_KEY') || '';
};

const callGemini = async (apiKey: string, model: string, prompt: string) => {
  if (!apiKey) throw new Error('GEMINI_API_KEY 未配置');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    })
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Gemini 请求失败：${resp.status} ${t || resp.statusText}`);
  }
  const j: any = await resp.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '';
  return String(text || '').trim();
};

const callOpenAICompatible = async (endpoint: string, apiKey: string, model: string, prompt: string, temperature: number, maxTokens: number) => {
  if (!endpoint) throw new Error('模型 endpoint 未配置');
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`LLM 请求失败：${resp.status} ${t || resp.statusText}`);
  }
  const j: any = await resp.json().catch(() => ({}));
  const text = j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || j?.output_text || '';
  return String(text || '').trim();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !serviceKey) {
      return json(500, { error: '缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const payload = await req.json().catch(() => ({}));
    const prompt = String(payload?.prompt || '').trim();
    if (!prompt) return json(400, { error: 'prompt 不能为空' });

    const cfg = await getConfig(supabase);
    const resolved = resolveModel(cfg, payload?.modelId);
    const providerKey = getProviderKey(resolved.provider, resolved.modelId, resolved.apiKey);

    const output =
      resolved.provider === 'gemini'
        ? await callGemini(providerKey, resolved.modelId, prompt)
        : await callOpenAICompatible(resolved.endpoint, providerKey, resolved.modelId, prompt, resolved.temperature, resolved.maxTokens);

    return json(200, { text: output, modelId: resolved.modelId, provider: resolved.provider });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || 'unknown error' });
  }
});
