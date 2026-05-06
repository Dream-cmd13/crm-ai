import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Users, Link as LinkIcon, ListTodo, Target, MessageSquare, Edit2, Plus, Save } from 'lucide-react';
import { Customer, Contact, GroupChat, TodoTask, CustomerPersona, CommunicationDetail } from '../../types';
import ReservedButtons from '../ReservedButtons';
import { cn } from '../../lib/utils';
import { initialInquiries, initialLeads, initialOpportunities, initialProjects, initialQuotations, initialOrders, initialSampleOrders, initialReturnOrders, initialUsers } from '../../data';
import { fetchUsersFromSupabase } from '../../lib/userRepository';
import CommunicationLog from '../CommunicationLog';
import CustomerPersonaPanel from '../CustomerPersonaPanel';
import SwotMatrixPanel from '../SwotMatrixPanel';
import StakeholderMapPanel from '../stakeholder/StakeholderMapPanel';
import { loadLocalState, saveLocalState } from '../../lib/localState';
import { generateBusinessId, ID_PREFIX } from '../../lib/idUtils';
import { toast } from 'react-hot-toast';
import { callAiProxy } from '../../lib/aiProxy';
import { fetchPersonaAiConfig } from '../../lib/personaAiConfigRepository';

interface CustomerDetailProps {
  selectedCustomer: Customer;
  onBack: () => void;
  onEdit: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  showWeChat: boolean;
  setShowWeChat: (v: boolean) => void;
  setIsAddingContact: (v: boolean) => void;
  isAddingContact: boolean;
  newContact: any;
  setNewContact: (v: any) => void;
  handleAddContact: () => void;
  setEditingContact: (v: Contact | null) => void;
  setVisitContact: (v: Contact | null) => void;
  handleAnalyzeContact: (id: string) => void;
  analyzingContactId: string | null;
  todoTasks: TodoTask[];
  navigateTo?: (view: string, params?: any) => void;
  followUpPlans: TodoTask[];
  isUpdatingPersona: boolean;
  handleUpdatePersona: () => void;
  personas: CustomerPersona[];
  setPersonas: React.Dispatch<React.SetStateAction<CustomerPersona[]>>;
  setEditingPersona: (v: CustomerPersona | null) => void;
  groupChats: GroupChat[];
  selectedChat: GroupChat | null;
  setSelectedChat: (v: GroupChat | null) => void;
  chatSubTab: string;
  setChatSubTab: (v: any) => void;
  isSyncingChats: boolean;
  handleSyncChats: () => void;
  currentMonth: Date;
  setCurrentMonth: (v: Date) => void;
  selectedDate: Date;
  setSelectedDate: (v: Date) => void;
  setIsAddingToDate: (v: boolean) => void;
  handleOpenPlanDetails: (plan: TodoTask) => void;
  communications: CommunicationDetail[];
  onAddCommunication: (comm: Partial<CommunicationDetail>) => void;
  onCreateFollowupTask?: (task: TodoTask) => void;
}

