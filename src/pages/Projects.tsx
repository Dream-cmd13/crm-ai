import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, ChevronRight } from 'lucide-react';
import { callAiProxy } from '../lib/aiProxy';
import { parseAiJson } from '../lib/aiJson';
import { Role, Project, GroupChat, TodoTask, CommunicationDetail, User } from '../types';
import { cn } from '../lib/utils';
import DetailModal from '../components/DetailModal';
import { ProcessingNode } from '../components/ProcessingFlow';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectDetail } from '../components/projects/ProjectDetail';
import { fetchProjectByIdFromSupabase, fetchProjectsFromSupabase, saveProjectToSupabase, deleteProjectFromSupabase } from '../lib/projectRepository';
import { triggerAutoFlowsForCreate } from '../lib/workflowRunner';
import { fetchQuotationsFromSupabase, fetchSalesOrdersFromSupabase, fetchSampleOrdersFromSupabase, fetchReturnOrdersFromSupabase } from '../lib/documentRepository';
import { fetchUsersFromSupabase } from '../lib/userRepository';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';

const PROJECT_STAGE_OPTIONS = ['需求阶段', '设计阶段', '报价阶段', '样品制作', '样品承认', '试产阶段', '重复试产', '量产阶段'];
const PROJECT_PRODUCT_LINE_OPTIONS = ['接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他'];
const PROJECT_STATUS_OPTIONS = ['跟进中', '样品', '小批量', '已合作', '关闭', '暂停'];
const PROJECT_CUSTOMER_ACTION_OPTIONS = ['寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料'];

const normalizeStage = (stage: string) => {
  if (PROJECT_STAGE_OPTIONS.includes(stage as any)) return stage;
  if (stage.includes('需求')) return '需求阶段';
  if (stage.includes('设计')) return '设计阶段';
  if (stage.includes('报价')) return '报价阶段';
  if (stage.includes('样品') && stage.includes('制作')) return '样品制作';
  if (stage.includes('样品') && stage.includes('承认')) return '样品承认';
  if (stage.includes('试产') && stage.includes('重复')) return '重复试产';
  if (stage.includes('试产')) return '试产阶段';
  if (stage.includes('量产')) return '量产阶段';
  return '需求阶段';
};

