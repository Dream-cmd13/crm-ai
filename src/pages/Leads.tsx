import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Target, ChevronRight, FileText, Sparkles, ExternalLink, Loader2, MessageSquare, Link, Users } from 'lucide-react';
import { Role, Lead, CommunicationDetail, GroupChat, TodoTask, User, FileAttachment } from '../types';
import { initialObjects } from '../data/ontologyData';
import { mockLeads, mockCommunications, mockInquiries, mockPersonas, mockGroupChats, mockTasks } from '../data';
import ManageMembersModal from '../components/ManageMembersModal';
import QuickTaskModal from '../components/QuickTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { Clock, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import DetailModal from '../components/DetailModal';
import ReservedButtons from '../components/ReservedButtons';
import { callAiProxy } from '../lib/aiProxy';
import { parseAiJson } from '../lib/aiJson';
import AiStageAssistant from '../components/AiStageAssistant';
import CommunicationLog from '../components/CommunicationLog';
import CustomerContactsCards from '../components/CustomerContactsCards';
import CustomerPersonaPanel from '../components/CustomerPersonaPanel';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { saveCustomerContactToSupabase, saveGroupChatToSupabase, fetchCustomerContactsFromSupabase } from '../lib/customerInteractionRepository';
import { createPotentialCustomerInSupabase } from '../lib/potentialCustomerRepository';
import { fetchArchitectureDataFromSupabase } from '../lib/architectureRepository';
import { pushLeadToOpportunityInSupabase, deleteLeadFromSupabase } from '../lib/pushdown';
import { triggerAutoFlowsForCreate } from '../lib/workflowRunner';
import { ensureDeleteAllowed } from '../lib/deleteGuard';

const LEAD_STATUS_OPTIONS = ['未跟进', '跟进中', '关闭', '转商机'];
const LEAD_CUSTOMER_ACTION_OPTIONS = ['寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料'];
const LEAD_SOURCE_CHANNEL_OPTIONS = ['万连', '电子谷', '1688', '爱采购', '胜蓝', '新电子谷', '其他', '淘宝'];
const LEAD_SOURCE_TYPE_OPTIONS = ['企业微信', '注册', '在线', '微信', '邮件', '电话', '其他'];
const LEAD_SOURCE_STATUS_OPTIONS = ['客服', '自己开发'];
const LEAD_PRODUCT_INDUSTRY_OPTIONS = ['基础接插件', '新能源', '线束', '定制', '胜蓝', '胜蓝电气', '工业'];

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

const normalizeLeadStatus = (status?: string): Lead['status'] => {
  if (status === '已转商机') return '转商机';
  if (status === '已关闭') return '关闭';
  if (status === '未跟进' || status === '跟进中' || status === '关闭' || status === '转商机') return status;
  return '未跟进';
};

interface LeadsProps {
  role: Role;
  currentUser?: User;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Leads({ role, currentUser, viewParams, navigateTo, goBack }: LeadsProps) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [communications, setCommunications] = useState<CommunicationDetail[]>(mockCommunications);
  const [regeneratingNodes, setRegeneratingNodes] = useState<Record<string, boolean>>({});
  const [groupChats, setGroupChats] = useState<GroupChat[]>(mockGroupChats);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [isAddingGroupChat, setIsAddingGroupChat] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  

