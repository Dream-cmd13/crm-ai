import React, { useEffect, useState } from 'react';
import { Shield, Users, Lock, Database, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchPermissionSnapshotFromSupabase, savePermissionSnapshotToSupabase } from '../lib/permissionRepository';
import { fetchUsersFromSupabase } from '../lib/userRepository';

export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState<'roles' | 'individual' | 'data'>('roles');
  const [searchTerm, setSearchTerm] = useState('');

  const modules = [
    { id: 'customer', name: '客户管理' },
    { id: 'sales', name: '销售管理' },
    { id: 'purchase', name: '采购管理' },
    { id: 'inventory', name: '库存管理' },
    { id: 'finance', name: '财务管理' },
    { id: 'report', name: '报表分析' },
    { id: 'system', name: '系统设置' },
  ];

  const actions = [
    { id: 'view', name: '查看' },
    { id: 'add', name: '新增' },
    { id: 'edit', name: '修改' },
    { id: 'delete', name: '删除' },
    { id: 'audit', name: '审核' },
    { id: 'unaudit', name: '反审核' },
    { id: 'view_amount', name: '金额查看' },
    { id: 'terminate', name: '终止' },
    { id: 'unterminate', name: '反终止' },
  ];

  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [roles, setRoles] = useState(() => [
    { id: 'admin', name: '管理员', permissions: modules.flatMap(m => actions.map(a => `${m.id}_${a.id}`)) },
    { id: 'salesman', name: '业务员', permissions: ['customer_view', 'customer_add', 'customer_edit', 'sales_view', 'sales_add', 'sales_edit'] },
    { id: 'manager', name: '经理', permissions: ['customer_view', 'sales_view', 'sales_audit', 'report_view'] },
    { id: 'finance', name: '财务', permissions: ['finance_view', 'finance_audit', 'report_view', 'sales_view_amount'] },
    { id: 'supply', name: '供应链', permissions: ['purchase_view', 'purchase_add', 'inventory_view'] }
  ]);

  const [userPermissions, setUserPermissions] = useState<{ [userId: string]: { roles: string[], individualPermissions: string[] } }>(() => ({
    '1': { roles: ['salesman'], individualPermissions: ['report_view'] },
    '2': { roles: ['manager', 'finance'], individualPermissions: [] }
  }));

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const [remote, remoteUsers] = await Promise.all([
          fetchPermissionSnapshotFromSupabase(),
          fetchUsersFromSupabase()
        ]);
        if (remote) {
          setRoles(remote.roles || []);
          setUserPermissions(remote.userPermissions || {});
        }
        setUsers(remoteUsers || []);
      } catch (error) {
        console.error('Error fetching permission snapshot:', error);
      }
    };
    fetchRemote();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      savePermissionSnapshotToSupabase({ roles, userPermissions }).catch((error) => {
        console.error('Error syncing permission snapshot:', error);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [roles, userPermissions]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const selectedUser = users.find(u => u.id === selectedUserId);

  const toggleRolePermission = (roleId: string, permissionId: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const permissions = r.permissions.includes(permissionId)
          ? r.permissions.filter(p => p !== permissionId)
          : [...r.permissions, permissionId];
        return { ...r, permissions };
      }
      return r;
    }));
  };

  const toggleRoleModulePermissions = (roleId: string, moduleId: string, isAllSelected: boolean) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const modulePerms = actions.map(a => `${moduleId}_${a.id}`);
        const permissions = isAllSelected
          ? r.permissions.filter(p => !modulePerms.includes(p))
          : Array.from(new Set([...r.permissions, ...modulePerms]));
        return { ...r, permissions };
      }
      return r;
    }));
  };

  const toggleUserRole = (userId: string, roleId: string) => {
    setUserPermissions(prev => {
      const userPerms = prev[userId] || { roles: [], individualPermissions: [] };
      const roles = userPerms.roles.includes(roleId)
        ? userPerms.roles.filter(r => r !== roleId)
        : [...userPerms.roles, roleId];
      return { ...prev, [userId]: { ...userPerms, roles } };
    });
  };

  const toggleUserIndividualPermission = (userId: string, permissionId: string) => {
    setUserPermissions(prev => {
      const userPerms = prev[userId] || { roles: [], individualPermissions: [] };
      const individualPermissions = userPerms.individualPermissions.includes(permissionId)
        ? userPerms.individualPermissions.filter(p => p !== permissionId)
        : [...userPerms.individualPermissions, permissionId];
      return { ...prev, [userId]: { ...userPerms, individualPermissions } };
    });
  };

  const getUserEffectivePermissions = (userId: string) => {
    const userPerms = userPermissions[userId] || { roles: [], individualPermissions: [] };
    const rolePermissions = userPerms.roles.flatMap(roleId => roles.find(r => r.id === roleId)?.permissions || []);
    return Array.from(new Set([...rolePermissions, ...userPerms.individualPermissions]));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            权限管理
          </h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('roles')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'roles' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              角色权限
            </button>
            <button 
              onClick={() => setActiveTab('individual')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'individual' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              个人权限
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'data' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              数据权限
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'roles' ? (
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* Role List */}
          <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">角色列表</h3>
              <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    selectedRoleId === role.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span>{role.name}</span>
                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>

          {/* Permission Settings */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {selectedRole?.name} - 权限设置
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {modules.map(module => {
                  const modulePerms = actions.map(a => `${module.id}_${a.id}`);
                  const isAllSelected = modulePerms.every(p => selectedRole?.permissions.includes(p));
                  const isSomeSelected = modulePerms.some(p => selectedRole?.permissions.includes(p)) && !isAllSelected;

                  return (
                    <div key={module.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isAllSelected || isSomeSelected ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-400"
                          )}>
                            <Lock className="w-4 h-4" />
                          </div>
                          <div className="font-bold text-gray-900">{module.name}</div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isAllSelected}
                            ref={input => {
                              if (input) input.indeterminate = isSomeSelected;
                            }}
                            onChange={() => toggleRoleModulePermissions(selectedRoleId, module.id, isAllSelected)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-600">全选</span>
                        </label>
                      </div>
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {actions.map(action => {
                          const permId = `${module.id}_${action.id}`;
                          return (
                            <label key={action.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                              <input 
                                type="checkbox" 
                                checked={selectedRole?.permissions.includes(permId)}
                                onChange={() => toggleRolePermission(selectedRoleId, permId)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">{action.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'individual' ? (
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* User List */}
          <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索用户..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {users.filter(u => u.name.includes(searchTerm)).map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                    selectedUserId === user.id ? "bg-indigo-50 border-indigo-100" : "hover:bg-gray-50 border-transparent"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 truncate">{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Permission Settings */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {selectedUser?.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{selectedUser?.name}</h3>
                        <p className="text-xs text-gray-500">{selectedUser?.username} | {selectedUser?.department_id}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Roles Selection */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      所属角色 (可多选)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {roles.map(role => (
                        <label key={role.id} className={cn(
                          "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all",
                          userPermissions[selectedUserId]?.roles.includes(role.id)
                            ? "border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-100"
                            : "border-gray-100 hover:border-gray-200"
                        )}>
                          <input 
                            type="checkbox" 
                            checked={userPermissions[selectedUserId]?.roles.includes(role.id)}
                            onChange={() => toggleUserRole(selectedUserId, role.id)}
                            className="rounded text-indigo-600"
                          />
                          <span className="text-sm font-medium text-gray-700">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Individual Permissions */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-500" />
                      额外个人权限
                    </h4>
                    <div className="space-y-4">
                      {modules.map(module => (
                        <div key={module.id} className="border border-gray-100 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-medium text-sm text-gray-700">
                            {module.name}
                          </div>
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {actions.map(action => {
                              const permId = `${module.id}_${action.id}`;
                              const isFromRole = userPermissions[selectedUserId]?.roles.some(roleId => 
                                roles.find(r => r.id === roleId)?.permissions.includes(permId)
                              );
                              const isIndividual = userPermissions[selectedUserId]?.individualPermissions.includes(permId);
                              
                              return (
                                <label key={action.id} className={cn(
                                  "flex items-center gap-2 p-1.5 border rounded transition-all",
                                  isFromRole ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 border-transparent hover:border-gray-200"
                                )}>
                                  <input 
                                    type="checkbox" 
                                    checked={isFromRole || isIndividual}
                                    disabled={isFromRole}
                                    onChange={() => toggleUserIndividualPermission(selectedUserId, permId)}
                                    className="rounded text-indigo-600"
                                  />
                                  <span className="text-xs text-gray-700">{action.name}</span>
                                  {isFromRole && <span className="text-[10px] text-indigo-500 font-bold ml-auto">(角色)</span>}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Effective Permissions Summary */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">最终生效权限汇总</h4>
                    <div className="flex flex-wrap gap-2">
                      {getUserEffectivePermissions(selectedUserId).map(permId => {
                        const [moduleId, actionId] = permId.split('_');
                        const moduleName = modules.find(m => m.id === moduleId)?.name;
                        const actionName = actions.find(a => a.id === actionId)?.name;
                        return (
                          <span key={permId} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 shadow-sm">
                            {moduleName} - {actionName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Users className="w-12 h-12 mb-4 text-gray-200" />
                <p>请从左侧选择用户进行权限设置</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
          <h3 className="font-bold text-gray-900 mb-6">全局数据权限策略</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/30">
                <h4 className="font-bold text-indigo-900 mb-2">默认可见性策略</h4>
                <p className="text-sm text-indigo-700 mb-4">设置系统中默认的数据隔离级别。</p>
                <select className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white">
                  <option>私有模式 (仅本人及上级可见)</option>
                  <option>部门模式 (本部门内共享)</option>
                  <option>公开模式 (全公司可见)</option>
                </select>
              </div>
              <div className="p-4 border border-gray-100 rounded-xl">
                <h4 className="font-bold text-gray-900 mb-2">特殊数据规则</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">允许业务员查看公海客户</span>
                    <input type="checkbox" checked className="rounded text-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">允许跨部门查看关联项目</span>
                    <input type="checkbox" className="rounded text-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">限制查看敏感财务数据</span>
                    <input type="checkbox" checked className="rounded text-indigo-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 border border-gray-100 rounded-xl bg-gray-50/30">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  客户数据权限设置
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  客户数据的查看权限主要基于以下规则：
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-2 mb-6">
                  <li><strong>所属业务员：</strong> 客户的所属业务员默认拥有该客户的全部权限。</li>
                  <li><strong>内部对接人：</strong> 在客户详情的“内部对接人”细表中添加的人员，默认拥有该客户的查看权限。</li>
                  <li><strong>上级可见：</strong> 部门负责人默认可见其下属业务员的所有客户数据。</li>
                </ul>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <p className="text-sm text-indigo-800">
                    提示：如需为特定人员分配特定客户的查看权限，请前往【客户管理】模块，在对应客户的详情页中将其添加至“内部对接人”列表。
                  </p>
                </div>
              </div>

              <div className="p-6 border border-gray-100 rounded-xl bg-gray-50/30">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-500" />
                  自定义客户可见性设置
                </h4>
              <p className="text-sm text-gray-500 mb-6">针对“自定义”权限的用户，可以设置其可查看的具体客户范围。</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">按客户等级授权</label>
                  <div className="flex flex-wrap gap-2">
                    {['战略客户', '成长型客户', '普通客户', '潜在客户'].map(level => (
                      <label key={level} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="checkbox" className="rounded text-indigo-600" />
                        <span className="text-xs text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">按行业授权</label>
                  <div className="flex flex-wrap gap-2">
                    {['汽车', '电子', '医疗', '能源', '化工'].map(industry => (
                      <label key={industry} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="checkbox" className="rounded text-indigo-600" />
                        <span className="text-xs text-gray-700">{industry}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                    应用自定义规则
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
