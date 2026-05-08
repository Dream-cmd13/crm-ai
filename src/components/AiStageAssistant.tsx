import React, { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronDown, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { TodoTask } from '../types';
import { fetchArchitectureDataFromSupabase } from '../lib/architectureRepository';
import { callAiProxy } from '../lib/aiProxy';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { hasSopTaskForSource, saveTasksSnapshotToSupabase } from '../lib/taskRepository';
import { toast } from 'react-hot-toast';

type StageKind = 'inquiry' | 'lead' | 'opportunity' | 'project';

interface StageItem {
  id: string;
  name: string;
  goal: string;
  approachContext: string;
  blockPrompt: string;
  canvasTasks: string[];
  oqarOpenings: string[];
  taskCanvasItems: Array<{
    id: string;
    label: string;
    required?: boolean;
    questionPrompt?: string;
    taskPrompt?: string;
    taskTemplate?: string;
    completionRule?: string;
  }>;
  oqarPromptText: string;
  oqar?: {
    enabled?: boolean;
    globalTemplate?: string;
    openingPrompt?: string;
    openingCount?: number;
    followupPrompt?: string;
    minClosedQuestions?: number;
    minOpenQuestions?: number;
    feedbackTypePrompts?: Record<string, { answerTemplate?: string; mustAsk?: string[] }>;
  };
}

interface AiStageAssistantProps {
  kind: StageKind;
  title?: string;
  sourceType?: TodoTask['sourceType'];
  sourceId?: string;
  customerId?: string;
  customerName?: string;
  currentUser?: { id: string; name: string; employeeNo?: string };
  sourceRecord?: Record<string, any>;
}

const kindToObjectCode: Record<StageKind, string> = {
  inquiry: 'crm_inquiry',
  lead: 'crm_lead',
  opportunity: 'crm_opportunity',
  project: 'crm_project'
};

const kindToObjectAliases: Record<StageKind, string[]> = {
  inquiry: ['crm_inquiry', 'inquiry', 'inquiries', '询盘', '询盘登记', '询盘管理'],
  lead: ['crm_lead', 'lead', 'leads', '线索'],
  opportunity: ['crm_opportunity', 'opportunity', 'opportunities', '商机'],
  project: ['crm_project', 'project', 'projects', '项目']
};

const normalizeObjectCode = (code?: string) =>
  String(code || '')
    .replace(/^crm_/i, '')
    .replace(/^ba_/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const matchObjectByKind = (obj: any, kind: StageKind) => {
  const aliases = kindToObjectAliases[kind];
  const normalizedAliases = aliases.map((a) => normalizeObjectCode(a));
  const codeNorm = normalizeObjectCode(obj?.code);
  const nameNorm = normalizeObjectCode(obj?.name);
  const rawName = String(obj?.name || '').trim();
  return (
    normalizedAliases.includes(codeNorm) ||
    normalizedAliases.includes(nameNorm) ||
    aliases.some((alias) => rawName.includes(alias))
  );
};

const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];
const BLOCK_JSON_SUFFIX = [
  '请严格输出JSON，不要附加解释。',
  'JSON格式：{"canvasTasks":["作业任务1","作业任务2","作业任务3"]}',
  '每条任务要可执行、可落地，字数控制在20~45字。'
].join('\n');

const OQAR_HARDCODED_PROMPT = [
  '你是资深大客户销售教练。',
  '请基于输入的阶段目标与完成建议，输出美观、可直接发送的 OQAR 提问话术。',
  'OQAR 每条必须含四段：Observe / Qualify / Answer / Request。',
  '文字要求专业、礼貌、简洁，避免空泛套话。',
  '请严格输出JSON：{"oqarOpenings":["...","...","..."]}，不要附加解释。'
].join('\n');

const OQAR_QA_JSON_SUFFIX = [
  '请严格输出JSON，不要附加解释。',
  'JSON格式：{"questionAnalysis":"...","answerSuggestion":"..."}',
  'questionAnalysis 输出“客户回答含义分析”，answerSuggestion 输出“建议回复话术（基于OQAR）”。'
].join('\n');

const DEFAULT_OQAR_QA_PROMPT = [
  '你是资深大客户销售教练，请按OQAR体系处理问答。',
  '输入默认参数：我方提问（{question}）+ 客户回答（{answer}）+ 当前SOP任务内容（{sop_tasks}）。',
  '请结合客户画像、联系人画像、当前本体字段、近期沟通上下文进行判断。',
  '输出要求：',
  '1) questionAnalysis：重点分析客户回答的真实含义（诉求/约束/风险/情绪信号），并指出我方提问是否承接到位；',
  '2) answerSuggestion：给可直接发送给客户的话术，按 Observe/Qualify/Answer/Request 组织。'
].join('\n');

const REF_LANGUAGE_PROMPT = [
  '你是资深ToB销售沟通顾问。',
  '请把输入的话术改写成“更温和、自然、尊重客户”的一句话表达。',
  '要求：',
  '1) 保留原始意图，不改变承诺边界；',
  '2) 每条都必须是单句，避免分段和条目；',
  '3) 输出3种不同语气版本（稳健版/共情版/推进版）；',
  '4) 禁止出现 OQAR、Observe、Qualify、Answer、Request 等标签。',
  '请严格输出JSON，不要附加解释：{"options":["方案1","方案2","方案3"]}'
].join('\n');

const getRecordField = (record: Record<string, any>, fieldCode?: string) => {
  const key = String(fieldCode || '').trim();
  if (!key) return '';
  const value = record?.[key];
  return value === null || value === undefined ? '' : String(value);
};

const toPrettyOqar = (text: string) => {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (raw.includes('Observe') || raw.includes('O：') || raw.includes('【Observe】')) return raw;
  return [
    `【Observe】${raw}`,
    '【Qualify】当前信息完整度还不够，需要进一步确认关键约束。',
    '【Answer】基于您刚才的信息，我们建议先明确目标优先级，再锁定下一步动作。',
    '【Request】您更希望先确定时间计划，还是先确认验收标准？'
  ].join('\n');
};

const normalizeDisplayText = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDisplayText(item)).filter(Boolean).join('\n').trim();
  }
  if (typeof value === 'object') {
    const o = value as Record<string, any>;
    const structured = [
      o.observe || o.Observe || o.O,
      o.qualify || o.Qualify || o.Q,
      o.answer || o.Answer || o.A,
      o.request || o.Request || o.R
    ].map((v) => normalizeDisplayText(v)).filter(Boolean);
    if (structured.length > 0) {
      const [ob, qu, an, re] = structured;
      return [
        ob ? `【Observe】${ob}` : '',
        qu ? `【Qualify】${qu}` : '',
        an ? `【Answer】${an}` : '',
        re ? `【Request】${re}` : ''
      ].filter(Boolean).join('\n');
    }
    return '';
  }
  return '';
};

