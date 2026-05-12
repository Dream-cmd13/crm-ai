import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Edit2, Eye, Plus, Search, Trash2 } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { PublicPropertyName, PublicPropertyValue } from '../types';
import {
  deletePublicPropertyValueFromSupabase,
  fetchPublicPropertyNamesFromSupabase,
  fetchPublicPropertyValueListFromSupabase,
  savePublicPropertyValueToSupabase
} from '../lib/productRepository';

type ModalMode = 'view' | 'edit' | 'add' | null;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const formatDateTime = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptyValue = (): PublicPropertyValue => ({
  id: '',
  propertyId: '',
  propertyValue: '',
  propertyValueImage: '',
  publicPropertyName: '',
  createDate: '',
  updateDate: ''
});

export default function ProductSpecsPage() {
  const [groups, setGroups] = useState<PublicPropertyName[]>([]);
  const [groupKeyword, setGroupKeyword] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const [rows, setRows] = useState<PublicPropertyValue[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingValues, setLoadingValues] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentRow, setCurrentRow] = useState<PublicPropertyValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicPropertyValue | null>(null);
  const [deletingId, setDeletingId] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => String(g.id) === String(selectedGroupId)) || null;
  }, [groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const kw = groupKeyword.trim().toLowerCase();
    if (!kw) return groups;
    return groups.filter((g) => {
      const text = [g.id, g.specificationName, g.groupName].filter(Boolean).join(' ').toLowerCase();
      return text.includes(kw);
    });
  }, [groups, groupKeyword]);

  const valueFields = useMemo(() => [
    { key: 'propertyValue', label: '规格值', required: true },
    { key: 'propertyValueImage', label: '图片', type: 'image' }
  ], []);

  const refreshGroups = async () => {
    setLoadingGroups(true);
    const list = await fetchPublicPropertyNamesFromSupabase();
    setGroups(list || []);
    setLoadingGroups(false);
    return list || [];
  };

  const refreshValues = async (propertyId: string, override?: Partial<{ keyword: string; page: number; pageSize: number }>) => {
    setLoadingValues(true);
    const nextKeyword = override?.keyword ?? keyword;
    const nextPage = override?.page ?? page;
    const nextPageSize = override?.pageSize ?? pageSize;

    const result = await fetchPublicPropertyValueListFromSupabase({
      propertyId,
      keyword: nextKeyword,
      page: nextPage,
      pageSize: nextPageSize
    });
    setRows(result.rows || []);
    setTotal(result.total || 0);
    setLoadingValues(false);
  };

  useEffect(() => {
    refreshGroups()
      .then((list) => {
        const first = list.find((g) => String(g.id || '').trim());
        if (first?.id) {
          setSelectedGroupId(String(first.id));
        }
      })
      .catch((error) => {
        console.error('Error fetching spec groups:', error);
        setGroups([]);
        setLoadingGroups(false);
        toast.error('加载规格组失败');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setRows([]);
      setTotal(0);
      setLoadingValues(false);
      return;
    }
    refreshValues(selectedGroupId).catch((error) => {
      console.error('Error fetching spec values:', error);
      setRows([]);
      setTotal(0);
      setLoadingValues(false);
      toast.error('加载规格值失败');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, page, pageSize]);

  const handleSelectGroup = (id: string) => {
    setSelectedGroupId(String(id || ''));
    setKeyword('');
    setPage(1);
  };

  const handleSearchValues = async () => {
    if (!selectedGroupId) {
      toast.error('请先选择左侧规格组');
      return;
    }
    setPage(1);
    try {
      await refreshValues(selectedGroupId, { page: 1 });
    } catch (error) {
      console.error('Error searching values:', error);
      toast.error('搜索失败');
    }
  };

  const handleClearValues = async () => {
    if (!selectedGroupId) return;
    setKeyword('');
    setPage(1);
    try {
      await refreshValues(selectedGroupId, { keyword: '', page: 1 });
    } catch (error) {
      console.error('Error clearing value filters:', error);
      toast.error('刷新失败');
    }
  };

  const openAdd = () => {
    if (!selectedGroup) {
      toast.error('请先选择左侧规格组');
      return;
    }
    setCurrentRow({
      ...createEmptyValue(),
      propertyId: String(selectedGroup.id),
      publicPropertyName: String(selectedGroup.specificationName || '').trim()
    });
    setModalMode('add');
  };

  const openView = (row: PublicPropertyValue) => {
    setCurrentRow({ ...createEmptyValue(), ...row });
    setModalMode('view');
  };

  const openEdit = (row: PublicPropertyValue) => {
    setCurrentRow({ ...createEmptyValue(), ...row });
    setModalMode('edit');
  };

  const handleDelete = async (row: PublicPropertyValue) => {
    setDeleteTarget(row);
  };

  const handleConfirmDelete = async () => {
    const row = deleteTarget;
    if (!row?.id) return;
    const shouldFallbackPage = page > 1 && rows.length <= 1;
    try {
      setDeletingId(row.id);
      await deletePublicPropertyValueFromSupabase(row.id);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteTarget(null);
      if (shouldFallbackPage) {
        setPage((prev) => Math.max(1, prev - 1));
      }
      toast.success('删除成功');
    } catch (error) {
      console.error('Error deleting spec value:', error);
      toast.error(`删除失败：${(error as Error)?.message || '请稍后重试'}`);
    } finally {
      setDeletingId('');
    }
  };

  const handleSave = async (payload: any) => {
    if (!selectedGroup) {
      toast.error('请先选择左侧规格组');
      return false;
    }
    const draft = payload as PublicPropertyValue;
    const isNew = modalMode === 'add';
    const propertyValue = String(draft.propertyValue || '').trim();
    if (!propertyValue) {
      toast.error('规格值不能为空');
      return false;
    }

    try {
      await savePublicPropertyValueToSupabase({
        ...createEmptyValue(),
        ...draft,
        id: isNew ? '' : (currentRow?.id || draft.id || ''),
        propertyId: String(selectedGroup.id),
        publicPropertyName: String(selectedGroup.specificationName || '').trim(),
        propertyValue,
        propertyValueImage: String(draft.propertyValueImage || '').trim()
      });
      if (selectedGroupId) await refreshValues(selectedGroupId);
      setModalMode(null);
      setCurrentRow(null);
      toast.success('保存成功');
      return true;
    } catch (error) {
      console.error('Error saving spec value:', error);
      toast.error(`保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">产品规格</h2>
          <p className="text-sm text-gray-500 mt-1">左侧选择规格组，右侧维护规格值（public_property_value）</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={!selectedGroup}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          新增规格值
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-bold text-gray-900 mb-2">规格组</div>
            <input
              type="text"
              value={groupKeyword}
              onChange={(e) => setGroupKeyword(e.target.value)}
              placeholder="输入名称检索"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loadingGroups && (
              <div className="p-4 text-sm text-gray-500">加载中...</div>
            )}
            {!loadingGroups && filteredGroups.length === 0 && (
              <div className="p-4 text-sm text-gray-400">暂无规格组</div>
            )}
            {filteredGroups.map((g) => {
              const active = String(g.id) === String(selectedGroupId);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectGroup(g.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 ${active ? 'bg-indigo-50' : ''}`}
                >
                  <div className={`text-sm font-medium ${active ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {g.specificationName || '-'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {g.groupName || '-'} · ID {g.id || '-'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-9 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-500">
              {selectedGroup ? (
                <>当前规格组：<span className="text-gray-900 font-medium">{selectedGroup.specificationName}</span>（共 {total} 条规格值）</>
              ) : (
                <>请先选择左侧规格组</>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchValues();
                }}
                placeholder="规格值"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSearchValues}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <Search className="w-4 h-4" />
                搜索
              </button>
              <button
                type="button"
                onClick={handleClearValues}
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
                  <th className="p-4 text-sm font-medium text-gray-500">规格值</th>
                  <th className="p-4 text-sm font-medium text-gray-500">图片</th>
                  <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                  <th className="p-4 text-sm font-medium text-gray-500">更新时间</th>
                  <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {!loadingValues && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                      暂无规格值数据
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-sm text-indigo-600">{row.id || '-'}</td>
                    <td className="p-4 text-sm text-gray-900">{row.propertyValue || '-'}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {row.propertyValueImage ? (
                        <img src={row.propertyValueImage} alt={row.propertyValue || 'value'} className="w-10 h-10 object-cover rounded border border-gray-200" />
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
                          onClick={() => openView(row)}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                        >
                          <Eye className="w-4 h-4" />
                          查看
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
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
      </div>

      {(modalMode === 'add' || modalMode === 'edit' || modalMode === 'view') && currentRow && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentRow(null);
          }}
          title={modalMode === 'add' ? '新增规格值' : modalMode === 'edit' ? '编辑规格值' : '查看规格值'}
          data={currentRow}
          fields={valueFields}
          isEditing={modalMode === 'add' || modalMode === 'edit'}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">确认删除</h3>
              <p className="mt-1 text-sm text-gray-500">
                确认删除规格值“{deleteTarget.propertyValue || deleteTarget.id}”吗？删除后不可恢复。
              </p>
            </div>
            <div className="flex justify-end gap-3 bg-gray-50 px-6 py-4">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={deletingId === deleteTarget.id}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === deleteTarget.id ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
