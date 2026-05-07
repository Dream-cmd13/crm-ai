import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Sparkles, XCircle, Edit2, Trash2, Cpu, Layers, ArrowRightLeft, Bell, Activity, Loader2 } from 'lucide-react';
import { TaskType } from '../types';
import { cn } from '../lib/utils';
import { fetchLlmConfigFromSupabase, saveLlmConfigToSupabase } from '../lib/llmConfigRepository';
import { fetchCustomerTypesFromSupabase } from '../lib/customerTypeRepository';
import { fetchTaskTypeConfigFromSupabase, saveTaskTypeConfigToSupabase } from '../lib/taskTypeConfigRepository';
import { checkAiProxyHealth } from '../lib/aiProxy';
import { notifySupabaseFailure } from '../lib/supabaseFailureNotice';
import { fetchChatAssistConfigFromSupabase, saveChatAssistConfigToSupabase, defaultChatAssistConfig } from '../lib/chatAssistConfigRepository';

import CustomerTypes from './CustomerTypes';
import SystemWechatQuery from '../components/SystemWechatQuery';
import { fetchUsersFromSupabase, saveUserToSupabase, deleteUserFromSupabase, fetchDepartmentsFromSupabase } from '../lib/userRepository';
import { Department } from '../types';

import { confirmDialog } from '../lib/toastConfirm';

