import { toast } from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { Role, Customer, Contact, GroupChat, ChatMessage, TodoTask, CustomerPersona, PotentialCustomer, User, CommunicationDetail } from '../types';
import DetailModal from '../components/DetailModal';
import { callAiProxy } from '../lib/aiProxy';
import { differenceInDays } from 'date-fns';
import { CustomerList } from '../components/customers/CustomerList';
import { CustomerDetail } from '../components/customers/CustomerDetail';
import { PersonaEditModal, ContactEditModal } from '../components/customers/CustomerModals';
import PotentialCustomerList from '../components/customers/PotentialCustomerList';
import QuickTaskModal from '../components/QuickTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { fetchCustomersModuleDataFromSupabase, saveCustomersSnapshotToSupabase, savePersonasSnapshotToSupabase, saveVisitPlansSnapshotToSupabase, deleteCustomerFromSupabase, fetchCustomerCommunicationsFromSupabase, saveCustomerCommunicationToSupabase, fetchPotentialCustomerDetailFromSupabase } from '../lib/customerRepository';
import { convertPotentialCustomerToCustomerInSupabase, fetchPotentialCustomersFromSupabase } from '../lib/potentialCustomerRepository';
import { saveCustomerContactToSupabase, fetchCustomerContactsFromSupabase } from '../lib/customerInteractionRepository';
import { parseAiJson, parsePersonaDimensions } from '../lib/aiJson';
import { fetchPersonaAiConfig } from '../lib/personaAiConfigRepository';
import {
  CUSTOMER_CURRENCY_OPTIONS,
  CUSTOMER_REGION_OPTIONS,
  CUSTOMER_SOURCE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_INDUSTRY_OPTIONS,
  formatCustomerCurrencyLabel
} from '../lib/customerEnums';

