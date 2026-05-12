import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Edit2, Plus, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { ProductSpu, ProductSpuOption } from '../types';
import {
  deleteProductSpuFromSupabase,
  fetchBrandsFromSupabase,
  fetchProductCategoryOptionsFromSupabase,
  fetchProductSpuFromSupabase,
  saveProductSpuToSupabase
} from '../lib/productRepository';

type ModalMode = 'view' | 'edit' | 'add' | null;

const formatCreateDate = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptySpu = (): ProductSpu => ({
  id: '',
  name: '',
  productNo: '',
  industry: '',
  ecoProperty: [],
  certificationStandard: [],
  productDrawings: [],
  productImage: '',
  packagingMethod: '',
  minOrderQty: undefined,
  status: 1,
  brandId: '',
  categoryId: '',
  categoryName: '',
  createDate: ''
});

export default function ProductSpuPage() {
  const [spuList, setSpuList] = useState<ProductSpu[]>([]);
  const [brandOptions, setBrandOptions] = useState<ProductSpuOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ProductSpuOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentSpu, setCurrentSpu] = useState<ProductSpu | null>(null);
  const PAGE_SIZE = 20;

  const refreshData = async () => {
    const [spuRows, brands, categories] = await Promise.all([
      fetchProductSpuFromSupabase(),
      fetchBrandsFromSupabase(),
      fetchProductCategoryOptionsFromSupabase()
    ]);
    setSpuList(spuRows || []);
    setBrandOptions(brands || []);
    setCategoryOptions(categories || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Error fetching product spu:', error);
        setSpuList([]);
        setBrandOptions([]);
        setCategoryOptions([]);
        toast.error('加载产品品类失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const brandNameMap = useMemo(() => {
    const map = new Map<string, string>();
    brandOptions.forEach((item) => map.set(String(item.id), item.name || ''));
    return map;
  }, [brandOptions]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categoryOptions.forEach((item) => map.set(String(item.id), item.name || ''));
    return map;
  }, [categoryOptions]);

  const filteredSpuList = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return spuList;
    return spuList.filter((spu) => {
      const brandName = spu.brandId ? (brandNameMap.get(String(spu.brandId)) || '') : '';
      const categoryName = spu.categoryId
        ? (spu.categoryName || categoryNameMap.get(String(spu.categoryId)) || '')
        : '';
      const text = [
        spu.id,
        spu.name,
        spu.productNo,
        spu.industry,
        Array.isArray(spu.ecoProperty) ? spu.ecoProperty.join(' ') : '',
        Array.isArray(spu.certificationStandard) ? spu.certificationStandard.join(' ') : '',
        spu.packagingMethod,
        spu.minOrderQty !== undefined && spu.minOrderQty !== null ? String(spu.minOrderQty) : '',
        spu.status !== undefined && spu.status !== null ? String(spu.status) : '',
        brandName,
        categoryName
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(keyword);
    });
  }, [spuList, searchTerm, brandNameMap, categoryNameMap]);

  const industryOptions = useMemo(() => ([
    '办公设备',
    '工业电气',
    '数码3C',
    '5G',
    '医疗',
    '国防军工',
    '智能家居',
    '航天航空',
    '汽车',
    '新能源',
    '消费电子'
  ]), []);

  const ecoPropertyOptions = useMemo(() => ([
    'RoHS2.0（管控10项）',
    'REACH（管控223项）',
    'SONY,HF(无卤）（管控卤素5项）',
    '加州65'
  ]), []);

  const certificationStandardOptions = useMemo(() => ([
    '美国UL认证',
    '欧盟CE认证',
    '德国VDE认证',
    '加拿大CSA认证',
    '南德TUV认证',
    '莱茵TUV认证',
    '中国3C认证',
    '欧洲ENEC认证',
    '中国质量认证',
    'IEC认证'
  ]), []);

  const totalPages = Math.max(1, Math.ceil(filteredSpuList.length / PAGE_SIZE));
  const pagedSpuList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSpuList.slice(start, start + PAGE_SIZE);
  }, [filteredSpuList, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fields = useMemo(() => [
    {
      key: 'categoryId',
      label: '产品分类',
      type: 'select',
      options: categoryOptions.map((item) => ({ value: String(item.id), label: item.name }))
    },
    {
      key: 'brandId',
      label: '品牌',
      type: 'select',
      options: brandOptions.map((item) => ({ value: String(item.id), label: item.name }))
    },
    { key: 'productNo', label: '产品编号' },
    { key: 'name', label: '品类名称', required: true },
    { key: 'productImage', label: '产品主图', type: 'image' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { value: '1', label: '正常' },
        { value: '0', label: '下架' },
        { value: '10', label: '违规' }
      ]
    },
    {
      key: 'industry',
      label: '所属行业',
      type: 'select',
      options: industryOptions.map((item) => ({ value: item, label: item }))
    },
    {
      key: 'ecoProperty',
      label: '环保性质',
      type: 'multi-select',
      options: ecoPropertyOptions.map((item) => ({ value: item, label: item }))
    },
    { key: 'packagingMethod', label: '包装方式' },
    { key: 'minOrderQty', label: '最小起订量' },
    {
      key: 'certificationStandard',
      label: '认证标准',
      type: 'multi-select',
      options: certificationStandardOptions.map((item) => ({ value: item, label: item }))
    },
    { key: 'productDrawings', label: '产品图纸', type: 'attachments' }
  ], [brandOptions, categoryOptions, industryOptions, ecoPropertyOptions, certificationStandardOptions]);

  const handleAdd = () => {
    setCurrentSpu(createEmptySpu());
    setModalMode('add');
  };

  const handleView = (spu: ProductSpu) => {
    setCurrentSpu({ ...createEmptySpu(), ...spu });
    setModalMode('view');
  };

  const handleEdit = (spu: ProductSpu) => {
    setCurrentSpu({ ...createEmptySpu(), ...spu });
    setModalMode('edit');
  };

  const handleDelete = async (spu: ProductSpu) => {
    if (!spu.id) return;
    if (!window.confirm(`确认删除产品品类 ${spu.id}？`)) return;

    try {
      await deleteProductSpuFromSupabase(spu.id);
      await refreshData();
      toast.success('产品品类删除成功');
    } catch (error) {
      console.error('Error deleting product spu:', error);
      toast.error(`产品品类删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const handleSave = async (payload: any) => {
    const draft = payload as ProductSpu;
    const isNew = modalMode === 'add';
    const name = String(draft.name || '').trim();
    if (!name) {
      toast.error('品类名称不能为空');
      return false;
    }

    const categoryId = String(draft.categoryId || '').trim();
    const categoryName = categoryId ? (categoryNameMap.get(categoryId) || '') : '';
    const normalizedMinOrderQty = (() => {
      const raw = (draft as any).minOrderQty;
      if (raw === undefined || raw === null) return undefined;
      const text = String(raw).trim();
      if (!text) return undefined;
      const num = Number(text);
      return Number.isFinite(num) ? num : undefined;
    })();
    const normalizedStatus = (() => {
      const raw = (draft as any).status;
      const parsed = raw === undefined || raw === null || String(raw).trim() === ''
        ? 1
        : Number.parseInt(String(raw), 10);
      return [0, 1, 10].includes(parsed) ? parsed : 1;
    })();

    try {
      await saveProductSpuToSupabase({
        ...createEmptySpu(),
        ...draft,
        id: isNew ? '' : (currentSpu?.id || draft.id || ''),
        name,
        productNo: String(draft.productNo || '').trim(),
        industry: String(draft.industry || '').trim(),
        ecoProperty: Array.isArray((draft as any).ecoProperty) ? (draft as any).ecoProperty : [],
        certificationStandard: Array.isArray((draft as any).certificationStandard) ? (draft as any).certificationStandard : [],
        productImage: String(draft.productImage || '').trim(),
        status: normalizedStatus,
        packagingMethod: String(draft.packagingMethod || '').trim(),
        minOrderQty: normalizedMinOrderQty,
        productDrawings: Array.isArray(draft.productDrawings) ? draft.productDrawings : [],
        brandId: String(draft.brandId || '').trim(),
        categoryId,
        categoryName
      });
      await refreshData();
      setCurrentPage(1);
      setModalMode(null);
      setCurrentSpu(null);
      toast.success('产品品类保存成功');
      return true;
    } catch (error) {
      console.error('Error saving product spu:', error);
      toast.error(`产品品类保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">产品品类</h2>
          <p className="text-sm text-gray-500 mt-1">基于 ba_spu 管理产品品类基础信息</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索产品编号/品类名称/品牌/分类/行业..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            新增品类
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
          共 {filteredSpuList.length} 条产品品类（每页 {PAGE_SIZE} 条）
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-medium text-gray-500">品类ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">分类</th>
                <th className="p-4 text-sm font-medium text-gray-500">状态</th>
                <th className="p-4 text-sm font-medium text-gray-500">主图</th>
                <th className="p-4 text-sm font-medium text-gray-500">产品编号</th>
                <th className="p-4 text-sm font-medium text-gray-500">品类名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">所属行业</th>
                <th className="p-4 text-sm font-medium text-gray-500">环保性质</th>
                <th className="p-4 text-sm font-medium text-gray-500">包装方式</th>
                <th className="p-4 text-sm font-medium text-gray-500">最小起订量</th>
                <th className="p-4 text-sm font-medium text-gray-500">品牌</th>
                <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && pagedSpuList.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-sm text-gray-400">
                    暂无产品品类数据
                  </td>
                </tr>
              )}
              {pagedSpuList.map((spu) => (
                <tr key={spu.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-indigo-600">{spu.id || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {spu.categoryId ? (spu.categoryName || categoryNameMap.get(String(spu.categoryId)) || '-') : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {spu.status === 0 ? '下架' : spu.status === 10 ? '违规' : '正常'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {spu.productImage ? (
                      <img
                        src={spu.productImage}
                        alt={spu.name || '主图'}
                        className="w-10 h-10 rounded object-cover border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-900">{spu.productNo || '-'}</td>
                  <td className="p-4 text-sm text-gray-900">{spu.name || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">{spu.industry || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {Array.isArray(spu.ecoProperty) && spu.ecoProperty.length ? spu.ecoProperty.join('、') : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{spu.packagingMethod || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {spu.minOrderQty !== undefined && spu.minOrderQty !== null ? String(spu.minOrderQty) : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {spu.brandId ? (brandNameMap.get(String(spu.brandId)) || '-') : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{formatCreateDate(spu.createDate)}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleView(spu)}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(spu)}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(spu)}
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
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
            上一页
          </button>
          <span className="text-sm text-gray-500">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {modalMode === 'view' && currentSpu && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentSpu(null);
          }}
          title="产品品类详情"
          data={currentSpu}
          fields={fields}
          isEditing={false}
          onEdit={() => setModalMode('edit')}
        />
      )}

      {(modalMode === 'edit' || modalMode === 'add') && currentSpu && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentSpu(null);
          }}
          title={modalMode === 'add' ? '新增产品品类' : '编辑产品品类'}
          data={currentSpu}
          fields={fields}
          isEditing={true}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
