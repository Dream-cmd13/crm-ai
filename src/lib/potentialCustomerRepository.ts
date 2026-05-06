import { PotentialCustomer } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { generateBusinessId, ID_PREFIX } from './idUtils';

const TABLE = 'crm_potential_customer';
const CUSTOMER_TABLE = 'ba_manucustinfo';

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
  const customerPayload = {
    id: cleanId,
    name: cleanName,
    level: '潜在客户',
    status: '活跃',
    source: '潜在客户',
    updated_at: now
  };
  const { error } = await supabase.from(CUSTOMER_TABLE).upsert(customerPayload, { onConflict: 'id' });
  if (error) throw error;
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
    return { id: id || generateBusinessId(ID_PREFIX.CUSTOMER), name: name || '' };
  }

  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('客户名称不能为空');

  const supabase = getSupabaseClient();
  const payload = {
    id: id || generateBusinessId(ID_PREFIX.CUSTOMER),
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
  const customerPayload = {
    id,
    name,
    level: '普通客户',
    status: '活跃',
    source: '潜在客户转正',
    updated_at: now
  };

  const { error: upsertError } = await supabase.from(CUSTOMER_TABLE).upsert(customerPayload, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  await deletePotentialCustomerFromSupabase(id);
};
