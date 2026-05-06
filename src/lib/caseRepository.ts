import { CustomerCase } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const splitList = (value: string | null | undefined) =>
  (value || '')
    .split('||')
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (value: string[] | undefined) => (value || []).filter(Boolean).join('||');

const mapDbCaseToUi = (row: any): CustomerCase => ({
  id: row.id,
  title: row.title || '',
  industry: row.industry || '',
  painPoints: splitList(row.pain_points),
  solution: row.solution || '',
  metrics: row.metrics || '',
  valueStatement: row.value_statement || '',
  tags: splitList(row.tags),
  images: splitList(row.images),
  attachments: splitList(row.attachments),
  productIds: splitList(row.product_ids),
  productCategoryIds: splitList(row.product_category_ids),
  productSeriesIds: splitList(row.product_series_ids || row.product_category_ids),
  customerId: row.customer_id || undefined,
  projectId: row.project_id || undefined,
  creatorId: 'system',
  creatorNo: 'system',
  creatorName: 'system',
  createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
});

export const fetchCasesFromSupabase = async (): Promise<CustomerCase[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_case_library').select('*').order('created_at', { ascending: false });
  if (error) {
    if ((error as any)?.code === 'PGRST205') return [];
    throw error;
  }
  const cases = (data || []).map(mapDbCaseToUi);
  return cases;
};

export async function saveCaseToSupabase(caseItem: CustomerCase): Promise<CustomerCase> {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const id = caseItem.id && caseItem.id !== 'new' ? caseItem.id : crypto.randomUUID();
  const payload = {
    id,
    title: caseItem.title || '',
    customer_name: caseItem.customerId || '',
    industry: caseItem.industry || '',
    pain_points: joinList(caseItem.painPoints),
    solution: caseItem.solution || '',
    metrics: caseItem.metrics || '',
    value_statement: caseItem.valueStatement || '',
    tags: joinList(caseItem.tags),
    attachments: joinList(caseItem.attachments),
    images: joinList(caseItem.images),
    product_series_ids: joinList(caseItem.productSeriesIds || caseItem.productCategoryIds),
    product_category_ids: joinList(caseItem.productSeriesIds || caseItem.productCategoryIds),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_case_library').upsert(payload, { onConflict: 'id' });
  if (error) {
    if ((error as any)?.code === 'PGRST205') throw new Error('crm_case_library 表不存在，请先完成数据库迁移');
    throw error;
  }
  return { ...caseItem, id };
}
