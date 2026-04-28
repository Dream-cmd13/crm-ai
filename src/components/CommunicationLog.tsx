import React, { useMemo, useState } from 'react';
import { MessageSquare, Send, Mic, Plus, Sparkles, Loader2 } from 'lucide-react';
import { CommunicationDetail, CustomerMessageSession } from '../types';
import { cn } from '../lib/utils';
import AddSessionRecordModal from './AddSessionRecordModal';
import { callAiProxy } from '../lib/aiProxy';
import { fetchCustomerFaqLibraryConfig, type CustomerFaqSubCategory } from '../lib/customerFaqLibraryRepository';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { fetchChatAssistConfigFromSupabase, defaultChatAssistConfig } from '../lib/chatAssistConfigRepository';
import { fetchCasesFromSupabase } from '../lib/caseRepository';
import { fetchProductSeriesFromSupabase } from '../lib/productRepository';
import { fetchCustomerMessageSessionMessagesFromSupabase, fetchCustomerMessageSessionsFromSupabase } from '../lib/customerMessageSessionRepository';
import { toast } from 'react-hot-toast';

interface CommunicationLogProps {
  communications: CommunicationDetail[];
  onAddCommunication: (comm: Partial<CommunicationDetail>) => void;
  title?: string;
  contacts?: { id: string; name: string; position?: string; department?: string; wechatId?: string }[];
  employees?: { id: string; name: string; role?: string }[];
  groupChats?: any[];
  wechatChats?: any[];
  onManageMembers?: (chat: any) => void;
  isSyncingChats?: boolean;
  onSyncChats?: () => void;
  onAddGroupChat?: () => void;
  onAddWechatChat?: () => void;
  initialActiveTab?: string;
  initialSelectedChat?: any;
  customerId?: string;
  customerName?: string;
  aiContactProfiles?: Array<{
    id?: string;
    name?: string;
    position?: string;
    roleTag?: string;
    attitudeScore?: number;
    influenceLevel?: number;
    relationLevel?: number;
    keyConcerns?: string;
    preferences?: string;
  }>;
}

