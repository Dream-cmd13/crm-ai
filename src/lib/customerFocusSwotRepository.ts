import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type DbCompetitorAnalysis = {
  id: string;
  name: string;
  strengths: string[];
  weaknesses: string[];
};

export type DbFocusSwotData = {
  id: string;
  customerFocus: string;
  keyContact: string;
  focusLevel: number;
  ourStrengths: string[];
  ourWeaknesses: string[];
  competitors: DbCompetitorAnalysis[];
  aiScript?: string;
};

const normalizeStringArray = (value: any): string[] => {
  if (!Array.isArray(value)) return [''];
  const next = value.map((x) => String(x ?? '').trim());
  return next.length > 0 ? next : [''];
};

export const fetchCustomerFocusSwot = async (customerId: string): Promise<DbFocusSwotData[]> => {
  if (!customerId) return [];
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法读取客户关注点数据');
  }
  const supabase = getSupabaseClient();
  const { data: focusRows, error: focusError } = await supabase
    .from('crm_customer_focus_swot')
    .select('*')
    .eq('customer_id', customerId)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (focusError) throw focusError;

  const { data: compRows, error: compError } = await supabase
    .from('crm_customer_focus_competitor')
    .select('*')
    .eq('customer_id', customerId)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });
  if (compError) throw compError;

  const compMap = (compRows || []).reduce<Record<string, DbCompetitorAnalysis[]>>((acc, row: any) => {
    const list = acc[row.focus_id] || [];
    list.push({
      id: row.id,
      name: row.competitor_name || '',
      strengths: normalizeStringArray(row.strengths),
      weaknesses: normalizeStringArray(row.weaknesses)
    });
    acc[row.focus_id] = list;
    return acc;
  }, {});

  return (focusRows || []).map((row: any) => ({
    id: row.id,
    customerFocus: row.customer_focus || '',
    keyContact: row.key_contact || '',
    focusLevel: Number(row.focus_level || 3),
    ourStrengths: normalizeStringArray(row.our_strengths),
    ourWeaknesses: normalizeStringArray(row.our_weaknesses),
    competitors: compMap[row.id]?.length ? compMap[row.id] : [{ id: `comp_${Date.now()}`, name: '', strengths: [''], weaknesses: [''] }],
    aiScript: row.ai_script || ''
  }));
};

export const saveCustomerFocusSwot = async (customerId: string, focusItems: DbFocusSwotData[]) => {
  if (!customerId) return;
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 未配置，无法保存客户关注点数据');
  }
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const cleanFocus = focusItems.map((item, idx) => ({
    id: item.id,
    customer_id: customerId,
    customer_focus: String(item.customerFocus || ''),
    key_contact: String(item.keyContact || ''),
    focus_level: Number(item.focusLevel || 3),
    our_strengths: Array.isArray(item.ourStrengths) ? item.ourStrengths : [],
    our_weaknesses: Array.isArray(item.ourWeaknesses) ? item.ourWeaknesses : [],
    ai_script: String(item.aiScript || ''),
    sort_order: idx,
    updated_at: now
  }));

  const { error: upsertFocusError } = await supabase.from('crm_customer_focus_swot').upsert(cleanFocus, { onConflict: 'id' });
  if (upsertFocusError) throw upsertFocusError;

  const allCompetitors = focusItems.flatMap((focus, focusIdx) =>
    (focus.competitors || []).map((comp, compIdx) => ({
      id: comp.id,
      focus_id: focus.id,
      customer_id: customerId,
      competitor_name: String(comp.name || ''),
      strengths: Array.isArray(comp.strengths) ? comp.strengths : [],
      weaknesses: Array.isArray(comp.weaknesses) ? comp.weaknesses : [],
      sort_order: focusIdx * 1000 + compIdx,
      updated_at: now
    }))
  );

  if (allCompetitors.length > 0) {
    const { error: upsertCompError } = await supabase.from('crm_customer_focus_competitor').upsert(allCompetitors, { onConflict: 'id' });
    if (upsertCompError) throw upsertCompError;
  }

  const focusIds = focusItems.map((x) => x.id);
  const compIds = allCompetitors.map((x) => x.id);

  if (focusIds.length > 0) {
    const { error: deleteExtraFocusError } = await supabase
      .from('crm_customer_focus_swot')
      .delete()
      .eq('customer_id', customerId)
      .not('id', 'in', `(${focusIds.map((x) => `"${x}"`).join(',')})`);
    if (deleteExtraFocusError) throw deleteExtraFocusError;
  } else {
    const { error: clearFocusError } = await supabase.from('crm_customer_focus_swot').delete().eq('customer_id', customerId);
    if (clearFocusError) throw clearFocusError;
  }

  if (compIds.length > 0) {
    const { error: deleteExtraCompError } = await supabase
      .from('crm_customer_focus_competitor')
      .delete()
      .eq('customer_id', customerId)
      .not('id', 'in', `(${compIds.map((x) => `"${x}"`).join(',')})`);
    if (deleteExtraCompError) throw deleteExtraCompError;
  } else {
    const { error: clearCompError } = await supabase.from('crm_customer_focus_competitor').delete().eq('customer_id', customerId);
    if (clearCompError) throw clearCompError;
  }
};
