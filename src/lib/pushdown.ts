import { Inquiry, Lead, Opportunity, SalesQuotation, Project, SalesOrder } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { createPotentialCustomerInSupabase, convertPotentialCustomerToCustomerInSupabase } from './potentialCustomerRepository';
import { saveSalesOrderToSupabase } from './documentRepository';
import { triggerAutoFlowsForCreate } from './workflowRunner';
import { updateCustomerLastContactInSupabase } from './customerRepository';

const today = () => new Date().toISOString().split('T')[0];
const LEAD_CUSTOMER_ACTION_ENUM_VALUES = ['寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料'] as const;
const LEAD_SOURCE_TYPE_ENUM_VALUES = ['企业微信', '注册', '在线', '微信', '邮件', '电话', '其他'] as const;
const LEAD_STATUS_ENUM_VALUES = ['未跟进', '跟进中', '关闭', '转商机'] as const;
const OPPORTUNITY_STATUS_ENUM_VALUES = ['未跟进', '跟进中', '关闭', '转项目'] as const;
const OPPORTUNITY_PRODUCT_LINE_ENUM_VALUES = ['接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他'] as const;
const PROJECT_PRODUCT_LINE_ENUM_VALUES = ['接插件', '线束', '工业连接器', 'IO连接器', '电子电气', '其他'] as const;

const normalizeLeadCustomerAction = (value: unknown): string | null => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (LEAD_CUSTOMER_ACTION_ENUM_VALUES.includes(text as any)) return text;
  if (text.includes('替代')) return '寻替代料';
  if (text.includes('料号') || text.toLowerCase().includes('part number')) return '指定料号';
  if (text.includes('物料') || text.includes('样品') || text.includes('规格') || text.includes('参数')) return '指定物料';
  return '找货寻料';
};

const normalizeLeadSourceType = (value: unknown): string => {
  const text = String(value || '').trim();
  if (!text) return '在线';
  if (LEAD_SOURCE_TYPE_ENUM_VALUES.includes(text as any)) return text;
  if (text.includes('微信')) return '微信';
  if (text.includes('邮件') || text.includes('mail')) return '邮件';
  if (text.includes('电话') || text.includes('来电')) return '电话';
  if (text.includes('注册')) return '注册';
  return '在线';
};

const normalizeLeadStatus = (value: unknown): string => {
  const text = String(value || '').trim();
  if (text === '已转商机') return '转商机';
  if (text === '已关闭') return '关闭';
  if (LEAD_STATUS_ENUM_VALUES.includes(text as any)) return text;
  return '未跟进';
};

const normalizeOpportunityStatus = (value: unknown): string => {
  const text = String(value || '').trim();
  if (text === '已流失' || text === '已关闭') return '关闭';
  if (OPPORTUNITY_STATUS_ENUM_VALUES.includes(text as any)) return text;
  return '跟进中';
};

const normalizeOpportunityProductLine = (value: unknown): string => {
  const text = String(value || '').trim();
  if (!text) return '其他';
  if (OPPORTUNITY_PRODUCT_LINE_ENUM_VALUES.includes(text as any)) return text;
  if (text.includes('线束')) return '线束';
  if (text.toUpperCase().includes('IO')) return 'IO连接器';
  if (text.includes('工业')) return '工业连接器';
  if (text.includes('接插件')) return '接插件';
  if (text.includes('电子') || text.includes('电气')) return '电子电气';
  return '其他';
};

const normalizeProjectProductLine = (value: unknown): string | null => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (PROJECT_PRODUCT_LINE_ENUM_VALUES.includes(text as any)) return text;
  if (text.includes('线束')) return '线束';
  if (text.toUpperCase().includes('IO')) return 'IO连接器';
  if (text.includes('工业')) return '工业连接器';
  if (text.includes('接插件')) return '接插件';
  if (text.includes('电子') || text.includes('电气')) return '电子电气';
  return '其他';
};

const ensureCustomerId = async (customerId: string | undefined, customerName: string) => {
  const id = String(customerId || '').trim();
  const name = String(customerName || '').trim();
  if (id) return id;
  if (!name) return '';
  const created = await createPotentialCustomerInSupabase(name);
  return created.id;
};

