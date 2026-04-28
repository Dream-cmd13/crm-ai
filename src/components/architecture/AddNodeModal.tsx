import React, { useEffect, useState } from 'react';
import { Property, AIInputParameter, AIGoalConfig } from '../../types/ontology';
import { AiContextConfig, AiContextSource } from '../AiContextConfig';
import { cn } from '../../lib/utils';
import { X, Bot, Cpu, User, Link as LinkIcon, Check, Plus, Trash2, Sparkles } from 'lucide-react';
import { getEnabledModels } from '../../lib/llmConfig';
import { SandboxTestModal } from './SandboxTestModal';
import { fetchPersonaAiConfig } from '../../lib/personaAiConfigRepository';
import { fetchLlmConfigFromSupabase } from '../../lib/llmConfigRepository';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  readOnly?: boolean;
  onEnableDesign?: () => void;
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  type: 'automatic' | 'manual' | 'push_down' | 'condition';
  setType: (v: 'automatic' | 'manual' | 'push_down' | 'condition') => void;
  condition: string;
  setCondition: (v: string) => void;
  conditionResults: { id: string; label: string; value: string }[];
  setConditionResults: (v: { id: string; label: string; value: string }[]) => void;
  taskType: string;
  setTaskType: (v: string) => void;
  availableTaskTypes?: string[];
  isAiAssisted: boolean;
  setIsAiAssisted: (v: boolean) => void;
  // Automatic Config
  autoApiEndpoint: string;
  setAutoApiEndpoint: (v: string) => void;
  autoApiKey: string;
  setAutoApiKey: (v: string) => void;
  autoOutputFormat: string;
  setAutoOutputFormat: (v: string) => void;
  autoPromptTemplate: string;
  setAutoPromptTemplate: (v: string) => void;
  autoActions: any[];
  setAutoActions: (v: any[]) => void;
  
  aiOntologyObject: string;
  setAiOntologyObject: (v: string) => void;
  aiIdField: string;
  setAiIdField: (v: string) => void;
  aiParameters: string;
  setAiParameters: (v: string) => void;
  aiPromptTemplate: string;
  setAiPromptTemplate: (v: string) => void;
  leadSpinPromptByAction: Record<string, string>;
  setLeadSpinPromptByAction: (v: Record<string, string>) => void;
  aiInputs: AIInputParameter[];
  setAiInputs: (v: AIInputParameter[]) => void;
  aiGoals: AIGoalConfig[];
  setAiGoals: (v: AIGoalConfig[]) => void;
  aiSuccessField: string;
  setAiSuccessField: (v: string) => void;
  aiUpdates: string;
  setAiUpdates: (v: string) => void;
  aiFailureReasonField: string;
  setAiFailureReasonField: (v: string) => void;
  aiApiEndpoint: string;
  setAiApiEndpoint: (v: string) => void;
  aiApiKey: string;
  setAiApiKey: (v: string) => void;
  selectedPropertyIds: string[];
  setSelectedPropertyIds: (v: string[]) => void;
  availableProperties: Property[];
  manualTemplateId: string;
  setManualTemplateId: (v: string) => void;
  pushDownTarget: string;
  setPushDownTarget: (v: string) => void;
  pushDownMapping: string;
  setPushDownMapping: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  fieldDefaults: string;
  setFieldDefaults: (v: string) => void;
  taskCustomerMode: 'field' | 'fixed';
  setTaskCustomerMode: (v: 'field' | 'fixed') => void;
  taskCustomerIdField: string;
  setTaskCustomerIdField: (v: string) => void;
  taskCustomerNameField: string;
  setTaskCustomerNameField: (v: string) => void;
  taskFixedCustomerId: string;
  setTaskFixedCustomerId: (v: string) => void;
  taskFixedCustomerName: string;
  setTaskFixedCustomerName: (v: string) => void;
  taskAssigneeMode: 'current' | 'field' | 'fixed';
  setTaskAssigneeMode: (v: 'current' | 'field' | 'fixed') => void;
  taskAssigneeIdField: string;
  setTaskAssigneeIdField: (v: string) => void;
  taskAssigneeNameField: string;
  setTaskAssigneeNameField: (v: string) => void;
  taskFixedAssigneeId: string;
  setTaskFixedAssigneeId: (v: string) => void;
  taskFixedAssigneeName: string;
  setTaskFixedAssigneeName: (v: string) => void;
  taskDueDateMode: 'field' | 'fixed' | 'rule';
  setTaskDueDateMode: (v: 'field' | 'fixed' | 'rule') => void;
  taskDueDateField: string;
  setTaskDueDateField: (v: string) => void;
  taskFixedDueDate: string;
  setTaskFixedDueDate: (v: string) => void;
  taskOffsetDays: string;
  setTaskOffsetDays: (v: string) => void;
  taskRequireConfirm: boolean;
  setTaskRequireConfirm: (v: boolean) => void;
  taskGenerateTask: boolean;
  setTaskGenerateTask: (v: boolean) => void;
  personaFieldIds: string[];
  setPersonaFieldIds: (v: string[]) => void;
  discoveryCanvasJson: string;
  setDiscoveryCanvasJson: (v: string) => void;
  oqarAssistJson: string;
  setOqarAssistJson: (v: string) => void;
}

