import { Project } from '../types';
import { mockProjects } from '../data';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const PROJECT_STAGE_OPTIONS = ['需求阶段', '设计阶段', '报价阶段', '样品制作', '样品承认', '试产阶段', '重复试产', '量产阶段'] as const;
const PROJECT_PRODUCT_LINE_OPTIONS = ['接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他'] as const;
const PROJECT_STATUS_OPTIONS = ['跟进中', '样品', '小批量', '样品/小批量', '已合作', '关闭', '暂停'] as const;

const normalizeProjectStage = (value: unknown): Project['stage'] => {
  const stage = String(value || '').trim();
  if (PROJECT_STAGE_OPTIONS.includes(stage as any)) return stage as Project['stage'];
  if (stage.includes('样品') && stage.includes('制作')) return '样品制作';
  if (stage.includes('样品') && stage.includes('承认')) return '样品承认';
  if (stage.includes('试产') && stage.includes('重复')) return '重复试产';
  if (stage.includes('试产')) return '试产阶段';
  if (stage.includes('量产')) return '量产阶段';
  if (stage.includes('报价')) return '报价阶段';
  if (stage.includes('设计')) return '设计阶段';
  return '需求阶段';
};

const normalizeProjectProductLine = (value: unknown): Project['productLine'] => {
  const line = String(value || '').trim();
  if (!line) return undefined;
  if (PROJECT_PRODUCT_LINE_OPTIONS.includes(line as any)) return line as Project['productLine'];
  if (line.includes('线束')) return '线束';
  if (line.toUpperCase().includes('IO')) return 'IO连接器';
  if (line.includes('工业')) return '工业连接器';
  if (line.includes('接插件')) return '接插件';
  if (line.includes('电子') || line.includes('电气')) return '电子电气';
  return '其他';
};

const normalizeProjectStatus = (value: unknown): Project['status'] => {
  const status = String(value || '').trim();
  if (status === '已关闭') return '关闭';
  if (status === '已完成') return '已合作';
  if (status === '样品-小批量') return '样品/小批量';
  if (PROJECT_STATUS_OPTIONS.includes(status as any)) return status as Project['status'];
  return '跟进中';
};

const toDbProjectStatus = (status: Project['status']) => {
  if (status === '样品' || status === '小批量') return '样品/小批量';
  if (status === '已关闭') return '关闭';
  if (status === '已完成') return '已合作';
  return status;
};

const parseProjectMeta = (rawManager: unknown) => {
  if (!rawManager) return {};
  const text = String(rawManager).trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    // 兼容老数据 manager 直接存姓名
    return { managerName: text };
  }
};

const parseJsonColumn = <T>(raw: unknown, fallback: T): T => {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw === 'object') return raw as T;
  const text = String(raw).trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

const mapDbProjectToUi = (row: any): Project => {
  const meta = parseProjectMeta(row.manager);
  const team = parseJsonColumn<any>(row.team, null) || meta.team || {
    sales: row.sales_rep || '',
    pm: row.manager || meta.managerName || '',
    product: row.product_owner || '',
    quality: row.quality_owner || '',
    purchasing: row.purchaser || '',
    fae: row.fae || ''
  };

  return {
    id: row.id,
    projectName: row.project_name || '',
    projectType: row.project_type || meta.projectType || '研发型项目',
    customerName: row.customer_name || '',
    customerId: row.customer_id || '',
    projectLevel: row.project_level || meta.projectLevel || 'B级',
    stage: normalizeProjectStage(row.stage),
    productLine: normalizeProjectProductLine(row.product_line || meta.productLine),
    status: normalizeProjectStatus(row.status),
    oppSummary: row.opp_summary || meta.oppSummary || '',
    intentAmount: String(row.intent_amount || row.amount || meta.intentAmount || '0'),
    estimatedUsage: row.estimated_usage || meta.estimatedUsage || '',
    endCustomer: row.end_customer || meta.endCustomer || '',
    endProject: row.end_project || meta.endProject || '',
    applicationScenario: row.application_scenario || meta.applicationScenario || '',
    productIndustry: row.product_industry || meta.productIndustry || undefined,
    estimatedMassProductionTime: row.estimated_mass_production_date || row.end_date || meta.estimatedMassProductionTime || '',
    customerAction: row.customer_action || meta.customerAction || undefined,
    salesRep: row.sales_rep || meta.team?.sales || '',
    productOwner: row.product_owner || meta.team?.product || '',
    qualityOwner: row.quality_owner || meta.team?.quality || '',
    purchaser: row.purchaser || meta.team?.purchasing || '',
    fae: row.fae || meta.team?.fae || '',
    closeTime: row.close_time || meta.closeTime || undefined,
    closeReason: row.close_reason || meta.closeReason || undefined,
    team,
    wechatGroup: row.wechat_group || meta.wechatGroup || '',
    updateDate: row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    opportunityId: row.opportunity_id || meta.opportunityId,
    leadId: row.lead_id || meta.leadId,
    inquiryId: row.inquiry_id || meta.inquiryId,
    attachments: parseJsonColumn(row.attachments, meta.attachments || []),
    notes: parseJsonColumn(row.notes, meta.notes || []),
    requirements: parseJsonColumn(row.requirements, meta.requirements || []),
    progress: parseJsonColumn(row.progress, meta.progress || []),
    tasks: parseJsonColumn(row.tasks, meta.tasks || []),
    samples: parseJsonColumn(row.samples, meta.samples || []),
    purchasingQuotes: parseJsonColumn(row.purchasing_quotes, meta.purchasingQuotes || []),
    quotations: parseJsonColumn(row.quotations, meta.quotations || []),
    requirementChanges: parseJsonColumn(row.requirement_changes, meta.requirementChanges || []),
    communicationDetails: parseJsonColumn(row.communication_details, meta.communicationDetails || []),
    isKeyProject: row.is_key_project ?? Boolean(meta.isKeyProject),
    aiAnalysis: parseJsonColumn(row.ai_analysis, meta.aiAnalysis),
    creatorId: row.creator_id || meta.creatorId || 'system',
    creatorNo: row.creator_no || meta.creatorNo || 'system',
    creatorName: row.creator_name || meta.creatorName || 'system',
    createDate: row.create_date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  };
};

