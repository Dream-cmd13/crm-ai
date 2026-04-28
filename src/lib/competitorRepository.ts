import { Competitor, CustomerCompetitor } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const LOCAL_COMPETITORS_KEY = 'crm_competitors';
const LOCAL_CUSTOMER_COMPETITORS_KEY = 'crm_customer_competitors';

const defaultCompetitors: Competitor[] = [
  {
    id: 'COMP001',
    name: '竞品A',
    advantages: '交付速度快，渠道覆盖广',
    disadvantages: '定制能力一般，售后响应慢',
    positioning: '中端标准化方案',
    productProfiles: [
      { productName: '连接器A系列', benchmarkCategory: '接插件', advantages: '交期快', disadvantages: '定制化一般' }
    ],
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: new Date().toISOString().split('T')[0]
  },
  {
    id: 'COMP002',
    name: '竞品B',
    advantages: '价格有优势，促销频繁',
    disadvantages: '质量稳定性一般',
    positioning: '价格驱动型方案',
    productProfiles: [
      { productName: '连接器B基础款', benchmarkCategory: '电子电气', advantages: '价格低', disadvantages: '一致性一般' }
    ],
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: new Date().toISOString().split('T')[0]
  }
];

const loadLocal = <T,>(key: string, fallback: T): T => {
  return fallback;
};

const saveLocal = (key: string, value: any) => {
  return;
};
const isRlsDenied = (error: any) => String(error?.code || '') === '42501';

export const fetchCompetitors = async (): Promise<Competitor[]> => {
  const local = loadLocal<Competitor[]>(LOCAL_COMPETITORS_KEY, defaultCompetitors);
  if (!isSupabaseConfigured()) return local;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_competitor').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  const rows: Competitor[] = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name || '',
    advantages: row.advantages || '',
    disadvantages: row.disadvantages || '',
    positioning: row.positioning || '',
    productProfiles: Array.isArray(row.product_matrix) ? row.product_matrix : [],
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: row.created_at ? String(row.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
  }));
  saveLocal(LOCAL_COMPETITORS_KEY, rows.length > 0 ? rows : local);
  return rows.length > 0 ? rows : local;
};

export const saveCompetitors = async (competitors: Competitor[]) => {
  saveLocal(LOCAL_COMPETITORS_KEY, competitors);
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = competitors.map((item) => ({
    id: item.id,
    name: item.name,
    advantages: item.advantages || '',
    disadvantages: item.disadvantages || '',
    positioning: item.positioning || '',
    product_matrix: Array.isArray(item.productProfiles) ? item.productProfiles : [],
    updated_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('crm_competitor').upsert(payload, { onConflict: 'id' });
  if (error) {
    if (isRlsDenied(error)) {
      console.warn('crm_competitor RLS denied, saved locally only');
      return;
    }
    throw error;
  }
};

export const fetchCustomerCompetitors = async (customerId: string): Promise<CustomerCompetitor[]> => {
  const local = loadLocal<CustomerCompetitor[]>(LOCAL_CUSTOMER_COMPETITORS_KEY, []);
  if (!customerId) return [];
  if (!isSupabaseConfigured()) return local.filter((x) => x.customerId === customerId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_customer_competitor')
    .select('id, customer_id, competitor_id, threat_level, notes')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows: CustomerCompetitor[] = (data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    competitorId: row.competitor_id,
    threatLevel: row.threat_level || '中',
    notes: row.notes || '',
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: 'system',
    createDate: new Date().toISOString().split('T')[0]
  }));
  const remain = local.filter((x) => x.customerId !== customerId);
  saveLocal(LOCAL_CUSTOMER_COMPETITORS_KEY, [...remain, ...rows]);
  return rows;
};

export const upsertCustomerCompetitor = async (entry: CustomerCompetitor) => {
  const local = loadLocal<CustomerCompetitor[]>(LOCAL_CUSTOMER_COMPETITORS_KEY, []);
  const next = local.some((x) => x.id === entry.id) ? local.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...local];
  saveLocal(LOCAL_CUSTOMER_COMPETITORS_KEY, next);
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = {
    id: entry.id,
    customer_id: entry.customerId,
    competitor_id: entry.competitorId,
    threat_level: entry.threatLevel || '中',
    notes: entry.notes || '',
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_customer_competitor').upsert(payload, { onConflict: 'id' });
  if (error) {
    if (isRlsDenied(error)) {
      console.warn('crm_customer_competitor RLS denied, saved locally only');
      return;
    }
    throw error;
  }
};

export const removeCustomerCompetitor = async (id: string) => {
  const local = loadLocal<CustomerCompetitor[]>(LOCAL_CUSTOMER_COMPETITORS_KEY, []);
  saveLocal(LOCAL_CUSTOMER_COMPETITORS_KEY, local.filter((x) => x.id !== id));
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_customer_competitor').delete().eq('id', id);
  if (error) {
    if (isRlsDenied(error)) {
      console.warn('crm_customer_competitor RLS denied, removed locally only');
      return;
    }
    throw error;
  }
};
