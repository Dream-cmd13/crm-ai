import { TodoTask } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const mapDbTaskToUi = (row: any): TodoTask => ({
  id: row.id,
  title: row.title || '',
  description: row.description || '',
  status: (row.status || '待办') as TodoTask['status'],
  importance: (row.importance || '中') as TodoTask['importance'],
  urgency: (row.urgency || '正常') as TodoTask['urgency'],
  assignee: row.assignee_name || '',
  assigneeId: row.assignee_id || '',
  assigneeName: row.assignee_name || '',
  dueDate: row.due_date || '',
  createDate: row.create_date || new Date().toISOString().split('T')[0],
  creatorId: row.creator_id || 'system',
  creatorNo: 'system',
  creatorName: row.creator_name || 'system',
  taskType: row.task_type || (row.module === 'customer_visit' ? '客户拜访' : '任务'),
  sourceType: (row.source_type || (row.module === 'customer_visit' ? 'visit' : 'manual')) as TodoTask['sourceType'],
  sourceId: row.source_id || row.related_id || '',
  auxiliaryData: row.auxiliary_json || null,
  associatedCustomerId: row.related_id || ''
});

const mapUiTaskToDb = (task: TodoTask, module = 'task_center') => ({
  id: task.id || `TASK${Date.now()}`,
  title: task.title || '',
  description: task.description || '',
  module,
  related_id: task.sourceId || task.associatedCustomerId || '',
  source_type: task.sourceType || null,
  source_id: task.sourceId || null,
  auxiliary_json: task.auxiliaryData || null,
  status: task.status || '待办',
  importance: task.importance || '中',
  urgency: task.urgency || '正常',
  assignee_id: task.assigneeId || null,
  assignee_name: task.assigneeName || task.assignee || '',
  due_date: task.dueDate || null,
  create_date: task.createDate || new Date().toISOString().split('T')[0],
  creator_id: task.creatorId || 'EMP001',
  creator_name: task.creatorName || '系统管理员',
  task_type: task.taskType || '任务',
  updated_at: new Date().toISOString()
});

export const fetchTasksFromSupabase = async (module = 'task_center'): Promise<TodoTask[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_task').select('*').eq('module', module).order('create_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbTaskToUi);
};

export const saveTasksSnapshotToSupabase = async (tasks: TodoTask[], module = 'task_center') => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const payload = tasks.map((task) => mapUiTaskToDb(task, module));
  if (payload.length === 0) return;
  const { error } = await supabase.from('crm_task').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const hasSopTaskForSource = async (
  sourceType: TodoTask['sourceType'] | undefined,
  sourceId: string | undefined,
  module = 'task_center'
): Promise<boolean> => {
  const normalizedType = String(sourceType || '').trim();
  const normalizedId = String(sourceId || '').trim();
  if (!normalizedType || !normalizedId) return false;

  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_task')
    .select('id,title,task_type,auxiliary_json')
    .eq('module', module)
    .eq('source_type', normalizedType)
    .eq('source_id', normalizedId)
    .limit(50);
  if (error) throw error;

  return (data || []).some((row: any) => {
    const aux = row?.auxiliary_json || {};
    return Boolean(aux?.sopTemplateId) || /^SOP/i.test(String(row?.task_type || '')) || /^\[SOP\]/i.test(String(row?.title || ''));
  });
};
