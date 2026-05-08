import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Target, ChevronRight, FileText, Sparkles, ExternalLink, Loader2, MessageSquare, Users } from 'lucide-react';
import { Role, Inquiry, TodoTask, CommunicationDetail, GroupChat, User, FileAttachment } from '../types';
import DetailModal from '../components/DetailModal';
import ReservedButtons from '../components/ReservedButtons';
import { cn } from '../lib/utils';
import { callAiProxy } from '../lib/aiProxy';
import { parseAiJson } from '../lib/aiJson';

import AiStageAssistant from '../components/AiStageAssistant';
import QuickTaskModal from '../components/QuickTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import CommunicationLog from '../components/CommunicationLog';
import ManageMembersModal from '../components/ManageMembersModal';
import CustomerContactsCards from '../components/CustomerContactsCards';
import CustomerPersonaPanel from '../components/CustomerPersonaPanel';
import { Clock, RefreshCw } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { saveCustomerContactToSupabase, saveGroupChatToSupabase, fetchCustomerContactsFromSupabase } from '../lib/customerInteractionRepository';
import { createPotentialCustomerInSupabase } from '../lib/potentialCustomerRepository';
import { resolveCustomerDbIdFromSupabase, saveCustomerCommunicationToSupabase, fetchCustomerCommunicationsFromSupabase } from '../lib/customerRepository';
import { pushInquiryToLeadInSupabase } from '../lib/pushdown';
import { generateBusinessNumber, ID_PREFIX } from '../lib/idUtils';
import { triggerAutoFlowsForCreate } from '../lib/workflowRunner';

const INQUIRY_SOURCE_CHANNEL_OPTIONS = ['万连', '电子谷', '1688', '爱采购', '胜蓝', '新电子谷', '其他', '淘宝', '官网', '展会'];

const normalizeSourceChannel = (value: unknown): string | null => {
  const text = String(value || '').trim();
  if (INQUIRY_SOURCE_CHANNEL_OPTIONS.includes(text)) return text;
  return null;
};
const LEAD_CUSTOMER_ACTION_OPTIONS = ['寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料'];
const LEAD_SOURCE_TYPE_OPTIONS = ['企业微信', '注册', '在线', '微信', '邮件', '电话', '其他'];

