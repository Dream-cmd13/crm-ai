import {
  CommunicationDetail,
  CustomerMessageSession,
  WechatSenderInbox,
  WechatSenderMessage,
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { resolveCustomerDbIdFromSupabase } from './customerRepository';

const formatChinaTime = (timeStr?: string | null) => {
  if (!timeStr) return '';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timeStr)).replace(/\//g, '-');
  } catch {
    return String(timeStr);
  }
};

const normalizeSenderKey = (senderWechatId?: string | null, senderDisplayName?: string | null) => {
  const cleanWechatId = String(senderWechatId || '').trim();
  if (cleanWechatId) return cleanWechatId;
  return String(senderDisplayName || '').trim().toLowerCase();
};

const mapInboxRow = (row: any): WechatSenderInbox => ({
  senderKey: String(row.sender_key || ''),
  senderWechatId: row.sender_wechat_id || undefined,
  senderDisplayName: row.sender_display_name || undefined,
  messageCount: Number(row.message_count || 0),
  lastMessageAt: row.last_message_at || undefined,
  lastMessagePreview: row.last_message_preview || undefined,
  archivedMessageCount: Number(row.archived_message_count || 0),
});

const mapSessionRow = (row: any): CustomerMessageSession => ({
  id: String(row.id || ''),
  customerId: String(row.customer_id || ''),
  contactId: row.contact_id || undefined,
  channel: row.channel || 'wechat_private',
  sourceSenderKey: String(row.source_sender_key || ''),
  sourceSenderWechatId: row.source_sender_wechat_id || undefined,
  sourceSenderDisplayName: row.source_sender_display_name || undefined,
  title: String(row.title || ''),
  messageCount: Number(row.message_count || 0),
  lastMessageAt: row.last_message_at || undefined,
  lastMessagePreview: row.last_message_preview || undefined,
  status: row.status === 'archived' ? 'archived' : 'active',
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || row.created_at || ''),
});

const mapWxMessageRow = (
  row: any,
  archivedSession?: CustomerMessageSession | null,
): WechatSenderMessage => ({
  id: String(row.id || ''),
  conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
  senderKey: normalizeSenderKey(row.sender_wechat_id, row.sender_display_name),
  senderWechatId: row.sender_wechat_id || undefined,
  senderDisplayName: row.sender_display_name || undefined,
  peerDisplayName: row.peer_display_name || undefined,
  messageOriginType: row.message_origin_type || undefined,
  msgType: typeof row.msg_type === 'number' ? row.msg_type : null,
  content: String(row.content || ''),
  quoteContent: row.quote_content || undefined,
  quoteMsgType: typeof row.quote_msg_type === 'number' ? row.quote_msg_type : null,
  quoteRemoteMediaUrl: row.quote_remote_media_url || undefined,
  quoteFileName: row.quote_file_name || undefined,
  remoteMediaUrl: row.remote_media_url || undefined,
  sendTime: row.send_time || undefined,
  archivedSessionId: archivedSession?.id,
  archivedSessionTitle: archivedSession?.title,
});

const mapWxMessageToCommunication = (
  row: any,
  session?: CustomerMessageSession | null,
): CommunicationDetail => {
  let content = String(row.content || '');
  const msgType = Number(row.msg_type);
  
  if (!content) {
    if (msgType === 3) content = '[图片]';
    else if (msgType === 34) content = '[语音]';
    else if (msgType === 43) content = '[视频]';
    else if (msgType === 47) content = '[表情]';
    else if (msgType === 48) content = '[位置]';
    else if (msgType === 49) content = '[链接/文件]';
    else if (row.remote_media_url) content = '[媒体文件]';
  }

  return {
    id: `WXM_${row.id}`,
    date: formatChinaTime(row.send_time),
    sender: String(row.sender_display_name || row.sender_wechat_id || ''),
    content: content || '[空消息]',
    type: session?.channel === 'wechat_group' ? 'wechat_group' : 'wechat',
    sourceId: session?.id || String(row.id || ''),
    sourceGroup: session?.title || row.peer_display_name || row.sender_display_name || row.sender_wechat_id || undefined,
  };
};

