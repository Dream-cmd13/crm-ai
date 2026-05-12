import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, FolderTree, Edit2, Trash2, Settings, Users, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import DetailModal from '../components/DetailModal';
import { fetchUsersFromSupabase, fetchDepartmentsFromSupabase, saveUserToSupabase, deleteUserFromSupabase } from '../lib/userRepository';
import { Department } from '../types';

import { confirmDialog } from '../lib/toastConfirm';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedUsers, fetchedDepts] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchDepartmentsFromSupabase()
        ]);
        setUsers(fetchedUsers);
        setDepartments(fetchedDepts);
      } catch (e) {
        console.error('Failed to fetch data', e);
        setUsers([]);
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 构建部门树（将扁平列表转为树结构用于显示）
  const buildDeptTree = (): Department[] => {
    const allDept: Department = { id: 'all', name: '全部部门' };
    return [allDept, ...departments.filter(d => !d.parent_id)];
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || u.name.includes(searchTerm) || u.username.includes(searchTerm);
    const matchesDept = !selectedDepartment || selectedDepartment === 'all' || u.department_id === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const renderDepartmentTree = (depts: any[], level = 0) => {
    return depts.map(dept => (
      <div key={dept.id} className="space-y-1">
        <div 
          className={cn(
            "flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group",
            selectedDepartment === dept.id 
              ? "bg-indigo-50 text-indigo-700 font-medium" 
              : "text-gray-600 hover:bg-gray-50"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setSelectedDepartment(dept.id)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <FolderTree className={cn(
              "w-4 h-4 shrink-0",
              selectedDepartment === dept.id ? "text-indigo-500" : "text-gray-400"
            )} />
            <span className="truncate text-sm">{dept.name}</span>
          </div>
        </div>
        {dept.children && renderDepartmentTree(dept.children, level + 1)}
      </div>
    ));
  };

  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'data'>('users');

  const userFields = [
    { key: 'username', label: '用户名', required: true },
    { key: 'name', label: '姓名', required: true },
    { key: 'employeeNo', label: '工号' },
    { key: 'phone', label: '手机号' },
    { key: 'english_name', label: '英文名' },
    { key: 'role', label: '角色', type: 'select', options: ['Admin', 'User'] },
    { key: 'department_id', label: '部门', type: 'select', options: departments.map(d => ({ value: d.id, label: d.name })) },
    { key: 'wechat_name', label: '微信昵称', placeholder: '员工微信昵称，用于自动匹配' },
  ];

  const handleSaveUser = async (data: any) => {
    try {
      const savedUser = await saveUserToSupabase(data);

      if (editingUser) {
        setUsers(users.map(u => u.id === data.id ? savedUser : u));
      } else {
        setUsers([...users, savedUser]);
      }
      setIsAddingUser(false);
      setEditingUser(null);
      toast.success(editingUser ? '用户更新成功' : '用户创建成功');
    } catch (e) {
      console.error('Failed to save user', e);
      toast.error('保存用户失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!await confirmDialog('确定要删除此用户吗？')) return;
    try {
      await deleteUserFromSupabase(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (e) {
      console.error('Failed to delete user', e);
      toast.error('删除用户失败');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">用户管理</h2>
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索用户..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button 
              onClick={() => {
                setEditingUser(null);
                setIsAddingUser(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              新增用户
            </button>
          </div>
        )}
      </div>

      {/* Right Content - Users List */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Sidebar - Departments */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-sm">组织架构</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {renderDepartmentTree(buildDeptTree())}
          </div>
        </div>

        {/* Right Content - Users List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">姓名</th>
                  <th className="p-4 text-sm font-medium text-gray-500">用户名</th>
                  <th className="p-4 text-sm font-medium text-gray-500">工号</th>
                  <th className="p-4 text-sm font-medium text-gray-500">角色</th>
                  <th className="p-4 text-sm font-medium text-gray-500">部门</th>
                  <th className="p-4 text-sm font-medium text-gray-500">状态</th>
                  <th className="p-4 text-sm font-medium text-gray-500 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> 加载中...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">没有找到用户</td>
                  </tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      {user.english_name && <div className="text-xs text-gray-500">{user.english_name}</div>}
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{user.username}</td>
                    <td className="p-4 text-gray-600 text-sm">{user.employeeNo || user.id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role === 'Admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {departments.find(d => d.id === user.department_id)?.name || user.department_id || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active !== false ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingUser({
                              ...user,
                            });
                            setIsAddingUser(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
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
      </div>

      {(isAddingUser || editingUser) && (
        <DetailModal
          isOpen={true}
          title={editingUser ? "编辑用户" : "新增用户"}
          data={editingUser || { username: '', name: '', role: 'User', department_id: '' }}
          fields={userFields}
          onSave={handleSaveUser}
          onClose={() => {
            setIsAddingUser(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
