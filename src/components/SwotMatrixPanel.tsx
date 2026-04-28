import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Loader2, MessageSquare, Plus, Swords, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { callAiProxy } from '../lib/aiProxy';
import { Competitor, Contact, CustomerPersona } from '../types';
import { fetchCustomerFocusSwot, saveCustomerFocusSwot } from '../lib/customerFocusSwotRepository';
import { defaultCompetitorAiConfig, fetchCompetitorAiConfig } from '../lib/competitorAiConfigRepository';
import { fetchCustomerFollowStrategyConfig, saveCustomerFollowStrategyConfig } from '../lib/customerFollowStrategyRepository';
import { fetchCompetitors } from '../lib/competitorRepository';

type CompetitorAnalysis = {
  id: string;
  name: string;
  strengths: string[];
  weaknesses: string[];
};

type FocusSwotData = {
  id: string;
  customerFocus: string;
  keyContact: string;
  focusLevel: number;
  ourStrengths: string[];
  ourWeaknesses: string[];
  competitors: CompetitorAnalysis[];
  aiScript?: string;
};

const emptyCompetitor = (): CompetitorAnalysis => ({
  id: `comp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  name: '',
  strengths: [''],
  weaknesses: ['']
});

const emptyData = (): FocusSwotData => ({
  id: `focus_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  customerFocus: '',
  keyContact: '',
  focusLevel: 3,
  ourStrengths: [''],
  ourWeaknesses: [''],
  competitors: [emptyCompetitor()]
});

