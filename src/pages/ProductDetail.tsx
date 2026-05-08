import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronRight, Edit2, Loader2, Save, X } from 'lucide-react';
import { CategoryAttribute, Product, ProductCategory, ProductLine, ProductSeries } from '../types';
import {
  fetchAllProductLinesFromSupabase,
  fetchProductByIdFromSupabase,
  fetchProductCategoriesFromSupabase,
  fetchProductSeriesFromSupabase,
  saveProductToSupabase
} from '../lib/productRepository';

interface ProductDetailProps {
  viewParams?: any;
  goBack?: () => void;
}

type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'textarea';
type TabKey =
  | 'basic'
  | 'discount'
  | 'supplierDrawing'
  | 'drawing3d'
  | 'spec'
  | 'matching'
  | 'drawingRecord'
  | 'specRecord'
  | 'inspection';

type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  options?: Array<{ value: string; label: string }>;
};

const TAB_LIST: Array<{ key: TabKey; label: string }> = [
  { key: 'basic', label: '基本信息' },
  { key: 'discount', label: '价格信息' },
  { key: 'supplierDrawing', label: '外发供应商图纸' },
  { key: 'drawing3d', label: '3D' },
  { key: 'spec', label: '规格' },
  { key: 'matching', label: '相似/配套' },
  { key: 'drawingRecord', label: '图纸记录' },
  { key: 'specRecord', label: '规格书记录' },
  { key: 'inspection', label: '检验基准书' }
];

const toInputValue = (value: any) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const formatBool = (value: any) => (value ? '是' : '否');
const getNestedValue = (obj: any, path: string) => path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const setNestedValue = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  const next = { ...(obj || {}) };
  let cursor: any = next;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    cursor[key] = typeof cursor[key] === 'object' && cursor[key] !== null ? { ...cursor[key] } : {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
};