export const fetchWechatSenderInboxesFromSupabase = async (): Promise<WechatSenderInbox[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_wx_sender_inbox_v')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []).map(mapInboxRow).filter((item) => item.senderKey);
};

export const fetchWechatSenderMessagesFromSupabase = async (
  senderKey: string,
  options?: { onlyUnarchived?: boolean }
): Promise<WechatSenderMessage[]> => {
  const normalizedSenderKey = String(senderKey || '').trim().toLowerCase();
  if (!normalizedSenderKey) return [];
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data: conversationRows, error: conversationError } = await supabase
    .from('crm_wx_conversation')
    .select('id,my_wechat_id,my_wechat_name')
    .eq('conversation_type', 'private')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (conversationError) throw conversationError;
  const matchedConversationIds = (conversationRows || [])
    .filter((row: any) => normalizeSenderKey(row.my_wechat_id, row.my_wechat_name) === normalizedSenderKey)
    .map((row: any) => Number(row.id))
    .filter((id: number) => Number.isFinite(id));
  if (matchedConversationIds.length === 0) return [];

  const { data, error } = await supabase
    .from('crm_wx_message')
    .select('id,conversation_id,message_origin_type,sender_wechat_id,sender_display_name,peer_display_name,msg_type,content,quote_content,quote_msg_type,quote_remote_media_url,quote_file_name,remote_media_url,send_time')
    .in('conversation_id', matchedConversationIds)
    .eq('message_scope', 'private')
    .order('send_time', { ascending: false, nullsFirst: false });
  if (error) throw error;
  const filteredRows = data || [];

  const messageIds = filteredRows.map((row: any) => Number(row.id)).filter((id: number) => Number.isFinite(id));
  const { data: sessionItemRows, error: sessionItemError } = await supabase
    .from('crm_customer_message_session_item')
    .select('session_id,wx_message_id')
    .in('wx_message_id', messageIds);
  if (sessionItemError) throw sessionItemError;

  const sessionIds = Array.from(new Set((sessionItemRows || []).map((row: any) => String(row.session_id || '')).filter(Boolean)));
  const sessionMap = new Map<string, CustomerMessageSession>();
  if (sessionIds.length > 0) {
    const { data: sessionRows, error: sessionError } = await supabase
      .from('crm_customer_message_session')
      .select('*')
      .in('id', sessionIds);
    if (sessionError) throw sessionError;
    (sessionRows || []).forEach((row: any) => {
      const session = mapSessionRow(row);
      sessionMap.set(session.id, session);
    });
  }

  const archivedByMessageId = new Map<string, CustomerMessageSession>();
  (sessionItemRows || []).forEach((row: any) => {
    const wxMessageId = String(row.wx_message_id || '');
    const session = sessionMap.get(String(row.session_id || ''));
    if (wxMessageId && session) archivedByMessageId.set(wxMessageId, session);
  });

  return filteredRows
    .map((row: any) => mapWxMessageRow(row, archivedByMessageId.get(String(row.id || '')) || null))
    .filter((item) => !options?.onlyUnarchived || !item.archivedSessionId);
};

