import React, { useEffect, useMemo, useState } from 'react';
import { CircleHelp, Plus, Save, UserRound, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Contact, CustomerStakeholder, StakeholderAssessment } from '../../types';
import {
  createQuickAssessment,
} from '../../lib/stakeholderRepository';
import { fetchCustomerContactsFromSupabase, saveCustomerContactToSupabase } from '../../lib/customerInteractionRepository';
import { callAiProxy } from '../../lib/aiProxy';
import { fetchCustomerFollowStrategyConfig } from '../../lib/customerFollowStrategyRepository';
import { saveTasksSnapshotToSupabase } from '../../lib/taskRepository';
import { parseAiJson } from '../../lib/aiJson';

const SCORE_HELP = {
  roleTag: 'A:审批者（预算/拍板） D:决策者（选型） S:支持者（推动） E:评估者（测试/评审） I:影响者（影响意见）',
  attitudeScore: '+2 强支持，+1 支持，0 中立，-1 反对，-2 强烈反对。用于衡量当前推进阻力。',
  influenceLevel: '1-5分：1影响很小，3中等影响，5可左右结果。用于评估优先攻关对象。',
  relationLevel: '1-4分：1无联系，2弱联系，3稳定联系，4深度互信。用于判断触达策略强度。'
};

const SCORE_HELP_DEEP = {
  roleTag: [
    '华为大客户划分（角色）',
    'A（审批者）：掌握预算或最终签批，关注风险可控与投入产出。',
    'D（决策者）：对技术/商务方案做取舍，关注可落地性与成功概率。',
    'S（支持者）：愿意推动项目，是内部协同与背书的关键。',
    'E（评估者）：负责测试、评审、验收，影响方案进入门槛。',
    'I（影响者）：不拍板但可左右意见，影响会议氛围与结论。'
  ].join('\n'),
  attitudeScore: [
    '华为大客户划分（态度）',
    '+2：主动推动我方方案进入流程。',
    '+1：总体认可，愿意配合信息与资源。',
    '0：中立观望，需要更多证据。',
    '-1：明显保留或倾向竞品。',
    '-2：明确反对，可能阻断流程。'
  ].join('\n'),
  influenceLevel: [
    '华为大客户划分（影响力）',
    '1分：仅提供信息，不影响结论。',
    '2分：可影响局部环节。',
    '3分：影响评估与讨论方向。',
    '4分：可显著影响多方意见。',
    '5分：可直接左右最终结果。'
  ].join('\n'),
  relationLevel: [
    '华为大客户划分（关系）',
    '1级：仅公开渠道接触，无稳定互动。',
    '2级：有过业务沟通，信任基础弱。',
    '3级：稳定沟通，可进入实质议题。',
    '4级：深度互信，可共同推进关键动作。'
  ].join('\n')
};