export const CustomerDetail = ({
  selectedCustomer, onBack, onEdit, activeTab, setActiveTab,
  showWeChat, setShowWeChat, setIsAddingContact, isAddingContact,
  newContact, setNewContact, handleAddContact, setEditingContact,
  setVisitContact, handleAnalyzeContact, analyzingContactId,
  todoTasks, navigateTo, followUpPlans, isUpdatingPersona,
  handleUpdatePersona, personas, setPersonas, setEditingPersona,
  groupChats, selectedChat, setSelectedChat, chatSubTab, setChatSubTab,
  isSyncingChats, handleSyncChats, currentMonth, setCurrentMonth,
  selectedDate, setSelectedDate, setIsAddingToDate, handleOpenPlanDetails,
  communications, onAddCommunication,
  onCreateFollowupTask
}: CustomerDetailProps) => {

  const relatedInquiryIds = [
    ...(selectedCustomer.inquiryIds || []),
    ...initialInquiries.filter(i => i.companyName === selectedCustomer.name).map(i => i.id)
  ];
  const relatedLeadIds = [
    ...(selectedCustomer.leadIds || []),
    ...initialLeads.filter(l => l.customerName === selectedCustomer.name).map(l => l.id)
  ];
  const relatedOppIds = [
    ...(selectedCustomer.opportunityIds || []),
    ...initialOpportunities.filter(o => o.customerName === selectedCustomer.name).map(o => o.id)
  ];
  const relatedProjectIds = [
    ...(selectedCustomer.projectIds || []),
    ...initialProjects.filter(p => p.customerName === selectedCustomer.name).map(p => p.id)
  ];
  const allRelatedIds = Array.from(new Set([...relatedInquiryIds, ...relatedLeadIds, ...relatedOppIds, ...relatedProjectIds]));
  const customerTasks = Array.from(new Map(
    [...(followUpPlans || []), ...(todoTasks || [])]
      .filter((p: any) => p?.associatedCustomerId === selectedCustomer.id)
      .map((p: any) => [p.id, p])
  ).values());
  const pendingTasks = customerTasks.filter((t: any) => t.status !== '已完成' && t.status !== '已取消');
  const completedTasks = customerTasks.filter((t: any) => t.status === '已完成');
  const latestFollowUpText = useMemo(() => {
    const first = (selectedCustomer.followUps || [])[0];
    if (!first) return '暂无跟进记录';
    return `${first.date || ''} ${first.content || ''}`.trim() || '暂无跟进记录';
  }, [selectedCustomer.followUps]);

  const [customerFrameworks, setCustomerFrameworks] = useState<Record<string, any>>(
    () => loadLocalState<Record<string, any>>('crm.activation_frameworks', {})
  );
  const activeFramework = customerFrameworks[selectedCustomer.id] || { stages: [] };
  const [frameworkEditMode, setFrameworkEditMode] = useState(false);
  const [frameworkLoading, setFrameworkLoading] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchUsersFromSupabase().then(users => {
      if (users && users.length > 0) {
        setDbEmployees(users.map(u => ({ id: u.id, name: u.name, role: u.role })));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    saveLocalState('crm.activation_frameworks', customerFrameworks);
  }, [customerFrameworks]);

  const upsertCurrentCustomerFramework = (next: any) => {
    setCustomerFrameworks((prev) => ({
      ...prev,
      [selectedCustomer.id]: {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        updatedAt: new Date().toISOString(),
        frameworkText: String(next.frameworkText || ''),
        stages: Array.isArray(next.stages) ? next.stages : []
      }
    }));
  };

  const updateStageTitle = (idx: number, title: string) => {
    const stages = [...(activeFramework.stages || [])];
    if (!stages[idx]) return;
    stages[idx] = { ...stages[idx], title };
    upsertCurrentCustomerFramework({ ...activeFramework, stages });
  };

  const addStage = () => {
    const stages = [...(activeFramework.stages || []), { id: `stage_${Date.now()}`, title: `新阶段${(activeFramework.stages || []).length + 1}`, status: '待推进' }];
    upsertCurrentCustomerFramework({ ...activeFramework, stages });
  };

  const removeStage = (idx: number) => {
    const stages = [...(activeFramework.stages || [])];
    stages.splice(idx, 1);
    upsertCurrentCustomerFramework({ ...activeFramework, stages });
  };

  const createTaskFromStages = (stageTitles: string[] = []) => {
    const isMerged = stageTitles.length > 1;
    const stageLabel = stageTitles.join('、');
    const task: TodoTask = {
      id: generateBusinessId(ID_PREFIX.TASK, customerTasks),
      title: stageTitles.length > 0 ? `${isMerged ? '合并阶段拜访任务' : '阶段拜访任务'}：${stageLabel}` : `拜访任务：${selectedCustomer.name}`,
      description: stageTitles.length > 0 ? `基于客户阶次拜访框架阶段【${stageLabel}】生成` : '不对应阶段的拜访任务',
      dueDate: new Date().toISOString().slice(0, 10),
      status: '待办',
      importance: '中',
      urgency: '正常',
      assignee: selectedCustomer.salesRep || '待分配',
      assigneeName: selectedCustomer.salesRep || '待分配',
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      createDate: new Date().toISOString().slice(0, 10),
      taskType: '客户激活任务',
      sourceType: 'customer',
      sourceId: selectedCustomer.id,
      associatedCustomerId: selectedCustomer.id,
      associatedCustomerName: selectedCustomer.name,
      activationFrameworkStageTitle: stageTitles.length > 0 ? stageLabel : undefined
    } as any;
    onCreateFollowupTask?.(task);
    toast.success(stageTitles.length > 0 ? (isMerged ? '已按多个阶次合并生成任务' : '已按单阶次生成拜访任务') : '已生成不对应阶段的拜访任务');
  };

  const parseStagesFromText = (text: string) => {
    const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const candidates = lines.filter((l) => /^(\d+[\.\)]|阶段|step|Step)/.test(l));
    const raw = (candidates.length > 0 ? candidates : lines.slice(0, 6)).slice(0, 8);
    return raw.map((line, idx) => ({
      id: `stage_${Date.now()}_${idx + 1}`,
      title: line.replace(/^(\d+[\.\)]\s*|阶段\s*\d+[:：]?\s*|step\s*\d+[:：]?\s*)/i, '').trim() || `阶段${idx + 1}`,
      status: '待推进'
    }));
  };

  const generateFrameworkByAiFollowup = async () => {
    const persona = personas.find((p) => p.customerId === selectedCustomer.id);
    const hasPersonaData = Object.entries((persona as any)?.dynamicData || {}).some(([k, v]) => {
      if (String(k).startsWith('__')) return false;
      return String(v || '').trim().length > 0;
    });
    const hasContactData = Array.isArray(selectedCustomer.contacts) && selectedCustomer.contacts.length > 0;
    if (!hasPersonaData || !hasContactData) {
      toast.error('请先补充客户画像和联系人信息');
      return;
    }
    try {
      setFrameworkLoading(true);
      const cfg = await fetchPersonaAiConfig();
      const personaSummary = Object.entries((persona as any)?.dynamicData || {})
        .filter(([k]) => !String(k).startsWith('__'))
        .map(([k, v]) => `${k}: ${String(v || '')}`)
        .join('\n') || '暂无画像数据';
      const followUps = (selectedCustomer.followUps || []).slice(0, 10).map((f) => `${f.date || ''} ${f.content || ''}`).join('\n') || '暂无跟进记录';
      const contacts = (selectedCustomer.contacts || []).map((c: any) => `${c.name || ''}/${c.position || ''}/角色:${c.roleTag || '-'}/态度:${c.attitudeScore ?? '-'}/影响:${c.influenceLevel ?? '-'}`).join('\n') || '暂无联系人';
      const basePrompt = String((cfg as any)?.followUpPrompt || '');
      const prompt = [
        basePrompt,
        `客户：${selectedCustomer.name}`,
        `行业：${selectedCustomer.industry || '-'}`,
        `客户画像：\n${personaSummary}`,
        `联系人：\n${contacts}`,
        `历史拜访/聊天：\n${followUps}`,
        '请重点输出“客户阶次拜访框架”，每个阶段独立一行，便于拆分。'
      ].join('\n\n');
      const text = await callAiProxy(prompt, (cfg as any)?.model);
      const stages = parseStagesFromText(text || '');
      upsertCurrentCustomerFramework({
        ...activeFramework,
        frameworkText: text || '',
        stages
      });
      setFrameworkEditMode(false);
      setSelectedStageIds([]);
      toast.success('AI跟进建议已生成客户阶次拜访框架');
    } catch (error) {
      console.error(error);
      toast.error('AI跟进建议生成失败');
    } finally {
      setFrameworkLoading(false);
    }
  };

  const tabs = [
    { id: 'communications', label: '沟通', icon: MessageSquare },
    { id: 'contacts', label: '联系人', icon: Users },
    { id: 'persona', label: '画像', icon: Target },
    { id: 'swot', label: 'SWOT', icon: Target },
    { id: 'related', label: '关联', icon: LinkIcon },
    { id: 'plans', label: '拜访', icon: ListTodo }
  ];

  return (
    <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 lg:gap-4 overflow-hidden">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-gray-900 font-bold truncate">{selectedCustomer.name}</span>
          {selectedCustomer.customerNumber && (
            <span className="text-xs text-gray-500 shrink-0">({selectedCustomer.customerNumber})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ReservedButtons moduleCode="customer_management" contextData={selectedCustomer} />
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Edit2 className="w-4 h-4" />
            编辑客户
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name || '-'}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700">{selectedCustomer.level || '-'}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-600">{selectedCustomer.status || '-'}</span>
            </div>
            <div className="text-sm text-gray-500">行业：{selectedCustomer.industry || '-'} · 区域：{selectedCustomer.region || '-'}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 min-w-[260px]">
            <p className="text-xs text-gray-500">最近跟进</p>
            <p className="text-xs font-medium text-gray-700 line-clamp-2 mt-1">{latestFollowUpText}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">客户编号</p>
            <p className="font-medium text-gray-900">{selectedCustomer.customerNumber || selectedCustomer.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户名称</p>
            <p className="font-medium text-gray-900">{selectedCustomer.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户简称</p>
            <p className="font-medium text-gray-900">{selectedCustomer.shortName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">英文名称</p>
            <p className="font-medium text-gray-900">{selectedCustomer.englishName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户等级</p>
            <p className="font-medium text-gray-900">{selectedCustomer.level || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户状态</p>
            <p className="font-medium text-gray-900">{selectedCustomer.status || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">行业</p>
            <p className="font-medium text-gray-900">{selectedCustomer.industry || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户来源</p>
            <p className="font-medium text-gray-900">{selectedCustomer.source || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">区域</p>
            <p className="font-medium text-gray-900">{selectedCustomer.region || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">销售负责人</p>
            <p className="font-medium text-gray-900">{selectedCustomer.salesRep || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">业务经理</p>
            <p className="font-medium text-gray-900">{selectedCustomer.businessManager || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">跟单员</p>
            <p className="font-medium text-gray-900">{selectedCustomer.merchandiser || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">客户类型</p>
            <p className="font-medium text-gray-900">{selectedCustomer.customerType || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">币别</p>
            <p className="font-medium text-gray-900">{selectedCustomer.currency || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">账期</p>
            <p className="font-medium text-gray-900">{selectedCustomer.paymentTerm || (selectedCustomer.hasPaymentTerm ? '有' : '无')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">统一社会信用代码</p>
            <p className="font-medium text-gray-900">{selectedCustomer.unifiedSocialCreditCode || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">网址</p>
            {selectedCustomer.website ? (
              <a href={selectedCustomer.website.startsWith('http') ? selectedCustomer.website : `https://${selectedCustomer.website}`} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline">
                {selectedCustomer.website}
              </a>
            ) : (
              <p className="font-medium text-gray-900">-</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">创建时间</p>
            <p className="font-medium text-gray-900">{selectedCustomer.createDate || '-'}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-sm text-gray-500 mb-1">公司地址</p>
            <p className="font-medium text-gray-900">{selectedCustomer.companyAddress || '-'}</p>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <p className="text-sm text-gray-500 mb-1">备注</p>
            <p className="font-medium text-gray-900">{(selectedCustomer as any).notes || '-'}</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'contacts' && (
        <StakeholderMapPanel
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          contacts={selectedCustomer.contacts || []}
          compact
        />
      )}

      {activeTab === 'communications' && (
        <CommunicationLog
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          aiContactProfiles={selectedCustomer.contacts || []}
          communications={communications}
          onAddCommunication={onAddCommunication}
          contacts={(selectedCustomer.contacts || []).map((c: any) => ({ id: c.id, name: c.name, position: c.position, wechatId: c.wechatId }))}
          employees={dbEmployees.length > 0 ? dbEmployees : initialUsers.map((u: any) => ({ id: u.id, name: u.name, role: u.role }))}
          groupChats={groupChats}
          onManageMembers={(chat) => setSelectedChat(chat)}
        />
      )}

      {activeTab === 'persona' && (
        <CustomerPersonaPanel
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          personas={personas}
          setPersonas={setPersonas}
        />
      )}
      {activeTab === 'swot' && (
        <SwotMatrixPanel
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          contacts={selectedCustomer.contacts || []}
          persona={personas.find((p) => p.customerId === selectedCustomer.id) || null}
          communicationHighlights={(selectedCustomer.followUps || []).map((f) => `${f.date || ''} ${f.content || ''}`).slice(0, 20)}
        />
      )}

      {activeTab === 'related' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-indigo-500" />
            关联单据
          </h3>
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">上游/过程记录</p>
              <div className="space-y-2">
                {relatedInquiryIds.map(id => (
                  <div key={id} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                    <span className="text-gray-600">关联询盘</span>
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('inquiries', id)}>{id}</span>
                  </div>
                ))}
                {relatedLeadIds.map(id => (
                  <div key={id} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                    <span className="text-gray-600">关联线索</span>
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('leads', id)}>{id}</span>
                  </div>
                ))}
                {relatedOppIds.map(id => (
                  <div key={id} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                    <span className="text-gray-600">关联商机</span>
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('opportunities', id)}>{id}</span>
                  </div>
                ))}
                {relatedProjectIds.map(id => (
                  <div key={id} className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                    <span className="text-gray-600">关联项目</span>
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('projects', id)}>{id}</span>
                  </div>
                ))}
                {relatedInquiryIds.length + relatedLeadIds.length + relatedOppIds.length + relatedProjectIds.length === 0 && (
                  <div className="text-sm text-gray-400">暂无上游关联记录</div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">报价单 ({initialQuotations.filter(q => q.customerName === selectedCustomer.name).length})</p>
              <div className="space-y-2">
                {initialQuotations.filter(q => q.customerName === selectedCustomer.name).map(q => (
                  <div key={q.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('quotations', q.id)}>{q.quoteNo || q.id}</span>
                    <span className="text-gray-500">¥{Number(q.totalAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">订单 ({initialOrders.filter(o => o.customerName === selectedCustomer.name).length})</p>
              <div className="space-y-2">
                {initialOrders.filter(o => o.customerName === selectedCustomer.name).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => navigateTo?.('sales', o.id)}>{o.orderNo || o.id}</span>
                    <span className="text-gray-500">¥{Number(o.totalAmount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-3">拜访计划</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-700">客户阶次拜访框架</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateFrameworkByAiFollowup}
                    disabled={frameworkLoading}
                    className="px-2 py-1 text-xs rounded bg-purple-600 text-white disabled:opacity-60"
                  >
                    {frameworkLoading ? '生成中...' : 'AI跟进建议'}
                  </button>
                  <button
                    onClick={() => setFrameworkEditMode((v) => !v)}
                    className="px-2 py-1 text-xs rounded border border-indigo-200 bg-white text-indigo-700"
                  >
                    {frameworkEditMode ? '结束编辑' : '编辑'}
                  </button>
                  {frameworkEditMode && (
                    <>
                      <button onClick={addStage} className="px-2 py-1 text-xs rounded border border-indigo-200 bg-white text-indigo-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" />新增阶次</button>
                      <button onClick={() => upsertCurrentCustomerFramework(activeFramework)} className="px-2 py-1 text-xs rounded bg-indigo-600 text-white flex items-center gap-1"><Save className="w-3.5 h-3.5" />保存</button>
                    </>
                  )}
                </div>
              </div>
              {(activeFramework.stages || []).length === 0 && (
                <div className="rounded-lg border border-dashed border-indigo-200 bg-white p-3 text-sm text-indigo-600">
                  当前无客户阶次拜访框架，请先点击“AI跟进建议”生成。
                </div>
              )}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {(activeFramework.stages || []).map((s: any, idx: number) => (
                  <div key={s.id || idx} className="p-2 rounded-lg border border-indigo-100 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStageIds.includes(String(s.id || idx))}
                        onChange={(e) => {
                          const id = String(s.id || idx);
                          setSelectedStageIds((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id));
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                        disabled={frameworkEditMode}
                      />
                      <span className="text-xs text-indigo-600">阶段{idx + 1}</span>
                      {frameworkEditMode ? (
                        <input
                          value={s.title || ''}
                          onChange={(e) => updateStageTitle(idx, e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                          placeholder="请输入阶段名称"
                        />
                      ) : (
                        <div className="flex-1 px-2 py-1 text-sm text-gray-800">{s.title || '-'}</div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {frameworkEditMode ? (
                        <button className="text-[11px] text-red-500 hover:underline" onClick={() => removeStage(idx)}>删除</button>
                      ) : <div />}
                      <button className="px-2 py-1 text-[11px] rounded bg-emerald-600 text-white" onClick={() => createTaskFromStages([s.title || `阶段${idx + 1}`])}>按该阶次生成任务</button>
                    </div>
                  </div>
                ))}
                {(activeFramework.stages || []).length === 0 && (
                  <div className="text-sm text-indigo-500">暂无阶次，请先新增并编辑。</div>
                )}
              </div>
              {!frameworkEditMode && (
                <button
                  className="w-full px-3 py-1.5 text-xs rounded bg-emerald-600 text-white disabled:opacity-50"
                  disabled={selectedStageIds.length < 2}
                  onClick={() => {
                    const titles = (activeFramework.stages || [])
                      .filter((s: any, idx: number) => selectedStageIds.includes(String(s.id || idx)))
                      .map((s: any, idx: number) => s.title || `阶段${idx + 1}`);
                    createTaskFromStages(titles);
                  }}
                >
                  合并所选阶次生成一个任务
                </button>
              )}
              <button className="w-full px-3 py-1.5 text-xs rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" onClick={() => createTaskFromStages([])}>生成不对应阶段的拜访任务</button>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900">实际拜访任务</h4>
                <span className="text-xs text-gray-500">{customerTasks.length} 条</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {customerTasks.map((p: any) => (
                  <div key={p.id} className="p-3 border border-gray-100 rounded-lg text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{p.title}</div>
                      <div className="text-gray-500">截止：{p.dueDate} | 状态：{p.status}</div>
                      <div className="text-[11px] text-indigo-600 mt-1">
                        对应阶段：{(p as any).activationFrameworkStageTitle || '未关联阶段'}
                      </div>
                    </div>
                    <button className="text-xs text-indigo-600" onClick={() => handleOpenPlanDetails(p)}>详情</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