const stripOqarLabel = (value: string) => {
  return String(value || '')
    .replace(/OQAR/gi, '')
    .replace(/【?\s*Observe\s*】?/gi, '')
    .replace(/【?\s*Qualify\s*】?/gi, '')
    .replace(/【?\s*Answer\s*】?/gi, '')
    .replace(/【?\s*Request\s*】?/gi, '')
    .replace(/^\s*[OQAR]\s*[:：]\s*/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const parseOqarSections = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return [] as Array<{ title: string; content: string }>;
  const normalized = raw
    .replace(/【\s*(Observe|Qualify|Answer|Request)\s*】/gi, '\n$1: ')
    .replace(/\r/g, '')
    .trim();
  const regex = /(Observe|Qualify|Answer|Request)\s*[:：]\s*([\s\S]*?)(?=(?:\n\s*(?:Observe|Qualify|Answer|Request)\s*[:：])|$)/gi;
  const sections: Array<{ title: string; content: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    const title = String(match[1] || '').trim();
    const content = String(match[2] || '').trim();
    if (title && content) sections.push({ title, content });
  }
  return sections;
};

const buildSuggestionCacheKey = (kind: StageKind, sourceId?: string, customerId?: string, sopId?: string) =>
  `crm.sop_suggestion_cache.${kind}.${sourceId || 'no_source'}.${customerId || 'no_customer'}.${sopId || 'no_sop'}`;

const SOP_CACHE_MODULE = 'sop_standard_cache';

const buildSuggestionTaskId = (kind: StageKind, sourceId?: string, customerId?: string, sopId?: string) =>
  `SOPCACHE_${kind}_${sourceId || customerId || 'no_source'}_${sopId || 'no_sop'}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);

export default function AiStageAssistant({
  kind,
  title,
  sourceType,
  sourceId,
  customerId,
  customerName,
  currentUser,
  sourceRecord
}: AiStageAssistantProps) {
  const [stages, setStages] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchGeneratedAt, setBatchGeneratedAt] = useState('');
  const [sopTemplates, setSopTemplates] = useState<any[]>([]);
  const [selectedSopId, setSelectedSopId] = useState('');
  const [sopGenerated, setSopGenerated] = useState(false);
  const [creatingSopTask, setCreatingSopTask] = useState(false);
  const [hasExistingSopTask, setHasExistingSopTask] = useState(false);
  const [selectedSuggestedQuestion, setSelectedSuggestedQuestion] = useState('');
  const [myQuestion, setMyQuestion] = useState('');
  const [customerQuestion, setCustomerQuestion] = useState('');
  const [oqarSuggestion, setOqarSuggestion] = useState('');
  const [oqarQuestionAnalysis, setOqarQuestionAnalysis] = useState('');
  const [oqarAnswerSuggestion, setOqarAnswerSuggestion] = useState('');
  const [askingOqar, setAskingOqar] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refDialogLoading, setRefDialogLoading] = useState(false);
  const [refDialogTitle, setRefDialogTitle] = useState('参考语言');
  const [refOptions, setRefOptions] = useState<string[]>([]);
  const [refRawInput, setRefRawInput] = useState('');
  const suggestionCacheKey = useMemo(
    () => buildSuggestionCacheKey(kind, sourceId, customerId, selectedSopId),
    [kind, sourceId, customerId, selectedSopId]
  );
  const suggestionTaskId = useMemo(
    () => buildSuggestionTaskId(kind, sourceId, customerId, selectedSopId),
    [kind, sourceId, customerId, selectedSopId]
  );

  const fetchLatestCommunicationLines = async () => {
    if (!isSupabaseConfigured()) return [] as string[];
    const supabase = getSupabaseClient();
    try {
      let rows: any[] = [];
      if (customerId) {
        const { data, error } = await supabase
          .from('crm_communication_log')
          .select('date,created_at,sender,type,content,customer_id,source_id')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(12);
        if (error) throw error;
        rows = Array.isArray(data) ? data : [];
      }
      if (rows.length === 0 && sourceId) {
        const { data, error } = await supabase
          .from('crm_communication_log')
          .select('date,created_at,sender,type,content,customer_id,source_id')
          .eq('source_id', sourceId)
          .order('created_at', { ascending: false })
          .limit(12);
        if (error) throw error;
        rows = Array.isArray(data) ? data : [];
      }
      return rows
        .map((row) => {
          const d = String(row?.date || row?.created_at || '').slice(0, 10);
          const sender = String(row?.sender || row?.type || '客户');
          const content = String(row?.content || '').trim();
          if (!content) return '';
          return `${d} ${sender}: ${content}`.trim();
        })
        .filter(Boolean)
        .slice(0, 10);
    } catch (error) {
      console.warn('fetch communication failed, fallback empty', error);
      return [];
    }
  };

  const fetchCustomerBackground = async () => {
    if (!isSupabaseConfigured() || !customerId) {
      return { customerProfile: '', contactPersona: '' };
    }
    const supabase = getSupabaseClient();
    try {
      const [{ data: customerRows }, { data: contactRows }] = await Promise.all([
        supabase.from('ba_manucustinfo').select('*').eq('id', customerId).limit(1),
        supabase.from('crm_customer_contact').select('name,position,phone,email,customer_id').eq('customer_id', customerId).limit(8)
      ]);
      const customer = customerRows?.[0] || {};
      const customerProfileLines = [
        `客户名称：${customer?.name || customerName || customerId}`,
        `行业：${customer?.industry || ''}`,
        `客户等级：${customer?.level || ''}`,
        `区域：${customer?.region || ''}`,
        `状态：${customer?.status || ''}`,
        `主营范围：${customer?.business_scope || ''}`
      ].filter((x) => !x.endsWith('：'));
      const contactPersonaLines = Array.isArray(contactRows)
        ? contactRows.map((c: any) => `${c?.name || ''} ${c?.position || ''} ${c?.phone || ''} ${c?.email || ''}`.trim()).filter(Boolean)
        : [];
      return {
        customerProfile: customerProfileLines.join('\n'),
        contactPersona: contactPersonaLines.join('\n')
      };
    } catch (e) {
      console.warn('fetch customer background failed', e);
      return { customerProfile: '', contactPersona: '' };
    }
  };

  const buildContextLines = (selectedSources: string[], chats: string[], customerProfile: string, contactPersona: string) => {
    const contextLines: string[] = [];
    if (selectedSources.includes('customer_name')) {
      contextLines.push(`客户名称：${customerName || customerId || '未知客户'}`);
    }
    if (selectedSources.includes('customer_profile')) {
      contextLines.push(`客户画像：\n${customerProfile || '暂无客户画像'}`);
    }
    if (selectedSources.includes('contact_persona')) {
      contextLines.push(`联系人画像：\n${contactPersona || '暂无联系人画像'}`);
    }
    if (selectedSources.includes('current_ontology_fields')) {
      const fieldLines = Object.entries(sourceRecord || {})
        .slice(0, 30)
        .map(([k, v]) => `- ${k}: ${v === null || v === undefined ? '' : String(v)}`);
      contextLines.push(`当前本体字段：\n${fieldLines.join('\n') || '暂无'}`);
    }
    if (selectedSources.includes('chat_records')) {
      contextLines.push(`最新聊天记录：\n${chats.length > 0 ? chats.join('\n') : '暂无聊天记录'}`);
    }
    return contextLines;
  };

  const saveSopSuggestionToSupabase = async (stagesToSave: StageItem[], generatedAt: string) => {
    if (!isSupabaseConfigured()) return;
    if (!selectedSopId || (!sourceId && !customerId)) return;
    const supabase = getSupabaseClient();
    const todayDate = today();
    const creatorId = currentUser?.id || 'system';
    const creatorName = currentUser?.name || '系统';
    const payload = {
      id: suggestionTaskId,
      title: `[SOP标准缓存] ${selectedSop?.name || kind}`,
      description: '单据SOP标准内容与建议缓存',
      module: SOP_CACHE_MODULE,
      related_id: sourceId || customerId || '',
      source_type: sourceType || kind,
      source_id: sourceId || null,
      task_type: 'SOP标准缓存',
      status: '已完成',
      importance: '中',
      urgency: '正常',
      create_date: todayDate,
      creator_id: creatorId,
      creator_name: creatorName,
      updated_at: new Date().toISOString(),
      auxiliary_json: {
        kind,
        sourceId: sourceId || null,
        customerId: customerId || null,
        customerName: customerName || null,
        sopTemplateId: selectedSopId,
        sopTemplateName: selectedSop?.name || null,
        generatedAt,
        stages: stagesToSave
      }
    };
    const { error } = await supabase.from('crm_task').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  };

  const loadSopSuggestionFromSupabase = async () => {
    if (!isSupabaseConfigured()) return null as null | { stages: StageItem[]; generatedAt: string };
    if (!selectedSopId) return null;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('crm_task')
      .select('auxiliary_json, updated_at')
      .eq('id', suggestionTaskId)
      .eq('module', SOP_CACHE_MODULE)
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    const aux = row?.auxiliary_json || {};
    const stagesFromDb = Array.isArray(aux?.stages) ? aux.stages : [];
    const sortedStages = [...stagesFromDb].sort((a: any, b: any) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true })
    );
    const generatedAt = String(aux?.generatedAt || '').trim() || String(row?.updated_at || '').replace('T', ' ').slice(0, 19);
    if (sortedStages.length === 0) return null;
    return { stages: sortedStages as StageItem[], generatedAt };
  };

  const buildOqarSummary = (oqar?: StageItem['oqar']) => {
    if (!oqar || oqar.enabled === false) return '';
    const lines: string[] = [];
    if (oqar.globalTemplate) lines.push(`模板：${oqar.globalTemplate}`);
    lines.push(`最少封闭问题：${Number(oqar.minClosedQuestions ?? 1)}`);
    lines.push(`最少开放问题：${Number(oqar.minOpenQuestions ?? 1)}`);
    const feedback = oqar.feedbackTypePrompts || {};
    Object.keys(feedback).forEach((key) => {
      const conf = feedback[key] || {};
      const ask = Array.isArray(conf.mustAsk) ? conf.mustAsk.join('；') : '';
      lines.push(`${key}：${String(conf.answerTemplate || '')}${ask ? `；必问：${ask}` : ''}`);
    });
    return lines.join('\n');
  };

  const selectedSop = useMemo(
    () => sopTemplates.find((flow) => String(flow?.id) === selectedSopId) || null,
    [sopTemplates, selectedSopId]
  );

  const parseBatchResult = (raw: string) => {
    const text = String(raw || '').trim();
    if (!text) return [] as Array<{ blockId: string; canvasTasks: string[]; oqarOpenings: string[] }>;
    const pickPayload = () => {
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
        if (!match) return null;
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    };
    const payload = pickPayload();
    if (!payload) return [];
    const blocks = Array.isArray((payload as any).blocks) ? (payload as any).blocks : [];
    return blocks.map((item: any) => ({
      blockId: String(item?.blockId || ''),
      canvasTasks: Array.isArray(item?.canvasTasks) ? item.canvasTasks.map((v: any) => normalizeDisplayText(v)).filter(Boolean) : [],
      oqarOpenings: Array.isArray(item?.oqarOpenings) ? item.oqarOpenings.map((v: any) => normalizeDisplayText(v)).filter(Boolean) : []
    })).filter((item: any) => item.blockId);
  };

  const parseOqarResult = (raw: string) => {
    const text = String(raw || '').trim();
    if (!text) return [] as string[];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray((parsed as any)?.oqarOpenings)) {
        return (parsed as any).oqarOpenings.map((v: any) => toPrettyOqar(normalizeDisplayText(v))).filter(Boolean);
      }
    } catch {
      const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray((parsed as any)?.oqarOpenings)) {
            return (parsed as any).oqarOpenings.map((v: any) => toPrettyOqar(normalizeDisplayText(v))).filter(Boolean);
          }
        } catch {
          // ignore
        }
      }
    }
    return text
      .split(/\n+/)
      .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
      .map((line) => toPrettyOqar(line));
  };

  const parseOqarQaResult = (raw: string) => {
    const text = String(raw || '').trim();
    if (!text) return { questionAnalysis: '', answerSuggestion: '' };
    const parsePayload = () => {
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
        if (!match) return null;
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    };
    const payload = parsePayload();
    if (payload && typeof payload === 'object') {
      const analysis = normalizeDisplayText(
        (payload as any).questionAnalysis || (payload as any).customerAnswerAnalysis || (payload as any).analysis || ''
      );
      const answer = normalizeDisplayText((payload as any).answerSuggestion || (payload as any).answer || '');
      return { questionAnalysis: analysis, answerSuggestion: answer };
    }
    return { questionAnalysis: '', answerSuggestion: text };
  };

  const generateSopBatchSuggestion = async () => {
    const readyStages =
      stages.length > 0
        ? stages
        : selectedSop
          ? buildCardsFromFlow(selectedSop)
          : [];
    if (readyStages.length === 0) {
      toast.error('当前SOP没有可生成的阶段块，请先配置块目标和块提示词');
      return;
    }
    if (!sopGenerated) {
      setSopGenerated(true);
      setStages(readyStages);
    }
    setBatchGenerating(true);
    try {
      const chats = await fetchLatestCommunicationLines();
      const selectedSourcesRaw = Array.isArray(selectedSop?.sopPromptConfig?.contextSources)
        ? selectedSop.sopPromptConfig.contextSources.map((k: any) => String(k || '').trim()).filter(Boolean)
        : [];
      const selectedSources = selectedSourcesRaw.filter(
        (key) => key !== 'project_solution' && key !== 'competitor_profile'
      );
      const { customerProfile, contactPersona } = await fetchCustomerBackground();
      const contextLines = buildContextLines(selectedSources, chats, customerProfile, contactPersona);
      const blockConfig = readyStages.map((stage) => ({
        blockId: stage.id,
        blockName: stage.name,
        goal: stage.goal,
        promptPrefix: String(selectedSop?.sopPromptConfig?.prefix || '').trim(),
        blockPrompt: stage.blockPrompt || ''
      }));
      const sopModelId = String(selectedSop?.sopPromptConfig?.modelId || '').trim() || undefined;
      const blockPrompt = [
        '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。',
        `阶段：${kind}`,
        `客户：${customerName || customerId || '未知客户'}`,
        `SOP模板：${selectedSop?.name || '未命名SOP'}`,
        `背景信息：\n${contextLines.join('\n\n') || '未选择额外背景'}`,
        '每个块请按以下拼接规则生成：SOP总体提示词前缀 + 块目标 + 块提示词 + 固定后缀',
        `固定后缀：\n${BLOCK_JSON_SUFFIX}`,
        `块配置(JSON)：\n${JSON.stringify(blockConfig, null, 2)}`,
        '请严格输出JSON，不要附加解释：',
        '{"blocks":[{"blockId":"<块ID>","canvasTasks":["作业任务1","作业任务2","作业任务3"]}]}'
      ].join('\n\n');
      const text = await callAiProxy(blockPrompt, sopModelId);
      const parsed = parseBatchResult(text);
      const stageWithTasks = readyStages.map((stage) => {
          const hit = parsed.find((p) => p.blockId === stage.id);
          const fallbackTasksFromCanvas = stage.taskCanvasItems
            .map((item) => item.taskTemplate || item.taskPrompt || item.questionPrompt || '')
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .slice(0, 4);
          const fallbackTasks = fallbackTasksFromCanvas.length > 0
            ? fallbackTasksFromCanvas
            : [
                `围绕“${stage.goal || stage.name}”梳理本轮推进动作并明确负责人和时间点。`,
                `结合最新客户沟通记录，补齐关键信息并更新下一步跟进计划。`
              ];
          return {
            ...stage,
            canvasTasks: hit?.canvasTasks?.length ? hit.canvasTasks : fallbackTasks,
            oqarOpenings: []
          };
        });

      const oqarResults = await Promise.all(
        stageWithTasks.map(async (stage) => {
          const prompt = [
            OQAR_HARDCODED_PROMPT,
            `阶段：${kind}`,
            `SOP模板：${selectedSop?.name || '未命名SOP'}`,
            `块名称：${stage.name}`,
            `块目标：${stage.goal}`,
            `块完成建议：\n${stage.canvasTasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
            `补充聊天上下文：\n${chats.length > 0 ? chats.join('\n') : '暂无聊天记录'}`
          ].join('\n\n');
          const raw = await callAiProxy(prompt, sopModelId);
          const openings = parseOqarResult(raw);
          return { blockId: stage.id, openings };
        })
      );

      const finalStages = stageWithTasks.map((stage) => {
          const found = oqarResults.find((row) => row.blockId === stage.id);
          const fallbackOpenings = [
            [
              `【Observe】关于“${stage.goal || stage.name}”，我先确认您当前最优先关注的结果。`,
              '【Qualify】我们需要先识别推进中的关键约束、时点和资源边界。',
              `【Answer】建议先按以下动作推进：${stage.canvasTasks.slice(0, 2).join('；') || '先明确目标再安排动作。'}`,
              '【Request】您更希望先明确时间节点，还是先确认验收标准？'
            ].join('\n')
          ];
          return {
            ...stage,
            oqarOpenings: found && found.openings.length > 0 ? found.openings : fallbackOpenings
          };
        });
      const generatedAt = new Date().toLocaleString();
      setStages(finalStages);
      setBatchGeneratedAt(generatedAt);
      try {
        localStorage.setItem(
          suggestionCacheKey,
          JSON.stringify({ stages: finalStages, generatedAt, savedAt: new Date().toISOString() })
        );
      } catch (e) {
        console.warn('save sop suggestion cache failed', e);
      }
      try {
        await saveSopSuggestionToSupabase(finalStages, generatedAt);
      } catch (e) {
        console.warn('save sop suggestion to supabase failed', e);
      }
      toast.success('SOP建议已自动保存');
    } catch (error) {
      console.error('generate sop batch suggestion failed', error);
      toast.error('SOP建议生成失败');
    } finally {
      setBatchGenerating(false);
    }
  };

  const askSopOqar = async () => {
    const ourQuestion = String(myQuestion || '').trim();
    const clientQuestion = String(customerQuestion || '').trim();
    if (!ourQuestion) {
      toast.error('请先填写我方提问');
      return;
    }
    if (!clientQuestion) {
      toast.error('请先填写客户问题');
      return;
    }
    setAskingOqar(true);
    setOqarQuestionAnalysis('');
    setOqarAnswerSuggestion('');
    try {
      const chats = await fetchLatestCommunicationLines();
      const selectedSources = Array.isArray(selectedSop?.sopPromptConfig?.contextSources)
        ? selectedSop.sopPromptConfig.contextSources.map((k: any) => String(k || '').trim()).filter(Boolean)
        : [];
      const { customerProfile, contactPersona } = await fetchCustomerBackground();
      const contextLines = buildContextLines(selectedSources, chats, customerProfile, contactPersona);
      const sopUnifiedPrompt = String(
        selectedSop?.sopOqarConfig?.unifiedPrompt
        || selectedSop?.sopOqarConfig?.replyPrompt
        || ''
      ).trim();
      const finalPrompt = sopUnifiedPrompt || DEFAULT_OQAR_QA_PROMPT;

      const stageSummary = stages
        .map((stage) => `${stage.name}：${stage.goal}`)
        .filter(Boolean)
        .join('\n');
      const sopTaskSummary = stages
        .map((stage) => {
          const tasks = Array.isArray(stage.canvasTasks) ? stage.canvasTasks.filter(Boolean) : [];
          return `${stage.name}：${tasks.length > 0 ? tasks.join('；') : '暂无任务建议'}`;
        })
        .join('\n');
      const prompt = [
        finalPrompt,
        `阶段：${kind}`,
        `客户：${customerName || customerId || '未知客户'}`,
        `SOP模板：${selectedSop?.name || '未命名SOP'}`,
        `SOP标准概览：\n${stageSummary || '未生成SOP标准'}`,
        `当前SOP任务内容：\n${sopTaskSummary || '暂无SOP任务内容'}`,
        `我方提问：${ourQuestion}`,
        `客户回答：${clientQuestion}`,
        `背景信息：\n${contextLines.join('\n\n') || '未选择额外背景'}`,
        `固定后缀：\n${OQAR_QA_JSON_SUFFIX}`,
      ].join('\n\n');
      const sopModelId = String(selectedSop?.sopPromptConfig?.modelId || '').trim() || undefined;
      const text = await callAiProxy(prompt, sopModelId);
      const parsedQa = parseOqarQaResult(text);
      if (parsedQa.questionAnalysis || parsedQa.answerSuggestion) {
        setOqarQuestionAnalysis(parsedQa.questionAnalysis);
        setOqarAnswerSuggestion(parsedQa.answerSuggestion ? toPrettyOqar(parsedQa.answerSuggestion) : '');
        setOqarSuggestion('');
      } else {
        const openings = parseOqarResult(text);
        setOqarSuggestion(openings.length > 0 ? openings.join('\n\n') : toPrettyOqar(String(text || '').trim()));
      }
    } catch (error) {
      console.error('ask oqar failed', error);
      toast.error('OQAR 建议生成失败');
    } finally {
      setAskingOqar(false);
    }
  };

  const buildCardsFromFlow = (flow: any): StageItem[] => {
    const cards: StageItem[] = [];
    const sortedNodes = [...(flow?.nodes || [])].sort((a: any, b: any) => 
      String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true })
    );
    sortedNodes
      .forEach((node: any) => {
        const manual = node?.manualConfig || {};
        const automatic = node?.automaticConfig || {};
        const canvasItems = Array.isArray(manual?.discoveryCanvas?.items) ? manual.discoveryCanvas.items : [];
        const goals = Array.isArray(manual?.aiConfig?.goals) ? manual.aiConfig.goals : [];
        const goalText =
          String(manual?.stageOutput || manual?.output || '').trim() ||
          String(node?.description || '').trim() ||
          String(node?.name || 'SOP标准').trim();
        const approachParts: string[] = [];
        const blockPrompt =
          String(manual?.aiConfig?.promptTemplate || '').trim() ||
          String(automatic?.promptTemplate || '').trim();
        if (blockPrompt) approachParts.push(blockPrompt);
        goals.forEach((goal: any) => {
          const goalPrompt = String(goal?.prompt || '').trim();
          if (goalPrompt) approachParts.push(goalPrompt);
        });
        cards.push({
          id: String(node?.id || `card_${cards.length + 1}`),
          name: String(node?.name || `结构化卡片${cards.length + 1}`),
          goal: goalText || '请补充该SOP标准目标',
          approachContext: approachParts.join('\n'),
          blockPrompt,
          canvasTasks: [],
          oqarOpenings: [],
          oqarPromptText: String(manual?.oqarAssist?.promptTemplate || manual?.oqarAssist?.globalTemplate || '').trim(),
          taskCanvasItems: canvasItems.map((item: any, idx: number) => ({
            id: String(item?.id || `${node?.id || 'node'}_canvas_${idx}`),
            label: String(item?.label || `待补充项${idx + 1}`),
            required: Boolean(item?.required),
            questionPrompt: String(item?.questionPrompt || ''),
            taskPrompt: String(item?.taskPrompt || ''),
            taskTemplate: String(item?.taskTemplate || ''),
            completionRule: String(item?.completionRule || '')
          })),
          oqar: manual?.oqarAssist
        });
      });
    return cards;
  };

  const createSopTask = async (flow: any) => {
    if (!sourceType || !sourceId) return;
    const config = flow?.sopTaskConfig || {};
    if (config?.enabled === false) return;
    const creatorId = currentUser?.id || 'EMP001';
    const creatorName = currentUser?.name || '系统管理员';
    const creatorNo = currentUser?.employeeNo || 'E001';
    const safeOffset = 3;
    const titleTemplate = String(config?.titleTemplate || '[SOP] {{sopName}} - {{customerName}}');
    const descTemplate = String(config?.descriptionTemplate || '请按SOP模板完成阶段目标推进。');
    const extraFields: string[] = Array.isArray(config?.fields) ? (config.fields as string[]).map((c) => String(c || '').trim()).filter(Boolean) : [];
    const extraSummary = extraFields.length > 0
      ? '\n\n任务字段信息：\n' + extraFields.map((code) => `- ${code}: ${getRecordField(sourceRecord || {}, code)}`).join('\n')
      : '';
    let task: TodoTask = {
      id: `SOP_${flow?.id || 'flow'}_${Date.now()}`,
      title: titleTemplate
        .replace('{{sopName}}', String(flow?.name || 'SOP模板'))
        .replace('{{customerName}}', String(customerName || customerId || '客户')),
      description: (descTemplate
        .replace('{{sopName}}', String(flow?.name || 'SOP模板'))
        .replace('{{customerName}}', String(customerName || customerId || '客户'))) + extraSummary,
      status: '待办',
      dueDate: addDays(today(), safeOffset),
      assignee: creatorName,
      assigneeId: creatorId,
      assigneeName: creatorName,
      importance: '中',
      urgency: '正常',
      taskType: String(config?.taskType || '普通任务'),
      sourceType,
      sourceId,
      associatedCustomerId: customerId,
      associatedCustomerName: customerName,
      creatorId,
      creatorNo,
      creatorName,
      createDate: today(),
      originatingFlowId: flow?.id,
      originatingFlowName: flow?.name,
      auxiliaryData: {
        sopTemplateId: flow?.id,
        sopTemplateName: flow?.name,
        sopOqarConfig: flow?.sopOqarConfig || null,
        sopPromptConfig: flow?.sopPromptConfig || null,
        progressionCheckConfig: flow?.progressionCheck || null,
        sourceSnapshot: sourceRecord || null,
        sopTaskFieldMappings: Array.isArray(config?.fieldMappings) ? config.fieldMappings : [],
        sopBlocks: buildCardsFromFlow(flow).map((card) => ({
          id: card.id,
          name: card.name,
          goal: card.goal,
          blockPrompt: card.blockPrompt
        }))
      }
    };

    const fieldMappings = Array.isArray(config?.fieldMappings)
      ? (config.fieldMappings as Array<{ taskField?: string; sourceField?: string }>)
      : [];
    fieldMappings.forEach((mapping) => {
      const taskField = String(mapping?.taskField || '').trim();
      const sourceField = String(mapping?.sourceField || '').trim();
      if (!taskField || !sourceField) return;
      const value = getRecordField(sourceRecord || {}, sourceField);
      if (!value) return;
      if (taskField === 'task.title') task = { ...task, title: value };
      if (taskField === 'task.description') task = { ...task, description: value };
      if (taskField === 'task.taskType') task = { ...task, taskType: value };
      if (taskField === 'task.assigneeName') task = { ...task, assignee: value, assigneeName: value };
      if (taskField === 'task.dueDate') task = { ...task, dueDate: value };
      if (taskField === 'task.importance' && ['高', '中', '低'].includes(value)) task = { ...task, importance: value as any };
      if (taskField === 'task.urgency' && ['紧急', '正常', '暂缓'].includes(value)) task = { ...task, urgency: value as any };
    });
    await saveTasksSnapshotToSupabase([task], 'task_center');
  };

  const handleGenerateSop = async () => {
    if (!selectedSop) return;
    setSopGenerated(true);
    setStages(buildCardsFromFlow(selectedSop));
  };

  const handleCreateSopTask = async () => {
    if (!selectedSop) return;
    if (hasExistingSopTask) {
      toast.error('当前单据已转过SOP任务，不能重复转任务');
      return;
    }
    setCreatingSopTask(true);
    try {
      const exists = await hasSopTaskForSource(sourceType || kind, sourceId);
      if (exists) {
        setHasExistingSopTask(true);
        toast.error('当前单据已转过SOP任务，不能重复转任务');
        return;
      }
      await createSopTask(selectedSop);
      setHasExistingSopTask(true);
      toast.success('已按SOP转任务');
    } catch (error) {
      console.error('create sop task failed', error);
      toast.error('SOP转任务失败');
    } finally {
      setCreatingSopTask(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const checkExistingSopTask = async () => {
      try {
        const exists = await hasSopTaskForSource(sourceType || kind, sourceId);
        if (mounted) setHasExistingSopTask(exists);
      } catch (error) {
        console.warn('check existing sop task failed', error);
      }
    };
    checkExistingSopTask();
    return () => {
      mounted = false;
    };
  }, [kind, sourceType, sourceId]);

  useEffect(() => {
    let mounted = true;
    const loadFromArchitecture = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { objects } = await fetchArchitectureDataFromSupabase();
        const targetCode = normalizeObjectCode(kindToObjectCode[kind]);
        const targetObject = objects.find((obj: any) => {
          const byAlias = matchObjectByKind(obj, kind);
          const byLegacy =
            normalizeObjectCode(obj?.code) === targetCode ||
            normalizeObjectCode(obj?.name) === targetCode;
          return byAlias || byLegacy;
        });
        if (mounted) {
          const flows = Array.isArray(targetObject?.flows) ? targetObject.flows : [];
          const matched = flows.filter((flow: any) => buildCardsFromFlow(flow).length > 0);
          setSopTemplates(matched);
          const defaultFlow = matched[0] || null;
          setSelectedSopId(defaultFlow?.id || '');
          if (defaultFlow?.triggerType === 'auto') {
            setSopGenerated(true);
            setStages(buildCardsFromFlow(defaultFlow));
          } else {
            setSopGenerated(false);
            setStages([]);
          }
        }
      } catch (error) {
        if (mounted) setLoadError((error as Error)?.message || '加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadFromArchitecture();
    return () => {
      mounted = false;
    };
  }, [kind, sourceRecord]);

  useEffect(() => {
    if (!selectedSopId) return;
    const flow = sopTemplates.find((f) => String(f?.id) === selectedSopId);
    if (!flow) return;
    setMyQuestion('');
    setCustomerQuestion('');
    setOqarSuggestion('');
    setOqarQuestionAnalysis('');
    setOqarAnswerSuggestion('');
    setSelectedSuggestedQuestion('');
    if (flow.triggerType === 'auto') {
      setSopGenerated(true);
      setStages(buildCardsFromFlow(flow));
    } else {
      setSopGenerated(false);
      setStages([]);
    }
  }, [selectedSopId, sopTemplates]);

  useEffect(() => {
    if (!selectedSopId) return;
    let mounted = true;
    const loadSuggestion = async () => {
      try {
        const fromDb = await loadSopSuggestionFromSupabase();
        if (!mounted) return;
        if (fromDb && fromDb.stages.length > 0) {
          setStages(fromDb.stages);
          setSopGenerated(true);
          if (fromDb.generatedAt) setBatchGeneratedAt(fromDb.generatedAt);
          return;
        }
      } catch (e) {
        console.warn('load sop suggestion from supabase failed', e);
      }
      try {
        const raw = localStorage.getItem(suggestionCacheKey);
        if (!raw || !mounted) return;
        const parsed = JSON.parse(raw || '{}');
        const cachedStages = Array.isArray(parsed?.stages) ? parsed.stages : [];
        const sortedCached = [...cachedStages].sort((a: any, b: any) => 
          String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true })
        );
        const generatedAt = String(parsed?.generatedAt || '').trim();
        if (sortedCached.length === 0) return;
        setStages(sortedCached);
        setSopGenerated(true);
        if (generatedAt) setBatchGeneratedAt(generatedAt);
      } catch (e) {
        console.warn('load sop suggestion cache failed', e);
      }
    };
    loadSuggestion();
    return () => {
      mounted = false;
    };
  }, [selectedSopId, suggestionCacheKey, suggestionTaskId]);

  const generatedCount = useMemo(
    () => stages.filter((s) => s.canvasTasks.length > 0 || s.oqarOpenings.length > 0).length,
    [stages]
  );
  const suggestedQuestionOptions = useMemo(() => {
    const fromSop: string[] = [];
    const fromGenerated = stages
      .flatMap((stage) => (Array.isArray(stage.oqarOpenings) ? stage.oqarOpenings : []))
      .map((q) => String(q || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromSop, ...fromGenerated])).slice(0, 12);
  }, [selectedSop, stages]);
  const linkedTaskOqarPairs = (stage: StageItem) => {
    const maxLen = Math.max(stage.canvasTasks.length, stage.oqarOpenings.length);
    return Array.from({ length: maxLen }, (_, idx) => ({
      task: stage.canvasTasks[idx] || '',
      oqar: stage.oqarOpenings[idx] || stage.oqarOpenings[0] || ''
    })).filter((x) => x.task || x.oqar);
  };

  const copyText = async (text: string, tip: string) => {
    const clean = stripOqarLabel(text);
    if (!clean) {
      toast.error('没有可复制内容');
      return;
    }
    try {
      await navigator.clipboard.writeText(clean);
      toast.success(tip);
    } catch {
      toast.error('复制失败，请检查浏览器权限');
    }
  };

  const parseRefLanguageOptions = (raw: string) => {
    const text = String(raw || '').trim();
    if (!text) return [] as string[];
    const pickPayload = () => {
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
        if (!match) return null;
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    };
    const payload = pickPayload();
    if (payload && Array.isArray((payload as any).options)) {
      return (payload as any).options
        .map((x: any) => stripOqarLabel(String(x || '').trim()))
        .filter(Boolean)
        .slice(0, 3);
    }
    return text
      .split(/\n+/)
      .map((line) => stripOqarLabel(line.replace(/^\s*[-*\d.、)\]]+\s*/g, '').trim()))
      .filter(Boolean)
      .slice(0, 3);
  };

  const openRefLanguageDialog = async (sourceText: string, titleText: string) => {
    const cleanInput = stripOqarLabel(sourceText);
    if (!cleanInput) {
      toast.error('没有可生成的参考话术');
      return;
    }
    setRefDialogOpen(true);
    setRefDialogLoading(true);
    setRefDialogTitle(titleText);
    setRefRawInput(cleanInput);
    setRefOptions([]);
    try {
      const prompt = [
        REF_LANGUAGE_PROMPT,
        `原始话术：${cleanInput}`
      ].join('\n\n');
      const raw = await callAiProxy(prompt);
      const options = parseRefLanguageOptions(raw);
      if (options.length === 0) {
        throw new Error('未生成可用参考话术');
      }
      setRefOptions(options);
    } catch (error) {
      console.error('generate reference language failed', error);
      toast.error('参考语言生成失败');
      setRefOptions([cleanInput]);
    } finally {
      setRefDialogLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
            <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
            {title || 'SOP标准'}
          </h3>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
              已生成块 {generatedCount}/{stages.length || 0}
            </span>
            {sopTemplates.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedSopId}
                  onChange={(e) => setSelectedSopId(e.target.value)}
                  className="appearance-none text-xs pl-2 pr-7 py-1 rounded border border-gray-300 bg-white text-gray-700 max-w-[130px] sm:max-w-none text-ellipsis"
                >
                  {sopTemplates.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-1.5 pointer-events-none" />
              </div>
            )}
            {selectedSop?.triggerType !== 'auto' && (
              <button
                type="button"
                onClick={handleGenerateSop}
                disabled={!selectedSop || creatingSopTask}
                className="text-xs px-2.5 py-1 rounded border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${creatingSopTask ? 'animate-spin' : ''}`} />
                生成 SOP
              </button>
            )}
            <button
              type="button"
              onClick={handleCreateSopTask}
              disabled={!selectedSop || creatingSopTask || selectedSop?.sopTaskConfig?.enabled === false || hasExistingSopTask}
              className="text-xs px-2.5 py-1 rounded border border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              title={selectedSop?.sopTaskConfig?.enabled === false ? '该SOP已关闭任务创建' : hasExistingSopTask ? '当前单据已转过任务' : '将当前SOP转为任务'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${creatingSopTask ? 'animate-spin' : ''}`} />
              {hasExistingSopTask ? '已转任务' : 'SOP转任务'}
            </button>
            <button
              type="button"
              onClick={generateSopBatchSuggestion}
              disabled={batchGenerating || !selectedSop}
              className="text-xs px-2.5 py-1 rounded border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${batchGenerating ? 'animate-spin' : ''}`} />
              {batchGeneratedAt ? '重新生成SOP建议' : '生成SOP建议'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {loading && <div className="text-sm text-gray-500">正在加载架构配置...</div>}
        {!loading && loadError && <div className="text-sm text-red-600">加载失败：{loadError}</div>}
        {!loading && !loadError && sopTemplates.length === 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            当前本体尚未配置可用的 SOP 模板。请到“标准设置 / SOP / 手工块”配置块目标与任务画布。
          </div>
        )}
        {!loading && !loadError && sopTemplates.length > 0 && !sopGenerated && selectedSop?.triggerType !== 'auto' && (
          <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            当前 SOP 模板为手动触发，请点击“生成 SOP”展示阶段块，再点击“SOP转任务”创建任务。
          </div>
        )}
        {batchGeneratedAt ? (
          <div className="text-[11px] text-gray-500">最近批量生成：{batchGeneratedAt}</div>
        ) : null}
        {sopGenerated && (
          <div className="grid grid-cols-1 gap-4">
            {stages.map((stage, stageIdx) => {
              const pairs = linkedTaskOqarPairs(stage);
              return (
                <div key={stage.id} className="border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4 bg-gradient-to-br from-white to-slate-50/40 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0 whitespace-nowrap">
                          阶段{stageIdx + 1}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0 whitespace-nowrap">
                          {pairs.length} 项
                        </span>
                      </div>
                      <div className="font-bold text-gray-900 leading-tight break-words">{stage.name}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div className="text-xs font-bold text-slate-500 mb-1">块目标</div>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">{stage.goal}</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                    <div className="text-xs font-bold text-slate-600">任务画布与OQAR对应建议</div>
                    {pairs.length > 0 ? (
                      <div className="space-y-3">
                        {pairs.map((pair, idx) => (
                          <div key={`${stage.id}_pair_${idx}`} className="rounded-xl border border-cyan-100 bg-cyan-50/25 p-3">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="text-xs font-semibold text-slate-700">任务 {idx + 1}</div>
                              <button
                                type="button"
                                onClick={() => openRefLanguageDialog(pair.oqar || '', `参考语言（任务 ${idx + 1}）`)}
                                className="text-[11px] px-2 py-1 rounded border border-cyan-300 text-cyan-800 bg-white hover:bg-cyan-100 flex items-center gap-1 whitespace-nowrap"
                              >
                                <Copy className="w-3 h-3 shrink-0" />
                                参考语言
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <div className="text-[11px] text-slate-500 mb-1">任务画布建议</div>
                                <div className="text-sm leading-6 text-slate-900 whitespace-pre-wrap">{pair.task || '—'}</div>
                              </div>
                              <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-2.5">
                                <div className="text-[11px] text-cyan-700 mb-1">对应话术</div>
                                {pair.oqar ? (
                                  (() => {
                                    const sections = parseOqarSections(pair.oqar);
                                    if (sections.length === 0) {
                                      return <div className="text-sm leading-6 text-cyan-900 whitespace-pre-wrap">{pair.oqar}</div>;
                                    }
                                    return (
                                      <div className="space-y-2">
                                        {sections.map((section, sectionIdx) => (
                                          <div key={`${stage.id}_pair_${idx}_section_${sectionIdx}`} className="rounded border border-cyan-100 bg-white/70 p-2">
                                            <div className="text-xs font-bold text-cyan-800">{section.title}</div>
                                            <div className="text-sm leading-6 text-cyan-900 whitespace-pre-wrap mt-1">{section.content}</div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <div className="text-sm leading-6 text-cyan-900">请先生成SOP建议后查看。</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">点击“生成SOP建议”后批量生成任务画布与对应OQAR话术。</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sopGenerated && selectedSop && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 space-y-3">
            <div className="text-sm font-bold text-cyan-900">统一 OQAR 回复</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-cyan-900 mb-1">建议提问（可选）</label>
                <div className="max-h-44 overflow-y-auto rounded border border-cyan-200 bg-white p-2 space-y-1">
                  {suggestedQuestionOptions.length === 0 && (
                    <div className="text-sm text-gray-500 px-1 py-2">暂无建议提问，请先生成SOP建议。</div>
                  )}
                  {suggestedQuestionOptions.map((q, idx) => {
                    const active = selectedSuggestedQuestion === q;
                    return (
                      <button
                        key={`suggested_q_${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedSuggestedQuestion(q);
                          setMyQuestion(q);
                        }}
                        className={`w-full text-left rounded px-2 py-1.5 text-sm leading-6 border ${
                          active
                            ? 'border-cyan-400 bg-cyan-50 text-cyan-900'
                            : 'border-transparent hover:border-cyan-200 text-gray-800'
                        }`}
                      >
                        {idx + 1}. {q}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-cyan-900 mb-1">我方提问</label>
                <input
                  value={myQuestion}
                  onChange={(e) => setMyQuestion(e.target.value)}
                  placeholder="可先选择建议提问，再按实际场景微调"
                  className="w-full text-base px-3 py-2.5 rounded border border-cyan-400 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-cyan-900 mb-1">客户回答</label>
              <textarea
                value={customerQuestion}
                onChange={(e) => setCustomerQuestion(e.target.value)}
                placeholder="输入客户当前回答或反馈"
                className="w-full text-base border border-cyan-400 rounded px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 min-h-[88px] focus:outline-none focus:ring-2 focus:ring-cyan-300"
              />
            </div>
            <button
              type="button"
              onClick={askSopOqar}
              disabled={askingOqar}
              className="text-xs px-2.5 py-1 rounded border border-cyan-300 text-cyan-900 bg-white hover:bg-cyan-100 disabled:opacity-50"
            >
              {askingOqar ? '生成中...' : '生成建议 OQAR'}
            </button>
            {(oqarQuestionAnalysis || oqarAnswerSuggestion || oqarSuggestion) ? (
              <div className="space-y-2">
                {oqarQuestionAnalysis ? (
                  <div className="text-sm whitespace-pre-wrap bg-white border border-cyan-200 rounded p-3 text-gray-800">
                    <div className="text-xs font-bold text-cyan-800 mb-1">客户回答含义分析</div>
                    {oqarQuestionAnalysis}
                  </div>
                ) : null}
                {oqarAnswerSuggestion ? (
                  <div className="text-sm whitespace-pre-wrap bg-white border border-cyan-200 rounded p-3 text-gray-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-cyan-800">建议回复话术</div>
                      <button
                        type="button"
                        onClick={() => openRefLanguageDialog(oqarAnswerSuggestion, '参考语言（建议回复话术）')}
                        className="text-[11px] px-2 py-0.5 rounded border border-cyan-300 text-cyan-800 bg-white hover:bg-cyan-100 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Copy className="w-3 h-3 shrink-0" />
                        参考语言
                      </button>
                    </div>
                    {oqarAnswerSuggestion}
                  </div>
                ) : null}
                {!oqarQuestionAnalysis && !oqarAnswerSuggestion && oqarSuggestion ? (
                  <div className="text-sm whitespace-pre-wrap bg-white border border-cyan-200 rounded p-3 text-gray-800">{oqarSuggestion}</div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-cyan-800">将基于“我方提问 + 客户回答 + 背景信息 + 当前SOP标准 + 当前SOP任务内容”生成两块结果：客户回答含义分析、建议回复话术。</div>
            )}
          </div>
        )}

        <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 mt-0.5" />
          <span>SOP 建议按整份模板批量生成；OQAR改为SOP级统一问答。</span>
        </div>
      </div>
      {refDialogOpen && (
        <div className="fixed inset-0 z-[70] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="font-bold text-gray-900">{refDialogTitle}</div>
              <button
                type="button"
                onClick={() => setRefDialogOpen(false)}
                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap">
                原始话术：{refRawInput}
              </div>
              {refDialogLoading ? (
                <div className="text-sm text-gray-500">正在生成参考语言...</div>
              ) : (
                <div className="space-y-2">
                  {refOptions.map((item, idx) => (
                    <div key={`ref_opt_${idx}`} className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold text-cyan-800">方案 {idx + 1}</div>
                        <button
                          type="button"
                          onClick={() => copyText(item, `已复制方案 ${idx + 1}`)}
                          className="text-[11px] px-2 py-0.5 rounded border border-cyan-300 text-cyan-800 bg-white hover:bg-cyan-100"
                        >
                          复制
                        </button>
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{item}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