export const createCustomerMessageSessionFromSupabase = async (payload: {
  customerId: string;
  contactId?: string;
  senderKey: string;
  senderWechatId?: string;
  senderDisplayName?: string;
  title?: string;
  messageIds: string[];
  channel?: 'wechat_private' | 'wechat_group';
}): Promise<CustomerMessageSession> => {
  const customerId = String(payload.customerId || '').trim();
  const senderKey = String(payload.senderKey || '').trim();
  const messageIds = Array.from(new Set((payload.messageIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id))));
  if (!customerId) throw new Error('请选择客户');
  if (!senderKey) throw new Error('缺少发送人');
  if (messageIds.length === 0) throw new Error('请至少选择一条消息');
  if (!isSupabaseConfigured()) throw new Error('Supabase 未配置');

  const dbId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbId) throw new Error(`无法识别客户ID：${customerId}`);

  const supabase = getSupabaseClient();
  const { data: messageRows, error: messageError } = await supabase
    .from('crm_wx_message')
    .select('id,conversation_id,sender_wechat_id,sender_display_name,content,send_time')
    .in('id', messageIds)
    .order('send_time', { ascending: true, nullsFirst: true });
  if (messageError) throw messageError;
  if (!messageRows || messageRows.length === 0) throw new Error('未找到选中的消息');

  const sessionId = `CMS_${Date.now()}`;
  const firstMessage = messageRows[0];
  const lastMessage = messageRows[messageRows.length - 1];
  const { data: conversationRows, error: conversationError } = await supabase
    .from('crm_wx_conversation')
    .select('id,my_wechat_id,my_wechat_name,conversation_type')
    .in('id', Array.from(new Set(messageRows.map((row: any) => Number(row.conversation_id)).filter((value: number) => Number.isFinite(value)))));
  if (conversationError) throw conversationError;
  const conversationMap = new Map<string, any>();
  (conversationRows || []).forEach((row: any) => {
    conversationMap.set(String(row.id || ''), row);
  });
  const firstConversation = conversationMap.get(String(firstMessage?.conversation_id || ''));
  const resolvedSenderWechatId = payload.senderWechatId || String(firstConversation?.my_wechat_id || '').trim() || undefined;
  const resolvedSenderDisplayName = payload.senderDisplayName || String(firstConversation?.my_wechat_name || '').trim() || undefined;
  const sessionTitle = String(payload.title || '').trim() || `${customerId} - ${resolvedSenderDisplayName || resolvedSenderWechatId || senderKey} 会话`;
  const sessionInsert = {
    id: sessionId,
    customer_id: dbId,
    contact_id: String(payload.contactId || '').trim() || null,
    channel: payload.channel || (firstConversation?.conversation_type === 'group' ? 'wechat_group' : 'wechat_private'),
    source_sender_key: senderKey,
    source_sender_wechat_id: resolvedSenderWechatId || null,
    source_sender_display_name: resolvedSenderDisplayName || null,
    title: sessionTitle,
    message_count: messageRows.length,
    last_message_at: lastMessage?.send_time || null,
    last_message_preview: String(lastMessage?.content || '').slice(0, 200) || null,
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  const { data: sessionRow, error: sessionError } = await supabase
    .from('crm_customer_message_session')
    .insert(sessionInsert)
    .select('*')
    .single();
  if (sessionError) throw sessionError;

  const itemRows = messageRows.map((row: any, index: number) => ({
    session_id: sessionId,
    wx_message_id: row.id,
    sort_order: index,
  }));
  const { error: itemError } = await supabase
    .from('crm_customer_message_session_item')
    .insert(itemRows);
  if (itemError) throw itemError;

  return mapSessionRow(sessionRow);
};