interface ProjectsProps {
  role: Role;
  currentUser?: User;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Projects({ role, currentUser, viewParams, navigateTo, goBack }: ProjectsProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<string>('本周项目');
  const [projects, setProjects] = useState<Project[]>([]);
  const [communications, setCommunications] = useState<CommunicationDetail[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingMembers, setIsEditingMembers] = useState(false);
  const [regeneratingNodes, setRegeneratingNodes] = useState<Record<string, boolean>>({});
  const [expandedStages, setExpandedStages] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    customer: '',
    assignee: '',
    startDate: '',
    endDate: ''
  });
  const [newTask, setNewTask] = useState({
    title: '', assignee: '', endTime: '', type: 'stage', stage: ''
  });
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [chatSubTab, setChatSubTab] = useState<'messages' | 'members'>('messages');
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sampleOrders, setSampleOrders] = useState<any[]>([]);
  const [returnOrders, setReturnOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const processedParams = React.useRef<any>(null);

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const [remoteProjects, remoteQuotations, remoteOrders, remoteSampleOrders, remoteReturnOrders, remoteUsers] = await Promise.all([
          fetchProjectsFromSupabase(),
          fetchQuotationsFromSupabase(),
          fetchSalesOrdersFromSupabase(),
          fetchSampleOrdersFromSupabase(),
          fetchReturnOrdersFromSupabase(),
          fetchUsersFromSupabase()
        ]);
        setProjects(remoteProjects);
        setQuotations(remoteQuotations || []);
        setOrders(remoteOrders || []);
        setSampleOrders(remoteSampleOrders || []);
        setReturnOrders(remoteReturnOrders || []);
        setUsers(remoteUsers || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchRemote();
  }, []);

  const syncProject = async (project: Project) => {
    try {
      const saved = await saveProjectToSupabase(project);
      setProjects((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      if (selectedProject?.id === saved.id) {
        setSelectedProject(saved);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(`项目保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const getProjectFlowNodes = (project: Project): ProcessingNode[] => {
    const nodes: ProcessingNode[] = [
      { 
        id: '1', 
        label: '设计报价方案 (IMPACT)', 
        type: 'manual', 
        status: project.aiAnalysis?.conceptualSelling ? 'completed' : 'current', 
        assignee: project.team.sales, 
        aiThoughtProcess: `【AI执行逻辑】\n展示方案如何解决“研发延期”问题。针对经济买家关注利润，技术买家关注可靠性进行差异化沟通。\n\nROI测算：${project.aiAnalysis?.conceptualSelling?.roi测算 || '待测算'}`,
        aiCoachingBlocks: [
          {
            id: 'b1',
            title: '方案设计辅导',
            content: `ROI测算：${project.aiAnalysis?.conceptualSelling?.roi测算 || '待测算'}\n经济买家话术：${project.aiAnalysis?.conceptualSelling?.economicBuyerScript || '待生成'}\n技术买家话术：${project.aiAnalysis?.conceptualSelling?.technicalBuyerScript || '待生成'}`,
            inputs: ['项目概要', '沟通记录', 'IMPACT模型']
          }
        ],
        isRegenerating: regeneratingNodes['1'],
        field: 'conceptualSelling',
        prompt: '请基于项目概要和沟通记录，重新设计报价方案 and ROI测算。',
        debugPrompt: `[DEBUG] Model: gemini-3-flash-preview\nInputs: { projectName: "${project.projectName}", customer: "${project.customerName}" }\nPrompt: 请基于项目概要和沟通记录，重新设计报价方案 and ROI测算。`
      },
      { 
        id: '2', 
        label: '样品订单 (Commitment)', 
        type: 'ai', 
        status: project.stage === '需求阶段' || project.stage === '设计阶段' || project.stage === '报价阶段' ? 'pending' : 'completed', 
        date: project.updateDate, 
        aiThoughtProcess: `【AI执行逻辑】\n核查蓝图红旗。若未识别出“教练”角色，系统将发出预警提示确认预算归口，防止样品流产。\n\n当前状态：${project.aiAnalysis?.redFlags?.length ? '存在红旗风险' : '蓝图完整'}`,
        aiCoachingBlocks: [
          {
            id: 'b1',
            title: '风险预警',
            content: `${project.aiAnalysis?.redFlags?.map(f => `· ${f.risk} (${f.severity})`).join('\n') || '蓝图完整，未发现重大红旗。'}`,
            inputs: ['决策链状态', '红旗风险库']
          }
        ],
        isRegenerating: regeneratingNodes['2'],
        field: 'redFlags',
        prompt: '请重新核查项目蓝图，检测潜在的红旗风险。',
        debugPrompt: `[DEBUG] Model: gemini-3-flash-preview\nInputs: { team: ${JSON.stringify(project.team)} }\nPrompt: 请重新核查项目蓝图，检测潜在的红旗风险。`
      },
      { 
        id: '3', 
        label: '样品交付 (Service)', 
        type: 'ai', 
        status: project.stage === '样品承认' || project.stage === '试产阶段' || project.stage === '重复试产' || project.stage === '量产阶段' ? 'completed' : 'pending', 
        date: project.updateDate, 
        aiThoughtProcess: `【AI执行逻辑】\n自动生成《安装测试指南》和《避雷针建议》。通过微信推送给用户买家（工程师），建立专业形象。`,
        aiCoachingBlocks: [
          {
            id: 'b1',
            title: '样品服务包',
            content: `安装指南：${project.aiAnalysis?.sampleServicePackage?.installationGuide || '待生成'}\n故障避雷：${project.aiAnalysis?.sampleServicePackage?.troubleshootingTips || '待生成'}`,
            inputs: ['产品规格', '常见故障库']
          }
        ],
        isRegenerating: regeneratingNodes['3'],
        field: 'sampleServicePackage',
        prompt: '请基于产品规格，重新生成样品交付服务包（安装指南与避雷建议）。',
        debugPrompt: `[DEBUG] Model: gemini-3-flash-preview\nInputs: { projectName: "${project.projectName}" }\nPrompt: 请基于产品规格，重新生成样品交付服务包（安装指南与避雷建议）。`
      },
      { 
        id: '4', 
        label: '样品承认 (Joint Review)', 
        type: 'manual', 
        status: project.stage === '试产阶段' || project.stage === '重复试产' || project.stage === '量产阶段' ? 'completed' : (project.stage === '样品承认' ? 'current' : 'pending'), 
        assignee: project.team.sales, 
        aiThoughtProcess: `【AI执行逻辑】\n引导客户进行联合评审。若遇价格异议，采用挑战者话术：“单价虽高，但消除了停机隐患，是否符合贵司初衷？”`,
        aiCoachingBlocks: [
          {
            id: 'b1',
            title: '挑战者话术辅导',
            content: `价格异议应对："${project.aiAnalysis?.challengerScripts?.priceObjection || '待生成'}"\n价值捍卫："${project.aiAnalysis?.challengerScripts?.valueDefense || '待生成'}"`,
            inputs: ['价格政策', '价值主张', '挑战者话术库']
          }
        ],
        isRegenerating: regeneratingNodes['4'],
        field: 'challengerScripts',
        prompt: '请基于最新的价格政策和价值主张，重新生成挑战者话术。',
        debugPrompt: `[DEBUG] Model: gemini-3-flash-preview\nInputs: { intentAmount: "${project.intentAmount}" }\nPrompt: 请基于最新的价格政策和价值主张，重新生成挑战者话术。`
      },
      { 
        id: '5', 
        label: '正式订单 (Closing)', 
        type: 'manual', 
        status: project.stage === '量产阶段' ? 'completed' : 'pending', 
        assignee: project.team.sales, 
        aiThoughtProcess: `【AI执行逻辑】\n监控成交周期。${project.aiAnalysis?.orderWarning?.isDelayed ? `警告：已超期 ${project.aiAnalysis.orderWarning.daysSinceApproval} 天。建议通过教练寻找采购瓶颈。` : '目前处于正常成交周期内。'}`,
        aiCoachingBlocks: [
          {
            id: 'b1',
            title: '成交预警',
            content: `${project.aiAnalysis?.orderWarning?.isDelayed ? `超期警告：已超期 ${project.aiAnalysis.orderWarning.daysSinceApproval} 天。\n教练建议：${project.aiAnalysis.orderWarning.coachAdvice}` : '目前处于正常成交周期内。'}`,
            inputs: ['历史成交数据', '当前项目进度']
          }
        ],
        isRegenerating: regeneratingNodes['5'],
        field: 'orderWarning',
        prompt: '请重新分析成交周期，并生成最新的成交预警建议。',
        debugPrompt: `[DEBUG] Model: gemini-3-flash-preview\nInputs: { stage: "${project.stage}", updateDate: "${project.updateDate}" }\nPrompt: 请重新分析成交周期，并生成最新的成交预警建议。`
      }
    ];

    return nodes;
  };

  const getProjectStages = (type: string) => {
    if (type === '研发型项目') {
      return PROJECT_STAGE_OPTIONS;
    }
    return PROJECT_STAGE_OPTIONS;
  };

  useEffect(() => {
    if (viewParams && viewParams !== processedParams.current) {
      processedParams.current = viewParams;
      if (typeof viewParams === 'string') {
        const project = projects.find(p => p.id === viewParams);
        if (project) {
          setSelectedProject(project);
        } else {
          fetchProjectByIdFromSupabase(viewParams).then((fetched) => {
            if (!fetched) return;
            setProjects((prev) => prev.some((p) => p.id === fetched.id) ? prev : [fetched, ...prev]);
            setSelectedProject(fetched);
          }).catch((error) => {
            console.error('Error fetching project by id:', error);
          });
        }
      } else if (viewParams.action === 'new_from_opportunity') {
        (async () => {
          let sourceOpp: any = null;
          if (isSupabaseConfigured() && viewParams.sourceId) {
            try {
              const supabase = getSupabaseClient();
              const { data, error } = await supabase
                .from('crm_opportunity')
                .select('*')
                .eq('id', viewParams.sourceId)
                .limit(1);
              if (error) throw error;
              sourceOpp = data?.[0] || null;
            } catch (error) {
              console.error('Error fetching opportunity for new project:', error);
            }
          }
          const newProject: Project = {
            id: `P${new Date().getFullYear()}${String(projects.length + 1).padStart(3, '0')}`,
            projectNo: sourceOpp?.project_no || '',
            projectName: sourceOpp ? `${sourceOpp.customer_name}-定制项目` : '新项目 (来自商机)',
            projectType: '研发型项目',
            customerName: sourceOpp?.customer_name || '待定',
            customerId: sourceOpp?.customer_id,
            projectLevel: sourceOpp?.opp_level || 'B级',
            stage: '需求阶段',
            productLine: (sourceOpp?.product_line as any) || '其他',
            status: '跟进中',
            oppSummary: sourceOpp?.opp_summary || '',
            intentAmount: String(sourceOpp?.intent_amount || '0'),
            estimatedUsage: '',
            customerAction: '找货寻料',
            endProject: sourceOpp?.end_project || '',
            productIndustry: (sourceOpp?.product_industry as any) || undefined,
            salesRep: sourceOpp?.sales_rep || role,
            productOwner: sourceOpp?.product_owner || '',
            qualityOwner: '',
            purchaser: '',
            fae: '',
            team: {
              sales: sourceOpp?.sales_rep || role,
              pm: sourceOpp?.project_manager || '',
              product: sourceOpp?.product_owner || '',
              quality: '',
              purchasing: '',
              fae: '',
            },
            wechatGroup: sourceOpp ? `${sourceOpp.customer_name}-项目群` : '',
            updateDate: new Date().toISOString().split('T')[0],
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            opportunityId: viewParams.sourceId,
            leadId: sourceOpp?.lead_id !== null && sourceOpp?.lead_id !== undefined ? String(sourceOpp.lead_id) : undefined,
            inquiryId: sourceOpp?.inquiry_id !== null && sourceOpp?.inquiry_id !== undefined ? String(sourceOpp.inquiry_id) : undefined,
            attachments: Array.isArray(sourceOpp?.attachments) ? sourceOpp.attachments : [],
            communicationDetails: [],
            notes: [],
            isKeyProject: sourceOpp?.opp_level === 'S级',
            creatorId: currentUser?.id || 'EMP001',
            creatorNo: currentUser?.employeeNo || 'E001',
            creatorName: currentUser?.name || '系统管理员',
            createDate: new Date().toISOString().split('T')[0],
            requirements: [],
            progress: [],
            tasks: [],
            samples: [],
            purchasingQuotes: [],
            quotations: [],
            requirementChanges: [],
          };
          setProjects(prev => [newProject, ...prev]);
          setSelectedProject(newProject);
          setIsEditing(true);
          saveProjectToSupabase(newProject)
            .then((saved) => {
              setProjects((prev) => [saved, ...prev.filter((p) => p.id !== newProject.id && p.id !== saved.id)]);
              setSelectedProject(saved);
              return triggerAutoFlowsForCreate('project', saved, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined);
            })
            .catch((error) => {
              console.error('Error saving new project:', error);
            });
        })();
      }
    }
  }, [viewParams, projects, role]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.projectNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filters.customer && !p.customerName.toLowerCase().includes(filters.customer.toLowerCase())) return false;
    if (filters.assignee) {
      const assigneePool = [p.team?.pm || '', p.salesRep || '', p.team?.sales || ''].join(' ');
      if (!assigneePool.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
    }
    const projectStartDate = p.startDate || p.createDate;
    if (filters.startDate && projectStartDate < filters.startDate) return false;
    if (filters.endDate && projectStartDate > filters.endDate) return false;

    if (activeTab === '全部项目') return true;
    if (activeTab === '重点项目') return p.isKeyProject;
    if (activeTab === '已关闭项目') return p.status === '关闭' || p.status === '已关闭';
    
    const today = new Date();
    const projectDate = new Date(p.estimatedMassProductionTime || '2024-01-01');
    
    if (activeTab === '今日项目') {
      return projectDate.toDateString() === today.toDateString() && p.status !== '关闭' && p.status !== '已关闭';
    }
    if (activeTab === '本周项目') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() - today.getDay() + 6);
      return projectDate >= startOfWeek && projectDate <= endOfWeek && p.status !== '关闭' && p.status !== '已关闭';
    }
    if (activeTab === '上周项目') {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(today);
      endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
      return projectDate >= startOfLastWeek && projectDate <= endOfLastWeek && p.status !== '关闭' && p.status !== '已关闭';
    }
    if (activeTab === '上周以前项目') {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      return projectDate < startOfLastWeek && p.status !== '关闭' && p.status !== '已关闭';
    }
    
    return p.status !== '关闭' && p.status !== '已关闭';
  });

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedProject) return;
    const note = {
      id: `n${Date.now()}`,
      author: role,
      role: role,
      content: newNote,
      date: new Date().toISOString().split('T')[0]
    };
    const updatedProject = {
      ...selectedProject,
      notes: [...selectedProject.notes, note]
    };
    setSelectedProject(updatedProject);
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setNewNote('');
    syncProject(updatedProject);
  };

  const handleSaveProject = (updatedData: Project) => {
    const normalizedProject: Project = {
      ...updatedData,
      projectType: updatedData.projectType || '研发型项目',
      projectLevel: updatedData.projectLevel || 'B级',
      wechatGroup: updatedData.wechatGroup || '',
      team: {
        sales: updatedData.salesRep || updatedData.team?.sales || '',
        pm: updatedData.team?.pm || '',
        product: updatedData.productOwner || updatedData.team?.product || '',
        quality: updatedData.qualityOwner || updatedData.team?.quality || '',
        purchasing: updatedData.purchaser || updatedData.team?.purchasing || '',
        fae: updatedData.fae || updatedData.team?.fae || ''
      },
      isKeyProject: updatedData.projectLevel === 'S级',
      createDate: updatedData.createDate || new Date().toISOString().split('T')[0]
    };

    setProjects(projects.map(p => p.id === normalizedProject.id ? normalizedProject : p));
    setSelectedProject(normalizedProject);
    setIsEditing(false);
    syncProject(normalizedProject);
  };

  const handleCreateProject = async (data: any) => {
    const today = new Date().toISOString().split('T')[0];
    const id = data.id || `PRJ_${Date.now()}`;
    const newProject: Project = {
      id,
      projectNo: data.projectNo || '',
      projectName: String(data.projectName || '').trim(),
      name: String(data.projectName || '').trim(),
      projectType: data.projectType || '研发型项目',
      customerName: String(data.customerName || '').trim(),
      customerId: data.customerId || '',
      projectLevel: data.projectLevel || 'B级',
      stage: data.stage || '需求阶段',
      productLine: data.productLine || '其他',
      status: data.status || '跟进中',
      oppSummary: data.oppSummary || '',
      intentAmount: String(data.intentAmount ?? '0'),
      estimatedUsage: data.estimatedUsage || '',
      endCustomer: data.endCustomer || '',
      endProject: data.endProject || '',
      applicationScenario: data.applicationScenario || '',
      productIndustry: data.productIndustry || undefined,
      estimatedMassProductionTime: data.estimatedMassProductionTime || '',
      customerAction: data.customerAction || '找货寻料',
      salesRep: data.salesRep || role,
      productOwner: data.productOwner || '',
      qualityOwner: data.qualityOwner || '',
      purchaser: data.purchaser || '',
      fae: data.fae || '',
      team: {
        sales: data.salesRep || role,
        pm: data.team?.pm || '',
        product: data.productOwner || '',
        quality: data.qualityOwner || '',
        purchasing: data.purchaser || '',
        fae: data.fae || ''
      },
      wechatGroup: data.wechatGroup || '',
      updateDate: today,
      startDate: data.startDate || today,
      endDate: data.endDate || '',
      closeTime: data.closeTime || '',
      closeReason: data.closeReason || '',
      notes: [],
      requirements: [],
      progress: [],
      tasks: [],
      samples: [],
      purchasingQuotes: [],
      quotations: [],
      requirementChanges: [],
      communicationDetails: [],
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      isKeyProject: data.projectLevel === 'S级',
      creatorId: currentUser?.id || 'EMP001',
      creatorNo: currentUser?.employeeNo || 'E001',
      creatorName: currentUser?.name || role,
      createDate: today
    };

    try {
      const saved = await saveProjectToSupabase(newProject);
      setProjects((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      setSelectedProject(saved);
      setIsAdding(false);
      triggerAutoFlowsForCreate('project', saved, currentUser ? { id: currentUser.id, name: currentUser.name } : undefined).catch((error) => {
        console.error('Error triggering project workflow:', error);
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(`新增项目失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleRegenerateAI = async (nodeId: string, field: string, prompt: string) => {
    if (!selectedProject) return;
    setRegeneratingNodes(prev => ({ ...prev, [nodeId]: true }));
    
    try {
      const text = await callAiProxy(`${prompt}
            
            输入内容：
            - 项目名称：${selectedProject.projectName}
            - 客户：${selectedProject.customerName}
            - 阶段：${selectedProject.stage}
            
            请返回对应的JSON数据结构。
            如果是方案设计，返回: {"conceptualSelling": {"roi测算": "", "economicBuyerScript": "", "technicalBuyerScript": ""}}
            如果是红旗风险，返回: {"redFlags": [{"risk": "", "severity": "高" | "中" | "低", "description": ""}]}
            如果是样品服务，返回: {"sampleServicePackage": {"installationGuide": "", "troubleshootingTips": ""}}
            如果是挑战者话术，返回: {"challengerScripts": {"priceObjection": "", "valueDefense": ""}}
            如果是成交预警，返回: {"orderWarning": {"isDelayed": true, "daysSinceApproval": 0, "coachAdvice": ""}}`);

      const result = parseAiJson(text || '{}');
      const updatedProject = { 
        ...selectedProject, 
        aiAnalysis: { 
          ...selectedProject.aiAnalysis,
          ...result 
        } 
      };
      
      setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
      setSelectedProject(updatedProject);
      syncProject(updatedProject);
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setRegeneratingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedProject) return;
    setIsAnalyzing(true);
    try {
      const prompt = `
        作为一名资深销售专家，请基于 Miller Heiman 战略/概念销售、挑战式销售及 IMPACT 法则分析以下项目。
        目标：从“概念认可”转向“实物验证”并最终锁定“正式订单”。
        
        分析逻辑：
        1. 购买模式 (Buying Mode)：识别客户当前处于增长、困难、平稳还是过度自信模式。
        2. SPIN 痛点分析：挖掘背景、难点、暗示及需求确认。
        3. 意向评分 (Intent Score)：0-100分，基于当前互动深度。
        4. 设计报价方案 (Conceptual Selling)：展示方案如何解决“研发延期”问题，测算 ROI。
        5. 样品订单 (Commitment)：核查蓝图红旗，提示业务员确认预算归口。
        6. 样品交付 (Service)：生成安装测试指南和避雷针建议。
        7. 样品承认 (Joint Review)：分析潜在拒绝信号，提供挑战者话术应对价格异议。
        8. 正式订单 (Closing)：根据行业周期预警，提示通过“教练”寻找瓶颈。
        
        项目信息：
        项目名称: ${selectedProject.projectName}
        客户名称: ${selectedProject.customerName}
        当前阶段: ${selectedProject.stage}
        商机概要: ${selectedProject.oppSummary}
        
        请输出JSON格式，包含以下字段：
        {
          "buyingMode": "增长模式" | "困难模式" | "平稳模式" | "过度自信模式",
          "spinAnalysis": "SPIN深度分析内容",
          "intentScore": number,
          "conceptualSelling": {
            "roi测算": "量化价值描述",
            "economicBuyerScript": "针对经济买家的话术",
            "technicalBuyerScript": "针对技术买家的话术"
          },
          "redFlags": [
            { "risk": "风险点", "severity": "高" | "中" | "低", "description": "风险描述" }
          ],
          "sampleServicePackage": {
            "installationGuide": "安装测试指南摘要",
            "troubleshootingTips": "常见故障避雷针"
          },
          "challengerScripts": {
            "priceObjection": "应对价格异议的话术",
            "valueDefense": "价值捍卫话术"
          },
          "orderWarning": {
            "isDelayed": boolean,
            "daysSinceApproval": number,
            "coachAdvice": "教练建议"
          }
        }
      `;
      const text = await callAiProxy(prompt);
      const analysis = parseAiJson(text || '{}');
      const updatedProject = { ...selectedProject, aiAnalysis: analysis };
      setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
      setSelectedProject(updatedProject);
      syncProject(updatedProject);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddCommunication = (comm: Partial<CommunicationDetail>) => {
    if (!selectedProject) return;
    const newComm: CommunicationDetail = {
      id: `C${Date.now()}`,
      date: new Date().toLocaleString(),
      sender: `${role} (销售)`,
      content: '',
      type: 'wechat',
      sourceId: selectedProject.id,
      customerId: selectedProject.customerId,
      ...comm
    };
    setCommunications([newComm, ...communications]);
  };

  const handleSyncChats = async () => {
    if (!selectedProject) return;
    setIsSyncingChats(true);
    setTimeout(() => {
      const newMsg: any = {
        id: `msg-${Date.now()}`,
        sender: '客户-王总',
        content: '好的，我们内部再讨论一下，下周给你们答复。',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setGroupChats(prev => prev.map(chat => {
        if ((chat.projectId === selectedProject.id || (selectedProject.customerId && chat.customerId === selectedProject.customerId)) && chat.id === selectedChat?.id) {
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

  useEffect(() => {
    if (selectedProject) {
      setExpandedStages([selectedProject.stage]);
    }
  }, [selectedProject]);

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => 
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const handleAddTask = () => {
    if (!selectedProject || !newTask.title || !newTask.assignee || !newTask.endTime || !newTask.stage) return;
    const task: TodoTask = {
      id: `t${Date.now()}`,
      title: newTask.title,
      assignee: newTask.assignee,
      assigneeId: '',
      assigneeName: newTask.assignee,
      status: '待办',
      dueDate: newTask.endTime,
      taskType: newTask.stage,
      sourceType: 'project',
      sourceId: selectedProject.id,
      associatedProjectId: selectedProject.id,
      associatedProject: selectedProject.projectName,
      associatedCustomerName: selectedProject.customerName,
      description: newTask.title,
      importance: '中',
      urgency: '正常',
      checked: false,
      createDate: new Date().toISOString().split('T')[0],
      creatorId: currentUser?.id || 'EMP001',
      creatorNo: currentUser?.employeeNo || 'E001',
      creatorName: currentUser?.name || '系统管理员'
    };
    const updatedProject = {
      ...selectedProject,
      tasks: [...(selectedProject.tasks || []), task]
    };
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
    setIsAddingTask(false);
    setNewTask({ title: '', assignee: '', endTime: '', type: 'stage', stage: '' });
    syncProject(updatedProject);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < filteredProjects.length) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectFromSupabase(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      toast.success('项目删除成功');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(`删除项目失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const projectFields = [
    { key: 'projectNo', label: '项目编号', disabled: true },
    { key: 'projectType', label: '项目类型', type: 'select', options: ['研发型项目', '标品类项目'], required: true },
    { key: 'customerName', label: '客户名称', type: 'customer_lookup', customerIdKey: 'customerId', allowPotential: false, required: true },
    { key: 'projectName', label: '项目名称', required: true },
    { key: 'projectLevel', label: '项目等级', type: 'select', options: ['S级', 'A级', 'B级', 'C级'] },
    { key: 'stage', label: '阶段', type: 'select', options: PROJECT_STAGE_OPTIONS, required: true },
    { key: 'productLine', label: '产品线', type: 'select', options: PROJECT_PRODUCT_LINE_OPTIONS, required: true },
    { key: 'status', label: '项目状态', type: 'select', options: PROJECT_STATUS_OPTIONS, required: true },
    { key: 'customerAction', label: '客户行动', type: 'select', options: PROJECT_CUSTOMER_ACTION_OPTIONS },
    { key: 'oppSummary', label: '商机概要', type: 'textarea' },
    { key: 'intentAmount', label: '意向金额(RMB)', type: 'number' },
    { key: 'estimatedUsage', label: '预估用量' },
    { key: 'endProject', label: '终端项目' },
    { key: 'productIndustry', label: '产品所属行业', type: 'select', options: ['基础接插件', '新能源', '线束', '定制', '胜蓝', '胜蓝电气', '工业'] },
    { key: 'applicationScenario', label: '应用场景' },
    { key: 'endCustomer', label: '终端客户' },
    { key: 'team.pm', label: '项目经理', type: 'user' },
    { key: 'salesRep', label: '业务员', type: 'user' },
    { key: 'productOwner', label: '产品负责人', type: 'user' },
    { key: 'qualityOwner', label: '品质负责人', type: 'user' },
    { key: 'purchaser', label: '采购', type: 'user' },
    { key: 'fae', label: 'FAE', type: 'user' },
    { key: 'wechatGroup', label: '微信项目群' },
    { key: 'startDate', label: '开始日期', type: 'date' },
    { key: 'endDate', label: '结束日期', type: 'date' },
    { key: 'attachments', label: '附件', type: 'attachments' },
    { key: 'createDate', label: '创建日期', type: 'date', disabled: true },
    { key: 'closeTime', label: '关闭时间', type: 'date' },
    { key: 'closeReason', label: '关闭原因' },
    { key: 'estimatedMassProductionTime', label: '预计量产时间', type: 'date' },
  ];

  if (selectedProject) {
    return (
      <>
        <ProjectDetail 
          selectedProject={selectedProject}
          role={role}
          onBack={() => { setSelectedProject(null); if (viewParams) goBack?.(); }}
          onEdit={() => setIsEditing(true)}
          onNavigateTo={navigateTo!}
          getProjectFlowNodes={getProjectFlowNodes}
          getProjectStages={getProjectStages}
          normalizeStage={normalizeStage}
          expandedStages={expandedStages}
          toggleStage={toggleStage}
          setIsAddingTask={setIsAddingTask}
          setNewTask={setNewTask}
          isAddingTask={isAddingTask}
          newTask={newTask}
          handleAddTask={handleAddTask}
          setIsEditingMembers={setIsEditingMembers}
          users={users}
          quotations={quotations}
          orders={orders}
          sampleOrders={sampleOrders}
          returnOrders={returnOrders}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
          isAnalyzing={isAnalyzing}
          onAIAnalysis={handleAIAnalysis}
          onRegenerateAI={handleRegenerateAI}
          communications={communications}
          onAddCommunication={handleAddCommunication}
          groupChats={groupChats}
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          chatSubTab={chatSubTab}
          setChatSubTab={setChatSubTab}
          isSyncingChats={isSyncingChats}
          handleSyncChats={handleSyncChats}
        />

        <DetailModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="编辑项目"
          data={selectedProject}
          onSave={handleSaveProject}
          fields={projectFields}
        />

        {isEditingMembers && (
          <DetailModal
            isOpen={isEditingMembers}
            onClose={() => setIsEditingMembers(false)}
            title="修改项目成员"
            data={selectedProject.team}
            onSave={(updatedTeam) => {
              const updatedProject = {
                ...selectedProject,
                team: updatedTeam,
                salesRep: updatedTeam.sales || selectedProject.salesRep,
                productOwner: updatedTeam.product || selectedProject.productOwner,
                qualityOwner: updatedTeam.quality || selectedProject.qualityOwner,
                purchaser: updatedTeam.purchasing || selectedProject.purchaser,
                fae: updatedTeam.fae || selectedProject.fae
              };
              setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
              setSelectedProject(updatedProject);
              setIsEditingMembers(false);
              syncProject(updatedProject);
            }}
            fields={[
              { key: 'sales', label: '业务员', type: 'user' },
              { key: 'pm', label: '项目经理', type: 'user' },
              { key: 'product', label: '产品负责人', type: 'user' },
              { key: 'quality', label: '品质负责人', type: 'user' },
              { key: 'purchasing', label: '采购', type: 'user' },
              { key: 'fae', label: 'FAE', type: 'user' },
            ]}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">客户</label>
          <input
            type="text"
            placeholder="筛选客户..."
            value={filters.customer}
            onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">负责人</label>
          <input
            type="text"
            placeholder="筛选负责人..."
            value={filters.assignee}
            onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">立项日期范围</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
      <ProjectList
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filteredProjects={filteredProjects}
            displayCount={displayCount}
            onScroll={handleScroll}
            onProjectClick={setSelectedProject}
            onDeleteProject={handleDeleteProject}
            onAddProject={() => setIsAdding(true)}
          />

      <DetailModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        title="新建项目"
        data={{
          stage: '需求阶段',
          status: '跟进中',
          projectType: '研发型项目',
          projectLevel: 'B级',
          productLine: '其他',
          customerAction: '找货寻料',
          startDate: new Date().toISOString().split('T')[0],
          createDate: new Date().toISOString().split('T')[0],
          team: { pm: '' }
        }}
        onSave={handleCreateProject}
        fields={projectFields.filter((f) => f.key !== 'projectNo')}
        isEditing={true}
      />
    </div>
  );
}
