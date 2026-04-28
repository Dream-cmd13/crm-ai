import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CheckSquare, Download, ExternalLink, FileText, Image as ImageIcon, MessageSquare, RefreshCw, Save, Search, Square, User, Users, X } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  createCustomerMessageSessionFromSupabase,
  fetchWechatSenderInboxesFromSupabase,
  fetchWechatSenderMessagesFromSupabase,
} from '../lib/customerMessageSessionRepository';
import type { WechatSenderInbox, WechatSenderMessage } from '../types';

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

export default function SystemWechatQuery() {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [senderInboxes, setSenderInboxes] = useState<WechatSenderInbox[]>([]);
  const [selectedSenderKey, setSelectedSenderKey] = useState('');
  const [senderMessages, setSenderMessages] = useState<WechatSenderMessage[]>([]);
  const [showOnlyUnarchived, setShowOnlyUnarchived] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [customerKeyword, setCustomerKeyword] = useState('');
  const [contactKeyword, setContactKeyword] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerLite[]>([]);
  const [contactOptions, setContactOptions] = useState<ContactLite[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedContactName, setSelectedContactName] = useState('');
  const [conversations, setConversations] = useState<WxConversationRow[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, CustomerLite>>({});
  const [memberCountByConversationId, setMemberCountByConversationId] = useState<Record<number, number>>({});
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [groupMessages, setGroupMessages] = useState<WxMessageRow[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentDescriptor | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoadingChats(true);
    const supabase = getSupabaseClient();
    try {
      const [inboxes, conversationResp] = await Promise.all([
        fetchWechatSenderInboxesFromSupabase(),
        supabase
          .from('crm_wx_conversation')
          .select('*')
          .eq('conversation_type', 'group')
          .order('last_message_at', { ascending: false, nullsFirst: false }),
      ]);
      if (conversationResp.error) throw conversationResp.error;

      setSenderInboxes(inboxes);
      setSelectedSenderKey((prev) => prev || inboxes[0]?.senderKey || '');
      const nextConversations = (conversationResp.data || []) as WxConversationRow[];
      setConversations(nextConversations);
      setSelectedConversationId((prev) => prev || (nextConversations[0] ? Number(nextConversations[0].id) : null));

      const customerIds = Array.from(new Set(nextConversations.map((item) => String(item.customer_id || '')).filter(Boolean)));
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

      if (nextConversations.length > 0) {
        const { data: memberRows } = await supabase
          .from('crm_wx_conversation_member')
          .select('conversation_id')
          .in('conversation_id', nextConversations.map((item) => Number(item.id)));
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
      toast.error('微信消息加载失败，请确认已执行最新 schema');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadSenderMessages = useCallback(async (senderKey: string, onlyUnarchived: boolean) => {
    if (!senderKey) {
      setSenderMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const data = await fetchWechatSenderMessagesFromSupabase(senderKey, { onlyUnarchived: onlyUnarchived });
      setSenderMessages(data);
    } catch (error) {
      console.error(error);
      setSenderMessages([]);
      toast.error('消息列表加载失败');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadGroupMessages = useCallback(async (conversationId: number) => {
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
      setGroupMessages((data || []) as WxMessageRow[]);
    } catch (error) {
      console.error(error);
      setGroupMessages([]);
      toast.error('群聊消息加载失败');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (activeTab === 'individual' && viewMode === 'detail' && selectedSenderKey) {
      loadSenderMessages(selectedSenderKey, showOnlyUnarchived);
    }
  }, [activeTab, viewMode, selectedSenderKey, showOnlyUnarchived, loadSenderMessages]);

  useEffect(() => {
    if (activeTab === 'group' && viewMode === 'detail' && selectedConversationId) {
      loadGroupMessages(selectedConversationId);
    }
  }, [activeTab, viewMode, selectedConversationId, loadGroupMessages]);

  useEffect(() => {
    if (!showCreateSessionModal || !isSupabaseConfigured()) return;
    const keyword = customerKeyword.trim();
    if (!keyword) {
      setCustomerOptions([]);
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
        setCustomerOptions([]);
        return;
      }
      setCustomerOptions(((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || ''),
      })).filter((row) => row.id && row.name));
    })();
    return () => {
      active = false;
    };
  }, [showCreateSessionModal, customerKeyword]);

  useEffect(() => {
    if (!showCreateSessionModal || !isSupabaseConfigured() || !selectedCustomerId) {
      setContactOptions([]);
      return;
    }
    let active = true;
    const supabase = getSupabaseClient();
    (async () => {
      let query = supabase.from('crm_customer_contact').select('id,name').eq('customer_id', selectedCustomerId).limit(8);
      if (contactKeyword.trim()) {
        query = query.ilike('name', `%${contactKeyword.trim()}%`);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        console.error(error);
        setContactOptions([]);
        return;
      }
      setContactOptions(((data || []) as any[]).map((row) => ({
        id: String(row.id),
        name: String(row.name || row.id || ''),
      })).filter((row) => row.id && row.name));
    })();
    return () => {
      active = false;
    };
  }, [showCreateSessionModal, selectedCustomerId, contactKeyword]);

  const filteredIndividuals = useMemo(
    () => senderInboxes.filter((item) =>
      [
        item.senderDisplayName,
        item.senderWechatId,
        item.lastMessagePreview,
      ].filter(Boolean).some((value) => String(value).includes(searchQuery))
    ),
    [senderInboxes, searchQuery]
  );

  const filteredGroups = useMemo(
    () => conversations.filter((item) =>
      [item.room_username, item.room_name, item.conversation_name, customersById[String(item.customer_id || '')]?.name]
        .filter(Boolean)
        .some((value) => String(value).includes(searchQuery))
    ),
    [conversations, customersById, searchQuery]
  );

  const selectedInbox = useMemo(
    () => senderInboxes.find((item) => item.senderKey === selectedSenderKey) || null,
    [senderInboxes, selectedSenderKey]
  );

  const selectedConversation = useMemo(
    () => conversations.find((item) => Number(item.id) === Number(selectedConversationId)) || null,
    [conversations, selectedConversationId]
  );

  const selectedConversationTitle = activeTab === 'group'
    ? selectedConversation?.room_name || selectedConversation?.conversation_name || selectedConversation?.room_username || '群聊会话'
    : selectedInbox?.senderDisplayName || selectedInbox?.senderWechatId || '消息列表';

  const selectedConversationSubtitle = activeTab === 'group'
    ? `群聊会话 · ${selectedConversation?.room_username || '-'}`
    : `发送人消息列表 · ${selectedInbox?.senderWechatId || selectedInbox?.senderDisplayName || '-'}`;

  const resetCreateSessionModal = () => {
    setShowCreateSessionModal(false);
    setSessionTitle('');
    setCustomerKeyword('');
    setContactKeyword('');
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setSelectedContactId('');
    setSelectedContactName('');
    setCustomerOptions([]);
    setContactOptions([]);
    setCustomerDropdownOpen(false);
    setContactDropdownOpen(false);
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((prev) => prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]);
  };

  const handleOpenSenderInbox = async (senderKey: string) => {
    setSelectedSenderKey(senderKey);
    setSelectedMessageIds([]);
    setViewMode('detail');
    await loadSenderMessages(senderKey, showOnlyUnarchived);
  };

  const handleOpenGroup = async (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setViewMode('detail');
    await loadGroupMessages(conversationId);
  };

  const handleCreateCustomerSession = async () => {
    if (!selectedInbox) {
      toast.error('缺少发送人消息列表');
      return;
    }
    if (!selectedCustomerId) {
      toast.error('请选择客户');
      return;
    }
    if (selectedMessageIds.length === 0) {
      toast.error('请至少选择一条消息');
      return;
    }
    try {
      await createCustomerMessageSessionFromSupabase({
        customerId: selectedCustomerId,
        contactId: selectedContactId || undefined,
        senderKey: selectedInbox.senderKey,
        senderWechatId: selectedInbox.senderWechatId,
        senderDisplayName: selectedInbox.senderDisplayName,
        title: sessionTitle,
        messageIds: selectedMessageIds,
      });
      toast.success('客户会话创建成功');
      resetCreateSessionModal();
      setSelectedMessageIds([]);
      await fetchChats();
      await loadSenderMessages(selectedInbox.senderKey, showOnlyUnarchived);
    } catch (error) {
      console.error(error);
      toast.error((error as Error)?.message || '创建客户会话失败');
    }
  };

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
              <p className="text-sm text-gray-500 mt-1">个人页按“我的微信”聚合为消息列表；可从消息中创建客户会话。群聊保持现状浏览。</p>
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
            <button
              onClick={fetchChats}
              disabled={loadingChats}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 text-gray-700 rounded bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingChats ? 'animate-spin' : ''}`} />
              刷新
            </button>
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
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await fetchChats();
                  if (activeTab === 'individual' && selectedSenderKey) {
                    await loadSenderMessages(selectedSenderKey, showOnlyUnarchived);
                  }
                  if (activeTab === 'group' && selectedConversationId) {
                    await loadGroupMessages(selectedConversationId);
                  }
                }}
                disabled={loadingChats || loadingMessages}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-200 text-gray-700 rounded bg-white hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${(loadingChats || loadingMessages) ? 'animate-spin' : ''}`} />
                刷新
              </button>
              {activeTab === 'individual' && (
                <button
                  onClick={() => {
                    if (selectedMessageIds.length === 0) {
                      toast.error('请先单选或多选消息');
                      return;
                    }
                    setSessionTitle(selectedInbox ? `${selectedInbox.senderDisplayName || selectedInbox.senderWechatId || selectedInbox.senderKey} 会话` : '');
                    setShowCreateSessionModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
                >
                  <Save className="w-3.5 h-3.5" />
                  创建客户会话
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{activeTab === 'group' ? '会话类型' : '聚合维度'}</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">{activeTab === 'group' ? '群聊会话' : '我的微信'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{activeTab === 'group' ? '匹配客户' : '发送人标识'}</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {activeTab === 'group'
                  ? customersById[String(selectedConversation?.customer_id || '')]?.name || '未绑定'
                  : selectedInbox?.senderWechatId || selectedInbox?.senderDisplayName || '-'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{activeTab === 'group' ? '消息数' : '已归档 / 总消息'}</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">
                {activeTab === 'group'
                  ? selectedConversation?.message_count || groupMessages.length || 0
                  : `${selectedInbox?.archivedMessageCount || 0} / ${selectedInbox?.messageCount || 0}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === 'group' ? (
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
                  <div className="text-sm text-gray-900">{selectedInbox?.senderDisplayName || '-'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="text-xs text-gray-500">仅看未归档</div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                    <input
                      type="checkbox"
                      checked={showOnlyUnarchived}
                      onChange={(e) => {
                        setShowOnlyUnarchived(e.target.checked);
                        setSelectedMessageIds([]);
                      }}
                    />
                    已开启时只显示还未创建客户会话的消息
                  </label>
                </div>
              </>
            )}
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
                    <th className="p-4 text-sm font-medium text-gray-500">消息数</th>
                    <th className="p-4 text-sm font-medium text-gray-500">最近消息</th>
                    <th className="p-4 text-sm font-medium text-gray-500">已归档数</th>
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
                    return (
                      <tr key={chat.senderKey} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-900">{chat.senderDisplayName || chat.senderWechatId || '-'}</td>
                        <td className="p-4 text-sm text-gray-900">{chat.messageCount}</td>
                        <td className="p-4 text-sm text-gray-600 max-w-[360px] truncate">{chat.lastMessagePreview || '-'}</td>
                        <td className="p-4 text-sm text-gray-900">{chat.archivedMessageCount}</td>
                        <td className="p-4">
                          <button onClick={() => handleOpenSenderInbox(chat.senderKey)} className="text-xs px-2 py-1 border border-blue-200 text-blue-700 rounded bg-white hover:bg-blue-50">
                            进入消息列表
                          </button>
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
                        <button onClick={() => handleOpenGroup(Number(group.id))} className="text-xs px-2 py-1 border border-blue-200 text-blue-700 rounded bg-white hover:bg-blue-50">
                          进入会话
                        </button>
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
            {activeTab === 'group'
              ? '按时间顺序展示群聊消息。'
              : '按时间顺序展示该“我的微信”下的全部个人消息；可单选或多选创建客户会话。'}
          </div>
          {activeTab === 'individual' && senderMessages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-600">已选 {selectedMessageIds.length} 条消息</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedMessageIds.length === senderMessages.length) {
                      setSelectedMessageIds([]);
                    } else {
                      setSelectedMessageIds(senderMessages.filter((item) => !item.archivedSessionId).map((item) => item.id));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {selectedMessageIds.length === senderMessages.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  全选未归档
                </button>
                <button
                  onClick={() => {
                    if (selectedMessageIds.length === 0) {
                      toast.error('请先选择消息');
                      return;
                    }
                    setSessionTitle(selectedInbox ? `${selectedInbox.senderDisplayName || selectedInbox.senderWechatId || selectedInbox.senderKey} 会话` : '');
                    setShowCreateSessionModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
                >
                  <Save className="h-3.5 w-3.5" />
                  创建客户会话
                </button>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {loadingMessages ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">加载消息中...</div>
            ) : activeTab === 'individual' ? (
              senderMessages.length > 0 ? senderMessages.map((message) => {
                const messageAttachment = buildAttachmentDescriptor({
                  msgType: message.msgType,
                  content: message.content,
                  remoteMediaUrl: message.remoteMediaUrl
                });
                const quoteAttachment = buildAttachmentDescriptor({
                  msgType: message.quoteMsgType,
                  content: message.quoteContent,
                  remoteMediaUrl: message.quoteRemoteMediaUrl,
                  fileName: message.quoteFileName
                });
                const quoteText = normalizeText(message.quoteContent);
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
                const shouldShowTextContent = !messageAttachment || !normalizeRemoteUrl(message.remoteMediaUrl);
                const isSelected = selectedMessageIds.includes(message.id);
                const isArchived = Boolean(message.archivedSessionId);

                return (
                  <div key={message.id} className={`rounded-2xl border p-4 bg-white ${isSelected ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={isArchived}
                          onClick={() => toggleMessageSelection(message.id)}
                          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border ${isArchived ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300' : isSelected ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white text-transparent'}`}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-gray-900">
                              {message.senderDisplayName || message.peerDisplayName || message.senderWechatId || '未知发送人'}
                            </div>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                              {translateOriginType(message.messageOriginType || 'unknown')}
                            </span>
                            {isArchived && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700">
                                已归档到：{message.archivedSessionTitle || message.archivedSessionId}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 whitespace-nowrap">{formatTime(message.sendTime)}</div>
                        </div>
                      </div>
                    </div>

                    {quoteDescriptor ? (
                      <div className="mt-3 rounded-xl border-l-4 border-gray-300 bg-gray-50 p-3">
                        <div className="text-xs font-medium text-gray-500">被引用消息</div>
                        {quoteDescriptor.kind === 'text' ? (
                          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{quoteDescriptor.text}</div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            <MediaAttachmentCard attachment={quoteDescriptor.attachment} compact onPreviewImage={setPreviewAttachment} />
                            {normalizeRemoteUrl(quoteDescriptor.attachment.url) && quoteDescriptor.text && quoteDescriptor.attachment.kind !== 'image' ? (
                              <div className="whitespace-pre-wrap break-words text-xs leading-5 text-gray-500">{quoteDescriptor.text}</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {messageAttachment ? (
                      <div className="mt-3">
                        <MediaAttachmentCard attachment={messageAttachment} onPreviewImage={setPreviewAttachment} />
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
              }) : (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">当前发送人暂无消息记录。</div>
              )
            ) : groupMessages.length > 0 ? (
              groupMessages.map((message) => {
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

      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4">
            <h4 className="text-base font-bold text-gray-900">创建客户会话</h4>
            <div>
              <label className="block text-xs text-gray-600 mb-1">会话标题（可编辑）</label>
              <input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                placeholder="输入客户会话标题"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户（必填）</label>
              <div className="relative">
                <input
                  value={customerKeyword}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 120)}
                  onChange={(e) => {
                    setCustomerKeyword(e.target.value);
                    setSelectedCustomerId('');
                    setSelectedCustomerName('');
                    setSelectedContactId('');
                    setSelectedContactName('');
                    setContactKeyword('');
                    setContactOptions([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  placeholder="搜索客户名称"
                />
                {customerDropdownOpen && customerOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {customerOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(option.id);
                          setSelectedCustomerName(option.name);
                          setCustomerKeyword(option.name);
                          setSelectedContactId('');
                          setSelectedContactName('');
                          setContactKeyword('');
                          setContactOptions([]);
                          setCustomerDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomerName && <div className="mt-1 text-xs text-gray-500">已选择：{selectedCustomerName}</div>}
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">联系人（可选）</label>
              <div className="relative">
                <input
                  value={contactKeyword}
                  disabled={!selectedCustomerId}
                  onFocus={() => setContactDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setContactDropdownOpen(false), 120)}
                  onChange={(e) => {
                    setContactKeyword(e.target.value);
                    setSelectedContactId('');
                    setSelectedContactName('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder={selectedCustomerId ? '搜索联系人名称' : '请先选择客户'}
                />
                {contactDropdownOpen && selectedCustomerId && contactOptions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {contactOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedContactId(option.id);
                          setSelectedContactName(option.name);
                          setContactKeyword(option.name);
                          setContactDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedContactName && <div className="mt-1 text-xs text-gray-500">已选择：{selectedContactName}</div>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetCreateSessionModal} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
              <button onClick={handleCreateCustomerSession} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded">创建会话</button>
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
