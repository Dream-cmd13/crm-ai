import { CustomerStakeholder, StakeholderAssessment } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STAKEHOLDER_KEY = 'crm_customer_stakeholder';
const LOCAL_ASSESSMENT_KEY = 'crm_stakeholder_assessment';

const loadLocal = <T,>(key: string, fallback: T): T => {
  return fallback;
};

const saveLocal = (key: string, value: any) => {
  return;
};

const isRlsDenied = (error: any) => String(error?.code || '') === '42501';

export const fetchStakeholders = async (customerId: string): Promise<CustomerStakeholder[]> => {
  const local = loadLocal<CustomerStakeholder[]>(LOCAL_STAKEHOLDER_KEY, []);
  if (!customerId) return [];
  if (!isSupabaseConfigured()) return local.filter((x) => x.customerId === customerId);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_customer_stakeholder')
    .select('*')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const rows: CustomerStakeholder[] = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    contactId: row.extra?.contactId || '',
    name: row.name || '',
    title: row.title || '',
    department: row.department || '',
    roleTag: row.role_tag || 'I',
    influenceLevel: row.influence_level || 3,
    attitudeScore: row.attitude_score || 0,
    relationLevel: row.relation_level || 2,
    needLevel: row.need_level || '',
    businessFocus: row.business_focus || '',
    ownerUserId: row.owner_user_id || '',
    managerStakeholderId: row.extra?.managerStakeholderId || '',
    lastTouchTime: row.last_touch_time || '',
    lastTouchSummary: row.last_touch_summary || '',
    extra: row.extra || {},
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
  }));

  const remain = local.filter((x) => x.customerId !== customerId);
  saveLocal(LOCAL_STAKEHOLDER_KEY, [...remain, ...rows]);
  return rows;
};

export const upsertStakeholder = async (entry: CustomerStakeholder) => {
  const local = loadLocal<CustomerStakeholder[]>(LOCAL_STAKEHOLDER_KEY, []);
  const next = local.some((x) => x.id === entry.id) ? local.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...local];
  saveLocal(LOCAL_STAKEHOLDER_KEY, next);
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const payload = {
    id: entry.id,
    customer_id: entry.customerId,
    name: entry.name,
    title: entry.title || '',
    department: entry.department || '',
    role_tag: entry.roleTag,
    influence_level: entry.influenceLevel,
    attitude_score: entry.attitudeScore,
    relation_level: entry.relationLevel,
    need_level: entry.needLevel || '',
    business_focus: entry.businessFocus || '',
    owner_user_id: entry.ownerUserId || '',
    last_touch_time: entry.lastTouchTime || null,
    last_touch_summary: entry.lastTouchSummary || '',
    extra: {
      ...(entry.extra || {}),
      contactId: entry.contactId || '',
      managerStakeholderId: entry.managerStakeholderId || ''
    },
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_customer_stakeholder').upsert(payload, { onConflict: 'id' });
  if (error) {
    if (isRlsDenied(error)) {
      console.warn('crm_customer_stakeholder RLS denied, saved locally only');
      return;
    }
    throw error;
  }
};

export const fetchStakeholderAssessments = async (customerId: string): Promise<StakeholderAssessment[]> => {
  const local = loadLocal<StakeholderAssessment[]>(LOCAL_ASSESSMENT_KEY, []);
  if (!customerId) return [];
  if (!isSupabaseConfigured()) return local.filter((x) => x.customerId === customerId);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_stakeholder_assessment')
    .select('*')
    .eq('customer_id', customerId)
    .order('assessment_date', { ascending: false });
  if (error) throw error;

  const rows: StakeholderAssessment[] = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    stakeholderId: row.stakeholder_id,
    assessmentDate: row.assessment_date || new Date().toISOString().split('T')[0],
    needLevelScore: row.need_level_score ?? undefined,
    powerScore: row.power_score ?? undefined,
    attitudeScore: row.attitude_score ?? undefined,
    relationScore: row.relation_score ?? undefined,
    businessAlignmentScore: row.business_alignment_score ?? undefined,
    confidenceScore: row.confidence_score ?? undefined,
    conclusion: row.conclusion || '',
    strategySuggestion: row.strategy_suggestion || '',
    sourceType: row.source_type || 'manual',
    aiModel: row.ai_model || '',
    creatorId: row.created_by || 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
  }));

  const remain = local.filter((x) => x.customerId !== customerId);
  saveLocal(LOCAL_ASSESSMENT_KEY, [...remain, ...rows]);
  return rows;
};

export const createQuickAssessment = async (entry: StakeholderAssessment) => {
  const local = loadLocal<StakeholderAssessment[]>(LOCAL_ASSESSMENT_KEY, []);
  saveLocal(LOCAL_ASSESSMENT_KEY, [entry, ...local]);
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  const payload = {
    id: entry.id,
    customer_id: entry.customerId,
    stakeholder_id: entry.stakeholderId,
    assessment_date: entry.assessmentDate,
    need_level_score: entry.needLevelScore ?? null,
    power_score: entry.powerScore ?? null,
    attitude_score: entry.attitudeScore ?? null,
    relation_score: entry.relationScore ?? null,
    business_alignment_score: entry.businessAlignmentScore ?? null,
    confidence_score: entry.confidenceScore ?? 60,
    conclusion: entry.conclusion || '',
    strategy_suggestion: entry.strategySuggestion || '',
    source_type: entry.sourceType || 'manual',
    ai_model: entry.aiModel || '',
    created_by: entry.creatorId || 'system'
  };
  const { error } = await supabase.from('crm_stakeholder_assessment').insert(payload);
  if (error) {
    if (isRlsDenied(error)) {
      console.warn('crm_stakeholder_assessment RLS denied, saved locally only');
      return;
    }
    throw error;
  }
};
