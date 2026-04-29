import { toast } from 'react-hot-toast';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, ChevronRight, FileText, Loader2, Sparkles, Send, Edit2, Save, X, RefreshCw, AlertTriangle, Mail, MessageSquare, Link, Users, Briefcase, Target } from 'lucide-react';
import { Role, Opportunity, CommunicationDetail, GroupChat, TodoTask, Customer, User, FileAttachment } from '../types';
import { initialObjects } from '../data/ontologyData';
import ManageMembersModal from '../components/ManageMembersModal';
import QuickTaskModal from '../components/QuickTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import DetailModal from '../components/DetailModal';
import ReservedButtons from '../components/ReservedButtons';
import { callAiProxy } from '../lib/aiProxy';
import { parseAiJson } from '../lib/aiJson';
import Markdown from 'react-markdown';

import AiStageAssistant from '../components/AiStageAssistant';
import CommunicationLog from '../components/CommunicationLog';
import CustomerContactsCards from '../components/CustomerContactsCards';
import CustomerPersonaPanel from '../components/CustomerPersonaPanel';
import SwotMatrixPanel from '../components/SwotMatrixPanel';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { saveCustomerContactToSupabase, saveGroupChatToSupabase, fetchCustomerContactsFromSupabase } from '../lib/customerInteractionRepository';
import { createPotentialCustomerInSupabase } from '../lib/potentialCustomerRepository';
import { fetchArchitectureDataFromSupabase } from '../lib/architectureRepository';
import { pushOpportunityToProjectInSupabase, deleteOpportunityFromSupabase } from '../lib/pushdown';
import { triggerAutoFlowsForCreate } from '../lib/workflowRunner';
import { ensureDeleteAllowed } from '../lib/deleteGuard';

const OPPORTUNITY_STATUS_OPTIONS = ['未跟进', '跟进中', '关闭', '转项目'];
const PRODUCT_INDUSTRY_OPTIONS = ['基础接插件', '新能源', '线束', '定制', '胜蓝', '胜蓝电气', '工业'];
const PRODUCT_LINE_OPTIONS = ['接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他'];
const normalizeOpportunityStatus = (status?: string): Opportunity['status'] => {
  if (status === '已流失' || status === '已关闭') return '关闭';
  if (status === '未跟进' || status === '跟进中' || status === '关闭' || status === '转项目') return status;
  return '跟进中';
};
const normalizeOpportunityProductLine = (line?: string): Opportunity['productLine'] => {
  const value = String(line || '').trim();
  if (!value) return '其他';
  if (PRODUCT_LINE_OPTIONS.includes(value as any)) return value as Opportunity['productLine'];
  if (value.includes('线束')) return '线束';
  if (value.toUpperCase().includes('IO')) return 'IO连接器';
  if (value.includes('工业')) return '工业连接器';
  if (value.includes('接插件')) return '接插件';
  if (value.includes('电子') || value.includes('电气')) return '电子电气';
  return '其他';
};

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

const isMissingOpportunityCustomerTypeColumn = (error: any): boolean => {
  const message = String(error?.message || '');
  return error?.code === 'PGRST204' && message.includes("'customer_type'") && message.includes("'crm_opportunity'");
};

