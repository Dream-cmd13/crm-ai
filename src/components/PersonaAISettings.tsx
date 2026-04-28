import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Settings, Sparkles, SlidersHorizontal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { defaultPersonaAiConfig, fetchPersonaAiConfig, savePersonaAiConfig } from '../lib/personaAiConfigRepository';
import { AiContextConfig, AiContextSource } from './AiContextConfig';
import { fetchLlmConfigFromSupabase } from '../lib/llmConfigRepository';
import { notifySupabaseFailure } from '../lib/supabaseFailureNotice';

export default function PersonaAISettings() {
  const [config, setConfig] = useState<any>(defaultPersonaAiConfig);
  const [llmModels, setLlmModels] = useState<Array<{ id: string; name: string }>>([]);
  const [tab, setTab] = useState<'fields' | 'analysis' | 'followup'>('fields');

  useEffect(() => {
    fetchPersonaAiConfig()
      .then((remoteConfig) => {
        setConfig(remoteConfig as any);
      })
      .catch((error) => {
        console.error('Failed to load persona AI config', error);
        notifySupabaseFailure('客户画像AI配置读取', error);
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
      await savePersonaAiConfig(config);
      toast.success('客户画像 AI 设置已保存并同步到系统配置');
    } catch (error) {
      console.error('Failed to save persona AI config', error);
      notifySupabaseFailure('客户画像AI配置保存', error);
    }
  };

  const addField = () => {
    setConfig({
      ...config,
      fields: [
        ...(config.fields || []),
        {
          id: `F${Date.now()}`,
          name: '',
          description: '',
          contextSources: ['customer_name', 'customer_focus_archive', 'chat_records']
        }
      ]
    });
  };

  const removeField = (id: string) => {
    setConfig({
      ...config,
      fields: (config.fields || []).filter((f: any) => f.id !== id)
    });
  };

  const updateField = (id: string, key: string, value: any) => {
    setConfig({
      ...config,
      fields: (config.fields || []).map((f: any) => (f.id === id ? { ...f, [key]: value } : f))
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            客户画像 AI 设置
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            维护客户维度与 AI 辅助参数。提示词支持使用 {'{custname}'} 占位符；建议明确“多源验证、只输出客户画像维度、不输出其他内容”。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={String(config.model || '')}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm min-w-[220px]"
          >
            <option value="">未设置大模型</option>
            {llmModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
      {!String(config?.model || '').trim() && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          未设置大模型：请先选择模型并保存，否则 AI 辅助不会调用云端模型。
        </div>
      )}

      <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 p-1 bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('fields')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'fields' ? 'bg-white text-indigo-700 border border-indigo-100' : 'text-gray-600 hover:text-gray-900'}`}
        >
          维度设置
        </button>
        <button
          type="button"
          onClick={() => setTab('analysis')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'analysis' ? 'bg-white text-indigo-700 border border-indigo-100' : 'text-gray-600 hover:text-gray-900'}`}
        >
          AI辅助分析设置
        </button>
        <button
          type="button"
          onClick={() => setTab('followup')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'followup' ? 'bg-white text-indigo-700 border border-indigo-100' : 'text-gray-600 hover:text-gray-900'}`}
        >
          AI跟进建议
        </button>
      </div>

      <div className="space-y-4">
        {tab === 'analysis' ? (
          <>
          <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
            <h4 className="font-medium text-gray-900">统一AI任务提示词（全维度共用）</h4>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AI网络查找分析辅助</label>
              <textarea
                value={config.analysisPrompt || ''}
                onChange={(e) => setConfig({ ...config, analysisPrompt: e.target.value })}
                placeholder="用于生成所有画像维度分析（可用 {custname} / {default_context} / {fields_definition} / {field_ids}）"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[72px]"
              />
              <div className="mt-1 text-[11px] text-gray-500">
                建议在提示词中明确：多源信息交叉验证（官网/新闻/工商等）、仅输出客户画像维度、禁止输出跟进建议与话术。
              </div>
              <div className="mt-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AI分析带入背景</label>
                <AiContextConfig
                  value={Array.isArray(config.analysisContextSources) ? config.analysisContextSources.map((s: string) => ({ key: s, enabled: true })) : []}
                  onChange={(next) => setConfig({ ...config, analysisContextSources: next.filter((x: AiContextSource) => x.enabled).map((x: AiContextSource) => x.key) })}
                  allowedKeys={['customer_name', 'customer_profile', 'customer_focus_archive', 'email_records', 'wechat_records', 'wechat_group_records', 'meeting_records', 'chat_records', 'contact_persona', 'project_solution']}
                />
              </div>
            </div>
          </div>
          </>
        ) : tab === 'followup' ? (
          <>
            <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
              <h4 className="font-medium text-gray-900">AI跟进建议（独立页签）</h4>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AI 跟进建议提示词</label>
                <textarea
                  value={config.followUpPrompt || ''}
                  onChange={(e) => setConfig({ ...config, followUpPrompt: e.target.value })}
                  placeholder="用于基于画像汇总与客户信息生成跟进建议（需包含客户阶次拜访框架）"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[96px]"
                />
                <div className="mt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AI跟进建议带入背景</label>
                  <AiContextConfig
                    value={Array.isArray(config.followUpContextSources) ? config.followUpContextSources.map((s: string) => ({ key: s, enabled: true })) : []}
                    onChange={(next) => setConfig({ ...config, followUpContextSources: next.filter((x: AiContextSource) => x.enabled).map((x: AiContextSource) => x.key) })}
                    allowedKeys={['customer_name', 'customer_profile', 'customer_focus_archive', 'email_records', 'wechat_records', 'wechat_group_records', 'meeting_records', 'chat_records', 'contact_persona', 'project_solution']}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              画像分析维度
            </h4>
            <button
              onClick={addField}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
            >
              <Plus className="w-4 h-4" />
              新增维度
            </button>
          </div>

          <div className="space-y-4">
            {(config.fields || []).map((field: any) => (
              <div key={field.id} className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm space-y-4 relative group">
                <button
                  onClick={() => removeField(field.id)}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">维度名称</label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(field.id, 'name', e.target.value)}
                      placeholder="例如：客户背景与实力"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">维度描述</label>
                    <input
                      type="text"
                      value={field.description}
                      onChange={(e) => updateField(field.id, 'description', e.target.value)}
                      placeholder="例如：公司规模、行业地位等"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
