import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Download, ExternalLink, FileText, Image as ImageIcon, MessageSquare, Plus, RefreshCw, Save, Search, User, Users, X } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

type ConversationType = 'private' | 'group';

const translateOriginType = (type: string) => {
  switch (type) {
    case 'unknown': return '未知';
    case 'group_forward': return '群聊转发';
    case 'private_forward': return '私聊转发';
    case 'group_live': return '群消息';
    default: return type || '未知';
  }
};

const formatTime = (timeStr?: string | null) => {
  if (!timeStr) return '-';
  try {
    const date = new Date(timeStr);
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date).replace(/\//g, '-');
  } catch {
    return timeStr;
  }
};

const normalizeName = (value?: string | null) => String(value || '').trim();

type WxConversationRow = {
  id: number;
  conversation_key: string;
  source_guid: string;
  conversation_type: ConversationType;
  my_wechat_id: string | null;
  my_wechat_name: string | null;
  peer_wechat_id: string | null;
  peer_wechat_name: string | null;
  room_username: string | null;
  conversation_name: string | null;
  room_name: string | null;
  room_remark_name: string | null;
  customer_id: string | null;
  primary_contact_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  message_count: number | null;
};

type WxMessageRow = {
  id: number;
  conversation_id: number;
  message_origin_type: string;
  sender_wechat_id: string | null;
  sender_display_name: string | null;
  peer_display_name: string | null;
  msg_type: number | null;
  content: string | null;
  quote_content: string | null;
  quote_msg_type: number | null;
  quote_remote_media_url: string | null;
  quote_file_name: string | null;
  remote_media_url: string | null;
  send_time: string | null;
};

type AttachmentKind = 'image' | 'file';

type AttachmentDescriptor = {
  kind: AttachmentKind;
  url: string;
  title: string;
  fileName?: string;
};

type QuoteDescriptor =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: AttachmentKind;
      text: string;
      attachment: AttachmentDescriptor;
    };

