import { PotentialCustomer } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const TABLE = 'crm_potential_customer';
const CUSTOMER_TABLE = 'ba_manucustinfo';

const isDuplicateCustomerPrimaryKeyError = (error: any): boolean => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  const details = String(error?.details || '');
  return (
    code === '23505' &&
    (message.includes('ba_manucustinfo_pkey') || details.includes('ba_manucustinfo_pkey'))
  );
};

const mapDbToUi = (row: any): PotentialCustomer => ({
  id: row.id,
  name: row.name || '',
  createdAt: row.created_at || undefined,
  updatedAt: row.updated_at || undefined
});

const upsertPotentialStubCustomerInSupabase = async (id: string, name: string) => {
  const cleanId = (id || '').trim();
  const cleanName = (name || '').trim();
  if (!cleanId || !cleanName) return;
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { data: existing, error: queryError } = await supabase
    .from(CUSTOMER_TABLE)
    .select('id')
    .eq('customer_number', cleanId)
    .maybeSingle();
  if (queryError) throw queryError;

  const customerPayload = {
    customer_number: cleanId,
    name: cleanName,
    level: '潜在客户',
    status: 1,
    updated_at: now
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from(CUSTOMER_TABLE)
      .update(customerPayload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from(CUSTOMER_TABLE).insert(customerPayload);
  if (!insertError) return;
  if (!isDuplicateCustomerPrimaryKeyError(insertError)) throw insertError;

  // 兼容历史序列不同步：主键冲突时使用 max(id)+1 显式重试
  const { data: maxRow, error: maxError } = await supabase
    .from(CUSTOMER_TABLE)
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw maxError;
  const fallbackId = Number(maxRow?.id || 0) + 1;
  const { error: retryError } = await supabase
    .from(CUSTOMER_TABLE)
    .insert({ ...customerPayload, id: fallbackId });
  if (retryError) throw retryError;
};

export const searchPotentialCustomersByNameFromSupabase = async (name: string, limit: number = 20): Promise<PotentialCustomer[]> => {
  if (!isSupabaseConfigured()) return [];
  const q = (name || '').trim();
  if (!q) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .ilike('name', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapDbToUi);
};

export const createPotentialCustomerInSupabase = async (name: string, id?: string): Promise<PotentialCustomer> => {
  if (!isSupabaseConfigured()) {
    return { id: id || crypto.randomUUID(), name: name || '' };
  }

  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('客户名称不能为空');

  const supabase = getSupabaseClient();
  const payload = {
    id: id || crypto.randomUUID(),
    name: cleanName,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' });
  if (error) throw error;

  await upsertPotentialStubCustomerInSupabase(payload.id, payload.name);

  return {
    id: payload.id,
    name: payload.name,
    updatedAt: payload.updated_at
  };
};

export const ensurePotentialCustomerLinkedInSupabase = async (id: string, name: string) => {
  const cleanId = (id || '').trim();
  const cleanName = (name || '').trim();
  if (!cleanId || !cleanName) return;
  if (!isSupabaseConfigured()) return;
  await createPotentialCustomerInSupabase(cleanName, cleanId);
};

export const fetchPotentialCustomersFromSupabase = async (limit: number = 200): Promise<PotentialCustomer[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapDbToUi);
};

export const deletePotentialCustomerFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) return;
  const cleanId = (id || '').trim();
  if (!cleanId) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', cleanId);
  if (error) throw error;
};

export const convertPotentialCustomerToCustomerInSupabase = async (potential: PotentialCustomer) => {
  const id = (potential?.id || '').trim();
  const name = (potential?.name || '').trim();
  if (!id || !name) throw new Error('潜在客户信息不完整');

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const { data: existing, error: queryError } = await supabase
    .from(CUSTOMER_TABLE)
    .select('id')
    .eq('customer_number', id)
    .maybeSingle();
  if (queryError) throw queryError;

  const customerPayload = {
    customer_number: id,
    name,
    level: '普通客户',
    status: 1,
    updated_at: now
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from(CUSTOMER_TABLE)
      .update(customerPayload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase.from(CUSTOMER_TABLE).insert(customerPayload);
    if (!insertError) {
      await deletePotentialCustomerFromSupabase(id);
      return;
    }
    if (!isDuplicateCustomerPrimaryKeyError(insertError)) throw insertError;
    const { data: maxRow, error: maxError } = await supabase
      .from(CUSTOMER_TABLE)
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) throw maxError;
    const fallbackId = Number(maxRow?.id || 0) + 1;
    const { error: retryError } = await supabase
      .from(CUSTOMER_TABLE)
      .insert({ ...customerPayload, id: fallbackId });
    if (retryError) throw retryError;
  }

  await deletePotentialCustomerFromSupabase(id);
};