export const fetchCustomerMessageSessionsFromSupabase = async (customerId: string): Promise<CustomerMessageSession[]> => {
  if (!customerId || !isSupabaseConfigured()) return [];
  const dbId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbId) return [];
  const supabase = getSupabaseClient();
  
  // 获取提炼后的会话
  const { data: sessionRows, error: sessionError } = await supabase
    .from('crm_customer_message_session')
    .select('*')
    .eq('customer_id', dbId)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (sessionError) throw sessionError;

  // 获取直接绑定的群聊/会话 (crm_wx_conversation 中已绑定 customer_id 的)
  const { data: convRows, error: convError } = await supabase
    .from('crm_wx_conversation')
    .select('*')
    .eq('customer_id', String(dbId))
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (convError) throw convError;

  const refinedSessions = (sessionRows || []).map(mapSessionRow);
  const boundSessions = (convRows || []).map((row: any): CustomerMessageSession => ({
    id: `CONV_${row.id}`,
    customerId: String(row.customer_id),
    channel: row.conversation_type === 'group' ? 'wechat_group' : 'wechat_private',
    sourceSenderKey: row.conversation_key,
    sourceSenderWechatId: row.my_wechat_id,
    sourceSenderDisplayName: row.my_wechat_name,
    title: row.conversation_name || row.room_name || row.room_remark_name || `群聊 ${row.id}`,
    messageCount: row.message_count || 0,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    status: 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  // 合并并去重 (如果一个 conversation 既有 refined session 又是 bound)
  // 优先显示 refined session
  const seenSourceKeys = new Set(refinedSessions.map(s => s.sourceSenderKey));
  const finalSessions = [...refinedSessions];
  
  boundSessions.forEach(bs => {
    if (!seenSourceKeys.has(bs.sourceSenderKey)) {
      finalSessions.push(bs);
    }
  });

  return finalSessions.sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || 0).getTime();
    const timeB = new Date(b.lastMessageAt || 0).getTime();
    return timeB - timeA;
  });
};

export const fetchCustomerMessageSessionMessagesFromSupabase = async (sessionId: string): Promise<CommunicationDetail[]> => {
  const id = String(sessionId || '').trim();
  if (!id) return [];
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();

  // 处理直接绑定的会话
  if (id.startsWith('CONV_')) {
    const convId = Number(id.replace('CONV_', ''));
    const { data: messageRows, error: messageError } = await supabase
      .from('crm_wx_message')
      .select('id,sender_wechat_id,sender_display_name,peer_display_name,content,send_time,msg_type')
      .eq('conversation_id', convId)
      .order('send_time', { ascending: true });
    if (messageError) throw messageError;

    const { data: convRow } = await supabase.from('crm_wx_conversation').select('*').eq('id', convId).maybeSingle();
    const session = convRow ? { 
      channel: convRow.conversation_type === 'group' ? 'wechat_group' : 'wechat_private', 
      title: convRow.conversation_name || convRow.room_name 
    } : null;

    return (messageRows || []).map((row: any) => mapWxMessageToCommunication(row, session as any));
  }

  const [{ data: sessionRow, error: sessionError }, { data: itemRows, error: itemError }] = await Promise.all([
    supabase.from('crm_customer_message_session').select('*').eq('id', id).maybeSingle(),
    supabase.from('crm_customer_message_session_item').select('wx_message_id,sort_order').eq('session_id', id).order('sort_order', { ascending: true }),
  ]);
  if (sessionError) throw sessionError;
  if (itemError) throw itemError;

  const wxMessageIds = (itemRows || []).map((row: any) => Number(row.wx_message_id)).filter((id) => Number.isFinite(id));
  if (wxMessageIds.length === 0) return [];
  const { data: messageRows, error: messageError } = await supabase
    .from('crm_wx_message')
    .select('id,sender_wechat_id,sender_display_name,peer_display_name,content,send_time,msg_type')
    .in('id', wxMessageIds);
  if (messageError) throw messageError;

  const session = sessionRow ? mapSessionRow(sessionRow) : null;
  const messageMap = new Map<string, any>();
  (messageRows || []).forEach((row: any) => {
    messageMap.set(String(row.id || ''), row);
  });

  return (itemRows || [])
    .map((item: any) => messageMap.get(String(item.wx_message_id || '')))
    .filter(Boolean)
    .map((row: any) => mapWxMessageToCommunication(row, session));
};

export const bindGroupChatToCustomer = async (conversationId: number, customerId: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 未配置');
  const dbId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbId) throw new Error(`无法识别客户ID：${customerId}`);

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('crm_wx_conversation')
    .update({ 
      customer_id: String(dbId), 
      updated_at: new Date().toISOString() 
    })
    .eq('id', conversationId);

  if (error) throw error;
};
