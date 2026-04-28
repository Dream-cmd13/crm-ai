import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { fetchLlmConfigFromSupabase } from './llmConfigRepository';

const buildFallbackResult = (prompt: string) => {
  const idsMatch =
    prompt.match(/可用字段ID列表：([^\n]+)/) ||
    prompt.match(/键必须来自以下ID列表：([^\n]+)/);
  if (idsMatch?.[1]) {
    const ids = idsMatch[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 0) {
      const result: Record<string, string> = {};
      ids.forEach((id) => {
        result[id] = '本地降级分析：Edge Function 当前不可用，建议稍后重试或检查 Supabase Functions 部署状态。';
      });
      return JSON.stringify(result);
    }
  }

  if (prompt.includes('输出公司画像JSON')) {
    return JSON.stringify({
      scale: '本地降级：中等规模',
      mainProducts: '本地降级：线束定制相关产品',
      painPoints: '本地降级：交期稳定性、质量一致性、成本控制',
      rdRequirements: '本地降级：关注研发联调效率',
      sampleRequirements: '本地降级：需要小批次快速打样',
      productionRequirements: '本地降级：量产爬坡与质量追踪'
    });
  }

  if (/json/i.test(prompt)) {
    return JSON.stringify({ result: '本地降级分析：AI 服务不可用，请稍后重试。' });
  }

  // 聊天辅助场景兜底：输出可直接发送的结构化建议，而不是仅提示失败。
  if (prompt.includes('聊天片段：') || prompt.includes('建议话术')) {
    const lines = prompt.split('\n').map((x) => x.trim()).filter(Boolean);
    const chatStart = lines.findIndex((x) => x.includes('聊天片段'));
    const chatLines = chatStart >= 0 ? lines.slice(chatStart + 1, chatStart + 8) : [];
    const latest = [...chatLines].reverse().find((x) => x.includes(':')) || '';
    const latestText = latest.split(':').slice(1).join(':').trim() || '已收到您的问题，我们正在同步内部资料确认细节。';
    return [
      '匹配判断：当前处于本地降级分析，依据已选聊天记录做规则化回复。',
      `建议回复话术：收到，关于“${latestText}”我们已安排对应负责人核对方案与排期，今天内给您明确答复；若您方便，也请补充具体期望指标与时间点，便于我们一次性给到可执行方案。`,
      '下一步动作：1) 补充关键需求参数；2) 确认相关联系人角色；3) 结合FAQ/案例后给二次回复。',
      '风险提示：当前为本地降级结果，待AI服务恢复后建议再次生成并复核。'
    ].join('\n');
  }

  return '本地降级回复：已切换到离线规则分析，请根据当前聊天记录先给出确认与推进动作。';
};

export const callAiProxy = async (prompt: string, modelId?: string) => {
  const raw = String(prompt || '').trim();
  // Avoid oversized payloads causing 4xx in edge function gateways.
  const text = raw.length > 12000 ? raw.slice(0, 12000) : raw;
  if (!text) return '';
  if (!isSupabaseConfigured()) {
    return buildFallbackResult(text);
  }
  try {
    const supabase = getSupabaseClient();
    const requestedModelId = String(modelId || '').trim();
    let resolvedModelId = requestedModelId;
    if (!resolvedModelId) {
      const llmConfig = await fetchLlmConfigFromSupabase().catch(() => ({} as any));
      resolvedModelId = String((llmConfig as any)?.defaultModel || '').trim();
    }
    if (!resolvedModelId) {
      return '未设置大模型：请先在“系统设置 > 大模型设置”配置默认模型，或在当前AI辅助配置中显式选择模型。';
    }
    const { data, error } = await supabase.functions.invoke('ai_proxy', {
      body: { prompt: text, modelId: resolvedModelId }
    });
    if (error) throw error;
    const out = (data as any)?.text || '';
    return String(out || '').trim();
  } catch (error: any) {
    const msg = String(error?.message || '');
    // Keep fallback behavior, but provide clearer diagnostics for non-2xx / deployment issues.
    if (/non-2xx|Edge Function/i.test(msg)) {
      console.warn('ai_proxy Edge Function returned non-2xx, switched to local fallback. 请检查 Supabase Functions 部署与密钥配置。');
    } else {
      console.warn('ai_proxy invoke failed, switched to local fallback:', error);
    }
    return buildFallbackResult(text);
  }
};

export interface AiProxyHealthCheckResult {
  ok: boolean;
  message: string;
}

export const checkAiProxyHealth = async (): Promise<AiProxyHealthCheckResult> => {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase 未配置（请检查 URL/ANON KEY）' };
  }
  try {
    const supabase = getSupabaseClient();
    const llmConfig = await fetchLlmConfigFromSupabase().catch(() => ({} as any));
    const healthModelId = String((llmConfig as any)?.defaultModel || '').trim();
    if (!healthModelId) {
      return { ok: false, message: '未设置默认大模型（请先在系统设置中配置）' };
    }
    const { data, error } = await supabase.functions.invoke('ai_proxy', {
      body: { prompt: '请仅返回：OK', modelId: healthModelId }
    });
    if (error) {
      return { ok: false, message: `Edge Function 返回错误：${error.message || '未知错误'}` };
    }
    const text = String((data as any)?.text || '').trim();
    return { ok: true, message: text ? `AI 代理可用：${text.slice(0, 80)}` : 'AI 代理可用' };
  } catch (error: any) {
    return { ok: false, message: `请求失败：${error?.message || '无法连接 Edge Function'}` };
  }
};
