import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export interface PermissionSnapshot {
  roles: Array<{ id: string; name: string; permissions: string[] }>;
  userPermissions: { [userId: string]: { roles: string[]; individualPermissions: string[] } };
}

export const fetchPermissionSnapshotFromSupabase = async (): Promise<PermissionSnapshot | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_ontology_object')
    .select('*')
    .eq('code', '__permissions__')
    .maybeSingle();
  if (error) throw error;
  if (!data?.description) return null;
  try {
    return JSON.parse(data.description);
  } catch {
    return null;
  }
};

export const savePermissionSnapshotToSupabase = async (snapshot: PermissionSnapshot) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_ontology_object').upsert(
    {
      id: '__permissions__',
      name: '权限配置存储',
      code: '__permissions__',
      description: JSON.stringify(snapshot),
      system_link: 'internal',
      is_sub_table: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
};