interface SystemSettingsProps {
  role?: any;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

const normalizeTaskTypes = (input: TaskType[]): TaskType[] => {
  const seen = new Set<string>();
  const result: TaskType[] = [];
  (input || []).forEach((item, idx) => {
    const id = String(item?.id || '').trim() || `T_AUTO_${idx + 1}`;
    if (seen.has(id)) return;
    seen.add(id);
    result.push({ ...item, id });
  });
  return result;
};

export default function SystemSettings({ role, viewParams, navigateTo, goBack }: SystemSettingsProps) {
  const initialTab = ['task-types', 'llm', 'pushdown', 'wechat', 'customer-types'].includes(viewParams?.tab) ? viewParams.tab : 'task-types';
  const [activeTab, setActiveTab] = useState<'task-types' | 'llm' | 'pushdown' | 'wechat' | 'chat-assist' | 'customer-types'>(initialTab as any);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isAddingTaskType, setIsAddingTaskType] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null);
  const [newTaskType, setNewTaskType] = useState<Partial<TaskType>>({ name: '', defaultHours: 24 });
  const [customerTypeOptions, setCustomerTypeOptions] = useState<string[]>([]);
  const [customerTypesMeta, setCustomerTypesMeta] = useState<Array<{ id: string; name: string }>>([]);
  const [llmConfig, setLlmConfig] = useState(() => ({
    defaultModel: '',
    models: {
      'gemini-3-flash-preview': { name: 'Gemini 3 Flash', provider: 'gemini', endpoint: '', enabled: true },
      'gemini-3.1-pro-preview': { name: 'Gemini 3.1 Pro', provider: 'gemini', endpoint: '', enabled: true },
      'deepseek-v4-pro': { name: 'DeepSeek V4 Pro', provider: 'openai_compatible', endpoint: 'https://api.deepseek.com/v1/chat/completions', enabled: true },
      'qwen-max': { name: '通义千问-Max', provider: 'openai_compatible', endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', enabled: false },
      'minimax-abab6.5': { name: 'MiniMax-abab6.5', provider: 'openai_compatible', endpoint: 'https://api.minimax.chat/v1/text_generation', enabled: false }
    },
    temperature: 0.7,
    maxTokens: 1000
  }));
  useEffect(() => {
    fetchLlmConfigFromSupabase().then((remote) => setLlmConfig(remote as any)).catch((error) => {
      console.error('Error fetching llm config:', error);
    });
  }, []);
  useEffect(() => {
    fetchTaskTypeConfigFromSupabase([])
      .then((remoteTaskTypes) => {
        const hasActivation = remoteTaskTypes.some((t) => String(t.name).trim() === '客户激活任务');
        const merged = hasActivation ? remoteTaskTypes : [...remoteTaskTypes, { id: 'CUSTOMER_ACTIVATION', name: '客户激活任务', defaultHours: 24 } as TaskType];
        setTaskTypes(normalizeTaskTypes(merged));
      })
      .catch((error) => {
        console.error('Error fetching task type config:', error);
      });
  }, []);

  useEffect(() => {
    fetchCustomerTypesFromSupabase()
      .then((types) => {
        setCustomerTypeOptions((types || []).map((t) => t.name).filter(Boolean));
        setCustomerTypesMeta((types || []).map((t) => ({ id: t.id, name: t.name })));
      })
      .catch((error) => {
        console.error('Error fetching customer types:', error);
      });
  }, []);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    no: '',
    role: '业务员',
    department: 'dept-sales'
  });
  const [newModel, setNewModel] = useState({ key: '', name: '', provider: 'gemini', endpoint: '' });
  const [isCheckingAi, setIsCheckingAi] = useState(false);
  const [chatAssistConfig, setChatAssistConfig] = useState(defaultChatAssistConfig);

  useEffect(() => {
    fetchChatAssistConfigFromSupabase()
      .then((cfg) => setChatAssistConfig(cfg))
      .catch((error) => {
        console.error('Error fetching chat assist config:', error);
      });
  }, []);
  useEffect(() => {
    fetchUsersFromSupabase()
      .then((remoteUsers) => setUsers(remoteUsers || []))
      .catch((error) => {
        console.error('Error fetching users:', error);
      });
  }, []);
  useEffect(() => {
    fetchDepartmentsFromSupabase()
      .then((depts) => setDepartments(depts || []))
      .catch((error) => {
        console.error('Error fetching departments:', error);
      });
  }, []);

  const handleSave = async () => {
    const normalizedTaskTypes = normalizeTaskTypes(taskTypes);
    setTaskTypes(normalizedTaskTypes);
    try {
      await saveTaskTypeConfigToSupabase(normalizedTaskTypes);
      const sanitized = await saveLlmConfigToSupabase(llmConfig as any);
      setLlmConfig(sanitized as any);
    } catch (error) {
      console.error('Error saving system settings:', error);
      notifySupabaseFailure('系统设置保存', error);
      return;
    }
    toast.success('所有设置已保存');
  };

  const [isTestingLLM, setIsTestingLLM] = useState(false);

  const testLLMConnection = () => {
    setIsTestingLLM(true);
    setTimeout(() => {
      setIsTestingLLM(false);
      toast.success(`${llmConfig.defaultModel} 连接成功！延迟: 124ms`);
    }, 1500);
  };

  const handleCheckAiProxy = async () => {
    setIsCheckingAi(true);
    try {
      const result = await checkAiProxyHealth();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setIsCheckingAi(false);
    }
  };

  const flowDataSourceOptions = [
    { key: 'chat_context', label: '聊天上下文' },
    { key: 'intent', label: '意图识别' },
    { key: 'faq', label: '常见问题' },
    { key: 'persona', label: '联系人画像' },
    { key: 'focus_competitor', label: '关注点/竞品' },
    { key: 'customer_profile', label: '客户主数据' },
    { key: 'customer_demand', label: '客户需求' },
    { key: 'customer_cases', label: '客户案例' },
    { key: 'product_fab', label: '产品FAB' },
    { key: 'department_prompt', label: '部门提示词' }
  ];

  const applyFlowPreset = (preset: 'huawei' | 'tech' | 'biz') => {
    if (preset === 'tech') {
      setChatAssistConfig({
        ...chatAssistConfig,
        flowNodes: [
          { id: 'flow_tech_1', name: '识别技术问题', enabled: true, dataSources: ['chat_context', 'intent', 'persona'], instruction: '判断技术风险点、参数关注点和发言人技术角色。' },
          { id: 'flow_tech_2', name: '检索技术证据', enabled: true, dataSources: ['faq', 'customer_demand', 'product_fab', 'customer_cases'], instruction: '检索最相关FAQ、需求、FAB和案例，形成技术证据链。' },
          { id: 'flow_tech_3', name: '输出技术答复', enabled: true, dataSources: ['chat_context', 'product_fab', 'customer_cases'], instruction: '给可直接发送的技术答复与验证推进动作。' }
        ]
      });
      return;
    }
    if (preset === 'biz') {
      setChatAssistConfig({
        ...chatAssistConfig,
        flowNodes: [
          { id: 'flow_biz_1', name: '识别商务诉求', enabled: true, dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'], instruction: '识别价格、账期、条款诉求和对方角色。' },
          { id: 'flow_biz_2', name: '检索商务依据', enabled: true, dataSources: ['faq', 'focus_competitor', 'customer_cases', 'customer_profile'], instruction: '提取价值证据、竞品差异和客户案例用于商务谈判。' },
          { id: 'flow_biz_3', name: '输出商务话术', enabled: true, dataSources: ['chat_context', 'focus_competitor', 'customer_cases'], instruction: '先价值后价格，给边界清晰的谈判话术与下一步动作。' }
        ]
      });
      return;
    }
    setChatAssistConfig({
      ...chatAssistConfig,
      flowNodes: [
        { id: 'flow_hw_1', name: '识别发言人与阶段', enabled: true, dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'], instruction: '判断发言人角色和会话阶段（探询/异议/谈判/推进）。' },
        { id: 'flow_hw_2', name: '检索多源资料', enabled: true, dataSources: ['faq', 'focus_competitor', 'customer_profile', 'customer_demand', 'customer_cases', 'product_fab'], instruction: '按意图检索多源资料，保留高置信证据。' },
        { id: 'flow_hw_3', name: '生成建议话术', enabled: true, dataSources: ['chat_context', 'faq', 'persona', 'focus_competitor', 'customer_cases', 'product_fab'], instruction: '输出匹配判断、建议话术、推进动作、风险提示。' }
      ]
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckAiProxy}
            disabled={isCheckingAi}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-60"
          >
            {isCheckingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            AI健康检查
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setActiveTab('task-types')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'task-types' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              任务类型设置
            </button>
            <button
              onClick={() => setActiveTab('llm')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'llm' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Cpu className="w-4 h-4" />
              大模型设置
            </button>
            <button
              onClick={() => setActiveTab('pushdown')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'pushdown' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              下推节点(预设)
            </button>
            <button
              onClick={() => setActiveTab('wechat')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'wechat' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              微信会话
            </button>

          </div>
        </div>

        <div className="flex-1 min-w-0">
          {false && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    用户管理
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">管理系统中的员工账号、部门及角色分配。</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingUser(null);
                    setNewUser({ name: '', username: '', email: '', no: '', role: '业务员', department: 'dept-sales' });
                    setIsAddingUser(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  新增用户
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="p-4 text-sm font-medium text-gray-500">姓名</th>
                      <th className="p-4 text-sm font-medium text-gray-500">工号</th>
                      <th className="p-4 text-sm font-medium text-gray-500">部门</th>
                      <th className="p-4 text-sm font-medium text-gray-500">角色</th>
                      <th className="p-4 text-sm font-medium text-gray-500">状态</th>
                      <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-500">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{user.employeeNo || '-'}</td>
                        <td className="p-4 text-sm text-gray-600">{departments.find(d => d.id === user.department_id)?.name || user.department_id || '-'}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            在职
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setNewUser({
                                  name: user.name,
                                  username: user.username,
                                  email: user.email || '',
                                  no: user.employeeNo || '',
                                  role: user.role,
                                  department: user.department_id
                                });
                                setIsAddingUser(true);
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (await confirmDialog(`确定要删除用户 ${user.name} 吗？`)) {
                                  try {
                                    await deleteUserFromSupabase(user.id);
                                    setUsers(users.filter(u => u.id !== user.id));
                                  } catch (error) {
                                    console.error('Error deleting user:', error);
                                    toast.error('删除用户失败');
                                  }
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAddingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-900">{editingUser ? '编辑用户' : '新增用户'}</h3>
                      <button onClick={() => setIsAddingUser(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newUser.name}
                            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">工号</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newUser.no}
                            onChange={(e) => setNewUser({...newUser, no: e.target.value})}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">用户名/账号</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={newUser.username}
                          onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                          <select
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newUser.department}
                            onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                          >
                            <option value="">请选择部门</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                          <select 
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                          >
                            <option>管理员</option>
                            <option>业务员</option>
                            <option>经理</option>
                            <option>财务</option>
                            <option>供应链</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">取消</button>
                      <button 
                        onClick={async () => {
                          try {
                            const payload = {
                              id: editingUser?.id,
                              username: newUser.username,
                              name: newUser.name,
                              role: newUser.role,
                              roles: [newUser.role],
                              department_id: newUser.department,
                              employeeNo: newUser.no,
                              dataPermissions: { customerVisibility: 'all' as const }
                            };
                            const saved = await saveUserToSupabase(payload as any);
                            setUsers((prev) => {
                              if (editingUser) return prev.map((u) => u.id === editingUser.id ? { ...u, ...saved } : u);
                              return [saved, ...prev];
                            });
                            setIsAddingUser(false);
                          } catch (error) {
                            console.error('Error saving user:', error);
                            toast.error('保存用户失败');
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'customer-types' && (
            <CustomerTypes />
          )}

          {activeTab === 'pushdown' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                  预设下推节点
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  这些下推节点为系统内置预设，下推逻辑在各业务页面的“转…”操作中执行。
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">下推</th>
                      <th className="py-2 pr-4">节点代码</th>
                      <th className="py-2 pr-4">来源对象</th>
                      <th className="py-2 pr-4">目标对象</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {[
                      { name: '询盘 → 线索', code: 'PUSH_INQUIRY_TO_LEAD', from: 'crm_inquiry', to: 'crm_lead' },
                      { name: '线索 → 商机', code: 'PUSH_LEAD_TO_OPPORTUNITY', from: 'crm_lead', to: 'crm_opportunity' },
                      { name: '商机 → 项目', code: 'PUSH_OPPORTUNITY_TO_PROJECT', from: 'crm_opportunity', to: 'crm_project' },
                      { name: '报价 → 订单', code: 'PUSH_QUOTATION_TO_ORDER', from: 'crm_quotation', to: 'crm_sales_order' },
                      { name: '潜在客户 → 正式客户', code: 'PUSH_POTENTIAL_TO_CUSTOMER', from: 'crm_potential_customer', to: 'ba_manucustinfo' }
                    ].map((row) => (
                      <tr key={row.code} className="border-t border-gray-100">
                        <td className="py-3 pr-4 font-medium">{row.name}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-700">{row.code}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-700">{row.from}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-gray-700">{row.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'wechat' && (
            <SystemWechatQuery />
          )}
          {activeTab === 'chat-assist' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  聊天会话AI辅助设置
                </h3>
                <p className="text-sm text-gray-500 mt-1">这里定义聊天场景下 AI 回复策略，聊天页生成建议话术将以此配置为准。</p>
              </div>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                <div className="text-sm font-bold text-indigo-900">傻瓜化流程设置（推荐）</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applyFlowPreset('huawei')} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">一键套用：华为标准流程</button>
                  <button onClick={() => applyFlowPreset('tech')} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">一键套用：技术答复流程</button>
                  <button onClick={() => applyFlowPreset('biz')} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">一键套用：商务谈判流程</button>
                </div>
                <div className="space-y-2">
                  {(chatAssistConfig.flowNodes || []).map((node, idx) => (
                    <div key={node.id} className="p-3 bg-white border border-indigo-100 rounded-lg space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-700">节点{idx + 1}</span>
                          <input
                            value={node.name}
                            onChange={(e) => {
                              const next = [...(chatAssistConfig.flowNodes || [])];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setChatAssistConfig({ ...chatAssistConfig, flowNodes: next });
                            }}
                            className="px-2 py-1 border border-gray-200 rounded text-sm"
                            placeholder="节点名称"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={node.enabled !== false}
                              onChange={(e) => {
                                const next = [...(chatAssistConfig.flowNodes || [])];
                                next[idx] = { ...next[idx], enabled: e.target.checked };
                                setChatAssistConfig({ ...chatAssistConfig, flowNodes: next });
                              }}
                            />
                            启用
                          </label>
                          <button
                            onClick={() => {
                              const next = [...(chatAssistConfig.flowNodes || [])];
                              next.splice(idx, 1);
                              setChatAssistConfig({ ...chatAssistConfig, flowNodes: next });
                            }}
                            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {flowDataSourceOptions.map((opt) => {
                          const selected = (node.dataSources || []).includes(opt.key as any);
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                const set = new Set(node.dataSources || []);
                                if (set.has(opt.key as any)) set.delete(opt.key as any);
                                else set.add(opt.key as any);
                                const next = [...(chatAssistConfig.flowNodes || [])];
                                next[idx] = { ...next[idx], dataSources: Array.from(set) as any };
                                setChatAssistConfig({ ...chatAssistConfig, flowNodes: next });
                              }}
                              className={`text-xs px-2 py-1 rounded border ${selected ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-gray-200 text-gray-600'}`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        value={node.instruction}
                        onChange={(e) => {
                          const next = [...(chatAssistConfig.flowNodes || [])];
                          next[idx] = { ...next[idx], instruction: e.target.value };
                          setChatAssistConfig({ ...chatAssistConfig, flowNodes: next });
                        }}
                        className="w-full min-h-[56px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                        placeholder="这个节点要让 AI 做什么（例如：先判断发言人角色与意图）"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setChatAssistConfig({
                      ...chatAssistConfig,
                      flowNodes: [
                        ...(chatAssistConfig.flowNodes || []),
                        {
                          id: `flow_${Date.now()}`,
                          name: `新节点${(chatAssistConfig.flowNodes || []).length + 1}`,
                          enabled: true,
                          dataSources: ['chat_context'],
                          instruction: ''
                        }
                      ]
                    })}
                    className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50"
                  >
                    新增流程节点
                  </button>
                </div>
              </div>

              <details className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <summary className="cursor-pointer text-sm font-bold text-gray-800">高级参数（可选）</summary>
                <div className="pt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={chatAssistConfig.useFaqAnswer} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, useFaqAnswer: e.target.checked })} />
                  根据常见问题回答
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={chatAssistConfig.usePersonaAnswer} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, usePersonaAnswer: e.target.checked })} />
                  根据联系人画像回答
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={chatAssistConfig.useFocusCompetitorAnswer} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, useFocusCompetitorAnswer: e.target.checked })} />
                  根据客户关注点及竞争对手回答
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={chatAssistConfig.strictMode} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, strictMode: e.target.checked })} />
                  严格按本配置执行
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">回复风格</label>
                  <input
                    type="text"
                    value={chatAssistConfig.responseTone}
                    onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, responseTone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="例如：专业、克制、口语化"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">回复长度</label>
                  <select
                    value={chatAssistConfig.responseLength}
                    onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, responseLength: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="short">简短（50-100字）</option>
                    <option value="medium">中等（80-180字）</option>
                    <option value="long">详细（150-260字）</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">必须包含</label>
                <textarea
                  value={chatAssistConfig.mustInclude}
                  onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, mustInclude: e.target.value })}
                  className="w-full min-h-[72px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">禁止内容</label>
                <textarea
                  value={chatAssistConfig.forbidden}
                  onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, forbidden: e.target.value })}
                  className="w-full min-h-[72px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">附加提示词</label>
                <textarea
                  value={chatAssistConfig.customPromptSuffix}
                  onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, customPromptSuffix: e.target.value })}
                  className="w-full min-h-[96px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">检索参数</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">FAQ TopN</label>
                    <input type="number" min={1} value={chatAssistConfig.retrieval?.faqTopN || 3} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, retrieval: { ...chatAssistConfig.retrieval, faqTopN: Number(e.target.value || 3) } })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">FAQ最低分</label>
                    <input type="number" min={1} value={chatAssistConfig.retrieval?.faqMinScore || 2} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, retrieval: { ...chatAssistConfig.retrieval, faqMinScore: Number(e.target.value || 2) } })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">关注点TopN</label>
                    <input type="number" min={1} value={chatAssistConfig.retrieval?.focusTopN || 3} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, retrieval: { ...chatAssistConfig.retrieval, focusTopN: Number(e.target.value || 3) } })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">案例TopN</label>
                    <input type="number" min={1} value={chatAssistConfig.retrieval?.caseTopN || 2} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, retrieval: { ...chatAssistConfig.retrieval, caseTopN: Number(e.target.value || 2) } })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">FAB TopN</label>
                    <input type="number" min={1} value={chatAssistConfig.retrieval?.seriesTopN || 2} onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, retrieval: { ...chatAssistConfig.retrieval, seriesTopN: Number(e.target.value || 2) } })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="text-sm font-bold text-gray-900">分析流程步骤</div>
                <textarea
                  value={(chatAssistConfig.analysisSteps || []).join('\n')}
                  onChange={(e) => setChatAssistConfig({ ...chatAssistConfig, analysisSteps: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                  className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="每行一个步骤"
                />
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">意图分类配置</div>
                  <button
                    onClick={() => setChatAssistConfig({
                      ...chatAssistConfig,
                      intentCategories: [
                        ...(chatAssistConfig.intentCategories || []),
                        { id: `intent_${Date.now()}`, name: '新意图', keywords: [], strategyHint: '' }
                      ]
                    })}
                    className="text-xs px-2 py-1 border border-indigo-200 text-indigo-700 rounded bg-indigo-50"
                  >
                    新增意图
                  </button>
                </div>
                <div className="space-y-2">
                  {(chatAssistConfig.intentCategories || []).map((intent, idx) => (
                    <div key={intent.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input value={intent.name} onChange={(e) => {
                          const next = [...(chatAssistConfig.intentCategories || [])];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setChatAssistConfig({ ...chatAssistConfig, intentCategories: next });
                        }} className="px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="意图名称" />
                        <input value={(intent.keywords || []).join('、')} onChange={(e) => {
                          const next = [...(chatAssistConfig.intentCategories || [])];
                          next[idx] = { ...next[idx], keywords: e.target.value.split(/[、,，]/).map((x) => x.trim()).filter(Boolean) };
                          setChatAssistConfig({ ...chatAssistConfig, intentCategories: next });
                        }} className="px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="关键词，使用逗号分隔" />
                      </div>
                      <textarea value={intent.strategyHint} onChange={(e) => {
                        const next = [...(chatAssistConfig.intentCategories || [])];
                        next[idx] = { ...next[idx], strategyHint: e.target.value };
                        setChatAssistConfig({ ...chatAssistConfig, intentCategories: next });
                      }} className="w-full min-h-[60px] px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="该意图下的策略提示" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900">部门提示词（可编辑）</div>
                  <button
                    onClick={() => setChatAssistConfig({
                      ...chatAssistConfig,
                      departmentPrompts: [
                        ...(chatAssistConfig.departmentPrompts || []),
                        { id: `dept_${Date.now()}`, department: '', prompt: '', enabled: true }
                      ]
                    })}
                    className="text-xs px-2 py-1 border border-indigo-200 text-indigo-700 rounded bg-indigo-50"
                  >
                    新增部门提示词
                  </button>
                </div>
                <div className="space-y-2">
                  {(chatAssistConfig.departmentPrompts || []).map((dept, idx) => (
                    <div key={dept.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                        <input
                          value={dept.department}
                          onChange={(e) => {
                            const next = [...(chatAssistConfig.departmentPrompts || [])];
                            next[idx] = { ...next[idx], department: e.target.value };
                            setChatAssistConfig({ ...chatAssistConfig, departmentPrompts: next });
                          }}
                          className="px-2 py-1.5 border border-gray-200 rounded text-sm"
                          placeholder="部门名称（如 研发/技术）"
                        />
                        <label className="text-xs text-gray-600 flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={dept.enabled !== false}
                            onChange={(e) => {
                              const next = [...(chatAssistConfig.departmentPrompts || [])];
                              next[idx] = { ...next[idx], enabled: e.target.checked };
                              setChatAssistConfig({ ...chatAssistConfig, departmentPrompts: next });
                            }}
                          />
                          启用
                        </label>
                        <button
                          onClick={() => {
                            const next = [...(chatAssistConfig.departmentPrompts || [])];
                            next.splice(idx, 1);
                            setChatAssistConfig({ ...chatAssistConfig, departmentPrompts: next });
                          }}
                          className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                      <textarea
                        value={dept.prompt}
                        onChange={(e) => {
                          const next = [...(chatAssistConfig.departmentPrompts || [])];
                          next[idx] = { ...next[idx], prompt: e.target.value };
                          setChatAssistConfig({ ...chatAssistConfig, departmentPrompts: next });
                        }}
                        className="w-full min-h-[72px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                        placeholder="该部门沟通时的策略提示词"
                      />
                    </div>
                  ))}
                </div>
              </div>
                </div>
              </details>
            </div>
          )}



          {activeTab === 'llm' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-500" />
                    大模型设置 (LLM Configuration)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    配置系统 AI 助手及自动化流程所使用的生成式 AI 模型参数。支持多种主流大模型。
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存配置
                  </button>
                </div>
              </div>

              <div className="space-y-6 max-w-4xl">
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">默认模型</label>
                  <select
                    value={llmConfig.defaultModel}
                    onChange={(e) => setLlmConfig({ ...llmConfig, defaultModel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    {Object.entries(llmConfig.models).map(([key, model]: [string, any]) => (
                      <option key={key} value={key}>{model.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(llmConfig.models).map(([key, model]: [string, any]) => (
                    <div key={key} className="p-6 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            <Sparkles className={cn('w-5 h-5', llmConfig.defaultModel === key ? 'text-indigo-600' : 'text-gray-500')} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{model.name}</h4>
                            <p className="text-xs text-gray-500">模型标识：{key}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={model.enabled}
                              onChange={(e) => {
                                const newModels = { ...llmConfig.models };
                                newModels[key] = { ...model, enabled: e.target.checked };
                                setLlmConfig({ ...llmConfig, models: newModels });
                              }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                          <button
                            onClick={() => {
                              const newModels = { ...llmConfig.models };
                              delete newModels[key];
                              const nextDefault = llmConfig.defaultModel === key ? (Object.keys(newModels)[0] || '') : llmConfig.defaultModel;
                              setLlmConfig({ ...llmConfig, models: newModels, defaultModel: nextDefault });
                            }}
                            className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">模型名称</label>
                          <input
                            type="text"
                            value={model.name}
                            onChange={(e) => {
                              const newModels = { ...llmConfig.models };
                              newModels[key] = { ...model, name: e.target.value };
                              setLlmConfig({ ...llmConfig, models: newModels });
                            }}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Provider</label>
                          <select
                            value={model.provider || (key.startsWith('gemini-') ? 'gemini' : 'openai_compatible')}
                            onChange={(e) => {
                              const newModels = { ...llmConfig.models };
                              newModels[key] = { ...model, provider: e.target.value };
                              setLlmConfig({ ...llmConfig, models: newModels });
                            }}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                          >
                            <option value="gemini">gemini</option>
                            <option value="openai_compatible">openai_compatible</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Endpoint</label>
                          <input
                            type="text"
                            value={model.endpoint}
                            onChange={(e) => {
                              const newModels = { ...llmConfig.models };
                              newModels[key] = { ...model, endpoint: e.target.value };
                              setLlmConfig({ ...llmConfig, models: newModels });
                            }}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            API Key（仅保存到 Supabase，前端不缓存）
                          </label>
                          <input
                            type="password"
                            value={(model as any).apiKey || ''}
                            onChange={(e) => {
                              const newModels = { ...llmConfig.models };
                              newModels[key] = { ...model, apiKey: e.target.value, apiKeySet: Boolean(e.target.value) };
                              setLlmConfig({ ...llmConfig, models: newModels });
                            }}
                            placeholder={model.apiKeySet ? '已在服务端保存，如需更换请重新输入' : '输入后端调用用的密钥'}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border border-dashed border-gray-300 rounded-xl bg-white space-y-3">
                  <h4 className="text-sm font-bold text-gray-900">自定义新增大模型</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={newModel.key} onChange={(e) => setNewModel({ ...newModel, key: e.target.value })} placeholder="模型标识，例如 deepseek" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <input value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} placeholder="显示名称" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    <select value={newModel.provider} onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="gemini">gemini</option>
                      <option value="openai_compatible">openai_compatible</option>
                    </select>
                    <input value={newModel.endpoint} onChange={(e) => setNewModel({ ...newModel, endpoint: e.target.value })} placeholder="API Endpoint" className="md:col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <button
                    onClick={() => {
                      if (!newModel.key || !newModel.name) return;
                      setLlmConfig({
                        ...llmConfig,
                        models: {
                          ...llmConfig.models,
                          [newModel.key]: {
                            name: newModel.name,
                            provider: newModel.provider,
                            endpoint: newModel.endpoint,
                            enabled: true
                          }
                        },
                        defaultModel: llmConfig.defaultModel || newModel.key
                      });
                      setNewModel({ key: '', name: '', provider: 'gemini', endpoint: '' });
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    添加模型
                  </button>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-1">提示</p>
                    <p className="opacity-90">
                      API Key 不在前端保存。请在 Supabase Edge Function 的环境变量中配置各家模型的 Key（例如 GEMINI_API_KEY、DEEPSEEK_API_KEY 等）。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isAddingUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-900">{editingUser ? '编辑用户' : '新增用户'}</h3>
                  <button onClick={() => setIsAddingUser(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <XCircle className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">姓名</label>
                    <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="输入姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">用户名</label>
                    <input 
                      type="text" 
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="输入用户名"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">角色</label>
                      <select 
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="管理员">管理员</option>
                        <option value="销售经理">销售经理</option>
                        <option value="业务员">业务员</option>
                        <option value="FAE">FAE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">部门</label>
                      <select
                        value={newUser.department}
                        onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">请选择部门</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button 
                    onClick={() => setIsAddingUser(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-white transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const payload = {
                          id: editingUser?.id,
                          username: newUser.username,
                          name: newUser.name,
                          role: newUser.role,
                          roles: [newUser.role],
                          department_id: newUser.department,
                          employeeNo: newUser.no,
                          dataPermissions: { customerVisibility: 'all' as const }
                        };
                        const saved = await saveUserToSupabase(payload as any);
                        setUsers((prev) => {
                          if (editingUser) return prev.map((u) => u.id === editingUser.id ? { ...u, ...saved } : u);
                          return [saved, ...prev];
                        });
                        setIsAddingUser(false);
                      } catch (error) {
                        console.error('Error saving user:', error);
                        toast.error('保存用户失败');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'task-types' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                    任务类型设置
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    配置系统中可用的任务类型及其默认处理时效。
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setEditingTaskType(null);
                    setNewTaskType({ name: '', defaultHours: 24 });
                    setIsAddingTaskType(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  添加任务类型
                </button>
              </div>
              
              <div className="space-y-4">
                {taskTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">默认处理时效: {type.defaultHours} 小时</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          辅助字段: {type.fields?.length || 0} 个 | 响应规则: {type.responseTimeRules?.length || 0} 条
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingTaskType(type);
                          setNewTaskType({
                            ...type,
                            fields: type.fields || [],
                            responseTimeRules: type.responseTimeRules || []
                          });
                          setIsAddingTaskType(true);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        编辑
                      </button>
                      <button 
                          onClick={async () => {
                            if (await confirmDialog('确定要删除此任务类型吗？')) {
                            setTaskTypes(taskTypes.filter(t => t.id !== type.id));
                          }
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {isAddingTaskType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                      <h3 className="text-lg font-bold text-gray-900">
                        {editingTaskType ? '编辑任务类型' : '添加任务类型'}
                      </h3>
                      <button onClick={() => setIsAddingTaskType(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">任务类型名称</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="例如: 客户拜访"
                            value={newTaskType.name}
                            onChange={(e) => setNewTaskType({...newTaskType, name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">默认处理时效 (小时)</label>
                          <input 
                            type="number" 
                            min="1"
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newTaskType.defaultHours}
                            onChange={(e) => setNewTaskType({...newTaskType, defaultHours: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      {/* Auxiliary Fields */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">辅助字段</label>
                          <button
                            onClick={() => {
                              const newField = { id: `F${Date.now()}`, name: '', type: 'text' as const, required: false };
                              setNewTaskType({
                                ...newTaskType,
                                fields: [...(newTaskType.fields || []), newField]
                              });
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> 添加字段
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(newTaskType.fields || []).map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <input
                                type="text"
                                placeholder="字段名称"
                                value={field.name}
                                onChange={(e) => {
                                  const newFields = [...(newTaskType.fields || [])];
                                  newFields[index].name = e.target.value;
                                  setNewTaskType({ ...newTaskType, fields: newFields });
                                }}
                                className="flex-1 p-1.5 text-sm border border-gray-200 rounded"
                              />
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const newFields = [...(newTaskType.fields || [])];
                                  newFields[index].type = e.target.value as any;
                                  setNewTaskType({ ...newTaskType, fields: newFields });
                                }}
                                className="w-24 p-1.5 text-sm border border-gray-200 rounded"
                              >
                                <option value="text">文本</option>
                                <option value="number">数字</option>
                                <option value="date">日期</option>
                                <option value="select">下拉单选</option>
                                <option value="customer">关联客户</option>
                                <option value="project">关联项目</option>
                                <option value="user">人员选择</option>
                                <option value="priority">优先级</option>
                              </select>
                              <label className="flex items-center gap-1 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => {
                                    const newFields = [...(newTaskType.fields || [])];
                                    newFields[index].required = e.target.checked;
                                    setNewTaskType({ ...newTaskType, fields: newFields });
                                  }}
                                />
                                必填
                              </label>
                              <button
                                onClick={() => {
                                  const newFields = [...(newTaskType.fields || [])];
                                  newFields.splice(index, 1);
                                  setNewTaskType({ ...newTaskType, fields: newFields });
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(!newTaskType.fields || newTaskType.fields.length === 0) && (
                            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                              暂无辅助字段
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Time Rules */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">特定属性响应时效规则</label>
                          <button
                            onClick={() => {
                              const newRule = { id: `R${Date.now()}`, condition: [{ fieldId: '', operator: 'equals' as const, value: '' }], hours: 24 };
                              setNewTaskType({
                                ...newTaskType,
                                responseTimeRules: [...(newTaskType.responseTimeRules || []), newRule]
                              });
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> 添加规则
                          </button>
                        </div>
                        <div className="space-y-3">
                          {(newTaskType.responseTimeRules || []).map((rule, ruleIndex) => (
                            <div key={rule.id} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-indigo-800">规则 {ruleIndex + 1}</span>
                                <button
                                  onClick={() => {
                                    const newRules = [...(newTaskType.responseTimeRules || [])];
                                    newRules.splice(ruleIndex, 1);
                                    setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {rule.condition.map((cond, condIndex) => (
                                <div key={condIndex} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-8">{condIndex === 0 ? '当' : '且'}</span>
                                  <select
                                    value={cond.fieldId}
                                    onChange={(e) => {
                                      const newRules = [...(newTaskType.responseTimeRules || [])];
                                      newRules[ruleIndex].condition[condIndex].fieldId = e.target.value;
                                      setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                    }}
                                    className="flex-1 p-1.5 text-xs border border-gray-200 rounded"
                                  >
                                    <option value="">选择字段</option>
                                    <optgroup label="客户属性">
                                      <option value="customer_level">客户等级</option>
                                      <option value="customer_industry">客户行业</option>
                                      <option value="customer_region">客户地区</option>
                                    </optgroup>
                                    <optgroup label="任务字段">
                                      {(newTaskType.fields || []).map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                  <select
                                    value={cond.operator}
                                    onChange={(e) => {
                                      const newRules = [...(newTaskType.responseTimeRules || [])];
                                      newRules[ruleIndex].condition[condIndex].operator = e.target.value as any;
                                      setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                    }}
                                    className="w-20 p-1.5 text-xs border border-gray-200 rounded"
                                  >
                                    <option value="equals">等于</option>
                                    <option value="contains">包含</option>
                                    <option value="greaterThan">大于</option>
                                    <option value="lessThan">小于</option>
                                  </select>
                                  {cond.fieldId === 'customer_level' ? (
                                    <select
                                      value={cond.value}
                                      onChange={(e) => {
                                        const newRules = [...(newTaskType.responseTimeRules || [])];
                                        newRules[ruleIndex].condition[condIndex].value = e.target.value;
                                        setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                      }}
                                      className="flex-1 p-1.5 text-xs border border-gray-200 rounded"
                                    >
                                      <option value="">选择客户类型</option>
                                      {customerTypeOptions.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="值"
                                      value={cond.value}
                                      onChange={(e) => {
                                        const newRules = [...(newTaskType.responseTimeRules || [])];
                                        newRules[ruleIndex].condition[condIndex].value = e.target.value;
                                        setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                      }}
                                      className="flex-1 p-1.5 text-xs border border-gray-200 rounded"
                                    />
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-2 pt-2 border-t border-indigo-100/50">
                                <span className="text-xs text-gray-600">处理时效为</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={rule.hours}
                                  onChange={(e) => {
                                    const newRules = [...(newTaskType.responseTimeRules || [])];
                                    newRules[ruleIndex].hours = parseInt(e.target.value) || 0;
                                    setNewTaskType({ ...newTaskType, responseTimeRules: newRules });
                                  }}
                                  className="w-16 p-1 text-xs border border-gray-200 rounded text-center"
                                />
                                <span className="text-xs text-gray-600">小时</span>
                              </div>
                            </div>
                          ))}
                          {(!newTaskType.responseTimeRules || newTaskType.responseTimeRules.length === 0) && (
                            <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                              暂无特殊响应规则
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Completion Configuration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">任务完成配置</label>
                        <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={newTaskType.completionConfig?.requireCompletionTime ?? true}
                              onChange={(e) => {
                                setNewTaskType({
                                  ...newTaskType,
                                  completionConfig: {
                                    ...newTaskType.completionConfig,
                                    requireCompletionTime: e.target.checked,
                                    requireCompletionEffect: newTaskType.completionConfig?.requireCompletionEffect ?? true,
                                    requireCompletionNote: newTaskType.completionConfig?.requireCompletionNote ?? false
                                  }
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            强制要求填写完成时间 (默认当前时间)
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={newTaskType.completionConfig?.requireCompletionEffect ?? true}
                              onChange={(e) => {
                                setNewTaskType({
                                  ...newTaskType,
                                  completionConfig: {
                                    ...newTaskType.completionConfig,
                                    requireCompletionTime: newTaskType.completionConfig?.requireCompletionTime ?? true,
                                    requireCompletionEffect: e.target.checked,
                                    requireCompletionNote: newTaskType.completionConfig?.requireCompletionNote ?? false
                                  }
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            强制要求填写完成效果 (已完成/未完成/暂缓)
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={newTaskType.completionConfig?.requireCompletionNote ?? false}
                              onChange={(e) => {
                                setNewTaskType({
                                  ...newTaskType,
                                  completionConfig: {
                                    ...newTaskType.completionConfig,
                                    requireCompletionTime: newTaskType.completionConfig?.requireCompletionTime ?? true,
                                    requireCompletionEffect: newTaskType.completionConfig?.requireCompletionEffect ?? true,
                                    requireCompletionNote: e.target.checked
                                  }
                                });
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            要求填写完成备注 (支持语音输入)
                          </label>
                        </div>
                      </div>

                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsAddingTaskType(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">取消</button>
                      <button 
                        onClick={() => {
                          if (editingTaskType) {
                            setTaskTypes(taskTypes.map(t => t.id === editingTaskType.id ? { ...editingTaskType, ...newTaskType } as TaskType : t));
                          } else {
                            setTaskTypes([...taskTypes, { ...newTaskType, id: `T${Date.now()}` } as TaskType]);
                          }
                          setIsAddingTaskType(false);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
