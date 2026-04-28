import { Department, User } from '../types';
import { mockDepartments, mockUsers } from '../data';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export const fetchUsersFromSupabase = async (): Promise<User[]> => {
  if (!isSupabaseConfigured()) return mockUsers;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_employeeinfo').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    ent_name: row.ent_name || '',
    username: row.username || '',
    name: row.name || '',
    role: row.role || '业务员',
    roles: [row.role || '业务员'],
    department_id: row.department || 'sales',
    employeeNo: row.no || row.employee_no || row.username || '',
    dataPermissions: {
      customerVisibility: 'all'
    }
  }));
};

export const fetchDepartmentsFromSupabase = async (): Promise<Department[]> => {
  // Departments are mostly hardcoded in UserManagement, but we can return mockDepartments for now
  // as there is no specific department table in the provided schema.
  return mockDepartments;
};

export const saveUserToSupabase = async (user: User) => {
  if (!isSupabaseConfigured()) return user;
  const supabase = getSupabaseClient();
  
  const payload = {
    id: user.id || `U${Date.now()}`,
    no: user.employeeNo || user.username || '',
    name: user.name,
    username: user.username,
    ent_name: user.ent_name || '',
    role: user.role || (user.roles && user.roles[0]) || '业务员',
    department: user.department_id,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('ba_employeeinfo').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { ...user, id: payload.id };
};

export const deleteUserFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_employeeinfo').delete().eq('id', id);
  if (error) throw error;
};
