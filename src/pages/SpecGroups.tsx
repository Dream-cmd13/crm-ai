import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { PublicPropertyName } from '../types';
import { deletePublicPropertyNameFromSupabase, fetchPublicPropertyNameListFromSupabase, savePublicPropertyNameToSupabase } from '../lib/productRepository';
import { confirmDialog } from '../lib/toastConfirm';

type ModalMode = 'view' | 'edit' | 'add' | null;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const formatDateTime = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptyRow = (): PublicPropertyName => ({
  id: '',
  specificationName: '',
  groupName: '',
  image: '',
  isSearchable: 1,
  createDate: '',
  updateDate: ''
});

export default function SpecGroupsPage() {
  const [rows, setRows] = useState<PublicPropertyName[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isSearchable, setIsSearchable] = useState<string>('all');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentRow, setCurrentRow] = useState<PublicPropertyName | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fields = useMemo(() => [
    { key: 'specificationName', label: '规格名称', required: true },
    { key: 'groupName', label: '分组名称' },
    { key: 'image', label: '图片', placeholder: '请输入图片 URL' },
    {
      key: 'isSearchable',
      label: '是否参与搜索',
      type: 'select',
      options: [
        { value: '1', label: '是' },
        { value: '0', label: '否' }
      ]
    }
  ], []);

  const refreshData = async (showLoading = false, override?: Partial<{
    keyword: string;
    groupName: string;
    isSearchable: string;
    page: number;
    pageSize: number;
  }>) => {
    if (showLoading) setLoading(true);
    const nextKeyword = override?.keyword ?? keyword;
    const nextGroupName = override?.groupName ?? groupName;
    const nextIsSearchable = override?.isSearchable ?? isSearchable;
    const nextPage = override?.page ?? page;
    const nextPageSize = override?.pageSize ?? pageSize;

    const result = await fetchPublicPropertyNameListFromSupabase({
      keyword: nextKeyword,
      groupName: nextGroupName,
      isSearchable: nextIsSearchable === '0' || nextIsSearchable === '1' ? Number(nextIsSearchable) : null,
      page: nextPage,
      pageSize: nextPageSize
    });
    setRows(result.rows || []);
    setTotal(result.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    refreshData(true).catch((error) => {
      console.error('Error fetching spec groups:', error);
      setRows([]);
      setTotal(0);
      setLoading(false);
      toast.error('加载规格组失败');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSearch = async () => {
    try {
      setPage(1);
      await refreshData(true, { page: 1 });
    } catch (error) {
      console.error('Error searching spec groups:', error);
      toast.error('搜索失败');
    }
  };

  const handleClear = async () => {
    setKeyword('');
    setGroupName('');
    setIsSearchable('all');
    setPage(1);
    try {
      await refreshData(true, { keyword: '', groupName: '', isSearchable: 'all', page: 1 });
    } catch (error) {
      console.error('Error clearing spec group filters:', error);
      toast.error('刷新失败');
    }
  };

  const handleAdd = () => {
    setCurrentRow(createEmptyRow());
    setModalMode('add');
  };

  const handleView = (row: PublicPropertyName) => {
    setCurrentRow({ ...createEmptyRow(), ...row });
    setModalMode('view');
  };

  const handleEdit = (row: PublicPropertyName) => {
    setCurrentRow({ ...createEmptyRow(), ...row });
    setModalMode('edit');
  };

  const handleDelete = async (row: PublicPropertyName) => {
    if (!row.id) return;
    if (!(await confirmDialog(`确认删除规格组 ${row.id}？`))) return;
    try {
      await deletePublicPropertyNameFromSupabase(row.id);
      await refreshData(true);
      toast.success('删除成功');
    } catch (error) {
      console.error('Error deleting spec group:', error);
      toast.error(`删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const handleSave = async (payload: any) => {
    const draft = payload as PublicPropertyName;
    const isNew = modalMode === 'add';
    const specificationName = String(draft.specificationName || '').trim();
    if (!specificationName) {
      toast.error('规格名称不能为空');
      return false;
    }
    const parsedIsSearchable = Number.parseInt(String(draft.isSearchable ?? 1), 10);

    try {
      await savePublicPropertyNameToSupabase({
        ...createEmptyRow(),
        ...draft,
        id: isNew ? '' : (currentRow?.id || draft.id || ''),
        specificationName,
        groupName: String(draft.groupName || '').trim(),
        image: String(draft.image || '').trim(),
        isSearchable: Number.isNaN(parsedIsSearchable) ? 1 : parsedIsSearchable
      });
      await refreshData(true);
      setModalMode(null);
      setCurrentRow(null);
      toast.success('保存成功');
      return true;
    } catch (error) {
      console.error('Error saving spec group:', error);
      toast.error(`保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">规格组</h2>
          <p className="text-sm text-gray-500 mt-1">基于 public_property_name 管理公共规格属性</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新增
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="text-sm text-gray-500">共 {total} 条</div>
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="规格名称"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={isSearchable}
              onChange={(e) => setIsSearchable(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">状态：全部</option>
              <option value="1">参与搜索</option>
              <option value="0">不参与搜索</option>
            </select>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="分组名称"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              清空筛选
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-medium text-gray-500">ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">规格名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">分组名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">状态</th>
                <th className="p-4 text-sm font-medium text-gray-500">图片</th>
                <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">更新时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-400">
                    暂无数据
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-indigo-600">{row.id || '-'}</td>
                  <td className="p-4 text-sm text-gray-900">{row.specificationName || '-'}</td>
                  <td className="p-4 text-sm text-gray-700">{row.groupName || '-'}</td>
                  <td className="p-4 text-sm">
                    {Number(row.isSearchable ?? 1) === 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">不参与搜索</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">参与搜索</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {row.image ? (
                      <img src={row.image} alt={row.specificationName || 'spec'} className="w-10 h-10 object-cover rounded border border-gray-200" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500">{formatDateTime(row.createDate)}</td>
                  <td className="p-4 text-sm text-gray-500">{formatDateTime(row.updateDate)}</td>
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

        <div className="px-4 py-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
          <div className="text-gray-500">
            第 {page} / {totalPages} 页
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                setPageSize(Number.isFinite(next) ? next : 20);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / 页
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(modalMode === 'add' || modalMode === 'edit' || modalMode === 'view') && currentRow && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentRow(null);
          }}
          title={modalMode === 'add' ? '新增规格组' : modalMode === 'edit' ? '编辑规格组' : '查看规格组'}
          data={currentRow}
          fields={fields}
          isEditing={modalMode === 'add' || modalMode === 'edit'}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