export default function StakeholderMapPanel({
  customerId,
  contacts = [],
  compact = false,
  customerName = ''
}: {
  customerId: string;
  contacts?: Contact[];
  compact?: boolean;
  customerName?: string;
}) {
  const NEW_CONTACT_EDIT_ID = '__new_contact__';
  const [assessments, setAssessments] = useState<StakeholderAssessment[]>([]);
  const [contactItems, setContactItems] = useState<Contact[]>(contacts || []);
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState<Partial<Contact>>({});
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'A' | 'D' | 'S' | 'E' | 'I'>('ALL');
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionRuleName, setSuggestionRuleName] = useState('');
  const [suggestionTarget, setSuggestionTarget] = useState<CustomerStakeholder | null>(null);
  const [detailTarget, setDetailTarget] = useState<CustomerStakeholder | null>(null);
  const [aiCollectingId, setAiCollectingId] = useState<string | null>(null);
  const availableContacts = useMemo(() => contactItems || [], [contactItems]);

  useEffect(() => {
    if (!customerId) return;
    fetchCustomerContactsFromSupabase(customerId)
      .then((rows) => setContactItems(rows as any))
      .catch((e) => {
        console.error(e);
        setContactItems(contacts || []);
      });
  }, [customerId, contacts]);

  const workingStakeholders = useMemo<CustomerStakeholder[]>(() => {
    return (contactItems || []).map((c) => ({
      id: `contact_${c.id}`,
      customerId,
      contactId: c.id,
      name: c.name || '',
      title: c.position || '',
      roleTag: (c.roleTag || 'I') as any,
      influenceLevel: Number(c.influenceLevel || 3),
      attitudeScore: (typeof c.attitudeScore === 'number' ? c.attitudeScore : 0) as any,
      relationLevel: Number(c.relationLevel || 2) as any,
      managerStakeholderId: c.managerContactId ? `contact_${c.managerContactId}` : '',
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      createDate: new Date().toISOString().split('T')[0]
    }));
  }, [contactItems, customerId]);

  const healthSummary = useMemo(() => {
    if (workingStakeholders.length === 0) return { avgAttitude: 0, riskCount: 0 };
    const avgAttitude = workingStakeholders.reduce((acc, cur) => acc + (cur.attitudeScore || 0), 0) / workingStakeholders.length;
    const riskCount = workingStakeholders.filter((x) => ['A', 'D'].includes(x.roleTag) && (x.attitudeScore || 0) <= 0).length;
    return { avgAttitude, riskCount };
  }, [workingStakeholders]);

  const openCreateContactModal = () => {
    setEditingId(NEW_CONTACT_EDIT_ID);
    setEditDraft({
      name: '',
      position: '',
      phone: '',
      email: '',
      wechatId: '',
      faction: '',
      managerContactId: '',
      graduationSchool: '',
      roleTag: 'I',
      attitudeToUs: '中性评价',
      attitudeScore: 0,
      influenceLevel: 3,
      relationLevel: 2,
      hometown: '',
      hobbies: [],
      familySituation: '',
      personality: '',
      preferences: '',
      keyConcerns: '',
      followStrategy: '',
      videoChannelProfile: '',
      douyinProfile: '',
      xiaohongshuProfile: '',
      socialMediaBehavior: ''
    });
  };

  const CONTACT_AI_PROMPT_FALLBACK = [
    '你是B2B销售联系人研究员，请根据客户名称、联系人姓名、手机号、职位进行网络检索与多源交叉验证（官网/新闻/工商/招聘/演讲/社媒公开资料等）。',
    '目标：补齐联系人字段，并重点提炼其视频号、抖音、小红书等社媒行为线索。',
    '输出要求：',
    '1) 仅输出 JSON 对象，不要代码块，不要额外解释；',
    '2) 字段仅允许：name, position, phone, email, wechatId, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior；',
    '3) 联系人姓名必须带“AI”后缀；',
    '4) 无可靠证据的字段留空字符串；',
    '5) socialMediaBehavior 要总结该联系人公开社媒行为特征与内容偏好；',
    '6) 所有结论必须基于交叉验证，不得编造。'
  ].join('\n');

  const handleQuickAssess = async (target: CustomerStakeholder) => {
    const row: StakeholderAssessment = {
      id: `asm_${Date.now()}`,
      customerId,
      stakeholderId: target.id,
      assessmentDate: new Date().toISOString().split('T')[0],
      needLevelScore: 3,
      powerScore: target.influenceLevel,
      attitudeScore: target.attitudeScore,
      relationScore: target.relationLevel,
      businessAlignmentScore: 3,
      confidenceScore: 60,
      conclusion: `${target.name} 当前态度评分 ${target.attitudeScore}，建议优先提升关系密度。`,
      strategySuggestion: '安排一次非交易型沟通，验证其当前核心诉求并建立互信。',
      sourceType: 'manual',
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      createDate: new Date().toISOString().split('T')[0]
    };
    try {
      await createQuickAssessment(row);
      setAssessments((prev) => [row, ...prev]);
      toast.success('五维评估已记录');
    } catch (e) {
      console.error(e);
      toast.error('评估记录保存失败');
    }
  };

  const handleSaveBaseInfo = async () => {
    if (!editingId || !String(editDraft.name || '').trim()) return;
    try {
      const isCreateMode = editingId === NEW_CONTACT_EDIT_ID;
      const sourceContactId = isCreateMode
        ? `CON${Date.now()}`
        : String(editDraft.id || editingId.replace(/^contact_/, ''));
      await saveCustomerContactToSupabase(customerId, {
        id: sourceContactId,
        name: String(editDraft.name || ''),
        position: String(editDraft.position || ''),
        phone: String(editDraft.phone || ''),
        email: String(editDraft.email || ''),
        wechatId: String(editDraft.wechatId || ''),
        faction: String(editDraft.faction || ''),
        managerContactId: String(editDraft.managerContactId || ''),
        roleTag: (editDraft.roleTag || 'I') as any,
        attitudeToUs: String(editDraft.attitudeToUs || '中性评价') as any,
        attitudeScore: Number(editDraft.attitudeScore || 0) as any,
        influenceLevel: Number(editDraft.influenceLevel || 3),
        relationLevel: Number(editDraft.relationLevel || 2) as any,
        hometown: String(editDraft.hometown || ''),
        hobbies: String(editDraft.hobbies || '').split(/[，,]/).map((x) => x.trim()).filter(Boolean),
        familySituation: String(editDraft.familySituation || ''),
        personality: String(editDraft.personality || ''),
        preferences: String(editDraft.preferences || ''),
        keyConcerns: String(editDraft.keyConcerns || ''),
        followStrategy: String(editDraft.followStrategy || ''),
        graduationSchool: String(editDraft.graduationSchool || ''),
        videoChannelProfile: String(editDraft.videoChannelProfile || ''),
        douyinProfile: String(editDraft.douyinProfile || ''),
        xiaohongshuProfile: String(editDraft.xiaohongshuProfile || ''),
        socialMediaBehavior: String(editDraft.socialMediaBehavior || '')
      });
      const rows = await fetchCustomerContactsFromSupabase(customerId);
      setContactItems(rows as any);
      setEditingId('');
      setEditDraft({});
      toast.success(isCreateMode ? '联系人架构已新增' : '干系人信息已保存');
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    }
  };

  const findContactByStakeholder = (s: CustomerStakeholder): Contact | undefined => {
    const cid = s.contactId || s.id.replace(/^contact_/, '');
    return contactItems.find((c) => c.id === cid);
  };

  const startEditStakeholder = (s: CustomerStakeholder) => {
    const source = findContactByStakeholder(s);
    setEditingId(s.id);
    setEditDraft({
      id: source?.id,
      name: source?.name || s.name,
      position: source?.position || s.title || '',
      phone: source?.phone || '',
      email: source?.email || '',
      wechatId: source?.wechatId || '',
      faction: source?.faction || '',
      managerContactId: source?.managerContactId || '',
      roleTag: (source?.roleTag || s.roleTag || 'I') as any,
      attitudeToUs: (source?.attitudeToUs || '中性评价') as any,
      attitudeScore: (typeof source?.attitudeScore === 'number' ? source?.attitudeScore : s.attitudeScore || 0) as any,
      influenceLevel: Number(source?.influenceLevel || s.influenceLevel || 3),
      relationLevel: Number(source?.relationLevel || s.relationLevel || 2) as any
      ,
      hometown: source?.hometown || '',
      hobbies: Array.isArray(source?.hobbies) ? source?.hobbies : [],
      familySituation: source?.familySituation || '',
      personality: source?.personality || '',
      preferences: source?.preferences || '',
      keyConcerns: source?.keyConcerns || '',
      followStrategy: source?.followStrategy || '',
      graduationSchool: source?.graduationSchool || '',
      videoChannelProfile: source?.videoChannelProfile || '',
      douyinProfile: source?.douyinProfile || '',
      xiaohongshuProfile: source?.xiaohongshuProfile || '',
      socialMediaBehavior: source?.socialMediaBehavior || ''
    });
  };

  const normalizeAiContactName = (value: string, fallbackName?: string) => {
    const base = String(value || fallbackName || '').trim();
    if (!base) return fallbackName || '';
    return /AI$/i.test(base) ? base : `${base}AI`;
  };

  const buildContactAiPrompt = (contact: Partial<Contact>, promptTemplate: string) => [
    String(promptTemplate || CONTACT_AI_PROMPT_FALLBACK).trim(),
    `客户名称：${customerName || customerId}`,
    `客户ID：${customerId}`,
    `联系人姓名：${String(contact.name || '').trim() || '未知'}`,
    `联系人职位：${String(contact.position || '').trim() || '未知'}`,
    `联系人手机号：${String(contact.phone || '').trim() || '未知'}`,
    `联系人邮箱：${String(contact.email || '').trim() || '未知'}`,
    `联系人微信号：${String(contact.wechatId || '').trim() || '未知'}`,
    '请严格输出 JSON 对象，字段仅允许：name, position, phone, email, wechatId, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior。'
  ].join('\n\n');

  const buildSocialOnlyPrompt = (contact: Partial<Contact>, promptTemplate: string) => [
    String(promptTemplate || CONTACT_AI_PROMPT_FALLBACK).trim(),
    '【本次任务仅做社媒搜集分析】',
    `客户名称：${customerName || customerId}`,
    `联系人姓名：${String(contact.name || '').trim() || '未知'}`,
    `联系人手机号：${String(contact.phone || '').trim() || '未知'}`,
    `联系人职位：${String(contact.position || '').trim() || '未知'}`,
    `已知视频号账号：${String(contact.videoChannelProfile || '').trim() || '未填写'}`,
    `已知抖音账号：${String(contact.douyinProfile || '').trim() || '未填写'}`,
    `已知小红书账号：${String(contact.xiaohongshuProfile || '').trim() || '未填写'}`,
    '请重点检索视频号、抖音、小红书公开线索并进行交叉验证。',
    '仅输出 JSON 对象，且键只能是：videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior。',
    '要求：',
    '1) 每个字段必须输出，找不到则返回空字符串；',
    '2) socialMediaBehavior 必须综合三类社媒线索，输出行为特征、内容偏好、活跃主题；',
    '3) 禁止输出 JSON 之外文本。'
  ].join('\n\n');

  const normalizeHobbies = (value: any, fallback: any) => {
    if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(/[，,、]/).map((x) => x.trim()).filter(Boolean);
    return Array.isArray(fallback) ? fallback : [];
  };

  const toContactCandidateList = (parsed: any): Array<Record<string, any>> => {
    if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === 'object');
    if (Array.isArray(parsed?.contacts)) return parsed.contacts.filter((x: any) => x && typeof x === 'object');
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  };

  const isUsefulContactCandidate = (item: Record<string, any>) => {
    const name = String(item?.name || '').trim();
    const phone = String(item?.phone || '').trim();
    const position = String(item?.position || '').trim();
    const email = String(item?.email || '').trim();
    const hasCore = Boolean(name && name.replace(/AI$/i, '').trim() && (phone || position || email));
    return hasCore;
  };

  const handleQuickCreateByAi = async () => {
    setAiCollectingId('__quick_create__');
    try {
      const cfg = await fetchCustomerFollowStrategyConfig();
      const prompt = [
        String(cfg.contactSearchPrompt || CONTACT_AI_PROMPT_FALLBACK).trim(),
        '【任务】请为该客户直接搜集并输出 3-5 位最值得优先跟进的关键联系人，并用于CRM新增联系人。',
        `客户名称：${customerName || customerId}`,
        `客户ID：${customerId}`,
        '请只输出 JSON。',
        '推荐格式：{"contacts":[{...},{...}]}，每个对象使用统一字段。',
        '必须包含并仅使用以下字段：name, position, phone, email, wechatId, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior, roleTag, influenceLevel, relationLevel。',
        '禁止输出占位联系人（如仅有“关键联系人AI”且无任何可核实信息）。'
      ].join('\n\n');
      const raw = await callAiProxy(prompt);
      const parsed = parseAiJson(raw || '{}') as any;
      const existingRows = await fetchCustomerContactsFromSupabase(customerId);
      const existingKeys = new Set(
        (existingRows || []).map((x: any) =>
          `${String(x?.name || '').trim().toLowerCase()}|${String(x?.phone || '').trim()}`
        )
      );
      const candidates = toContactCandidateList(parsed).filter(isUsefulContactCandidate);
      const dedup = new Map<string, Record<string, any>>();
      candidates.forEach((item) => {
        const nameKey = String(item?.name || '').trim().toLowerCase();
        const phoneKey = String(item?.phone || '').trim();
        const key = `${nameKey}|${phoneKey}`;
        if (!dedup.has(key)) dedup.set(key, item);
      });
      const toCreate = Array.from(dedup.values()).filter((item) => {
        const key = `${String(item?.name || '').trim().toLowerCase()}|${String(item?.phone || '').trim()}`;
        return !existingKeys.has(key);
      }).slice(0, 6);
      if (toCreate.length === 0) {
        toast.error('AI未返回可用联系人，请补充客户名/行业信息后重试');
        return;
      }
      for (let i = 0; i < toCreate.length; i += 1) {
        const item = toCreate[i];
        const payload: Partial<Contact> = {
          id: `CON${Date.now()}${i}`,
          name: normalizeAiContactName(String(item?.name || ''), '关键联系人AI'),
          position: String(item?.position || '待核实'),
          phone: String(item?.phone || ''),
          email: String(item?.email || ''),
          wechatId: String(item?.wechatId || ''),
          faction: '',
          managerContactId: '',
          roleTag: (item?.roleTag || 'I') as any,
          attitudeToUs: '中性评价' as any,
          attitudeScore: 0 as any,
          influenceLevel: Number(item?.influenceLevel || 3),
          relationLevel: Number(item?.relationLevel || 2) as any,
          hometown: String(item?.hometown || ''),
          hobbies: normalizeHobbies(item?.hobbies, []),
          familySituation: String(item?.familySituation || ''),
          personality: String(item?.personality || ''),
          preferences: String(item?.preferences || ''),
          keyConcerns: String(item?.keyConcerns || ''),
          followStrategy: String(item?.followStrategy || ''),
          graduationSchool: String(item?.graduationSchool || ''),
          videoChannelProfile: String(item?.videoChannelProfile || ''),
          douyinProfile: String(item?.douyinProfile || ''),
          xiaohongshuProfile: String(item?.xiaohongshuProfile || ''),
          socialMediaBehavior: String(item?.socialMediaBehavior || '')
        };
        await saveCustomerContactToSupabase(customerId, payload as Contact);
      }
      const rows = await fetchCustomerContactsFromSupabase(customerId);
      setContactItems(rows as any);
      toast.success(`已完成AI搜集并新增 ${toCreate.length} 位联系人`);
    } catch (error) {
      console.error(error);
      toast.error('新联系人AI搜集失败');
    } finally {
      setAiCollectingId(null);
    }
  };

  const handleAnalyzeSocialForExisting = async (contact: Contact) => {
    const hasSeedAccount = Boolean(
      String(contact.videoChannelProfile || '').trim() ||
      String(contact.douyinProfile || '').trim() ||
      String(contact.xiaohongshuProfile || '').trim()
    );
    if (!hasSeedAccount) {
      toast.error('请先在联系人中填写至少一个社媒账号（视频号/抖音/小红书）再进行分析');
      return;
    }
    setAiCollectingId(String(contact.id || ''));
    try {
      const cfg = await fetchCustomerFollowStrategyConfig();
      const prompt = buildSocialOnlyPrompt(contact, String(cfg.contactSearchPrompt || CONTACT_AI_PROMPT_FALLBACK));
      const raw = await callAiProxy(prompt);
      const parsed = parseAiJson(raw || '{}') as Record<string, any>;
      const next = {
        ...contact,
        videoChannelProfile: String(parsed?.videoChannelProfile || contact.videoChannelProfile || ''),
        douyinProfile: String(parsed?.douyinProfile || contact.douyinProfile || ''),
        xiaohongshuProfile: String(parsed?.xiaohongshuProfile || contact.xiaohongshuProfile || ''),
        socialMediaBehavior: String(parsed?.socialMediaBehavior || contact.socialMediaBehavior || '')
      };
      const hasEffect = Boolean(
        String(next.videoChannelProfile || '').trim() ||
        String(next.douyinProfile || '').trim() ||
        String(next.xiaohongshuProfile || '').trim() ||
        String(next.socialMediaBehavior || '').trim()
      );
      await saveCustomerContactToSupabase(customerId, next);
      const rows = await fetchCustomerContactsFromSupabase(customerId);
      setContactItems(rows as any);
      if (detailTarget && String(detailTarget.contactId || '') === String(contact.id)) {
        const refreshed = (rows as any[]).find((row) => String(row.id) === String(contact.id));
        if (refreshed) {
          setDetailTarget({
            ...detailTarget,
            name: refreshed.name || detailTarget.name,
            title: refreshed.position || detailTarget.title
          });
        }
      }
      toast.success(hasEffect ? '社媒搜集分析已更新' : '未检索到明确社媒线索，可补充手机号后再试');
    } catch (error) {
      console.error(error);
      toast.error('社媒搜集分析失败');
    } finally {
      setAiCollectingId(null);
    }
  };

  const applyAiContactResult = async (contact: Partial<Contact>, options?: { saveDirectly?: boolean }) => {
    if (!String(contact.name || '').trim() && !String(contact.phone || '').trim()) {
      toast.error('请至少填写联系人姓名或手机号后再进行AI搜集');
      return;
    }
    setAiCollectingId(String(contact.id || editingId || 'draft'));
    try {
      const cfg = await fetchCustomerFollowStrategyConfig();
      const prompt = buildContactAiPrompt(contact, String(cfg.contactSearchPrompt || ''));
      const raw = await callAiProxy(prompt);
      const parsed = parseAiJson(raw || '{}') as Record<string, any>;
      const nextDraft: Partial<Contact> = {
        ...contact,
        name: normalizeAiContactName(String(parsed?.name || ''), String(contact.name || '')),
        position: String(parsed?.position || contact.position || ''),
        phone: String(parsed?.phone || contact.phone || ''),
        email: String(parsed?.email || contact.email || ''),
        wechatId: String(parsed?.wechatId || contact.wechatId || ''),
        graduationSchool: String(parsed?.graduationSchool || contact.graduationSchool || ''),
        hometown: String(parsed?.hometown || contact.hometown || ''),
        hobbies: Array.isArray(parsed?.hobbies)
          ? parsed.hobbies.map((x: any) => String(x || '').trim()).filter(Boolean)
          : Array.isArray(contact.hobbies) ? contact.hobbies : [],
        personality: String(parsed?.personality || contact.personality || ''),
        preferences: String(parsed?.preferences || contact.preferences || ''),
        keyConcerns: String(parsed?.keyConcerns || contact.keyConcerns || ''),
        followStrategy: String(parsed?.followStrategy || contact.followStrategy || ''),
        videoChannelProfile: String(parsed?.videoChannelProfile || contact.videoChannelProfile || ''),
        douyinProfile: String(parsed?.douyinProfile || contact.douyinProfile || ''),
        xiaohongshuProfile: String(parsed?.xiaohongshuProfile || contact.xiaohongshuProfile || ''),
        socialMediaBehavior: String(parsed?.socialMediaBehavior || contact.socialMediaBehavior || '')
      };
      if (options?.saveDirectly && String(contact.id || '').trim()) {
        const existing = contactItems.find((item) => String(item.id) === String(contact.id));
        await saveCustomerContactToSupabase(customerId, {
          ...existing,
          ...nextDraft,
          id: String(contact.id)
        });
        const rows = await fetchCustomerContactsFromSupabase(customerId);
        setContactItems(rows as any);
        if (detailTarget && String(detailTarget.contactId || '') === String(contact.id)) {
          const refreshed = (rows as any[]).find((row) => String(row.id) === String(contact.id));
          if (refreshed) {
            setDetailTarget({
              ...detailTarget,
              name: refreshed.name || detailTarget.name,
              title: refreshed.position || detailTarget.title
            });
          }
        }
        toast.success('联系人AI搜集结果已写入');
      } else {
        setEditDraft(nextDraft);
        toast.success('已完成AI搜集，请确认后保存');
      }
    } catch (error) {
      console.error(error);
      toast.error('联系人AI搜集失败');
    } finally {
      setAiCollectingId(null);
    }
  };

  const generateFollowSuggestionText = async (target: CustomerStakeholder) => {
    const cfg = await fetchCustomerFollowStrategyConfig();
    const contact = findContactByStakeholder(target);
    const matchedRule = (cfg.rules || []).find((r) => {
      const positionHit =
        !r.positionKeywords?.length || r.positionKeywords.some((k) => String(target.title || '').toLowerCase().includes(String(k).toLowerCase()));
      const roleHit = !r.roleTags?.length || r.roleTags.includes(target.roleTag as any);
      const attitudeHit = Number(target.attitudeScore || 0) >= Number(r.attitudeMin) && Number(target.attitudeScore || 0) <= Number(r.attitudeMax);
      const influenceHit = Number(target.influenceLevel || 0) >= Number(r.influenceMin) && Number(target.influenceLevel || 0) <= Number(r.influenceMax);
      const relationHit = Number(target.relationLevel || 0) >= Number(r.relationMin) && Number(target.relationLevel || 0) <= Number(r.relationMax);
      return positionHit && roleHit && attitudeHit && influenceHit && relationHit;
    }) || cfg.rules?.[0];
    const template = matchedRule?.promptTemplate || '请给出该联系人的跟进建议。';
    const contextMap: Record<string, string> = {
      customer_name: `客户名称：${customerName || customerId}`,
      customer_profile: `客户ID：${customerId}\n组织关键人数量：${workingStakeholders.length}`,
      customer_focus_archive: `客户关注点档案：${String(contact?.keyConcerns || '').trim() || '暂无（可在客户关注点SWOT中补充）'}`,
      contact_persona: `联系人：${target.name}\n职位：${target.title || '-'}\n角色：${target.roleTag}\n态度：${target.attitudeScore}\n影响力：${target.influenceLevel}\n关系：${target.relationLevel}\n派系：${contact?.faction || '-'}`,
      email_records: contact?.email ? `联系人邮箱：${contact.email}` : '暂无邮箱记录',
      wechat_records: contact?.wechatId ? `联系人微信：${contact.wechatId}` : '暂无微信记录',
      meeting_records: '暂无会议纪要（可在后续接入会议记录数据源）',
      chat_records: '暂无聊天记录摘要（可在后续接入聊天数据源）'
    };
    const selectedCtx = (matchedRule?.contextSources || []).filter(Boolean);
    const backgroundText = selectedCtx.length > 0
      ? selectedCtx.map((k) => `[${k}]\n${contextMap[k] || '-'}`).join('\n\n')
      : '';
    const prompt = template
      .replace(/\{customer_id\}/g, customerId)
      .replace(/\{customer_name\}/g, customerName || customerId)
      .replace(/\{contact_name\}/g, target.name || '')
      .replace(/\{position\}/g, target.title || '')
      .replace(/\{roleTag\}/g, target.roleTag || '')
      .replace(/\{attitudeScore\}/g, String(target.attitudeScore ?? 0))
      .replace(/\{influenceLevel\}/g, String(target.influenceLevel ?? 3))
      .replace(/\{relationLevel\}/g, String(target.relationLevel ?? 2))
      .replace(/\{contact_phone\}/g, String(contact?.phone || ''))
      .replace(/\{contact_email\}/g, String(contact?.email || ''));
    const finalPrompt = `${backgroundText ? `请结合以下背景信息：\n${backgroundText}\n\n` : ''}${prompt}`;
    const text = await callAiProxy(finalPrompt);
    return { text: text || '暂无建议，请稍后重试。', ruleName: matchedRule?.name || '默认策略' };
  };

  const handleFollowSuggestion = async (target: CustomerStakeholder) => {
    try {
      setSuggestionTarget(target);
      setSuggestionOpen(true);
      setSuggestionLoading(true);
      const result = await generateFollowSuggestionText(target);
      setSuggestionRuleName(result.ruleName);
      setSuggestionText(result.text);
    } catch (e) {
      console.error(e);
      setSuggestionText('生成建议失败，请稍后重试。');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleGenerateDetailFollowStrategy = async () => {
    if (!detailTarget) return;
    try {
      setSuggestionLoading(true);
      const result = await generateFollowSuggestionText(detailTarget);
      const source = findContactByStakeholder(detailTarget);
      const sourceContactId = source?.id || detailTarget.contactId || detailTarget.id.replace(/^contact_/, '');
      await saveCustomerContactToSupabase(customerId, {
        id: sourceContactId,
        name: String(source?.name || detailTarget.name || ''),
        position: String(source?.position || detailTarget.title || ''),
        phone: String(source?.phone || ''),
        email: String(source?.email || ''),
        wechatId: String(source?.wechatId || ''),
        faction: String(source?.faction || ''),
        managerContactId: String(source?.managerContactId || ''),
        roleTag: (source?.roleTag || detailTarget.roleTag || 'I') as any,
        attitudeToUs: String(source?.attitudeToUs || '中性评价') as any,
        attitudeScore: Number(source?.attitudeScore ?? detailTarget.attitudeScore ?? 0) as any,
        influenceLevel: Number(source?.influenceLevel ?? detailTarget.influenceLevel ?? 3),
        relationLevel: Number(source?.relationLevel ?? detailTarget.relationLevel ?? 2) as any,
        hometown: String(source?.hometown || ''),
        hobbies: Array.isArray(source?.hobbies) ? source?.hobbies : [],
        familySituation: String(source?.familySituation || ''),
        personality: String(source?.personality || ''),
        preferences: String(source?.preferences || ''),
        keyConcerns: String(source?.keyConcerns || ''),
        graduationSchool: String(source?.graduationSchool || ''),
        followStrategy: result.text,
        videoChannelProfile: String(source?.videoChannelProfile || ''),
        douyinProfile: String(source?.douyinProfile || ''),
        xiaohongshuProfile: String(source?.xiaohongshuProfile || ''),
        socialMediaBehavior: String(source?.socialMediaBehavior || '')
      });
      const rows = await fetchCustomerContactsFromSupabase(customerId);
      setContactItems(rows as any);
      toast.success(`已生成并保存跟进策略（${result.ruleName}）`);
    } catch (error) {
      console.error(error);
      toast.error('跟进策略生成失败');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const generateVisitTask = async () => {
    if (!suggestionTarget) return;
    const task = {
      id: `T${Date.now()}`,
      title: `客户拜访：${suggestionTarget.name}`,
      description: suggestionText || '',
      taskType: '客户拜访',
      sourceType: 'customer',
      status: '待办',
      checked: false,
      urgency: '正常',
      dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      associatedCustomerId: customerId,
      associatedCustomerName: customerName || customerId,
      associatedContactId: suggestionTarget.contactId || suggestionTarget.id.replace(/^contact_/, ''),
      associatedContactName: suggestionTarget.name,
      aiSuggestions: [suggestionText],
      createDate: new Date().toISOString().split('T')[0],
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system'
    } as any;
    try {
      await saveTasksSnapshotToSupabase([task], 'task_center');
      toast.success('已生成客户拜访任务');
    } catch (e) {
      console.error(e);
      toast.error('任务生成失败');
    }
  };

  const childrenMap = useMemo(() => workingStakeholders.reduce<Record<string, CustomerStakeholder[]>>((acc, cur) => {
    if (!cur.managerStakeholderId) return acc;
    if (!acc[cur.managerStakeholderId]) acc[cur.managerStakeholderId] = [];
    acc[cur.managerStakeholderId].push(cur);
    return acc;
  }, {}), [workingStakeholders]);

  const roots = useMemo(() => workingStakeholders.filter((s) => !s.managerStakeholderId || !workingStakeholders.some((x) => x.id === s.managerStakeholderId)), [workingStakeholders]);
  const filteredStakeholders = useMemo(() => workingStakeholders.filter((s) => {
    const matchRole = roleFilter === 'ALL' || s.roleTag === roleFilter;
    const matchKeyword = !keyword.trim() || `${s.name} ${s.title || ''}`.toLowerCase().includes(keyword.toLowerCase());
    return matchRole && matchKeyword;
  }), [workingStakeholders, roleFilter, keyword]);

  const renderOrgNode = (item: CustomerStakeholder, level = 0): React.ReactNode => (
    <div key={`org_${item.id}`} className="space-y-1">
      <button
        type="button"
        onClick={() => setDetailTarget(item)}
        style={{ marginLeft: `${level * 24}px` }}
        className="w-full relative p-2 rounded-lg border border-indigo-100 bg-indigo-50/40 text-xs text-gray-700 flex items-center gap-2 text-left hover:bg-indigo-100/60 transition-colors"
      >
        {level > 0 && <span className="absolute -left-4 top-1/2 w-3 border-t border-indigo-200" />}
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="font-bold text-gray-900">{item.name}</span>
        <span className="text-gray-500">{item.title || '未填写职位'}</span>
        <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-100">角色:{item.roleTag}</span>
      </button>
      {(childrenMap[item.id] || []).map((child) => renderOrgNode(child, level + 1))}
    </div>
  );

  const getRoleLabel = (role?: string) => {
    const map: Record<string, string> = { A: '审批者', D: '决策者', S: '支持者', E: '评估者', I: '影响者' };
    return map[String(role || 'I')] || '影响者';
  };

  const getAttitudeBadge = (score?: number) => {
    const v = Number(score ?? 0);
    if (v >= 1) return { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: `态度 ${v}（正向）` };
    if (v <= -1) return { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: `态度 ${v}（风险）` };
    return { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: '态度 0（观望）' };
  };

  const showDeepHelp = (key: keyof typeof SCORE_HELP_DEEP) => {
    window.alert(SCORE_HELP_DEEP[key]);
  };

  const getManagerName = (s: CustomerStakeholder) => {
    if (!s.managerStakeholderId) return '-';
    const manager = workingStakeholders.find((x) => x.id === s.managerStakeholderId);
    return manager?.name || '-';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-3">{compact ? '客户架构（MVP简版）' : '客户权力地图（MVP）'}</h3>
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            <div className="flex items-start gap-1" title={SCORE_HELP.roleTag}><CircleHelp className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />角色说明：{SCORE_HELP.roleTag}</div>
            <div className="flex items-start gap-1" title={SCORE_HELP.attitudeScore}><CircleHelp className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />态度评分：{SCORE_HELP.attitudeScore}</div>
            <div className="flex items-start gap-1" title={SCORE_HELP.influenceLevel}><CircleHelp className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />影响力评分：{SCORE_HELP.influenceLevel}</div>
            <div className="flex items-start gap-1" title={SCORE_HELP.relationLevel}><CircleHelp className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />关系评分：{SCORE_HELP.relationLevel}</div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">默认仅展示组织架构图中的联系人，点击“新增联系人”后弹出字段填写。</div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openCreateContactModal} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm font-bold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" />
              新增联系人
            </button>
            <button
              onClick={handleQuickCreateByAi}
              disabled={aiCollectingId === '__quick_create__'}
              className="px-3 py-2 border border-indigo-200 text-indigo-700 bg-white rounded text-sm font-bold disabled:opacity-60"
            >
              {aiCollectingId === '__quick_create__' ? 'AI搜集中...' : '新联系人AI搜集'}
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800 flex gap-6">
          <div>干系人数：<span className="font-bold">{workingStakeholders.length}</span></div>
          <div>平均态度分：<span className="font-bold">{healthSummary.avgAttitude.toFixed(2)}</span></div>
          <div>关键风险人数（A/D且≤0）：<span className="font-bold">{healthSummary.riskCount}</span></div>
        </div>
      )}

      {!compact && (
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名/职位"
            className="px-3 py-1.5 border border-gray-200 rounded text-xs"
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="px-2 py-1.5 border border-gray-200 rounded text-xs">
            <option value="ALL">全部角色</option>
            <option value="A">A 审批者</option>
            <option value="D">D 决策者</option>
            <option value="S">S 支持者</option>
            <option value="E">E 评估者</option>
            <option value="I">I 影响者</option>
          </select>
        </div>
        {filteredStakeholders.length === 0 ? (
          <p className="text-sm text-gray-400">暂无干系人，请先新增。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStakeholders.map((s) => (
            <div key={s.id} className={`p-3 border rounded-lg flex items-center justify-between ${['A', 'D'].includes(s.roleTag) && s.attitudeScore <= 0 ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100'}`}>
              <div className="space-y-1">
                <div className="text-sm font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  <UserRound className="w-4 h-4 text-indigo-500" />
                  {editingId === s.id ? (
                    <>
                      <input value={String(editDraft.name || '')} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="px-2 py-1 border border-gray-200 rounded text-xs" />
                      <input value={String(editDraft.position || '')} onChange={(e) => setEditDraft({ ...editDraft, position: e.target.value })} placeholder="职位" className="px-2 py-1 border border-gray-200 rounded text-xs" />
                      <button onClick={handleSaveBaseInfo} className="px-2 py-1 text-xs border border-indigo-200 text-indigo-600 rounded">保存</button>
                    </>
                  ) : (
                    <>
                      {s.name}
                      <span className="text-xs text-gray-500">{s.title || ''}</span>
                      <button onClick={() => startEditStakeholder(s)} className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500">修改</button>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  角色:{s.roleTag} | 态度:{s.attitudeScore} | 影响力:{s.influenceLevel} | 关系:{s.relationLevel}
                </div>
              </div>
              <button onClick={() => handleFollowSuggestion(s)} className="px-2 py-1 text-xs border border-indigo-200 text-indigo-600 rounded flex items-center gap-1">
                <Save className="w-3 h-3" />
                跟进建议
              </button>
            </div>
          ))}
          </div>
        )}
      </div>
      )}

      {workingStakeholders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2">组织架构图</h4>
          <div className="space-y-1">
            {roots.map((root) => renderOrgNode(root))}
          </div>
        </div>
      )}

      {!compact && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-gray-900 mb-2">最近评估记录</h4>
          <div className="space-y-2">
            {assessments.slice(0, 5).map((a) => (
              <div key={a.id} className="text-xs p-2 rounded border border-gray-100 bg-gray-50">
                {a.assessmentDate} | 态度:{a.attitudeScore ?? '-'} | 权力:{a.powerScore ?? '-'} | 关系:{a.relationScore ?? '-'} | 结论:{a.conclusion || '无'}
              </div>
            ))}
            {assessments.length === 0 && <div className="text-xs text-gray-400">暂无评估记录</div>}
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">联系人详情</h4>
              <div className="flex items-center gap-2">
                {(() => {
                  const contact = findContactByStakeholder(detailTarget);
                  const canAnalyzeSocial = Boolean(
                    String(contact?.videoChannelProfile || '').trim() ||
                    String(contact?.douyinProfile || '').trim() ||
                    String(contact?.xiaohongshuProfile || '').trim()
                  );
                  return (
                <button
                  type="button"
                  onClick={() => {
                    const contact = findContactByStakeholder(detailTarget);
                    if (contact) handleAnalyzeSocialForExisting(contact);
                  }}
                  disabled={!canAnalyzeSocial || aiCollectingId === String(findContactByStakeholder(detailTarget)?.id || '')}
                  className="px-2 py-1 text-[11px] rounded border border-indigo-200 bg-white text-indigo-700 disabled:opacity-60"
                  title={canAnalyzeSocial ? '基于已填写社媒账号进行搜集分析' : '请先填写至少一个社媒账号后再分析'}
                >
                  {aiCollectingId === String(findContactByStakeholder(detailTarget)?.id || '') ? 'AI搜集中...' : '社媒搜集分析'}
                </button>
                  );
                })()}
                <button onClick={() => setDetailTarget(null)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/40">
              <div className="text-xs font-bold text-gray-600 mb-2">基础信息</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">姓名：</span><span className="font-medium text-gray-900">{detailTarget.name || '-'}</span></div>
                <div><span className="text-gray-500">职位：</span><span className="font-medium text-gray-900">{detailTarget.title || '-'}</span></div>
                <div><span className="text-gray-500">电话：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.phone || '-'}</span></div>
                <div><span className="text-gray-500">邮箱：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.email || '-'}</span></div>
                <div><span className="text-gray-500">微信：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.wechatId || '-'}</span></div>
                <div><span className="text-gray-500">派系：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.faction || '-'}</span></div>
                <div><span className="text-gray-500">毕业院校：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.graduationSchool || '-'}</span></div>
                <div><span className="text-gray-500">上级：</span><span className="font-medium text-gray-900">{getManagerName(detailTarget)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 bg-white">
              <div className="text-xs font-bold text-gray-600 mb-2 flex items-center justify-between">
                <span>关系评分</span>
                <button
                  type="button"
                  onClick={() => window.alert([SCORE_HELP_DEEP.roleTag, '', SCORE_HELP_DEEP.attitudeScore, '', SCORE_HELP_DEEP.influenceLevel, '', SCORE_HELP_DEEP.relationLevel].join('\n'))}
                  className="text-[11px] px-2 py-0.5 rounded border border-indigo-200 bg-white text-indigo-700"
                >
                  ? 评分细则
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <span className="px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-700">角色 {detailTarget.roleTag}（{getRoleLabel(detailTarget.roleTag)}）</span>
                <span className={`px-2 py-1 rounded border ${getAttitudeBadge(detailTarget.attitudeScore).cls}`}>{getAttitudeBadge(detailTarget.attitudeScore).label}</span>
                <span className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-700">影响力 {detailTarget.influenceLevel}</span>
                <span className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-700">关系 {detailTarget.relationLevel}</span>
              </div>
              <div className="text-[11px] text-gray-500 space-y-1">
                <div>角色：{getRoleLabel(detailTarget.roleTag)}，决定其在采购链路中的职责。</div>
                <div>态度：{Number(detailTarget.attitudeScore ?? 0) >= 1 ? '正向支持' : Number(detailTarget.attitudeScore ?? 0) <= -1 ? '存在阻力' : '中立观望'}。</div>
                <div>影响力：{detailTarget.influenceLevel} 分，越高越影响最终结论。</div>
                <div>关系：{detailTarget.relationLevel} 级，越高代表我方触达与信任更稳定。</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/40">
              <div className="text-xs font-bold text-gray-600 mb-2">个人画像</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">籍贯：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.hometown || '-'}</span></div>
                <div><span className="text-gray-500">兴趣：</span><span className="font-medium text-gray-900">{(findContactByStakeholder(detailTarget)?.hobbies || []).join('、') || '-'}</span></div>
                <div><span className="text-gray-500">性格：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.personality || '-'}</span></div>
                <div><span className="text-gray-500">偏好：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.preferences || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-500">家庭情况：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.familySituation || '-'}</span></div>
                <div className="col-span-2"><span className="text-gray-500">关注点：</span><span className="font-medium text-gray-900">{findContactByStakeholder(detailTarget)?.keyConcerns || '-'}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 bg-white">
              <div className="text-xs font-bold text-gray-600 mb-2">社媒行为</div>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><span className="text-gray-500">视频号：</span><span className="font-medium text-gray-900 whitespace-pre-wrap break-words">{findContactByStakeholder(detailTarget)?.videoChannelProfile || '-'}</span></div>
                <div><span className="text-gray-500">抖音：</span><span className="font-medium text-gray-900 whitespace-pre-wrap break-words">{findContactByStakeholder(detailTarget)?.douyinProfile || '-'}</span></div>
                <div><span className="text-gray-500">小红书：</span><span className="font-medium text-gray-900 whitespace-pre-wrap break-words">{findContactByStakeholder(detailTarget)?.xiaohongshuProfile || '-'}</span></div>
                <div><span className="text-gray-500">行为摘要：</span><span className="font-medium text-gray-900 whitespace-pre-wrap break-words">{findContactByStakeholder(detailTarget)?.socialMediaBehavior || '-'}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 bg-white">
              <div className="text-xs font-bold text-gray-600 mb-2 flex items-center justify-between gap-2">
                <span>跟进策略</span>
                <button
                  type="button"
                  onClick={handleGenerateDetailFollowStrategy}
                  disabled={suggestionLoading}
                  className="px-2 py-1 text-[11px] rounded border border-emerald-200 bg-white text-emerald-700 disabled:opacity-60"
                >
                  {suggestionLoading ? '生成中...' : 'AI生成策略'}
                </button>
              </div>
              <div className="max-h-[180px] overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 border border-gray-100 rounded p-2">
                {findContactByStakeholder(detailTarget)?.followStrategy || '暂无跟进策略，可点击上方“AI生成策略”。'}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDetailTarget(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded">关闭</button>
              <button onClick={() => { setDetailTarget(null); startEditStakeholder(detailTarget); }} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded">编辑</button>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[72vh] overflow-y-auto bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">{editingId === NEW_CONTACT_EDIT_ID ? '新增联系人（组织架构）' : '修改联系人与架构信息'}</h4>
              <div className="flex items-center gap-2">
                {editingId === NEW_CONTACT_EDIT_ID && (
                  <button
                    type="button"
                    onClick={() => applyAiContactResult(editDraft)}
                    disabled={aiCollectingId === String(editDraft.id || editingId || 'draft')}
                    className="px-2.5 py-1 text-xs rounded border border-indigo-200 bg-white text-indigo-700 disabled:opacity-60"
                  >
                    {aiCollectingId === String(editDraft.id || editingId || 'draft') ? 'AI搜集中...' : 'AI搜集'}
                  </button>
                )}
                <button onClick={() => setEditingId('')} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-gray-200 p-3 bg-white">
                <div className="text-xs font-bold text-gray-600 mb-2">基础信息</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={String(editDraft.name || '')} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="姓名" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.position || '')} onChange={(e) => setEditDraft({ ...editDraft, position: e.target.value })} placeholder="职位" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.phone || '')} onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })} placeholder="电话" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.email || '')} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} placeholder="邮箱" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.wechatId || '')} onChange={(e) => setEditDraft({ ...editDraft, wechatId: e.target.value })} placeholder="微信号" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.faction || '')} onChange={(e) => setEditDraft({ ...editDraft, faction: e.target.value })} placeholder="派系" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.graduationSchool || '')} onChange={(e) => setEditDraft({ ...editDraft, graduationSchool: e.target.value })} placeholder="毕业院校" className="px-2 py-2 border border-gray-200 rounded" />
                  <select value={String(editDraft.managerContactId || '')} onChange={(e) => setEditDraft({ ...editDraft, managerContactId: e.target.value })} className="px-2 py-2 border border-gray-200 rounded">
                    <option value="">无上级</option>
                    {workingStakeholders.filter((x) => x.id !== editingId).map((s) => (
                      <option key={s.id} value={String(s.contactId || s.id.replace(/^contact_/, ''))}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/40">
                <div className="text-xs font-bold text-gray-600 mb-2">个人画像</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={String(editDraft.hometown || '')} onChange={(e) => setEditDraft({ ...editDraft, hometown: e.target.value })} placeholder="籍贯" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={Array.isArray(editDraft.hobbies) ? editDraft.hobbies.join('，') : ''} onChange={(e) => setEditDraft({ ...editDraft, hobbies: e.target.value.split(/[，,]/).map((x) => x.trim()).filter(Boolean) })} placeholder="兴趣（逗号分隔）" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.personality || '')} onChange={(e) => setEditDraft({ ...editDraft, personality: e.target.value })} placeholder="性格特点" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.familySituation || '')} onChange={(e) => setEditDraft({ ...editDraft, familySituation: e.target.value })} placeholder="家庭情况" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.preferences || '')} onChange={(e) => setEditDraft({ ...editDraft, preferences: e.target.value })} placeholder="偏好" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.keyConcerns || '')} onChange={(e) => setEditDraft({ ...editDraft, keyConcerns: e.target.value })} placeholder="关键关注点" className="px-2 py-2 border border-gray-200 rounded" />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 bg-white">
                <div className="text-xs font-bold text-gray-600 mb-2">社媒账号与行为</div>
                <div className="grid grid-cols-1 gap-2">
                  <input value={String(editDraft.videoChannelProfile || '')} onChange={(e) => setEditDraft({ ...editDraft, videoChannelProfile: e.target.value })} placeholder="视频号账号/主页链接/简介" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.douyinProfile || '')} onChange={(e) => setEditDraft({ ...editDraft, douyinProfile: e.target.value })} placeholder="抖音账号/主页链接/简介" className="px-2 py-2 border border-gray-200 rounded" />
                  <input value={String(editDraft.xiaohongshuProfile || '')} onChange={(e) => setEditDraft({ ...editDraft, xiaohongshuProfile: e.target.value })} placeholder="小红书账号/主页链接/简介" className="px-2 py-2 border border-gray-200 rounded" />
                  <textarea value={String(editDraft.socialMediaBehavior || '')} onChange={(e) => setEditDraft({ ...editDraft, socialMediaBehavior: e.target.value })} placeholder="社媒行为摘要（关注方向、内容偏好、活跃主题）" className="px-2 py-2 border border-gray-200 rounded min-h-[84px]" />
                </div>
              </div>

              <div className="rounded border border-indigo-100 bg-indigo-50/40 p-2 text-xs text-gray-700">
                <div className="font-bold text-indigo-700 mb-1">关系评分四项（字段对应）</div>
                <div>角色 = 决策链身份；态度 = 对我方立场；影响力 = 对结果影响；关系 = 与我方关系深度。</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button type="button" onClick={() => showDeepHelp('roleTag')} className="px-2 py-0.5 rounded border border-indigo-200 bg-white text-indigo-700 flex items-center gap-1"><CircleHelp className="w-3.5 h-3.5" />角色说明</button>
                  <button type="button" onClick={() => showDeepHelp('attitudeScore')} className="px-2 py-0.5 rounded border border-indigo-200 bg-white text-indigo-700 flex items-center gap-1"><CircleHelp className="w-3.5 h-3.5" />态度说明</button>
                  <button type="button" onClick={() => showDeepHelp('influenceLevel')} className="px-2 py-0.5 rounded border border-indigo-200 bg-white text-indigo-700 flex items-center gap-1"><CircleHelp className="w-3.5 h-3.5" />影响力说明</button>
                  <button type="button" onClick={() => showDeepHelp('relationLevel')} className="px-2 py-0.5 rounded border border-indigo-200 bg-white text-indigo-700 flex items-center gap-1"><CircleHelp className="w-3.5 h-3.5" />关系说明</button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 bg-white">
                <div className="text-xs font-bold text-gray-600 mb-2">关系评分</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">角色（A/D/S/E/I）</label>
                <select value={String(editDraft.roleTag || 'I')} onChange={(e) => setEditDraft({ ...editDraft, roleTag: e.target.value as any })} className="w-full px-2 py-2 border border-gray-200 rounded">
                <option value="A">A</option><option value="D">D</option><option value="S">S</option><option value="E">E</option><option value="I">I</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">态度（-2~+2）</label>
                <select value={String(editDraft.attitudeScore ?? 0)} onChange={(e) => setEditDraft({ ...editDraft, attitudeScore: Number(e.target.value) as any })} className="w-full px-2 py-2 border border-gray-200 rounded">
                <option value="2">+2</option><option value="1">+1</option><option value="0">0</option><option value="-1">-1</option><option value="-2">-2</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">影响力（1~5）</label>
                <input type="number" min={1} max={5} value={String(editDraft.influenceLevel || 3)} onChange={(e) => setEditDraft({ ...editDraft, influenceLevel: Number(e.target.value) })} className="w-full px-2 py-2 border border-gray-200 rounded" placeholder="影响力" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">关系（1~4）</label>
                <select value={String(editDraft.relationLevel || 2)} onChange={(e) => setEditDraft({ ...editDraft, relationLevel: Number(e.target.value) as any })} className="w-full px-2 py-2 border border-gray-200 rounded">
                <option value="1">关系1</option><option value="2">关系2</option><option value="3">关系3</option><option value="4">关系4</option>
                </select>
              </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingId('')} className="px-3 py-1.5 text-sm border border-gray-200 rounded">取消</button>
              <button onClick={handleSaveBaseInfo} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded">{editingId === NEW_CONTACT_EDIT_ID ? '保存新增' : '保存修改'}</button>
            </div>
          </div>
        </div>
      )}

      {suggestionOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">跟进建议{suggestionTarget ? ` - ${suggestionTarget.name}` : ''}</h4>
              <button onClick={() => setSuggestionOpen(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="text-xs text-indigo-600">匹配策略：{suggestionRuleName || '-'}</div>
            <div className="h-[220px] overflow-y-auto border border-gray-100 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50">
              {suggestionLoading ? '正在生成跟进建议...' : suggestionText || '暂无建议'}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSuggestionOpen(false)} className="px-3 py-1.5 text-sm border border-gray-200 rounded">关闭</button>
              <button onClick={generateVisitTask} disabled={!suggestionText || suggestionLoading} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">生成客户拜访任务</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