export const AddNodeModal = ({
  isOpen, onClose, onSave,
  readOnly = false, onEnableDesign,
  name, setName, desc, setDesc,
  type, setType, condition, setCondition, conditionResults, setConditionResults, taskType, setTaskType, availableTaskTypes = [],
  isAiAssisted, setIsAiAssisted,
  autoApiEndpoint, setAutoApiEndpoint, autoApiKey, setAutoApiKey, autoOutputFormat, setAutoOutputFormat, autoPromptTemplate, setAutoPromptTemplate, autoActions, setAutoActions,
  aiOntologyObject, setAiOntologyObject, aiIdField, setAiIdField, aiParameters, setAiParameters,
  aiPromptTemplate, setAiPromptTemplate, leadSpinPromptByAction, setLeadSpinPromptByAction, aiInputs, setAiInputs,
  aiGoals, setAiGoals,
  aiSuccessField, setAiSuccessField, aiUpdates, setAiUpdates, aiFailureReasonField, setAiFailureReasonField,
  aiApiEndpoint, setAiApiEndpoint, aiApiKey, setAiApiKey,
  selectedPropertyIds, setSelectedPropertyIds, availableProperties,
  manualTemplateId, setManualTemplateId,
  pushDownTarget, setPushDownTarget, pushDownMapping, setPushDownMapping,
  role, setRole, fieldDefaults, setFieldDefaults,
  taskCustomerMode, setTaskCustomerMode, taskCustomerIdField, setTaskCustomerIdField, taskCustomerNameField, setTaskCustomerNameField,
  taskFixedCustomerId, setTaskFixedCustomerId, taskFixedCustomerName, setTaskFixedCustomerName,
  taskAssigneeMode, setTaskAssigneeMode, taskAssigneeIdField, setTaskAssigneeIdField, taskAssigneeNameField, setTaskAssigneeNameField,
  taskFixedAssigneeId, setTaskFixedAssigneeId, taskFixedAssigneeName, setTaskFixedAssigneeName,
  taskDueDateMode, setTaskDueDateMode, taskDueDateField, setTaskDueDateField, taskFixedDueDate, setTaskFixedDueDate, taskOffsetDays, setTaskOffsetDays,
  taskRequireConfirm, setTaskRequireConfirm,
  taskGenerateTask, setTaskGenerateTask,
  personaFieldIds, setPersonaFieldIds,
  discoveryCanvasJson, setDiscoveryCanvasJson
}: AddNodeModalProps) => {
  const LEAD_ACTION_OPTIONS = ['寻替代料', '寻替代品', '找货寻料', '指定料号', '指定物料'];

  const [modelOptions, setModelOptions] = useState<{ value: string; label: string }[]>([
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
    { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
    { value: 'qwen-max', label: '通义千问-Max' }
  ]);
  const [contactIdField, setContactIdField] = useState('');
  const [contactProfileFields, setContactProfileFields] = useState<string[]>(['name', 'position', 'buying_role', 'buying_mode']);
  const [communicationFields, setCommunicationFields] = useState<string[]>(['date', 'content', 'type', 'sender']);
  const [personaFields, setPersonaFields] = useState<string[]>(['scale', 'mainProducts', 'painPoints', 'rdRequirements']);
  
  const [contextSources, setContextSources] = useState<AiContextSource[]>([]);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [manualConfigTab, setManualConfigTab] = useState<'desc' | 'ai'>('desc');
  const [fieldBindings, setFieldBindings] = useState<Array<{ id: string; fieldId: string; sourceType: 'task_field' | 'task_extra' | 'fixed'; sourceValue: string }>>([]);
  const [personaFieldOptions, setPersonaFieldOptions] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedCurrentFieldCodes, setSelectedCurrentFieldCodes] = useState<string[]>([]);
  const isLeadNodeConfig = availableProperties.some((p) => ['customer_action', 'customerAction'].includes(String(p.code || '')));

  const taskFieldOptions = [
    { value: 'task.title', label: '任务标题' },
    { value: 'task.description', label: '任务描述' },
    { value: 'task.type', label: '任务类型' },
    { value: 'task.assigneeName', label: '执行人名称' },
    { value: 'task.dueDate', label: '截止时间' },
    { value: 'task.priority', label: '优先级' }
  ];
  const taskExtraFieldOptions = [
    { value: 'extra.contactName', label: '附加字段-联系人姓名' },
    { value: 'extra.contactPhone', label: '附加字段-联系人电话' },
    { value: 'extra.latestIntention', label: '附加字段-最新意向' },
    { value: 'extra.lastFollowResult', label: '附加字段-上次跟进结果' }
  ];

  useEffect(() => {
    if (isOpen) {
      const sources: AiContextSource[] = [];
      const hasPreset = (id: string) => aiInputs.some(i => i.id === id);
      const getLimit = (id: string, defaultLimit: number) => aiInputs.find(i => i.id === id)?.limit || defaultLimit;
      
      if (hasPreset('preset_cust')) sources.push({ key: 'customer_profile', enabled: true });
      if (hasPreset('preset_contact')) sources.push({ key: 'contact_persona', enabled: true });
      if (hasPreset('preset_email')) sources.push({ key: 'email_records', enabled: true, limit: getLimit('preset_email', 2) });
      if (hasPreset('preset_wechat')) sources.push({ key: 'wechat_records', enabled: true, limit: getLimit('preset_wechat', 10) });
      if (hasPreset('preset_wechat_group')) sources.push({ key: 'wechat_group_records', enabled: true, limit: getLimit('preset_wechat_group', 10) });
      if (hasPreset('preset_meeting')) sources.push({ key: 'meeting_records', enabled: true, limit: getLimit('preset_meeting', 10) });
      if (hasPreset('preset_chat')) sources.push({ key: 'chat_records', enabled: true, limit: getLimit('preset_chat', 10) });
      if (hasPreset('preset_doc')) sources.push({ key: 'current_document', enabled: true });
      if (hasPreset('preset_focus_archive')) sources.push({ key: 'customer_focus_archive', enabled: true });
      const currentFieldCodes = aiInputs
        .filter((i) => String(i?.id || '').startsWith('preset_field_'))
        .map((i) => String(i?.currentFieldCode || '').trim())
        .filter(Boolean);
      if (currentFieldCodes.length > 0) {
        sources.push({ key: 'current_ontology_fields', enabled: true });
      }
      setSelectedCurrentFieldCodes(currentFieldCodes);
      
      setContextSources(sources);
    }
  }, [isOpen, aiInputs]);

  useEffect(() => {
    if (type !== 'manual') setManualConfigTab('desc');
  }, [type]);

  useEffect(() => {
    try {
      const parsed = fieldDefaults && fieldDefaults.startsWith('{') ? JSON.parse(fieldDefaults) : {};
      const rows = Object.entries(parsed as Record<string, any>).map(([fieldId, value], idx) => ({
        id: `fb_${idx}_${Date.now()}`,
        fieldId,
        sourceType: typeof value === 'object' && value?.sourceType ? value.sourceType : 'fixed',
        sourceValue: typeof value === 'object' && value?.sourceValue ? String(value.sourceValue) : String(value || '')
      }));
      setFieldBindings(rows);
    } catch {
      setFieldBindings([]);
    }
  }, [fieldDefaults]);

  useEffect(() => {
    fetchPersonaAiConfig()
      .then((config) => {
        const fields = Array.isArray((config as any)?.fields) ? (config as any).fields : [];
        setPersonaFieldOptions(
          fields.map((item: any) => ({
            id: String(item?.id || ''),
            name: String(item?.name || ''),
            description: String(item?.description || '')
          })).filter((item: any) => item.id && item.name)
        );
      })
      .catch(() => setPersonaFieldOptions([]));
  }, []);

  useEffect(() => {
    fetchLlmConfigFromSupabase()
      .then((cfg: any) => {
        const enabledModels = getEnabledModels(cfg);
        if (enabledModels.length > 0) {
          setModelOptions(enabledModels.map((m) => ({ value: m.id, label: m.name })));
        }
      })
      .catch(() => {});
  }, []);

  const toggleField = (arr: string[], setter: (v: string[]) => void, field: string) => {
    setter(arr.includes(field) ? arr.filter(i => i !== field) : [...arr, field]);
  };

  const upsertAiInput = (next: AIInputParameter) => {
    const existed = aiInputs.find(i => i.id === next.id);
    if (existed) {
      setAiInputs(aiInputs.map(i => i.id === next.id ? next : i));
    } else {
      setAiInputs([...aiInputs, next]);
    }
  };

  const applyPresetAiInputs = () => {
    upsertAiInput({
      id: 'preset_customer_id',
      name: '客户ID',
      type: 'current_field',
      currentFieldCode: 'customerId'
    });
    upsertAiInput({
      id: 'preset_contact_profile',
      name: '联系人画像',
      type: 'ontology',
      ontologyCode: 'crm_customer_contact',
      idField: contactIdField || 'primary_contact',
      fields: contactProfileFields
    });
    upsertAiInput({
      id: 'preset_communications',
      name: '沟通记录',
      type: 'ontology',
      ontologyCode: 'crm_communication_log',
      idField: 'customer_id',
      fields: communicationFields
    });
    upsertAiInput({
      id: 'preset_persona',
      name: '客户画像',
      type: 'ontology',
      ontologyCode: 'crm_customer_persona',
      idField: 'customer_id',
      fields: personaFields
    });
  };

  const toggleProperty = (id: string) => {
    setSelectedPropertyIds(
      selectedPropertyIds.includes(id)
        ? selectedPropertyIds.filter(pid => pid !== id)
        : [...selectedPropertyIds, id]
    );
  };

  const addAiInput = () => {
    const newInput: AIInputParameter = {
      id: `in-${Date.now()}`,
      name: `参数${aiInputs.length + 1}`,
      type: 'ontology',
      ontologyCode: '',
      idField: '',
      fields: []
    };
    setAiInputs([...aiInputs, newInput]);
  };

  const removeAiInput = (id: string) => {
    setAiInputs(aiInputs.filter(i => i.id !== id));
  };

  const updateAiInput = (id: string, updates: Partial<AIInputParameter>) => {
    setAiInputs(aiInputs.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const applyNodeDesignExample = () => {
    if (type === 'condition') {
      setCondition('riskLevel');
      setConditionResults([
        { id: 'res-high', label: '高风险', value: 'high' },
        { id: 'res-mid', label: '中风险', value: 'medium' },
        { id: 'res-low', label: '低风险', value: 'low' }
      ]);
      setDesc('根据风险等级分支到不同处理路径');
      return;
    }
    if (type === 'automatic') {
      setAutoApiEndpoint('/functions/v1/ai_proxy');
      setAutoApiKey('');
      setAutoPromptTemplate('请基于输入信息输出JSON：{"intent":"", "riskLevel":"", "nextAction":""}。');
      setAutoOutputFormat('{"intent":"string","riskLevel":"high|medium|low","nextAction":"string"}');
      setAutoActions([
        { id: `act-${Date.now()}-1`, type: 'update_field', targetField: 'intent', valueSource: 'intent' },
        { id: `act-${Date.now()}-2`, type: 'update_field', targetField: 'riskLevel', valueSource: 'riskLevel' },
        { id: `act-${Date.now()}-3`, type: 'update_field', targetField: 'nextAction', valueSource: 'nextAction' }
      ]);
      setDesc('自动调用AI完成意图识别与风险判级');
      return;
    }
    if (type === 'manual') {
      setTaskType('询盘处理');
      setIsAiAssisted(true);
      setAiPromptTemplate(
        [
          '你是B2B销售作业助手，请结合阶段输入生成结构化建议。',
          '请按如下模板输出：',
          '1) 阶段目标',
          '2) 风险点（含原因）',
          '3) 下一步动作（含执行人、截止建议）',
          '4) 需补充的信息清单',
          '变量示例：{{customerId}}、{{contactProfile.rows}}、{{communications.rows}}、{{persona.rows}}'
        ].join('\n')
      );
      setAiApiEndpoint('/functions/v1/ai_proxy');
      setAiApiKey('');
      setAiInputs([
        { id: `in-${Date.now()}-1`, name: '客户ID', type: 'current_field', currentFieldCode: 'customerId' },
        { id: `in-${Date.now()}-2`, name: '联系人画像', type: 'ontology', ontologyCode: 'crm_customer_contact', idField: 'contactId', fields: ['name', 'position', 'buying_role', 'buying_mode', 'attitude'] },
        { id: `in-${Date.now()}-3`, name: '沟通记录', type: 'ontology', ontologyCode: 'crm_communication_log', idField: 'customer_id', fields: ['date', 'type', 'sender', 'content'] },
        { id: `in-${Date.now()}-4`, name: '客户画像', type: 'ontology', ontologyCode: 'crm_customer_persona', idField: 'customer_id', fields: ['scale', 'mainProducts', 'painPoints', 'rdRequirements'] }
      ]);
      setRole('业务员');
      setFieldDefaults('status:跟进中, priority:中, owner:当前处理人');
      setManualTemplateId('inquiry_followup_complex_v2');
      if (isLeadNodeConfig) {
        const defaultSpin = [
          '你是资深B2B销售，请基于SPIN方法设计提问与推进策略：',
          'S(背景)：确认客户场景、替代背景与决策角色；',
          'P(问题)：挖掘当前方案的效率/质量/交付风险问题；',
          'I(影响)：放大问题对项目进度、成本和风险的影响；',
          'N(需求收益)：引导客户确认切换后收益与决策条件。',
          '请输出：关键提问清单、应对话术、下一步动作。'
        ].join('\n');
        const byAction: Record<string, string> = {};
        LEAD_ACTION_OPTIONS.forEach((a) => {
          byAction[a] = `${defaultSpin}\n当前客户行动类型：${a}。请优先围绕该行动类型制定SPIN问题。`;
        });
        setLeadSpinPromptByAction(byAction);
      } else {
        setLeadSpinPromptByAction({});
      }
      setDesc('人工执行，AI提供阶段性提示和目标检查');
      return;
    }
    if (type === 'push_down') {
      setPushDownTarget('crm_lead');
      setPushDownMapping('customerId:customerId,customerName:customerName,content:sourceContent,owner:assignee');
      setDesc('满足条件后下推到下一业务对象');
    }
  };

  const buildInputPreview = (input: AIInputParameter) => {
    const safeName = input.name || 'param';
    if (input.type === 'current_field') {
      return {
        callSnippet: `{{${input.currentFieldCode || safeName}}}`,
        runtimeExample: `"${safeName}": "CUST-2026-0001"`
      };
    }
    const refName = safeName.replace(/\s+/g, '');
    return {
      callSnippet: `{{${refName}.rows}}`,
      runtimeExample: [
        `"${safeName}": {`,
        `  "query": { "ontology": "${input.ontologyCode || ''}", "idField": "${input.idField || ''}" },`,
        `  "rows": [`,
        `    { ${((input.fields || []).slice(0, 3).map(f => `"${f}": "..."`).join(', ')) || '"field": "..."'} },`,
        `    { ... }`,
        `  ]`,
        `}`
      ].join('\n')
    };
  };

  const addAiGoal = () => {
    setAiGoals([
      ...aiGoals,
      { id: `goal_${Date.now()}`, title: `目标${aiGoals.length + 1}`, prompt: '' }
    ]);
  };

  const removeAiGoal = (id: string) => {
    setAiGoals(aiGoals.filter((g) => g.id !== id));
  };

  const updateAiGoal = (id: string, updates: Partial<AIGoalConfig>) => {
    setAiGoals(aiGoals.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const addFieldBinding = () => {
    setFieldBindings([...fieldBindings, { id: `fb_${Date.now()}`, fieldId: '', sourceType: 'task_field', sourceValue: '' }]);
  };
  const removeFieldBinding = (id: string) => {
    setFieldBindings(fieldBindings.filter((b) => b.id !== id));
  };
  const updateFieldBinding = (id: string, updates: Partial<{ fieldId: string; sourceType: 'task_field' | 'task_extra' | 'fixed'; sourceValue: string }>) => {
    setFieldBindings(fieldBindings.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };
  const togglePersonaField = (fieldId: string) => {
    if (personaFieldIds.includes(fieldId)) {
      setPersonaFieldIds(personaFieldIds.filter((id) => id !== fieldId));
    } else {
      setPersonaFieldIds([...personaFieldIds, fieldId]);
    }
  };

  const handleSave = () => {
    if (isAiAssisted) {
      const newAiInputs = [];
      const hasSource = (key: string) => contextSources.some(s => s.key === key && s.enabled);
      const getLimit = (key: string, defaultLimit: number) => contextSources.find(s => s.key === key)?.limit || defaultLimit;

      if (hasSource('customer_profile')) {
        newAiInputs.push({
          id: 'preset_persona',
          name: '客户画像',
          type: 'ontology',
          ontologyCode: 'crm_customer_persona',
          idField: 'customer_id',
          fields: ['scale', 'mainProducts', 'painPoints', 'rdRequirements']
        });
      }
      if (hasSource('contact_persona')) {
        newAiInputs.push({
          id: 'preset_contact_profile',
          name: '联系人画像',
          type: 'ontology',
          ontologyCode: 'crm_customer_contact',
          idField: 'primary_contact',
          fields: ['name', 'position', 'buying_role', 'buying_mode']
        });
      }
      if (hasSource('customer_focus_archive')) {
        newAiInputs.push({
          id: 'preset_focus_archive',
          name: '客户关注点档案',
          type: 'ontology',
          ontologyCode: 'crm_customer_focus_swot',
          idField: 'customer_id',
          fields: ['customer_focus', 'key_contact', 'focus_level', 'our_strengths', 'our_weaknesses']
        });
      }
      const communicationInputs = [
        hasSource('email_records') ? { id: 'preset_email', name: `邮件记录(最近${getLimit('email_records', 2)}条)`, channel: 'email', limit: getLimit('email_records', 2) } : null,
        hasSource('wechat_records') ? { id: 'preset_wechat', name: `微信记录(最近${getLimit('wechat_records', 10)}条)`, channel: 'wechat', limit: getLimit('wechat_records', 10) } : null,
        hasSource('wechat_group_records') ? { id: 'preset_wechat_group', name: `微信群聊记录(最近${getLimit('wechat_group_records', 10)}条)`, channel: 'wechat_group', limit: getLimit('wechat_group_records', 10) } : null,
        hasSource('meeting_records') ? { id: 'preset_meeting', name: `会议记录(最近${getLimit('meeting_records', 10)}条)`, channel: 'meeting', limit: getLimit('meeting_records', 10) } : null,
        hasSource('chat_records') ? { id: 'preset_chat', name: `聊天记录(最近${getLimit('chat_records', 10)}条)`, channel: 'chat', limit: getLimit('chat_records', 10) } : null,
      ].filter(Boolean) as Array<{ id: string; name: string; channel: string; limit: number }>;
      communicationInputs.forEach((item) => {
        newAiInputs.push({
          id: item.id,
          name: item.name,
          type: 'ontology',
          ontologyCode: 'crm_communication_log',
          idField: 'customer_id',
          fields: ['date', 'type', 'sender', 'content'],
          channel: item.channel,
          limit: item.limit
        });
      });
      if (hasSource('current_document')) {
        newAiInputs.push({
          id: 'preset_current_doc',
          name: '当前单据',
          type: 'current_field',
          currentFieldCode: 'documentId'
        });
      }
      if (hasSource('current_ontology_fields')) {
        const pickedFields = selectedCurrentFieldCodes.length > 0
          ? selectedCurrentFieldCodes
          : (availableProperties || []).slice(0, 3).map((p) => p.code);
        pickedFields.forEach((code) => {
          newAiInputs.push({
            id: `preset_field_${code}`,
            name: `field_${code}`,
            type: 'current_field',
            currentFieldCode: code
          });
        });
      }
      setAiInputs(newAiInputs as any);
    }
    const cleanBindings = fieldBindings.filter((b) => b.fieldId).reduce((acc, cur) => {
      acc[cur.fieldId] = {
        sourceType: cur.sourceType || 'fixed',
        sourceValue: cur.sourceValue || ''
      };
      return acc;
    }, {} as Record<string, { sourceType: string; sourceValue: string }>);
    setSelectedPropertyIds(fieldBindings.map((b) => b.fieldId).filter(Boolean));
    setFieldDefaults(JSON.stringify(cleanBindings));
    onSave();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              添加 SOP 处理块
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {readOnly && (
            <div className="mx-6 mt-4 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
              当前为查看模式，未启用设计时不可编辑。可在下方点击“启用设计”进入编辑状态。
            </div>
          )}
          <div className={`p-6 space-y-6 overflow-y-auto ${readOnly ? 'pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">块名称</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">块类型</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="automatic">自动节点</option>
                <option value="manual">人工节点 (AI辅助)</option>
                <option value="push_down">下推任务</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs text-indigo-800 font-medium">节点参数设计示例（可一键填充）</p>
              <button
                type="button"
                onClick={applyNodeDesignExample}
                className="px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                套用示例
              </button>
            </div>
            <p className="text-[11px] text-indigo-700 mt-1">
              自动节点：AI识别并回写字段；人工节点：任务+AI提示词+输入参数；下推节点：source:target 映射。
            </p>
          </div>
          
          {type !== 'manual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">节点描述</label>
              <textarea 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-16"
              />
            </div>
          )}


          {type === 'automatic' && (
            <div className="space-y-4 p-4 border border-purple-100 bg-purple-50/30 rounded-xl">
              <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> 自动节点配置
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">OpenAPI 地址</label>
                  <input type="text" value={autoApiEndpoint} onChange={(e) => setAutoApiEndpoint(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="https://api.example.com/v1/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                  <input type="password" value={autoApiKey} onChange={(e) => setAutoApiKey(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="sk-..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">提示词模板</label>
                <textarea 
                  value={autoPromptTemplate} 
                  onChange={(e) => setAutoPromptTemplate(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm h-24 font-mono" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">输出格式 (JSON Schema 或描述)</label>
                <textarea 
                  value={autoOutputFormat} 
                  onChange={(e) => setAutoOutputFormat(e.target.value)} 
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm h-20 font-mono" 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700">后续动作 (Actions)</label>
                  <button 
                    onClick={() => setAutoActions([...autoActions, { id: `act-${Date.now()}`, type: 'update_field', targetField: '', valueSource: '' }])}
                    className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> 添加动作
                  </button>
                </div>
                {autoActions.map((act) => (
                  <div key={act.id} className="p-2 border border-gray-200 rounded bg-white space-y-2">
                    <div className="flex justify-between">
                      <select 
                        value={act.type} 
                        onChange={(e) => setAutoActions(autoActions.map(a => a.id === act.id ? { ...a, type: e.target.value as any } : a))}
                        className="text-[10px] border-none p-0 outline-none font-bold text-gray-600"
                      >
                        <option value="update_field">更新字段</option>
                        <option value="add_sub_table">新增细表</option>
                      </select>
                      <button onClick={() => setAutoActions(autoActions.filter(a => a.id !== act.id))} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder={act.type === 'update_field' ? "目标字段" : "目标细表"} 
                        value={act.targetField || act.targetSubTable}
                        onChange={(e) => setAutoActions(autoActions.map(a => a.id === act.id ? (act.type === 'update_field' ? { ...a, targetField: e.target.value } : { ...a, targetSubTable: e.target.value }) : a))}
                        className="px-2 py-1 border border-gray-200 rounded text-[10px]"
                      />
                      <input 
                        type="text" 
                        placeholder="来源字段 (AI输出Key)" 
                        value={act.valueSource}
                        onChange={(e) => setAutoActions(autoActions.map(a => a.id === act.id ? { ...a, valueSource: e.target.value } : a))}
                        className="px-2 py-1 border border-gray-200 rounded text-[10px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'manual' && (
            <div className="space-y-4">
              <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setManualConfigTab('desc')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${manualConfigTab === 'desc' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
                >
                  块目标
                </button>
                <button
                  onClick={() => setManualConfigTab('ai')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${manualConfigTab === 'ai' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
                >
                  块提示词
                </button>
              </div>

              {manualConfigTab === 'desc' && (
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">块目标</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                    placeholder="例如：明确客户当前需求并推进到下一步沟通。"
                  />
                  <p className="text-xs text-gray-500 mt-2">建议写法：目标结果 + 推进方向。</p>
                </div>
              )}

              {manualConfigTab === 'ai' && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <input 
                      type="checkbox" 
                      id="aiAssisted" 
                      checked={isAiAssisted}
                      onChange={(e) => setIsAiAssisted(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="aiAssisted" className="text-sm font-medium text-indigo-900">启用 AI 辅助提示 (AI-Assisted)</label>
                  </div>

                  {isAiAssisted && (
                    <div className="space-y-4 p-4 border border-purple-100 bg-purple-50/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> 块提示词
                        </h4>
                      </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">块提示词</label>
                      <textarea 
                        value={aiPromptTemplate} 
                        onChange={(e) => setAiPromptTemplate(e.target.value)} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-28" 
                        placeholder="例如：围绕本块目标，输出任务画布动作与对应OQAR话术。"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">系统会按“SOP前缀 + 块提示词 + 固定后缀”拼接后生成结构化JSON。</p>
                    </div>
                  </div>

                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {false && type === 'manual' && manualConfigTab === 'ai' && (
            <div className="space-y-2 p-4 border border-amber-100 bg-amber-50/30 rounded-xl">
              <h4 className="text-sm font-bold text-amber-800">任务画布设置（需补充了解内容）</h4>
              <p className="text-xs text-gray-600">
                请填写 JSON：{`{"enabled":true,"items":[{"id":"need1","label":"应用场景","required":true,"priority":"high","questionPrompt":"请问应用在哪个场景？","taskPrompt":"基于客户上下文，输出该项需执行的作业任务（2-3条）","taskTemplate":"确认场景边界并记录验收口径","evidenceField":"application_scenario","completionRule":"客户明确场景","missingTaskTitle":"补充应用场景","missingTaskType":"线索跟进"}]}`}
              </p>
              <textarea
                value={discoveryCanvasJson}
                onChange={(e) => setDiscoveryCanvasJson(e.target.value)}
                className="w-full min-h-[220px] px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono bg-white"
                placeholder='{"enabled":true,"items":[{"id":"need1","label":"应用场景","taskPrompt":"..."}]}'
              />
            </div>
          )}

          {false && type === 'manual' && manualConfigTab === 'canvas' && (
            <div className="space-y-4 p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl">
              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <User className="w-4 h-4" /> 人工任务配置
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">任务类型</label>
                <select 
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">请选择任务类型...</option>
                  {availableTaskTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">客户来源</label>
                  <select value={taskCustomerMode} onChange={(e) => setTaskCustomerMode(e.target.value as any)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                    <option value="field">从本体字段取</option>
                    <option value="fixed">固定值</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">执行人来源</label>
                  <select value={taskAssigneeMode} onChange={(e) => setTaskAssigneeMode(e.target.value as any)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                    <option value="current">当前处理人</option>
                    <option value="field">从本体字段取</option>
                    <option value="fixed">固定值</option>
                  </select>
                </div>
              </div>
              {taskCustomerMode === 'field' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">客户ID字段</label>
                    <select value={taskCustomerIdField} onChange={(e) => setTaskCustomerIdField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                      <option value="">请选择字段</option>
                      {availableProperties.map((p) => <option key={`cid-${p.id}`} value={p.code}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">客户名称字段</label>
                    <select value={taskCustomerNameField} onChange={(e) => setTaskCustomerNameField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                      <option value="">请选择字段</option>
                      {availableProperties.map((p) => <option key={`cname-${p.id}`} value={p.code}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={taskFixedCustomerId} onChange={(e) => setTaskFixedCustomerId(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="固定客户ID" />
                  <input value={taskFixedCustomerName} onChange={(e) => setTaskFixedCustomerName(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="固定客户名称" />
                </div>
              )}
              {taskAssigneeMode === 'field' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">执行人ID字段</label>
                    <select value={taskAssigneeIdField} onChange={(e) => setTaskAssigneeIdField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                      <option value="">请选择字段</option>
                      {availableProperties.map((p) => <option key={`aid-${p.id}`} value={p.code}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">执行人名称字段</label>
                    <select value={taskAssigneeNameField} onChange={(e) => setTaskAssigneeNameField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                      <option value="">请选择字段</option>
                      {availableProperties.map((p) => <option key={`aname-${p.id}`} value={p.code}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                </div>
              )}
              {taskAssigneeMode === 'fixed' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={taskFixedAssigneeId} onChange={(e) => setTaskFixedAssigneeId(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="固定执行人ID" />
                  <input value={taskFixedAssigneeName} onChange={(e) => setTaskFixedAssigneeName(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="固定执行人名称" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">日期来源</label>
                  <select value={taskDueDateMode} onChange={(e) => setTaskDueDateMode(e.target.value as any)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                    <option value="rule">按规则(今天+N天)</option>
                    <option value="field">从本体字段取</option>
                    <option value="fixed">固定日期</option>
                  </select>
                </div>
                {taskDueDateMode === 'rule' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">偏移天数</label>
                    <input value={taskOffsetDays} onChange={(e) => setTaskOffsetDays(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="3" />
                  </div>
                )}
                {taskDueDateMode === 'field' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">日期字段</label>
                    <select value={taskDueDateField} onChange={(e) => setTaskDueDateField(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm">
                      <option value="">请选择字段</option>
                      {availableProperties.map((p) => <option key={`due-${p.id}`} value={p.code}>{p.name} ({p.code})</option>)}
                    </select>
                  </div>
                )}
                {taskDueDateMode === 'fixed' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">固定日期</label>
                    <input type="date" value={taskFixedDueDate} onChange={(e) => setTaskFixedDueDate(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 border border-orange-200 bg-orange-50 rounded">
                <input type="checkbox" checked={taskRequireConfirm} onChange={(e) => setTaskRequireConfirm(e.target.checked)} className="w-4 h-4 text-orange-600 rounded" />
                转人工任务前需要确认（开启后先生成“节点确认任务”，AI辅助按本节点配置）
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer p-2 border border-indigo-200 bg-indigo-50 rounded">
                <input type="checkbox" checked={taskGenerateTask} onChange={(e) => setTaskGenerateTask(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                该节点生成任务（关闭后仅执行流程/AI，不创建任务）
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-500">录入字段与对应值（简易设置）</label>
                  <button type="button" onClick={addFieldBinding} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                    <Plus className="w-3 h-3 inline-block mr-1" />
                    添加字段
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {fieldBindings.map((binding) => (
                    <div key={binding.id} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-center">
                      <select
                        value={binding.fieldId}
                        onChange={(e) => updateFieldBinding(binding.id, { fieldId: e.target.value })}
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      >
                        <option value="">选择本体字段</option>
                        {availableProperties.map((prop) => (
                          <option key={prop.id} value={prop.id}>{prop.name}</option>
                        ))}
                      </select>
                      <select
                        value={binding.sourceType}
                        onChange={(e) => updateFieldBinding(binding.id, { sourceType: e.target.value as any, sourceValue: '' })}
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      >
                        <option value="task_field">任务字段</option>
                        <option value="task_extra">任务附加字段</option>
                        <option value="fixed">固定值</option>
                      </select>
                      {binding.sourceType === 'fixed' ? (
                        <input
                          value={binding.sourceValue}
                          onChange={(e) => updateFieldBinding(binding.id, { sourceValue: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                          placeholder="固定值"
                        />
                      ) : (
                        <select
                          value={binding.sourceValue}
                          onChange={(e) => updateFieldBinding(binding.id, { sourceValue: e.target.value })}
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                        >
                          <option value="">请选择来源字段</option>
                          {(binding.sourceType === 'task_field' ? taskFieldOptions : taskExtraFieldOptions).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={() => removeFieldBinding(binding.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {fieldBindings.length === 0 && <div className="text-xs text-gray-400">暂无录入字段配置</div>}
                </div>
              </div>
              <div className="text-[11px] text-gray-500">系统会自动把上面的字段和值写入节点配置，无需手动填写字段默认值文本。</div>
            </div>
          )}

          {type === 'push_down' && (
            <div className="space-y-4 p-4 border border-blue-100 bg-blue-50/30 rounded-xl">
              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> 下推任务配置
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目标本体标识 (Target Ontology Code)</label>
                <input type="text" value={pushDownTarget} onChange={(e) => setPushDownTarget(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="Lead" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">字段映射 (source:target, ...)</label>
                <input type="text" value={pushDownMapping} onChange={(e) => setPushDownMapping(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="customerName:customerName, content:customerAction" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">关闭</button>
          {readOnly ? (
            <button
              onClick={onEnableDesign}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
            >
              启用设计
            </button>
          ) : (
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">保存块</button>
          )}
        </div>
      </div>
    </div>
    <SandboxTestModal
      isOpen={isSandboxOpen}
      onClose={() => setIsSandboxOpen(false)}
      promptTemplate={aiPromptTemplate || autoPromptTemplate}
      selectedContexts={{
        customerPersona: contextSources.some(s => s.key === 'customer_profile' && s.enabled),
        contactPersona: contextSources.some(s => s.key === 'contact_persona' && s.enabled),
        recentCommunications: contextSources.some(s => s.enabled && ['email_records', 'wechat_records', 'wechat_group_records', 'meeting_records', 'chat_records'].includes(s.key)),
        currentDocument: contextSources.some(s => s.key === 'current_document' && s.enabled) || contextSources.some(s => s.key === 'current_ontology_fields' && s.enabled)
      }}
    />
  </>
  );
};