export default function ProductDetail({ viewParams, goBack }: ProductDetailProps) {
  const productId = String(viewParams?.id || '').trim();
  const initialEdit = String(viewParams?.mode || '').toLowerCase() === 'edit';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(initialEdit);
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  useEffect(() => {
    setIsEditing(initialEdit);
  }, [initialEdit, productId]);

  useEffect(() => {
    const load = async () => {
      if (!productId) {
        toast.error('缺少产品 ID，无法打开详情');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [detail, categoryTree, seriesRows, productLineRows] = await Promise.all([
          fetchProductByIdFromSupabase(productId),
          fetchProductCategoriesFromSupabase(),
          fetchProductSeriesFromSupabase(),
          fetchAllProductLinesFromSupabase()
        ]);
        setCategories(categoryTree || []);
        setSeriesList(seriesRows || []);
        setProductLines(productLineRows || []);
        if (!detail) {
          setProduct(null);
          setFormData(null);
          return;
        }
        setProduct(detail);
        setFormData(detail);
      } catch (error) {
        console.error('Error loading product detail:', error);
        toast.error(`加载产品详情失败：${(error as Error)?.message || '请稍后重试'}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  const flatCategoryOptions = useMemo(() => {
    const result: ProductCategory[] = [];
    const walk = (nodes: ProductCategory[]) => {
      nodes.forEach((node) => {
        result.push(node);
        if (node.children?.length) walk(node.children);
      });
    };
    walk(categories);
    return result.map((c) => ({ value: c.id, label: `${c.id} - ${c.name}` }));
  }, [categories]);

  const getCategoryAttributes = (categoryId: string): CategoryAttribute[] => {
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
    const category = findCategory(categories, categoryId);
    return category?.attributes || [];
  };

  const specAttributeFields = useMemo(() => {
    const categoryId = String(getNestedValue(formData || {}, 'categoryId') || '');
    if (!categoryId) return [] as FieldDef[];
    return getCategoryAttributes(categoryId).map((attr) => ({
      key: `attributes.${attr.id}`,
      label: attr.name,
      type: (attr.type === 'enum' ? 'select' : attr.type) as FieldType,
      options: (attr.options || []).map((opt) => ({ value: opt, label: opt }))
    }));
  }, [formData, categories]);

  const boolOptions = useMemo(
    () => [
      { value: 'true', label: '是' },
      { value: 'false', label: '否' }
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: '1', label: '启用' },
      { value: '0', label: '禁用' }
    ],
    []
  );

  const seriesOptions = useMemo(
    () => seriesList.map((s) => ({ value: s.id, label: `${s.seriesNo || s.id} - ${s.name}` })),
    [seriesList]
  );
  const productLineOptions = useMemo(
    () => productLines.map((line) => ({ value: String(line.id), label: line.name || String(line.id) })),
    [productLines]
  );
  const productLineNameMap = useMemo(() => {
    const map = new Map<string, string>();
    productLines.forEach((line) => map.set(String(line.id), line.name || String(line.id)));
    return map;
  }, [productLines]);

  const fieldsByTab = useMemo<Record<TabKey, FieldDef[]>>(
    () => ({
      basic: [
        { key: 'materialNo', label: '万连物料号' },
        { key: 'supplierMaterialNo', label: '供应商料号' },
        { key: 'platformMaterialNo', label: '品料编号' },
        { key: 'materialName', label: '分类名称' },
        { key: 'spuName', label: '品类' },
        { key: 'price', label: '面价', type: 'number' },
        { key: 'materialLeadTime', label: '交期（天）', type: 'number' },
        { key: 'minOrderQty', label: '最大订货量', type: 'number' },
        { key: 'isPurchasable', label: '是否可试样', type: 'boolean' },
        { key: 'isSalable', label: '是否可讲价', type: 'boolean' },
        { key: 'isStorable', label: '是否有库存', type: 'boolean' },
        { key: 'status', label: '状态', type: 'select', options: statusOptions },
        { key: 'createDate', label: '创建时间' },
        { key: 'packagingMethod', label: '质检方式' },
        { key: 'brandName', label: '品牌' },
        { key: 'supplierNo', label: '供应商编号' },
        { key: 'supplier', label: '供应商名称' },
        { key: 'groupName', label: '归属小组' },
        { key: 'productLineLevel1Id', label: '一级产品线', type: 'select', options: productLineOptions },
        { key: 'productLineLevel2Id', label: '二级产品线', type: 'select', options: productLineOptions },
        { key: 'categoryId', label: '分类 Id', type: 'select', options: flatCategoryOptions },
        { key: 'seriesId', label: '系列', type: 'select', options: seriesOptions },
        { key: 'basicUnit', label: '单位' },
        { key: 'materialAttribute', label: '料号属性' }
      ],
      discount: [
        { key: 'price', label: '基准价格', type: 'number' },
        { key: 'minPrice', label: '最低价格', type: 'number' },
        { key: 'minPackQty', label: '最小包装量', type: 'number' },
        { key: 'minOrderQty', label: '最小起订量', type: 'number' }
      ],
      supplierDrawing: [
        { key: 'outsourceSupplierDrawing', label: '外发供应商图纸', type: 'textarea' },
        { key: 'supplierMaterialName', label: '供应商物料名称' },
        { key: 'supplierMaterialNo', label: '供应商物料号' },
        { key: 'supplier', label: '供应商' }
      ],
      drawing3d: [{ key: 'drawing3d', label: '3D 图纸', type: 'textarea' }],
      spec: [
        { key: 'specification', label: '规格', type: 'textarea' },
        { key: 'packagingSpec', label: '包装规格', type: 'textarea' },
        ...specAttributeFields
      ],
      matching: [
        { key: 'attributes.similarProducts', label: '相似产品', type: 'textarea' },
        { key: 'attributes.matchingProducts', label: '配套产品', type: 'textarea' },
        { key: 'attributes.notes', label: '备注', type: 'textarea' }
      ],
      drawingRecord: [
        { key: 'customerOriginalDrawing', label: '客户原图纸档', type: 'textarea' },
        { key: 'outsourceCustomerDrawing', label: '实物是否图纸档', type: 'textarea' },
        { key: 'changeDrawingDetail', label: '图纸变更记录', type: 'textarea' }
      ],
      specRecord: [{ key: 'specificationDoc', label: '规格书记录', type: 'textarea' }],
      inspection: [{ key: 'inspectionStandard', label: '检验基准书', type: 'textarea' }]
    }),
    [flatCategoryOptions, productLineOptions, seriesOptions, specAttributeFields, statusOptions]
  );

  const summaryFields: FieldDef[] = [
    { key: 'materialNo', label: '万连物料号' },
    { key: 'supplierMaterialNo', label: '供应商料号' },
    { key: 'platformMaterialNo', label: '品料编号' },
    { key: 'materialName', label: '分类名称' },
    { key: 'spuName', label: '品类' },
    { key: 'price', label: '面价' },
    { key: 'isStorable', label: '库存', type: 'boolean' },
    { key: 'minOrderQty', label: '最大订货量', type: 'number' },
    { key: 'isPurchasable', label: '是否可试样', type: 'boolean' },
    { key: 'isSalable', label: '是否上架', type: 'boolean' },
    { key: 'createDate', label: '创建时间' }
  ];

  const titleName = (formData?.materialName || product?.materialName || product?.materialNo || '').trim() || '产品详情';
  const currentFields = fieldsByTab[activeTab] || [];

  const handleChange = (field: FieldDef, rawValue: any) => {
    const value =
      field.type === 'number' ? (rawValue === '' ? '' : Number(rawValue)) : field.type === 'boolean' ? Boolean(rawValue) : rawValue;
    setFormData((prev: any) => setNestedValue(prev || {}, field.key, value));
  };

  const renderDisplayValue = (field: FieldDef) => {
    const value = getNestedValue(formData, field.key);
    if (field.key === 'productLineLevel1Id' || field.key === 'productLineLevel2Id') {
      const key = String(value || '');
      return productLineNameMap.get(key) || key || '--';
    }
    if (field.type === 'boolean') return formatBool(value);
    return toInputValue(value) || '--';
  };

  const renderEditor = (field: FieldDef) => {
    const value = getNestedValue(formData, field.key);
    if (field.type === 'textarea') {
      return (
        <textarea
          value={toInputValue(value)}
          onChange={(e) => handleChange(field, e.target.value)}
          rows={3}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
    }
    if (field.type === 'select') {
      return (
        <select
          value={toInputValue(value)}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">请选择</option>
          {(field.options || []).map((opt) => (
            <option key={`${field.key}-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'boolean') {
      return (
        <select
          value={String(Boolean(value))}
          onChange={(e) => handleChange(field, e.target.value === 'true')}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {boolOptions.map((opt) => (
            <option key={`${field.key}-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={toInputValue(value)}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  };

  const handleSave = async () => {
    if (!product || !formData) return;
    const materialNo = String(formData.materialNo || '').trim();
    const materialName = String(formData.materialName || '').trim();
    const categoryId = String(formData.categoryId || '').trim();
    const basicUnit = String(formData.basicUnit || '').trim();
    if (!materialNo || !materialName || !categoryId || !basicUnit) {
      toast.error('请先填写必填字段：万连物料号、总类名、分类 Id、单位');
      return;
    }
    try {
      setSaving(true);
      const payload: Product = {
        ...product,
        ...formData,
        id: product.id,
        materialNo,
        materialName,
        categoryId,
        basicUnit
      };
      const saved = await saveProductToSupabase(payload);
      setProduct(saved as Product);
      setFormData(saved);
      setIsEditing(false);
      toast.success('产品保存成功');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(`产品保存失败：${(error as Error)?.message || '请稍后重试'}`);
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

  if (!product || !formData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">未找到对应产品记录。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => goBack?.()} className="text-gray-500 hover:text-gray-900 font-medium">
            产品资料
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-bold">{titleName}</span>
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
                  setFormData(product);
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-x-6 gap-y-2">
          {summaryFields.map((field) => (
            <div key={field.key} className="min-w-[110px]">
              <p className="text-xs text-gray-500">{field.label}</p>
              <p className="text-sm font-semibold text-gray-900 break-all">{renderDisplayValue(field)}</p>
            </div>
          ))}
        </div>

        <div className="px-2 border-b border-gray-100 overflow-x-auto">
          <div className="flex min-w-max">
            {TAB_LIST.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-sm border-b-2 ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          {currentFields.length === 0 && <p className="text-sm text-gray-400">当前标签暂无可展示字段</p>}
          {currentFields.length > 0 && (
            <div className="min-w-[900px] border border-gray-100 rounded">
              {Array.from({ length: Math.ceil(currentFields.length / 2) }).map((_, rowIndex) => {
                const left = currentFields[rowIndex * 2];
                const right = currentFields[rowIndex * 2 + 1];
                return (
                  <div key={`row-${rowIndex}`} className="grid grid-cols-4 border-b border-gray-100 last:border-b-0">
                    <div className="px-3 py-2 text-sm bg-gray-50 text-gray-600 border-r border-gray-100">{left?.label || ''}</div>
                    <div className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100">
                      {left ? (isEditing ? renderEditor(left) : <span className="whitespace-pre-wrap break-all">{renderDisplayValue(left)}</span>) : '--'}
                    </div>
                    <div className="px-3 py-2 text-sm bg-gray-50 text-gray-600 border-r border-gray-100">{right?.label || ''}</div>
                    <div className="px-3 py-2 text-sm text-gray-900">
                      {right ? (isEditing ? renderEditor(right) : <span className="whitespace-pre-wrap break-all">{renderDisplayValue(right)}</span>) : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
