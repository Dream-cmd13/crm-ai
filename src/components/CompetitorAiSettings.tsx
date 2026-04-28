import React, { useEffect, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { defaultCompetitorAiConfig, fetchCompetitorAiConfig, saveCompetitorAiConfig } from '../lib/competitorAiConfigRepository';
import { AiContextConfig } from './AiContextConfig';
import { fetchLlmConfigFromSupabase } from '../lib/llmConfigRepository';
import { notifySupabaseFailure } from '../lib/supabaseFailureNotice';

export default function CompetitorAiSettings() {
  const [config, setConfig] = useState<any>(defaultCompetitorAiConfig);
  const [llmModels, setLlmModels] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchCompetitorAiConfig()
      .then((v) => setConfig(v))
      .catch((e) => {
        console.error(e);
        notifySupabaseFailure('竞品SWOT AI配置读取', e);
      });
  }, []);

  useEffect(() => {
    fetchLlmConfigFromSupabase()
      .then((cfg: any) => {
        const models = cfg?.models || {};
        const options = Object.entries(models)
          .filter(([, m]: any) => m?.enabled !== false)
          .map(([id, m]: any) => ({ id, name: m?.name || id }));
        setLlmModels(options);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!String(config?.model || '').trim()) {
      toast.error('未设置大模型，请先选择一个可用模型');
      return;
    }
    try {
      await saveCompetitorAiConfig(config);
      toast.success('竞品SWOT AI设置已保存');
    } catch (error) {
      console.error(error);
      notifySupabaseFailure('竞品SWOT AI设置保存', error);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            客户竞品 SWOT AI设置
          </h3>
          <p className="text-sm text-gray-500 mt-1">统一单提示词配置，供“AI辅助梳理（总体）”和“本关注点话术”共用。支持 {'{custname}'}、{'{customer_profile}'}、{'{chat_records}'}、{'{customer_focus_archive}'}、{'{task_instruction}'} 占位符。</p>
        </div>
        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">模型</label>
          <select value={String(config.model || '')} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">未设置大模型</option>
            {llmModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      {!String(config?.model || '').trim() && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          未设置大模型：请先选择模型并保存，否则 AI 辅助不会调用云端模型。
        </div>
      )}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">统一提示词（客户竞品分析）</label>
        <textarea value={config.promptTemplate || ''} onChange={(e) => setConfig({ ...config, promptTemplate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[140px]" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2">带入背景信息</label>
        <AiContextConfig
          value={Array.isArray(config.contextSources) && typeof config.contextSources[0] === 'string'
            ? config.contextSources.map((s: string) => ({ key: s, enabled: true }))
            : (config.contextSources || [])}
          onChange={(next) => setConfig({ ...config, contextSources: next.filter((x: any) => x.enabled).map((x: any) => x.key) })}
                  allowedKeys={['customer_name', 'customer_profile', 'current_focus_record', 'customer_focus_swot', 'customer_focus_archive', 'competitor_compare', 'email_records', 'wechat_records', 'wechat_group_records', 'meeting_records', 'chat_records']}
        />
      </div>
    </div>
  );
}
