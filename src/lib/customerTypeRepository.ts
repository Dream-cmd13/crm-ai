import { CustomerType } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const STORAGE_ID = '__customer_types__';

const parseTypes = (value: any): CustomerType[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as any[]).map((item) => ({
      ...item,
      inactiveDays: Number(item?.inactiveDays || 0) > 0 ? Number(item.inactiveDays) : undefined,
      activationTemplateId: item?.activationTemplateId ? String(item.activationTemplateId) : undefined
    })) as CustomerType[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          inactiveDays: Number(item?.inactiveDays || 0) > 0 ? Number(item.inactiveDays) : undefined,
          activationTemplateId: item?.activationTemplateId ? String(item.activationTemplateId) : undefined
        })) as CustomerType[];
      }
    } catch {
    }
  }
  return [];
};

export const fetchCustomerTypesFromSupabase = async (): Promise<CustomerType[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_ontology_object').select('description').eq('code', STORAGE_ID).limit(1);
  if (error) throw error;
  const raw = data?.[0]?.description;
  const parsed = parseTypes(raw);
  return parsed;
};

export const saveCustomerTypesToSupabase = async (types: CustomerType[]) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const payload = {
    id: STORAGE_ID,
    name: '客户类型',
    code: STORAGE_ID,
    description: JSON.stringify(types || []),
    system_link: '',
    is_sub_table: false,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_ontology_object').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};
