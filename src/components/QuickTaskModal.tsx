import { toast } from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mic, Square, Save, User, Tag, FileText, Building2, Briefcase, Users, Calendar, Search, Plus } from 'lucide-react';
import { TodoTask, TaskType, User as UserType } from '../types';
import { loadLocalState } from '../lib/localState';
import { generateBusinessId, ID_PREFIX } from '../lib/idUtils';
import UniversalSelector from './UniversalSelector';
import SelectionModal from './SelectionModal';
import { fetchProjectsFromSupabase } from '../lib/projectRepository';
import { addCustomerContactQuickToSupabase, fetchCustomersModuleDataFromSupabase } from '../lib/customerRepository';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: TodoTask) => void;
  currentUser?: UserType;
  initialData?: {
    title?: string;
    module?: string;
    relatedId?: string;
    contactId?: string;
    contactName?: string;
  };
}

export default function QuickTaskModal({ isOpen, onClose, onSave, currentUser, initialData }: QuickTaskModalProps) {
  const [targetUserId, setTargetUserId] = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [assignorId, setAssignorId] = useState(currentUser?.id || 'EMP001');
  const [assignorName, setAssignorName] = useState('');
  const [urgency, setUrgency] = useState<'非常紧急' | '紧急' | '正常' | '闲时'>('正常');
  const [assistantIds, setAssistantIds] = useState<string[]>([]);
  const [assistantNames, setAssistantNames] = useState<string[]>([]);
  const [taskTypes] = useState<TaskType[]>(() => loadLocalState<TaskType[]>('crm_task_types', []));
  const [taskType, setTaskType] = useState(initialData?.contactName ? '客户激活任务' : '常规任务');
  const [content, setContent] = useState(initialData?.title || '');
  const [dueDate, setDueDate] = useState('');
  const [dueDateManual, setDueDateManual] = useState(false);
  const [customerId, setCustomerId] = useState(initialData?.module === '客户' ? initialData.relatedId || '' : '');
  const [customerName, setCustomerName] = useState('');
  const [customerLevel, setCustomerLevel] = useState<string>('');
  const [projectId, setProjectId] = useState(initialData?.module === '项目' ? initialData.relatedId || '' : '');
  const [contactId, setContactId] = useState(initialData?.contactId || '');
  const [contactName, setContactName] = useState(initialData?.contactName || '');
  const [customerContacts, setCustomerContacts] = useState<any[]>([]);
  const [auxiliaryData, setAuxiliaryData] = useState<Record<string, any>>({});
  const [quickNewContact, setQuickNewContact] = useState({ name: '', phone: '', position: '' });
  
  const selectedTaskTypeObj = taskTypes.find(t => t.name === taskType);
  const isVisit = taskType === '客户拜访' || taskType === '拜访';
  const customFields = (selectedTaskTypeObj?.fields || []).filter(f => !['assignee', 'customer', 'project', 'priority', 'date', 'contact'].includes(f.id));

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showAssignorSelection, setShowAssignorSelection] = useState(false);
  const [showAssistantSelection, setShowAssistantSelection] = useState(false);
  const [showCustomerSelection, setShowCustomerSelection] = useState(false);
  const [showContactSelection, setShowContactSelection] = useState(false);
  const [showQuickAddContact, setShowQuickAddContact] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [activeAuxiliaryField, setActiveAuxiliaryField] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [remoteProjects, customerData] = await Promise.all([
          fetchProjectsFromSupabase(),
          fetchCustomersModuleDataFromSupabase()
        ]);
        setProjectOptions(remoteProjects as any[]);
        setCustomerOptions(customerData.customers || []);
      } catch (error) {
        console.error('Error fetching projects in task modal:', error);
      }
    };
    loadBaseData();
  }, []);

  useEffect(() => {
    if (taskType === '常规任务' && taskTypes.length > 0 && taskTypes[0]?.name) {
      setTaskType(initialData?.contactName ? '客户激活任务' : taskTypes[0].name);
    }
  }, [taskTypes, taskType, initialData?.contactName]);

  const getDueDateByHours = (hours: number) => {
    const base = new Date();
    base.setHours(base.getHours() + Math.max(1, hours || 24));
    return base.toISOString().split('T')[0];
  };

  const resolveAutoDueDate = () => {
    const type = taskTypes.find(t => t.name === taskType);
    const fallbackHours = Number(type?.defaultHours || 24);
    const rules = Array.isArray(type?.responseTimeRules) ? type!.responseTimeRules! : [];
    for (const rule of rules) {
      const conds = Array.isArray(rule.condition) ? rule.condition : [];
      const hit = conds.length > 0 && conds.every((c: any) => {
        if (c.fieldId !== 'customer_level') return false;
        if (c.operator === 'equals') return String(customerLevel || '') === String(c.value || '');
        if (c.operator === 'contains') return String(customerLevel || '').includes(String(c.value || ''));
        return false;
      });
      if (hit && Number.isFinite(Number(rule.hours)) && Number(rule.hours) > 0) {
        return getDueDateByHours(Number(rule.hours));
      }
    }
    return getDueDateByHours(fallbackHours);
  };

  useEffect(() => {
    if (!dueDateManual) {
      setDueDate(resolveAutoDueDate());
    }
  }, [taskType, customerLevel, dueDateManual]);

  useEffect(() => {
    if (!customerId) {
      setCustomerContacts([]);
      setContactId('');
      setContactName('');
      return;
    }
    const customer = customerOptions.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name || '');
      setCustomerLevel(customer.level || '');
      setCustomerContacts(customer.contacts || []);
    }
  }, [customerId, customerOptions]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      const win = window as any;
      const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechCtor) {
        toast.error('当前浏览器不支持语音转文字，请改用手动输入。');
        return;
      }
      const recognition = new SpeechCtor();
      recognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          text += event.results[i][0]?.transcript || '';
        }
        if (text.trim()) {
          setContent(prev => prev + (prev ? '\n' : '') + text.trim());
        }
      };
      recognition.onerror = () => {
        toast.error('语音识别失败，请重试。');
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error start speech recognition:', error);
      toast.error('无法启动语音识别，请检查麦克风权限。');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleQuickAddContact = async () => {
    if (!customerId) {
      toast.error('请先选择客户');
      return;
    }
    if (!quickNewContact.name.trim()) {
      toast.error('请填写联系人姓名');
      return;
    }
    try {
      const inserted = await addCustomerContactQuickToSupabase(customerId, quickNewContact);
      const appended = {
        id: inserted.id,
        name: inserted.name || quickNewContact.name,
        phone: inserted.phone || quickNewContact.phone,
        position: inserted.position || quickNewContact.position
      };
      setCustomerContacts(prev => [appended, ...prev]);
      setContactId(appended.id);
      setContactName(appended.name);
      setQuickNewContact({ name: '', phone: '', position: '' });
      setShowQuickAddContact(false);
      toast.success('联系人已添加并选中');
    } catch (error) {
      console.error('quick add contact failed', error);
      toast.error('联系人添加失败，请稍后重试');
    }
  };

  const handleSave = () => {
    const finalAssigneeId = auxiliaryData['assignee'] || targetUserId;
    const finalCustomerId = auxiliaryData['customer'] || customerId;
    const finalProjectId = auxiliaryData['project'] || projectId;
    const finalPriority = auxiliaryData['priority'] || '';
    const finalDueDate = auxiliaryData['date'] || dueDate;
    const finalContactId = contactId || undefined;
    const finalContactName = contactName || undefined;

    if ((!isVisit && !finalAssigneeId) || !content || !assignorId || !finalDueDate || !urgency) {
      toast.error('请填写必要信息（内容、负责人、下达人、截止日期、紧急程度）');
      return;
    }
    if (isVisit && !finalContactName) {
      toast.error('请选择或输入客户联系人');
      return;
    }

    const project = projectOptions.find(p => p.id === finalProjectId);

    const newTask: TodoTask = {
      id: generateBusinessId(ID_PREFIX.TASK),
      title: isVisit ? `拜访: ${customerName || '未知客户'} - ${contactName}` : content.slice(0, 20) + (content.length > 20 ? '...' : ''),
      assignee: isVisit ? (currentUser?.name || '系统管理员') : (targetUserName || ''),
      assigneeId: isVisit ? (currentUser?.id || 'EMP001') : String(finalAssigneeId || ''),
      assigneeName: isVisit ? (currentUser?.name || '系统管理员') : (targetUserName || ''),
      assignorId: assignorId,
      assignorName: assignorName || currentUser?.name || undefined,
      assistants: assistantIds,
      urgency: urgency,
      taskType: taskType as any,
      description: content,
      dueDate: finalDueDate || new Date().toISOString().split('T')[0],
      sourceType: isVisit ? 'visit' : 'manual',
      associatedCustomerId: finalCustomerId,
      associatedCustomerName: customerName || undefined,
      associatedProjectId: finalProjectId,
      associatedProject: project?.projectName,
      associatedContactId: isVisit ? finalContactId : undefined,
      associatedContactName: isVisit ? finalContactName : undefined,
      contactName: isVisit ? finalContactName : undefined,
      visitType: isVisit ? '现场拜访' : undefined,
      auxiliaryData: finalPriority ? { ...auxiliaryData, priority: finalPriority } : { ...auxiliaryData },
      status: '待办',
      checked: false,
      createDate: new Date().toISOString().split('T')[0],
      creatorId: assignorId || currentUser?.id || 'EMP001',
      creatorNo: currentUser?.employeeNo || 'E001',
      creatorName: assignorName || currentUser?.name || '系统管理员'
    };

    onSave(newTask);
    // Reset
    setTargetUserId('');
    setTargetUserName('');
    setAssignorId(currentUser?.id || 'EMP001');
    setAssignorName('');
    setUrgency('正常');
    setAssistantIds([]);
    setAssistantNames([]);
    setTaskType(taskTypes[0]?.name || '常规任务');
    setContent('');
    setDueDate(resolveAutoDueDate());
    setDueDateManual(false);
    setCustomerId('');
    setCustomerName('');
    setCustomerLevel('');
    setProjectId('');
    setContactId('');
    setContactName('');
    setCustomerContacts([]);
    setAuxiliaryData({});
    onClose();
  };

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">快速下达任务</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Assignee Selection - Required, show first */}
          {!selectedTaskTypeObj?.fields?.some(f => f.id === 'assignee') && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 text-indigo-500" />
                负责人 <span className="text-red-500">*</span> {isVisit && <span className="text-xs text-gray-400">(拜访任务默认为本人)</span>}
              </label>
              <button
                type="button"
                onClick={() => !isVisit && setShowUserSelection(true)}
                disabled={isVisit}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 disabled:opacity-60 flex items-center justify-between text-left"
              >
                <span className={targetUserId || isVisit ? 'text-gray-900' : 'text-gray-400'}>
                  {isVisit ? (currentUser?.name || '系统管理员') : (targetUserName || (targetUserId ? targetUserId : '') || '请选择负责人...')}
                </span>
                {!isVisit && <Search className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              任务类型
            </label>
            <div className="flex flex-wrap gap-2">
              {(taskTypes.length > 0 ? taskTypes : [{ id: 'default', name: '常规任务', defaultHours: 24 }]).map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setTaskType(type.name);
                    setAuxiliaryData({}); // Reset auxiliary data when type changes
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    taskType === type.name 
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500' 
                      : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Assignor Selection - Required */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 text-indigo-500" />
              下达人 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAssignorSelection(true)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 flex items-center justify-between text-left"
            >
              <span className={assignorId ? 'text-gray-900' : 'text-gray-400'}>
                {assignorName || (assignorId ? assignorId : '') || '请选择下达人...'}
              </span>
              <Search className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Assistants Selection - Optional (Multiple) */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 text-indigo-500" />
              协助人 (可多选)
            </label>
            <button
              type="button"
              onClick={() => setShowAssistantSelection(true)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 flex items-center justify-between text-left"
            >
              <span className={assistantIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                {assistantIds.length > 0 
                  ? (assistantNames.length > 0 ? assistantNames.join(', ') : assistantIds.join(', '))
                  : '请选择协助人...'}
              </span>
              <Search className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Urgency Selection - Required */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              紧急程度 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['非常紧急', '紧急', '正常', '闲时'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                    urgency === u 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Selection - Always show at top for visits, or if not in dynamic fields */}
          {(isVisit || !selectedTaskTypeObj?.fields?.some(f => f.id === 'customer')) && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                关联客户 {isVisit && <span className="text-red-500">*</span>}
              </label>
              <button
                type="button"
                onClick={() => setShowCustomerSelection(true)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 flex items-center justify-between text-left"
              >
                <span className={customerId ? 'text-gray-900' : 'text-gray-400'}>
                {customerName || (customerId ? customerId : '') || '请选择客户...'}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}

          {/* Contact Selection for Visits */}
          {isVisit && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                客户联系人 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowContactSelection(true)}
                  disabled={!customerId}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 disabled:opacity-50 flex items-center justify-between text-left"
                >
                  <span className={contactName ? 'text-gray-900' : 'text-gray-400'}>
                    {contactName || (customerId ? '选择客户联系人...' : '请先选择客户')}
                  </span>
                  <Search className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAddContact(v => !v)}
                  disabled={!customerId}
                  className="w-full px-3 py-2 border border-dashed border-indigo-300 rounded-lg text-xs text-indigo-700 bg-indigo-50/50 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  没有联系人？快捷添加
                </button>
                {showQuickAddContact && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border border-indigo-100 rounded-lg bg-indigo-50/40">
                    <input
                      type="text"
                      placeholder="姓名*"
                      value={quickNewContact.name}
                      onChange={(e) => setQuickNewContact(prev => ({ ...prev, name: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="电话"
                      value={quickNewContact.phone}
                      onChange={(e) => setQuickNewContact(prev => ({ ...prev, phone: e.target.value }))}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs"
                    />
                    <div className="flex gap-2 sm:col-span-2">
                      <input
                        type="text"
                        placeholder="职位"
                        value={quickNewContact.position}
                        onChange={(e) => setQuickNewContact(prev => ({ ...prev, position: e.target.value }))}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddContact}
                        className="px-4 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
                      >
                        确认新增
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project Selection - Only if not in dynamic fields */}
          {!selectedTaskTypeObj?.fields?.some(f => f.id === 'project') && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                关联项目 (选填)
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!customerId) {
                    toast.error('请先选择客户');
                    return;
                  }
                  setShowProjectSelection(true);
                }}
                disabled={!customerId}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 disabled:opacity-50 flex items-center justify-between text-left"
              >
                <span className={projectId ? 'text-gray-900' : 'text-gray-400'}>
                  {projectOptions.find(p => p.id === projectId)?.projectName || (customerId ? '请选择项目...' : '请先选择客户')}
                </span>
                <Search className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              截止日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setDueDateManual(true);
              }}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"
            />
            <p className="text-[11px] text-gray-500 mt-1">默认按任务类型时效自动计算，可手动覆盖。</p>
          </div>

          {customFields.length > 0 && (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-4">
              <h4 className="text-sm font-medium text-indigo-900 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                附加信息
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {field.name} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={auxiliaryData[field.id] || ''}
                        onChange={(e) => setAuxiliaryData({ ...auxiliaryData, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">请选择...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'customer' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAuxiliaryField(field.id);
                          setShowCustomerSelection(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex items-center justify-between text-left"
                      >
                        <span className={auxiliaryData[field.id] ? 'text-gray-900' : 'text-gray-400'}>
                          {auxiliaryData[field.id] || '请选择客户...'}
                        </span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                    ) : field.type === 'project' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAuxiliaryField(field.id);
                          setShowProjectSelection(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex items-center justify-between text-left"
                      >
                        <span className={auxiliaryData[field.id] ? 'text-gray-900' : 'text-gray-400'}>
                          {projectOptions.find(p => p.id === auxiliaryData[field.id])?.projectName || '请选择项目...'}
                        </span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                    ) : field.type === 'user' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAuxiliaryField(field.id);
                          setShowUserSelection(true);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex items-center justify-between text-left"
                      >
                        <span className={auxiliaryData[field.id] ? 'text-gray-900' : 'text-gray-400'}>
                          {auxiliaryData[field.id] || '请选择人员...'}
                        </span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                    ) : field.type === 'priority' ? (
                      <select
                        value={auxiliaryData[field.id] || ''}
                        onChange={(e) => setAuxiliaryData({ ...auxiliaryData, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">请选择优先级...</option>
                        {['非常紧急', '紧急', '普通', '计划'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={auxiliaryData[field.id] || ''}
                        onChange={(e) => setAuxiliaryData({ ...auxiliaryData, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={auxiliaryData[field.id] || ''}
                        onChange={(e) => setAuxiliaryData({ ...auxiliaryData, [field.id]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder={`输入${field.name}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                任务内容
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isRecording 
                    ? 'bg-red-100 text-red-700 animate-pulse' 
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    停止录音
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3" />
                    语音输入
                  </>
                )}
              </button>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入任务详细内容，或点击上方语音输入..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none bg-gray-50"
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Save className="w-5 h-5" />
            快速下达
          </button>
        </div>
      </div>

      {showAssignorSelection && (
        <UniversalSelector
          type="user"
          onSelect={(user) => {
            setAssignorId(user.id);
            setAssignorName(user.name || '');
            setShowAssignorSelection(false);
          }}
          onClose={() => setShowAssignorSelection(false)}
          selectedId={assignorId}
        />
      )}

      {showAssistantSelection && (
        <UniversalSelector
          type="user"
          multiple
          onSelectMultiple={(users) => {
            setAssistantIds(users.map(u => u.id));
            setAssistantNames(users.map(u => u.name));
            setShowAssistantSelection(false);
          }}
          onClose={() => setShowAssistantSelection(false)}
          selectedIds={assistantIds}
        />
      )}

      {showUserSelection && (
        <UniversalSelector
          type="user"
          onSelect={(user) => {
            if (activeAuxiliaryField) {
              setAuxiliaryData({ ...auxiliaryData, [activeAuxiliaryField]: user.id });
              setActiveAuxiliaryField(null);
            } else {
              setTargetUserId(user.id);
              setTargetUserName(user.name || '');
            }
            setShowUserSelection(false);
          }}
          onClose={() => setShowUserSelection(false)}
          selectedId={targetUserId}
        />
      )}

      {showCustomerSelection && (
        <UniversalSelector
          type="customer"
          onSelect={(customer) => {
            if (activeAuxiliaryField) {
              setAuxiliaryData({ ...auxiliaryData, [activeAuxiliaryField]: customer.id });
            } else {
              setCustomerId(customer.id);
              setCustomerName(customer.name || '');
              setContactId('');
              setContactName('');
              setProjectId('');
            }
            setShowCustomerSelection(false);
            setActiveAuxiliaryField(null);
          }}
          onClose={() => {
            setShowCustomerSelection(false);
            setActiveAuxiliaryField(null);
          }}
        />
      )}

      <SelectionModal
        isOpen={showContactSelection}
        onClose={() => setShowContactSelection(false)}
        title="选择客户联系人"
        items={customerContacts.map(c => ({ id: c.id, name: `${c.name}${c.position ? `（${c.position}）` : ''}` }))}
        onSelect={(item) => {
          setContactId(item.id);
          const found = customerContacts.find(c => c.id === item.id);
          setContactName(found?.name || item.name);
          setShowContactSelection(false);
        }}
      />

      <SelectionModal
        isOpen={showProjectSelection}
        onClose={() => {
          setShowProjectSelection(false);
          setActiveAuxiliaryField(null);
        }}
        title="选择项目"
        items={projectOptions
          .filter(p => p.customerId === customerId)
          .map(p => ({ id: p.id, name: p.projectName }))}
        onSelect={(item) => {
          if (activeAuxiliaryField) {
            setAuxiliaryData({ ...auxiliaryData, [activeAuxiliaryField]: item.id });
          } else {
            setProjectId(item.id);
          }
          setShowProjectSelection(false);
          setActiveAuxiliaryField(null);
        }}
      />
    </div>,
    document.body
  );
}
