import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Edit2, Plus, Trash2, Search, Loader2, FolderTree } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { ProductCategory, ProductSeries } from '../types';
import { cn } from '../lib/utils';
import {
  deleteProductSeriesFromSupabase,
  fetchProductCategoriesFromSupabase,
  fetchProductSeriesFromSupabase,
  saveProductSeriesToSupabase
} from '../lib/productRepository';

type ModalMode = 'view' | 'edit' | 'add' | null;
interface ProductSeriesProps {
  navigateTo?: (view: string, params?: any) => void;
}

const flattenCategoryTree = (nodes: ProductCategory[]): ProductCategory[] => {
  const result: ProductCategory[] = [];
  const walk = (items: ProductCategory[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return result;
};

const buildTreeCategoryOptions = (nodes: ProductCategory[], level = 0): { value: string; label: string }[] => {
  const result: { value: string; label: string }[] = [];
  nodes.forEach((category) => {
    const indent = level > 0 ? `${'  '.repeat(level)}└ ` : '';
    result.push({
      value: String(category.id),
      label: `${indent}${category.name}`
    });
    if (category.children?.length) {
      result.push(...buildTreeCategoryOptions(category.children, level + 1));
    }
  });
  return result;
};

const seriesFields = (categoryTree: ProductCategory[]) => [
  { key: 'seriesNo', label: '系列编号' },
  { key: 'name', label: '系列名称', required: true },
  {
    key: 'categoryId',
    label: '产品类别',
    type: 'select',
    options: buildTreeCategoryOptions(categoryTree)
  },
  { key: 'description', label: '描述', type: 'textarea' },
  { key: 'fab.features', label: '产品特征 (Features)', type: 'textarea' },
  { key: 'fab.advantages', label: '产品优势 (Advantages)', type: 'textarea' },
  { key: 'fab.benefits', label: '客户利益 (Benefits)', type: 'textarea' }
];

const createEmptySeries = (): ProductSeries => ({
  id: '',
  seriesNo: '',
  name: '',
  categoryId: '',
  description: '',
  fab: {
    features: '',
    advantages: '',
    benefits: ''
  }
});

export default function ProductSeriesPage({ navigateTo }: ProductSeriesProps) {
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  const [categoryTree, setCategoryTree] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentSeries, setCurrentSeries] = useState<ProductSeries | null>(null);

  const refreshData = async () => {
    const [seriesRows, categoryTree] = await Promise.all([
      fetchProductSeriesFromSupabase(),
      fetchProductCategoriesFromSupabase()
    ]);
    setSeriesList(seriesRows || []);
    setCategoryTree(categoryTree || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Error fetching product series:', error);
        setSeriesList([]);
        setCategoryTree([]);
        toast.error('加载产品系列失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    flattenCategoryTree(categoryTree).forEach((category) => {
      map.set(String(category.id), category.name || '');
    });
    return map;
  }, [categoryTree]);

  const filteredSeriesList = useMemo(() => {
    const selectedCategoryIds = (() => {
      if (!selectedCategory) return [];
      const findCategory = (nodes: ProductCategory[], id: string): ProductCategory | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children?.length) {
            const found = findCategory(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const collectIds = (node: ProductCategory): string[] => {
        let ids = [node.id];
        node.children?.forEach((child) => {
          ids = [...ids, ...collectIds(child)];
        });
        return ids;
      };

      const category = findCategory(categoryTree, selectedCategory);
      return category ? collectIds(category) : [selectedCategory];
    })();

    const keyword = searchTerm.trim().toLowerCase();
    return seriesList.filter((series) => {
      const matchesCategory = selectedCategory
        ? selectedCategoryIds.includes(String(series.categoryId || ''))
        : true;
      if (!matchesCategory) return false;

      if (!keyword) return true;

      const categoryName = categoryNameMap.get(String(series.categoryId || '')) || '';
      const text = [
        series.id,
        series.seriesNo,
        series.name,
        series.description,
        series.categoryId,
        categoryName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(keyword);
    });
  }, [seriesList, searchTerm, categoryNameMap, selectedCategory, categoryTree]);

  const handleAdd = () => {
    setCurrentSeries(createEmptySeries());
    setModalMode('add');
  };

  const handleEdit = (series: ProductSeries) => {
    setCurrentSeries({
      ...createEmptySeries(),
      ...series,
      fab: {
        features: series.fab?.features || '',
        advantages: series.fab?.advantages || '',
        benefits: series.fab?.benefits || ''
      }
    });
    setModalMode('edit');
  };

  const handleView = (series: ProductSeries) => {
    setCurrentSeries({
      ...createEmptySeries(),
      ...series,
      fab: {
        features: series.fab?.features || '',
        advantages: series.fab?.advantages || '',
        benefits: series.fab?.benefits || ''
      }
    });
    setModalMode('view');
  };

  const handleDelete = async (series: ProductSeries) => {
    if (!series.id) return;
    if (!window.confirm(`确认删除产品系列 ${series.id}？`)) return;

    try {
      await deleteProductSeriesFromSupabase(series.id);
      await refreshData();
      toast.success('产品系列删除成功');
    } catch (error) {
      console.error('Error deleting product series:', error);
      toast.error(`产品系列删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const formatCategory = (series: ProductSeries) => {
    if (!series.categoryId) return '-';
    const categoryName = categoryNameMap.get(String(series.categoryId)) || '';
    return categoryName || '-';
  };

  const handleSave = async (payload: any) => {
    const draft = payload as ProductSeries;
    const isNew = modalMode === 'add';
    const name = String(draft.name || '').trim();

    if (!name) {
      toast.error('系列名称不能为空');
      return false;
    }

    try {
      await saveProductSeriesToSupabase({
        ...createEmptySeries(),
        ...draft,
        id: isNew ? '' : (currentSeries?.id || draft.id || ''),
        seriesNo: String(draft.seriesNo || '').trim(),
        name,
        categoryId: draft.categoryId || '',
        description: String(draft.description || '').trim(),
        fab: {
          features: String(draft.fab?.features || '').trim(),
          advantages: String(draft.fab?.advantages || '').trim(),
          benefits: String(draft.fab?.benefits || '').trim()
        }
      });
      await refreshData();
      setModalMode(null);
      setCurrentSeries(null);
      toast.success('产品系列保存成功');
      return true;
    } catch (error) {
      console.error('Error saving product series:', error);
      toast.error(`产品系列保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  const fields = useMemo(() => seriesFields(categoryTree), [categoryTree]);

  const renderCategoryTree = (categories: ProductCategory[], level = 0) => {
    return categories.map((category) => (
      <div key={category.id} className="space-y-1">
        <div
          className={cn(
            'flex items-center p-2 rounded-lg transition-all cursor-pointer',
            selectedCategory === category.id
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedCategory(category.id)}
        >
          <FolderTree
            className={cn(
              'w-4 h-4 shrink-0 mr-2',
              selectedCategory === category.id ? 'text-indigo-500' : 'text-gray-400'
            )}
          />
          <span className={cn('truncate text-sm', category.status === 0 ? 'line-through text-gray-400' : '')}>
            {category.name}
          </span>
        </div>
        {category.children?.length ? renderCategoryTree(category.children, level + 1) : null}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-2">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900">产品系列</h2>
          <p className="text-sm text-gray-500 mt-1">管理产品系列基础信息</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索产品系列..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            新增系列
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
        <div className="w-full md:w-72 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-56 md:h-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-sm">产品类别</h3>
            <button
              type="button"
              onClick={() => navigateTo?.('product-categories')}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
              title="管理产品类别"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'w-full text-left px-2 py-2 rounded-lg text-sm mb-1',
                selectedCategory === null ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              全部类别
            </button>
            {renderCategoryTree(categoryTree)}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            共 {filteredSeriesList.length} 条产品系列
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <th className="p-4 text-sm font-medium text-gray-500">系列ID</th>
                  <th className="p-4 text-sm font-medium text-gray-500">系列编号</th>
                  <th className="p-4 text-sm font-medium text-gray-500">系列名称</th>
                  <th className="p-4 text-sm font-medium text-gray-500">产品类别</th>
                  <th className="p-4 text-sm font-medium text-gray-500">描述</th>
                  <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeriesList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                      暂无产品系列数据
                    </td>
                  </tr>
                )}
                {filteredSeriesList.map((series) => (
                  <tr key={series.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-sm text-indigo-600">{series.id || '-'}</td>
                    <td className="p-4 text-sm text-gray-500">{series.seriesNo || '-'}</td>
                    <td className="p-4 text-sm text-gray-900">{series.name || '-'}</td>
                    <td className="p-4 text-sm text-gray-500">{formatCategory(series)}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-[260px] truncate">{series.description || '-'}</td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleView(series)}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(series)}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(series)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4 p-4 overflow-y-auto flex-1">
            {filteredSeriesList.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                暂无产品系列数据
              </div>
            )}
            {filteredSeriesList.map((series) => (
              <div key={series.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900">{series.name || '-'}</h3>
                    <p className="text-xs text-indigo-600 font-medium">{series.seriesNo || series.id || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">系列ID</p>
                    <p className="text-gray-900">{series.id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">产品类别</p>
                    <p className="text-gray-900">{formatCategory(series)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">描述</p>
                    <p className="text-gray-900">{series.description || '-'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => handleDelete(series)}
                    className="text-red-600 text-sm font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleView(series)}
                      className="text-gray-600 text-sm font-medium"
                    >
                      详情
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(series)}
                      className="text-indigo-600 text-sm font-medium"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalMode === 'view' && currentSeries && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentSeries(null);
          }}
          title="产品系列详情"
          data={currentSeries}
          fields={fields}
          isEditing={false}
          onEdit={() => setModalMode('edit')}
        />
      )}

      {(modalMode === 'edit' || modalMode === 'add') && currentSeries && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentSeries(null);
          }}
          title={modalMode === 'add' ? '新增产品系列' : '编辑产品系列'}
          data={currentSeries}
          fields={fields}
          isEditing={true}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
