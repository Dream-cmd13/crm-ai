import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, Edit2, Plus, Trash2, Search } from 'lucide-react';
import DetailModal from '../components/DetailModal';
import { Group } from '../types';
import { deleteGroupFromSupabase, fetchGroupListFromSupabase, saveGroupToSupabase } from '../lib/productRepository';

type ModalMode = 'view' | 'edit' | 'add' | null;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const formatCreateDate = (raw?: string) => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptyGroup = (): Group => ({
  id: '',
  name: '',
  manager: '',
  createDate: ''
});

export default function GroupsPage() {
  const [groupList, setGroupList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fields = useMemo(() => [
    { key: 'name', label: '小组名称', required: true },
    { key: 'manager', label: '负责人' }
  ], []);

  const refreshData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const result = await fetchGroupListFromSupabase(searchTerm, page, pageSize);
    setGroupList(result.rows || []);
    setTotal(result.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    refreshData(true).catch((error) => {
      console.error('Error fetching group list:', error);
      setGroupList([]);
      setTotal(0);
      setLoading(false);
      toast.error('加载归属小组失败');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleSearch = async () => {
    try {
      setPage(1);
      const result = await fetchGroupListFromSupabase(searchTerm, 1, pageSize);
      setGroupList(result.rows || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Error searching group list:', error);
      toast.error('归属小组搜索失败');
    }
  };

  const handleAdd = () => {
    setCurrentGroup(createEmptyGroup());
    setModalMode('add');
  };

  const handleView = (row: Group) => {
    setCurrentGroup({ ...createEmptyGroup(), ...row });
    setModalMode('view');
  };

  const handleEdit = (row: Group) => {
    setCurrentGroup({ ...createEmptyGroup(), ...row });
    setModalMode('edit');
  };

  const handleDelete = async (row: Group) => {
    if (!row.id) return;
    if (!window.confirm(`确认删除归属小组 ${row.id}？`)) return;
    try {
      await deleteGroupFromSupabase(row.id);
      await refreshData();
      toast.success('归属小组删除成功');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(`归属小组删除失败：${(error as Error)?.message || '请稍后重试'}`);
    }
  };

  const handleSave = async (payload: any) => {
    const draft = payload as Group;
    const isNew = modalMode === 'add';
    const name = String(draft.name || '').trim();
    if (!name) {
      toast.error('小组名称不能为空');
      return false;
    }

    try {
      await saveGroupToSupabase({
        ...createEmptyGroup(),
        ...draft,
        id: isNew ? '' : (currentGroup?.id || draft.id || ''),
        name,
        manager: String(draft.manager || '').trim()
      });
      await refreshData();
      setModalMode(null);
      setCurrentGroup(null);
      toast.success('归属小组保存成功');
      return true;
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error(`归属小组保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">归属小组</h2>
          <p className="text-sm text-gray-500 mt-1">基于 ba_group 管理归属小组信息</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新增小组
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">共 {total} 条归属小组数据</div>
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
                placeholder="按小组名称搜索"
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
                <th className="p-4 text-sm font-medium text-gray-500">小组名称</th>
                <th className="p-4 text-sm font-medium text-gray-500">小组ID</th>
                <th className="p-4 text-sm font-medium text-gray-500">负责人</th>
                <th className="p-4 text-sm font-medium text-gray-500">创建时间</th>
                <th className="p-4 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && groupList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-400">
                    暂无归属小组数据
                  </td>
                </tr>
              )}
              {groupList.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-900">{row.name || '-'}</td>
                  <td className="p-4 text-sm text-indigo-600">{row.id || '-'}</td>
                  <td className="p-4 text-sm text-gray-500">{row.manager || '-'}</td>
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

      {modalMode === 'view' && currentGroup && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentGroup(null);
          }}
          title="归属小组详情"
          data={currentGroup}
          fields={fields}
          isEditing={false}
          onEdit={() => setModalMode('edit')}
        />
      )}

      {(modalMode === 'edit' || modalMode === 'add') && currentGroup && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setCurrentGroup(null);
          }}
          title={modalMode === 'add' ? '新增归属小组' : '编辑归属小组'}
          data={currentGroup}
          fields={fields}
          isEditing={true}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