export const pushInquiryToLeadInSupabase = async (source: Inquiry, leadData: any) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 环境变量未配置');
  }
  const supabase = getSupabaseClient();
  const customerName = String(leadData?.customerName || source.companyName || source.customerName || '').trim() || '未填写客户';
  const resolvedCustomerId = await ensureCustomerId(leadData?.customerId || source.customerId, customerName);
  const leadId = `LEAD_${Date.now()}`;
  const now = new Date().toISOString();
  const leadRow = {
    id: leadId,
    customer_id: resolvedCustomerId || null,
    customer_type: resolvedCustomerId ? '老客户' : '新客户',
    customer_name: customerName,
    name: String(leadData?.name || source.customerName || '').trim(),
    phone: String(leadData?.phone || source.contact || '').trim(),
    customer_action: normalizeLeadCustomerAction(leadData?.customerAction || source.situation),
    industry: String(leadData?.industry || source.category || '').trim(),
    status: normalizeLeadStatus(leadData?.status),
    classification: leadData?.classification || null,
    assignee: String(leadData?.assignee || '').trim() || null,
    entry_time: String(leadData?.entryTime || new Date().toISOString().slice(0, 16)),
    source_channel: String(leadData?.channelPlatform || source.sourceChannel || '').trim(),
    source_type: normalizeLeadSourceType(leadData?.source),
    product_category: String(leadData?.productCategory || source.category || '').trim(),
    product_series: String(leadData?.productSeries || source.productSeries || '').trim(),
    inquiry_id: source.id,
    buyer_role: leadData?.buyerRole || source.buyerRole || null,
    buying_mode: leadData?.buyingMode || source.buyingMode || null,
    intent_score: leadData?.intentScore ?? source.intentScore ?? null,
    create_date: today(),
    creator_name: String(leadData?.creatorName || '').trim() || null,
    updated_at: now
  };

  const { error: leadError } = await supabase.from('crm_lead').upsert(leadRow, { onConflict: 'id' });
  if (leadError) throw leadError;

  triggerAutoFlowsForCreate(
    'lead',
    { id: leadId, customerId: resolvedCustomerId, customerName },
    leadData?.creatorId ? { id: String(leadData.creatorId), name: String(leadData.creatorName || '') } : undefined
  ).catch(() => {});

  const { error: inquiryError } = await supabase
    .from('crm_inquiry')
    .update({
      status: '已转线索',
      associated_lead: leadId,
      update_date: today(),
      updated_at: now
    })
    .eq('id', source.id);
  if (inquiryError) throw inquiryError;
  if (resolvedCustomerId) {
    await updateCustomerLastContactInSupabase(resolvedCustomerId, '询盘转线索');
  }

  return leadId;
};

export const pushLeadToOpportunityInSupabase = async (source: Lead, oppData: any) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 环境变量未配置');
  }
  const supabase = getSupabaseClient();
  const customerName = String(oppData?.customerName || source.customerName || '').trim() || '未填写客户';
  const resolvedCustomerId = await ensureCustomerId(source.customerId, customerName);
  const oppId = `OPP_${Date.now()}`;
  const now = new Date().toISOString();
  const summaryParts = [
    String(oppData?.name || '').trim(),
    oppData?.contactPerson ? `联系人:${oppData.contactPerson}` : '',
    oppData?.contactPhone ? `电话:${oppData.contactPhone}` : '',
    oppData?.expectedAmount ? `预计金额:${oppData.expectedAmount}` : '',
    oppData?.expectedClosingDate ? `预计成交:${oppData.expectedClosingDate}` : '',
    source.customerAction ? `客户行为:${source.customerAction}` : ''
  ].filter(Boolean);
  const oppSummary = summaryParts.join('；') || `来自线索 ${source.id}`;
  const intentAmount = Number(oppData?.expectedAmount || 0);

  const oppRow = {
    id: oppId,
    customer_id: resolvedCustomerId || null,
    customer_type: resolvedCustomerId ? '老客户' : '新客户',
    customer_name: customerName,
    opp_date: today(),
    status: normalizeOpportunityStatus(oppData?.status),
    opp_summary: oppSummary,
    close_time: oppData?.closeTime || null,
    close_reason: String(oppData?.closeReason || '').trim() || null,
    product_line: normalizeOpportunityProductLine(oppData?.productLine || source.productCategory),
    sales_rep: String(oppData?.assignee || source.assignee || '').trim() || null,
    opp_level: 'B级',
    intent_amount: Number.isFinite(intentAmount) ? intentAmount : 0,
    associated_project: '',
    end_customer: String(oppData?.endCustomer || '').trim() || null,
    end_project: String(oppData?.endProject || '').trim() || null,
    application_scenario: String(oppData?.applicationScenario || '').trim() || null,
    estimated_usage: String(oppData?.estimatedUsage || '').trim() || null,
    estimated_mass_production_date: oppData?.expectedClosingDate || oppData?.estimatedMassProductionDate || null,
    sales_type: source.customerType || null,
    product_industry: source.productIndustry || null,
    product_series: source.productSeries || null,
    completeness: 10,
    contact_person: oppData?.contactPerson || source.name || null,
    lead_id: source.id,
    inquiry_id: source.inquiryId || null,
    updated_at: now
  };

  const { error: oppError } = await supabase.from('crm_opportunity').upsert(oppRow, { onConflict: 'id' });
  if (oppError) throw oppError;

  triggerAutoFlowsForCreate(
    'opportunity',
    { id: oppId, customerId: resolvedCustomerId, customerName },
    oppData?.creatorId ? { id: String(oppData.creatorId), name: String(oppData.creatorName || '') } : undefined
  ).catch(() => {});

  const { error: leadError } = await supabase
    .from('crm_lead')
    .update({ status: '转商机', updated_at: now })
    .eq('id', source.id);
  if (leadError) throw leadError;
  if (resolvedCustomerId) {
    await updateCustomerLastContactInSupabase(resolvedCustomerId, '线索转商机');
  }

  return oppId;
};

