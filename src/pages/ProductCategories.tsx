import { toast } from 'react-hot-toast';
import React, { useEffect, useMemo, useState } from 'react';
import { FolderTree, Settings, Sparkles, Plus, Trash2, Edit2 } from 'lucide-react';
import { ProductCategory, ProductSeries } from '../types';
import DetailModal from '../components/DetailModal';
import { cn } from '../lib/utils';
import { deleteProductCategoryFromSupabase, deleteProductSeriesFromSupabase, fetchProductCategoriesFromSupabase, fetchProductSeriesFromSupabase, saveProductCategoryToSupabase, saveProductSeriesToSupabase } from '../lib/productRepository';

export default function ProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<ProductCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  const [editingSeries, setEditingSeries] = useState<ProductSeries | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    setSelectedSeriesId('');
  }, [selectedCategoryId]);

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const [remote, seriesRows] = await Promise.all([
          fetchProductCategoriesFromSupabase(),
          fetchProductSeriesFromSupabase()
        ]);
        const flat = flattenTree(remote || []);
        setCategories(buildTreeByCode(flat));
        setSeriesList(seriesRows || []);
      } catch (error) {
        console.error('Error fetching product categories:', error);
        setCategories([]);
        setSeriesList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRemote();
  }, []);

  const refreshSeries = async () => {
    try {
      const rows = await fetchProductSeriesFromSupabase();
      setSeriesList(rows || []);
    } catch (error) {
      console.error('Error fetching product series:', error);
      toast.error('刷新产品系列失败');
    }
  };

  const categoryFields = [
    { key: 'id', label: '类别编号', required: true },
    { key: 'name', label: '类别名称', required: true },
    { key: 'image', label: '类别图片', type: 'image' },
    { key: 'fab.features', label: '产品特征 (Features)', type: 'textarea' },
    { key: 'fab.advantages', label: '产品优势 (Advantages)', type: 'textarea' },
    { key: 'fab.benefits', label: '客户利益 (Benefits)', type: 'textarea' },
  ];

  const flattenTree = (nodes: ProductCategory[]): ProductCategory[] => {
    const result: ProductCategory[] = [];
    const walk = (items: ProductCategory[]) => {
      items.forEach((item) => {
        const current: ProductCategory = { ...item, children: undefined };
        result.push(current);
        if (item.children?.length) walk(item.children);
      });
    };
    walk(nodes);
    return result;
  };

  const buildTreeByCode = (flat: ProductCategory[]): ProductCategory[] => {
    const ids = flat.map((c) => c.id).filter(Boolean);
    const map = new Map<string, ProductCategory>();
    flat.forEach((row) => {
      map.set(row.id, { ...row, parentId: null, children: [] });
    });

    const computeParentId = (id: string) => {
      const candidates = ids
        .filter((p) => p !== id && id.startsWith(p) && p.length < id.length)
        .sort((a, b) => b.length - a.length);
      return candidates[0] || null;
    };

    map.forEach((node) => {
      node.parentId = computeParentId(node.id);
    });

    const roots: ProductCategory[] = [];
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortTree = (items: ProductCategory[]) => {
      items.sort((a, b) => a.id.localeCompare(b.id));
      items.forEach((i) => i.children?.length && sortTree(i.children));
    };
    sortTree(roots);
    return roots;
  };

  const nextRootCode = (existing: string[]) => {
    const roots = existing.filter((c) => /^[0-9]+$/.test(c) && c.length === 2).map((c) => Number(c));
    const next = roots.length > 0 ? Math.max(...roots) + 1 : 1;
    return String(next).padStart(2, '0');
  };

  const nextChildCode = (parent: string, existing: string[]) => {
    const targetLen = parent.length + 2;
    const children = existing
      .filter((c) => c.startsWith(parent) && c.length === targetLen)
      .map((c) => c.slice(parent.length))
      .filter((suffix) => /^[0-9]{2}$/.test(suffix))
      .map((suffix) => Number(suffix));
    const next = children.length > 0 ? Math.max(...children) + 1 : 1;
    return `${parent}${String(next).padStart(2, '0')}`;
  };

  const flattenedCategories = useMemo(() => {
    const list: Array<ProductCategory & { level: number }> = [];
    const walk = (items: ProductCategory[], level = 0) => {
      items.forEach((item) => {
        list.push({ ...item, level });
        if (item.children?.length) walk(item.children, level + 1);
      });
    };
    walk(categories);
    return list;
  }, [categories]);

  const selectedCategory = useMemo(
    () => flattenedCategories.find((item) => item.id === selectedCategoryId) || flattenedCategories[0] || null,
    [flattenedCategories, selectedCategoryId]
  );
  const selectedCategorySeries = useMemo(
    () => seriesList.filter((s) => !selectedCategory?.id || s.categoryId === selectedCategory.id),
    [seriesList, selectedCategory?.id]
  );
  const selectedSeries = useMemo(
    () => selectedCategorySeries.find((s) => s.id === selectedSeriesId) || selectedCategorySeries[0] || null,
    [selectedCategorySeries, selectedSeriesId]
  );
  const seriesFields = [
    { key: 'id', label: '系列ID', required: true },
    { key: 'name', label: '系列名称', required: true },
    { key: 'categoryId', label: '绑定类别', type: 'select', options: flattenedCategories.map((c) => ({ value: c.id, label: `${c.id} - ${c.name}` })) },
    { key: 'description', label: '系列说明', type: 'textarea' },
    { key: 'fab.features', label: 'F-特征', type: 'textarea' },
    { key: 'fab.advantages', label: 'A-优势', type: 'textarea' },
    { key: 'fab.benefits', label: 'B-利益', type: 'textarea' }
  ];

  const renderCategoryTree = (categories: ProductCategory[], level = 0) => {
    return categories.map(category => (
      <div key={category.id} className="space-y-1">
        <div
          className={cn(
            'w-full flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group',
            selectedCategoryId === category.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategoryId(category.id)}
            className="flex-1 min-w-0 flex items-center gap-2 text-left"
          >
            <FolderTree className="w-4 h-4 shrink-0 text-gray-400" />
            <span className="truncate text-sm">{category.name}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCategoryForEdit(category);
              setIsEditingCategory(true);
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        {category.children && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">产品类别与产品系列设置</h2>
        <p className="text-sm text-gray-500 mt-1">左侧树为产品类别（`ba_cptype`）；产品资料中的 `seriesId` 从产品系列中选择。</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-700">类别数</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                {flattenedCategories.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const flat = flattenTree(categories);
                  const id = nextRootCode(flat.map((c) => c.id));
                  setSelectedCategoryForEdit({ id, name: '', parentId: null, fab: { features: '', advantages: '', benefits: '' }, children: [], _isNew: true } as any);
                  setIsEditingCategory(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                新增类别
              </button>
              {selectedCategory?.id && (
                <button
                  type="button"
                  onClick={() => {
                    const flat = flattenTree(categories);
                    const id = nextChildCode(selectedCategory.id, flat.map((c) => c.id));
                    setSelectedCategoryForEdit({ id, name: '', parentId: selectedCategory.id, fab: { features: '', advantages: '', benefits: '' }, children: [], _isNew: true } as any);
                    setIsEditingCategory(true);
                  }}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增子类
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1 max-h-[560px] overflow-auto pr-1">
            {renderCategoryTree(categories)}
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-rows-[minmax(260px,1fr)_minmax(260px,1fr)] gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          {selectedCategory ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">类别编号：{selectedCategory.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategoryForEdit(selectedCategory);
                      setIsEditingCategory(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑类别
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedCategory?.id) return;
                      if (!window.confirm(`确认删除类别 ${selectedCategory.id}（含子类与关联系列）？`)) return;
                      const flat = flattenTree(categories);
                      const deleteCategoryIds = flat.filter((c) => c.id === selectedCategory.id || c.id.startsWith(selectedCategory.id)).map((c) => c.id);
                      const remain = flat.filter((c) => !deleteCategoryIds.includes(c.id));
                      setCategories(buildTreeByCode(remain));
                      setSeriesList((prev) => prev.filter((s) => !deleteCategoryIds.includes(s.categoryId || '')));
                      setSelectedCategoryId(remain[0]?.id || '');
                      try {
                        await Promise.all([
                          ...deleteCategoryIds.map((id) => deleteProductCategoryFromSupabase(id)),
                          ...seriesList.filter((s) => deleteCategoryIds.includes(s.categoryId || '')).map((s) => deleteProductSeriesFromSupabase(s.id))
                        ]);
                      } catch (error) {
                        console.error(error);
                        toast.error('类别删除失败，请稍后重试');
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-100 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除类别
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900">类别对应系列（用于产品资料 `seriesId`）</h4>
                  <button
                    onClick={() => setEditingSeries({ id: `SER${Date.now()}`, name: '', categoryId: selectedCategory.id, description: '', fab: { features: '', advantages: '', benefits: '' } })}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold"
                  >
                    新增系列
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedCategorySeries.map((s) => (
                    <div key={s.id} className={cn("p-2 rounded border flex items-center justify-between cursor-pointer", selectedSeries?.id === s.id ? "border-indigo-300 bg-indigo-50/50" : "border-gray-100")} onClick={() => setSelectedSeriesId(s.id)}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">ID:{s.id} | 类别:{s.categoryId || '-'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setEditingSeries(s); }} className="px-2 py-1 text-xs border border-indigo-200 text-indigo-600 rounded">编辑</button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`确认删除系列 ${s.name}？`)) return;
                            try {
                              await deleteProductSeriesFromSupabase(s.id);
                              setSeriesList((prev) => prev.filter((x) => x.id !== s.id));
                              if (selectedSeriesId === s.id) setSelectedSeriesId('');
                              toast.success('产品系列删除成功');
                              await refreshSeries();
                            } catch (error) {
                              console.error(error);
                              toast.error('系列删除失败，请稍后重试');
                            }
                          }}
                          className="px-2 py-1 text-xs border border-rose-200 text-rose-600 rounded"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedCategorySeries.length === 0 && (
                    <div className="text-xs text-gray-400">当前类别下暂无产品系列</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">暂无类别数据</div>
          )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900">系列 FAB</h4>
              {selectedSeries && (
                <button onClick={() => setEditingSeries(selectedSeries)} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold">
                  编辑系列FAB
                </button>
              )}
            </div>
            {selectedSeries ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-900">{selectedSeries.name} <span className="text-xs text-gray-500">({selectedSeries.id})</span></div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                  <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500" />F - Features 产品特征</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSeries.fab?.features || '未设置'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                  <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500" />A - Advantages 产品优势</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSeries.fab?.advantages || '未设置'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
                  <h4 className="text-xs font-bold text-gray-900 mb-1 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500" />B - Benefits 客户利益</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSeries.fab?.benefits || '未设置'}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">请先在右上选择一个系列查看FAB</div>
            )}
          </div>
        </div>
      </div>
      {isEditingCategory && (
        <DetailModal
          isOpen={true}
          onClose={() => setIsEditingCategory(false)}
          title="编辑产品类别"
          data={selectedCategoryForEdit}
          fields={categoryFields}
          isEditing={true}
          onSave={(payload) => {
            const draft = payload as ProductCategory;
            const id = String(draft.id || '').trim();
            if (!id) {
              toast.error('类别编号不能为空');
              return false;
            }
            const name = String(draft.name || '').trim();
            if (!name) {
              toast.error('类别名称不能为空');
              return false;
            }

            const flat = flattenTree(categories);
            const withoutOld = flat.filter((c) => c.id !== (selectedCategoryForEdit?.id || ''));
            const upsertedFlat = [
              ...withoutOld,
              {
                ...draft,
                id,
                name,
                parentId: null,
                children: undefined
              }
            ];
            const nextTree = buildTreeByCode(upsertedFlat);
            setCategories(nextTree);
            setSelectedCategoryId(id);
            setSelectedCategoryForEdit(null);
            setIsEditingCategory(false);

            const savedNode = flattenTree(nextTree).find((c) => c.id === id) as ProductCategory | undefined;
            if (!savedNode) return;
            saveProductCategoryToSupabase(savedNode).catch((error) => {
              console.error('Error saving product category:', error);
              toast.error(`产品类别保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
            });
            return true;
          }}
        />
      )}
      {editingSeries && (
        <DetailModal
          isOpen={true}
          onClose={() => setEditingSeries(null)}
          title="编辑产品系列"
          data={editingSeries}
          fields={seriesFields}
          isEditing={true}
          onSave={async (payload) => {
            const draft = payload as ProductSeries;
            const id = String(draft.id || '').trim();
            const name = String(draft.name || '').trim();
            if (!id) {
              toast.error('系列ID不能为空');
              return false;
            }
            if (!name) {
              toast.error('系列名称不能为空');
              return false;
            }
            try {
              const saved = await saveProductSeriesToSupabase({
                ...draft,
                id,
                name
              });
              setSeriesList((prev) => {
                const exists = prev.some((x) => x.id === saved.id);
                return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
              });
              setSelectedSeriesId(saved.id);
              toast.success('产品系列保存成功');
              await refreshSeries();
              return true;
            } catch (error) {
              console.error(error);
              toast.error(`产品系列保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
              return false;
            }
          }}
        />
      )}
    </div>
  );
}