const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|[?#])/i;

const normalizeText = (value?: string | null) => String(value || '').trim();

const normalizeRemoteUrl = (value?: string | null) => {
  const trimmed = normalizeText(value);
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  return '';
};

const getFileNameFromUrl = (url?: string | null) => {
  const normalized = normalizeRemoteUrl(url);
  if (!normalized) return '';
  try {
    const { pathname } = new URL(normalized);
    const basename = pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(basename);
  } catch {
    const pathname = normalized.split('?')[0].split('#')[0];
    const basename = pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(basename);
  }
};

const cleanFileName = (fileName: string) => {
  let cleaned = fileName;
  // Strip UUIDs, 32-char hex hashes, and 13+ digit timestamps followed by underscore
  while (true) {
    const nextCleaned = cleaned.replace(/^([a-f0-9]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{13,})_/i, '');
    if (nextCleaned === cleaned) break;
    // Don't strip if it leaves us with just an extension or empty string
    if (!nextCleaned || nextCleaned.startsWith('.')) {
      break;
    }
    cleaned = nextCleaned;
  }
  return cleaned;
};

const getFileNameFromContent = (content?: string | null) => {
  const normalized = normalizeText(content);
  // Match both `[文件] sample.pdf` and `[xxx 文件] sample.pdf`
  const fileMatch = normalized.match(/^\[(?:[a-z0-9]+\s+)?文件\]\s*(.+)$/i);
  if (fileMatch?.[1]) return fileMatch[1].trim();
  return '';
};

const looksLikeImageContent = (content?: string | null) => /^\[图片(?:\s|])/.test(normalizeText(content));

const stripInlineQuoteSuffix = (content?: string | null) => {
  const normalized = String(content || '');
  const stripped = normalized.replace(/\s*\(被引用的消息:[\s\S]*\)\s*$/u, '').trim();
  return stripped || normalized.trim();
};

const buildAttachmentDescriptor = (data: {
  msgType?: number | null;
  content?: string | null;
  remoteMediaUrl?: string | null;
  fileName?: string | null;
}): AttachmentDescriptor | null => {
  const url = normalizeRemoteUrl(data.remoteMediaUrl);
  if (!url) return null;
  const content = normalizeText(data.content);
  const rawFileName = normalizeText(data.fileName) || getFileNameFromContent(content) || getFileNameFromUrl(url) || undefined;
  const isImage = data.msgType === 3 || looksLikeImageContent(content) || IMAGE_URL_PATTERN.test(url);
  const fileName = rawFileName ? (isImage ? rawFileName : cleanFileName(rawFileName)) : undefined;
  
  const title = isImage ? '图片' : fileName || '文件';

  return {
    kind: isImage ? 'image' : 'file',
    url,
    title,
    fileName: isImage ? rawFileName : fileName
  };
};

function MediaAttachmentCard({
  attachment,
  description,
  compact = false,
  onPreviewImage,
}: {
  attachment: AttachmentDescriptor;
  description?: string;
  compact?: boolean;
  onPreviewImage: (attachment: AttachmentDescriptor) => void;
}) {
  const isImage = attachment.kind === 'image';
  return (
    <div className={`rounded-xl border border-gray-200 bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
      {isImage ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onPreviewImage(attachment)}
            className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white block"
          >
            <img src={attachment.url} alt={attachment.title} className={`w-full object-contain bg-gray-100 ${compact ? 'max-h-40' : 'max-h-72'}`} />
          </button>
          {attachment.fileName && (
            <div className="text-xs text-gray-500 truncate px-1">
              {attachment.fileName}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <FileText className="mt-0.5 h-5 w-5 text-gray-500" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900" title={attachment.title}>{attachment.title}</div>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isImage ? (
          <>
            <button
              type="button"
              onClick={() => onPreviewImage(attachment)}
              className="inline-flex items-center gap-1.5 rounded border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              预览图片
            </button>
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              新窗口打开
            </a>
          </>
        ) : (
          <button
            type="button"
            onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-3.5 w-3.5" />
            浏览器下载
          </button>
        )}
      </div>
      {description ? (
        <div className="mt-2 text-xs leading-5 text-gray-500 break-words">{description}</div>
      ) : null}
    </div>
  );
}

function getPrivateConversationDisplayNames(chat: WxConversationRow) {
  const myName = normalizeName(chat.my_wechat_name);
  const peerName = normalizeName(chat.peer_wechat_name);
  const conversationName = normalizeName(chat.conversation_name);

  const myDisplayName = myName || '-';
  const customerDisplayName = peerName || (conversationName && conversationName !== myName ? conversationName : '') || '-';

  return {
    myDisplayName,
    customerDisplayName
  };
}

type CustomerLite = { id: string; name: string };
type ContactLite = { id: string; name: string };

function buildConversationKey(parts: string[]) {
  return parts.map((part) => String(part || '').trim().toLowerCase().replace(/\s+/g, '') || '_').join(':');
}

function buildWechatDisplayName(name: string, nickname: string) {
  const cleanName = normalizeName(name);
  const cleanNickname = normalizeName(nickname);
  if (cleanName && cleanNickname) return `${cleanName}(${cleanNickname})`;
  return cleanName || cleanNickname;
}

export default function SystemWechatQuery() {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddIndividual, setShowAddIndividual] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [indForm, setIndForm] = useState({
    my_wechat_name: '',
    my_wechat_nickname: '',
    peer_wechat_name: '',
    peer_wechat_nickname: '',
    customer_id: '',
    customer_name: '',
    primary_contact_id: '',
    primary_contact_name: ''
  });
  const [indCustomerKeyword, setIndCustomerKeyword] = useState('');
  const [indContactKeyword, setIndContactKeyword] = useState('');
  const [indCustomerOptions, setIndCustomerOptions] = useState<CustomerLite[]>([]);
  const [indContactOptions, setIndContactOptions] = useState<ContactLite[]>([]);
  const [indCustomerDropdownOpen, setIndCustomerDropdownOpen] = useState(false);
  const [indContactDropdownOpen, setIndContactDropdownOpen] = useState(false);
  const [grpForm, setGrpForm] = useState({
    room_username: '',
    room_name: '',
    room_remark_name: '',
    customer_id: '',
    customer_name: ''
  });
  const [grpCustomerKeyword, setGrpCustomerKeyword] = useState('');
  const [grpCustomerOptions, setGrpCustomerOptions] = useState<CustomerLite[]>([]);
  const [grpCustomerDropdownOpen, setGrpCustomerDropdownOpen] = useState(false);
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindMode, setBindMode] = useState<'individual' | 'group'>('individual');
  const [bindTargetId, setBindTargetId] = useState<number | null>(null);
  const [bindCustomerId, setBindCustomerId] = useState('');
  const [bindContactId, setBindContactId] = useState('');
  const [bindCustomerKeyword, setBindCustomerKeyword] = useState('');
  const [bindContactKeyword, setBindContactKeyword] = useState('');
  const [bindCustomerOptions, setBindCustomerOptions] = useState<CustomerLite[]>([]);
  const [bindContactOptions, setBindContactOptions] = useState<ContactLite[]>([]);
  const [bindCustomerDropdownOpen, setBindCustomerDropdownOpen] = useState(false);
  const [bindContactDropdownOpen, setBindContactDropdownOpen] = useState(false);
  const [conversations, setConversations] = useState<WxConversationRow[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, CustomerLite>>({});
  const [contactsById, setContactsById] = useState<Record<string, ContactLite>>({});
  const [memberCountByConversationId, setMemberCountByConversationId] = useState<Record<number, number>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<WxMessageRow[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentDescriptor | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoadingChats(true);
    const supabase = getSupabaseClient();
    try {
      const { data: conversationRows, error: conversationError } = await supabase
        .from('crm_wx_conversation')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
      if (conversationError) throw conversationError;

      const nextConversations = (conversationRows || []) as WxConversationRow[];
      setConversations(nextConversations);
      setSelectedConversationId((prev) => prev || (nextConversations[0] ? Number(nextConversations[0].id) : null));

      const customerIds = Array.from(new Set(nextConversations.map((item) => String(item.customer_id || '')).filter(Boolean)));
      const contactIds = Array.from(new Set(nextConversations.map((item) => String(item.primary_contact_id || '')).filter(Boolean)));
      const groupConversationIds = nextConversations.filter((item) => item.conversation_type === 'group').map((item) => Number(item.id));

      if (customerIds.length > 0) {
        const { data: customerRowsData } = await supabase.from('ba_manucustinfo').select('id,name').in('id', customerIds);
        const nextCustomers: Record<string, CustomerLite> = {};
        (customerRowsData || []).forEach((row: any) => {
          nextCustomers[String(row.id)] = { id: String(row.id), name: String(row.name || row.id) };
        });
        setCustomersById(nextCustomers);
      } else {
        setCustomersById({});
      }

      if (contactIds.length > 0) {
        const { data: contactRowsData } = await supabase.from('crm_customer_contact').select('id,name').in('id', contactIds);
        const nextContacts: Record<string, ContactLite> = {};
        (contactRowsData || []).forEach((row: any) => {
          nextContacts[String(row.id)] = { id: String(row.id), name: String(row.name || row.id) };
        });
        setContactsById(nextContacts);
      } else {
        setContactsById({});
      }

      if (groupConversationIds.length > 0) {
        const { data: memberRows } = await supabase
          .from('crm_wx_conversation_member')
          .select('conversation_id')
          .in('conversation_id', groupConversationIds);
        const nextCounts: Record<number, number> = {};
        (memberRows || []).forEach((row: any) => {
          const conversationId = Number(row.conversation_id);
          nextCounts[conversationId] = (nextCounts[conversationId] || 0) + 1;
        });
        setMemberCountByConversationId(nextCounts);
      } else {
        setMemberCountByConversationId({});
      }
    } catch (error) {
      console.error(error);
      toast.error('微信会话加载失败，请先执行最新微信 schema');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadConversationMessages = useCallback(async (conversationId: number) => {
    if (!isSupabaseConfigured()) return;
    setLoadingMessages(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('crm_wx_message')
        .select('id,conversation_id,message_origin_type,sender_wechat_id,sender_display_name,peer_display_name,msg_type,content,quote_content,quote_msg_type,quote_remote_media_url,quote_file_name,remote_media_url,send_time')
        .eq('conversation_id', conversationId)
        .order('send_time', { ascending: false });
      if (error) throw error;
      setConversationMessages((data || []) as WxMessageRow[]);
    } catch (error) {
      console.error(error);
      setConversationMessages([]);
      toast.error('消息明细加载失败');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openConversation = async (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setViewMode('detail');
    await loadConversationMessages(conversationId);
  };

  useEffect(() => {
    fetchChats();
  }, [activeTab, fetchChats]);

  useEffect(() => {
    if (selectedConversationId) {
      loadConversationMessages(selectedConversationId);
    } else {
      setConversationMessages([]);
    }
  }, [selectedConversationId, loadConversationMessages]);

  useEffect(() => {
    if (!showAddIndividual || !isSupabaseConfigured()) return;
    const keyword = indCustomerKeyword.trim();
    if (!keyword) {
      setIndCustomerOptions([]);
      return;
    }
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      const { data, error } = await supabase
        .from('ba_manucustinfo')
        .select('id,name')
        .ilike('name', `%${keyword}%`)
        .limit(8);
      if (!active) return;
      if (error) {
        console.error(error);
        setIndCustomerOptions([]);
        return;
      }
      const options = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || '')
      })).filter((row) => row.id && row.name);
      setIndCustomerOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [showAddIndividual, indCustomerKeyword]);

  useEffect(() => {
    if (!showAddIndividual || !isSupabaseConfigured()) return;
    if (!indForm.customer_id) {
      setIndContactOptions([]);
      return;
    }
    const keyword = indContactKeyword.trim();
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      let query = supabase
        .from('crm_customer_contact')
        .select('id,name')
        .eq('customer_id', indForm.customer_id)
        .limit(8);
      if (keyword) {
        query = query.ilike('name', `%${keyword}%`);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error(error);
        setIndContactOptions([]);
        return;
      }
      const options = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || '')
      })).filter((row) => row.id && row.name);
      setIndContactOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [showAddIndividual, indForm.customer_id, indContactKeyword]);

  useEffect(() => {
    if (!showBindModal || !isSupabaseConfigured()) return;
    const keyword = bindCustomerKeyword.trim();
    if (!keyword) {
      setBindCustomerOptions([]);
      return;
    }
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      const { data, error } = await supabase
        .from('ba_manucustinfo')
        .select('id,name')
        .ilike('name', `%${keyword}%`)
        .limit(8);
      if (!active) return;
      if (error) {
        console.error(error);
        setBindCustomerOptions([]);
        return;
      }
      const options = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || '')
      })).filter((row) => row.id && row.name);
      setBindCustomerOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [showBindModal, bindCustomerKeyword]);

  useEffect(() => {
    if (!showBindModal || !isSupabaseConfigured() || bindMode !== 'individual') return;
    if (!bindCustomerId) {
      setBindContactOptions([]);
      return;
    }
    const keyword = bindContactKeyword.trim();
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      let query = supabase
        .from('crm_customer_contact')
        .select('id,name')
        .eq('customer_id', bindCustomerId)
        .limit(8);
      if (keyword) {
        query = query.ilike('name', `%${keyword}%`);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error(error);
        setBindContactOptions([]);
        return;
      }
      const options = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || '')
      })).filter((row) => row.id && row.name);
      setBindContactOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [showBindModal, bindMode, bindCustomerId, bindContactKeyword]);

  useEffect(() => {
    if (!showAddGroup || !isSupabaseConfigured()) return;
    const keyword = grpCustomerKeyword.trim();
    if (!keyword) {
      setGrpCustomerOptions([]);
      return;
    }
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      const { data, error } = await supabase
        .from('ba_manucustinfo')
        .select('id,name')
        .ilike('name', `%${keyword}%`)
        .limit(8);
      if (!active) return;
      if (error) {
        console.error(error);
        setGrpCustomerOptions([]);
        return;
      }
      const options = ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || '')
      })).filter((row) => row.id && row.name);
      setGrpCustomerOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [showAddGroup, grpCustomerKeyword]);

  const saveIndividualToDb = async () => {
    if (!isSupabaseConfigured()) return;
    if (!indForm.my_wechat_name.trim() || !indForm.peer_wechat_name.trim()) {
      toast.error('请填写我的微信和客户微信');
      return;
    }
    const supabase = getSupabaseClient();
    try {
      const payload = {
        source_guid: 'manual',
        conversation_type: 'private' as ConversationType,
        conversation_key: buildConversationKey(['private_name', 'manual', indForm.my_wechat_name, indForm.peer_wechat_name]),
        my_wechat_id: null,
        my_wechat_name: buildWechatDisplayName(indForm.my_wechat_name, indForm.my_wechat_nickname) || indForm.my_wechat_name.trim(),
        peer_wechat_id: null,
        peer_wechat_name: buildWechatDisplayName(indForm.peer_wechat_name, indForm.peer_wechat_nickname) || indForm.peer_wechat_name.trim(),
        conversation_name: buildWechatDisplayName(indForm.peer_wechat_name, indForm.peer_wechat_nickname) || indForm.peer_wechat_name.trim(),
        customer_id: indForm.customer_id.trim() || null,
        primary_contact_id: indForm.primary_contact_id.trim() || null,
        status: 'active'
      };
      const { error } = await supabase.from('crm_wx_conversation').upsert(payload, { onConflict: 'conversation_key' });
      if (error) throw error;
      setShowAddIndividual(false);
      setIndForm({
        my_wechat_name: '',
        my_wechat_nickname: '',
        peer_wechat_name: '',
        peer_wechat_nickname: '',
        customer_id: '',
        customer_name: '',
        primary_contact_id: '',
        primary_contact_name: ''
      });
      setIndCustomerKeyword('');
      setIndContactKeyword('');
      setIndCustomerOptions([]);
      setIndContactOptions([]);
      await fetchChats();
    } catch (error) {
      console.error(error);
      toast.error('个人会话落库失败，请确认已执行最新微信 schema');
    }
  };

  const saveGroupToDb = async () => {
    if (!isSupabaseConfigured()) return;
    if (!grpForm.room_name.trim() && !grpForm.room_username.trim()) {
      toast.error('请至少填写群ID或群名称');
      return;
    }
    const supabase = getSupabaseClient();
    try {
      const groupKey = grpForm.room_username.trim() || grpForm.room_name.trim();
      const payload = {
        source_guid: 'manual',
        conversation_type: 'group' as ConversationType,
        conversation_key: buildConversationKey(['group', 'manual', groupKey]),
        room_username: grpForm.room_username.trim() || null,
        room_name: grpForm.room_name.trim() || null,
        room_remark_name: grpForm.room_remark_name.trim() || null,
        conversation_name: grpForm.room_remark_name.trim() || grpForm.room_name.trim() || grpForm.room_username.trim(),
        customer_id: grpForm.customer_id.trim() || null,
        status: 'active'
      };
      const { error } = await supabase.from('crm_wx_conversation').upsert(payload, { onConflict: 'conversation_key' });
      if (error) throw error;
      setShowAddGroup(false);
      setGrpForm({ room_username: '', room_name: '', room_remark_name: '', customer_id: '', customer_name: '' });
      setGrpCustomerKeyword('');
      setGrpCustomerOptions([]);
      setGrpCustomerDropdownOpen(false);
      await fetchChats();
    } catch (error) {
      console.error(error);
      toast.error('群聊会话落库失败，请确认已执行最新微信 schema');
    }
  };

  const openBindModal = (mode: 'individual' | 'group', row: WxConversationRow) => {
    const customerName = customersById[String(row.customer_id || '')]?.name || '';
    const contactName = contactsById[String(row.primary_contact_id || '')]?.name || '';
    setBindMode(mode);
    setBindTargetId(Number(row.id));
    setBindCustomerId(String(row.customer_id || ''));
    setBindContactId(String(row.primary_contact_id || ''));
    setBindCustomerKeyword(customerName);
    setBindContactKeyword(contactName);
    setBindCustomerOptions([]);
    setBindContactOptions([]);
    setBindCustomerDropdownOpen(false);
    setBindContactDropdownOpen(false);
    setShowBindModal(true);
  };

  const saveBinding = async () => {
    if (!isSupabaseConfigured()) return;
    if (!bindTargetId || !bindCustomerId.trim()) {
      toast.error('请选择客户');
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const payload =
        bindMode === 'individual'
          ? { customer_id: bindCustomerId.trim(), primary_contact_id: bindContactId.trim() || null }
          : { customer_id: bindCustomerId.trim(), primary_contact_id: null };
      const { error } = await supabase.from('crm_wx_conversation').update(payload).eq('id', bindTargetId);
      if (error) throw error;
      setShowBindModal(false);
      setBindCustomerKeyword('');
      setBindContactKeyword('');
      setBindCustomerOptions([]);
      setBindContactOptions([]);
      await fetchChats();
      toast.success('绑定成功');
    } catch (error) {
      console.error(error);
      toast.error('绑定失败，请确认会话表存在并且有写权限');
    }
  };

  const filteredIndividuals = useMemo(
    () =>
      conversations
        .filter((item) => item.conversation_type === 'private')
        .filter((item) => {
          const { myDisplayName, customerDisplayName } = getPrivateConversationDisplayNames(item);
          return [
            myDisplayName,
            customerDisplayName,
            customersById[String(item.customer_id || '')]?.name,
            contactsById[String(item.primary_contact_id || '')]?.name
          ]
            .filter(Boolean)
            .some((value) => String(value).includes(searchQuery));
        }),
    [conversations, contactsById, customersById, searchQuery]
  );

  const filteredGroups = useMemo(
    () =>
      conversations
        .filter((item) => item.conversation_type === 'group')
        .filter((item) =>
          [
            item.room_username,
            item.room_name,
            item.conversation_name,
            customersById[String(item.customer_id || '')]?.name
          ]
            .filter(Boolean)
            .some((value) => String(value).includes(searchQuery))
        ),
    [conversations, customersById, searchQuery]
  );

  const selectedConversation = useMemo(
    () => conversations.find((item) => Number(item.id) === Number(selectedConversationId)) || null,
    [conversations, selectedConversationId]
  );

  const selectedPrivateDisplay = useMemo(
    () => (selectedConversation?.conversation_type === 'private' ? getPrivateConversationDisplayNames(selectedConversation) : null),
    [selectedConversation]
  );

  const selectedConversationTitle = selectedConversation?.conversation_type === 'group'
    ? selectedConversation.room_name || selectedConversation.conversation_name || selectedConversation.room_username || '群聊会话'
    : selectedPrivateDisplay?.customerDisplayName || selectedConversation?.conversation_name || '个人会话';

  const selectedConversationSubtitle = selectedConversation?.conversation_type === 'group'
    ? `群聊会话 · ${selectedConversation.room_username || '-'}`
    : `个人会话 · ${selectedPrivateDisplay?.myDisplayName || '-'} / ${selectedPrivateDisplay?.customerDisplayName || '-'}`;

  return (
    <div className="w-full max-w-full overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 space-y-6 min-h-[500px]">
      {viewMode === 'list' ? (
        <>
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                微信会话查询
              </h3>
              <p className="text-sm text-gray-500 mt-1">统一查看 `crm_wx_*` 会话、手动绑定客户，并进入聊天记录详情。</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'individual' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('individual')}
              >
                个人会话
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'group' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                onClick={() => setActiveTab('group')}
              >
                群聊会话
              </button>
            </div>

            <div className="relative w-72">
              <input
                type="text"
                placeholder="搜索微信名 / 群名 / 客户..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <button
                onClick={fetchChats}
                disabled={loadingChats}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 text-gray-700 rounded bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingChats ? 'animate-spin' : ''}`} />
                刷新
              </button>
              {activeTab === 'individual' ? (
                <button
                  onClick={() => setShowAddIndividual(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
                >
                  <Plus className="w-3.5 h-3.5" /> 新增个人会话
                </button>
              ) : (
                <button
                  onClick={() => setShowAddGroup(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
                >
                  <Plus className="w-3.5 h-3.5" /> 新增群聊会话
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 text-gray-700 rounded bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回列表
              </button>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedConversationTitle}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedConversationSubtitle}</p>
              </div>
            </div>
            {selectedConversation && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await fetchChats();
                    if (selectedConversationId) {
                      await loadConversationMessages(selectedConversationId);
                    }
                  }}
                  disabled={loadingChats || loadingMessages}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 text-gray-700 rounded bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${(loadingChats || loadingMessages) ? 'animate-spin' : ''}`} />
                  刷新
                </button>
                <button
                  onClick={() => openBindModal(selectedConversation.conversation_type === 'group' ? 'group' : 'individual', selectedConversation)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
                >
                  绑定客户
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">会话类型</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">{selectedConversation?.conversation_type === 'group' ? '群聊会话' : '个人会话'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">匹配客户</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">{customersById[String(selectedConversation?.customer_id || '')]?.name || '未绑定'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">消息数</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">{selectedConversation?.message_count || conversationMessages.length || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedConversation?.conversation_type === 'group' ? (
              <>
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="text-xs text-gray-500">群ID</div>
                  <div className="text-sm text-gray-900 font-mono break-all">{selectedConversation.room_username || '-'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="text-xs text-gray-500">群名称</div>
                  <div className="text-sm text-gray-900">{selectedConversation.room_name || selectedConversation.conversation_name || '-'}</div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="text-xs text-gray-500">我的微信</div>
                  <div className="text-sm text-gray-900">{selectedPrivateDisplay?.myDisplayName || '-'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="text-xs text-gray-500">客户微信</div>
                  <div className="text-sm text-gray-900">{selectedPrivateDisplay?.customerDisplayName || '-'}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddIndividual && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
          <div className="text-sm font-bold text-green-800">新增个人会话</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">我的微信</label>
              <input value={indForm.my_wechat_name} onChange={(e) => setIndForm({ ...indForm, my_wechat_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">我的微信昵称</label>
              <input value={indForm.my_wechat_nickname} onChange={(e) => setIndForm({ ...indForm, my_wechat_nickname: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户微信</label>
              <input value={indForm.peer_wechat_name} onChange={(e) => setIndForm({ ...indForm, peer_wechat_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户微信昵称</label>
              <input value={indForm.peer_wechat_nickname} onChange={(e) => setIndForm({ ...indForm, peer_wechat_nickname: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户（可选）</label>
              <div className="relative">
                <input
                  value={indCustomerKeyword}
                  onFocus={() => setIndCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIndCustomerDropdownOpen(false), 120)}
                  onChange={(e) => {
                    const nextKeyword = e.target.value;
                    setIndCustomerKeyword(nextKeyword);
                    setIndForm({
                      ...indForm,
                      customer_id: '',
                      customer_name: '',
                      primary_contact_id: '',
                      primary_contact_name: ''
                    });
                    setIndContactKeyword('');
                    setIndContactOptions([]);
                  }}
                  placeholder="搜索客户名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
                {indCustomerDropdownOpen && indCustomerOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {indCustomerOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setIndForm({
                            ...indForm,
                            customer_id: option.id,
                            customer_name: option.name,
                            primary_contact_id: '',
                            primary_contact_name: ''
                          });
                          setIndCustomerKeyword(option.name);
                          setIndContactKeyword('');
                          setIndContactOptions([]);
                          setIndCustomerDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {indForm.customer_name ? (
                <div className="mt-1 text-xs text-gray-500">已选择：{indForm.customer_name}</div>
              ) : (
                <div className="mt-1 text-xs text-gray-400">可不选；若要选联系人请先选择客户</div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">联系人（可选）</label>
              <div className="relative">
                <input
                  value={indContactKeyword}
                  disabled={!indForm.customer_id}
                  onFocus={() => setIndContactDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIndContactDropdownOpen(false), 120)}
                  onChange={(e) => {
                    const nextKeyword = e.target.value;
                    setIndContactKeyword(nextKeyword);
                    setIndForm({
                      ...indForm,
                      primary_contact_id: '',
                      primary_contact_name: ''
                    });
                  }}
                  placeholder={indForm.customer_id ? '搜索联系人名称' : '请先选择客户'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                />
                {indContactDropdownOpen && indForm.customer_id && indContactOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {indContactOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setIndForm({
                            ...indForm,
                            primary_contact_id: option.id,
                            primary_contact_name: option.name
                          });
                          setIndContactKeyword(option.name);
                          setIndContactDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {indForm.primary_contact_name ? (
                <div className="mt-1 text-xs text-gray-500">已选择：{indForm.primary_contact_name}</div>
              ) : (
                <div className="mt-1 text-xs text-gray-400">可不选</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveIndividualToDb} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded">
              <Save className="w-3.5 h-3.5" /> 保存
            </button>
            <button onClick={() => setShowAddIndividual(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
          </div>
        </div>
      )}

      {showAddGroup && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
          <div className="text-sm font-bold text-green-800">新增群聊会话</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">群ID</label>
              <input value={grpForm.room_username} onChange={(e) => setGrpForm({ ...grpForm, room_username: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">群名称</label>
              <input value={grpForm.room_name} onChange={(e) => setGrpForm({ ...grpForm, room_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">群备注名</label>
              <input value={grpForm.room_remark_name} onChange={(e) => setGrpForm({ ...grpForm, room_remark_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户（可选）</label>
              <div className="relative">
                <input
                  value={grpCustomerKeyword}
                  onFocus={() => setGrpCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setGrpCustomerDropdownOpen(false), 120)}
                  onChange={(e) => {
                    setGrpCustomerKeyword(e.target.value);
                    setGrpForm({ ...grpForm, customer_id: '', customer_name: '' });
                  }}
                  placeholder="搜索客户名称"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                />
                {grpCustomerDropdownOpen && grpCustomerOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {grpCustomerOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setGrpForm({ ...grpForm, customer_id: option.id, customer_name: option.name });
                          setGrpCustomerKeyword(option.name);
                          setGrpCustomerDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {grpForm.customer_name ? (
                <div className="mt-1 text-xs text-gray-500">已选择：{grpForm.customer_name}</div>
              ) : (
                <div className="mt-1 text-xs text-gray-400">可不选</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveGroupToDb} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded">
              <Save className="w-3.5 h-3.5" /> 保存
            </button>
            <button onClick={() => setShowAddGroup(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {activeTab === 'individual' ? (
                  <>
                    <th className="p-4 text-sm font-medium text-gray-500">我的微信</th>
                    <th className="p-4 text-sm font-medium text-gray-500">客户微信</th>
                    <th className="p-4 text-sm font-medium text-gray-500">匹配客户</th>
                    <th className="p-4 text-sm font-medium text-gray-500">匹配联系人</th>
                    <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-sm font-medium text-gray-500">群ID</th>
                    <th className="p-4 text-sm font-medium text-gray-500">群名称</th>
                    <th className="p-4 text-sm font-medium text-gray-500">成员数</th>
                    <th className="p-4 text-sm font-medium text-gray-500">匹配客户</th>
                    <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === 'individual' ? (
                filteredIndividuals.length > 0 ? (
                  filteredIndividuals.map((chat) => {
                    const { myDisplayName, customerDisplayName } = getPrivateConversationDisplayNames(chat);
                    return (
                      <tr key={chat.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-900">{myDisplayName}</td>
                        <td className="p-4 text-sm text-gray-900">{customerDisplayName}</td>
                      <td className="p-4">
                        {chat.customer_id && customersById[String(chat.customer_id)] ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            {customersById[String(chat.customer_id)].name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">未匹配</span>
                        )}
                      </td>
                      <td className="p-4">
                        {chat.primary_contact_id && contactsById[String(chat.primary_contact_id)] ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                            <User className="w-3.5 h-3.5" />
                            {contactsById[String(chat.primary_contact_id)].name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">未匹配</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openConversation(Number(chat.id))} className="text-xs px-2 py-1 border border-blue-200 text-blue-700 rounded bg-white hover:bg-blue-50">
                            进入会话
                          </button>
                          <button onClick={() => openBindModal('individual', chat)} className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded bg-white hover:bg-green-50">
                            绑定客户
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">暂无数据</td></tr>
                )
              ) : (
                filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-900 font-mono">{group.room_username || '-'}</td>
                      <td className="p-4 text-sm text-gray-900 font-medium">{group.room_name || group.conversation_name || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-400" />
                          {memberCountByConversationId[Number(group.id)] || 0}
                        </div>
                      </td>
                      <td className="p-4">
                        {group.customer_id && customersById[String(group.customer_id)] ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            <Building2 className="w-3.5 h-3.5" />
                            {customersById[String(group.customer_id)].name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">未匹配</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openConversation(Number(group.id))} className="text-xs px-2 py-1 border border-blue-200 text-blue-700 rounded bg-white hover:bg-blue-50">
                            进入会话
                          </button>
                          <button onClick={() => openBindModal('group', group)} className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded bg-white hover:bg-green-50">
                            绑定客户
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">暂无数据</td></tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4 min-h-[500px]">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            按时间顺序展示当前会话消息，支持区分个人转发、群聊转发和群实时消息。
          </div>
          <div className="space-y-3">
            {loadingMessages ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">加载消息中...</div>
            ) : conversationMessages.length > 0 ? (
              conversationMessages.map((message) => {
                const messageAttachment = buildAttachmentDescriptor({
                  msgType: message.msg_type,
                  content: message.content,
                  remoteMediaUrl: message.remote_media_url
                });
                const quoteAttachment = buildAttachmentDescriptor({
                  msgType: message.quote_msg_type,
                  content: message.quote_content,
                  remoteMediaUrl: message.quote_remote_media_url,
                  fileName: message.quote_file_name
                });
                const quoteText = normalizeText(message.quote_content);
                const quoteDescriptor: QuoteDescriptor | null = quoteAttachment
                  ? {
                      kind: quoteAttachment.kind,
                      text: quoteText || '[引用消息]',
                      attachment: quoteAttachment
                    }
                  : quoteText
                    ? { kind: 'text', text: quoteText }
                    : null;
                const visibleContent = quoteDescriptor ? stripInlineQuoteSuffix(message.content) : normalizeText(message.content);
                const shouldShowTextContent = !messageAttachment || !normalizeRemoteUrl(message.remote_media_url);

                return (
                  <div key={message.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {message.sender_display_name || message.peer_display_name || message.sender_wechat_id || '未知发送人'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{translateOriginType(message.message_origin_type || 'unknown')}</div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">{formatTime(message.send_time)}</div>
                    </div>

                    {quoteDescriptor ? (
                      <div className="mt-3 rounded-xl border-l-4 border-gray-300 bg-gray-50 p-3">
                        <div className="text-xs font-medium text-gray-500">被引用消息</div>
                        {quoteDescriptor.kind === 'text' ? (
                          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{quoteDescriptor.text}</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <MediaAttachmentCard
                              attachment={quoteDescriptor.attachment}
                              compact
                              onPreviewImage={setPreviewAttachment}
                            />
                            {normalizeRemoteUrl(quoteDescriptor.attachment.url) && quoteDescriptor.text && quoteDescriptor.attachment.kind !== 'image' ? (
                              <div className="whitespace-pre-wrap break-words text-xs leading-5 text-gray-500">{quoteDescriptor.text}</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {messageAttachment ? (
                      <div className="mt-3">
                        <MediaAttachmentCard
                          attachment={messageAttachment}
                          onPreviewImage={setPreviewAttachment}
                        />
                      </div>
                    ) : null}

                    {shouldShowTextContent ? (
                      <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-6">
                        {visibleContent || '[空消息]'}
                      </div>
                    ) : visibleContent && visibleContent !== normalizeText(message.content) ? (
                      <div className="mt-3 text-xs text-gray-500 whitespace-pre-wrap break-words leading-5">{visibleContent}</div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">当前会话暂无消息记录。</div>
            )}
          </div>
        </div>
      )}

      {showBindModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4">
            <h4 className="text-base font-bold text-gray-900">{bindMode === 'individual' ? '绑定个人会话客户' : '绑定群聊会话客户'}</h4>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户（必填）</label>
              <div className="relative">
                <input
                  value={bindCustomerKeyword}
                  onFocus={() => setBindCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setBindCustomerDropdownOpen(false), 120)}
                  onChange={(e) => {
                    setBindCustomerKeyword(e.target.value);
                    setBindCustomerId('');
                    setBindContactId('');
                    setBindContactKeyword('');
                    setBindContactOptions([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  placeholder="搜索客户名称"
                />
                {bindCustomerDropdownOpen && bindCustomerOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {bindCustomerOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setBindCustomerId(option.id);
                          setBindCustomerKeyword(option.name);
                          setBindContactId('');
                          setBindContactKeyword('');
                          setBindContactOptions([]);
                          setBindCustomerDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {bindMode === 'individual' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">联系人（可选）</label>
                <div className="relative">
                  <input
                    value={bindContactKeyword}
                    disabled={!bindCustomerId}
                    onFocus={() => setBindContactDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setBindContactDropdownOpen(false), 120)}
                    onChange={(e) => {
                      setBindContactKeyword(e.target.value);
                      setBindContactId('');
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    placeholder={bindCustomerId ? '搜索联系人名称' : '请先选择客户'}
                  />
                  {bindContactDropdownOpen && bindCustomerId && bindContactOptions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                      {bindContactOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setBindContactId(option.id);
                            setBindContactKeyword(option.name);
                            setBindContactDropdownOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBindModal(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
              <button onClick={saveBinding} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded">保存绑定</button>
            </div>
          </div>
        </div>
      )}

      {previewAttachment?.kind === 'image' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{previewAttachment.fileName || previewAttachment.title}</div>
                <div className="mt-1 truncate text-xs text-gray-500">{previewAttachment.url}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-xl bg-gray-100 p-3">
              <img src={previewAttachment.url} alt={previewAttachment.title} className="max-h-[70vh] max-w-full object-contain" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                新窗口打开
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