export default function SwotMatrixPanel({
  customerId,
  customerName,
  contacts = [],
  persona,
  communicationHighlights
}: {
  customerId: string;
  customerName: string;
  contacts?: Contact[];
  persona?: CustomerPersona | null;
  communicationHighlights?: string[];
}) {
  const [focusItems, setFocusItems] = useState<FocusSwotData[]>([emptyData()]);
  const [activeFocusId, setActiveFocusId] = useState<string>('');
  const [loadingType, setLoadingType] = useState<'script' | ''>('');
  const [loadingData, setLoadingData] = useState(true);
  const [snapshot, setSnapshot] = useState('[]');
  const [aiConfig, setAiConfig] = useState<any>(defaultCompetitorAiConfig);
  const [strategyConfig, setStrategyConfig] = useState<any>(null);
  const [competitorLibrary, setCompetitorLibrary] = useState<Competitor[]>([]);
  const [globalScript, setGlobalScript] = useState('');
  const [editingFocus, setEditingFocus] = useState<FocusSwotData | null>(null);
  const [isCreatingFocus, setIsCreatingFocus] = useState(false);

  const activeFocus = useMemo(
    () => focusItems.find((f) => f.id === activeFocusId) || focusItems[0] || emptyData(),
    [focusItems, activeFocusId]
  );
  const isDirty = useMemo(() => JSON.stringify(focusItems) !== snapshot, [focusItems, snapshot]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCustomerFocusSwot(customerId), fetchCompetitorAiConfig(), fetchCustomerFollowStrategyConfig(), fetchCompetitors()])
      .then(([rows, cfg, sCfg, competitors]) => {
        if (cancelled) return;
        setAiConfig(cfg || defaultCompetitorAiConfig);
        setStrategyConfig(sCfg);
        setCompetitorLibrary(Array.isArray(competitors) ? competitors : []);
        const next = rows.length > 0 ? rows : [emptyData()];
        setFocusItems(next as FocusSwotData[]);
        setSnapshot(JSON.stringify(next as FocusSwotData[]));
        setActiveFocusId(next[0]?.id || '');
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setFocusItems([emptyData()]);
          setActiveFocusId('');
          toast.error('读取客户关注点失败，请检查 Supabase 配置');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingData(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const persist = (next: FocusSwotData[]) => {
    setFocusItems(next);
    if (!next.some((x) => x.id === activeFocusId)) {
      setActiveFocusId(next[0]?.id || '');
    }
  };

  useEffect(() => {
    if (loadingData) return;
    if (!isDirty) return;
    const timer = setTimeout(async () => {
      try {
        await saveCustomerFocusSwot(customerId, focusItems);
        setSnapshot(JSON.stringify(focusItems));
      } catch (error) {
        console.error(error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [focusItems, customerId, loadingData, isDirty]);

  const buildFocusScript = async (focus: FocusSwotData) => {
    setLoadingType('script');
    try {
      const focusTitle = focus.customerFocus || '未命名关注点';
      const focusSwotText = [
        `关注点：${focusTitle}`,
        `关键联系人：${focus.keyContact || '未填写'}`,
        `关注度：${focus.focusLevel}`,
        `我方优势：${focus.ourStrengths.join('；')}`,
        `我方劣势：${focus.ourWeaknesses.join('；')}`
      ].join('\n');
      const competitorCompareText = focus.competitors
        .map((comp, idx) => `竞品${idx + 1}：${comp.name || '未命名'}\n优势：${comp.strengths.join('；')}\n劣势：${comp.weaknesses.join('；')}`)
        .join('\n\n');
      const contextTextMap: Record<string, string> = {
        customer_name: `客户名称：${customerName}`,
        customer_profile: `客户画像：${JSON.stringify(persona?.dynamicData || {})}`,
        current_focus_record: `关注点：${focusTitle}\n关键联系人：${activeFocus.keyContact || '未填写'}\n关注度：${activeFocus.focusLevel}`,
        customer_focus_swot: focusSwotText,
        competitor_compare: competitorCompareText || '无竞品对比数据',
        chat_records: `沟通摘要：${(communicationHighlights || []).join('\n') || '暂无'}`,
        email_records: `邮件记录：${(communicationHighlights || []).join('\n') || '暂无'}`,
        wechat_records: `微信记录：${(communicationHighlights || []).join('\n') || '暂无'}`,
        wechat_group_records: `微信群聊：${(communicationHighlights || []).join('\n') || '暂无'}`,
        meeting_records: `会议记录：${(communicationHighlights || []).join('\n') || '暂无'}`,
        competitor_profile: competitorCompareText || '暂无竞品档案'
      };
      const selectedCtx = Array.isArray(aiConfig?.contextSources)
        ? aiConfig.contextSources.map((item: any) => (typeof item === 'string' ? item : item?.key)).filter(Boolean)
        : [];
      const contextText = selectedCtx.map((k: string) => contextTextMap[k]).filter(Boolean).join('\n');
      const customerFocusArchive = focusItems.map((f, i) => `关注点${i + 1}：${f.customerFocus || '-'}\n联系人：${f.keyContact || '-'}\n关注度：${f.focusLevel}`).join('\n\n');
      const placeholderMap: Record<string, string> = {
        custname: customerName || customerId,
        competitor: focus.competitors.map((c) => c.name || '未命名').join(' / ') || '竞品',
        focus_title: focusTitle,
        customer_profile: contextTextMap.customer_profile,
        chat_records: contextTextMap.chat_records,
        customer_focus_archive: customerFocusArchive || '暂无客户关注点档案',
        task_instruction: '请输出本关注点的应对话术与解决方案设计建议。',
        current_focus_record: contextTextMap.current_focus_record,
        customer_focus_swot: focusSwotText,
        competitor_compare: competitorCompareText || '无',
        chat: contextTextMap.chat_records,
        meeting: contextTextMap.meeting_records
      };
      const replaceVars = (text: string) => String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key) => placeholderMap[key] ?? _m);
      const prompt = [
        replaceVars(aiConfig?.promptTemplate || defaultCompetitorAiConfig.promptTemplate),
        '背景信息：',
        contextText || `${contextTextMap.customer_focus_swot}\n${contextTextMap.competitor_compare}`,
        '请输出：1）开场定位 2）价值对齐 3）异议回应 4）下一步推进动作。'
      ].join('\n');
      const text = await callAiProxy(prompt, aiConfig?.model);
      updateFocus(focus.id, { aiScript: text || '' });
    } catch (error) {
      console.error(error);
      toast.error('AI 话术生成失败');
    } finally {
      setLoadingType('');
    }
  };

  const generateGlobalScript = async () => {
    setLoadingType('script');
    try {
      const allFocusText = focusItems.map((f, i) => [
        `关注点${i + 1}：${f.customerFocus || '未命名'}`,
        `联系人：${f.keyContact || '未填写'}`,
        `关注度：${f.focusLevel}`,
        `我方优势：${f.ourStrengths.filter(Boolean).join('；') || '-'}`,
        `我方劣势：${f.ourWeaknesses.filter(Boolean).join('；') || '-'}`,
        `竞品对比：${f.competitors.map((c) => `${c.name || '未命名'}(优:${c.strengths.filter(Boolean).join('、') || '-'}; 劣:${c.weaknesses.filter(Boolean).join('、') || '-'})`).join(' | ') || '无'}`
      ].join('\n')).join('\n\n');
      const prompt = [
        String(aiConfig?.promptTemplate || defaultCompetitorAiConfig.promptTemplate).replace('{task_instruction}', '请输出总体梳理思路：统一开场、分关注点推进要点、关键异议处理、下一步行动安排。'),
        `客户：${customerName || customerId}`,
        '背景：',
        allFocusText
      ].join('\n');
      const text = await callAiProxy(prompt, aiConfig?.model);
      setGlobalScript(text || '');
    } catch (error) {
      console.error(error);
      toast.error('AI总体话术生成失败');
    } finally {
      setLoadingType('');
    }
  };

  const handleFocusBlur = async (focusVal: string) => {
    if (!focusVal || !strategyConfig) return;
    const exists = strategyConfig.focusPoints?.some((f: any) => f.name === focusVal);
    if (!exists) {
      const nextCfg = {
        ...strategyConfig,
        focusPoints: [...(strategyConfig.focusPoints || []), {
          id: `fp_${Date.now()}`,
          name: focusVal,
          positions: [],
          askMethod: '',
          metric: ''
        }]
      };
      setStrategyConfig(nextCfg);
      try {
        await saveCustomerFollowStrategyConfig(nextCfg);
      } catch (e) {
        console.error('Failed to save new focus point', e);
      }
    }
  };

  const addFocus = () => {
    setIsCreatingFocus(true);
    setEditingFocus(emptyData());
  };

  const updateFocus = (id: string, patch: Partial<FocusSwotData>) => {
    persist(focusItems.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const toggleKeyContact = (focusId: string, contactName: string) => {
    const focus = focusItems.find((f) => f.id === focusId);
    if (!focus) return;
    const selected = String(focus.keyContact || '')
      .split('、')
      .map((x) => x.trim())
      .filter(Boolean);
    const next = selected.includes(contactName)
      ? selected.filter((x) => x !== contactName)
      : [...selected, contactName];
    updateFocus(focusId, { keyContact: next.join('、') });
  };

  const removeFocus = (id: string) => {
    if (focusItems.length <= 1) {
      persist([emptyData()]);
      return;
    }
    persist(focusItems.filter((f) => f.id !== id));
  };

  const openEditFocus = (focus: FocusSwotData) => {
    setIsCreatingFocus(false);
    setEditingFocus(JSON.parse(JSON.stringify(focus)));
  };

  const saveEditedFocus = async () => {
    if (!editingFocus) return;
    const normalized: FocusSwotData = {
      ...editingFocus,
      ourStrengths: (editingFocus.ourStrengths || []).map((x) => String(x || '').trim()).filter(Boolean),
      ourWeaknesses: (editingFocus.ourWeaknesses || []).map((x) => String(x || '').trim()).filter(Boolean),
      competitors: (editingFocus.competitors || []).map((c) => ({
        ...c,
        strengths: (c.strengths || []).map((x) => String(x || '').trim()).filter(Boolean),
        weaknesses: (c.weaknesses || []).map((x) => String(x || '').trim()).filter(Boolean)
      }))
    };
    if (!normalized.customerFocus.trim()) {
      toast.error('请填写客户关注点');
      return;
    }
    await handleFocusBlur(normalized.customerFocus);
    if (isCreatingFocus) {
      const next = [normalized, ...focusItems];
      persist(next);
      setActiveFocusId(normalized.id);
    } else {
      persist(focusItems.map((x) => (x.id === normalized.id ? normalized : x)));
    }
    setEditingFocus(null);
    setIsCreatingFocus(false);
  };

  const updateEditing = (patch: Partial<FocusSwotData>) => {
    if (!editingFocus) return;
    setEditingFocus({ ...editingFocus, ...patch });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><Swords className="w-4 h-4 text-rose-500" />客户关注点与竞争SWOT</h3>
        <div className="flex items-center gap-2">
          <button onClick={addFocus} className="px-3 py-1.5 rounded border border-indigo-200 text-indigo-600 text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3" />新增关注点</button>
          <button onClick={generateGlobalScript} disabled={loadingType !== ''} className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">{loadingType === 'script' ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}AI辅助梳理</button>
        </div>
      </div>
      {Boolean(globalScript) && (
      <div className="p-3 border border-indigo-100 bg-indigo-50/40 rounded-lg space-y-2">
        <div className="text-sm font-bold text-indigo-800">AI梳理思路</div>
        <div className="text-xs text-gray-600 h-[120px] overflow-y-auto whitespace-pre-wrap break-words border border-indigo-100 rounded bg-white p-2">
          {globalScript}
        </div>
      </div>
      )}

      {loadingData ? (
        <div className="p-6 text-sm text-gray-400 border border-dashed rounded-lg">正在加载客户关注点数据...</div>
      ) : (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {focusItems.map((focus, idx) => (
            <button
              key={`chip_${focus.id}`}
              onClick={() => setActiveFocusId(focus.id)}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                activeFocus.id === focus.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              关注点{idx + 1}{focus.customerFocus ? `: ${focus.customerFocus.slice(0, 8)}` : ''}
            </button>
          ))}
        </div>
        {[activeFocus].filter(Boolean).map((focus) => {
          const idx = focusItems.findIndex(f => f.id === focus.id);
          return (
          <div key={focus.id} className="rounded-xl border border-indigo-300 bg-indigo-50/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                关注点 #{idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditFocus(focus)} className="px-2 py-1 text-xs border border-indigo-200 text-indigo-600 rounded bg-white hover:bg-indigo-50 flex items-center gap-1"><Edit2 className="w-3 h-3" />编辑</button>
                <button onClick={() => removeFocus(focus.id)} className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded bg-white hover:bg-red-50">删除关注点</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-gray-200 bg-white p-2"><span className="text-gray-500">客户关注点：</span><div className="font-medium text-gray-900 mt-1">{focus.customerFocus || '-'}</div></div>
              <div className="rounded border border-gray-200 bg-white p-2"><span className="text-gray-500">客户联系人：</span><div className="font-medium text-gray-900 mt-1">{focus.keyContact || '-'}</div></div>
              <div className="rounded border border-gray-200 bg-white p-2"><span className="text-gray-500">关注度：</span><div className="font-medium text-gray-900 mt-1">{focus.focusLevel} 星</div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                <div className="text-xs font-bold text-emerald-700 mb-1">我方优势</div>
                <ul className="space-y-1 text-xs text-gray-700">
                  {(focus.ourStrengths || []).filter(Boolean).map((item, i) => <li key={`vs_${i}`}>• {item}</li>)}
                  {(focus.ourStrengths || []).filter(Boolean).length === 0 && <li className="text-gray-400">暂无</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                <div className="text-xs font-bold text-rose-700 mb-1">我方劣势</div>
                <ul className="space-y-1 text-xs text-gray-700">
                  {(focus.ourWeaknesses || []).filter(Boolean).map((item, i) => <li key={`vw_${i}`}>• {item}</li>)}
                  {(focus.ourWeaknesses || []).filter(Boolean).length === 0 && <li className="text-gray-400">暂无</li>}
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(focus.competitors || []).map((comp) => (
                <div key={comp.id} className="rounded-lg border border-blue-100 bg-blue-50/30 p-3 space-y-2">
                  <div className="text-xs font-bold text-blue-700">{comp.name || '未命名竞品'}</div>
                  <div>
                    <div className="text-[11px] text-emerald-700 font-semibold mb-1">优势</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {(comp.strengths || []).filter(Boolean).map((x, i) => <li key={`cs_${comp.id}_${i}`}>• {x}</li>)}
                      {(comp.strengths || []).filter(Boolean).length === 0 && <li className="text-gray-400">暂无</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] text-rose-700 font-semibold mb-1">劣势</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {(comp.weaknesses || []).filter(Boolean).map((x, i) => <li key={`cw_${comp.id}_${i}`}>• {x}</li>)}
                      {(comp.weaknesses || []).filter(Boolean).length === 0 && <li className="text-gray-400">暂无</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border border-indigo-100 bg-indigo-50/40 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-800">本关注点话术</h4>
                <button
                  onClick={() => {
                    setActiveFocusId(focus.id);
                    buildFocusScript(focus);
                  }}
                  disabled={loadingType === 'script' && activeFocus.id === focus.id}
                  className="px-2 py-1 text-xs rounded bg-indigo-600 text-white disabled:opacity-50"
                >
                  {loadingType === 'script' && activeFocus.id === focus.id ? '生成中...' : 'AI生成话术'}
                </button>
              </div>
              <div className="w-full h-[120px] overflow-y-auto whitespace-pre-wrap break-words px-2 py-2 border border-gray-200 rounded text-xs bg-white">
                {focus.aiScript || '暂无本关注点话术'}
              </div>
            </div>
          </div>
          );
        })}
      </div>
      )}

      {editingFocus && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">{isCreatingFocus ? '新增关注点' : '编辑关注点'}</h4>
              <button onClick={() => { setEditingFocus(null); setIsCreatingFocus(false); }} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <input list="focus-options-edit" className="col-span-12 md:col-span-5 px-2 py-2 border border-gray-200 rounded text-sm" placeholder="客户关注点（输入或选择）" value={editingFocus.customerFocus} onChange={(e) => updateEditing({ customerFocus: e.target.value })} />
              <datalist id="focus-options-edit">
                {(strategyConfig?.focusPoints || []).map((fp: any) => (
                  <option key={fp.id} value={fp.name} />
                ))}
              </datalist>
              <details className="col-span-12 md:col-span-5 relative">
                <summary className="list-none px-2 py-2 border border-gray-200 rounded text-sm bg-white cursor-pointer text-gray-700">
                  {editingFocus.keyContact || '客户联系人（多选）'}
                </summary>
                <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded border border-gray-200 bg-white shadow">
                  {contacts.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-gray-400">暂无客户联系人</div>
                  ) : (
                    contacts.map((c) => {
                      const selected = String(editingFocus.keyContact || '').split('、').filter(Boolean).includes(c.name || '');
                      return (
                        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const names = String(editingFocus.keyContact || '').split('、').filter(Boolean);
                              const next = selected ? names.filter((x) => x !== c.name) : [...names, c.name];
                              updateEditing({ keyContact: next.filter(Boolean).join('、') });
                            }}
                          />
                          <span>{c.name}{c.position ? `（${c.position}）` : ''}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </details>
              <select className="col-span-12 md:col-span-2 px-2 py-2 border border-gray-200 rounded text-sm" value={String(editingFocus.focusLevel)} onChange={(e) => updateEditing({ focusLevel: Number(e.target.value) })}>
                <option value="1">关注度 1星</option>
                <option value="2">关注度 2星</option>
                <option value="3">关注度 3星</option>
                <option value="4">关注度 4星</option>
                <option value="5">关注度 5星</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded border border-gray-200 p-3 bg-gray-50/40">
                <div className="text-xs font-bold text-gray-700 mb-1">我方优势（每行一条）</div>
                <textarea
                  value={(editingFocus.ourStrengths || []).join('\n')}
                  onChange={(e) => updateEditing({ ourStrengths: e.target.value.split('\n') })}
                  className="w-full min-h-[120px] px-2 py-2 border border-gray-200 rounded text-xs bg-white"
                />
              </div>
              <div className="rounded border border-gray-200 p-3 bg-gray-50/40">
                <div className="text-xs font-bold text-gray-700 mb-1">我方劣势（每行一条）</div>
                <textarea
                  value={(editingFocus.ourWeaknesses || []).join('\n')}
                  onChange={(e) => updateEditing({ ourWeaknesses: e.target.value.split('\n') })}
                  className="w-full min-h-[120px] px-2 py-2 border border-gray-200 rounded text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-700">竞品SWOT（可多竞品）</div>
                <button onClick={() => updateEditing({ competitors: [...(editingFocus.competitors || []), emptyCompetitor()] })} className="px-2 py-1 text-xs border border-gray-200 rounded bg-white"><Plus className="w-3 h-3 inline" />竞品</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(editingFocus.competitors || []).map((comp) => (
                  <div key={comp.id} className="rounded border border-gray-200 p-3 bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={comp.name}
                        onChange={(e) => updateEditing({ competitors: (editingFocus.competitors || []).map((x) => x.id === comp.id ? { ...x, name: e.target.value } : x) })}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                      >
                        <option value="">选择竞品</option>
                        {competitorLibrary.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                      </select>
                      <button onClick={() => updateEditing({ competitors: (editingFocus.competitors || []).length <= 1 ? [emptyCompetitor()] : (editingFocus.competitors || []).filter((x) => x.id !== comp.id) })} className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <textarea
                      value={(comp.strengths || []).join('\n')}
                      onChange={(e) => updateEditing({ competitors: (editingFocus.competitors || []).map((x) => x.id === comp.id ? { ...x, strengths: e.target.value.split('\n') } : x) })}
                      placeholder="竞品优势（每行一条）"
                      className="w-full min-h-[88px] px-2 py-2 border border-gray-200 rounded text-xs"
                    />
                    <textarea
                      value={(comp.weaknesses || []).join('\n')}
                      onChange={(e) => updateEditing({ competitors: (editingFocus.competitors || []).map((x) => x.id === comp.id ? { ...x, weaknesses: e.target.value.split('\n') } : x) })}
                      placeholder="竞品劣势（每行一条）"
                      className="w-full min-h-[88px] px-2 py-2 border border-gray-200 rounded text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-indigo-100 p-3 bg-indigo-50/30">
              <div className="text-xs font-bold text-indigo-700 mb-1">本关注点话术（可手动调整）</div>
              <textarea
                value={editingFocus.aiScript || ''}
                onChange={(e) => updateEditing({ aiScript: e.target.value })}
                className="w-full min-h-[100px] px-2 py-2 border border-gray-200 rounded text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setEditingFocus(null); setIsCreatingFocus(false); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded">取消</button>
              <button onClick={saveEditedFocus} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded">保存编辑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