  const handleSyncChats = () => {
    setIsSyncingChats(true);
    setTimeout(() => {
      setIsSyncingChats(false);
    }, 1500);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'flow'>('flow');
  const [tasks, setTasks] = useState<TodoTask[]>(mockTasks);
  const [personas, setPersonas] = useState(mockPersonas);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState<any>(null);


  const processedParams = React.useRef<any>(null);

  const mapDbLeadToUi = (row: any): Lead => ({
    id: row.id,
    customerId: row.customer_id,
    customerType: row.customer_type,
    customerName: row.customer_name || '',
    name: row.name || row.contact_person || '',
    phone: row.phone || row.contact_phone || '',
    customerAction: row.customer_action || row.customer_behavior || '',
    industry: row.industry || '',
    status: normalizeLeadStatus(row.status || row.clue_status),
    classification: row.classification,
    assignee: row.assignee || row.salesperson || '',
    entryTime: row.entry_time || row.clue_date || '',
    channelPlatform: row.source_channel || row.channel_platform || '',
    source: row.source_type || row.source || row.clue_source || '',
    productCategory: row.product_category || '',
    productSeries: row.product_series || '',
    sourceStatus: row.source_status || '',
    productIndustry: row.product_industry || undefined,
    customerOpportunity: row.customer_opportunity || '',
    closeTime: row.close_time || undefined,
    closeReason: row.close_reason || '',
    creator: row.creator_name || role,
    contactPerson: row.contact_person,
    inquiryId: row.inquiry_id,
    contactId: row.contact_id,
    attachments: parseAttachments(row.attachments),
    buyerRole: row.buyer_role,
    buyingMode: row.buying_mode,
    intentScore: row.intent_score,
    creatorId: row.creator_id || 'system',
    creatorNo: row.creator_no || 'system',
    creatorName: row.creator_name || role,
    createDate: row.create_date || new Date().toISOString().split('T')[0]
  });

  const fetchLeads = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('crm_lead').select('*').order('create_date', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setLeads(data.map(mapDbLeadToUi));
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (selectedLead?.customerId) {
      fetchCustomerContactsFromSupabase(selectedLead.customerId).then(setContacts).catch(() => setContacts([]));
    } else {
      setContacts([]);
    }
  }, [selectedLead?.customerId]);

