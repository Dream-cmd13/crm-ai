﻿import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Search, Trash2, ArrowLeft, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Competitor } from '../types';
import { fetchCompetitors, saveCompetitors } from '../lib/competitorRepository';
import UniversalSelector from '../components/UniversalSelector';
import { confirmDialog } from '../lib/toastConfirm';
import { generateBusinessId, ID_PREFIX } from '../lib/idUtils';

export default function CompetitorLibrary() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectingCategoryForIdx, setSelectingCategoryForIdx] = useState<number | null>(null);
  const [detailDraft, setDetailDraft] = useState<Competitor | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchCompetitors().then(setCompetitors).catch(console.error);
  }, []);

  const saveAll = async (next?: Competitor[]) => {
    const payload = next || competitors;
    setCompetitors(payload);
    try {
      await saveCompetitors(payload);
      toast.success('竞品库已保存');
    } catch (error) {
      console.error(error);
      toast.error('竞品库保存失败');
    }
  };

  const filtered = useMemo(
    () => competitors.filter((c) => c.name.includes(search) || (c.positioning || '').includes(search)),
    [competitors, search]
  );

  const activeCompetitor = activeId ? competitors.find((x) => x.id === activeId) || null : null;

  useEffect(() => {
    if (activeId === 'new') {
      setDetailDraft({
        id: 'new',
        name: '',
        advantages: '',
        disadvantages: '',
        positioning: '',
        productProfiles: [{ productName: '', benchmarkCategory: '', advantages: '', disadvantages: '' }],
        creatorId: 'system',
        creatorNo: 'system',
        creatorName: 'system',
        createDate: new Date().toISOString().split('T')[0]
      });
      setIsEditing(true);
    } else {
      setDetailDraft(activeCompetitor ? JSON.parse(JSON.stringify(activeCompetitor)) : null);
      setIsEditing(false);
    }
    setSelectingCategoryForIdx(null);
  }, [activeId, activeCompetitor?.id]);

  const handleCreate = () => {
    setActiveId('new');
  };

  if (activeId && detailDraft) {
    return (
      <div className="h-full flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveId(null)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{detailDraft.name || (activeId === 'new' ? '新增竞品' : '未命名竞品')}</h2>
          <div className="ml-auto flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50"
              >
                编辑
              </button>
            ) : (
              <button
                onClick={() => {
                  if (activeId === 'new') {
                    if (!detailDraft.name.trim()) {
                      toast.error('请输入竞品名称');
                      return;
                    }
                    const realId = generateBusinessId(ID_PREFIX.COMPETITOR, competitors);
                     const newItem = { ...detailDraft, id: realId };
                    saveAll([newItem, ...competitors]);
                    setActiveId(realId);
                  } else {
                    saveAll(competitors.map((x) => (x.id === detailDraft.id ? detailDraft : x)));
                  }
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                保存详情
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">竞品名称</label>
                <input readOnly={!isEditing} value={detailDraft.name} onChange={(e) => setDetailDraft({ ...detailDraft, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-50" placeholder="竞品公司或品牌名称" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">创建信息</label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500">
                  {detailDraft.creatorName} · {detailDraft.createDate}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">整体定位</label>
              <textarea readOnly={!isEditing} value={detailDraft.positioning || ''} onChange={(e) => setDetailDraft({ ...detailDraft, positioning: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[60px] bg-white" placeholder="该公司在市场中的定位..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">整体优势</label>
                <textarea readOnly={!isEditing} value={detailDraft.advantages || ''} onChange={(e) => setDetailDraft({ ...detailDraft, advantages: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px] bg-white" placeholder="核心优势、强项..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">整体劣势</label>
                <textarea readOnly={!isEditing} value={detailDraft.disadvantages || ''} onChange={(e) => setDetailDraft({ ...detailDraft, disadvantages: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px] bg-white" placeholder="短板、痛点..." />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-gray-900">产品对标明细</label>
                {isEditing && <button
                  onClick={() => setDetailDraft({ ...detailDraft, productProfiles: [...(detailDraft.productProfiles || []), { productName: '', benchmarkCategory: '', advantages: '', disadvantages: '' }] })}
                  className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded"
                >
                  <Plus className="w-3 h-3" />添加对标产品
                </button>}
              </div>
              <div className="space-y-2">
                {(detailDraft.productProfiles || []).map((p, idx) => (
                  <div key={`${detailDraft.id}_p_${idx}`} className="grid grid-cols-12 gap-2">
                    <input readOnly={!isEditing} value={p.productName || ''} onChange={(e) => setDetailDraft({ ...detailDraft, productProfiles: (detailDraft.productProfiles || []).map((s, i) => i === idx ? { ...s, productName: e.target.value } : s) })} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm bg-white" placeholder="供应产品" />
                    <input value={p.benchmarkCategory || ''} readOnly onClick={() => isEditing && setSelectingCategoryForIdx(idx)} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm bg-white cursor-pointer" placeholder="点击选择我方类别" />
                    <input readOnly={!isEditing} value={p.advantages || ''} onChange={(e) => setDetailDraft({ ...detailDraft, productProfiles: (detailDraft.productProfiles || []).map((s, i) => i === idx ? { ...s, advantages: e.target.value } : s) })} className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm bg-white" placeholder="产品优势" />
                    <input readOnly={!isEditing} value={p.disadvantages || ''} onChange={(e) => setDetailDraft({ ...detailDraft, productProfiles: (detailDraft.productProfiles || []).map((s, i) => i === idx ? { ...s, disadvantages: e.target.value } : s) })} className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm bg-white" placeholder="产品劣势" />
                    {isEditing && <button onClick={() => setDetailDraft({ ...detailDraft, productProfiles: (detailDraft.productProfiles || []).filter((_, i) => i !== idx) })} className="col-span-1 px-2 py-1 border border-red-200 text-red-600 rounded text-sm">删</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isEditing && selectingCategoryForIdx !== null && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full h-[600px] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">选择对标我方类别</h3>
                <button onClick={() => setSelectingCategoryForIdx(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <UniversalSelector
                  type="category"
                  onSelect={(selectedCat: any) => {
                    if (selectedCat) {
                      setDetailDraft({
                        ...detailDraft,
                        productProfiles: (detailDraft.productProfiles || []).map((s, i) =>
                          i === selectingCategoryForIdx ? { ...s, benchmarkCategory: selectedCat.name } : s
                        )
                      });
                    }
                    setSelectingCategoryForIdx(null);
                  }}
                  onClose={() => setSelectingCategoryForIdx(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">竞品库</h2>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium">
          <Plus className="w-4 h-4" />
          新增竞品
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="搜索竞品名称、定位..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">竞品名称</th>
                <th className="px-6 py-3">定位</th>
                <th className="px-6 py-3">整体优势</th>
                <th className="px-6 py-3">对标产品数</th>
                <th className="px-6 py-3 w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <button className="text-indigo-600 hover:text-indigo-800 underline" onClick={() => setActiveId(item.id)}>
                      {item.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{item.positioning || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{item.advantages || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{(item.productProfiles || []).length}个</td>
                  <td className="px-6 py-4">
                    <button onClick={(e) => { 
                      e.stopPropagation(); 
                      confirmDialog('确定要删除该竞品吗？').then((ok) => {
                        if (!ok) return;
                        saveAll(competitors.filter(c => c.id !== item.id));
                        if (activeId === item.id) setActiveId(null);
                      });
                    }} className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50 transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    未找到匹配的竞品数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
