import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { updateCustomerLastContactInSupabase } from './customerRepository';

export const fetchCustomerContactsFromSupabase = async (customerId: string) => {
  if (!customerId || !isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_customer_contact')
    .select('*')
    .eq('customer_id', customerId);
  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
  return (data || []).map(d => ({
    id: d.id,
    name: d.name,
    position: d.position,
    department: d.department,
    phone: d.phone,
    email: d.email,
    buyingRole: d.buying_role,
    wechatId: d.wechat_id || '',
    managerContactId: d.manager_contact_id || '',
    faction: d.faction || '',
    attitudeToUs: d.attitude_to_us || '中性评价',
    attitudeScore: (d.attitude_score ?? 0) as any,
    roleTag: d.role_tag || 'I',
    influenceLevel: Number(d.influence_level || 3),
    relationLevel: Number(d.relation_level || 2) as any,
    graduationSchool: d.graduation_school || '',
    hometown: d.hometown || '',
    hobbies: Array.isArray(d.hobbies) ? d.hobbies : [],
    familySituation: d.family_situation || '',
    personality: d.personality || '',
    preferences: d.preferences || '',
    keyConcerns: d.key_concerns || '',
    followStrategy: d.follow_strategy || '',
    videoChannelProfile: d.video_channel_profile || '',
    douyinProfile: d.douyin_profile || '',
    xiaohongshuProfile: d.xiaohongshu_profile || '',
    socialMediaBehavior: d.social_media_behavior || ''
  }));
};

export const saveCustomerContactToSupabase = async (customerId: string, data: any) => {
  if (!customerId) throw new Error('缺少客户ID，无法保存联系人');
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload: any = {
    id: data.id || `CON${Date.now()}`,
    customer_id: customerId,
    name: data.name || '',
    position: data.position || '',
    department: data.department || '',
    phone: data.phone || '',
    email: data.email || '',
    wechat_id: data.wechatId || '',
    buying_role: data.buyingRole || '',
    manager_contact_id: data.managerContactId || null,
    faction: data.faction || '',
    attitude_to_us: data.attitudeToUs || '中性评价',
    attitude_score: typeof data.attitudeScore === 'number' ? data.attitudeScore : 0,
    role_tag: data.roleTag || 'I',
    influence_level: Number(data.influenceLevel || 3),
    relation_level: Number(data.relationLevel || 2),
    graduation_school: data.graduationSchool || '',
    hometown: data.hometown || '',
    hobbies: Array.isArray(data.hobbies) ? data.hobbies : [],
    family_situation: data.familySituation || '',
    personality: data.personality || '',
    preferences: data.preferences || '',
    key_concerns: data.keyConcerns || '',
    follow_strategy: data.followStrategy || '',
    video_channel_profile: data.videoChannelProfile || '',
    douyin_profile: data.douyinProfile || '',
    xiaohongshu_profile: data.xiaohongshuProfile || '',
    social_media_behavior: data.socialMediaBehavior || '',
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_customer_contact').upsert(payload, { onConflict: 'id' });
  if (error) {
    // Backward-compatible fallback: if remote schema cache is not updated yet, retry without new optional fields.
    if ((error as any)?.code === 'PGRST204') {
      const fallback = { ...payload };
      delete fallback.graduation_school;
      delete fallback.hometown;
      delete fallback.hobbies;
      delete fallback.family_situation;
      delete fallback.personality;
      delete fallback.preferences;
      delete fallback.key_concerns;
      delete fallback.follow_strategy;
      delete fallback.video_channel_profile;
      delete fallback.douyin_profile;
      delete fallback.xiaohongshu_profile;
      delete fallback.social_media_behavior;
      const { error: fallbackError } = await supabase.from('crm_customer_contact').upsert(fallback, { onConflict: 'id' });
      if (fallbackError) throw fallbackError;
    } else {
      throw error;
    }
  }
  await updateCustomerLastContactInSupabase(customerId, '联系人更新');
};

export const saveGroupChatToSupabase = async (data: any) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const id = data.id || `GC${Date.now()}`;
  const payload = {
    id,
    group_id: data.groupId || `G${Date.now()}`,
    customer_id: data.customerId || null,
    source_group: data.sourceGroup || null,
    manager_contact_id: data.managerContactId || null,
    manager_employee_id: data.managerEmployeeId || null
  };
  const { error } = await supabase.from('crm_group_chat').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  if (payload.customer_id) {
    await updateCustomerLastContactInSupabase(payload.customer_id, '群聊更新');
  }
  const members = Array.isArray(data.members) ? data.members : data.members ? [data.members] : [];
  if (members.length > 0) {
    const memberRows = members.map((member: any, index: number) => ({
      id: `GM${Date.now()}${index}`,
      group_chat_id: id,
      wechat_user_id: typeof member === 'string' ? member : member.wechatUserId || `WX${Date.now()}${index}`,
      wechat_nickname: typeof member === 'string' ? member : member.wechatNickname || member.mappedName || ''
    }));
    const { error: insertMemberError } = await supabase.from('crm_group_member').insert(memberRows);
    if (insertMemberError) throw insertMemberError;
  }
};