  useEffect(() => {
    if (viewParams && viewParams !== processedParams.current) {
      processedParams.current = viewParams;
      if (typeof viewParams === 'string') {
        const lead = leads.find(l => l.id === viewParams);
        if (lead) {
          setSelectedLead(lead);
        } else if (isSupabaseConfigured()) {
          (async () => {
            try {
              const supabase = getSupabaseClient();
              const { data, error } = await supabase.from('crm_lead').select('*').eq('id', viewParams).limit(1);
              if (error) throw error;
              const row = data?.[0];
              if (!row) return;
              const fetched = mapDbLeadToUi(row);
              setLeads((prev) => prev.some((l) => l.id === fetched.id) ? prev : [fetched, ...prev]);
              setSelectedLead(fetched);
            } catch (error) {
              console.error('Error fetching lead by id:', error);
            }
          })();
        }
      } else if (viewParams.action === 'new_from_inquiry') {
        const sourceInquiry = mockInquiries.find(i => i.id === viewParams.sourceId);
        const newLead: Lead = {
          id: `L${new Date().getFullYear()}${String(leads.length + 1).padStart(3, '0')}`,
          inquiryId: viewParams.sourceId,
          customerName: sourceInquiry?.companyName || '待定',
          name: sourceInquiry?.customerName || '',
          phone: sourceInquiry?.contact || '',
          customerAction: '找货寻料',
          industry: sourceInquiry?.category || '',
          status: '未跟进',
          assignee: role,
          entryTime: new Date().toISOString().split('T')[0],
          channelPlatform: sourceInquiry?.sourceChannel || '',
          source: '在线',
          productCategory: sourceInquiry?.category || '',
          productSeries: sourceInquiry?.productSeries || '',
          customerId: sourceInquiry?.customerId || `CUST-${Date.now()}`,
          customerType: sourceInquiry?.customerId ? '老客户' : '新客户',
          sourceStatus: '客服',
          creator: role,
          createDate: new Date().toISOString().split('T')[0],
          creatorId: 'U001',
          creatorNo: '001',
          creatorName: role,
          buyerRole: sourceInquiry?.buyerRole,
          buyingMode: sourceInquiry?.buyingMode,
          intentScore: sourceInquiry?.intentScore,
          attachments: sourceInquiry?.attachments || [],
        };
        setLeads(prev => [newLead, ...prev]);
        setSelectedLead(newLead);
      }
    }
  }, [viewParams, leads, role]);

  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(lead => 
    lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: any) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedStatus = normalizeLeadStatus(data.status);
    if (isAdding) {
      try {
        let customerId = data.customerId;
        if (!customerId && data.customerName) {
          try {
            const created = await createPotentialCustomerInSupabase(String(data.customerName));
            customerId = created.id;
          } catch {
            customerId = `PCUST-${Date.now()}`;
          }
        }
        const customerType: '新客户' | '老客户' = String(customerId || '').startsWith('PCUST-') ? '新客户' : '老客户';
        const dbData = {
          id: data.id || `LEAD${new Date().getTime()}`,
          customer_name: data.customerName,
          customer_id: customerId,
          customer_type: customerType,
          name: data.name,
          phone: data.phone,
          customer_action: data.customerAction,
          industry: data.industry,
          status: normalizedStatus,
          assignee: data.assignee,
          source_type: data.source,
          source_channel: data.channelPlatform,
          product_category: data.productCategory,
          product_series: data.productSeries,
          source_status: data.sourceStatus,
          product_industry: data.productIndustry,
          customer_opportunity: data.customerOpportunity,
          close_time: data.closeTime || null,
          close_reason: data.closeReason,
          inquiry_id: data.inquiryId,
          contact_id: data.contactId,
          buyer_role: data.buyerRole,
          buying_mode: data.buyingMode,
          intent_score: data.intentScore,
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          creator_id: 'system',
          creator_name: role,
          entry_time: data.entryTime || today,
          create_date: data.createDate || today,
          updated_at: new Date().toISOString()
        };

        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const { data: insertedData, error } = await supabase.from('crm_lead').upsert(dbData, { onConflict: 'id' }).select('*');
          if (error) throw error;
          if (insertedData && insertedData.length > 0) {
            const newLead = mapDbLeadToUi(insertedData[0]);
            setLeads([newLead, ...leads]);
            triggerAutoFlowsForCreate('lead', newLead, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined).catch((error) => {
              console.error('Error triggering lead workflow:', error);
            });
          }
          setIsAdding(false);
          return;
        }

        const insertedData = [{ ...dbData, id: dbData.id, created_at: new Date().toISOString() }];
        const error = null;

        if (error) {
          console.error('Error adding lead:', error);
          return;
        }

        if (insertedData && insertedData.length > 0) {
          const dbLead = insertedData[0];
          const newLead: Lead = mapDbLeadToUi({
            ...dbLead,
            customer_id: customerId,
            customer_type: customerType,
            customer_name: dbLead.customer_name,
            source: dbLead.source_type || (dbLead as any).source,
            assignee: dbLead.assignee,
            attachments: parseAttachments((dbLead as any).attachments || data.attachments)
          });
          setLeads([newLead, ...leads]);
          triggerAutoFlowsForCreate('lead', newLead, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined).catch((error) => {
            console.error('Error triggering lead workflow:', error);
          });
        }
        setIsAdding(false);
      } catch (error) {
        console.error('Error adding lead:', error);
        toast.error(`新增线索失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
      }
    } else if (selectedLead) {
      try {
        let customerId = data.customerId || selectedLead.customerId;
        if (!customerId && data.customerName) {
          try {
            const created = await createPotentialCustomerInSupabase(String(data.customerName));
            customerId = created.id;
          } catch {
            customerId = `PCUST-${Date.now()}`;
          }
        }
        const customerType: '新客户' | '老客户' = String(customerId || '').startsWith('PCUST-') ? '新客户' : '老客户';
        const dbData = {
          id: selectedLead.id,
          customer_name: data.customerName,
          customer_id: customerId,
          customer_type: customerType,
          name: data.name,
          phone: data.phone,
          customer_action: data.customerAction,
          industry: data.industry,
          status: normalizedStatus,
          assignee: data.assignee,
          source_type: data.source,
          source_channel: data.channelPlatform,
          product_category: data.productCategory,
          product_series: data.productSeries,
          source_status: data.sourceStatus,
          product_industry: data.productIndustry,
          customer_opportunity: data.customerOpportunity,
          close_time: data.closeTime || null,
          close_reason: data.closeReason,
          inquiry_id: data.inquiryId,
          contact_id: data.contactId,
          buyer_role: data.buyerRole,
          buying_mode: data.buyingMode,
          intent_score: data.intentScore,
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
          entry_time: data.entryTime || selectedLead.entryTime || today,
          create_date: data.createDate || selectedLead.createDate || today,
          updated_at: new Date().toISOString(),
        };
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const { data: updatedData, error } = await supabase.from('crm_lead').upsert(dbData, { onConflict: 'id' }).select('*');
          if (error) throw error;
          if (updatedData && updatedData.length > 0) {
            const updatedLead = mapDbLeadToUi(updatedData[0]);
            setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
            setSelectedLead(updatedLead);
            triggerAutoFlowsForCreate(
              'lead',
              updatedLead,
              currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
              { event: 'save', previousRecord: selectedLead || {} }
            ).catch((error) => {
              console.error('Error triggering lead workflow on save:', error);
            });
          }
          setIsEditing(false);
          return;
        }

        const updatedData = [{ ...dbData, id: selectedLead.id }];
        const error = null;

        if (error) {
          console.error('Error updating lead:', error);
          return;
        }

        if (updatedData && updatedData.length > 0) {
          const dbLead = updatedData[0];
          const updatedLead: Lead = {
            ...mapDbLeadToUi({
              ...dbLead,
              customer_id: customerId,
              customer_type: dbLead.customer_type || customerType
            }),
            ...selectedLead,
            ...data,
            customerId,
            customerType: dbLead.customer_type || customerType,
            attachments: parseAttachments((dbLead as any).attachments || data.attachments)
          };
          setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
          setSelectedLead(updatedLead);
          triggerAutoFlowsForCreate(
            'lead',
            updatedLead,
            currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
            { event: 'save', previousRecord: selectedLead || {} }
          ).catch((error) => {
            console.error('Error triggering lead workflow on save:', error);
          });
        }
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating lead:', error);
        toast.error(`更新线索失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
      }
    }
  };

  const [isConvertingToOpportunity, setIsConvertingToOpportunity] = useState(false);
  const [conversionOpportunityData, setConversionOpportunityData] = useState<any>(null);

  const handleConvertToOpportunity = (lead: Lead) => {
    setConversionOpportunityData({
      customerName: lead.customerName,
      name: `商机-${lead.customerName}`,
      contactPerson: lead.name,
      contactPhone: lead.phone,
      assignee: role,
      status: '跟进中',
      expectedAmount: 0,
      expectedClosingDate: new Date().toISOString().split('T')[0],
    });
    setIsConvertingToOpportunity(true);
  };

  const confirmConvertToOpportunity = async (data: any) => {
    if (!selectedLead) return;
    try {
      const oppId = await pushLeadToOpportunityInSupabase(selectedLead, data);
      const updatedLead = { ...selectedLead, status: '转商机' as const };
      setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsConvertingToOpportunity(false);
      navigateTo?.('opportunities', oppId);
    } catch (error) {
      console.error('Error converting lead to opportunity:', error);
      toast.error(`线索转商机失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const opportunityFields = [
    { key: 'customerName', label: '客户名称', required: true },
    { key: 'name', label: '商机名称', required: true },
    { key: 'contactPerson', label: '联系人' },
    { key: 'contactPhone', label: '联系电话' },
    { key: 'expectedAmount', label: '预计金额', type: 'number' },
    { key: 'expectedClosingDate', label: '预计成交日期', type: 'date' },
    { key: 'status', label: '商机状态', type: 'select', options: ['未跟进', '跟进中', '关闭', '转项目'] },
    { key: 'assignee', label: '负责人', type: 'user' },
  ];

  const handleRegenerateAI = async (nodeId: string, field: string, prompt: string) => {
    if (!selectedLead) return;
    setRegeneratingNodes(prev => ({ ...prev, [nodeId]: true }));
    
    try {
      const text = await callAiProxy(`${prompt}
            
            输入内容：
            - 客户：${selectedLead.customerName}
            - 行业：${selectedLead.industry}
            - 沟通记录：${communications.filter(c => c.sourceId === selectedLead.id || c.sourceId === selectedLead.inquiryId).map(c => c.content).join('\n')}
            
            请返回对应的JSON数据结构。
            如果是SPIN，返回: {"spinQuestions": {"situation": [], "problem": [], "implication": [], "needPayoff": []}}
            如果是购买模式，返回: {"buyingMode": "...", "intentScore": 0}
            如果是价值匹配，返回: {"impactCase": {"title": "", "metrics": "", "description": "", "valueStatement": ""}}
            如果是决策链，返回: {"decisionChain": {"economicBuyer": "", "technicalBuyer": "", "userBuyer": "", "coach": "", "missingRoles": []}}
            如果是总结邮件，返回: {"summaryEmailDraft": "..."}}`);

      const result = parseAiJson(text || '{}');
      const updatedLead = { 
        ...selectedLead, 
        aiAnalysis: { 
          ...selectedLead.aiAnalysis,
          ...result 
        } 
      };
      
      setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setRegeneratingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleAddCommunication = (comm: Partial<CommunicationDetail>) => {
    if (!selectedLead) return;
    const newComm: CommunicationDetail = {
      id: `C${Date.now()}`,
      date: new Date().toLocaleString(),
      sender: '张三 (销售)',
      content: '',
      type: 'wechat',
      sourceId: selectedLead.id,
      customerId: selectedLead.customerId,
      ...comm
    };
    setCommunications([newComm, ...communications]);
  };

  const handleAnalyze = async () => {
    if (!selectedLead) return;
    setIsAnalyzing(true);
    
    try {
      const text = await callAiProxy(`请根据以下线索信息进行深度分析，并以JSON格式返回分析结果。
            目标：将线索 (Lead) 转化为商机 (Opportunity)，验证需求真实性并识别购买动机。
            
            分析逻辑遵循以下步骤：
            1. 痛点深度挖掘 (SPIN)：基于客户行业生成一套SPIN提问集（背景、难点、暗示、需求价值）。
            2. 购买模式重校验：基于当前对话（模拟分析）锁定购买模式（增长、困难、平稳、过度自信）。
            3. 初步价值匹配 (IMPACT)：匹配历史库中类似的量化案例，生成一段个性化价值陈述话术。
            4. 决策链初步建档：识别可能的“经济买家”和“技术买家”，指出缺失的关键角色。
            5. 总结邮件草拟：提取前四步信息，草拟一封规范的SPIN总结邮件。
            6. 教练辅导建议：给销售人员提供3条具体的下一步行动建议。
            
            线索信息：
            客户名称：${selectedLead.customerName}
            联系人：${selectedLead.name}
            行业：${selectedLead.industry}
            客户行动：${selectedLead.customerAction}
            沟通记录：${communications.filter(c => c.sourceId === selectedLead.id).map(c => c.content).join('\n')}
            
            返回JSON格式：
            {
              "buyingMode": "增长模式" | "困难模式" | "平稳模式" | "过度自信模式",
              "intentScore": 0-100,
              "spinAnalysis": {
                "situation": ["背景问题1", "背景问题2"],
                "problem": ["难点问题1", "难点问题2"],
                "implication": ["暗示问题1", "暗示问题2"],
                "needPayoff": ["需求价值问题1", "需求价值问题2"]
              },
              "impactCase": {
                "title": "案例标题",
                "metrics": "量化指标（如节省30%时间）",
                "description": "简短描述",
                "valueStatement": "个性化价值陈述话术"
              },
              "decisionChain": {
                "economicBuyer": "可能的职位/人选",
                "technicalBuyer": "可能的职位/人选",
                "userBuyer": "可能的职位/人选",
                "coach": "可能的职位/人选",
                "missingRoles": ["缺失角色1", "缺失角色2"]
              },
              "teachingStory": ["建议1", "建议2", "建议3"],
              "summaryEmailDraft": "邮件正文内容"
            }`);

      const analysisResult = parseAiJson(text || '{}');
      
      const updatedLead = { ...selectedLead, aiAnalysis: analysisResult };
      setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setEditedAnalysis(analysisResult);
    } catch (error) {
      console.error('AI Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!selectedLead || !editedAnalysis) return;
    try {
      const updatedLead = { ...selectedLead, aiAnalysis: editedAnalysis };
      setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
      setSelectedLead(updatedLead);
      setIsEditingAnalysis(false);
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const downstreamCount = lead.status === '转商机' || Boolean((lead as any).customerOpportunity) ? 1 : 0;
    const ok = await ensureDeleteAllowed({ record: lead, entityName: '线索', downstreamCount, downstreamLabel: '下游商机' });
    if (!ok) return;
    try {
      await deleteLeadFromSupabase(leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
      toast.success('线索删除成功');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error(`删除线索失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const fields = [
    { key: 'id', label: '编号' },
    { key: 'customerId', label: '客户ID', disabled: true },
    { key: 'customerName', label: '客户', type: 'customer_lookup', customerIdKey: 'customerId', required: true },
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'customerAction', label: '客户行动', type: 'select', options: LEAD_CUSTOMER_ACTION_OPTIONS },
    { key: 'industry', label: '客户行业' },
    { key: 'status', label: '线索状态', type: 'select', options: LEAD_STATUS_OPTIONS, required: true },
    { key: 'classification', label: '分类标签', type: 'select', options: ['处理中', '有效', '无效'] },
    { key: 'assignee', label: '处理人', type: 'user' },
    { key: 'entryTime', label: '录入时间', type: 'date' },
    { key: 'channelPlatform', label: '来源渠道', type: 'select', options: LEAD_SOURCE_CHANNEL_OPTIONS },
    { key: 'source', label: '来源类型', type: 'select', options: LEAD_SOURCE_TYPE_OPTIONS },
    { key: 'productSeries', label: '产品系列', type: 'category' },
    { key: 'productIndustry', label: '产品所属行业', type: 'select', options: LEAD_PRODUCT_INDUSTRY_OPTIONS },
    { key: 'productCategory', label: '兼容旧字段(可选)' },
    { key: 'sourceStatus', label: '线索来源状态', type: 'select', options: LEAD_SOURCE_STATUS_OPTIONS },
    { key: 'customerOpportunity', label: '客户机会' },
    { key: 'closeTime', label: '关闭时间', type: 'date' },
    { key: 'closeReason', label: '关闭原因' },
    { key: 'attachments', label: '附件', type: 'attachments' },
    { key: 'creator', label: '创建人', type: 'user' },
    { key: 'createDate', label: '创建日期', type: 'date' },
  ];

  const [displayCount, setDisplayCount] = useState(20);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < leads.length) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (selectedLead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedLead(null); if (viewParams) goBack?.(); }}
              className="text-gray-500 hover:text-gray-900 font-medium"
            >
              线索登记
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-bold">{selectedLead.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <ReservedButtons moduleCode="lead_management" contextData={selectedLead} />
            {selectedLead.status !== '转商机' && selectedLead.status !== '关闭' && (
              <button 
                onClick={() => handleConvertToOpportunity(selectedLead)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100"
              >
                <Target className="w-4 h-4" />
                转为商机
              </button>
            )}
            {selectedLead.status !== '转商机' && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                编辑线索
              </button>
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
                  {selectedLead.customerId ? (
                    <button
                      type="button"
                      onClick={() => navigateTo?.('customers', { customerId: selectedLead.customerId })}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {selectedLead.customerName || '未知客户'}
                    </button>
                  ) : (
                    selectedLead.customerName || '未知客户'
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-sm text-gray-500">编号: {selectedLead.id}</span>
                  <span className="text-sm text-gray-500">客户ID: {selectedLead.customerId || '-'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedLead.status === '未跟进' ? 'bg-red-100 text-red-700' :
                    selectedLead.status === '跟进中' ? 'bg-blue-100 text-blue-700' :
                    selectedLead.status === '转商机' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedLead.status}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedLead.customerType === '新客户' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedLead.customerType || '老客户'}
                  </span>
                  {selectedLead.classification && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedLead.classification === '处理中' ? 'bg-blue-100 text-blue-700' :
                      selectedLead.classification === '有效' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedLead.classification}
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
                    <p className="text-sm text-gray-500 mb-1">客户联系人</p>
                    <p className="font-medium text-indigo-600">{selectedLead.contactPerson || '未关联'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">姓名</p>
                    <p className="font-medium text-gray-900">{selectedLead.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">手机号</p>
                    <p className="font-medium text-gray-900">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户行动</p>
                    <p className="font-medium text-gray-900">{selectedLead.customerAction}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户行业</p>
                    <p className="font-medium text-gray-900">{selectedLead.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">处理人</p>
                    <p className="font-medium text-gray-900">{selectedLead.assignee}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">录入时间</p>
                    <p className="font-medium text-gray-900">{selectedLead.entryTime || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">来源渠道</p>
                    <p className="font-medium text-gray-900">{selectedLead.channelPlatform || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">来源类型</p>
                    <p className="font-medium text-gray-900">{selectedLead.source || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">线索来源状态</p>
                    <p className="font-medium text-gray-900">{selectedLead.sourceStatus || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品系列</p>
                    <p className="font-medium text-gray-900">{selectedLead.productSeries || selectedLead.productCategory || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户机会</p>
                    <p className="font-medium text-gray-900">{selectedLead.customerOpportunity || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">关闭时间</p>
                    <p className="font-medium text-gray-900">{selectedLead.closeTime || '-'}</p>
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <p className="text-sm text-gray-500 mb-1">关闭原因</p>
                    <p className="font-medium text-gray-900">{selectedLead.closeReason || '-'}</p>
                  </div>
                  {selectedLead.inquiryId && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">关联询盘</p>
                      <button 
                        onClick={() => navigateTo?.('inquiries', selectedLead.inquiryId)}
                        className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                      >
                        <Link className="w-3 h-3" />
                        {selectedLead.inquiryId}
                      </button>
                    </div>
                  )}
                  <div className="md:col-span-2 xl:col-span-3">
                    <p className="text-sm text-gray-500 mb-1">附件</p>
                    {Array.isArray(selectedLead.attachments) && selectedLead.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedLead.attachments.map((file, idx) => (
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
                <div className="flex flex-wrap border-b border-gray-200 mb-6">
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
                </div>

                {activeDetailTab === 'flow' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <AiStageAssistant
                      kind="lead"
                      title="线索SOP标准"
                      sourceType="lead"
                      sourceId={selectedLead.id}
                      customerId={selectedLead.customerId}
                      customerName={selectedLead.customerName}
                      currentUser={currentUser ? { id: currentUser.id, name: currentUser.name, employeeNo: currentUser.employeeNo } : undefined}
                      sourceRecord={selectedLead as any}
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
        
        <DetailModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="编辑线索"
          data={selectedLead}
          onSave={handleSave}
          fields={fields}
        />

        <DetailModal
          isOpen={isConvertingToOpportunity}
          onClose={() => setIsConvertingToOpportunity(false)}
          title="线索转商机 - 补充资料"
          data={conversionOpportunityData}
          onSave={confirmConvertToOpportunity}
          fields={opportunityFields}
          isEditing={true}
        />

        {isAddingTask && (
          <QuickTaskModal
            isOpen={isAddingTask}
            onClose={() => setIsAddingTask(false)}
            currentUser={currentUser}
            onSave={(taskData) => {
              const newTask: TodoTask = {
                id: `T${Date.now()}`,
                ...taskData,
                status: '待办',
                importance: '中',
                urgency: '正常',
                createDate: new Date().toISOString().split('T')[0],
                assignee: taskData.assigneeName || taskData.assignee,
                assigneeId: taskData.assigneeId || currentUser?.id || 'EMP001',
                assigneeName: taskData.assigneeName || currentUser?.name || '系统管理员',
                sourceType: 'lead',
                sourceId: selectedLead.id,
                taskType: taskData.taskType || '线索跟进',
                creatorId: taskData.creatorId || currentUser?.id || 'EMP001',
                creatorNo: taskData.creatorNo || currentUser?.employeeNo || 'E001',
                creatorName: taskData.creatorName || currentUser?.name || '系统管理员'
              };
              setTasks([newTask, ...tasks]);
              setIsAddingTask(false);
            }}
            initialData={newTaskData}
          />
        )}

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
                leadId: selectedLead.id,
                customerId: selectedLead.customerId,
                lastTime: new Date().toLocaleString(),
                messages: [],
                type: 'wechat'
              };
              setGroupChats([...groupChats, newChat]);
              try {
                await saveGroupChatToSupabase({ ...newChat, sourceGroup: 'lead' });
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
              if (!selectedLead.customerId) {
                toast.error('当前线索未绑定客户ID，无法保存联系人');
                return;
              }
              if (!data.name) {
                toast.error('请填写联系人姓名');
                return;
              }
              try {
                await saveCustomerContactToSupabase(selectedLead.customerId, data);
                toast.success('联系人保存成功');
                fetchCustomerContactsFromSupabase(selectedLead.customerId).then(setContacts);
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
        <h2 className="text-2xl font-bold text-gray-900">线索登记</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索线索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
          </button>
          {(role === '运营' || role === '业务员' || role === '管理员') && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建线索</span>
              <span className="sm:hidden">新建</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search */}
      <div className="relative sm:hidden flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="搜索线索..." 
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
        ) : filteredLeads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            <Target className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">暂无线索数据</p>
            <p className="text-sm mt-1">点击右上角"新建线索"创建</p>
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
                      <th className="px-6 py-4">编号</th>
                      <th className="px-6 py-4">客户名称</th>
                      <th className="px-6 py-4">姓名</th>
                      <th className="px-6 py-4">手机号</th>
                      <th className="px-6 py-4">客户行动</th>
                      <th className="px-6 py-4">客户行业</th>
                      <th className="px-6 py-4">线索状态</th>
                      <th className="px-6 py-4">分类标签</th>
                      <th className="px-6 py-4">处理人</th>
                      <th className="px-6 py-4">录入时间</th>
                      <th className="px-6 py-4">来源渠道</th>
                      <th className="px-6 py-4">来源类型</th>
                      <th className="px-6 py-4">产品系列</th>
                      <th className="px-6 py-4">线索来源状态</th>
                      <th className="px-6 py-4">客户机会</th>
                      <th className="px-6 py-4">关闭时间</th>
                      <th className="px-6 py-4">创建人</th>
                      <th className="px-6 py-4">创建日期</th>
                  <th className="px-6 py-4 sticky right-0 bg-gray-50 z-10">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.slice(0, displayCount).map((lead, index) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedLead(lead)}>{lead.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{lead.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.name}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.customerAction}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.industry}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === '未跟进' ? 'bg-red-100 text-red-800' :
                        lead.status === '跟进中' ? 'bg-blue-100 text-blue-800' :
                        lead.status === '转商机' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.classification && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          lead.classification === '处理中' ? 'bg-blue-100 text-blue-800' :
                          lead.classification === '有效' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.classification}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{lead.assignee}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.entryTime}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.channelPlatform}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.source}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.productSeries || lead.productCategory || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.sourceStatus}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.customerOpportunity || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.closeTime || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.creator}</td>
                    <td className="px-6 py-4 text-gray-600">{lead.createDate}</td>
                    <td className="px-6 py-4 sticky right-0 bg-white z-10">
                      {lead.status !== '转商机' && lead.status !== '关闭' && (
                        <button 
                          onClick={() => handleConvertToOpportunity(lead)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-2"
                        >
                          <Target className="w-4 h-4" />
                          转为商机
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLead(lead.id);
                        }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredLeads.slice(0, displayCount).map((lead) => (
            <div 
              key={lead.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{lead.customerName}</h3>
                  <p className="text-xs text-indigo-600 font-medium">{lead.id}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  lead.status === '未跟进' ? 'bg-red-100 text-red-800' :
                  lead.status === '跟进中' ? 'bg-blue-100 text-blue-800' :
                  lead.status === '转商机' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {lead.status}
                </span>
                {lead.classification && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    lead.classification === '处理中' ? 'bg-blue-100 text-blue-800' :
                    lead.classification === '有效' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lead.classification}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">联系人</p>
                  <p className="text-gray-900">{lead.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">手机号</p>
                  <p className="text-gray-900">{lead.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">客户行业</p>
                  <p className="text-gray-900">{lead.industry}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">处理人</p>
                  <p className="text-gray-900">{lead.assignee}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  录入时间: {(lead.entryTime || '').split('T')[0] || '-'}
                </div>
                <div className="flex items-center gap-3">
                  {lead.status !== '转商机' && lead.status !== '关闭' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertToOpportunity(lead);
                      }}
                      className="text-indigo-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Target className="w-4 h-4" />
                      转商机
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLead(lead.id);
                    }}
                    className="text-red-600 text-sm font-medium flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(lead);
                    }}
                    className="text-indigo-600 text-sm font-medium"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {displayCount < filteredLeads.length && (
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
        title="新建线索"
        data={{
          entryTime: new Date().toISOString().split('T')[0],
          status: '未跟进',
          sourceStatus: '客服',
          source: '在线',
          channelPlatform: '其他',
          customerAction: '找货寻料'
        }}
        onSave={handleSave}
        fields={fields.filter(f => !['id', 'creator', 'createDate', 'updater', 'updateDate', 'associatedOpportunity'].includes(f.key))}
        isEditing={true}
      />
    </div>
  );
}
