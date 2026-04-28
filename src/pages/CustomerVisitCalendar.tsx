import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Customer, CustomerType, Role, TodoTask } from '../types';
import { Calendar as CalendarIcon, Search, User, Tag, ChevronLeft, ChevronRight, AlertCircle, Plus, ListChecks } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isBefore, startOfDay, isAfter, addDays } from 'date-fns';
import { cn } from '../lib/utils';
import TaskDetailModal from '../components/TaskDetailModal';
import { loadLocalState, saveLocalState } from '../lib/localState';
import { saveTasksSnapshotToSupabase } from '../lib/taskRepository';
import { fetchCustomersModuleDataFromSupabase, updateCustomerLastVisitDateInSupabase } from '../lib/customerRepository';
import { fetchCustomerTypesFromSupabase } from '../lib/customerTypeRepository';
import { defaultVisitActivationConfig, fetchVisitActivationConfig } from '../lib/visitActivationConfigRepository';
import { callAiProxy } from '../lib/aiProxy';

interface CustomerVisitCalendarProps {
  role: Role;
  navigateTo?: (view: string, params?: any) => void;
}

type ActivationSuggestion = {
  title: string;
  description: string;
  stageTitle?: string;
  aiSuggestion?: string;
  modelId?: string;
};

const ACTIVATION_DEFAULT_CONTEXT_SOURCES = ['customer_name', 'customer_profile', 'contact_persona', 'chat_records', 'customer_focus_archive'];
const ACTIVATION_DEFAULT_PROMPT_TEMPLATE =
  '你是华为大客户销售顾问，请基于华为销售法（LTC/SPIN/Blue Sheet）深度分析当前客户状态，并给出可执行的客户激活策略。\n' +
  '输入信息：客户名称{custname}、客户画像{profile}、联系人画像{contact_persona}、最近沟通记录{chat}、客户关注点档案{customer_focus_archive}。\n' +
  '输出要求：输出一个完整激活策略块（目标、关键动作、风险应对、下一步推进），语言务实可执行。';

