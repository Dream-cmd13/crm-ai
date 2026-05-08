import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Edit2, Plus, Trash2, Search } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { ProductLine, User } from '../types';
import {
  deleteProductLineFromSupabase,
  fetchAllProductLinesFromSupabase,
  fetchProductLineListFromSupabase,
  saveProductLineToSupabase
} from '../lib/productRepository';
import { fetchUsersFromSupabase } from '../lib/userRepository';

type ModalMode = 'view' | 'edit' | 'add' | null;
type TreeRow = ProductLine & { level: number };

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const formatCreateDate = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptyProductLine = (): ProductLine => ({
  id: '',
  parentId: null,
  name: '',
  manager: '',
  createDate: '',
  children: []
});

const flattenTree = (nodes: ProductLine[]): TreeRow[] => {
  const result: TreeRow[] = [];
  const walk = (items: ProductLine[], level = 0) => {
    items.forEach((item) => {
      result.push({ ...item, level });
      if (item.children?.length) {
        walk(item.children, level + 1);
      }
    });
  };
  walk(nodes, 0);
  return result;
};

export default function ProductLinesPage() {
  const [lineTree, setLineTree] = useState<ProductLine[]>([]);
  const [allLineOptions, setAllLineOptions] = useState<ProductLine[]>([]);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentLine, setCurrentLine] = useState<ProductLine | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const flatRows = useMemo(() => flattenTree(lineTree), [lineTree]);

  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allLineOptions.forEach((item) => map.set(String(item.id), item.name || ''));
    return map;
  }, [allLineOptions]);

  const userDisplayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    userOptions.forEach((user) => {
      const id = String(user.id || '').trim();
      const name = String(user.name || user.username || '').trim();
      if (!id) return;
      if (name) map.set(id, name);
    });
    return map;
  }, [userOptions]);

  const fields = useMemo(() => [
    { key: 'name', label: '产品线名称', required: true },
    {
      key: 'parentId',
      label: '父级产品线',
      type: 'select',
      options: [
        { value: '', label: '无父级（顶级）' },
        ...allLineOptions.map((item) => ({ value: String(item.id), label: `${item.id} - ${item.name}` }))
      ]
    },
    {
      key: 'manager',
      label: '负责人',
      type: 'select',
      options: [
        { value: '', label: '未指定负责人' },
        ...userOptions
          .map((user) => {
            const value = String(user.name || user.username || '').trim();
            if (!value) return null;
            return {
              value,
              label: value
            };
          })
          .filter((item): item is { value: string; label: string } => Boolean(item))
      ]
    }
  ], [allLineOptions, userOptions]);

  const refreshData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const [pagedResult, allRows, users] = await Promise.all([
      fetchProductLineListFromSupabase(searchTerm, page, pageSize),
      fetchAllProductLinesFromSupabase(),
      fetchUsersFromSupabase()
    ]);
    setLineTree(pagedResult.rows || []);
    setTotal(pagedResult.total || 0);
    setAllLineOptions(allRows || []);
    setUserOptions(users || []);
    setLoading(false);
  };

  useEffect(() => {
    refreshData(true).catch((error) => {
      console.error('Error fetching product line list:', error);
      setLineTree([]);
      setAllLineOptions([]);
      setUserOptions([]);
      setTotal(0);
      setLoading(false);
      toast.error('加载产品线失败');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSearch = async () => {
    try {
      setPage(1);
      const [pagedResult, allRows, users] = await Promise.all([
        fetchProductLineListFromSupabase(searchTerm, 1, pageSize),
        fetchAllProductLinesFromSupabase(),
        fetchUsersFromSupabase()
      ]);
      setLineTree(pagedResult.rows || []);
      setTotal(pagedResult.total || 0);
      setAllLineOptions(allRows || []);
      setUserOptions(users || []);
    } catch (error) {
      console.error('Error searching product line list:', error);
      toast.error('产品线搜索失败');
    }
  };

  const handleAdd = () => {
    setCurrentLine(createEmptyProductLine());
    setModalMode('add');
  };

  const handleView = (row: ProductLine) => {
    setCurrentLine({ ...createEmptyProductLine(), ...row, children: [] });
    setModalMode('view');
  };

  const handleEdit = (row: ProductLine) => {
    setCurrentLine({ ...createEmptyProductLine(), ...row, children: [] });
    setModalMode('edit');
  };

  const handleDelete = async (row: ProductLine) => {
    if (!row.id) return;
    if (!window.confirm(`确认删除产品线 ${row.id}？`)) return;
    try {
      await deleteProductLineFromSupabase(row.id);
      await refreshData();
      toast.success('产品线删除成功');
    } catch (error) {
      console.error('Error deleting product line:', error);
      toast.error(`产品线删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const handleSave = async (payload: any) => {
    const draft = payload as ProductLine;
    const isNew = modalMode === 'add';
    const name = String(draft.name || '').trim();
    if (!name) {
      toast.error('产品线名称不能为空');
      return false;
    }
    const id = isNew ? '' : (currentLine?.id || draft.id || '');
    const parentId = String(draft.parentId || '').trim();
    if (id && parentId && id === parentId) {
      toast.error('父级产品线不能是自己');
      return false;
    }

    try {
      await saveProductLineToSupabase({
        ...createEmptyProductLine(),
        ...draft,
        id,
        parentId: parentId || null,
        name,
        manager: String(draft.manager || '').trim(),
        children: []
      });
      await refreshData();
      setModalMode(null);
      setCurrentLine(null);
      toast.success('产品线保存成功');
      return true;
    } catch (error) {
      console.error('Error saving product line:', error);
      toast.error(`产品线保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">产品线</h2>
          <p className="text-sm text-gray-500 mt-1">基于 ba_product_line 管理产品线层级结构</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新增产品线
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">共 {total} 条产品线数据</div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="按产品线名称搜索"
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              搜索
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-medium text-gray-500">产品线名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">产品线ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">父级产品线</th>
                <th className="p-4 text-sm font-medium text-gray-500">负责人</th>
                <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && flatRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                    暂无产品线数据
                  </td>
                </tr>
              )}
              {flatRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-900">
                    <div className="flex items-center" style={{ paddingLeft: `${row.level * 20}px` }}>
                      {row.level > 0 ? <span className="text-gray-300 mr-2">└</span> : null}
                      <span>{row.name || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-indigo-600">{row.id || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {row.parentId ? `${row.parentId} - ${parentNameMap.get(String(row.parentId)) || '-'}` : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{row.manager ? (userDisplayNameMap.get(String(row.manager)) || row.manager) : '-'}</td>
                  <td className="p-4 text-sm text-gray-500">{formatCreateDate(row.createDate)}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleView(row)}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
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
        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {Math.min(page, totalPages)} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {modalMode === 'view' && currentLine && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentLine(null);
          }}
          title="产品线详情"
          data={currentLine}
          fields={fields}
          isEditing={false}
          onEdit={() => setModalMode('edit')}
        />
      )}

      {(modalMode === 'edit' || modalMode === 'add') && currentLine && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentLine(null);
          }}
          title={modalMode === 'add' ? '新增产品线' : '编辑产品线'}
          data={currentLine}
          fields={fields}
          isEditing={true}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