export const pushOpportunityToProjectInSupabase = async (source: Opportunity) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 环境变量未配置');
  }
  const supabase = getSupabaseClient();
  const customerName = String(source.customerName || '').trim() || '未填写客户';
  const resolvedCustomerId = await ensureCustomerId(source.customerId, customerName);
  
  if (resolvedCustomerId) {
    const { data: potential } = await supabase.from('crm_potential_customer').select('*').eq('id', resolvedCustomerId).maybeSingle();
    if (potential) {
      await convertPotentialCustomerToCustomerInSupabase(potential as any);
    }
  }

  const projectId = `PRJ_${Date.now()}`;
  const now = new Date().toISOString();
  const amount = Number(source.intentAmount || 0);
  const projectName = `${customerName}-项目`;

  const projectRow = {
    id: projectId,
    customer_id: resolvedCustomerId || null,
    customer_name: customerName,
    project_name: projectName,
    status: '跟进中',
    stage: '需求阶段',
    product_line: normalizeProjectProductLine(source.productLine),
    manager: null,
    amount: Number.isFinite(amount) ? amount : 0,
    start_date: today(),
    end_date: null,
    updated_at: now
  };

  const { error: projectError } = await supabase.from('crm_project').upsert(projectRow, { onConflict: 'id' });
  if (projectError) throw projectError;

  triggerAutoFlowsForCreate(
    'project',
    { id: projectId, customerId: resolvedCustomerId, customerName },
    source?.creatorId ? { id: String(source.creatorId), name: String(source.creatorName || '') } : undefined
  ).catch(() => {});

  const { error: oppError } = await supabase
    .from('crm_opportunity')
    .update({ status: '转项目', associated_project: projectId, updated_at: now })
    .eq('id', source.id);
  if (oppError) throw oppError;
  if (resolvedCustomerId) {
    await updateCustomerLastContactInSupabase(resolvedCustomerId, '商机转项目');
  }

  return projectId;
};

export const pushQuotationToSalesOrderInSupabase = async (quotation: SalesQuotation) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 环境变量未配置');
  }
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const orderId = `ORD_${Date.now()}`;
  const order: SalesOrder = {
    id: orderId,
    orderNo: `SO${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(Date.now()).slice(-5)}`,
    customerId: quotation.customerId || '',
    customerName: quotation.customerName || '未填写客户',
    projectId: quotation.projectId || '',
    projectName: quotation.projectName || '',
    orderDate: today(),
    status: '待执行',
    totalAmount: quotation.totalAmount || 0,
    taxIncludedTotalAmount: quotation.taxIncludedTotalAmount || 0,
    taxExcludedTotalAmount: quotation.taxExcludedTotalAmount || 0,
    items: quotation.items || [],
    auditStatus: '未审核',
    changeRecords: [],
    creatorId: quotation.creatorId || 'system',
    creatorNo: quotation.creatorNo || 'system',
    creatorName: quotation.creatorName || 'system',
    createDate: today()
  };

  await saveSalesOrderToSupabase(order as any);

  await supabase.from('crm_quotation').update({ status: '已接受', updated_at: now }).eq('id', quotation.id);
  if (order.customerId) {
    await updateCustomerLastContactInSupabase(order.customerId, '报价转订单');
  }

  return orderId;
};

export const deleteLeadFromSupabase = async (leadId: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(leadId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_lead').delete().eq('id', id);
  if (error) throw error;
};

export const deleteOpportunityFromSupabase = async (opportunityId: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(opportunityId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_opportunity').delete().eq('id', id);
  if (error) throw error;
};

export const deleteProjectFromSupabase = async (projectId: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(projectId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_project').delete().eq('id', id);
  if (error) throw error;
};