interface CustomersProps {
  role: Role;
  currentUser?: User;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Customers({ role, currentUser, viewParams, navigateTo, goBack }: CustomersProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [listTab, setListTab] = useState<'customers' | 'potential'>('customers');
  const [activeTab, setActiveTab] = useState<'info' | 'contacts' | 'followups' | 'associations' | 'plans' | 'persona' | 'swot'>('info');
  const [filterLevel, setFilterLevel] = useState<string>('全部');
  const [filterIndustry, setFilterIndustry] = useState<string>('全部');
  const [filterOverdue, setFilterOverdue] = useState<boolean>(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);
  const [potentialCustomers, setPotentialCustomers] = useState<PotentialCustomer[]>([]);
  const [potentialSearchTerm, setPotentialSearchTerm] = useState('');
  const [isPotentialLoading, setIsPotentialLoading] = useState(false);
  const [showWeChat, setShowWeChat] = useState(false);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [todoTasks, setTodoTasks] = useState<TodoTask[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [personas, setPersonas] = useState<CustomerPersona[]>([]);
  const [isUpdatingPersona, setIsUpdatingPersona] = useState(false);
  const [editingPersona, setEditingPersona] = useState<CustomerPersona | null>(null);
  const [analyzingContactId, setAnalyzingContactId] = useState<string | null>(null);
  const handleInitiateVisitTask = (contact: Contact) => {
    if (!selectedCustomer) return;
    setNewPlan({
      dueDate: new Date().toISOString().split('T')[0],
      title: `客户激活任务：${selectedCustomer.name} - ${contact.name}`,
      associatedContactId: contact.id,
      associatedContactName: contact.name
    });
    setIsAddingToDate(true);
  };

  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [chatSubTab, setChatSubTab] = useState<'messages' | 'members'>('messages');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newPlan, setNewPlan] = useState<Partial<TodoTask>>({
    dueDate: '', title: ''
  });
  const [isAddingToDate, setIsAddingToDate] = useState(false);
  const [followUpPlans, setFollowUpPlans] = useState<TodoTask[]>([]);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: '', position: '', phone: '', email: '', isPrimary: false, age: undefined, personality: '', appellation: '', decisionPower: '', familySituation: '', hometown: '', hobbies: [], attitudeToUs: '中性评价', faction: '', managerContactId: '', videoChannelProfile: '', douyinProfile: '', xiaohongshuProfile: '', socialMediaBehavior: ''
  });
  const [displayCount, setDisplayCount] = useState(20);
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);
  const [isSelectingAssignee, setIsSelectingAssignee] = useState(false);
  const [recordingPlanId, setRecordingPlanId] = useState<string | null>(null);
  const [actualVisitContent, setActualVisitContent] = useState('');
  const [editingPlanContent, setEditingPlanContent] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [nextVisitTime, setNextVisitTime] = useState<string>('');
  const [isSelectingCustomerForEdit, setIsSelectingCustomerForEdit] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [customerCommunications, setCustomerCommunications] = useState<CommunicationDetail[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipNextCustomersAutoSyncRef = useRef(false);
  const isCustomersAutoSyncingRef = useRef(false);

  const normalizeCustomerCurrency = (customer: Customer): Customer => {
    const currencyId = String(customer.currencyId || '').trim();
    return {
      ...customer,
      currencyId,
      currency: formatCustomerCurrencyLabel(currencyId) || ''
    };
  };

  const normalizeCustomerName = (value: string) => String(value || '').trim().toLowerCase();
  const validateDuplicateCustomerName = (value: string) => {
    const customerName = String(value || '').trim();
    if (!customerName) return '';
    const existingCustomer = customers.find((customer) =>
      normalizeCustomerName(customer.name) === normalizeCustomerName(customerName)
    );
    return existingCustomer ? '该客户已存在' : '';
  };

  useEffect(() => {
    if (!viewParams) return;
    if (viewParams?.tab === 'potential') {
      setListTab('potential');
      return;
    }
    setListTab('customers');
    const resolvedId =
      typeof viewParams === 'string'
        ? viewParams
        : String(
            viewParams?.customerId ||
            viewParams?.id ||
            viewParams?.sourceId ||
            ''
          ).trim();
    const resolvedName =
      typeof viewParams === 'object'
        ? String(viewParams?.customerName || viewParams?.name || '').trim()
        : '';
    if (!resolvedId && !resolvedName) return;
    const customer = customers.find((c) =>
      resolvedId
        ? (c.id === resolvedId || c.customerNumber === resolvedId)
        : (resolvedName && (c.name === resolvedName || c.shortName === resolvedName))
    );
    if (customer) setSelectedCustomer(customer);
  }, [viewParams, customers]);

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerContactsFromSupabase(selectedCustomer.id).then(contacts => {
        setSelectedCustomer(prev => prev ? { ...prev, contacts: contacts as any } : prev);
      });
      fetchCustomerCommunicationsFromSupabase(selectedCustomer.id)
        .then(setCustomerCommunications)
        .catch((error) => {
          console.error('Error fetching customer communications:', error);
          setCustomerCommunications([]);
        });
    } else {
      setCustomerCommunications([]);
    }
  }, [selectedCustomer?.id]);

  const fetchRemote = async () => {
    try {
      const remote = await fetchCustomersModuleDataFromSupabase();
      setCustomers(remote.customers);
      setPersonas(remote.personas);
      setFollowUpPlans(remote.visitPlans);
      setTodoTasks(remote.visitPlans);
    } catch (error) {
      console.error('Error fetching customers module data:', error);
    } finally {
      setIsRemoteLoaded(true);
    }
  };

  useEffect(() => {
    fetchRemote();
  }, []);

  const refreshPotentialCustomers = async () => {
    setIsPotentialLoading(true);
    try {
      const list = await fetchPotentialCustomersFromSupabase(500);
      setPotentialCustomers(list);
    } catch (error) {
      console.error('Error fetching potential customers:', error);
      toast.error(`获取潜在客户失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
    } finally {
      setIsPotentialLoading(false);
    }
  };

  useEffect(() => {
    if (listTab === 'potential') {
      refreshPotentialCustomers();
    }
  }, [listTab]);

  useEffect(() => {
    if (!isRemoteLoaded) return; // 只有在远程数据加载完成后才保存
    if (skipNextCustomersAutoSyncRef.current) {
      skipNextCustomersAutoSyncRef.current = false;
      return;
    }
    if (isCustomersAutoSyncingRef.current) return;
    const timer = setTimeout(() => {
      isCustomersAutoSyncingRef.current = true;
      saveCustomersSnapshotToSupabase(customers)
        .then(updatedCustomers => {
          setCustomers((prev) => {
            if (prev.length !== updatedCustomers.length) return updatedCustomers;
            for (let i = 0; i < prev.length; i++) {
              if (String(prev[i]?.id || '') !== String(updatedCustomers[i]?.id || '')) return updatedCustomers;
              if (String(prev[i]?.customerNumber || '') !== String(updatedCustomers[i]?.customerNumber || '')) return updatedCustomers;
            }
            return prev;
          });
        })
        .catch((error) => {
          console.error('Error syncing customers:', error);
        })
        .finally(() => {
          isCustomersAutoSyncingRef.current = false;
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [customers, isRemoteLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      savePersonasSnapshotToSupabase(personas).catch((error) => {
        console.error('Error syncing customer personas:', error);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [personas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveVisitPlansSnapshotToSupabase(followUpPlans).catch((error) => {
        console.error('Error syncing customer visit plans:', error);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [followUpPlans]);

  const filteredCustomers = customers.filter(c => {
    if (c.level === '潜在客户') return false;
    if (filterLevel !== '全部' && c.level !== filterLevel) return false;
    if (filterIndustry !== '全部' && c.industry !== filterIndustry) return false;
    if (filterOverdue) {
      const freq = { '战略客户': 7, '成长型客户': 14, '普通客户': 30 }[c.level] || 30;
      const lastFollowUp = c.followUps[0]?.date || c.createDate;
      const daysSince = differenceInDays(new Date(), new Date(lastFollowUp));
      if (daysSince <= freq) return false;
    }
    if (
      searchTerm &&
      !c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !String(c.customerNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) return false;
    return true;
  });
  const uniqueIndustries = Array.from(
    new Set([
      ...CUSTOMER_INDUSTRY_OPTIONS,
      ...customers.map((c) => String(c.industry || '').trim()).filter(Boolean)
    ])
  );

  const handleSaveCustomer = (updatedData: Customer) => {
    const normalizedCustomer = normalizeCustomerCurrency(updatedData);
    setCustomers(customers.map(c => c.id === normalizedCustomer.id ? normalizedCustomer : c));
    setSelectedCustomer(normalizedCustomer);
    setIsEditing(false);
    toast.success('客户信息已保存');
  };

  const handleSyncChats = async () => {
    if (!selectedCustomer) return;
    setIsSyncingChats(true);
    setTimeout(() => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: '客户-王总',
        content: '好的，我们内部再讨论一下，下周给你们答复。',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setGroupChats(prev => prev.map(chat => {
        if (chat.customerId === selectedCustomer.id && chat.id === selectedChat?.id) {
          return { ...chat, messages: [...chat.messages, newMsg] };
        }
        return chat;
      }));
      if (selectedChat) {
        setSelectedChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : null);
      }
      setIsSyncingChats(false);
    }, 1500);
  };

  const handleAddContact = async (input?: Partial<Contact>) => {
    if (!selectedCustomer) return;
    const source = input || newContact;
    if (!source.name) {
      toast.error('请先填写联系人姓名');
      return;
    }
    const contactData = {
      id: source.id || crypto.randomUUID(),
      name: source.name,
      position: source.position || '',
      phone: source.phone,
      email: source.email || '',
      isPrimary: source.isPrimary || false,
      managerContactId: source.managerContactId || '',
      faction: source.faction || '',
      attitudeToUs: source.attitudeToUs || '中性评价',
      age: source.age,
      personality: source.personality,
      appellation: source.appellation,
      decisionPower: source.decisionPower,
      familySituation: source.familySituation,
      hometown: source.hometown,
      hobbies: source.hobbies,
      videoChannelProfile: source.videoChannelProfile || '',
      douyinProfile: source.douyinProfile || '',
      xiaohongshuProfile: source.xiaohongshuProfile || '',
      socialMediaBehavior: source.socialMediaBehavior || ''
    };
    
    try {
      await saveCustomerContactToSupabase(selectedCustomer.id, contactData);
      const contacts = await fetchCustomerContactsFromSupabase(selectedCustomer.id);
      setSelectedCustomer(prev => prev ? { ...prev, contacts: contacts as any } : prev);
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, contacts: contacts as any } : c));
      toast.success('联系人保存成功');
    } catch (e) {
      toast.error('保存失败');
    }

    setIsAddingContact(false);
    setNewContact({ name: '', position: '', phone: '', email: '', isPrimary: false, age: undefined, personality: '', appellation: '', decisionPower: '', familySituation: '', hometown: '', hobbies: [], attitudeToUs: '中性评价', faction: '', managerContactId: '', videoChannelProfile: '', douyinProfile: '', xiaohongshuProfile: '', socialMediaBehavior: '' });
  };

  const handleEditContact = async () => {
    if (!selectedCustomer || !editingContact) return;
    try {
      await saveCustomerContactToSupabase(selectedCustomer.id, editingContact);
      const contacts = await fetchCustomerContactsFromSupabase(selectedCustomer.id);
      setSelectedCustomer(prev => prev ? { ...prev, contacts: contacts as any } : prev);
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, contacts: contacts as any } : c));
      toast.success('联系人更新成功');
    } catch (e) {
      toast.error('更新失败');
    }
    setEditingContact(null);
  };

  const handleAddPlan = () => {
    if (!selectedCustomer || !newPlan.title) return;
    const plan: TodoTask = {
      id: crypto.randomUUID(),
      associatedCustomerId: selectedCustomer.id,
      associatedCustomerName: selectedCustomer.name,
      associatedContactId: newPlan.associatedContactId,
      associatedContactName: newPlan.associatedContactName,
      dueDate: newPlan.dueDate || '',
      title: newPlan.title,
      description: newPlan.description || '',
      visitType: newPlan.visitType as any || '现场拜访',
      status: '待办',
      assignee: newPlan.assignee || role,
      creatorId: 'U001',
      creatorNo: '001',
      creatorName: role,
      createDate: new Date().toISOString().split('T')[0],
      taskType: '客户激活任务',
      sourceType: 'customer'
    };
    setFollowUpPlans([plan, ...followUpPlans]);
    setTodoTasks([plan, ...todoTasks]);
    setIsAddingToDate(false);
    setNewPlan({ dueDate: '', title: '' });
  };

  const handleAnalyzeContact = async (contactId: string) => {
    if (!selectedCustomer) return;
    const contact = selectedCustomer.contacts.find(c => c.id === contactId);
    if (!contact) return;
    setAnalyzingContactId(contactId);
    try {
      const customerVisits = followUpPlans
        .filter(p => p.associatedCustomerId === selectedCustomer.id && p.status === '已完成')
        .map(p => `时间: ${p.completionTime}, 记录: ${p.completionNote || p.actualContent || p.description}`)
        .join('\n');
      const personaInfo = personas.find(p => p.customerId === selectedCustomer.id);
      const prompt = `
        You are an expert B2B sales advisor. Analyze the following customer contact, their company persona, and past visit records to generate actionable insights.
        Customer: ${selectedCustomer.name} (Industry: ${selectedCustomer.industry})
        Company Persona: Scale: ${personaInfo?.scale || 'Unknown'}, Main Products: ${personaInfo?.mainProducts || 'Unknown'}, Pain Points: ${personaInfo?.painPoints || 'Unknown'}
        Contact: ${contact.name} (${contact.position}), Persona: Age: ${contact.age || 'Unknown'}, Personality: ${contact.personality || 'Unknown'}, Decision Power: ${contact.decisionPower || 'Unknown'}, Family Situation: ${contact.familySituation || 'Unknown'}, Hometown: ${contact.hometown || 'Unknown'}, Hobbies: ${contact.hobbies || 'Unknown'}
        Past Visit Records: ${customerVisits || 'No past visit records.'}
        Generate the following in JSON format: { "preferences": "客户偏好", "keyConcerns": "核心关注点", "iceBreakingScript": "破冰话术", "appointmentScript": "邀约话术" }
      `;
      const text = await callAiProxy(prompt);
      if (text) {
        const result = parseAiJson(text);
        const updatedContacts = selectedCustomer.contacts.map(c => 
          c.id === contactId ? { ...c, ...result } : c
        );
        const updatedCustomer = { ...selectedCustomer, contacts: updatedContacts };
        setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        setSelectedCustomer(updatedCustomer);
      }
    } catch (error) {
      console.error("Failed to analyze contact:", error);
    } finally {
      setAnalyzingContactId(null);
    }
  };

  const handleUpdatePersona = async () => {
    if (!selectedCustomer) return;
    setIsUpdatingPersona(true);
    try {
      const personaConfig = await fetchPersonaAiConfig().catch(() => null);
      const normalizeText = (value: string) => String(value || '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim();
      const buildFixedBatchPrompt = (fields: any[], targetIds: string[]) => {
        const targets = fields.filter((f: any) => targetIds.includes(String(f?.id || '').trim()));
        const targetDesc = targets.map((f: any) => `${f.id}（${f.name}：${f.description || '无描述'}）`).join('；');
        const objectSkeleton = targetIds.map((id) => `"${id}":"..."`).join(',');
        const context = [
          `客户名称：${selectedCustomer.name}`,
          `所属行业：${selectedCustomer.industry || '未知'}`,
          `沟通记录：\n${(selectedCustomer.followUps || []).map((f: any) => `${f.date || ''} ${f.content || ''}`).join('\n') || '暂无'}`,
          `联系人画像：\n${(selectedCustomer.contacts || []).map((c: any) => `${c.name || ''} ${c.position || ''} ${c.phone || ''} ${c.email || ''}`).join('\n') || '暂无'}`
        ].join('\n\n');
        return [
          '你是客户研究分析师。请进行网络查找与多源交叉验证（官网/新闻/工商/招投标/招聘等），只输出客户画像分析。',
          `本轮必须分析的维度ID：${targetIds.join(', ')}`,
          `维度说明：${targetDesc || '无'}`,
          `背景信息：\n${context}`,
          '输出规则（必须严格遵守）：',
          '1) 仅输出JSON对象，不要代码块，不要解释文本；',
          `2) 键必须且只能是：${targetIds.join(', ')}；必须全部出现且每个仅1次；`,
          '3) JSON格式示例：',
          `{${objectSkeleton}}`,
          '4) 每个value必须按以下四段输出：',
          '【分析结论】...',
          '【关键依据】...',
          '【待验证点】...',
          '【可信度】高/中/低（并说明）',
          '5) 若证据不足，也必须输出四段占位，不得留空。',
          '6) 每个value控制在120-220字。'
        ].join('\n');
      };
      const newPersona: any = {
        id: crypto.randomUUID(),
        customerId: selectedCustomer.id,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      if (personaConfig && Array.isArray(personaConfig.fields) && personaConfig.fields.length > 0) {
        const fields = personaConfig.fields;
        const ids = fields.map((f: any) => String(f?.id || '').trim()).filter(Boolean);
        const dynamicData: Record<string, string> = {};
        const round1Prompt = buildFixedBatchPrompt(fields, ids);
        const round1Text = await callAiProxy(round1Prompt, personaConfig?.model);
        const round1Mapped = parsePersonaDimensions(round1Text || '', ids);
        const missingIds = ids.filter((id) => !String(round1Mapped[id] || '').trim());
        let round2Mapped: Record<string, string> = {};
        if (missingIds.length > 0) {
          const round2Prompt = buildFixedBatchPrompt(fields, missingIds);
          const round2Text = await callAiProxy(round2Prompt, personaConfig?.model);
          round2Mapped = parsePersonaDimensions(round2Text || '', missingIds);
        }
        ids.forEach((id) => {
          dynamicData[id] = normalizeText(round2Mapped[id] || round1Mapped[id] || '') || [
            '【分析结论】当前轮次未获得该维度的稳定结果。',
            '【关键依据】模型返回为空或异常。',
            '【待验证点】请补充该维度相关资料后重试。',
            '【可信度】低（暂无足够证据）'
          ].join('\n');
        });
        newPersona.dynamicData = dynamicData;
      } else {
        const prompt = `你是B2B销售助理。请基于我们已知的客户信息（不要求联网搜索）输出公司画像JSON ：{ "scale": "...", "mainProducts": "...", "painPoints": "...", "rdRequirements": "...", "sampleRequirements": "...", "productionRequirements": "..." }。客户名称：${selectedCustomer.name}；行业：${selectedCustomer.industry}`;
        const text = await callAiProxy(prompt, personaConfig?.model);
        if (text) Object.assign(newPersona, parseAiJson(text));
      }
      setPersonas(prev => [newPersona, ...prev.filter(p => p.customerId !== selectedCustomer.id)]);
    } catch (error) {
      console.error("Failed to update persona:", error);
    } finally {
      setIsUpdatingPersona(false);
    }
  };

  const handleSavePersona = (updatedPersona: CustomerPersona) => {
    setPersonas(prev => prev.map(p => p.id === updatedPersona.id ? updatedPersona : p));
    setEditingPersona(null);
  };

  const handleOpenPlanDetails = (plan: TodoTask) => {
    setRecordingPlanId(plan.id);
    setEditingPlanContent(plan.title);
    setActualVisitContent(plan.actualContent || '');
    setEditingCustomerId(plan.associatedCustomerId || null);
  };

  const handleSaveActual = () => {
    if (!recordingPlanId) return;
    const customer = customers.find(c => c.id === editingCustomerId);
    setFollowUpPlans(followUpPlans.map(p => p.id === recordingPlanId ? { 
      ...p, 
      title: editingPlanContent, 
      actualContent: actualVisitContent, 
      status: actualVisitContent ? '已完成' : p.status,
      associatedCustomerId: editingCustomerId || p.associatedCustomerId,
      associatedCustomerName: customer?.name || p.associatedCustomerName
    } : p));
    if (customer && nextVisitTime) {
      (customer as any).latestNextVisitTime = nextVisitTime;
    }
    setRecordingPlanId(null);
    setActualVisitContent('');
    setEditingPlanContent('');
    setEditingCustomerId(null);
    setNextVisitTime('');
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteCustomerFromSupabase(customerId);
      skipNextCustomersAutoSyncRef.current = true;
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }
      toast.success('客户删除成功');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(`删除客户失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleAddCommunication = async (comm: Partial<CommunicationDetail>) => {
    if (!selectedCustomer?.id) return;
    try {
      await saveCustomerCommunicationToSupabase(selectedCustomer.id, comm);
      const list = await fetchCustomerCommunicationsFromSupabase(selectedCustomer.id);
      setCustomerCommunications(list);
      toast.success('沟通记录已保存');
    } catch (error) {
      console.error('Error saving communication:', error);
      toast.error('沟通记录保存失败');
    }
  };

  const handleAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setNewPlan(prev => ({
        ...prev,
        title: (prev.title || '') + '\n\n【AI 拜访话术建议】\n1. 开场白：王总您好...\n2. 切入点...\n3. 核心优势...\n4. 促单话术...'
      }));
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleAIOrganizeRecord = () => {
    setIsOrganizing(true);
    setTimeout(() => {
      setActualVisitContent(prev => (prev ? prev + '\n\n' : '') + '【AI 自动整理记录】\n拜访对象：王总\n核心诉求：要求缩短交期...\n达成共识：同意下周安排一次小批量试产。\n后续跟进：明天发送试产报价单和排期表。');
      setIsOrganizing(false);
    }, 1500);
  };

  if (selectedCustomer) {
    const industryOptionsForEdit = Array.from(
      new Set([
        ...CUSTOMER_INDUSTRY_OPTIONS,
        String(selectedCustomer.industry || '').trim()
      ].filter(Boolean))
    );
    return (
      <>
        <CustomerDetail 
          selectedCustomer={selectedCustomer}
          onBack={() => { setSelectedCustomer(null); if (viewParams) goBack?.(); }}
          onEdit={() => setIsEditing(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showWeChat={showWeChat}
          setShowWeChat={setShowWeChat}
          setIsAddingContact={setIsAddingContact}
          isAddingContact={isAddingContact}
          newContact={newContact}
          setNewContact={setNewContact}
          handleAddContact={handleAddContact}
          setEditingContact={setEditingContact}
          setVisitContact={handleInitiateVisitTask}
          handleAnalyzeContact={handleAnalyzeContact}
          analyzingContactId={analyzingContactId}
          todoTasks={todoTasks}
          navigateTo={navigateTo}
          followUpPlans={followUpPlans}
          isUpdatingPersona={isUpdatingPersona}
          handleUpdatePersona={handleUpdatePersona}
          personas={personas}
          setPersonas={setPersonas}
          setEditingPersona={setEditingPersona}
          groupChats={groupChats}
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          chatSubTab={chatSubTab}
          setChatSubTab={setChatSubTab}
          isSyncingChats={isSyncingChats}
          handleSyncChats={handleSyncChats}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setIsAddingToDate={setIsAddingToDate}
          handleOpenPlanDetails={handleOpenPlanDetails}
          communications={customerCommunications}
          onAddCommunication={handleAddCommunication}
          onCreateFollowupTask={(task) => {
            setFollowUpPlans((prev) => [task, ...prev]);
            setTodoTasks((prev) => [task, ...prev]);
          }}
        />

        <DetailModal 
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveCustomer}
          data={selectedCustomer}
          fields={[
            { key: 'customerNumber', label: '客户编号', disabled: true },
            { key: 'name', label: '客户名称', required: true },
            { key: 'shortName', label: '客户简称' },
            { key: 'englishName', label: '英文名称' },
            { key: 'level', label: '客户等级', type: 'select', options: ['战略客户', '成长型客户', '普通客户'], required: true },
            { key: 'customVisitFrequency', label: '自定义拜访频率(天)', type: 'number' },
            { key: 'lastVisitDate', label: '最后一次拜访日期', type: 'date', disabled: true },
            { key: 'status', label: '客户状态', type: 'select', options: ['活跃', '休眠', '流失', '计划拜访中'], required: true },
            { key: 'industry', label: '客户行业', type: 'select', options: industryOptionsForEdit },
            { key: 'source', label: '客户来源', type: 'select', options: CUSTOMER_SOURCE_OPTIONS },
            { key: 'region', label: '所属区域', type: 'select', options: CUSTOMER_REGION_OPTIONS },
            { key: 'salesRep', label: '业务员', type: 'user' },
            { key: 'businessManager', label: '业务经理', type: 'user' },
            { key: 'merchandiser', label: '跟单员', type: 'user' },
            { key: 'customerType', label: '客户类型', type: 'select', options: CUSTOMER_TYPE_OPTIONS },
            { key: 'currencyId', label: '币别', type: 'select', options: CUSTOMER_CURRENCY_OPTIONS },
            { key: 'customerCategory', label: '客户类别' },
            { key: 'groupName', label: '集团' },
            { key: 'isListedCompany', label: '是否上市公司', type: 'boolean' },
            { key: 'devPlan', label: '开发计划', type: 'textarea' },
            { key: 'carePlan', label: '关怀计划', type: 'textarea' },
            { key: 'legalPerson', label: '法人' },
            { key: 'paidInCapital', label: '实缴资金' },
            { key: 'registeredCapital', label: '注册资本' },
            { key: 'unifiedSocialCreditCode', label: '统一社会信用代码' },
            { key: 'industryLevel1', label: '一级行业' },
            { key: 'industryLevel2', label: '二级行业' },
            { key: 'industryLevel3', label: '三级行业' },
            { key: 'employeeCount', label: '人员规模' },
            { key: 'insuredCount', label: '参保人数', type: 'number' },
            { key: 'establishmentDate', label: '成立日期', type: 'date' },
            { key: 'companyType', label: '企业类型' },
            { key: 'faxNumber', label: '传真号码' },
            { key: 'website', label: '网址' },
            { key: 'companyAddress', label: '公司地址', type: 'textarea' },
            { key: 'businessScope', label: '经营范围', type: 'textarea' },
          ]}
          title="编辑客户"
        />

        <PersonaEditModal 
          isOpen={!!editingPersona}
          onClose={() => setEditingPersona(null)}
          onSave={handleSavePersona}
          editingPersona={editingPersona}
          setEditingPersona={setEditingPersona}
        />

        <ContactEditModal 
          isOpen={!!editingContact}
          onClose={() => setEditingContact(null)}
          onSave={handleEditContact}
          editingContact={editingContact}
          setEditingContact={setEditingContact}
        />

        <DetailModal
          isOpen={isAddingContact}
          onClose={() => {
            setIsAddingContact(false);
            setNewContact({ name: '', position: '', phone: '', email: '', isPrimary: false, age: undefined, personality: '', appellation: '', decisionPower: '', familySituation: '', hometown: '', hobbies: [], attitudeToUs: '中性评价', faction: '', managerContactId: '', videoChannelProfile: '', douyinProfile: '', xiaohongshuProfile: '', socialMediaBehavior: '' });
          }}
          title="新增客户联系人"
          data={newContact}
          onSave={(data) => handleAddContact(data as any)}
          fields={[
            { key: 'name', label: '姓名', required: true },
            { key: 'appellation', label: '称呼' },
            { key: 'position', label: '职位' },
            { key: 'decisionPower', label: '内部决策权', type: 'select', options: ['核心决策者', '技术评估者', '商务执行者', '内部影响者'] },
            { key: 'phone', label: '电话' },
            { key: 'email', label: '邮箱' },
            { key: 'wechatName', label: '微信昵称' },
            { key: 'age', label: '年龄', type: 'number' },
            { key: 'personality', label: '性格' },
            { key: 'familySituation', label: '家庭情况' },
            { key: 'hometown', label: '籍贯' },
            { key: 'hobbies', label: '爱好 (逗号分隔)', type: 'textarea' },
            { key: 'videoChannelProfile', label: '视频号账号/链接' },
            { key: 'douyinProfile', label: '抖音账号/链接' },
            { key: 'xiaohongshuProfile', label: '小红书账号/链接' },
            { key: 'socialMediaBehavior', label: '社媒行为摘要', type: 'textarea' },
            { key: 'buyingRole', label: '购买角色', type: 'select', options: ['经济买家', '技术买家', '用户买家', '教练'] },
            { key: 'managerContactId', label: '上级联系人', type: 'select', options: (selectedCustomer?.contacts || []).map(c => ({ value: c.id, label: c.name })) },
            { key: 'attitudeToUs', label: '对我方态度', type: 'select', options: ['积极推进', '正面评价', '中性评价', '反对者'] },
            { key: 'faction', label: '派系' },
            { key: 'isPrimary', label: '设为主联系人', type: 'boolean' }
          ]}
        />

        <QuickTaskModal 
          isOpen={isAddingToDate}
          onClose={() => {
            setIsAddingToDate(false);
            setNewPlan({ dueDate: '', title: '' });
          }}
          currentUser={currentUser}
          onSave={(taskData) => {
            const plan: TodoTask = {
              id: crypto.randomUUID(),
              title: taskData.title,
              description: taskData.description,
              dueDate: taskData.dueDate,
              status: '待办',
              importance: '中',
              urgency: '正常',
              assignee: taskData.assigneeName || taskData.assignee || currentUser?.name || '系统管理员',
              assigneeId: taskData.assigneeId || currentUser?.id || 'EMP001',
              assigneeName: taskData.assigneeName || currentUser?.name || '系统管理员',
              creatorId: taskData.creatorId || currentUser?.id || 'EMP001',
              creatorNo: taskData.creatorNo || currentUser?.employeeNo || 'E001',
              creatorName: taskData.creatorName || currentUser?.name || '系统管理员',
              createDate: new Date().toISOString().split('T')[0],
              taskType: taskData.taskType as any || '客户激活任务',
              sourceType: 'customer',
              associatedCustomerId: selectedCustomer.id,
              associatedCustomerName: selectedCustomer.name,
              contactName: taskData.contactName,
              associatedContactId: taskData.associatedContactId,
              associatedContactName: taskData.associatedContactName || taskData.contactName
            };
            setFollowUpPlans([plan, ...followUpPlans]);
            setTodoTasks([plan, ...todoTasks]);
            setIsAddingToDate(false);
            setNewPlan({ dueDate: '', title: '' });
          }}
          initialData={{
            module: '客户',
            relatedId: selectedCustomer.id,
            contactId: newPlan.associatedContactId,
            contactName: newPlan.associatedContactName,
            title: newPlan.title
          }}
        />

        {recordingPlanId && (
          <TaskDetailModal 
            isOpen={!!recordingPlanId}
            onClose={() => setRecordingPlanId(null)}
            task={followUpPlans.find(p => p.id === recordingPlanId) || followUpPlans[0]}
            onUpdate={(updatedTask) => {
              setFollowUpPlans(followUpPlans.map(p => p.id === updatedTask.id ? updatedTask : p));
              setTodoTasks(todoTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setListTab('customers')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${listTab === 'customers' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          客户
        </button>
        <button
          type="button"
          onClick={() => setListTab('potential')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${listTab === 'potential' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          潜在客户
        </button>
      </div>

      {listTab === 'customers' ? (
        <>
          <CustomerList 
            customers={filteredCustomers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterLevel={filterLevel}
            setFilterLevel={setFilterLevel}
            filterIndustry={filterIndustry}
            setFilterIndustry={setFilterIndustry}
            filterOverdue={filterOverdue}
            setFilterOverdue={setFilterOverdue}
            uniqueIndustries={uniqueIndustries}
            onSelectCustomer={setSelectedCustomer}
            onAddCustomer={() => setIsAdding(true)}
            onDeleteCustomer={handleDeleteCustomer}
            displayCount={displayCount}
          />

          <DetailModal 
            isOpen={isAdding}
            onClose={() => setIsAdding(false)}
            data={{}}
            fieldValidators={{
              name: validateDuplicateCustomerName
            }}
            onSave={(data) => {
              const customerName = String(data.name || '').trim();
              if (validateDuplicateCustomerName(customerName)) {
                toast.error(`客户“${customerName}”已存在，不能重复创建`);
                return false;
              }
              const today = new Date().toISOString().split('T')[0];
              const currencyId = String(data.currencyId || '').trim();
              const newCustomer: Customer = {
                id: '', // 由数据库触发器生成
                name: customerName,
                shortName: data.shortName || '',
                englishName: data.englishName || '',
                level: data.level || '普通客户',
                status: '活跃',
                industry: data.industry || '',
                source: data.source || '',
                region: data.region || '',
                salesRep: data.salesRep || '',
                businessManager: data.businessManager || '',
                merchandiser: data.merchandiser || '',
                customerType: data.customerType || '',
                currency: formatCustomerCurrencyLabel(currencyId) || '',
                currencyId,
                customerCategory: data.customerCategory || '',
                groupName: data.groupName || '',
                paymentTerm: data.paymentTerm || '',
                hasPaymentTerm: Boolean(data.hasPaymentTerm),
                monthSettlementApplyStatus: data.monthSettlementApplyStatus || '',
                isPublicPool: Boolean(data.isPublicPool),
                isListedCompany: Boolean(data.isListedCompany),
                legalPerson: data.legalPerson || '',
                paidInCapital: data.paidInCapital || '',
                registeredCapital: data.registeredCapital || '',
                industryLevel1: data.industryLevel1 || '',
                industryLevel2: data.industryLevel2 || '',
                industryLevel3: data.industryLevel3 || '',
                employeeCount: data.employeeCount || '',
                insuredCount: Number.isFinite(Number(data.insuredCount)) ? Number(data.insuredCount) : undefined,
                establishmentDate: data.establishmentDate || '',
                unifiedSocialCreditCode: data.unifiedSocialCreditCode || '',
                companyAddress: data.companyAddress || '',
                companyType: data.companyType || '',
                faxNumber: data.faxNumber || '',
                monthSettlementAttachment: data.monthSettlementAttachment || '',
                monthSettlementAgreement: data.monthSettlementAgreement || '',
                businessScope: data.businessScope || '',
                website: data.website || '',
                contacts: [],
                followUps: [],
                creatorId: 'system',
                creatorNo: 'system',
                creatorName: 'system',
                createDate: today
              };
              setCustomers([newCustomer, ...customers]);
              setIsAdding(false);
            }}
            fields={[
              { key: 'name', label: '客户名称', required: true },
              { key: 'shortName', label: '客户简称' },
              { key: 'englishName', label: '英文名称' },
              { key: 'level', label: '客户等级', type: 'select', options: ['战略客户', '成长型客户', '普通客户'], required: true },
              { key: 'industry', label: '客户行业', type: 'select', options: CUSTOMER_INDUSTRY_OPTIONS },
              { key: 'source', label: '客户来源', type: 'select', options: CUSTOMER_SOURCE_OPTIONS },
              { key: 'region', label: '所属区域', type: 'select', options: CUSTOMER_REGION_OPTIONS },
              { key: 'salesRep', label: '业务员', type: 'user' },
              { key: 'merchandiser', label: '跟单员', type: 'user' },
              { key: 'businessManager', label: '业务经理', type: 'user' },
              { key: 'customerType', label: '客户类型', type: 'select', options: CUSTOMER_TYPE_OPTIONS },
              { key: 'currencyId', label: '币别', type: 'select', options: CUSTOMER_CURRENCY_OPTIONS },
              { key: 'groupName', label: '集团' },
              { key: 'unifiedSocialCreditCode', label: '统一社会信用代码' },
              { key: 'companyType', label: '企业类型' },
              { key: 'website', label: '网址' },
              { key: 'companyAddress', label: '公司地址', type: 'textarea' },
            ]}
            title="新增客户"
          />
        </>
      ) : (
        <PotentialCustomerList
          items={potentialCustomers}
          searchTerm={potentialSearchTerm}
          setSearchTerm={setPotentialSearchTerm}
          loading={isPotentialLoading}
          onRefresh={refreshPotentialCustomers}
          onSelectCustomer={async (p) => {
            try {
              const detail = await fetchPotentialCustomerDetailFromSupabase(p.id);
              if (detail) {
                setSelectedCustomer(detail);
                return;
              }
            } catch (error) {
              console.error('Error fetching potential customer detail:', error);
            }
            const tempCustomer: Customer = {
              id: p.id,
              name: p.name,
              customerNumber: p.customerNumber,
              level: '潜在客户',
              status: '活跃',
              industry: '',
              source: (p as any).source || '潜在客户',
              region: '',
              salesRep: '',
              contacts: [],
              followUps: [],
              creatorId: '',
              creatorNo: '',
              creatorName: '',
              createDate: (p as any).createDate || (p as any).createdAt || new Date().toISOString().split('T')[0]
            };
            setSelectedCustomer(tempCustomer);
          }}
          onConvert={async (item) => {
            try {
              await convertPotentialCustomerToCustomerInSupabase(item);
              setPotentialCustomers((prev) => prev.filter((p) => p.id !== item.id));
              toast.success('已转为正式客户');
              await fetchRemote(); // 刷新正式客户列表
            } catch (error) {
              console.error('Convert potential customer error:', error);
              toast.error(`转正失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
            }
          }}
        />
      )}
    </>
  );
}