interface OpportunitiesProps {
  role: Role;
  currentUser?: User;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Opportunities({ role, currentUser, viewParams, navigateTo, goBack }: OpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [communications, setCommunications] = useState<CommunicationDetail[]>([]);
  const [regeneratingNodes, setRegeneratingNodes] = useState<Record<string, boolean>>({});
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [isAddingGroupChat, setIsAddingGroupChat] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState<any>(null);


  const handleSyncChats = () => {
    setIsSyncingChats(true);
    setTimeout(() => {
      setIsSyncingChats(false);
    }, 1500);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<string>('');
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'flow' | 'swot'>('flow');

  const processedParams = React.useRef<any>(null);

  const mapDbOppToUi = (row: any): Opportunity => ({
    id: row.id,
    customerId: row.customer_id,
    customerType: row.customer_type,
    customerName: row.customer_name || '',
    oppDate: row.opp_date || new Date().toISOString().split('T')[0],
    status: normalizeOpportunityStatus(row.status),
    oppSummary: row.opp_summary || '',
    closeTime: row.close_time || undefined,
    closeReason: row.close_reason || undefined,
    productLine: normalizeOpportunityProductLine(row.product_line),
    salesRep: row.sales_rep || '',
    projectManager: row.project_manager || '',
    productOwner: row.product_owner || '',
    oppLevel: row.opp_level || 'B级',
    intentAmount: String(row.intent_amount || '0'),
    associatedProject: row.associated_project || '',
    endCustomer: row.end_customer || '',
    endProject: row.end_project || '',
    applicationScenario: row.application_scenario || '',
    estimatedUsage: row.estimated_usage || '',
    estimatedMassProductionDate: row.estimated_mass_production_date || undefined,
    salesType: row.sales_type || '',
    productIndustry: row.product_industry || '',
    productSeries: row.product_series || '',
    completeness: Number(row.completeness || 0),
    contactPerson: row.contact_person || '',
    contactId: row.contact_id || undefined,
    attachments: parseAttachments(row.attachments),
    leadId: row.lead_id,
    inquiryId: row.inquiry_id,
    creatorId: row.creator_id || 'system',
    creatorNo: row.creator_no || 'system',
    creatorName: row.creator_name || role,
    createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    aiAnalysis: row.ai_analysis || undefined
  });

  const fetchOpportunities = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('crm_opportunity').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
        setOpportunities(data.map(mapDbOppToUi));
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const upsertOpportunityWithSchemaFallback = async (dbData: any) => {
    const supabase = getSupabaseClient();
    const primaryResult = await supabase.from('crm_opportunity').upsert(dbData, { onConflict: 'id' }).select('*');
    if (!isMissingOpportunityCustomerTypeColumn(primaryResult.error)) return primaryResult;

    const { customer_type: _ignored, ...fallbackData } = dbData;
    const fallbackResult = await supabase.from('crm_opportunity').upsert(fallbackData, { onConflict: 'id' }).select('*');
    if (!fallbackResult.error) {
      console.warn("Column 'crm_opportunity.customer_type' missing, retried upsert without this field.");
    }
    return fallbackResult;
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    if (selectedOpp?.customerId) {
      fetchCustomerContactsFromSupabase(selectedOpp.customerId).then(setContacts).catch(() => setContacts([]));
    } else {
      setContacts([]);
    }
  }, [selectedOpp?.customerId]);

  useEffect(() => {
    if (viewParams && viewParams !== processedParams.current) {
      processedParams.current = viewParams;
      if (typeof viewParams === 'string') {
        const opp = opportunities.find(o => o.id === viewParams);
        if (opp) {
          setSelectedOpp(opp);
        } else if (isSupabaseConfigured()) {
          (async () => {
            try {
              const supabase = getSupabaseClient();
              const { data, error } = await supabase.from('crm_opportunity').select('*').eq('id', viewParams).limit(1);
              if (error) throw error;
              const row = data?.[0];
              if (!row) return;
              const fetched = mapDbOppToUi(row);
              setOpportunities((prev) => prev.some((o) => o.id === fetched.id) ? prev : [fetched, ...prev]);
              setSelectedOpp(fetched);
            } catch (error) {
              console.error('Error fetching opportunity by id:', error);
            }
          })();
        }
      } else if (viewParams.action === 'new_from_lead') {
        (async () => {
          let sourceLead: any = null;
          if (isSupabaseConfigured() && viewParams.sourceId) {
            try {
              const supabase = getSupabaseClient();
              const { data, error } = await supabase
                .from('crm_lead')
                .select('*')
                .eq('id', viewParams.sourceId)
                .limit(1);
              if (error) throw error;
              sourceLead = data?.[0] || null;
            } catch (error) {
              console.error('Error fetching lead for new opportunity:', error);
            }
          }
          const newOpp: Opportunity = {
            id: `O${new Date().getFullYear()}${String(opportunities.length + 1).padStart(3, '0')}`,
            leadId: viewParams.sourceId,
            inquiryId: sourceLead?.inquiry_id,
            customerName: sourceLead?.customer_name || '待定',
            oppDate: new Date().toISOString().split('T')[0],
            status: '未跟进',
            oppSummary: sourceLead?.customer_action ? `来自线索: ${sourceLead.customer_action}` : '新商机 (来自线索)',
            productLine: normalizeOpportunityProductLine(sourceLead?.product_category),
            salesRep: role,
            projectManager: '',
            productOwner: '',
            oppLevel: 'B级',
            intentAmount: '0',
            associatedProject: '',
            endCustomer: '',
            endProject: '',
            applicationScenario: '',
            estimatedUsage: '',
            estimatedMassProductionDate: '',
            salesType: '新客户',
            productIndustry: sourceLead?.industry || '',
            productSeries: sourceLead?.product_series || '',
            customerId: sourceLead?.customer_id || `CUST-${Date.now()}`,
            customerType: sourceLead?.customer_type || (sourceLead?.customer_id ? '老客户' : '新客户'),
            completeness: 10,
            creatorId: 'U001',
            creatorNo: '001',
            creatorName: role,
            createDate: new Date().toISOString().split('T')[0],
            attachments: parseAttachments(sourceLead?.attachments),
          };
          setOpportunities(prev => [newOpp, ...prev]);
          setSelectedOpp(newOpp);
        })();
      }
    }
  }, [viewParams, opportunities, role]);

  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOpportunities = opportunities.filter(opp => 
    opp.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opp.oppSummary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: any) => {
    try {
      if (!isSupabaseConfigured()) {
        toast.error('未配置 Supabase，无法保存商机数据');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const normalizedStatus = normalizeOpportunityStatus(data.status);
      const cleanCustomerName = String(data.customerName || '').trim();
      const matchedCustomer = customers.find((c) => c.id === data.customerId || (cleanCustomerName && c.name === cleanCustomerName));
      const id = data.id || (isAdding ? `OP${new Date().getTime()}` : selectedOpp?.id);
      let resolvedCustomerId =
        data.customerId || selectedOpp?.customerId || matchedCustomer?.id || '';

      if (!resolvedCustomerId && cleanCustomerName) {
        const created = await createPotentialCustomerInSupabase(cleanCustomerName);
        resolvedCustomerId = created.id;
      }

      const dbData = {
        id,
        customer_id: resolvedCustomerId || `CUST-${Date.now()}`,
        customer_type: matchedCustomer || selectedOpp?.customerType === '老客户' ? '老客户' : (resolvedCustomerId ? '新客户' : '新客户'),
        customer_name: cleanCustomerName,
        opp_date: data.oppDate || today,
        status: normalizedStatus,
        opp_summary: data.oppSummary,
        close_time: data.closeTime || null,
        close_reason: data.closeReason,
        product_line: normalizeOpportunityProductLine(data.productLine),
        sales_rep: data.salesRep,
        project_manager: data.projectManager,
        product_owner: data.productOwner,
        opp_level: data.oppLevel,
        intent_amount: Number(data.intentAmount || 0),
        associated_project: data.associatedProject,
        end_customer: data.endCustomer,
        end_project: data.endProject,
        application_scenario: data.applicationScenario,
        estimated_usage: data.estimatedUsage,
        estimated_mass_production_date: data.estimatedMassProductionDate || null,
        sales_type: data.salesType,
        product_industry: data.productIndustry,
        product_series: data.productSeries,
        completeness: Number(data.completeness || 0),
        contact_person: data.contactPerson,
        lead_id: data.leadId,
        inquiry_id: data.inquiryId,
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        updated_at: new Date().toISOString()
      };
      const { data: savedRows, error } = await upsertOpportunityWithSchemaFallback(dbData);
      if (error) throw error;
      if (savedRows && savedRows.length > 0) {
        const savedOpp = mapDbOppToUi(savedRows[0]);
        if (isAdding) {
          setOpportunities([savedOpp, ...opportunities]);
          setIsAdding(false);
          triggerAutoFlowsForCreate('opportunity', savedOpp, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined).catch((error) => {
            console.error('Error triggering opportunity workflow:', error);
          });
        } else {
          setOpportunities(opportunities.map(o => o.id === savedOpp.id ? savedOpp : o));
          setSelectedOpp(savedOpp);
            triggerAutoFlowsForCreate(
              'opportunity',
              savedOpp,
              currentUser ? { id: currentUser.id, name: currentUser.name } : undefined,
              { event: 'save', previousRecord: selectedOpp || {} }
            ).catch((error) => {
              console.error('Error triggering opportunity workflow on save:', error);
            });
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error saving opportunity:', error);
      toast.error(`保存商机失败：${(error as Error)?.message || '请检查 Supabase 权限配置'}`);
    }
  };

  const handleGenerateCustomerProfile = () => {
    if (!selectedOpp?.customerId || !selectedOpp.customerName) {
      toast.error('请先确保商机中存在客户ID和客户名称');
      return;
    }
    const exists = customers.some((c) => c.id === selectedOpp.customerId);
    if (exists) {
      toast.error('该客户资料已存在，客户ID保持不变。');
      return;
    }
    const newCustomer: Customer = {
      id: selectedOpp.customerId,
      name: selectedOpp.customerName,
      level: '普通客户',
      status: '活跃',
      industry: selectedOpp.productIndustry || '未分类',
      source: '商机生成',
      region: '待完善',
      salesRep: selectedOpp.salesRep || role,
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: role,
      createDate: new Date().toISOString().split('T')[0],
      contacts: [],
      followUps: [],
      opportunityIds: [selectedOpp.id]
    };
    const saveCustomer = async () => {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('ba_manucustinfo').upsert({
          id: newCustomer.id,
          name: newCustomer.name,
          level: newCustomer.level,
          status: newCustomer.status,
          industry: newCustomer.industry,
          source: newCustomer.source,
          region: newCustomer.region,
          sales_rep: newCustomer.salesRep
        }, { onConflict: 'id' });
        if (error) throw error;
      }
      setCustomers((prev) => [newCustomer, ...prev]);
      setOpportunities((prev) => prev.map((item) => item.id === selectedOpp.id ? { ...item, customerType: '新客户' } : item));
      setSelectedOpp({ ...selectedOpp, customerType: '新客户' });
      toast.error(`已按客户ID ${selectedOpp.customerId} 生成客户资料。`);
    };
    saveCustomer().catch((error) => {
      console.error('Error generating customer profile:', error);
      toast.error('生成客户资料失败，请检查 Supabase 权限与连接。');
    });
  };

  const handleRegenerateAI = async (nodeId: string, field: string, prompt: string) => {
    if (!selectedOpp) return;
    setRegeneratingNodes(prev => ({ ...prev, [nodeId]: true }));
    
    try {
      const text = await callAiProxy(`${prompt}
            
            输入内容：
            - 客户：${selectedOpp.customerName}
            - 概要：${selectedOpp.oppSummary}
            - 沟通记录：${communications.filter(c => c.sourceId === selectedOpp.id || (selectedOpp.leadId && c.sourceId === selectedOpp.leadId)).map(c => c.content).join('\n')}
            
            请返回对应的JSON数据结构。
            如果是SPIN，返回: {"spinAnalysis": {"situation": "", "problem": "", "implication": "", "needPayoff": "", "deepQuestions": []}}
            如果是决策链，返回: {"blueSheet": {"economicBuyer": {}, "technicalBuyer": {}, "userBuyer": {}, "coach": {}}}
            如果是商业教学，返回: {"teachingStory": {"concept": "", "impactCase": "", "valueStatement": ""}}
            如果是风险检测，返回: {"redFlags": [{"risk": "", "severity": "高" | "中" | "低", "description": ""}]}}`);

      const result = parseAiJson(text || '{}');
      const updatedOpp = { 
        ...selectedOpp, 
        aiAnalysis: { 
          ...selectedOpp.aiAnalysis,
          ...result 
        } 
      };
      
      setOpportunities(opportunities.map(o => o.id === updatedOpp.id ? updatedOpp : o));
      setSelectedOpp(updatedOpp);
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setRegeneratingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleAddCommunication = (comm: Partial<CommunicationDetail>) => {
    if (!selectedOpp) return;
    const newComm: CommunicationDetail = {
      id: `C${Date.now()}`,
      date: new Date().toLocaleString(),
      sender: '张三 (销售)',
      content: '',
      type: 'wechat',
      sourceId: selectedOpp.id,
      customerId: selectedOpp.customerId,
      ...comm
    };
    setCommunications([newComm, ...communications]);
  };
  const handleAIAnalysis = async () => {
    if (!selectedOpp) return;
    setIsAnalyzing(true);
    try {
      const prompt = `
        作为一名资深销售专家，请基于 Miller Heiman 战略销售、SPIN 销售法及挑战式销售理论分析以下商机数据。
        目标：将商机 (Opportunity) 转化为项目 (Project)，从确认“有需求”转向“深度对标并锁定方案”。
        
        分析逻辑：
        1. 深度痛点与需求确认 (SPIN)：生成针对线束定制的深度提问脚本。
        2. 决策链 (买家角色) 识别：识别经济买家、技术买家、用户买家和教练。
        3. 商业教学与认知重构 (IMPACT)：生成基于量化价值的教学故事。
        4. 红旗风险检测与个人赢 (Win-Results) 分析：识别交易漏洞并确保方案能让每个相关人感到“赢”。
        5. 阶段性总结邮件草拟：草拟一份包含现状、目标、所需能力、下一步计划的总结邮件。
        
        商机信息：
        客户名称: ${selectedOpp.customerName}
        商机概要: ${selectedOpp.oppSummary}
        产品线: ${selectedOpp.productLine}
        行业: ${selectedOpp.productIndustry}
        沟通记录: ${communications.filter(c => c.sourceId === selectedOpp.id).map(c => c.content).join('\n')}
        
        请输出JSON格式，包含以下字段：
        {
          "winProbability": 0-100,
          "spinAnalysis": {
            "situation": "现状分析",
            "problem": "潜在问题识别",
            "implication": "暗示后果分析",
            "needPayoff": "需求确认建议",
            "deepQuestions": ["深度提问1", "深度提问2"]
          },
          "blueSheet": {
            "economicBuyer": { "name": "姓名/职位", "position": "职位", "status": "已接触" | "未接触", "winResult": "个人赢/结果" },
            "technicalBuyer": { "name": "姓名/职位", "position": "职位", "status": "已接触" | "未接触", "winResult": "个人赢/结果" },
            "userBuyer": { "name": "姓名/职位", "position": "职位", "status": "已接触" | "未接触", "winResult": "个人赢/结果" },
            "coach": { "name": "姓名/职位", "position": "职位", "status": "已接触" | "未接触", "winResult": "个人赢/结果" }
          },
          "teachingStory": {
            "concept": "新思路概念",
            "impactCase": "量化价值案例",
            "valueStatement": "挑战现状的话术"
          },
          "redFlags": [
            { "risk": "风险点", "severity": "高" | "中" | "低", "description": "风险描述" }
          ],
          "summaryEmailDraft": "总结邮件正文"
        }
      `;
      const text = await callAiProxy(prompt);
      const analysis = parseAiJson(text || '{}');
      
      const updatedOpp = { ...selectedOpp, aiAnalysis: analysis };
      setOpportunities(opportunities.map(o => o.id === selectedOpp.id ? updatedOpp : o));
      setSelectedOpp(updatedOpp);
      setEditedAnalysis(JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!selectedOpp) return;
    try {
      const analysis = JSON.parse(editedAnalysis);
      const updatedOpp = { ...selectedOpp, aiAnalysis: analysis };
      setOpportunities(opportunities.map(o => o.id === selectedOpp.id ? updatedOpp : o));
      setSelectedOpp(updatedOpp);
      setIsEditingAnalysis(false);
    } catch (error) {
      console.error('Failed to save analysis:', error);
      toast.error('JSON格式错误，请检查');
    }
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) return;
    const downstreamCount = opp.status === '转项目' || Boolean((opp as any).associatedProject) ? 1 : 0;
    const ok = await ensureDeleteAllowed({ record: opp, entityName: '商机', downstreamCount, downstreamLabel: '下游项目' });
    if (!ok) return;
    try {
      await deleteOpportunityFromSupabase(opportunityId);
      setOpportunities(opportunities.filter(o => o.id !== opportunityId));
      if (selectedOpp?.id === opportunityId) {
        setSelectedOpp(null);
      }
      toast.success('商机删除成功');
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast.error(`删除商机失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleConvertToProject = async (opp: Opportunity) => {
    try {
      const projectId = await pushOpportunityToProjectInSupabase(opp);
      const updatedOpp = { ...opp, status: '转项目' as const, associatedProject: projectId };
      setOpportunities(opportunities.map(o => o.id === updatedOpp.id ? updatedOpp : o));
      setSelectedOpp(updatedOpp);
      navigateTo?.('projects', projectId);
    } catch (error) {
      console.error('Error converting opportunity to project:', error);
      toast.error(`商机转项目失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const fields = [
    { key: 'id', label: '编号' },
    { key: 'customerId', label: '客户ID', disabled: true },
    { key: 'customerName', label: '客户名称', type: 'customer_lookup', customerIdKey: 'customerId', required: true },
    { key: 'oppDate', label: '商机日期', type: 'date', required: true },
    { key: 'status', label: '商机状态', type: 'select', options: OPPORTUNITY_STATUS_OPTIONS, required: true },
    { key: 'oppSummary', label: '商机概要', type: 'textarea' },
    { key: 'closeTime', label: '关闭时间', type: 'date' },
    { key: 'closeReason', label: '关闭原因' },
    { key: 'productLine', label: '产品线', type: 'select', options: PRODUCT_LINE_OPTIONS },
    { key: 'salesRep', label: '业务员', type: 'user' },
    { key: 'projectManager', label: '项目经理', type: 'user' },
    { key: 'productOwner', label: '产品负责人', type: 'user' },
    { key: 'oppLevel', label: '商机等级', type: 'select', options: ['S级', 'A级', 'B级', 'C级'] },
    { key: 'intentAmount', label: '意向金额(RMB)' },
    { key: 'associatedProject', label: '关联项目' },
    { key: 'endCustomer', label: '终端客户' },
    { key: 'endProject', label: '终端项目' },
    { key: 'applicationScenario', label: '应用场景' },
    { key: 'estimatedUsage', label: '预估用量' },
    { key: 'estimatedMassProductionDate', label: '预计量产时间', type: 'date' },
    { key: 'salesType', label: '销售类型' },
    { key: 'productIndustry', label: '产品所属行业', type: 'select', options: PRODUCT_INDUSTRY_OPTIONS },
    { key: 'productSeries', label: '产品系列' },
    { key: 'contactPerson', label: '客户联系人' },
    { key: 'attachments', label: '附件', type: 'attachments' },
    { key: 'completeness', label: '完整度%', type: 'number' },
    { key: 'creatorName', label: '创建人', type: 'user' },
    { key: 'createDate', label: '创建日期', type: 'date' },
  ];

  const [displayCount, setDisplayCount] = useState(20);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < opportunities.length) {
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

  if (selectedOpp) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedOpp(null); if (viewParams) goBack?.(); }}
              className="text-gray-500 hover:text-gray-900 font-medium"
            >
              商机管理
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-bold">{selectedOpp.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <ReservedButtons moduleCode="opportunity_management" contextData={selectedOpp} />
            {selectedOpp.status !== '转项目' && selectedOpp.status !== '关闭' && (
              <button 
                onClick={() => handleConvertToProject(selectedOpp)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100"
              >
                <Briefcase className="w-4 h-4" />
                转为项目
              </button>
            )}
            {selectedOpp.status !== '转项目' && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                编辑商机
              </button>
            )}
            <button
              onClick={handleGenerateCustomerProfile}
              className="px-4 py-2 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg text-sm font-medium hover:bg-violet-100"
            >
              生成客户资料
            </button>
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
                  {selectedOpp.customerId ? (
                    <button
                      type="button"
                      onClick={() => navigateTo?.('customers', { customerId: selectedOpp.customerId })}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {selectedOpp.customerName || '未知客户'}
                    </button>
                  ) : (
                    selectedOpp.customerName || '未知客户'
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-sm text-gray-500">编号: {selectedOpp.id}</span>
                  <span className="text-sm text-gray-500">客户ID: {selectedOpp.customerId || '-'}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedOpp.status === '未跟进' ? 'bg-amber-100 text-amber-700' :
                    selectedOpp.status === '跟进中' ? 'bg-blue-100 text-blue-700' :
                    selectedOpp.status === '转项目' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedOpp.status}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedOpp.customerType === '新客户' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedOpp.customerType || '老客户'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    selectedOpp.oppLevel === 'S级' ? 'bg-red-100 text-red-700' :
                    selectedOpp.oppLevel === 'A级' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedOpp.oppLevel}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">意向金额</p>
              <p className="text-2xl font-bold text-gray-900">¥{selectedOpp.intentAmount}</p>
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
                    <p className="text-sm text-gray-500 mb-1">商机日期</p>
                    <p className="font-medium text-gray-900">{selectedOpp.oppDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">客户联系人</p>
                    <p className="font-medium text-indigo-600">{selectedOpp.contactPerson || '未关联'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品线</p>
                    <p className="font-medium text-gray-900">{selectedOpp.productLine}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">关闭时间</p>
                    <p className="font-medium text-gray-900">{selectedOpp.closeTime || '-'}</p>
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <p className="text-sm text-gray-500 mb-1">关闭原因</p>
                    <p className="font-medium text-gray-900">{selectedOpp.closeReason || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">业务员</p>
                    <p className="font-medium text-gray-900">{selectedOpp.salesRep}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">项目经理</p>
                    <p className="font-medium text-gray-900">{selectedOpp.projectManager}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品负责人</p>
                    <p className="font-medium text-gray-900">{selectedOpp.productOwner}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">关联项目</p>
                    <p className="font-medium text-gray-900">{selectedOpp.associatedProject || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">终端客户</p>
                    <p className="font-medium text-gray-900">{selectedOpp.endCustomer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">终端项目</p>
                    <p className="font-medium text-gray-900">{selectedOpp.endProject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">应用场景</p>
                    <p className="font-medium text-gray-900">{selectedOpp.applicationScenario || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">预估用量</p>
                    <p className="font-medium text-gray-900">{selectedOpp.estimatedUsage || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">预计量产时间</p>
                    <p className="font-medium text-gray-900">{selectedOpp.estimatedMassProductionDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">销售类型</p>
                    <p className="font-medium text-gray-900">{selectedOpp.salesType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品所属行业</p>
                    <p className="font-medium text-gray-900">{selectedOpp.productIndustry}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">产品系列</p>
                    <p className="font-medium text-gray-900">{selectedOpp.productSeries}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">完整度</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${selectedOpp.completeness >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${selectedOpp.completeness}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700">{selectedOpp.completeness}%</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">商机概要</p>
                    <p className="font-medium text-gray-900">{selectedOpp.oppSummary || '-'}</p>
                  </div>
                  {selectedOpp.leadId && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">关联线索</p>
                      <button 
                        onClick={() => navigateTo?.('leads', selectedOpp.leadId)}
                        className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                      >
                        <Link className="w-3 h-3" />
                        {selectedOpp.leadId}
                      </button>
                    </div>
                  )}
                  {selectedOpp.inquiryId && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">关联询盘</p>
                      <button 
                        onClick={() => navigateTo?.('inquiries', selectedOpp.inquiryId)}
                        className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                      >
                        <Link className="w-3 h-3" />
                        {selectedOpp.inquiryId}
                      </button>
                    </div>
                  )}
                  <div className="col-span-3">
                    <p className="text-sm text-gray-500 mb-1">附件</p>
                    {Array.isArray(selectedOpp.attachments) && selectedOpp.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedOpp.attachments.map((file, idx) => (
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
                  <button
                    onClick={() => setActiveDetailTab('swot')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'swot'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Target className="w-4 h-4" />
                    竞争与SWOT
                  </button>
                </div>

                {activeDetailTab === 'flow' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <AiStageAssistant
                      kind="opportunity"
                      title="商机SOP标准"
                      sourceType="opportunity"
                      sourceId={selectedOpp.id}
                      customerId={selectedOpp.customerId}
                      customerName={selectedOpp.customerName}
                      currentUser={currentUser ? { id: currentUser.id, name: currentUser.name, employeeNo: currentUser.employeeNo } : undefined}
                      sourceRecord={selectedOpp as any}
                    />
                  </div>
                )}
                {activeDetailTab === 'swot' && (
                  <SwotMatrixPanel
                    customerId={selectedOpp.customerId}
                    customerName={selectedOpp.customerName}
                    persona={personas.find((p: any) => p.customerId === selectedOpp.customerId) || null}
                    communicationHighlights={communications
                      .filter(c =>
                        c.sourceId === selectedOpp.id ||
                        (selectedOpp.leadId && c.sourceId === selectedOpp.leadId) ||
                        (selectedOpp.inquiryId && c.sourceId === selectedOpp.inquiryId) ||
                        (selectedOpp.customerId && c.sourceId === selectedOpp.customerId)
                      )
                      .map((c) => `${c.date || ''} ${c.content || ''}`)
                      .slice(0, 30)}
                  />
                )}
              </div>

            </div>
          </div>
        </div>
        
        <DetailModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="编辑商机"
          data={selectedOpp}
          onSave={handleSave}
          fields={fields}
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
                opportunityId: selectedOpp?.id,
                customerId: selectedOpp?.customerId,
                lastTime: new Date().toLocaleString(),
                messages: [],
                type: 'wechat'
              };
              setGroupChats([...groupChats, newChat]);
              try {
                await saveGroupChatToSupabase({ ...newChat, sourceGroup: 'opportunity' });
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
              { key: 'name', label: '姓名', required: true },
              { key: 'position', label: '职位' },
              { key: 'phone', label: '电话' },
              { key: 'email', label: '邮箱' },
              { key: 'buyingRole', label: '购买角色', type: 'select', options: ['经济买家', '技术买家', '用户买家', '教练'] }
            ]}
            data={null}
            onSave={async (data) => {
              if (!selectedOpp?.customerId) {
                toast.error('当前商机未绑定客户ID，无法保存联系人');
                return;
              }
              if (!data.name) {
                toast.error('请填写联系人姓名');
                return;
              }
              try {
                await saveCustomerContactToSupabase(selectedOpp.customerId, data);
                toast.success('联系人保存成功');
                fetchCustomerContactsFromSupabase(selectedOpp.customerId).then(setContacts);
              } catch (error) {
                console.error('Error saving contact:', error);
                toast.error(`联系人保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
                return;
              }
              setIsAddingContact(false);
            }}
          />
        )}

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
                sourceType: 'opportunity',
                sourceId: selectedOpp.id,
                taskType: taskData.taskType || '商机推进',
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">商机管理</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索商机..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">筛选</span>
          </button>
          {(role === '业务员' || role === '管理员') && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建商机</span>
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
          placeholder="搜索商机..." 
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
        ) : filteredOpportunities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            <Briefcase className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">暂无商机数据</p>
            <p className="text-sm mt-1">点击右上角"新建商机"创建</p>
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
                      <th className="px-6 py-4">商机日期</th>
                      <th className="px-6 py-4">商机状态</th>
                      <th className="px-6 py-4">商机概要</th>
                      <th className="px-6 py-4">产品线</th>
                      <th className="px-6 py-4">业务员</th>
                      <th className="px-6 py-4">项目经理</th>
                      <th className="px-6 py-4">产品负责人</th>
                      <th className="px-6 py-4">商机等级</th>
                      <th className="px-6 py-4">意向金额(RMB)</th>
                      <th className="px-6 py-4">关联项目</th>
                      <th className="px-6 py-4">终端客户</th>
                      <th className="px-6 py-4">终端项目</th>
                      <th className="px-6 py-4">应用场景</th>
                      <th className="px-6 py-4">预估用量</th>
                      <th className="px-6 py-4">预计量产时间</th>
                      <th className="px-6 py-4">销售类型</th>
                      <th className="px-6 py-4">产品所属行业</th>
                      <th className="px-6 py-4">产品系列</th>
                      <th className="px-6 py-4">关闭时间</th>
                      <th className="px-6 py-4">完整度%</th>
                      <th className="px-6 py-4 sticky right-0 bg-gray-50 z-10">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOpportunities.slice(0, displayCount).map((opp, index) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedOpp(opp)}>{opp.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{opp.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.oppDate}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        opp.status === '未跟进' ? 'bg-amber-100 text-amber-800' :
                        opp.status === '跟进中' ? 'bg-blue-100 text-blue-800' :
                        opp.status === '转项目' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{opp.oppSummary}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.productLine}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.salesRep}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.projectManager}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.productOwner}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                        opp.oppLevel === 'S级' ? 'bg-red-100 text-red-700' :
                        opp.oppLevel === 'A级' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {opp.oppLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">¥{opp.intentAmount}</td>
                    <td className="px-6 py-4 text-indigo-600 cursor-pointer hover:underline" onClick={() => opp.associatedProject && navigateTo?.('projects', opp.associatedProject)}>{opp.associatedProject || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.endCustomer}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.endProject}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.applicationScenario || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.estimatedUsage || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.estimatedMassProductionDate || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.salesType}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.productIndustry}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.productSeries}</td>
                    <td className="px-6 py-4 text-gray-600">{opp.closeTime || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${opp.completeness >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${opp.completeness}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{opp.completeness}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 sticky right-0 bg-white z-10">
                      {opp.status !== '转项目' && opp.status !== '关闭' && (
                        <button 
                          onClick={() => handleConvertToProject(opp)}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm font-medium mb-2"
                        >
                          <Briefcase className="w-4 h-4" />
                          转为项目
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOpportunity(opp.id);
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
          {filteredOpportunities.slice(0, displayCount).map((opp) => (
            <div 
              key={opp.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
              onClick={() => setSelectedOpp(opp)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{opp.customerName}</h3>
                  <p className="text-xs text-indigo-600 font-medium">{opp.id}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  opp.status === '未跟进' ? 'bg-amber-100 text-amber-800' :
                  opp.status === '跟进中' ? 'bg-blue-100 text-blue-800' :
                  opp.status === '转项目' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {opp.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">商机等级</p>
                  <p className="text-gray-900 font-bold text-indigo-600">{opp.oppLevel}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">意向金额</p>
                  <p className="text-gray-900 font-medium">¥{opp.intentAmount}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">业务员</p>
                  <p className="text-gray-900">{opp.salesRep}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">完整度</p>
                  <p className="text-gray-900">{opp.completeness}%</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  日期: {opp.oppDate}
                </div>
                <div className="flex items-center gap-3">
                  {opp.status !== '转项目' && opp.status !== '关闭' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertToProject(opp);
                      }}
                      className="text-emerald-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Briefcase className="w-4 h-4" />
                      转项目
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOpportunity(opp.id);
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
                      setSelectedOpp(opp);
                    }}
                    className="text-indigo-600 text-sm font-medium"
                  >
                    详情
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {displayCount < filteredOpportunities.length && (
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
        title="新建商机"
        data={{
          oppDate: new Date().toISOString().split('T')[0],
          status: '未跟进',
          oppLevel: 'B级',
          completeness: 0,
          productLine: 'IO连接器'
        }}
        onSave={handleSave}
        fields={fields.filter(f => !['id', 'creator', 'createDate', 'updater', 'updateDate', 'associatedProject'].includes(f.key))}
        isEditing={true}
      />
    </div>
  );
}