export default function CustomerVisitCalendar({ role, navigateTo }: CustomerVisitCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState('全部类型');
  const [selectedSalesman, setSelectedSalesman] = useState('全部业务员');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'no-plan' | 'tasks'>('no-plan');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>(() => loadLocalState<CustomerType[]>('crm.customer_types', []));
  const [visitTasks, setVisitTasks] = useState<TodoTask[]>(() => loadLocalState<TodoTask[]>('crm.customer_visit_tasks', []));
  const [visitActivationConfig, setVisitActivationConfig] = useState(defaultVisitActivationConfig);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [analyzingCustomerId, setAnalyzingCustomerId] = useState<string | null>(null);
  const [analysisSuggestions, setAnalysisSuggestions] = useState<Record<string, ActivationSuggestion[]>>({});

  useEffect(() => {
    saveLocalState('crm.customer_visit_tasks', visitTasks);
  }, [visitTasks]);

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const [{ customers: remoteCustomers, visitPlans }, remoteTypes, activationConfig] = await Promise.all([
          fetchCustomersModuleDataFromSupabase(),
          fetchCustomerTypesFromSupabase(),
          fetchVisitActivationConfig()
        ]);
        setCustomers(remoteCustomers || []);
        setVisitTasks((visitPlans || []).map((task) => ({
          ...task,
          taskType: task.taskType || '客户激活任务',
          sourceType: task.sourceType || 'customer',
          sourceId: task.sourceId || task.associatedCustomerId,
          associatedCustomerName: task.associatedCustomerName || (remoteCustomers || []).find((c) => c.id === task.associatedCustomerId)?.name || ''
        })));
        if (remoteTypes && remoteTypes.length > 0) {
          setCustomerTypes(remoteTypes);
          saveLocalState('crm.customer_types', remoteTypes);
        }
        setVisitActivationConfig(activationConfig || defaultVisitActivationConfig);
      } catch (error) {
        console.error('Error fetching visit tasks:', error);
      }
    };
    fetchRemote();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveTasksSnapshotToSupabase(visitTasks, 'customer_visit').catch((error) => {
        console.error('Error syncing visit tasks:', error);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [visitTasks]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getCustomerDedupKey = (customer: Customer) => {
    const creditCodeKey = String((customer as any)?.unifiedSocialCreditCode || '').trim().toLowerCase();
    const nameKey = String(customer?.name || '').trim().toLowerCase();
    const idKey = String(customer?.id || '').trim();
    return creditCodeKey || nameKey || idKey;
  };

  const getCustomerScore = (customer: Customer) => (
    [
      customer?.salesRep,
      customer?.level,
      customer?.region,
      customer?.customerType,
      customer?.lastVisitDate,
      customer?.status
    ].filter((value) => String(value || '').trim()).length
  );

  const mergeCustomer = (current: Customer, incoming: Customer) => {
    const [primary, secondary] = getCustomerScore(incoming) > getCustomerScore(current)
      ? [incoming, current]
      : [current, incoming];
    return {
      ...secondary,
      ...primary,
      contacts: Array.isArray(primary.contacts) && primary.contacts.length > 0 ? primary.contacts : secondary.contacts,
      followUps: Array.isArray(primary.followUps) && primary.followUps.length > 0 ? primary.followUps : secondary.followUps
    } as Customer;
  };

  const uniqueCustomers = Array.from(
    (customers || []).reduce((map, customer) => {
      const key = getCustomerDedupKey(customer);
      const existing = map.get(key);
      map.set(key, existing ? mergeCustomer(existing, customer) : customer);
      return map;
    }, new Map<string, Customer>()).values()
  );

  const typeOptions = ['全部类型', ...Array.from(new Set((customerTypes || []).map((t) => t.name).filter(Boolean)))];
  const salesmanOptions = ['全部业务员', ...Array.from(new Set(uniqueCustomers.map((c) => c.salesRep).filter(Boolean)))];

  const getVisitIntervalDays = (customer: Customer) => {
    const typeMatch = (customerTypes || []).find((t) => t.name === customer.level);
    const typeId = (customer as any).customerType || typeMatch?.id;
    const isPotential = typeof (customer as any).isPotential === 'boolean' ? Boolean((customer as any).isPotential) : undefined;
    const flowRule = (visitActivationConfig.flows || []).find((flow: any) => {
      const typeMatched = !flow.customerTypeId || String(flow.customerTypeId) === String(typeId || '');
      const potentialMatched = typeof flow.isPotential !== 'boolean' || flow.isPotential === isPotential;
      return typeMatched && potentialMatched && Number(flow.inactiveDays || 0) > 0;
    });
    if (flowRule?.inactiveDays) return Number(flowRule.inactiveDays);
    const thresholdRule = (visitActivationConfig.thresholdRules || []).find((rule: any) => {
      const typeMatched = !rule.customerTypeId || String(rule.customerTypeId) === String(typeId || '');
      const potentialMatched = typeof rule.isPotential !== 'boolean' || rule.isPotential === isPotential;
      return typeMatched && potentialMatched && Number(rule.inactiveDays || 0) > 0;
    });
    if (thresholdRule?.inactiveDays) return Number(thresholdRule.inactiveDays);
    return Number(visitActivationConfig.defaultInactiveDays || 30);
  };

  const hasPendingVisitTask = (customerId: string, customerName: string) =>
    (visitTasks || []).some((t) => {
      const pending = t.status !== '已完成' && t.status !== '已取消';
      if (!pending) return false;
      if (t.associatedCustomerId && t.associatedCustomerId === customerId) return true;
      if (t.sourceId && t.sourceId === customerId) return true;
      if (customerName && t.title && t.title.includes(customerName)) return true;
      return false;
    });

  const noPlanCustomers = uniqueCustomers
    .filter((c) => !hasPendingVisitTask(c.id, c.name))
    .map((c) => {
      const intervalDays = getVisitIntervalDays(c);
      const last = String(c.lastVisitDate || c.createDate || '').slice(0, 10);
      const baseDate = last ? new Date(last) : new Date();
      const next = addDays(baseDate, intervalDays);
      return { ...c, nextVisit: format(next, 'yyyy-MM-dd') };
    })
    .filter((c: any) => {
      const matchesType = selectedType === '全部类型' || String(c.level || '') === selectedType;
      const matchesSalesman = selectedSalesman === '全部业务员' || String(c.salesRep || '') === selectedSalesman;
      const matchesSearch = String(c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSalesman && matchesSearch;
    });

  // 只显示“按照激活规则待激活”的客户：应激活日期 <= 今天 且 无待办激活任务
  const pendingActivationCustomers = noPlanCustomers.filter((c) => {
    const nextVisitDate = startOfDay(new Date(c.nextVisit));
    const today = startOfDay(new Date());
    return !isAfter(nextVisitDate, today);
  });

  const filteredTasks = (visitTasks || []).filter((t) => {
    const customerId = t.associatedCustomerId || t.sourceId || '';
    const customer = customers.find((c) => c.id === customerId);
    const customerName = t.associatedCustomerName || customer?.name || t.title.replace(/^拜访\s*|^客户激活任务[:：]\s*/g, '');
    const matchesType = selectedType === '全部类型' || String(customer?.level || '') === selectedType;
    const matchesSalesman = selectedSalesman === '全部业务员' || String(t.assignee || '') === selectedSalesman;
    const matchesSearch = String(customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSalesman && matchesSearch;
  });

  const getTasksForDay = (day: Date) => {
    return filteredTasks.filter(t => isSameDay(new Date(t.dueDate), day));
  };

  const buildSuggestionsByFlow = async (customer: Customer) => {
    const typeMatch = (customerTypes || []).find((t) => t.name === customer.level);
    const typeId = (customer as any).customerType || typeMatch?.id;
    const isPotential = typeof (customer as any).isPotential === 'boolean' ? Boolean((customer as any).isPotential) : undefined;
    const flow = (visitActivationConfig.flows || []).find((f: any) => {
      const typeMatched = !f.customerTypeId || String(f.customerTypeId) === String(typeId || '');
      const potentialMatched = typeof f.isPotential !== 'boolean' || f.isPotential === isPotential;
      return typeMatched && potentialMatched;
    });
    if (flow?.nodes?.length) {
      const suggestions = await Promise.all((flow.nodes || []).map(async (node: any) => {
        const contextSources = Array.isArray(node?.contextSources) && node.contextSources.length > 0
          ? node.contextSources
          : ACTIVATION_DEFAULT_CONTEXT_SOURCES;
        const contextLines: string[] = [];
        if (contextSources.includes('customer_name')) {
          contextLines.push(`客户名称：${customer?.name || '-'}`);
        }
        if (contextSources.includes('customer_profile')) {
          contextLines.push(`客户画像：${String((customer as any)?.profile || (customer as any)?.description || customer?.level || '').trim() || '-'}`);
        }
        if (contextSources.includes('contact_persona')) {
          contextLines.push(`联系人画像：${String((customer as any)?.contactPersona || '').trim() || '-'}`);
        }
        if (contextSources.includes('chat_records')) {
          contextLines.push(`最近沟通记录：${String((customer as any)?.recentChat || '').trim() || '-'}`);
        }
        if (contextSources.includes('customer_focus_archive')) {
          contextLines.push(`客户关注点档案：${String((customer as any)?.focusArchive || '').trim() || '-'}`);
        }
        if (contextSources.includes('current_ontology_fields')) {
          contextLines.push(`当前客户字段：${JSON.stringify(customer || {})}`);
        }

        const promptTemplate = String(node?.aiPromptTemplate || ACTIVATION_DEFAULT_PROMPT_TEMPLATE).trim();
        const prompt = [
          promptTemplate,
          `节点名称：${node?.name || '未命名节点'}`,
          `节点目标：${node?.description || '-'}`,
          `背景信息：\n${contextLines.join('\n') || '-'}`,
          '请仅输出一个可直接执行的“激活策略建议块”，不需要编号和多条列表。'
        ].join('\n\n');

        let aiSuggestion = String(node?.description || `按“${flow.name}”任务流推进该阶段触达`);
        try {
          aiSuggestion = String(await callAiProxy(prompt, String(node?.aiModelId || '').trim() || undefined)).trim() || aiSuggestion;
        } catch (error) {
          console.error('activation suggestion ai failed:', error);
        }

        return {
          title: `激活建议：${node.name}`,
          description: node.description || `按“${flow.name}”任务流推进该阶段触达`,
          stageTitle: node.name,
          aiSuggestion,
          modelId: String(node?.aiModelId || '')
        } as ActivationSuggestion;
      }));
      return suggestions;
    }
    const template = (visitActivationConfig.templatesByType || {})[(customer.level || '')] || visitActivationConfig.defaultTemplate || defaultVisitActivationConfig.defaultTemplate;
    return (template.objectives || []).map((obj: any, idx: number) => ({
      title: `${template.title || '客户激活任务'}-${idx + 1}`,
      description: obj.title || template.description || '按激活规则推进客户触达',
      stageTitle: `阶段${idx + 1}`
    }));
  };

  const handleAnalyzeActivationTasks = async (customer: Customer) => {
    const suggestions = await buildSuggestionsByFlow(customer);
    setAnalysisSuggestions((prev) => ({ ...prev, [customer.id]: suggestions as ActivationSuggestion[] }));
    setAnalyzingCustomerId(customer.id);
  };

  const createTasksFromSuggestions = (customerId: string, scheduleBaseDate?: string) => {
    const suggestions = analysisSuggestions[customerId] || [];
    if (suggestions.length === 0) return;
    const customer = customers.find((c) => c.id === customerId);
    const base = scheduleBaseDate || scheduleDate || new Date().toISOString().split('T')[0];
    const newTasks: TodoTask[] = suggestions.map((s, idx) => ({
      id: `VT${Date.now()}_${customerId}_${idx + 1}`,
      title: s.title,
      description: s.description,
      status: '待办',
      importance: '中',
      urgency: '正常',
      assignee: customer?.salesRep || '',
      dueDate: format(addDays(new Date(base), idx), 'yyyy-MM-dd'),
      createDate: new Date().toISOString().split('T')[0],
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      taskType: '客户激活任务',
      sourceType: 'customer',
      sourceId: customerId,
      associatedCustomerId: customerId,
      associatedCustomerName: customer?.name || '',
      activationFrameworkStageTitle: s.stageTitle || undefined,
      aiSuggestions: [String(s.aiSuggestion || s.description || '').trim()],
      auxiliaryData: {
        activationStage: s.stageTitle || '',
        activationSuggestion: String(s.aiSuggestion || '').trim(),
        activationModelId: s.modelId || ''
      }
    } as any));
    setVisitTasks((prev) => [...newTasks, ...prev]);
    toast.success(`已生成 ${newTasks.length} 条激活拜访任务`);
    setAnalyzingCustomerId(null);
  };

  const handleSchedule = () => {
    if (selectedCustomerIds.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const newTasks: TodoTask[] = selectedCustomerIds.map((id) => {
      const customer = customers.find((c) => c.id === id);
      return {
        id: `VT${Date.now()}_${id}`,
        title: `客户激活任务：${customer?.name || '未知客户'}`,
        description: `客户激活跟进：${customer?.name || '未知客户'}`,
        status: '待办',
        importance: '中',
        urgency: '正常',
        assignee: customer?.salesRep || '',
        dueDate: scheduleDate,
        createDate: today,
        creatorId: 'system',
        creatorNo: 'system',
        creatorName: 'system',
        taskType: '客户激活任务',
        sourceType: 'customer',
        sourceId: id,
        associatedCustomerId: id,
        associatedCustomerName: customer?.name || ''
      };
    });

    setVisitTasks(prev => [...newTasks, ...prev]);
    toast.success(`已为 ${selectedCustomerIds.length} 个客户安排 ${scheduleDate} 的激活任务`);
    setSelectedCustomerIds([]);
    setIsScheduling(false);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-600" />
            客户激活中心
          </h2>
          <p className="text-gray-500 mt-1">以客户最后一次拜访日期为准，按激活规则识别待激活客户并生成任务建议</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeTab === 'no-plan' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setActiveTab('no-plan')}
            >
              激活任务池
            </button>
            <button 
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                activeTab === 'tasks' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setActiveTab('tasks')}
            >
              激活日历
            </button>
          </div>
        </div>
      </div>

      {/* AI Suggestions Removed */}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索客户名称..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {salesmanOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {activeTab === 'no-plan' ? (
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
              <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  待激活客户（按规则）
                  <span className="ml-2 px-2 py-0.5 bg-red-100 rounded-full text-xs">{pendingActivationCustomers.length}</span>
                </div>
                {selectedCustomerIds.length > 0 && (
                  <button 
                    onClick={() => setIsScheduling(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" /> 批量排期
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {pendingActivationCustomers.map(customer => (
                  <div key={customer.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedCustomerIds.includes(customer.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                        else setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{customer.name}</h4>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">待激活</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{customer.level}</span>
                        <span>业务员: {customer.salesRep}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-xs text-gray-500 mb-1">应激活日期</p>
                      <p className="text-sm font-bold text-red-600">{customer.nextVisit}</p>
                      <button
                        type="button"
                        onClick={() => handleAnalyzeActivationTasks(customer as any)}
                        className="block w-full px-2 py-1 text-[11px] rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        激活任务分析
                      </button>
                    </div>
                  </div>
                ))}
                {pendingActivationCustomers.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-400">当前没有待激活客户（已按激活规则筛选）</div>
                )}
              </div>
          </div>
        </div>
      ) : (
        /* Calendar View for Activation Tasks */
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-gray-900 text-lg">
                {format(weekStart, 'yyyy年MM月')}
              </h3>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-2 hover:bg-gray-50 border-r border-gray-200"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium hover:bg-gray-50">今天</button>
                <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-2 hover:bg-gray-50 border-l border-gray-200"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              本周共有 <span className="font-bold text-indigo-600">{days.reduce((sum, day) => sum + getTasksForDay(day).length, 0)}</span> 个激活任务
            </div>
          </div>

          <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200">
            {days.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

              return (
                <div key={idx} className={cn("flex flex-col min-h-0", isPast && !isToday ? "bg-gray-50/30" : "bg-white")}>
                  <div className={cn(
                    "p-3 text-center border-b border-gray-200",
                    isToday ? "bg-indigo-50" : "bg-transparent"
                  )}>
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {format(day, 'EEEE')}
                    </div>
                    <div className={cn(
                      "w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold",
                      isToday ? "bg-indigo-600 text-white" : "text-gray-900"
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto text-center">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id}
                        className={cn(
                          "p-2 rounded-lg border text-xs transition-all hover:shadow-sm cursor-pointer",
                          isPast ? "bg-gray-100 border-gray-200 text-gray-500" : "bg-indigo-50 border-indigo-100 text-indigo-700"
                        )}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="font-bold mb-1 truncate">{(task as any).associatedCustomerName || String(task.title || '').replace(/^拜访\s*|^客户激活任务[:：]\s*/g, '')}</div>
                        <div className="flex items-center justify-between opacity-80">
                          <span>{task.assignee}</span>
                        </div>
                      </div>
                    ))}
                    {dayTasks.length === 0 && (
                      <div className="h-full flex items-center justify-center opacity-10">
                        <CalendarIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduling Modal */}
      {isScheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">批量安排激活任务</h3>
                <p className="text-sm text-gray-500 mt-1">为选中的 {selectedCustomerIds.length} 个客户安排激活日期</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择日期</label>
                <input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsScheduling(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:text-gray-900"
              >
                取消
              </button>
              <button 
                onClick={handleSchedule}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                确认安排
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskDetailModal
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        task={visitTasks.find(t => t.id === selectedTaskId) as any}
        navigateTo={navigateTo}
        onComplete={(taskId, completionData) => {
          const date = completionData?.completionTime
            ? String(completionData.completionTime).slice(0, 10)
            : new Date().toISOString().split('T')[0];
          const completing = visitTasks.find((t) => t.id === taskId);
          const customerId = completing?.associatedCustomerId || completing?.sourceId;
          if (customerId) {
            updateCustomerLastVisitDateInSupabase(customerId, date).catch((error) => {
              console.error('Error updating customer last visit date:', error);
            });
          }
          setVisitTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: '已完成', completionTime: completionData?.completionTime, completionEffect: completionData?.completionEffect, completionNote: completionData?.completionNote, actualContent: completionData?.completionNote || t.actualContent } : t));
          setSelectedTaskId(null);
        }}
      />

      {analyzingCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-600" />激活任务分析</h4>
              <button onClick={() => setAnalyzingCustomerId(null)} className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600">关闭</button>
            </div>
            {(() => {
              const customer = customers.find((c) => c.id === analyzingCustomerId);
              const suggestions = analysisSuggestions[analyzingCustomerId] || [];
              return (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">客户：{customer?.name || '-'}</div>
                  <div className="rounded border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-indigo-700">
                    系统会根据“激活规则中的任务流”生成激活任务建议，可一键生成具体拜访任务。
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, idx) => (
                      <div key={`${s.title}_${idx}`} className="rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="text-sm font-semibold text-gray-900">{idx + 1}. {s.title}</div>
                        <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{s.aiSuggestion || s.description}</div>
                        {s.stageTitle && (
                          <div className="mt-1 text-[11px] text-indigo-700">对应阶段：{s.stageTitle}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {suggestions.length === 0 && <div className="text-sm text-gray-500">当前规则未匹配到任务流建议，请先在激活设置中配置任务流节点。</div>}
                  <div className="flex justify-end">
                    <button
                      onClick={() => createTasksFromSuggestions(analyzingCustomerId)}
                      disabled={suggestions.length === 0}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
                    >
                      一键生成拜访任务
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
