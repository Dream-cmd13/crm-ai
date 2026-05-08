import { toast } from 'react-hot-toast';
import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Edit2, Plus, Trash2 } from 'lucide-react';
import { ProductCategory } from '../types';
import DetailModal from '../components/DetailModal';
import { deleteProductCategoryFromSupabase, fetchProductCategoriesFromSupabase, saveProductCategoryToSupabase } from '../lib/productRepository';
import { confirmDialog } from '../lib/toastConfirm';

type ModalMode = 'add' | null;
type TreeCategoryRow = ProductCategory & { level: number };
interface ProductCategoriesProps {
  navigateTo?: (view: string, params?: any) => void;
}

const categoryFields = [
  { key: 'name', label: '类别名称', required: true },
  { key: 'image', label: '类别图片', type: 'image' },
  { key: 'status', label: '状态', type: 'select', options: [{ value: '1', label: '启用' }, { value: '0', label: '禁用' }] },
  { key: 'fab.features', label: '产品特征 (Features)', type: 'textarea' },
  { key: 'fab.advantages', label: '产品优势 (Advantages)', type: 'textarea' },
  { key: 'fab.benefits', label: '客户利益 (Benefits)', type: 'textarea' }
];

const flattenTree = (nodes: ProductCategory[]): TreeCategoryRow[] => {
  const result: TreeCategoryRow[] = [];
  const walk = (items: ProductCategory[], level = 0) => {
    items.forEach((item) => {
      result.push({ ...item, level });
      if (item.children?.length) walk(item.children, level + 1);
    });
  };
  walk(nodes);
  return result;
};

const formatCreateDate = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ProductCategories({ navigateTo }: ProductCategoriesProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentCategory, setCurrentCategory] = useState<ProductCategory | null>(null);

  const refreshCategories = async () => {
    const remote = await fetchProductCategoriesFromSupabase();
    setCategories(remote || []);
  };

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        await refreshCategories();
      } catch (error) {
        console.error('Error fetching product categories:', error);
        setCategories([]);
        toast.error('加载产品类别失败');
      } finally {
        setLoading(false);
      }
    };
    fetchRemote();
  }, []);

  const flattenedCategories = useMemo(() => flattenTree(categories), [categories]);

  const handleAdd = () => {
    setCurrentCategory({
      id: '',
      name: '',
      parentId: null,
      status: 1,
      image: '',
      createDate: '',
      children: [],
      fab: { features: '', advantages: '', benefits: '' }
    });
    setModalMode('add');
  };

  const handleDelete = async (category: ProductCategory) => {
    if (!category.id) return;
    const categoryName = String(category.name || '').trim() || category.id;
    if (!(await confirmDialog(`确认删除类别 "${categoryName}"？`))) return;
    try {
      await deleteProductCategoryFromSupabase(category.id);
      await refreshCategories();
      toast.success('产品类别删除成功');
    } catch (error) {
      console.error('Error deleting product category:', error);
      toast.error(`产品类别删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const handleSave = async (payload: any) => {
    const draft = payload as ProductCategory;
    const isNew = modalMode === 'add';
    const name = String(draft.name || '').trim();
    if (!name) {
      toast.error('类别名称不能为空');
      return false;
    }
    const normalizedStatus = Number.parseInt(String(draft.status ?? '1'), 10);

    try {
      await saveProductCategoryToSupabase(
        {
          ...draft,
          id: isNew ? '' : (currentCategory?.id || draft.id || ''),
          name,
          parentId: currentCategory?.parentId ?? null,
          status: Number.isNaN(normalizedStatus) ? 1 : normalizedStatus,
          children: []
        },
        { forceInsert: isNew }
      );
      await refreshCategories();
      setModalMode(null);
      setCurrentCategory(null);
      toast.success('产品类别保存成功');
      return true;
    } catch (error) {
      console.error('Error saving product category:', error);
      toast.error(`产品类别保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">产品类别</h2>
          <p className="text-sm text-gray-500 mt-1">管理产品类别基础信息与状态</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新增类别
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
          共 {flattenedCategories.length} 条产品类别
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-medium text-gray-500">名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">分类 ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">图片</th>
                <th className="p-4 text-sm font-medium text-gray-500">状态</th>
                <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && flattenedCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                    暂无产品类别数据
                  </td>
                </tr>
              )}
              {flattenedCategories.map((category) => (
                <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-900">
                    <div className="flex items-center" style={{ paddingLeft: `${category.level * 20}px` }}>
                      {category.level > 0 ? <span className="text-gray-300 mr-2">└</span> : null}
                      <span>{category.name || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-indigo-600">{category.id || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {category.image ? (
                      <img src={category.image} alt={category.name || 'category'} className="w-10 h-10 object-cover rounded border border-gray-200" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {Number(category.status ?? 1) === 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">禁用</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">启用</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{formatCreateDate(category.createDate)}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateTo?.('product-category-detail', { id: category.id, name: category.name, mode: 'view' })}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTo?.('product-category-detail', { id: category.id, name: category.name, mode: 'edit' })}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
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
      </div>

      {modalMode === 'add' && currentCategory && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentCategory(null);
          }}
          title="新增产品类别"
          data={currentCategory}
          fields={categoryFields}
          isEditing={true}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