export default function CommunicationLog({ 
  communications, 
  onAddCommunication, 
  title = "沟通详情",
  contacts = [],
  employees = [],
  groupChats = [],
  wechatChats = [],
  onManageMembers,
  isSyncingChats,
  onSyncChats,
  onAddGroupChat,
  onAddWechatChat,
  initialActiveTab,
  initialSelectedChat,
  customerId = '',
  customerName = '',
  aiContactProfiles = []
}: CommunicationLogProps) {
  const [newContent, setNewContent] = useState('');
  const [sender, setSender] = useState('');
  const [newCommType, setNewCommType] = useState<CommunicationDetail['type']>('wechat');
  const [activeTab, setActiveTab] = useState<'wechat' | 'wechat_group' | 'email' | 'meeting' | 'phone'>(
    initialActiveTab && initialActiveTab !== 'all' && ['wechat', 'wechat_group', 'email', 'meeting', 'phone'].includes(initialActiveTab)
      ? (initialActiveTab as 'wechat' | 'wechat_group' | 'email' | 'meeting' | 'phone')
      : 'wechat'
  );
  const [selectedWechatSessionId, setSelectedWechatSessionId] = useState<string>(String((initialSelectedChat as any)?.id || ''));
  const [selectedGroupChatId, setSelectedGroupChatId] = useState<string>(String((initialSelectedChat as any)?.id || groupChats[0]?.id || ''));

  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [systemWechatSessions, setSystemWechatSessions] = useState<any[]>([]);
  const [systemWechatGroups, setSystemWechatGroups] = useState<any[]>([]);
  const [customerSessions, setCustomerSessions] = useState<CustomerMessageSession[]>([]);
  const [selectedCustomerSessionId, setSelectedCustomerSessionId] = useState('');
  const [selectedCustomerSessionMessages, setSelectedCustomerSessionMessages] = useState<CommunicationDetail[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [matchedFaqs, setMatchedFaqs] = useState<Array<CustomerFaqSubCategory & { score: number; category: string }>>([]);
  const [focusArchiveSummary, setFocusArchiveSummary] = useState('');
  const [chatAssistConfig, setChatAssistConfig] = useState(defaultChatAssistConfig);
  const [selectedFlowIdForRun, setSelectedFlowIdForRun] = useState('');
  const [selectedNodeIdsForRun, setSelectedNodeIdsForRun] = useState<string[]>([]);
  const activeChatFlow = useMemo(() => {
    const flows = chatAssistConfig.flows || [];
    if (flows.length === 0) return undefined;
    return flows.find((f) => f.id === chatAssistConfig.defaultFlowId && f.enabled !== false)
      || flows.find((f) => f.isDefault && f.enabled !== false)
      || flows.find((f) => f.enabled !== false)
      || flows[0];
  }, [chatAssistConfig]);
  const runnableFlows = useMemo(
    () => (chatAssistConfig.flows || []).filter((f) => f.enabled !== false),
    [chatAssistConfig]
  );
  const currentRunFlow = useMemo(() => {
    if (selectedFlowIdForRun) {
      return runnableFlows.find((f) => f.id === selectedFlowIdForRun) || activeChatFlow;
    }
    return activeChatFlow || runnableFlows[0];
  }, [selectedFlowIdForRun, runnableFlows, activeChatFlow]);
  React.useEffect(() => { if (employees.length && !sender) setSender(employees[0].name); }, [employees]);
  React.useEffect(() => {
    fetchChatAssistConfigFromSupabase()
      .then((cfg) => {
        setChatAssistConfig(cfg);
        const enabledFlows = (cfg.flows || []).filter((f) => f.enabled !== false);
        const preferredFlow = enabledFlows.find((f) => f.id === cfg.defaultFlowId) || enabledFlows[0];
        setSelectedFlowIdForRun(preferredFlow?.id || '');
        setSelectedNodeIdsForRun((preferredFlow?.nodes || []).filter((n: any) => n.enabled !== false).map((n: any) => String(n.id)));
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);
  React.useEffect(() => {
    if (!customerId) {
      setCustomerSessions([]);
      setSelectedCustomerSessionId('');
      setSelectedCustomerSessionMessages([]);
      return;
    }
    fetchCustomerMessageSessionsFromSupabase(customerId)
      .then((sessions) => {
        setCustomerSessions(sessions);
        setSelectedCustomerSessionId((prev) => prev || sessions[0]?.id || '');
      })
      .catch((error) => {
        console.error(error);
        setCustomerSessions([]);
      });
  }, [customerId, communications.length]);
  React.useEffect(() => {
    if (!selectedCustomerSessionId) {
      setSelectedCustomerSessionMessages([]);
      return;
    }
    fetchCustomerMessageSessionMessagesFromSupabase(selectedCustomerSessionId)
      .then(setSelectedCustomerSessionMessages)
      .catch((error) => {
        console.error(error);
        setSelectedCustomerSessionMessages([]);
      });
  }, [selectedCustomerSessionId]);
  const loadSystemWechatSessions = React.useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const wechatIds = (contacts || []).map((c) => String(c.wechatId || '').trim()).filter(Boolean);
    try {
      const supabase = getSupabaseClient();
      let sessionQuery = supabase.from('crm_wx_conversation').select('*').eq('conversation_type', 'private');
      if (customerId) {
        sessionQuery = sessionQuery.eq('customer_id', customerId);
      } else if (wechatIds.length > 0) {
        sessionQuery = sessionQuery.in('peer_wechat_id', wechatIds as any);
      }
      const { data: sessions } = await sessionQuery.order('last_message_at', { ascending: false, nullsFirst: false });
      let groupQuery = supabase.from('crm_wx_conversation').select('*').eq('conversation_type', 'group');
      if (customerId) {
        groupQuery = groupQuery.eq('customer_id', customerId);
      }
      const { data: groups } = await groupQuery.order('last_message_at', { ascending: false, nullsFirst: false });
      setSystemWechatSessions(sessions || []);
      setSystemWechatGroups(groups || []);
    } catch (error) {
      console.error(error);
    }
  }, [customerId, contacts]);
  React.useEffect(() => {
    loadSystemWechatSessions();
  }, [loadSystemWechatSessions]);
  const tabItems: Array<{ id: 'wechat' | 'wechat_group' | 'email' | 'meeting' | 'phone'; label: string }> = [
    { id: 'wechat', label: '微信' },
    { id: 'wechat_group', label: '微信群聊' },
    { id: 'email', label: '邮件' },
    { id: 'meeting', label: '会议' },
    { id: 'phone', label: '聊天' }
  ];
  const derivedWechatSessions = useMemo(() => {
    const sourceSessions = systemWechatSessions.length > 0 ? systemWechatSessions : wechatChats;
    if (sourceSessions.length > 0) {
      return sourceSessions.map((session: any) => {
        const matchKeys = new Set([
          String(session.id || ''),
          String(session.peer_wechat_id || ''),
          String(session.my_wechat_id || ''),
          String(session.peer_wechat_name || ''),
          String(session.conversation_name || '')
        ].filter(Boolean));
        const messages = communications
          .filter((c) => c.type === 'wechat')
          .filter((c) => {
            const sourceId = String(c.sourceId || '');
            const sourceGroup = String(c.sourceGroup || '');
            const sender = String(c.sender || '');
            return matchKeys.has(sourceId) || matchKeys.has(sourceGroup) || matchKeys.has(sender);
          });
        return {
          ...session,
          id: String(session.id || `wechat_${session.peer_wechat_id || session.my_wechat_id || Math.random()}`),
          name: session.peer_wechat_name || session.conversation_name || session.peer_wechat_id || session.my_wechat_name || session.my_wechat_id || '未命名会话',
          messages,
          lastMessage: messages[messages.length - 1]?.content || session.last_message_preview || '',
          lastTime: messages[messages.length - 1]?.date || session.last_message_at || ''
        };
      });
    }
    const list = communications.filter((c) => c.type === 'wechat');
    const map = new Map<string, any>();
    list.forEach((item) => {
      const key = item.sourceGroup || item.sender || '默认会话';
      if (!map.has(key)) {
        map.set(key, { id: `wechat_${key}`, name: key, messages: [] as any[] });
      }
      map.get(key).messages.push(item);
    });
    return Array.from(map.values()).map((s) => ({
      ...s,
      lastMessage: s.messages[s.messages.length - 1]?.content || '',
      lastTime: s.messages[s.messages.length - 1]?.date || ''
    }));
  }, [systemWechatSessions, wechatChats, communications]);

  React.useEffect(() => {
    if (!selectedWechatSessionId && derivedWechatSessions.length > 0) {
      setSelectedWechatSessionId(String(derivedWechatSessions[0].id));
    }
  }, [selectedWechatSessionId, derivedWechatSessions]);

  React.useEffect(() => {
    if (activeTab === 'wechat') setNewCommType('wechat');
    if (activeTab === 'wechat_group') setNewCommType('wechat_group');
    if (activeTab === 'email') setNewCommType('email');
    if (activeTab === 'meeting') setNewCommType('meeting');
    if (activeTab === 'phone') setNewCommType('phone');
  }, [activeTab]);
  const filteredCommunications = communications.filter((comm) => {
    if (activeTab === 'wechat') return comm.type === 'wechat' || (comm as any).type === 'wechat_group';
    if (activeTab === 'wechat_group') return comm.type === 'wechat_group';
    if (activeTab === 'email') return comm.type === 'email';
    if (activeTab === 'meeting') return comm.type === 'meeting';
    if (activeTab === 'phone') return comm.type === 'phone' || comm.type === 'voice' || comm.type === 'screenshot';
    return true;
  });

  const handleSaveSession = (data: any) => {
    const activeSessionSourceId = activeTab === 'wechat'
      ? String(selectedWechatSession?.id || '')
      : activeTab === 'wechat_group'
        ? String(selectedGroupChat?.id || '')
        : '';
    const activeSessionSourceGroup = activeTab === 'wechat'
      ? (selectedWechatSession?.name || selectedWechatSession?.peer_wechat_name || selectedWechatSession?.peer_wechat_id || '')
      : activeTab === 'wechat_group'
        ? (selectedGroupChat?.room_remark_name || selectedGroupChat?.room_name || selectedGroupChat?.groupName || selectedGroupChat?.name || '')
        : '';
    onAddCommunication({
      content: data.content,
      type: data.type,
      sender: sender || '销售',
      date: new Date(data.date).toLocaleString(),
      sourceId: activeSessionSourceId || undefined,
      sourceGroup: activeSessionSourceGroup || data.location
    });
    setShowAddSessionModal(false);
  };
  const selectedWechatSession = derivedWechatSessions.find((c: any) => String(c.id) === String(selectedWechatSessionId));
  const derivedGroupChats = useMemo(() => {
    const sourceGroups = systemWechatGroups.length > 0 ? systemWechatGroups : (groupChats || []);
    if (sourceGroups.length > 0) {
      return sourceGroups.map((group: any) => {
        const matchKeys = new Set([
          String(group.id || ''),
          String(group.room_username || ''),
          String(group.room_name || ''),
          String(group.room_remark_name || ''),
          String(group.conversation_name || '')
        ].filter(Boolean));
        const messages = communications
          .filter((c) => c.type === 'wechat_group')
          .filter((c) => {
            const sourceId = String(c.sourceId || '');
            const sourceGroup = String(c.sourceGroup || '');
            return matchKeys.has(sourceId) || matchKeys.has(sourceGroup);
          });
        return {
          ...group,
          id: String(group.id || `wg_${group.room_username || group.room_name || Math.random()}`),
          name: group.room_remark_name || group.room_name || group.conversation_name || group.name || '未命名群聊',
          groupName: group.room_name || group.groupName || group.name || '',
          messages,
          lastMessage: messages[messages.length - 1]?.content || group.last_message_preview || '',
          lastTime: messages[messages.length - 1]?.date || group.last_message_at || '',
          members: group.members || []
        };
      });
    }
    const list = communications.filter((c) => c.type === 'wechat_group');
    const map = new Map<string, any>();
    list.forEach((item) => {
      const key = String(item.sourceGroup || '默认群聊');
      if (!map.has(key)) {
        map.set(key, { id: `wg_${key}`, name: key, groupName: key, messages: [] as any[] });
      }
      map.get(key).messages.push(item);
    });
    return Array.from(map.values()).map((s: any) => ({
      ...s,
      lastMessage: s.messages[s.messages.length - 1]?.content || '',
      lastTime: s.messages[s.messages.length - 1]?.date || '',
      members: s.members || []
    }));
  }, [systemWechatGroups, groupChats, communications]);
  React.useEffect(() => {
    if (!selectedGroupChatId && derivedGroupChats.length > 0) {
      setSelectedGroupChatId(String(derivedGroupChats[0].id));
    }
  }, [selectedGroupChatId, derivedGroupChats]);
  const selectedGroupChat = derivedGroupChats.find((c: any) => String(c.id) === String(selectedGroupChatId));
  const sessionMessages = activeTab === 'wechat'
    ? (selectedWechatSession?.messages || [])
    : activeTab === 'wechat_group'
      ? (selectedGroupChat?.messages || filteredCommunications.filter((x) => x.type === 'wechat_group'))
      : filteredCommunications;
  const getMessageKey = (comm: any, idx: number) => String(comm?.id || `${comm?.date || ''}_${comm?.sender || ''}_${idx}`);

  React.useEffect(() => {
    const validIds = new Set(sessionMessages.map((comm: any, idx: number) => getMessageKey(comm, idx)));
    setSelectedMessageIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [activeTab, selectedWechatSessionId, selectedGroupChatId, sessionMessages.length]);

  React.useEffect(() => {
    if (!currentRunFlow) {
      setSelectedNodeIdsForRun([]);
      return;
    }
    const enabledIds = (currentRunFlow.nodes || []).filter((n: any) => n.enabled !== false).map((n: any) => String(n.id));
    setSelectedNodeIdsForRun((prev) => {
      const kept = prev.filter((id) => enabledIds.includes(id));
      return kept.length > 0 ? kept : enabledIds;
    });
  }, [currentRunFlow?.id]);

  React.useEffect(() => {
    const loadFocusAndCompetitor = async () => {
      if (!customerId || !isSupabaseConfigured()) {
        setFocusArchiveSummary('');
        return;
      }
      try {
        const supabase = getSupabaseClient();
        const { data: focusRows } = await supabase
          .from('crm_customer_focus_swot')
          .select('id, customer_focus, key_contact, focus_level, our_strengths, our_weaknesses, ai_script')
          .eq('customer_id', customerId)
          .order('sort_order', { ascending: true });
        const focusIds = (focusRows || []).map((row: any) => row.id).filter(Boolean);
        let competitorRows: any[] = [];
        if (focusIds.length > 0) {
          const { data } = await supabase
            .from('crm_customer_focus_competitor')
            .select('focus_id, competitor_name, strengths, weaknesses')
            .in('focus_id', focusIds);
          competitorRows = data || [];
        }
        const byFocusId = new Map<string, any[]>();
        competitorRows.forEach((row: any) => {
          const key = String(row.focus_id || '');
          if (!byFocusId.has(key)) byFocusId.set(key, []);
          byFocusId.get(key)!.push(row);
        });
        const summary = (focusRows || []).map((focus: any, idx: number) => {
          const comps = byFocusId.get(String(focus.id || '')) || [];
          const compText = comps.length > 0
            ? comps.map((c: any) => `竞品:${c.competitor_name || '-'} 优势:${Array.isArray(c.strengths) ? c.strengths.join('、') : '-'} 劣势:${Array.isArray(c.weaknesses) ? c.weaknesses.join('、') : '-'}`).join('\n')
            : '暂无竞品对比';
          return [
            `${idx + 1}. 关注点：${focus.customer_focus || '-'}`,
            `关键联系人：${focus.key_contact || '-'}`,
            `关注等级：${focus.focus_level ?? '-'}`,
            `我方优势：${Array.isArray(focus.our_strengths) ? focus.our_strengths.join('、') : '-'}`,
            `我方短板：${Array.isArray(focus.our_weaknesses) ? focus.our_weaknesses.join('、') : '-'}`,
            `建议话术：${focus.ai_script || '-'}`,
            compText
          ].join('\n');
        }).join('\n\n');
        setFocusArchiveSummary(summary);
      } catch (error) {
        console.error(error);
        setFocusArchiveSummary('');
      }
    };
    loadFocusAndCompetitor();
  }, [customerId]);

  const extractKeywords = (text: string): string[] =>
    Array.from(new Set((text.toLowerCase().match(/[\u4e00-\u9fa5a-z0-9]{2,}/g) || []).slice(0, 40)));

  const detectIntent = (conversationText: string) => {
    const tokens = extractKeywords(conversationText);
    const intents = (chatAssistConfig.intentCategories || []).map((item) => {
      let score = 0;
      tokens.forEach((token) => {
        if ((item.keywords || []).some((k) => String(k).toLowerCase().includes(token) || token.includes(String(k).toLowerCase()))) {
          score += token.length >= 4 ? 2 : 1;
        }
      });
      return { ...item, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    return intents.slice(0, 2);
  };

  const buildFaqMatches = async (conversationText: string, topN: number, minScore: number) => {
    const cfg = await fetchCustomerFaqLibraryConfig();
    const tokens = extractKeywords(conversationText);
    const matched: Array<CustomerFaqSubCategory & { score: number; category: string }> = [];
    (cfg.categories || []).forEach((category) => {
      (category.subCategories || []).forEach((sub) => {
        const corpus = `${sub.name} ${sub.question} ${sub.answer}`.toLowerCase();
        let score = 0;
        tokens.forEach((token) => {
          if (corpus.includes(token)) score += token.length >= 4 ? 2 : 1;
        });
        if (score >= minScore) {
          matched.push({ ...sub, score, category: category.name });
        }
      });
    });
    matched.sort((a, b) => b.score - a.score);
    return matched.slice(0, Math.max(1, topN));
  };

  const buildBusinessContext = async (conversationText: string, sourceSet: Set<string>) => {
    if (!isSupabaseConfigured() || !customerId) {
      return {
        customerProfile: '暂无客户主数据',
        demandSummary: '暂无客户需求摘要',
        caseSummary: '暂无客户案例',
        seriesSummary: '暂无产品系列FAB'
      };
    }
    const keywords = extractKeywords(conversationText);
    const contains = (text: string, token: string) => text.toLowerCase().includes(token.toLowerCase());
    const supabase = getSupabaseClient();
    let customerProfile = '暂无客户主数据';
    let demandSummary = '暂无客户需求摘要';
    let caseSummary = '暂无客户案例';
    let seriesSummary = '暂无产品系列FAB';
    try {
      const { data: customer } = await supabase
        .from('ba_manucustinfo')
        .select('name, level, industry, region, customer_type, business_scope, last_contact_action')
        .eq('id', customerId)
        .maybeSingle();
      if (customer) {
        customerProfile = [
          `客户名称:${customer.name || '-'}`,
          `客户等级:${customer.level || '-'}`,
          `行业:${customer.industry || '-'}`,
          `地区:${customer.region || '-'}`,
          `客户类型:${customer.customer_type || '-'}`,
          `业务范围:${customer.business_scope || '-'}`,
          `最近动作:${customer.last_contact_action || '-'}`
        ].join('\n');
      }
      if (sourceSet.has('customer_demand')) {
        const { data: opps } = await supabase
          .from('crm_opportunity')
          .select('opp_summary, application_scenario, product_line, product_industry, estimated_usage, updated_at')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })
          .limit(5);
        const { data: projects } = await supabase
          .from('crm_project')
          .select('project_name, application_scenario, product_line, product_industry, estimated_usage, requirements, updated_at')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })
          .limit(5);
        const demandRows: string[] = [];
        (opps || []).forEach((x: any) => {
          demandRows.push(`商机: ${x.opp_summary || '-'} | 场景:${x.application_scenario || '-'} | 线别:${x.product_line || '-'} | 行业:${x.product_industry || '-'} | 需求量:${x.estimated_usage || '-'}`);
        });
        (projects || []).forEach((x: any) => {
          const req = Array.isArray(x.requirements) ? x.requirements.join('、') : (typeof x.requirements === 'string' ? x.requirements : '');
          demandRows.push(`项目: ${x.project_name || '-'} | 场景:${x.application_scenario || '-'} | 线别:${x.product_line || '-'} | 行业:${x.product_industry || '-'} | 需求:${req || x.estimated_usage || '-'}`);
        });
        if (demandRows.length > 0) demandSummary = demandRows.slice(0, 6).join('\n');
      }
    } catch (error) {
      console.error(error);
    }

    try {
      if (sourceSet.has('customer_cases')) {
        const allCases = await fetchCasesFromSupabase();
        const caseCandidates = allCases.filter((c: any) => {
          const corpus = `${c.title || ''} ${c.industry || ''} ${(c.painPoints || []).join(' ')} ${c.solution || ''} ${c.valueStatement || ''}`.toLowerCase();
          return keywords.some((k) => contains(corpus, k));
        });
        const picked = (caseCandidates.length > 0 ? caseCandidates : allCases).slice(0, Math.max(1, chatAssistConfig.retrieval.caseTopN || 2));
        if (picked.length > 0) {
          caseSummary = picked.map((x: any, idx: number) => `${idx + 1}. ${x.title || '-'} | 行业:${x.industry || '-'} | 痛点:${(x.painPoints || []).join('、') || '-'} | 方案:${x.solution || '-'}`).join('\n');
        }
      }
    } catch (error) {
      console.error(error);
    }

    try {
      if (sourceSet.has('product_fab')) {
        const allSeries = await fetchProductSeriesFromSupabase();
        const seriesCandidates = allSeries.filter((s: any) => {
          const corpus = `${s.name || ''} ${s.description || ''} ${s.fab?.features || ''} ${s.fab?.advantages || ''} ${s.fab?.benefits || ''}`.toLowerCase();
          return keywords.some((k) => contains(corpus, k));
        });
        const picked = (seriesCandidates.length > 0 ? seriesCandidates : allSeries).slice(0, Math.max(1, chatAssistConfig.retrieval.seriesTopN || 2));
        if (picked.length > 0) {
          seriesSummary = picked.map((s: any, idx: number) => `${idx + 1}. ${s.name || '-'} | 说明:${s.description || '-'} | FAB: F=${s.fab?.features || '-'}; A=${s.fab?.advantages || '-'}; B=${s.fab?.benefits || '-'}`).join('\n');
        }
      }
    } catch (error) {
      console.error(error);
    }

    return { customerProfile, demandSummary, caseSummary, seriesSummary };
  };

  const generateAiReplySuggestion = async () => {
    const selectedMessages = sessionMessages.filter((comm: any, idx: number) => selectedMessageIds.includes(getMessageKey(comm, idx)));
    if (selectedMessages.length === 0) {
      toast.error('请先勾选要用于AI分析的聊天记录');
      return;
    }
    const workingMessages = selectedMessages;
    setAiLoading(true);
    try {
      const flowToRun = currentRunFlow;
      const flowNodes = ((flowToRun?.nodes || chatAssistConfig.flowNodes || []) as any[]).filter((n) => n.enabled !== false);
      const enabledFlowNodes = flowNodes.filter((n: any) => selectedNodeIdsForRun.length === 0 || selectedNodeIdsForRun.includes(String(n.id)));
      if (enabledFlowNodes.length === 0) {
        toast.error('请至少选择一个分析节点');
        setAiLoading(false);
        return;
      }
      const nodeContextKeys = new Set<string>();
      enabledFlowNodes.forEach((n: any) => (n.contextSources || []).forEach((k: string) => nodeContextKeys.add(String(k))));
      const enabledDataSources = new Set<string>();
      const contextKeyToSources: Record<string, string[]> = {
        customer_name: ['customer_profile'],
        customer_profile: ['customer_profile'],
        contact_persona: ['persona'],
        customer_focus_archive: ['focus_competitor'],
        competitor_profile: ['focus_competitor'],
        wechat_records: ['chat_context'],
        wechat_group_records: ['chat_context'],
        meeting_records: ['chat_context'],
        email_records: ['chat_context'],
        chat_records: ['chat_context']
      };
      enabledFlowNodes.forEach((n) => {
        (n.dataSources || []).forEach((s: string) => enabledDataSources.add(String(s)));
        (n.contextSources || []).forEach((k: string) => (contextKeyToSources[k] || []).forEach((s) => enabledDataSources.add(s)));
      });
      const sourceEnabled = (key: string) => enabledDataSources.size === 0 || enabledDataSources.has(key);
      const contextEnabled = (key: string) => nodeContextKeys.size === 0 || nodeContextKeys.has(key);
      const chatContext = workingMessages
        .map((m: any) => `[${m.date || m.time || ''}] ${m.sender || '未知'}: ${m.content || ''}`)
        .join('\n');
      const configUseFaq = chatAssistConfig.useFaqAnswer && sourceEnabled('faq');
      const configUsePersona = chatAssistConfig.usePersonaAnswer && sourceEnabled('persona');
      const configUseFocusCompetitor = chatAssistConfig.useFocusCompetitorAnswer && sourceEnabled('focus_competitor');
      const intents = sourceEnabled('intent') ? detectIntent(chatContext) : [];
      const faqMatches = configUseFaq
        ? await buildFaqMatches(chatContext, chatAssistConfig.retrieval?.faqTopN || 3, chatAssistConfig.retrieval?.faqMinScore || 2)
        : [];
      setMatchedFaqs(faqMatches);
      const faqContext = faqMatches.length > 0
        ? faqMatches.map((f, idx) => `${idx + 1}. [${f.category}] ${f.name}\n问题:${f.question}\n答案:${f.answer}`).join('\n\n')
        : '未匹配到高置信常见问题。';
      const lastExternalMessage = [...workingMessages].reverse().find((m: any) => {
        const senderText = String(m?.sender || '');
        return !senderText.includes('销售') && !senderText.includes('我');
      });
      const speakerName = String(lastExternalMessage?.sender || '').trim();
      const matchedContact = (contacts || []).find((c) => {
        const name = String(c?.name || '');
        return speakerName && (name.includes(speakerName) || speakerName.includes(name));
      });
      const speakerProfile = aiContactProfiles.find((p) => {
        const name = String(p?.name || '');
        return speakerName && (name.includes(speakerName) || speakerName.includes(name));
      }) || (matchedContact
        ? aiContactProfiles.find((p) => {
            const name = String(p?.name || '');
            return name && (name.includes(String(matchedContact.name || '')) || String(matchedContact.name || '').includes(name));
          })
        : undefined);
      const personaContext = speakerProfile
        ? `当前发言人画像：${speakerProfile.name || '-'} / ${speakerProfile.position || '-'} / 角色:${speakerProfile.roleTag || '-'} / 态度:${speakerProfile.attitudeScore ?? '-'} / 影响力:${speakerProfile.influenceLevel ?? '-'} / 关系:${speakerProfile.relationLevel ?? '-'} / 关注点:${speakerProfile.keyConcerns || '-'} / 偏好:${speakerProfile.preferences || '-'}`
        : aiContactProfiles.length > 0
          ? aiContactProfiles
            .map((c, idx) => `${idx + 1}. ${c.name || '-'} / ${c.position || '-'} / 角色:${c.roleTag || '-'} / 态度:${c.attitudeScore ?? '-'} / 影响力:${c.influenceLevel ?? '-'} / 关系:${c.relationLevel ?? '-'} / 关注点:${c.keyConcerns || '-'} / 偏好:${c.preferences || '-'}`)
            .join('\n')
          : '暂无联系人画像数据';
      const deptGuess = String((matchedContact as any)?.department || matchedContact?.position || speakerProfile?.position || '');
      const departmentPrompt = (chatAssistConfig.departmentPrompts || []).find((x) => x.enabled !== false && deptGuess && (deptGuess.includes(x.department) || x.department.includes(deptGuess)));
      const keywords = extractKeywords(chatContext);
      const focusBlocks = (focusArchiveSummary || '').split('\n\n').filter(Boolean);
      const focusMatched = focusBlocks.filter((block) => keywords.some((k) => block.toLowerCase().includes(k.toLowerCase())));
      const focusContext = (focusMatched.length > 0 ? focusMatched : focusBlocks).slice(0, Math.max(1, chatAssistConfig.retrieval?.focusTopN || 3)).join('\n\n') || '暂无';
      const { customerProfile, demandSummary, caseSummary, seriesSummary } = await buildBusinessContext(chatContext, enabledDataSources);
      const enabledModes = [
        configUseFaq ? '根据常见问题回答' : null,
        configUsePersona ? '根据联系人画像回答' : null,
        configUseFocusCompetitor ? '根据客户关注点及竞争对手回答' : null
      ].filter(Boolean).join('、') || '仅基于聊天上下文';
      const lengthHint = chatAssistConfig.responseLength === 'short'
        ? '建议回复话术控制在50-100字'
        : chatAssistConfig.responseLength === 'long'
          ? '建议回复话术控制在150-260字'
          : '建议回复话术控制在80-180字';
      const variableMap: Record<string, string> = {
        chat_context: chatContext,
        chat: chatContext,
        chat_records: chatContext,
        intent_summary: intents.length > 0 ? intents.map((x) => `${x.name}(score:${x.score})`).join('、') : '未识别到高置信意图',
        faq_context: faqContext,
        persona_context: personaContext,
        focus_context: focusContext,
        customer_profile: customerProfile,
        profile: customerProfile,
        customer_demand: demandSummary,
        customer_cases: caseSummary,
        product_fab: seriesSummary,
        department_prompt: departmentPrompt?.prompt || '',
        speaker_name: speakerName || '',
        matched_contact: matchedContact?.name || '',
        custname: customerName || '未知客户',
        customer_name: customerName || '未知客户',
        contact_persona: personaContext,
        customer_focus_archive: focusContext || '',
        task_instruction: enabledFlowNodes.map((n) => `${n.name}: ${n.instruction || ''}`).join('\n')
      };
      const nodeOutputMap: Record<string, string> = {};
      const renderNodeTemplate = (template: string) => {
        if (!template) return '';
        const afterDoubleBrace = template.replace(/\{\{\s*([a-zA-Z0-9_:\-]+)\s*\}\}/g, (_, key) => {
          if (key.startsWith('node_result_')) return nodeOutputMap[key] || '';
          return variableMap[key] || '';
        });
        return afterDoubleBrace.replace(/\{([a-zA-Z0-9_:\-]+)\}/g, (_, key) => {
          if (key.startsWith('node_result_')) return nodeOutputMap[key] || '';
          return variableMap[key] || `{${key}}`;
        });
      };
      enabledFlowNodes.forEach((node: any, idx: number) => {
        const template = String(node.promptTemplate || '').trim();
        const rendered = template ? renderNodeTemplate(template) : node.instruction;
        const outputVar = String(node.outputVar || `node_result_${idx + 1}`);
        nodeOutputMap[outputVar] = rendered;
      });
      const prompt = [
        '你是资深大客户销售顾问，请基于输入聊天片段生成“可直接发送”的建议话术。',
        `客户：${customerName || '未知客户'}`,
        `当前发言人：${speakerName || '未识别'}，匹配联系人：${matchedContact?.name || '未匹配'}`,
        `发言人部门/岗位：${deptGuess || '未知'}`,
        `识别意图：${intents.length > 0 ? intents.map((x) => `${x.name}(score:${x.score})`).join('、') : '未识别到高置信意图'}`,
        `已启用策略：${enabledModes}`,
        `回复风格：${chatAssistConfig.responseTone || '专业、口语化、可直接发送'}`,
        `规则模式：${chatAssistConfig.strictMode ? '严格按系统设置' : '允许临时勾选覆盖'}`,
        `当前流程：${flowToRun?.name || activeChatFlow?.name || '默认流程'}`,
        `分析流程：${enabledFlowNodes.length > 0 ? enabledFlowNodes.map((x) => x.name).join(' -> ') : ((chatAssistConfig.analysisSteps || []).join(' -> ') || '识别角色 -> 检索证据 -> 生成建议 -> 风险校验')}`,
        enabledFlowNodes.length > 0 ? `流程节点配置：\n${enabledFlowNodes.map((x, i) => `${i + 1}. ${x.name} | 数据源: ${(x.dataSources || []).join(', ')} | 指令: ${x.instruction || '-'} | 模板: ${x.promptTemplate || '-'}`).join('\n')}` : '',
        Object.keys(nodeOutputMap).length > 0 ? `流程节点变量输出：\n${Object.entries(nodeOutputMap).map(([k, v]) => `${k}: ${v}`).join('\n')}` : '',
        '聊天片段：',
        chatContext,
        sourceEnabled('customer_profile') && (contextEnabled('customer_profile') || contextEnabled('customer_name')) ? `\n客户主数据参数 {profile} / {customer_profile}：\n${customerProfile}` : '',
        sourceEnabled('customer_demand') ? `\n客户需求参数 {{customer_demand}}：\n${demandSummary}` : '',
        sourceEnabled('customer_cases') ? `\n客户案例参数 {{customer_cases}}：\n${caseSummary}` : '',
        sourceEnabled('product_fab') ? `\n产品FAB参数 {{product_fab}}：\n${seriesSummary}` : '',
        configUseFaq ? `\n常见问题参数 {{faq_context}}：\n${faqContext}` : '',
        configUsePersona && contextEnabled('contact_persona') ? `\n联系人画像参数 {contact_persona}：\n${personaContext}` : '',
        configUseFocusCompetitor && (contextEnabled('customer_focus_archive') || contextEnabled('competitor_profile')) ? `\n客户关注点参数 {customer_focus_archive}：\n${focusContext || '暂无'}` : '',
        contextEnabled('department_prompt') && departmentPrompt ? `\n部门提示词参数 {{department_prompt}}：\n${departmentPrompt.prompt}` : '',
        contextEnabled('chat_records') ? `\n聊天记录参数 {chat} / {chat_records}（仅当前选中）:\n${chatContext}` : '',
        intents.length > 0 ? `\n意图策略提示：\n${intents.map((x, idx) => `${idx + 1}. ${x.name}: ${x.strategyHint || '-'}`).join('\n')}` : '',
        '\n输出要求：',
        `1) 必须包含：${chatAssistConfig.mustInclude || '匹配判断；建议回复话术；下一步推进动作'}；`,
        `2) ${lengthHint}；`,
        `3) 禁止内容：${chatAssistConfig.forbidden || '空话套话；夸大承诺；无法落地建议'}；`,
        '4) 紧贴当前聊天语境，给可直接复制发送的内容；',
        `5) 附加要求：${chatAssistConfig.customPromptSuffix || '无'}`
      ].join('\n');
      const selectedModelId = String(currentRunFlow?.modelId || '').trim();
      if (!selectedModelId) {
        toast.error('当前AI辅助流程未设置大模型，请先在“聊天AI辅助流程”中选择模型');
        return;
      }
      const text = await callAiProxy(prompt, selectedModelId);
      if (text) {
        setAiSuggestion(text.trim());
      } else if (faqMatches.length > 0) {
        setAiSuggestion(`匹配问题：${faqMatches[0].question || faqMatches[0].name}\n建议回复话术：${faqMatches[0].answer}`);
      }
    } catch (error) {
      console.error(error);
      setAiSuggestion('AI辅助生成失败，请稍后重试。');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          {title}
        </h3>
      </div>
      <div className="px-4 pt-3 bg-white border-b border-gray-100">
        {customerSessions.length > 0 && (
          <div className="mb-4 rounded-xl border border-green-100 bg-green-50/50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
              <MessageSquare className="w-4 h-4" />
              客户会话
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                {customerSessions.map((session) => {
                  const selected = selectedCustomerSessionId === session.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedCustomerSessionId(session.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left',
                        selected ? 'border-green-300 bg-white shadow-sm' : 'border-green-100 bg-white/80 hover:bg-white'
                      )}
                    >
                      <div className="text-sm font-medium text-gray-900">{session.title}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {session.sourceSenderDisplayName || session.sourceSenderWechatId || session.sourceSenderKey}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {session.messageCount} 条消息 · {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString() : '-'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-lg border border-green-100 bg-white p-3">
                {selectedCustomerSessionMessages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">当前客户会话暂无消息</div>
                ) : (
                  <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                    {selectedCustomerSessionMessages.map((comm) => (
                      <div key={comm.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{comm.sender}</span>
                          <span>{comm.date}</span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{comm.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors',
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-hidden bg-gray-50/30">
        {(activeTab === 'wechat' || activeTab === 'wechat_group') ? (
          <div className="h-full grid grid-cols-[260px_1fr]">
            <div className="border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{activeTab === 'wechat' ? '微信会话' : '微信群会话'}</span>
                <span className="text-[11px] text-gray-400">系统原始消息浏览</span>
              </div>
              <div className="p-2 space-y-1">
                {(activeTab === 'wechat' ? derivedWechatSessions : derivedGroupChats).map((chat: any) => {
                  const selected = activeTab === 'wechat'
                    ? String(chat.id) === String(selectedWechatSessionId)
                    : String(chat.id) === String(selectedGroupChatId);
                  return (
                    <button
                      key={chat.id}
                      onClick={() => activeTab === 'wechat' ? setSelectedWechatSessionId(String(chat.id)) : setSelectedGroupChatId(String(chat.id))}
                      className={cn(
                        'w-full text-left p-2 rounded-lg border',
                        selected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'
                      )}
                    >
                      <div className="text-xs font-bold text-gray-800 truncate">{chat.name || chat.groupName || '未命名会话'}</div>
                      <div className="text-[11px] text-gray-500 truncate mt-1">{chat.lastMessage || ''}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={cn("h-full overflow-y-auto p-4 space-y-4 relative", showAiPanel ? "pr-[390px]" : "")}>
              <div className="p-3 bg-white border border-gray-200 rounded-lg flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiPanel((v) => !v)}
                  className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  AI辅助
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMessageIds.length === 0) {
                      const lastIds = sessionMessages
                        .slice(-6)
                        .map((comm: any, idx: number) => getMessageKey(comm, sessionMessages.length - Math.min(6, sessionMessages.length) + idx));
                      setSelectedMessageIds(lastIds);
                    } else {
                      setSelectedMessageIds([]);
                    }
                  }}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50"
                >
                  {selectedMessageIds.length > 0 ? `已选 ${selectedMessageIds.length} 条，清空选择` : '快速选择最近6条'}
                </button>
              </div>

              {activeTab === 'wechat_group' && selectedGroupChat && (
                <div className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between">
                  <div className="text-xs text-gray-700">
                    群成员：{(selectedGroupChat.members || []).length} 人
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSyncChats?.()}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50"
                    >
                      {isSyncingChats ? '同步中...' : '同步消息'}
                    </button>
                    <button
                      onClick={() => onManageMembers?.(selectedGroupChat)}
                      className="text-xs px-2 py-1 border border-indigo-200 text-indigo-700 rounded bg-indigo-50 hover:bg-indigo-100"
                    >
                      群成员管理
                    </button>
                  </div>
                </div>
              )}
              {sessionMessages.length === 0 ? (
                <div className="h-[360px] flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm">暂无会话记录</p>
                </div>
              ) : sessionMessages.map((comm: any, idx: number) => {
                const isSelf = String(comm.sender || '').includes('销售') || String(comm.sender || '').includes('张三') || String(comm.sender || '').includes('我');
                const messageKey = getMessageKey(comm, idx);
                const checked = selectedMessageIds.includes(messageKey);
                return (
                  <div key={messageKey} className={cn('flex flex-col', isSelf ? 'items-end' : 'items-start')}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedMessageIds((prev) => e.target.checked ? [...prev, messageKey] : prev.filter((id) => id !== messageKey));
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
                      />
                      {!isSelf && <span className="text-[10px] font-bold text-gray-600">{comm.sender}</span>}
                      <span className="text-[10px] text-gray-400">{comm.date || comm.time}</span>
                    </div>
                    <div className={cn('group relative max-w-[85%] rounded-2xl p-3 shadow-sm', isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none')}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comm.content}</p>
                    </div>
                  </div>
                );
              })}
              {showAiPanel && (
                <div className="absolute right-4 top-4 bottom-4 w-[360px] bg-white border border-indigo-200 rounded-xl shadow-xl z-20 overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-indigo-100 px-3 py-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-indigo-900">AI辅助分析</div>
                    <button type="button" onClick={() => setShowAiPanel(false)} className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600">关闭</button>
                  </div>
                  <div className="p-3 space-y-3 bg-indigo-50/40">
                    <div className="text-[11px] text-indigo-700 bg-white border border-indigo-100 rounded p-2">
                      当前按流程设置执行（模型由流程配置决定）
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-600">分析流程</label>
                      <select
                        value={selectedFlowIdForRun || ''}
                        onChange={(e) => setSelectedFlowIdForRun(e.target.value)}
                        className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 bg-white"
                      >
                        {(runnableFlows || []).map((flow: any) => (
                          <option key={flow.id} value={flow.id}>{flow.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">分析节点（可多选）</div>
                      <div className="flex flex-wrap gap-2">
                        {(currentRunFlow?.nodes || []).filter((n: any) => n.enabled !== false).map((node: any) => {
                          const checked = selectedNodeIdsForRun.includes(String(node.id));
                          return (
                            <label key={node.id} className="flex items-center gap-1 text-xs text-gray-700 px-2 py-1 rounded border border-indigo-100 bg-white">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const id = String(node.id);
                                  setSelectedNodeIdsForRun((prev) => e.target.checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id));
                                }}
                              />
                              {node.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-700 bg-white border border-indigo-100 rounded p-2">
                      思维链流程：{((currentRunFlow?.nodes || chatAssistConfig.flowNodes || []) as any[]).filter((n: any) => n.enabled !== false && selectedNodeIdsForRun.includes(String(n.id))).map((n: any) => n.name).join(' -> ') || '未配置'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateAiReplySuggestion}
                        disabled={aiLoading}
                        className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50 flex items-center gap-1"
                      >
                        {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        生成建议话术
                      </button>
                      <span className="text-[11px] text-gray-500">
                        已选聊天记录：{selectedMessageIds.length > 0 ? `${selectedMessageIds.length} 条` : '请先勾选聊天记录'}
                      </span>
                    </div>
                    {matchedFaqs.length > 0 && (
                      <div className="text-xs text-gray-700 bg-white border border-indigo-100 rounded p-2">
                        FAQ匹配：{matchedFaqs.map((f) => `${f.category}/${f.name}`).join('；')}
                      </div>
                    )}
                    {aiSuggestion && (
                      <div className="space-y-2">
                        <textarea
                          value={aiSuggestion}
                          onChange={(e) => setAiSuggestion(e.target.value)}
                          className="w-full min-h-[140px] px-3 py-2 border border-indigo-200 rounded text-sm bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setNewContent(aiSuggestion)}
                          className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50"
                        >
                          引用到输入框
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {filteredCommunications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <MessageSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">暂无沟通记录</p>
              </div>
            ) : (
              filteredCommunications.map((comm, idx) => {
                const isSelf = comm.sender.includes('销售') || comm.sender.includes('张三') || comm.sender.includes('我');
                const messageKey = getMessageKey(comm, idx);
                const checked = selectedMessageIds.includes(messageKey);
                return (
                  <div key={messageKey} className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedMessageIds((prev) => e.target.checked ? [...prev, messageKey] : prev.filter((id) => id !== messageKey));
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
                      />
                      {!isSelf && <span className="text-[10px] font-bold text-gray-600">{comm.sender}</span>}
                      {comm.sourceGroup && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">{comm.sourceGroup}</span>}
                      <span className="text-[10px] text-gray-400">{comm.date}</span>
                    </div>
                    <div className={cn("group relative max-w-[85%] rounded-2xl p-3 shadow-sm", isSelf ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-gray-900 border border-gray-200 rounded-tl-none")}>
                      {comm.type === 'voice' ? (
                        <div className="flex items-center gap-3 min-w-[120px]"><Mic className="w-4 h-4" /><span className="text-[10px]">{comm.duration}s</span></div>
                      ) : comm.type === 'screenshot' && comm.attachmentUrl ? (
                        <div className="space-y-2"><img src={comm.attachmentUrl} alt="Screenshot" className="rounded-lg max-w-full" /><p className="text-sm">{comm.content}</p></div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{comm.content}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500">发送人:</span>
          <select 
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
          >
            {employees.map(e => <option key={e.id} value={`${e.name} (${e.role || '员工'})`}>{e.name}</option>)}
          </select>
          <span className="text-xs text-gray-500">类型:</span>
          <select
            value={newCommType}
            onChange={(e) => setNewCommType(e.target.value as CommunicationDetail['type'])}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
          >
            <option value="email">邮件</option>
            <option value="wechat">微信</option>
            <option value="wechat_group">微信群聊</option>
            <option value="meeting">会议</option>
            <option value="phone">聊天记录</option>
          </select>
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded hover:bg-indigo-100"
          >
            <Plus className="w-3 h-3 inline-block mr-1" />
            新增会话记录
          </button>
        </div>
        <div className="relative">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="输入沟通内容..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-24 text-sm min-h-[80px] resize-none"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button 
              onClick={() => {
                if (!newContent.trim()) return;
                onAddCommunication({
                  content: newContent,
                  type: newCommType as any,
                  sender: sender || '销售',
                  date: new Date().toLocaleString(),
                  sourceId: activeTab === 'wechat_group'
                    ? String(selectedGroupChat?.id || '')
                    : activeTab === 'wechat'
                      ? String(selectedWechatSession?.id || '')
                      : undefined,
                  sourceGroup: activeTab === 'wechat_group' ? (selectedGroupChat?.name || selectedGroupChat?.groupName || '') : (activeTab === 'wechat' ? (selectedWechatSession?.name || '') : undefined)
                });
                setNewContent('');
              }}
              disabled={!newContent.trim()}
              className={cn("p-2 rounded-lg transition-all", newContent.trim() ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400")}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddSessionModal && (
        <AddSessionRecordModal
          type={newCommType as any}
          onClose={() => setShowAddSessionModal(false)}
          onSave={handleSaveSession}
        />
      )}
    </div>
  );
}
