import { TaskType } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const CONFIG_ID = 'task_types_config';

const normalizeTaskTypes = (input: TaskType[]): TaskType[] => {
  const seen = new Set<string>();
  const result: TaskType[] = [];
  (input || []).forEach((item, idx) => {
    const id = String(item?.id || '').trim() || `T_AUTO_${idx + 1}`;
    if (seen.has(id)) return;
    seen.add(id);
    result.push({ ...item, id });
  });
  return result;
};

export const fetchTaskTypeConfigFromSupabase = async (fallback: TaskType[]): Promise<TaskType[]> => {
  if (!isSupabaseConfigured()) return normalizeTaskTypes(fallback);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_system_config')
    .select('value_json')
    .eq('id', CONFIG_ID)
    .limit(1);
  if (error) throw error;
  const raw = data?.[0]?.value_json;
  if (!Array.isArray(raw)) return normalizeTaskTypes(fallback);
  return normalizeTaskTypes(raw as TaskType[]);
};

export const saveTaskTypeConfigToSupabase = async (taskTypes: TaskType[]) => {
  const normalized = normalizeTaskTypes(taskTypes);
  if (!isSupabaseConfigured()) return normalized;
  const supabase = getSupabaseClient();
  const payload = {
    id: CONFIG_ID,
    name: '任务类型设置',
    value_json: normalized,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_system_config').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return normalized;
};