const parseAttachments = (raw: unknown): FileAttachment[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FileAttachment[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const toNullableInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const dedupeInquiriesById = (list: Inquiry[]): Inquiry[] => {
  const seen = new Set<string>();
  const result: Inquiry[] = [];
  for (const item of list) {
    const key = String(item?.id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

interface InquiriesProps {
  role: Role;
  currentUser?: User;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Inquiries({ role, currentUser, viewParams, navigateTo, goBack }: InquiriesProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [leadNoMap, setLeadNoMap] = useState<Record<string, string>>({});
  const [leadSelectOptions, setLeadSelectOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<any>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'flow' | 'communications'>('flow');
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [communications, setCommunications] = useState<CommunicationDetail[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [regeneratingNodes, setRegeneratingNodes] = useState<Record<string, boolean>>({});
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [isAddingGroupChat, setIsAddingGroupChat] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState('');

  useEffect(() => {
    if (selectedInquiry?.customerId) {
      fetchCustomerContactsFromSupabase(selectedInquiry.customerId).then(setContacts);
    } else {
      setContacts([]);
    }
  }, [selectedInquiry?.customerId]);

  useEffect(() => {
    const loadCommunications = async () => {
      if (selectedInquiry?.customerId && isSupabaseConfigured()) {
        try {
          const comms = await fetchCustomerCommunicationsFromSupabase(selectedInquiry.customerId);
          setCommunications(comms);
        } catch (error) {
          console.error('Failed to load communications:', error);
          setCommunications([]);
        }
      } else {
        setCommunications([]);
      }
    };
    loadCommunications();
  }, [selectedInquiry?.customerId]);

  useEffect(() => {
    const loadCustomerNumber = async () => {
      if (!selectedInquiry?.customerId || !isSupabaseConfigured()) {
        setSelectedCustomerNumber('');
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const customerId = toNullableInt(selectedInquiry.customerId);
        if (customerId === null) {
          setSelectedCustomerNumber('');
          return;
        }
        const { data, error } = await supabase
          .from('ba_manucustinfo')
          .select('customer_number')
          .eq('id', customerId)
          .limit(1);
        if (error) throw error;
        setSelectedCustomerNumber(String(data?.[0]?.customer_number || ''));
      } catch {
        setSelectedCustomerNumber('');
      }
    };
    loadCustomerNumber();
  }, [selectedInquiry?.customerId]);
  const [newTaskData, setNewTaskData] = useState<any>(null);

  const [newGroupChatName, setNewGroupChatName] = useState('');

  const handleSyncChats = () => {
    setIsSyncingChats(true);
    setTimeout(() => {
      setIsSyncingChats(false);
    }, 1500);
  };

  const mapDbInquiryToUi = (row: any): Inquiry => {
    const today = new Date().toISOString().split('T')[0];
    const aiAnalysis = row.ai_analysis || undefined;
    const normalizedStatus = row.status === '未转化' ? '关闭' : (row.status || '待处理');
    return {
      id: String(row.id),
      inquiryNo: row.inquiry_no || '',
      customerId: row.customer_id !== null && row.customer_id !== undefined ? String(row.customer_id) : undefined,
      date: row.create_date || row.date || today,
      companyName: row.company_name || '',
      customerName: row.customer_name || '',
      contact: row.contact || '',
      sourceChannel: row.source_channel || '',
      category: row.category || '',
      productSeries: row.product_series || '',
      province: row.province || '',
      situation: row.situation || '',
      customerInquiry: row.customer_inquiry || '',
      status: normalizedStatus as Inquiry['status'],
      classification: row.classification,
      unconvertReason: row.unconvert_reason,
      unconvertedTime: row.unconverted_time || undefined,
      notes: row.notes,
      associatedLead: row.associated_lead !== null && row.associated_lead !== undefined ? String(row.associated_lead) : undefined,
      creatorId: row.creator_id || 'system',
      creatorNo: row.creator_no || 'system',
      creatorName: row.creator_name || role,
      creator: row.creator_name || role,
      createDate: row.create_date || today,
      updater: row.updater,
      updateDate: row.update_date,
      buyerRole: row.buyer_role || aiAnalysis?.buyerRole,
      buyingMode: row.buying_mode || aiAnalysis?.buyingMode,
      intentScore: typeof row.intent_score === 'number' ? row.intent_score : aiAnalysis?.intentScore,
      attachments: parseAttachments(row.attachments),
      aiAnalysis
    };
  };

  const fetchInquiries = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('crm_inquiry')
        .select('*')
        .order('create_date', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setInquiries(dedupeInquiriesById(data.map(mapDbInquiryToUi)));
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    const loadLeadReferenceData = async () => {
      if (!isSupabaseConfigured()) {
        setLeadNoMap({});
        setLeadSelectOptions([]);
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('crm_lead')
          .select('id, lead_no');
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        const nextMap: Record<string, string> = {};
        const nextOptions = rows.map((row: any) => {
          const id = String(row.id);
          const leadNo = String(row.lead_no || '');
          if (leadNo) nextMap[id] = leadNo;
          return { value: id, label: leadNo || id };
        });
        setLeadNoMap(nextMap);
        setLeadSelectOptions(nextOptions);
      } catch (error) {
        console.error('Error loading lead references for inquiry:', error);
        setLeadNoMap({});
        setLeadSelectOptions([]);
      }
    };
    loadLeadReferenceData();
  }, [inquiries.length]);

  useEffect(() => {
    if (viewParams) {
      const inquiry = inquiries.find(i => i.id === viewParams);
      if (inquiry) {
        setSelectedInquiry(inquiry);
      }
    }
  }, [viewParams, inquiries]);

  const [isAdding, setIsAdding] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const normalizeForSearch = (value: unknown) => String(value ?? '').toLowerCase();
  const resolveLeadDisplay = (leadId?: string) => {
    if (!leadId) return '-';
    return leadNoMap[leadId] || leadId;
  };
  const filteredInquiries = inquiries.filter(inq => {
    const searchLower = normalizeForSearch(searchTerm);
    return (
      normalizeForSearch(inq.inquiryNo).includes(searchLower) ||
      normalizeForSearch(inq.id).includes(searchLower) ||
      normalizeForSearch(inq.companyName).includes(searchLower) ||
      normalizeForSearch(inq.customerName).includes(searchLower) ||
      normalizeForSearch(inq.contact).includes(searchLower)
    );
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < filteredInquiries.length) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  const handleSave = async (data: any) => {
    const isNew = isAdding;
    const selectedInquiryDbId = toNullableInt(selectedInquiry?.id);
    const today = new Date().toISOString().split('T')[0];
    if (!isSupabaseConfigured()) {
      toast.error('未配置 Supabase，无法保存询盘数据');
      return;
    }
    
    let customerId = data.customerId;
    if (!customerId && data.companyName) {
      try {
        const created = await createPotentialCustomerInSupabase(String(data.companyName));
        customerId = created.id;
      } catch {
        customerId = '';
      }
    }
    try {
      const customerIdForDb = toNullableInt(customerId);
      const dbData = {
        inquiry_no: isNew ? await generateBusinessNumber(ID_PREFIX.INQUIRY) : (data.inquiryNo || selectedInquiry?.inquiryNo || null),
        customer_id: customerIdForDb,
        company_name: data.companyName,
        customer_name: data.customerName,
        contact: data.contact,
        source_channel: normalizeSourceChannel(data.sourceChannel),
        category: data.category,
        product_series: data.productSeries,
        province: data.province,
        situation: data.situation,
        customer_inquiry: data.customerInquiry,
        status: data.status || '待处理',
        unconvert_reason: data.unconvertReason,
        unconverted_time: data.unconvertedTime || null,
        notes: data.notes,
        associated_lead: data.associatedLead ? String(data.associatedLead) : null,
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        creator_id: isNew ? 'system' : selectedInquiry?.creatorId,
        creator_name: isNew ? role : selectedInquiry?.creatorName,
        create_date: isNew ? (data.createDate || today) : (data.createDate || selectedInquiry?.createDate),
        updater: role,
        update_date: today,
        classification: data.classification,
        updated_at: new Date().toISOString()
      };
      const upsertInquiryWithCompat = async (payload: Record<string, any>) => {
        const supabase = getSupabaseClient();
        const isDuplicateInquiryPrimaryKeyError = (err: any) => {
          const code = String(err?.code || '');
          const message = String(err?.message || '');
          const details = String(err?.details || '');
          return (
            code === '23505' &&
            (message.includes('crm_inquiry_pkey') || details.includes('crm_inquiry_pkey'))
          );
        };
        const runMutation = (row: Record<string, any>) => {
          if (isNew || selectedInquiryDbId === null) {
            return supabase.from('crm_inquiry').insert(row).select('*');
          }
          return supabase.from('crm_inquiry').update(row).eq('id', selectedInquiryDbId).select('*');
        };
        let { data, error } = await runMutation(payload);
        if (!error) return { data, error: null };

        // 兼容历史序列不同步：新建询盘命中主键冲突时，使用 max(id)+1 显式重试
        if ((isNew || selectedInquiryDbId === null) && isDuplicateInquiryPrimaryKeyError(error)) {
          const { data: maxRow, error: maxError } = await supabase
            .from('crm_inquiry')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (maxError) throw maxError;
          const fallbackId = Number(maxRow?.id || 0) + 1;
          const retry = await supabase
            .from('crm_inquiry')
            .insert({ ...payload, id: fallbackId })
            .select('*');
          if (retry.error) throw retry.error;
          return { data: retry.data, error: null };
        }

        const message = String((error as any)?.message || '');
        const details = String((error as any)?.details || '');
        const isMissingProductSeries =
          (error as any)?.code === 'PGRST204' ||
          /product_series/i.test(message) ||
          /product_series/i.test(details);
        if (isMissingProductSeries) {
          const fallback = { ...payload };
          delete (fallback as any).product_series;
          const retry = await runMutation(fallback);
          if (retry.error) throw retry.error;
          return { data: retry.data, error: null };
        }
        throw error;
      };
      const { data: savedData } = await upsertInquiryWithCompat(dbData);
      if (savedData && savedData.length > 0) {
        // 某些前端字段（如买家角色/购买模式/意向得分）在不同数据库版本下可能不存在列，
        // 这里优先使用本次表单输入，保证编辑后页面即时生效。
        const savedInquiry = {
          ...mapDbInquiryToUi(savedData[0]),
          buyerRole: data.buyerRole,
          buyingMode: data.buyingMode,
          intentScore: data.intentScore
        } as Inquiry;

        if (isNew) {
          setInquiries((prev) => dedupeInquiriesById([savedInquiry, ...prev]));
          setIsAdding(false);
          triggerAutoFlowsForCreate('inquiry', savedInquiry, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined).catch((error) => {
            console.error('Error triggering inquiry workflow:', error);
          });
        } else {
          setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === savedInquiry.id ? savedInquiry : i))));
          setSelectedInquiry(savedInquiry);
          triggerAutoFlowsForCreate(
            'inquiry',
            savedInquiry,
            currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
            { event: 'save', previousRecord: selectedInquiry || {} }
          ).catch((error) => {
            console.error('Error triggering inquiry workflow on save:', error);
          });
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error saving inquiry:', error);
      toast.error(`保存询盘失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
    }
  };

  const [isConvertingToLead, setIsConvertingToLead] = useState(false);
  const [conversionLeadData, setConversionLeadData] = useState<any>(null);
  const [conversionInquiry, setConversionInquiry] = useState<Inquiry | null>(null);
  const [isClosingInquiry, setIsClosingInquiry] = useState(false);
  const [closingInquiry, setClosingInquiry] = useState<Inquiry | null>(null);

  const persistInquiryStatusUpdate = async (inquiry: Inquiry, patch: Partial<Inquiry>) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 未配置');
    }
    const today = new Date().toISOString().split('T')[0];
    const inquiryDbId = toNullableInt(inquiry.id);
    if (inquiryDbId === null) {
      throw new Error(`询盘ID无效，无法更新：${inquiry.id}`);
    }
    const customerIdText =
      typeof inquiry.customerId === 'string'
        ? inquiry.customerId.trim()
        : typeof inquiry.customerId === 'number'
          ? String(inquiry.customerId)
          : '';
    const resolvedCustomerId = customerIdText
      ? await resolveCustomerDbIdFromSupabase(customerIdText)
      : null;
    const associatedLeadId = toNullableInt(inquiry.associatedLead);
    const dbData = {
      id: inquiryDbId,
      inquiry_no: inquiry.inquiryNo || null,
      customer_id: resolvedCustomerId,
      company_name: inquiry.companyName || '',
      customer_name: inquiry.customerName || '',
      contact: inquiry.contact || '',
      source_channel: inquiry.sourceChannel || null,
      category: inquiry.category || '',
      product_series: inquiry.productSeries || '',
      province: inquiry.province || '',
      situation: inquiry.situation || '',
      customer_inquiry: inquiry.customerInquiry || '',
      status: patch.status || inquiry.status,
      unconvert_reason: patch.unconvertReason ?? inquiry.unconvertReason ?? null,
      unconverted_time: patch.unconvertedTime ?? inquiry.unconvertedTime ?? null,
      notes: inquiry.notes || '',
      associated_lead: associatedLeadId,
      attachments: Array.isArray(inquiry.attachments) ? inquiry.attachments : [],
      creator_id: inquiry.creatorId || 'system',
      creator_name: inquiry.creatorName || inquiry.creator || role,
      create_date: inquiry.createDate || inquiry.date || today,
      updater: role,
      update_date: today,
      classification: inquiry.classification || null,
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabaseClient();
    const runUpsert = (row: Record<string, any>) =>
      supabase
        .from('crm_inquiry')
        .upsert(row, { onConflict: 'id' })
        .select('*');
    let { data, error } = await runUpsert(dbData);
    if (error) {
      const message = String((error as any)?.message || '');
      const details = String((error as any)?.details || '');
      const isMissingProductSeries =
        (error as any)?.code === 'PGRST204' ||
        /product_series/i.test(message) ||
        /product_series/i.test(details);
      if (!isMissingProductSeries) throw error;
      const fallback = { ...dbData };
      delete (fallback as any).product_series;
      const retry = await runUpsert(fallback);
      if (retry.error) throw retry.error;
      data = retry.data;
    }
    if (data && data.length > 0) {
      const updatedInquiry = mapDbInquiryToUi(data[0]);
      setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))));
      setSelectedInquiry((prev) => (prev?.id === updatedInquiry.id ? updatedInquiry : prev));
    }
  };

  const handleOpenCloseInquiry = (inquiry: Inquiry) => {
    setClosingInquiry(inquiry);
    setIsClosingInquiry(true);
  };

  const handleCloseInquiry = async (data: any) => {
    if (!closingInquiry) return;
    if (!data.unconvertedTime || !data.unconvertReason) {
      toast.error('请填写未转化时间和未转化原因');
      return;
    }
    try {
      await persistInquiryStatusUpdate(closingInquiry, {
        status: '关闭',
        unconvertedTime: data.unconvertedTime,
        unconvertReason: data.unconvertReason
      });
      toast.success('询盘已关闭');
      setIsClosingInquiry(false);
      setClosingInquiry(null);
    } catch (error) {
      console.error('Error closing inquiry:', error);
      toast.error(`关闭询盘失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleConvertToLead = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setConversionInquiry(inquiry);
    setConversionLeadData({
      customerId: inquiry.customerId,
      customerName: inquiry.companyName || inquiry.customerName,
      name: inquiry.customerName,
      phone: inquiry.contact || '',
      customerAction: '找货寻料',
      industry: inquiry.category,
      source: '在线',
      assignee: role,
      entryTime: new Date().toISOString().split('T')[0],
      status: '未跟进',
      buyerRole: inquiry.buyerRole,
      buyingMode: inquiry.buyingMode,
      intentScore: inquiry.intentScore,
    });
    setIsConvertingToLead(true);
  };

  const confirmConvertToLead = async (data: any) => {
    const targetInquiry = conversionInquiry || selectedInquiry;
    if (!targetInquiry) return;
    try {
      const leadId = await pushInquiryToLeadInSupabase(targetInquiry, data);
      const updatedInquiry = { ...targetInquiry, status: '已转线索' as const };
      setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))));
      if (selectedInquiry?.id === updatedInquiry.id) {
        setSelectedInquiry(updatedInquiry);
      }

      if (data.buyingMode === '困难模式') {
        const newTask: TodoTask = {
          id: crypto.randomUUID(),
          title: `[困难模式] 立即联系 ${data.customerName} 进行SPIN需求挖掘`,
          description: `该线索处于困难模式，需立即联系进行SPIN需求挖掘。建议提问：${data.suggestedQuestions?.[0] || '客户目前面临的核心痛点是什么？'}`,
          status: '待办',
          importance: '高',
          urgency: '非常紧急',
          assignee: String(role),
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createDate: new Date().toISOString().split('T')[0],
          creatorId: 'system',
          creatorNo: 'AI',
          creatorName: 'AI助手',
          sourceType: 'lead',
          sourceId: targetInquiry.id,
          taskType: '线索跟进'
        };
        setTasks([newTask, ...tasks]);
      }

      setIsConvertingToLead(false);
      setConversionInquiry(null);
      navigateTo?.('leads', { action: 'open_existing', id: String(leadId), refreshTs: Date.now() });
    } catch (error) {
      console.error('Error converting inquiry to lead:', error);
      toast.error(`询盘转线索失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const leadFields = [
    { key: 'customerId', label: '客户ID', hidden: true },
    { key: 'customerName', label: '客户', type: 'customer_lookup', customerIdKey: 'customerId', required: true },
    { key: 'name', label: '姓名', required: true },
    { key: 'phone', label: '手机号', required: true },
    { key: 'customerAction', label: '客户行动', type: 'select', options: LEAD_CUSTOMER_ACTION_OPTIONS },
    { key: 'industry', label: '客户行业' },
    { key: 'buyerRole', label: '买家角色', type: 'select', options: ['技术买家', '用户买家', '经济买家', '教练'] },
    { key: 'buyingMode', label: '购买模式', type: 'select', options: ['增长模式', '困难模式', '平稳模式', '过度自信模式'] },
    { key: 'intentScore', label: '意向得分', type: 'number' },
    { key: 'status', label: '线索状态', type: 'select', options: ['未跟进', '跟进中', '关闭', '转商机'], required: true },
    { key: 'assignee', label: '处理人', type: 'user' },
    { key: 'entryTime', label: '录入时间', type: 'date' },
    { key: 'channelPlatform', label: '来源渠道', type: 'select', options: INQUIRY_SOURCE_CHANNEL_OPTIONS },
    { key: 'source', label: '来源类型', type: 'select', options: LEAD_SOURCE_TYPE_OPTIONS },
    { key: 'productSeries', label: '产品系列', type: 'category' },
  ];

  const handleRegenerateAI = async (nodeId: string, field: string, prompt: string) => {
    if (!selectedInquiry) return;
    setRegeneratingNodes(prev => ({ ...prev, [nodeId]: true }));
    
    try {
      const text = await callAiProxy(`${prompt}
            
            输入内容：
            - 公司：${selectedInquiry.companyName}
            - 客户情况：${selectedInquiry.situation}
            - 沟通记录：${communications.filter(c => c.sourceId === selectedInquiry.id).map(c => c.content).join('\n')}
            
            请返回对应的JSON数据结构。
            如果是画像提取，返回: {"profile": "..."}
            如果是专业预热，返回: {"warmerScript": "..."}
            如果是角色识别，返回: {"buyerRole": "技术买家" | "用户买家" | "经济买家" | "教练"}
            如果是购买模式，返回: {"buyingMode": "增长模式" | "困难模式" | "平稳模式" | "过度自信模式"}
            如果是意向分级，返回: {"intentScore": 0-100}
            如果是教练辅导，返回: {"teachingStory": ["建议1", "建议2", "建议3"]}`);

      const result = parseAiJson(text || '{}');
      const updatedInquiry = { 
        ...selectedInquiry, 
        aiAnalysis: { 
          ...selectedInquiry.aiAnalysis,
          ...result 
        },
        // Also update the top-level fields if they match
        ...(result.buyerRole ? { buyerRole: result.buyerRole } : {}),
        ...(result.buyingMode ? { buyingMode: result.buyingMode } : {}),
        ...(result.intentScore ? { intentScore: result.intentScore } : {})
      };
      
      setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))));
      setSelectedInquiry(updatedInquiry);
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setRegeneratingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleAddCommunication = async (comm: Partial<CommunicationDetail>) => {
    if (!selectedInquiry) return;
    const newComm: CommunicationDetail = {
      id: `C${Date.now()}`,
      date: new Date().toLocaleString(),
      sender: '张三 (销售)',
      content: '',
      type: 'wechat',
      sourceId: selectedInquiry.id,
      customerId: selectedInquiry.customerId,
      ...comm
    };
    setCommunications([newComm, ...communications]);

    if (selectedInquiry.customerId && isSupabaseConfigured()) {
      try {
        await saveCustomerCommunicationToSupabase(selectedInquiry.customerId, newComm);
      } catch (error) {
        console.error('Failed to save communication:', error);
        toast.error(`保存沟通记录失败：${(error as Error)?.message || '请检查配置'}`);
      }
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedInquiry) return;
    setIsAnalyzing(true);
    
    try {
      const text = await callAiProxy(`请根据以下询盘信息进行深度分析，并以JSON格式返回分析结果。
            
            分析逻辑遵循以下步骤：
            1. 自动分流与画像提取：识别询盘类型（技术咨询、价格索取、寻找替代品、定制需求、样品替换），并基于公司名称分析其背景和采购规模。
            2. 专业预热 (Warmer)：基于《挑战式销售》理论，针对客户行业生成一段“商业教学式”预热话术。
            3. 角色身份识别：根据客户头衔或沟通内容识别买家角色（技术买家、用户买家、经济买家、教练）。
            4. 购买模式探测建议：生成2-3个引导性问题，用于探测客户的购买模式（增长、困难、平稳、过度自信）。
            5. 意向分级与线索判定：根据角色关键度（经济/技术买家权重高）和初步意向，给出一个0-100的意向得分。
            6. 教练辅导建议：给销售人员提供3条具体的下一步行动建议。
            
            询盘信息：
            公司名称：${selectedInquiry.companyName}
            客户名称：${selectedInquiry.customerName}
            联系方式：${selectedInquiry.contact}
            客户情况：${selectedInquiry.situation}
            沟通记录：${communications.filter(c => c.sourceId === selectedInquiry.id).map(c => c.content).join('\n')}
            
            返回JSON格式：
            {
              "inquiryType": "技术咨询" | "价格索取" | "寻找替代品" | "定制需求" | "样品替换",
              "profile": "结构化的客户画像，包含公司背景、采购规模估算",
              "warmerScript": "挑战式销售风格的预热话术",
              "buyerRole": "技术买家" | "用户买家" | "经济买家" | "教练",
              "buyingMode": "增长模式" | "困难模式" | "平稳模式" | "过度自信模式",
              "suggestedQuestions": ["问题1", "问题2"],
              "intentScore": 85,
              "industryPainPoints": "该行业常见的技术或供应链痛点",
              "teachingStory": ["建议1", "建议2", "建议3"]
            }`);

      const analysisResult = parseAiJson(text || '{}');
      
      const updatedInquiry: Inquiry = { 
        ...selectedInquiry, 
        buyerRole: analysisResult.buyerRole,
        intentScore: analysisResult.intentScore,
        aiAnalysis: {
          ...analysisResult,
          profile: analysisResult.profile,
          warmerScript: analysisResult.warmerScript
        }
      };
      setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))));
      setSelectedInquiry(updatedInquiry);
      setEditedAnalysis(analysisResult);
    } catch (error) {
      console.error('AI Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!selectedInquiry || !editedAnalysis) return;
    try {
      const updatedInquiry = { ...selectedInquiry, aiAnalysis: editedAnalysis };
      setInquiries((prev) => dedupeInquiriesById(prev.map((i) => (i.id === updatedInquiry.id ? updatedInquiry : i))));
      setSelectedInquiry(updatedInquiry);
      setIsEditingAnalysis(false);
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  const fields = [
    { key: 'inquiryNo', label: '询盘编号', disabled: true },
    { key: 'customerId', label: '客户ID', hidden: true },
    { key: 'createDate', label: '创建日期', type: 'date', required: true },
    { key: 'companyName', label: '客户', type: 'customer_lookup', customerIdKey: 'customerId', required: true },
    { key: 'customerName', label: '客户名称' },
    { key: 'contactPerson', label: '客户联系人' },
    { key: 'contact', label: '联系方式' },
    { key: 'buyerRole', label: '买家角色', type: 'select', options: ['技术买家', '用户买家', '经济买家', '教练'] },
    { key: 'buyingMode', label: '购买模式', type: 'select', options: ['增长模式', '困难模式', '平稳模式', '过度自信模式'] },
    { key: 'intentScore', label: '意向得分', type: 'number' },
    { key: 'sourceChannel', label: '来源渠道', type: 'select', options: INQUIRY_SOURCE_CHANNEL_OPTIONS },
    { key: 'productSeries', label: '产品系列', type: 'category' },
    { key: 'province', label: '客户省市' },
    { key: 'situation', label: '客户情况', type: 'textarea' },
    { key: 'customerInquiry', label: '客户咨询内容', type: 'textarea' },
    { key: 'status', label: '状态', type: 'select', options: ['待处理', '已转线索', '关闭'], required: true },
    { key: 'classification', label: '分类标签', type: 'select', options: ['处理中', '有效', '无效'] },
    { key: 'unconvertReason', label: '未转化原因' },
    { key: 'unconvertedTime', label: '未转化时间', type: 'date' },
    { key: 'notes', label: '备注', type: 'textarea' },
    { key: 'attachments', label: '附件', type: 'attachments' },
    { key: 'associatedLead', label: '关联线索', type: 'select', options: leadSelectOptions },
    { key: 'creator', label: '创建人', type: 'user' },
    { key: 'updater', label: '更新人', type: 'user' },
    { key: 'updateDate', label: '更新日期', type: 'date' },
  ];

  const editFields = fields.filter((f) => !['unconvertReason', 'unconvertedTime'].includes(f.key));
  const addFields = fields.filter((f) => !['id', 'inquiryNo', 'creator', 'updater', 'updateDate', 'associatedLead', 'unconvertReason', 'unconvertedTime', 'situation', 'intentScore'].includes(f.key));
  const closeFields = [
    { key: 'unconvertedTime', label: '未转化时间', type: 'date', required: true },
    { key: 'unconvertReason', label: '未转化原因', required: true }
  ];
  const canConvertInquiry = (inquiry: Inquiry) => inquiry.status === '待处理';
  const canCloseInquiry = (inquiry: Inquiry) => inquiry.status === '待处理';
  const canEditInquiry = (inquiry: Inquiry) => inquiry.status === '待处理';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (selectedInquiry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedInquiry(null); if (viewParams) goBack?.(); }}
              className="text-gray-500 hover:text-gray-900 font-medium"
            >
              询盘登记
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-bold">{selectedInquiry.inquiryNo || '-'}</span>
          </div>
          <div className="flex items-center gap-3">
            <ReservedButtons moduleCode="inquiry_management" contextData={selectedInquiry} />
            {canConvertInquiry(selectedInquiry) && (
              <button 
                onClick={() => handleConvertToLead(selectedInquiry)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100"
              >
                <Target className="w-4 h-4" />
                转为线索
              </button>
            )}
            {canCloseInquiry(selectedInquiry) && (
              <button
                onClick={() => handleOpenCloseInquiry(selectedInquiry)}
                className="px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100"
              >
                关闭询盘
              </button>
            )}
            {canEditInquiry(selectedInquiry) && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  编辑询盘
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedInquiry.customerId ? (
                    <button
                      type="button"
                      onClick={() => navigateTo?.('customers', { customerId: selectedInquiry.customerId })}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {selectedInquiry.companyName || selectedInquiry.customerName || '未知客户'}
                    </button>
                  ) : (
                    selectedInquiry.companyName || selectedInquiry.customerName || '未知客户'
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-sm text-gray-500">编号: {selectedInquiry.inquiryNo || '-'}</span>
                  <span className="text-sm text-gray-500">客户编号: {selectedCustomerNumber || '-'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedInquiry.status === '待处理' ? 'bg-amber-100 text-amber-700' :
                    selectedInquiry.status === '已转线索' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedInquiry.status}
                  </span>
                  {selectedInquiry.classification && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedInquiry.classification === '处理中' ? 'bg-blue-100 text-blue-700' :
                      selectedInquiry.classification === '有效' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedInquiry.classification}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  基本信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">创建日期</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.createDate || selectedInquiry.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">公司名称</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户联系人</p>
                    <p className="font-medium text-indigo-600">{selectedInquiry.contactPerson || '未关联'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户名称</p>
                    {selectedInquiry.customerId ? (
                      <button
                        type="button"
                        onClick={() => navigateTo?.('customers', { customerId: selectedInquiry.customerId })}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {selectedInquiry.customerName || '-'}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900">{selectedInquiry.customerName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">联系方式</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.contact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">买家角色</p>
                    <p className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      selectedInquiry.buyerRole === '技术买家' ? 'bg-blue-50 text-blue-700' :
                      selectedInquiry.buyerRole === '用户买家' ? 'bg-green-50 text-green-700' :
                      selectedInquiry.buyerRole === '经济买家' ? 'bg-purple-50 text-purple-700' :
                      selectedInquiry.buyerRole === '教练' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {selectedInquiry.buyerRole || '未识别'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">购买模式</p>
                    <p className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      selectedInquiry.buyingMode === '增长模式' ? 'bg-emerald-50 text-emerald-700' :
                      selectedInquiry.buyingMode === '困难模式' ? 'bg-rose-50 text-rose-700' :
                      selectedInquiry.buyingMode === '平稳模式' ? 'bg-gray-50 text-gray-700' :
                      selectedInquiry.buyingMode === '过度自信模式' ? 'bg-amber-50 text-amber-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {selectedInquiry.buyingMode || '待探测'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">意向得分</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600">{selectedInquiry.intentScore || 0}</span>
                      <div className="flex-grow h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-500" 
                          style={{ width: `${selectedInquiry.intentScore || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">来源渠道</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.sourceChannel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品系列</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.productSeries || selectedInquiry.category || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户省市</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.province}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">分类标签</p>
                    {selectedInquiry.classification ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedInquiry.classification === '处理中' ? 'bg-blue-100 text-blue-700' :
                        selectedInquiry.classification === '有效' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedInquiry.classification}
                      </span>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">关联线索</p>
                    {selectedInquiry.associatedLead ? (
                      <button 
                        onClick={() => navigateTo?.('leads', selectedInquiry.associatedLead)}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {resolveLeadDisplay(selectedInquiry.associatedLead)}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">创建人</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.creatorName || selectedInquiry.creator || '-'}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">客户情况</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.situation || '-'}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">客户咨询内容</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.customerInquiry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">未转化时间</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.unconvertedTime || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">更新人</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.updater || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">更新日期</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.updateDate || '-'}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">备注</p>
                    <p className="font-medium text-gray-900">{selectedInquiry.notes || '-'}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">附件</p>
                    {Array.isArray(selectedInquiry.attachments) && selectedInquiry.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedInquiry.attachments.map((file, idx) => (
                          <a
                            key={`${file?.name || 'file'}-${idx}`}
                            href={file?.content || '#'}
                            download={file?.name || `附件${idx + 1}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <span className="text-sm font-medium text-indigo-600 truncate">{file?.name || `附件${idx + 1}`}</span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {(Number(file?.size || 0) / 1024).toFixed(1)} KB
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-3">
                <div className="flex flex-wrap border-b border-gray-200 mb-6 gap-2">
                  <button
                    onClick={() => setActiveDetailTab('flow')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'flow'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    SOP标准
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('communications')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'communications'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    沟通记录
                  </button>
                </div>

                {activeDetailTab === 'flow' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <AiStageAssistant
                      kind="inquiry"
                      title="询盘SOP标准"
                      sourceType="inquiry"
                      sourceId={selectedInquiry.id}
                      customerId={selectedInquiry.customerId}
                      customerName={selectedInquiry.customerName || selectedInquiry.companyName}
                      currentUser={currentUser ? { id: currentUser.id, name: currentUser.name, employeeNo: currentUser.employeeNo } : undefined}
                      sourceRecord={selectedInquiry as any}
                    />
                  </div>
                )}

                {activeDetailTab === 'communications' && (
                  <CommunicationLog
                    onAddCommunication={handleAddCommunication}
                    title="沟通记录"
                    contacts={contacts}
                    employees={[{ id: currentUser?.id || 'emp1', name: currentUser?.name || role, role: role }]}
                    customerId={selectedInquiry.customerId}
                    customerName={selectedInquiry.companyName || selectedInquiry.customerName}
                    communications={communications}
                  />
                )}
              </div>

            </div>
          </div>
        </div>
        
        <DetailModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="编辑询盘"
          data={selectedInquiry}
          onSave={handleSave}
          fields={editFields}
        />

        <DetailModal
          isOpen={isClosingInquiry}
          onClose={() => {
            setIsClosingInquiry(false);
            setClosingInquiry(null);
          }}
          title="关闭询盘"
          data={{
            unconvertedTime: new Date().toISOString().split('T')[0],
            unconvertReason: ''
          }}
          onSave={handleCloseInquiry}
          fields={closeFields}
          isEditing={true}
        />

        <DetailModal
          isOpen={isConvertingToLead}
          onClose={() => {
            setIsConvertingToLead(false);
            setConversionInquiry(null);
          }}
          title="询盘转线索 - 补充资料"
          data={conversionLeadData}
          onSave={confirmConvertToLead}
          fields={leadFields}
          isEditing={true}
        />

        <QuickTaskModal
          isOpen={isAddingTask}
          onClose={() => setIsAddingTask(false)}
          currentUser={currentUser}
          onSave={(taskData) => {
            const newTask: TodoTask = {
              id: crypto.randomUUID(),
              title: taskData.title,
              description: taskData.description || '',
              status: '待办',
              importance: '中',
              urgency: '正常',
              dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
              assignee: taskData.assigneeName || taskData.assignee || String(role),
              assigneeId: taskData.assigneeId || currentUser?.id || 'EMP001',
              assigneeName: taskData.assigneeName || currentUser?.name || '系统管理员',
              taskType: taskData.taskType || '普通任务',
              sourceType: 'inquiry',
              sourceId: selectedInquiry.id,
              createDate: new Date().toISOString().split('T')[0],
              creatorId: taskData.creatorId || currentUser?.id || 'EMP001',
              creatorNo: taskData.creatorNo || currentUser?.employeeNo || 'E001',
              creatorName: taskData.creatorName || currentUser?.name || '系统管理员'
            };
            setTasks([newTask, ...tasks]);
            setIsAddingTask(false);
          }}
          initialData={{
            title: `处理询盘: ${selectedInquiry.id}`,
            module: '询盘',
            relatedId: selectedInquiry.id
          }}
        />

        {selectedTaskId && (
          <TaskDetailModal
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            task={tasks.find(t => t.id === selectedTaskId) || tasks[0]}
            onUpdate={(updatedTask) => {
              setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
            }}
          />
        )}

        <ManageMembersModal 
          isOpen={isManagingMembers}
          onClose={() => setIsManagingMembers(false)}
          chat={selectedChat}
          onUpdateMembers={(newMembers) => {
            if (selectedChat) {
              setGroupChats(groupChats.map(c => c.id === selectedChat.id ? { ...c, members: newMembers } : c));
              setSelectedChat({ ...selectedChat, members: newMembers });
            }
          }}
        />

        {isAddingGroupChat && (
          <DetailModal
            isOpen={true}
            onClose={() => setIsAddingGroupChat(false)}
            title="新增微信群聊"
            fields={[
              { key: 'name', label: '群聊名称' },
              { key: 'members', label: '初始成员', type: 'select', options: ['张三', '李四', '王五'] }
            ]}
            data={null}
            onSave={async (data) => {
              if (!data.name) {
                toast.error('请先填写群聊名称');
                return;
              }
              const newChat: GroupChat = {
                id: `GC${Date.now()}`,
                groupId: `G${Date.now()}`,
                name: data.name,
                members: data.members || [],
                inquiryId: selectedInquiry.id,
                customerId: selectedInquiry.customerId,
                lastTime: new Date().toLocaleString(),
                messages: [],
                type: 'wechat'
              };
              setGroupChats([...groupChats, newChat]);
              try {
                await saveGroupChatToSupabase({ ...newChat, sourceGroup: 'inquiry' });
              } catch (error) {
                console.error('Error saving group chat:', error);
                toast.error(`群聊保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
              }
              setIsAddingGroupChat(false);
            }}
          />
        )}

        {isAddingContact && (
          <DetailModal
            isOpen={true}
            onClose={() => setIsAddingContact(false)}
            title="新增客户联系人"
            fields={[
              { key: 'name', label: '姓名' },
              { key: 'position', label: '职位' },
              { key: 'phone', label: '电话' },
              { key: 'email', label: '邮箱' },
              { key: 'buyingRole', label: '购买角色', type: 'select', options: ['经济买家', '技术买家', '用户买家', '教练'] }
            ]}
            data={null}
            onSave={async (data) => {
              if (!selectedInquiry.customerId) {
                toast.error('当前询盘未绑定客户ID，无法保存联系人');
                return;
              }
              if (!data.name) {
                toast.error('请填写联系人姓名');
                return;
              }
              try {
                await saveCustomerContactToSupabase(selectedInquiry.customerId, data);
                toast.success('联系人保存成功');
                fetchCustomerContactsFromSupabase(selectedInquiry.customerId).then(setContacts);
              } catch (error) {
                console.error('Error saving contact:', error);
                toast.error(`联系人保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
                return;
              }
              setIsAddingContact(false);
            }}
          />
        )}

      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">询盘登记</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索询盘..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新建询盘</span>
            <span className="sm:hidden">新建</span>
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="relative sm:hidden flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="搜索询盘..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
        />
      </div>

      <div 
        className="flex-grow overflow-auto min-h-0"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            <FileText className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">暂无询盘数据</p>
            <p className="text-sm mt-1">点击右上角"新建询盘"创建</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">序号</th>
                      <th className="px-6 py-4">询盘编号</th>
                      <th className="px-6 py-4">公司名称</th>
                      <th className="px-6 py-4">客户名称</th>
                      <th className="px-6 py-4">联系方式</th>
                      <th className="px-6 py-4">来源渠道</th>
                      <th className="px-6 py-4">产品系列</th>
                      <th className="px-6 py-4">客户省市</th>
                      <th className="px-6 py-4">客户情况</th>
                      <th className="px-6 py-4">客户咨询内容</th>
                      <th className="px-6 py-4">状态</th>
                      <th className="px-6 py-4">分类标签</th>
                      <th className="px-6 py-4">未转化原因</th>
                      <th className="px-6 py-4">备注</th>
                      <th className="px-6 py-4">关联线索</th>
                      <th className="px-6 py-4">创建人</th>
                      <th className="px-6 py-4">创建日期</th>
                  <th className="px-6 py-4">更新人</th>
                  <th className="px-6 py-4">更新日期</th>
                  <th className="px-6 py-4 sticky right-0 bg-gray-50 z-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInquiries.slice(0, displayCount).map((inq, index) => (
                  <tr key={inq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedInquiry(inq)}>{inq.inquiryNo || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{inq.companyName}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.contact}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.sourceChannel}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.productSeries || inq.category || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.province}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{inq.situation}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{inq.customerInquiry || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inq.status === '待处理' ? 'bg-amber-100 text-amber-800' :
                        inq.status === '已转线索' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {inq.classification && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inq.classification === '处理中' ? 'bg-blue-100 text-blue-800' :
                          inq.classification === '有效' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {inq.classification}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{inq.unconvertReason || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.notes || '-'}</td>
                    <td className="px-6 py-4 text-indigo-600 cursor-pointer hover:underline" onClick={() => inq.associatedLead && navigateTo?.('leads', inq.associatedLead)}>{resolveLeadDisplay(inq.associatedLead)}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.creator}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.createDate}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.updater || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{inq.updateDate || '-'}</td>
                    <td className="px-6 py-4 sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        {canConvertInquiry(inq) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvertToLead(inq);
                            }}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            <Target className="w-4 h-4" />
                            转为线索
                          </button>
                        )}
                        {canCloseInquiry(inq) && (
                          <button
                            onClick={() => handleOpenCloseInquiry(inq)}
                            className="text-rose-600 hover:text-rose-800 text-sm font-medium"
                          >
                            关闭
                          </button>
                        )}
                        {canEditInquiry(inq) && (
                          <button
                            onClick={() => {
                              setSelectedInquiry(inq);
                              setIsEditing(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            编辑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredInquiries.slice(0, displayCount).map((inq) => (
            <div 
              key={inq.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
              onClick={() => setSelectedInquiry(inq)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{inq.companyName}</h3>
                  <p className="text-xs text-indigo-600 font-medium">{inq.inquiryNo || '-'}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  inq.status === '待处理' ? 'bg-amber-100 text-amber-800' :
                  inq.status === '已转线索' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {inq.status}
                </span>
                {inq.classification && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    inq.classification === '处理中' ? 'bg-blue-100 text-blue-800' :
                    inq.classification === '有效' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {inq.classification}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">客户名称</p>
                  <p className="text-gray-900">{inq.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">创建日期</p>
                  <p className="text-gray-900">{inq.createDate || inq.date}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">来源渠道</p>
                  <p className="text-gray-900">{inq.sourceChannel}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">产品系列</p>
                  <p className="text-gray-900">{inq.productSeries || '-'}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  创建人: {inq.creator}
                </div>
                <div className="flex items-center gap-3">
                  {canConvertInquiry(inq) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertToLead(inq);
                      }}
                      className="text-indigo-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Target className="w-4 h-4" />
                      转线索
                    </button>
                  )}
                  {canCloseInquiry(inq) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCloseInquiry(inq);
                      }}
                      className="text-rose-600 text-sm font-medium"
                    >
                      关闭
                    </button>
                  )}
                  {canEditInquiry(inq) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInquiry(inq);
                        setIsEditing(true);
                      }}
                      className="text-indigo-600 text-sm font-medium"
                    >
                      编辑
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInquiry(inq);
                    }}
                    className="text-indigo-600 text-sm font-medium"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {displayCount < filteredInquiries.length && (
            <div className="py-4 text-center text-gray-500 text-sm">
              正在加载更多...
            </div>
          )}
        </div>
        </>
        )}
      </div>

      <DetailModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="新建询盘"
        data={{
          createDate: new Date().toISOString().split('T')[0],
          status: '待处理',
          sourceChannel: '其他'
        }}
        onSave={handleSave}
        fields={addFields}
        isEditing={true}
      />
    </div>
  );
}