const mapUiProjectToDb = (project: Project) => ({
  id: project.id || `PRJ${Date.now()}`,
  customer_id: project.customerId || null,
  customer_name: project.customerName || '',
  project_name: project.projectName || '',
  status: toDbProjectStatus(normalizeProjectStatus(project.status)),
  stage: project.stage || '需求阶段',
  manager: project.team?.pm || null,
  project_type: project.projectType || null,
  project_level: project.projectLevel || null,
  wechat_group: project.wechatGroup || null,
  team: project.team || null,
  notes: project.notes || [],
  requirements: project.requirements || [],
  progress: project.progress || [],
  tasks: project.tasks || [],
  samples: project.samples || [],
  purchasing_quotes: project.purchasingQuotes || [],
  quotations: project.quotations || [],
  requirement_changes: project.requirementChanges || [],
  communication_details: project.communicationDetails || [],
  is_key_project: Boolean(project.isKeyProject),
  ai_analysis: project.aiAnalysis || null,
  creator_id: project.creatorId || null,
  creator_no: project.creatorNo || null,
  creator_name: project.creatorName || null,
  create_date: project.createDate || null,
  amount: Number(project.intentAmount || 0),
  end_customer: project.endCustomer || null,
  opp_summary: project.oppSummary || null,
  application_scenario: project.applicationScenario || null,
  intent_amount: Number(project.intentAmount || 0),
  end_project: project.endProject || null,
  product_industry: project.productIndustry || null,
  estimated_usage: project.estimatedUsage || null,
  estimated_mass_production_date: project.estimatedMassProductionTime || null,
  customer_action: project.customerAction || null,
  sales_rep: project.salesRep || project.team?.sales || null,
  product_owner: project.productOwner || project.team?.product || null,
  quality_owner: project.qualityOwner || project.team?.quality || null,
  purchaser: project.purchaser || project.team?.purchasing || null,
  fae: project.fae || project.team?.fae || null,
  lead_id: project.leadId || null,
  opportunity_id: project.opportunityId || null,
  inquiry_id: project.inquiryId || null,
  attachments: project.attachments || [],
  close_time: project.closeTime || null,
  close_reason: project.closeReason || null,
  product_line: normalizeProjectProductLine(project.productLine) || null,
  start_date: project.startDate || project.createDate || null,
  end_date: project.endDate || project.estimatedMassProductionTime || null,
  updated_at: new Date().toISOString()
});

export const fetchProjectsFromSupabase = async (): Promise<Project[]> => {
  if (!isSupabaseConfigured()) return mockProjects;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_project').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  
  return (data || []).map(mapDbProjectToUi);
};

export const fetchProjectByIdFromSupabase = async (id: string): Promise<Project | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_project').select('*').eq('id', id).limit(1);
  if (error) throw error;
  const row = data?.[0];
  return row ? mapDbProjectToUi(row) : null;
};

export const saveProjectToSupabase = async (project: Project): Promise<Project> => {
  if (!isSupabaseConfigured()) return { ...project, id: project.id || `PRJ${Date.now()}` };
  const supabase = getSupabaseClient();
  const payload = mapUiProjectToDb(project);
  const { data, error } = await supabase
    .from('crm_project')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .limit(1);
  if (error) throw error;
  return data?.[0] ? mapDbProjectToUi(data[0]) : { ...project, id: payload.id };
};

export const deleteProjectFromSupabase = async (projectId: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(projectId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_project').delete().eq('id', id);
  if (error) throw error;
};
