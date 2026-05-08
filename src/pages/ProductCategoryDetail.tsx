import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronRight, Edit2, Loader2, Save, X } from 'lucide-react';
import { ProductCategory } from '../types';
import {
  fetchProductCategoriesFromSupabase,
  fetchProductCategoryByIdFromSupabase,
  saveProductCategoryToSupabase
} from '../lib/productRepository';

interface ProductCategoryDetailProps {
  viewParams?: any;
  goBack?: () => void;
}

const formatCreateDate = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ProductCategoryDetail({ viewParams, goBack }: ProductCategoryDetailProps) {
  const categoryId = String(viewParams?.id || '').trim();
  const initialEdit = String(viewParams?.mode || '').toLowerCase() === 'edit';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    setIsEditing(initialEdit);
  }, [initialEdit, categoryId]);

  useEffect(() => {
    const load = async () => {
      if (!categoryId) {
        toast.error('缺少类别 ID，无法打开详情');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [detail, tree] = await Promise.all([
          fetchProductCategoryByIdFromSupabase(categoryId),
          fetchProductCategoriesFromSupabase()
        ]);
        setAllCategories(tree || []);
        if (!detail) {
          setCategory(null);
          setFormData(null);
          return;
        }
        setCategory(detail);
        setFormData({
          ...detail,
          status: Number(detail.status ?? 1),
          fab: {
            features: detail.fab?.features || '',
            advantages: detail.fab?.advantages || '',
            benefits: detail.fab?.benefits || ''
          }
        });
      } catch (error) {
        console.error('Error loading category detail:', error);
        toast.error(`加载产品类别详情失败：${(error as Error)?.message || '请稍后重试'}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId]);

  const parentName = useMemo(() => {
    if (!formData?.parentId) return '-';
    let found = '-';
    const walk = (nodes: ProductCategory[]) => {
      nodes.forEach((node) => {
        if (String(node.id) === String(formData.parentId)) {
          found = node.name || String(node.id);
          return;
        }
        if (node.children?.length) walk(node.children);
      });
    };
    walk(allCategories);
    return found;
  }, [formData?.parentId, allCategories]);

  const handleSave = async () => {
    if (!category || !formData) return;
    const name = String(formData.name || '').trim();
    if (!name) {
      toast.error('类别名称不能为空');
      return;
    }
    try {
      setSaving(true);
      await saveProductCategoryToSupabase(
        {
          ...category,
          ...formData,
          id: category.id,
          name,
          status: Number.parseInt(String(formData.status ?? 1), 10) || 1,
          fab: {
            features: String(formData.fab?.features || ''),
            advantages: String(formData.fab?.advantages || ''),
            benefits: String(formData.fab?.benefits || '')
          },
          children: []
        },
        { forceInsert: false }
      );
      const latest = await fetchProductCategoryByIdFromSupabase(category.id);
      if (latest) {
        setCategory(latest);
        setFormData({
          ...latest,
          status: Number(latest.status ?? 1),
          fab: {
            features: latest.fab?.features || '',
            advantages: latest.fab?.advantages || '',
            benefits: latest.fab?.benefits || ''
          }
        });
      }
      setIsEditing(false);
      toast.success('产品类别保存成功');
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(`产品类别保存失败：${(error as Error)?.message || '请稍后重试'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!category || !formData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">未找到对应产品类别记录。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack?.()} className="text-gray-500 hover:text-gray-900 font-medium">
            产品类别
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-bold">{formData.name || '产品类别详情'}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Edit2 className="w-4 h-4" />
              编辑
            </button>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...category,
                    status: Number(category.status ?? 1),
                    fab: {
                      features: category.fab?.features || '',
                      advantages: category.fab?.advantages || '',
                      benefits: category.fab?.benefits || ''
                    }
                  });
                  setIsEditing(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">类别ID</p>
            <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800">
              {formData.id || '-'}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">父级类别</p>
            <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800">
              {parentName}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">类别名称 <span className="text-red-500">*</span></p>
            {!isEditing && (
              <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800">
                {formData.name || '-'}
              </div>
            )}
            {isEditing && (
              <input
                value={String(formData.name || '')}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">状态</p>
            {!isEditing && (
              <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800">
                {Number(formData.status ?? 1) === 0 ? '禁用' : '启用'}
              </div>
            )}
            {isEditing && (
              <select
                value={String(Number(formData.status ?? 1))}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, status: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="1">启用</option>
                <option value="0">禁用</option>
              </select>
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">类别图片</p>
            {!isEditing && (
              <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800 break-all">
                {formData.image || '-'}
              </div>
            )}
            {isEditing && (
              <input
                value={String(formData.image || '')}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, image: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">产品特征 (Features)</p>
            {!isEditing && (
              <div className="min-h-20 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
                {formData.fab?.features || '-'}
              </div>
            )}
            {isEditing && (
              <textarea
                value={String(formData.fab?.features || '')}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, fab: { ...(prev.fab || {}), features: e.target.value } }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">产品优势 (Advantages)</p>
            {!isEditing && (
              <div className="min-h-20 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
                {formData.fab?.advantages || '-'}
              </div>
            )}
            {isEditing && (
              <textarea
                value={String(formData.fab?.advantages || '')}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, fab: { ...(prev.fab || {}), advantages: e.target.value } }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">客户利益 (Benefits)</p>
            {!isEditing && (
              <div className="min-h-20 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap">
                {formData.fab?.benefits || '-'}
              </div>
            )}
            {isEditing && (
              <textarea
                value={String(formData.fab?.benefits || '')}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, fab: { ...(prev.fab || {}), benefits: e.target.value } }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">创建时间</p>
            <div className="px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-800">
              {formatCreateDate(formData.createDate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
