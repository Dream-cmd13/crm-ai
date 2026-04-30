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
  onAddCommunication: (comm: Partial<CommunicationDetail>) => void;
  title?: string;
  contacts?: { id: string; name: string; position?: string; department?: string; wechatId?: string }[];
  employees?: { id: string; name: string; role?: string }[];
  customerId?: string;
  customerName?: string;
  communications?: CommunicationDetail[];
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
  onAddCommunication, 
  contacts = [],
  employees = [],
  customerId = '',
  customerName = '',
  communications = [],
  aiContactProfiles = []
}: CommunicationLogProps) {
  const [activeTab, setActiveTab] = useState<CommunicationDetail['type']>('wechat');
  const [newContent, setNewContent] = useState('');
  const [sender, setSender] = useState('');
  const [newCommType, setNewCommType] = useState<CommunicationDetail['type']>('wechat');
  
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
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
  React.useEffect(() => { 
    if (employees.length && !sender) {
      const firstEmp = employees[0];
      setSender(`${firstEmp.name} (${firstEmp.role || '员工'})`); 
    } 
  }, [employees]);
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
        // 不在这里设置 setSelectedCustomerSessionId，由下面的 tab 切换逻辑处理
      })
      .catch((error) => {
        console.error(error);
        setCustomerSessions([]);
      });
  }, [customerId]);

  // 当切换微信/微信群聊标签时，如果当前选中的会话不属于该标签，则自动切换到该标签下的第一个会话
  React.useEffect(() => {
    if (activeTab === 'wechat' || activeTab === 'wechat_group') {
      const targetChannel = activeTab === 'wechat' ? 'wechat_private' : 'wechat_group';
      const currentSession = customerSessions.find(s => s.id === selectedCustomerSessionId);
      
      if (!currentSession || currentSession.channel !== targetChannel) {
        const firstMatching = customerSessions.find(s => s.channel === targetChannel);
        setSelectedCustomerSessionId(firstMatching?.id || '');
      }
    } else {
      setSelectedCustomerSessionId('');
    }
  }, [activeTab, customerSessions]);
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

  React.useEffect(() => {
    setNewCommType(activeTab);
  }, [activeTab]);

  const handleSaveSession = (data: any) => {
    let sourceId = selectedCustomerSessionId;
    
    // 如果没有选择会话，尝试根据发送人自动匹配一个
    if (!sourceId && (activeTab === 'wechat' || activeTab === 'wechat_group')) {
      const matchingSession = customerSessions.find(s => 
        s.title === sender || s.sourceSenderDisplayName === sender
      );
      if (matchingSession) sourceId = matchingSession.id;
    }

    onAddCommunication({
      content: data.content,
      type: data.type,
      sender: sender || '销售',
      date: new Date(data.date).toLocaleString('zh-CN', { hour12: false }),
      sourceId: sourceId || undefined,
      sourceGroup: data.location
    });
    setShowAddSessionModal(false);
  };

  const getMessageKey = (comm: any, idx: number) => String(comm?.id || `${comm?.date || ''}_${comm?.sender || ''}_${idx}`);

  const sessionMessages = useMemo(() => {
    // 1. 获取基础消息 (如果是真实会话，从 selectedCustomerSessionMessages 获取)
    let baseMessages = [...selectedCustomerSessionMessages];
    
    // 2. 如果是手动会话，从 communications 中获取对应发送人的消息
    if (selectedCustomerSessionId.startsWith('MANUAL_')) {
      const manualSender = selectedCustomerSessionId.replace('MANUAL_', '');
      baseMessages = (communications || []).filter(c => 
        c.type === activeTab && c.sender === manualSender && (!c.sourceId || !customerSessions.some(s => s.id === c.sourceId))
      );
    }
    
    // 3. 获取手动添加且 sourceId 匹配当前会话的消息
    const manualCommsForThisSession = (communications || []).filter(c => 
      c.type === activeTab && c.sourceId === selectedCustomerSessionId
    );
    
    const combined = [...baseMessages, ...manualCommsForThisSession];
    
    // 去重
    const seen = new Set();
    const final = combined.filter(m => {
      const key = getMessageKey(m, 0);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 按时间倒序排列 (最新的在最上面)
    return final.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeB - timeA;
    });
  }, [selectedCustomerSessionMessages, communications, activeTab, selectedCustomerSessionId, customerSessions]);

  const manualSessions = useMemo(() => {
    if (activeTab !== 'wechat' && activeTab !== 'wechat_group') return [];

    const manualComms = (communications || []).filter(c => 
      c.type === activeTab && (!c.sourceId || !customerSessions.some(s => s.id === c.sourceId))
    );
    
    const groups = new Map<string, CommunicationDetail[]>();
    manualComms.forEach(c => {
      const key = c.sender || '未知发送人';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    
    return Array.from(groups.entries()).map(([senderName, comms]): CustomerMessageSession => {
      const sorted = [...comms].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastComm = sorted[0];
      return {
        id: `MANUAL_${senderName}`,
        customerId: customerId,
        channel: activeTab === 'wechat_group' ? 'wechat_group' : 'wechat_private',
        sourceSenderKey: senderName,
        title: senderName,
        messageCount: comms.length,
        lastMessageAt: lastComm.date,
        lastMessagePreview: lastComm.content.slice(0, 100),
        status: 'active',
        createdAt: lastComm.date,
        updatedAt: lastComm.date
      };
    });
  }, [communications, activeTab, customerSessions, customerId]);

  const displayedSessions = useMemo(() => {
    const targetChannel = activeTab === 'wechat' ? 'wechat_private' : 'wechat_group';
    const realSessions = customerSessions.filter(s => s.channel === targetChannel);
    
    // 合并真实会话和手动会话
    const combined = [...realSessions, ...manualSessions];
    
    return combined.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || 0).getTime();
      const timeB = new Date(b.lastMessageAt || 0).getTime();
      return timeB - timeA;
    });
  }, [customerSessions, manualSessions, activeTab]);

  const filteredLogs = useMemo(() => {
    return (communications || [])
      .filter(c => c.type === activeTab)
      .sort((a, b) => {
        const timeA = new Date(a.date || 0).getTime();
        const timeB = new Date(b.date || 0).getTime();
        return timeB - timeA;
      });
  }, [communications, activeTab]);

  React.useEffect(() => {
    const validIds = new Set(sessionMessages.map((comm: any, idx: number) => getMessageKey(comm, idx)));
    setSelectedMessageIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [selectedCustomerSessionId, sessionMessages.length]);

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
      {/* 顶部标签页 */}
      <div className="flex border-b border-gray-100 bg-white px-4 pt-3 shrink-0">
        {[
          { id: 'wechat', label: '微信' },
          { id: 'wechat_group', label: '微信群聊' },
          { id: 'email', label: '邮件' },
          { id: 'meeting', label: '会议' },
          { id: 'phone', label: '聊天' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-2 text-sm font-bold border-b-2 transition-all -mb-[1px]',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-hidden bg-gray-50/30">
        {(activeTab === 'wechat' || activeTab === 'wechat_group') ? (
          <div className="h-full grid grid-cols-[260px_1fr]">
            <div className="border-r border-gray-200 bg-white overflow-y-auto">
              <div className="p-2 space-y-1">
                {displayedSessions.length === 0 ? (
                  <div className="py-10 text-center text-[11px] text-gray-400">暂无归档会话</div>
                ) : (
                  displayedSessions.map((session) => {
                    const selected = selectedCustomerSessionId === session.id;
                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedCustomerSessionId(session.id)}
                        className={cn(
                          'w-full text-left p-2 rounded-lg border transition-all',
                          selected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-gray-800 truncate">{session.title}</div>
                          {session.channel === 'wechat_group' && (
                            <span className="px-1 py-0.5 bg-green-50 text-green-600 text-[9px] rounded border border-green-100 shrink-0">群聊</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-1">
                          {session.sourceSenderDisplayName || session.sourceSenderWechatId || session.sourceSenderKey}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {session.messageCount}条 · {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString('zh-CN', { hour12: false }) : '-'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className={cn("h-full overflow-y-auto p-4 space-y-4 relative bg-white", showAiPanel ? "pr-[390px]" : "")}>
              {sessionMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm">请选择会话查看详情</p>
                </div>
              ) : (
                <>
                  <div className="sticky top-0 z-10 p-3 bg-white/80 backdrop-blur border border-gray-200 rounded-lg flex flex-wrap items-center gap-2 mb-4">
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
                            .slice(0, 6)
                            .map((comm: any, idx: number) => getMessageKey(comm, idx));
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

                  <div className="space-y-4">
                    {sessionMessages.map((comm: any, idx: number) => {
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
                            <span className="text-[10px] text-gray-400">{comm.date}</span>
                          </div>
                          <div className={cn('group relative max-w-[85%] rounded-2xl p-3 shadow-sm', isSelf ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none')}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{comm.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

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
                        已选记录：{selectedMessageIds.length} 条
                      </span>
                    </div>
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
          <div className="h-full overflow-y-auto p-4 space-y-4 bg-white">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <MessageSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">暂无该类型的沟通记录</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-600">{log.sender}</span>
                    <span className="text-[10px] text-gray-400">{log.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.content}</p>
                </div>
              ))
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
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 max-w-[150px]"
          >
            <optgroup label="员工">
              {employees.map(e => <option key={e.id} value={`${e.name} (${e.role || '员工'})`}>{e.name} ({e.role || '员工'})</option>)}
            </optgroup>
            {contacts.length > 0 && (
              <optgroup label="客户联系人">
                {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </optgroup>
            )}
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
                  date: new Date().toLocaleString('zh-CN', { hour12: false }),
                  sourceId: undefined,
                  sourceGroup: undefined
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
