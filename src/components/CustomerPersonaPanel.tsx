import React, { useMemo, useState, useEffect } from 'react';
import { Edit2, Loader2, Save, Sparkles, Target, HelpCircle } from 'lucide-react';
import { CustomerPersona } from '../types';
import { callAiProxy } from '../lib/aiProxy';
import { defaultPersonaAiConfig, fetchPersonaAiConfig } from '../lib/personaAiConfigRepository';
import { toast } from 'react-hot-toast';

interface CustomerPersonaPanelProps {
  customerId?: string;
  customerName?: string;
  personas: CustomerPersona[];
  setPersonas: React.Dispatch<React.SetStateAction<CustomerPersona[]>>;
}

export default function CustomerPersonaPanel({ customerId, customerName, personas, setPersonas }: CustomerPersonaPanelProps) {
  const [config, setConfig] = useState<any>(defaultPersonaAiConfig);
  
  useEffect(() => {
    fetchPersonaAiConfig()
      .then((savedConfig) => {
        setConfig(savedConfig);
      })
      .catch((e) => {
        console.error('Failed to load persona AI config', e);
        setConfig(defaultPersonaAiConfig);
      });
  }, []);

  const persona = useMemo(() => {
    const p = personas.find((p) => p.customerId === customerId);
    if (p) return p;
    return {
      id: `persona_${customerId || Date.now()}`,
      customerId: customerId || '',
      scale: '',
      mainProducts: '',
      painPoints: '',
      rdRequirements: '',
      sampleRequirements: '',
      productionRequirements: '',
      lastUpdated: new Date().toISOString().split('T')[0],
      dynamicData: {}
    } as CustomerPersona;
  }, [personas, customerId]);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const normalizeTextWithNewline = (value: any) =>
    String(value ?? '')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

  const upsertPersona = (next: CustomerPersona) => {
    setPersonas((prev) => {
      const exists = prev.some((p) => p.customerId === next.customerId);
      if (!exists) return [next, ...prev];
      return prev.map((p) => (p.customerId === next.customerId ? next : p));
    });
  };

  const buildFixedContext = (fields: any[]) => {
    const fieldSummary = fields
      .map((f: any) => `${f.name}：${persona.dynamicData?.[f.id] || '暂无'}`)
      .join('\n');
    return [
      `客户名称：${customerName || customerId || '未知客户'}`,
      `客户历史画像：\n${fieldSummary || '暂无'}`,
      `客户关注点档案：${String((persona as any).keyConcerns || '').trim() || '暂无'}`,
      `联系人画像：${(persona as any).contactPersona || '暂无'}`
    ].join('\n\n');
  };

  const buildSingleFieldPrompt = (field: any, fields: any[]) => {
    return [
      '你是客户研究分析师。请进行网络查找与多源交叉验证（官网/新闻/工商/招投标/招聘等），只输出客户画像分析。',
      `本轮只分析一个维度：${field.id}（${field.name}）`,
      `维度说明：${field.description || '无描述'}`,
      `背景信息：\n${buildFixedContext(fields)}`,
      '输出规则（必须严格遵守）：',
      '1) 只输出当前这个维度的分析正文，不要JSON，不要代码块，不要额外解释文本；',
      '2) 必须严格包含以下四段，且按顺序输出：',
      '【分析结论】...',
      '【关键依据】...',
      '【待验证点】...',
      '【可信度】高/中/低（并说明）',
      '3) 若证据不足，也必须输出四段占位，不得留空。',
      '4) 总字数控制在120-220字。'
    ].join('\n');
  };

  const handleStartEdit = (fieldId: string, value: string) => {
    setEditingFieldId(fieldId);
    setEditingValue(value || '');
  };

  const handleSave = (fieldId: string) => {
    const updated = {
      ...persona,
      dynamicData: {
        ...(persona.dynamicData || {}),
        [fieldId]: editingValue
      },
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    upsertPersona(updated);
    setEditingFieldId(null);
  };

  const buildFallbackAnalysis = (fieldName: string) => ([
    `【分析结论】当前轮次未获得“${fieldName}”的稳定结果。`,
    '【关键依据】模型返回为空或结果不完整。',
    '【待验证点】请补充该维度相关资料后重试。',
    '【可信度】低（暂无足够证据）'
  ].join('\n'));

  const handleAiAnalyzeSingle = async (field: any) => {
    setLoadingAction(`analysis:${field.id}`);
    try {
      const fields = Array.isArray(config.fields) ? config.fields : [];
      const prompt = buildSingleFieldPrompt(field, fields);
      const result = normalizeTextWithNewline(await callAiProxy(prompt, config?.model));
      upsertPersona({
        ...persona,
        dynamicData: {
          ...(persona.dynamicData || {}),
          [field.id]: result || buildFallbackAnalysis(field.name)
        },
        lastUpdated: new Date().toISOString().split('T')[0]
      });
      toast.success(`${field.name} 已完成分析`);
    } catch (e) {
      console.error('AI single field analysis failed', e);
      toast.error(`${field.name} 分析失败`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAiAnalyzeAll = async () => {
    setLoadingAction('analysis_all');
    try {
      const fields = Array.isArray(config.fields) ? config.fields : [];
      if (fields.length === 0) {
        toast.error('未配置画像维度，无法分析');
        return;
      }
      const nextDynamicData = { ...(persona.dynamicData || {}) } as Record<string, any>;
      for (const field of fields) {
        const prompt = buildSingleFieldPrompt(field, fields);
        const result = normalizeTextWithNewline(await callAiProxy(prompt, config?.model));
        nextDynamicData[field.id] = result || buildFallbackAnalysis(field.name);
      }
      upsertPersona({
        ...persona,
        dynamicData: nextDynamicData,
        lastUpdated: new Date().toISOString().split('T')[0]
      });
      toast.success('画像AI分析已按维度逐项更新');
    } catch (e) {
      console.error('AI Analysis failed', e);
      toast.error('画像AI分析失败');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-indigo-800 text-sm">
            <Sparkles className="w-4 h-4" />
            客户画像（维度由系统设置维护）
          </div>
          <div className="text-xs text-indigo-600">最后更新: {persona.lastUpdated}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleAiAnalyzeAll}
            disabled={loadingAction !== null}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loadingAction === 'analysis_all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            逐项分析全部维度
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Array.isArray(config.fields) ? config.fields : []).map((field: any) => {
          const value = persona.dynamicData?.[field.id] || '';
          const isEditing = editingFieldId === field.id;

          return (
            <div key={field.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Target className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{field.name}</h4>
                    <p className="text-xs text-gray-500">{field.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAiAnalyzeSingle(field)}
                    disabled={loadingAction !== null}
                    className="px-3 py-1.5 text-xs border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {loadingAction === `analysis:${field.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    分析
                  </button>
                  <button
                    onClick={() => isEditing ? handleSave(field.id) : handleStartEdit(field.id, value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 bg-white text-gray-600 rounded-lg flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                  >
                    {isEditing ? <Save className="w-3.5 h-3.5 text-indigo-600" /> : <Edit2 className="w-3.5 h-3.5" />}
                    {isEditing ? '保存' : '修改'}
                  </button>
                </div>
              </div>
              <div className="p-6">
                {isEditing ? (
                  <textarea
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-y"
                    placeholder={`请输入${field.name}分析内容...`}
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {value ? (
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{normalizeTextWithNewline(value)}</p>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                        <HelpCircle className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-sm">暂无分析数据，请点击右上角“分析”生成</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
