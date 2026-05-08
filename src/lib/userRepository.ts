import { Department, User } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export const fetchUsersFromSupabase = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    auth_id: row.auth_id || undefined,
    username: row.username || '',
    name: row.name || '',
    email: row.email || undefined,
    phone: row.phone || undefined,
    english_name: row.english_name || undefined,
    employeeNo: row.employee_no || row.username || '',
    role: row.role || 'User',
    roles: [row.role || 'User'],
    department_id: row.department_id || '',
    is_active: row.is_active ?? true,
    legacy_wanlian_id: row.legacy_wanlian_id ?? undefined,
    pad_permissions: row.pad_permissions || undefined,
    reviews: row.reviews || undefined,
    system_role_ids: row.system_role_ids || undefined,
    custom_permissions: row.custom_permissions || undefined,
    dataPermissions: {
      customerVisibility: 'all'
    }
  }));
};

export const fetchUserByAuthId = async (authId: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('users').select('*').or(`auth_id.eq.${authId},id.eq.${authId}`).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    auth_id: data.auth_id || undefined,
    username: data.username || '',
    name: data.name || '',
    email: data.email || undefined,
    phone: data.phone || undefined,
    english_name: data.english_name || undefined,
    employeeNo: data.employee_no || data.username || '',
    role: data.role || 'User',
    roles: [data.role || 'User'],
    department_id: data.department_id || '',
    is_active: data.is_active ?? true,
    legacy_wanlian_id: data.legacy_wanlian_id ?? undefined,
    dataPermissions: { customerVisibility: 'all' }
  };
};

export const fetchDepartmentsFromSupabase = async (): Promise<Department[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name || '',
    manager_name: row.manager_name || undefined,
    responsibilities: row.responsibilities || undefined,
    roles: row.roles || [],
    role_members: row.role_members || undefined,
    attributes: row.attributes || undefined,
    sub_departments: row.sub_departments || undefined,
    parent_id: row.parent_id || undefined,
    type: row.type ?? 0,
    legacy_wanlian_id: row.legacy_wanlian_id ?? undefined,
    okrs: row.okrs || undefined,
    reviews: row.reviews || undefined,
  }));
};

export const saveUserToSupabase = async (user: User) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();

  const payload = {
    id: user.id || `user-${Date.now()}`,
    username: user.username,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    english_name: user.english_name || null,
    employee_no: user.employeeNo || user.username || '',
    role: user.role || (user.roles && user.roles[0]) || 'User',
    department_id: user.department_id || null,
    is_active: user.is_active ?? true,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { ...user, id: payload.id };
};

export const deleteUserFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};
