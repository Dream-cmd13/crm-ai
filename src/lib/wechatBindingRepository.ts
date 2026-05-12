import type { WechatBinding, ConversationMember, UnresolvedNickname, CandidateWxid } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

// ---- WechatBinding CRUD ----

export const fetchWechatBindings = async (): Promise<WechatBinding[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_wechat_binding')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapBinding);
};

export const saveWechatBinding = async (data: {
  wechatId: string;
  wechatName?: string;
  bindType: 'employee' | 'customer_contact';
  bindId: string;
  matchSource?: string;
  isVerified?: boolean;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('crm_wechat_binding')
    .upsert({
      wechat_id: data.wechatId,
      wechat_name: data.wechatName || null,
      bind_type: data.bindType,
      bind_id: data.bindId,
      match_source: data.matchSource || 'manual_confirm',
      is_verified: data.isVerified ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wechat_id' });
  if (error) throw error;
};

export const deleteWechatBinding = async (id: number) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('crm_wechat_binding')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ---- Unresolved Nickname ----

export const fetchUnresolvedNicknames = async (status?: string): Promise<UnresolvedNickname[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  let query = supabase
    .from('crm_wechat_unresolved_nickname')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapUnresolved);
};

export const resolveNicknameConflict = async (
  unresolvedId: number,
  chosenWxid: string,
  bindType: 'employee' | 'customer_contact',
  bindId: string,
  resolvedBy?: string,
) => {
  const supabase = getSupabaseClient();

  // 1. 创建绑定
  const { error: bindErr } = await supabase
    .from('crm_wechat_binding')
    .upsert({
      wechat_id: chosenWxid,
      bind_type: bindType,
      bind_id: bindId,
      match_source: 'manual_confirm',
      is_verified: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wechat_id' });
  if (bindErr) throw bindErr;

  // 2. 更新未解析记录
  const { error: unresErr } = await supabase
    .from('crm_wechat_unresolved_nickname')
    .update({
      status: 'resolved',
      resolved_wxid: chosenWxid,
      resolved_bind_type: bindType,
      resolved_bind_id: bindId,
      resolved_by: resolvedBy || null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', unresolvedId);
  if (unresErr) throw unresErr;

  // 3. 回填 crm_wx_conversation_member
  const { error: memberErr } = await supabase
    .from('crm_wx_conversation_member')
    .update({
      member_type: bindType,
      contact_id: bindType === 'customer_contact' ? bindId : null,
      employee_id: bindType === 'employee' ? bindId : null,
      is_internal: bindType === 'employee',
      updated_at: new Date().toISOString(),
    })
    .eq('wechat_id', chosenWxid)
    .eq('member_type', 'external_unknown');
  if (memberErr) throw memberErr;
};

export const ignoreNickname = async (unresolvedId: number) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('crm_wechat_unresolved_nickname')
    .update({
      status: 'ignored',
      updated_at: new Date().toISOString(),
    })
    .eq('id', unresolvedId);
  if (error) throw error;
};

// ---- Manual trigger auto-match RPC ----

export const triggerAutoMatch = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('auto_match_wechat_bindings');
  if (error) throw error;
  return data;
};

// ---- Conversation Members (with binding info) ----

export const fetchConversationMembers = async (conversationId: number): Promise<ConversationMember[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_wx_conversation_member')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('is_internal', { ascending: false });
  if (error) throw error;

  // Fetch all bindings to enrich members
  const { data: bindings } = await supabase
    .from('crm_wechat_binding')
    .select('*');

  const bindingByWxid = new Map<string, WechatBinding>();
  for (const b of (bindings || [])) {
    bindingByWxid.set(b.wechat_id, mapBinding(b));
  }

  return (data || []).map((m: any) => {
    const member: ConversationMember = {
      id: m.id,
      conversationId: m.conversation_id,
      wechatId: m.wechat_id,
      displayName: m.display_name || undefined,
      memberType: m.member_type || 'external_unknown',
      contactId: m.contact_id || undefined,
      employeeId: m.employee_id || undefined,
      isInternal: m.is_internal || false,
    };
    if (bindingByWxid.has(m.wechat_id)) {
      member.binding = bindingByWxid.get(m.wechat_id);
    }
    return member;
  });
};

// ---- Search helpers for binding modal ----

export const searchEmployees = async (query: string) => {
  if (!isSupabaseConfigured() || !query) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, employee_no, wechat_name, wechat_id')
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(20);
  if (error) throw error;
  return data || [];
};

export const searchContacts = async (query: string) => {
  if (!isSupabaseConfigured() || !query) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_customer_contact')
    .select('id, name, position, customer_id, wechat_name, wechat_id')
    .ilike('name', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return data || [];
};

// ---- Mappers ----

const mapBinding = (row: any): WechatBinding => ({
  id: row.id,
  wechatId: row.wechat_id,
  wechatName: row.wechat_name || undefined,
  bindType: row.bind_type,
  bindId: row.bind_id,
  matchSource: row.match_source || 'nickname',
  isVerified: row.is_verified || false,
  createdAt: row.created_at,
});

const mapUnresolved = (row: any): UnresolvedNickname => ({
  id: row.id,
  nickname: row.nickname,
  candidateWxids: (row.candidate_wxids || []) as CandidateWxid[],
  status: row.status,
  createdAt: row.created_at,
});
