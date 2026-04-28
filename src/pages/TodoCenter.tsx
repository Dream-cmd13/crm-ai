import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Role, TodoTask, User } from '../types';
import { fetchTasksFromSupabase, saveTasksSnapshotToSupabase } from '../lib/taskRepository';
import { getSupabaseClient } from '../lib/supabaseClient';
import { fetchUsersFromSupabase } from '../lib/userRepository';
import { CheckSquare, Users, CalendarDays, ChevronDown, ChevronRight, Building2, PlusCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskDecompositionModal from '../components/TaskDecompositionModal';
import TaskTransferModal from '../components/TaskTransferModal';
import QuickTaskModal from '../components/QuickTaskModal';

interface TodoCenterProps {
  role: Role;
  currentUser?: User;
  navigateTo?: (view: string, params?: any) => void;
}


export default function TodoCenter({ role, currentUser, navigateTo }: TodoCenterProps) {
  const [activeTab, setActiveTab] = useState<'my_todos' | 'org_todos'>('my_todos');
  const [subTab, setSubTab] = useState<'pending' | 'published' | 'completed' | 'all'>('pending');
  const [orgFilter, setOrgFilter] = useState<'all' | 'overdue'>('all');
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<string[]>(['all']);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['all']);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDecomposeModalOpen, setIsDecomposeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);

  const getModuleTag = (task: TodoTask) => {
    const byTaskType = String(task.taskType || '').trim();
    return byTaskType || '其他';
  };

  const buildDepartmentTreeFromRows = (rows: any[]) => {
    const map: Record<string, any> = {};
    rows.forEach((row) => {
      map[row.id] = { ...row, children: [] };
    });
    const rootNodes: any[] = [];
    rows.forEach((row) => {
      if (row.parent_id && map[row.parent_id]) {
        map[row.parent_id].children.push(map[row.id]);
      } else {
        rootNodes.push(map[row.id]);
      }
    });
    return [{ id: 'all', name: '全部', children: rootNodes }];
  };

  const buildDepartmentTreeFromUsers = (allUsers: any[]) => {
    const ids = Array.from(new Set((allUsers || []).map((u) => String(u.department_id || '').trim()).filter(Boolean)));
    const rows = ids.map((id) => ({ id, name: id, parent_id: null }));
    return [{ id: 'all', name: '全部', children: rows }];
  };

  useEffect(() => {
    const reloadTasks = () => fetchTasksFromSupabase().then(setTasks).catch(console.error);
    reloadTasks();
    fetchUsersFromSupabase()
      .then((data) => {
        setUsers(data);
      })
      .catch(console.error);
    const supabase = getSupabaseClient();
    Promise.all([supabase.from('crm_department').select('*'), fetchUsersFromSupabase()])
      .then(([{ data }, allUsers]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(buildDepartmentTreeFromRows(data));
          setExpandedDepts(['all', ...data.slice(0, 6).map(d => String(d.id))]);
          return;
        }
        setDepartments(buildDepartmentTreeFromUsers(allUsers || []));
      })
      .catch(() => {
        setDepartments(buildDepartmentTreeFromUsers(users));
      });

    window.addEventListener('task-updated', reloadTasks);
    return () => {
      window.removeEventListener('task-updated', reloadTasks);
    };
  }, []);

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const toggleDeptSelection = (deptId: string) => {
    if (deptId === 'all') {
      setSelectedDepts(['all']);
      return;
    }
    setSelectedDepts(prev => 
      prev.includes(deptId)
        ? prev.filter(id => id !== deptId && id !== 'all')
        : [...prev.filter(id => id !== 'all'), deptId]
    );
  };

  const renderDeptNode = (dept: any, level = 0) => (
    <div key={dept.id}>
      <button
        onClick={() => {
          if ((dept.children || []).length > 0) toggleDept(dept.id);
          toggleDeptSelection(dept.id);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-colors",
          selectedDepts.includes(dept.id)
            ? "bg-indigo-50 text-indigo-700 font-medium"
            : "text-gray-600 hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        {(dept.children || []).length > 0 ? (
          expandedDepts.includes(dept.id) ? (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          )
        ) : (
          <span className="w-4 h-4 shrink-0" />
        )}
        <div className={cn(
          "w-4 h-4 border rounded flex items-center justify-center shrink-0",
          selectedDepts.includes(dept.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
        )}>
          {selectedDepts.includes(dept.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
        </div>
        <span className="truncate">{dept.name}</span>
      </button>
      {(dept.children || []).length > 0 && expandedDepts.includes(dept.id) && (
        <div className="space-y-1 mt-1">
          {dept.children.map((child: any) => renderDeptNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  // Filter tasks based on tab
  const currentTasks = activeTab === 'my_todos' 
    ? tasks.filter(t => {
        if (subTab === 'pending') return (t.assigneeId === currentUser?.id || t.assignee === role) && t.status !== '已完成' && t.status !== '已取消';
        if (subTab === 'published') return (t.creatorId === currentUser?.id || t.creatorName === currentUser?.name) && t.status !== '已完成' && t.status !== '已取消';
        if (subTab === 'completed') return (t.creatorId === currentUser?.id || t.creatorName === currentUser?.name) && t.status === '已完成';
        return t.assigneeId === currentUser?.id || t.creatorId === currentUser?.id;
      })
    : tasks.filter(t => {
        const assigneeDept = users.find(u => u.id === t.assigneeId)?.department_id;
        const isMatchDept = selectedDepts.includes('all') || selectedDepts.includes(assigneeDept);
        const isMatchStatus = orgFilter === 'overdue' ? new Date(t.dueDate) < new Date() && t.status !== '已完成' : true;
        return isMatchDept && isMatchStatus;
      });

  const pendingTasks = currentTasks; // For my_todos, status filter is already in currentTasks.

  const filteredPendingTasks = moduleFilter 
    ? pendingTasks.filter(t => {
        return getModuleTag(t) === moduleFilter;
      })
    : pendingTasks;

  const taskTypeCountMap = pendingTasks.reduce<Record<string, number>>((acc, task) => {
    const tag = getModuleTag(task);
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  if (taskTypeCountMap['其他'] == null) {
    taskTypeCountMap['其他'] = 0;
  }

  const statCards = Object.entries(taskTypeCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      icon: label.includes('日历') || label.includes('拜访') || label.includes('激活') ? CalendarDays : CheckSquare,
      color: label === '其他' ? 'text-gray-600' : 'text-indigo-600',
      bg: label === '其他' ? 'bg-gray-50' : 'bg-indigo-50'
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            工作台
          </h1>
          <p className="text-gray-500 mt-1">集中处理业务任务与协同动作</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickTaskOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4" />
            快速任务
          </button>
          <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my_todos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('my_todos')}
          >
            我的任务
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'org_todos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('org_todos')}
          >
            组织任务
          </button>
          </div>
        </div>
      </div>

      
      {activeTab === 'my_todos' && (
        <div className="flex gap-4 border-b border-gray-200">
          {[
            { id: 'pending', label: '我的代办' },
            { id: 'published', label: '我发布的代办' },
            { id: 'completed', label: '我发布的已办结' },
            { id: 'all', label: '我的所有任务' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`pb-2 text-sm font-medium transition-colors ${subTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      {activeTab === 'org_todos' && (
        <div className="flex gap-4 border-b border-gray-200">
          {[
            { id: 'all', label: '所有任务' },
            { id: 'overdue', label: '逾期任务' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setOrgFilter(tab.id as any)}
              className={`pb-2 text-sm font-medium transition-colors ${orgFilter === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={cn(
              "bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md",
              moduleFilter === stat.label ? "border-indigo-500 ring-1 ring-indigo-500" : "border-gray-200"
            )}
            onClick={() => setModuleFilter(moduleFilter === stat.label ? null : stat.label)}
          >
            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
        {activeTab === 'org_todos' && (
          <div className="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-y-auto shrink-0">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-medium">
              <Building2 className="w-5 h-5 text-indigo-600" />
              组织架构
            </div>
            <div className="space-y-1">
              {departments.map(dept => renderDeptNode(dept))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900">
              {moduleFilter ? `${moduleFilter} 列表` : '全部代办任务列表'}
              {activeTab === 'org_todos' && ` (${selectedDepts.length} 个部门)`}
            </h3>
            <span className="text-sm text-gray-500">共 {filteredPendingTasks.length} 项</span>
          </div>
          <div className="divide-y divide-gray-200 overflow-y-auto max-h-[600px]">
            {filteredPendingTasks.length > 0 ? filteredPendingTasks.map(task => (
              <div 
                key={task.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${(task.urgency === '非常紧急' || task.urgency === '紧急') ? 'bg-red-500' : task.urgency === '正常' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">类型: {task.taskType}</span>
                      <span className="text-xs text-gray-500">执行人: {task.assignee}</span>
                      <span className="text-xs text-gray-500">截止: {task.dueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === '进行中' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500">
                暂无代办任务
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <>
          <TaskDetailModal 
            isOpen={!!selectedTask}
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onComplete={(taskId, completionData) => {
              setTasks(tasks.map(t => 
                t.id === taskId 
                  ? { ...t, status: '已完成', actualContent: completionData?.completionNote || t.actualContent } 
                  : t
              ));
              setSelectedTask(null);
            }}
            onDecompose={() => setIsDecomposeModalOpen(true)}
            onTransfer={() => setIsTransferModalOpen(true)}
            navigateTo={navigateTo}
            onViewTask={(taskId) => {
              const parent = tasks.find(t => t.id === taskId) ;
              if (parent) setSelectedTask(parent);
            }}
          />

          <TaskDecompositionModal
            isOpen={isDecomposeModalOpen}
            onClose={() => setIsDecomposeModalOpen(false)}
            parentTask={selectedTask}
            onDecompose={(subTasks) => {
              const newTasks = subTasks.map(st => ({
                ...st,
                status: '待办',
                creatorId: currentUser?.id || 'EMP001',
                creatorNo: currentUser?.employeeNo || 'E001',
                creatorName: currentUser?.name || role,
                createDate: new Date().toISOString().split('T')[0],
                parentId: selectedTask?.id,
                taskType: selectedTask?.taskType || '常规任务',
                sourceType: 'task_decomposition'
              }));
              setTasks([...tasks, ...newTasks]);
              toast.error(`成功分解为 ${subTasks.length} 个子任务`);
            }}
          />

          <TaskTransferModal
            isOpen={isTransferModalOpen}
            onClose={() => setIsTransferModalOpen(false)}
            task={selectedTask}
            onTransfer={(taskId, targetUserId, targetUserName, reason) => {
              setTasks(tasks.map(t => 
                t.id === taskId 
                  ? { 
                      ...t, 
                      assignee: targetUserName, 
                      assigneeId: targetUserId,
                      assigneeName: targetUserName,
                      history: [...(t.history || []), { id: Date.now().toString(), timestamp: new Date().toLocaleString(), action: '任务转交', operator: currentUser?.name || role, details: `转交给 ${targetUserName}。原因: ${reason}` }] 
                    } 
                  : t
              ));
              setSelectedTask(null);
              toast.error(`任务已成功转交给 ${targetUserName}`);
            }}
          />
        </>
      )}

      <QuickTaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        currentUser={currentUser}
        onSave={async (task) => {
          try {
            await saveTasksSnapshotToSupabase([task as any], 'task_center');
            toast.success('任务下达成功！');
            window.dispatchEvent(new Event('task-updated'));
          } catch (error) {
            console.error('save quick task failed:', error);
            toast.error(`任务保存失败：${(error as Error)?.message || '请检查网络或数据库配置'}`);
          }
        }}
      />
    </div>
  );
}
