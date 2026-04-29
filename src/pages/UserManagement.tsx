import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, FolderTree, Edit2, Trash2, Settings, Users, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import DetailModal from '../components/DetailModal';
import { fetchUsersFromSupabase, saveUserToSupabase, deleteUserFromSupabase } from '../lib/userRepository';

import { confirmDialog } from '../lib/toastConfirm';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetched = await fetchUsersFromSupabase();
        setUsers(fetched);
      } catch (e) {
        console.error('Failed to fetch users', e);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const departments = [
    { id: 'all', name: '全部部门' },
    { id: 'sales', name: '销售部', children: [
      { id: 'sales-1', name: '销售一部' },
      { id: 'sales-2', name: '销售二部' }
    ]},
    { id: 'marketing', name: '市场部' },
    { id: 'tech', name: '技术部' },
    { id: 'admin', name: '行政部' }
  ];

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.includes(searchTerm) || u.username.includes(searchTerm);
    const matchesDept = selectedDepartment === 'all' || u.department_id === selectedDepartment || 
      (selectedDepartment === 'sales' && u.department_id?.startsWith('sales'));
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
    { key: 'name', label: '姓名', required: true },
    { key: 'username', label: '用户名', required: true },
    { key: 'roles', label: '角色', type: 'multi-select', options: ['管理员', '业务员', '经理', '财务', '供应链'] },
    { key: 'department_id', label: '部门', type: 'select', options: ['sales', 'sales-1', 'sales-2', 'marketing', 'tech', 'admin'] },
  ];

  const handleSaveUser = async (data: any) => {
    try {
      const updatedData = {
        ...data,
        role: data.roles?.[0] || '业务员',
        dataPermissions: {
          customerVisibility: data.customerVisibility === '全部' ? 'all' : 
                             data.customerVisibility === '本部门' ? 'department' :
                             data.customerVisibility === '本人' ? 'own' : 'custom'
        }
      };
      const savedUser = await saveUserToSupabase(updatedData);
      
      if (editingUser) {
        setUsers(users.map(u => u.id === data.id ? savedUser : u));
      } else {
        setUsers([...users, savedUser]);
      }
      setIsAddingUser(false);
      setEditingUser(null);
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
            <button className="p-1 hover:bg-gray-100 rounded text-gray-500">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {renderDepartmentTree(departments)}
          </div>
        </div>

        {/* Right Content - Users List */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="p-4 text-sm font-medium text-gray-500">用户名</th>
                  <th className="p-4 text-sm font-medium text-gray-500">工号</th>
                  <th className="p-4 text-sm font-medium text-gray-500">角色</th>
                  <th className="p-4 text-sm font-medium text-gray-500">部门</th>
                  <th className="p-4 text-sm font-medium text-gray-500 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> 加载中...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">没有找到用户</td>
                  </tr>
                ) : filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.username}</div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{user.id}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || [user.role]).map((r: string) => (
                          <span key={r} className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r === '管理员' ? 'bg-purple-100 text-purple-700' :
                            r === '业务员' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">{user.department_id}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingUser({
                              ...user,
                              roles: user.roles || [user.role]
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
          data={editingUser || { name: '', username: '', role: '业务员', department_id: 'sales' }}
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
