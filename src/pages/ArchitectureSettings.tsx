import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Property, WorkflowFlow, ProcessingNode, OntologyRule, OntologyObject, SystemFunction, AIInputParameter, AIGoalConfig } from '../types/ontology';
import { initialObjects, initialSystemFunctions } from '../data/ontologyData';
import { AddFlowModal, AddNodeModal, AddRuleModal, AddPropertyModal } from '../components/architecture/Modals';
import { ObjectView } from '../components/architecture/ObjectView';
import { loadLocalState, saveLocalState } from '../lib/localState';
import { fetchArchitectureDataFromSupabase, fetchFlowsForObjectFromSupabase, prepareFlowDraftForObject, publishFlowDraftForObject, discardFlowDraftForObject, rollbackFlowPublishedForObject, saveArchitectureDataToSupabase, ensurePresetPublishedFlowsSeeded } from '../lib/architectureRepository';
import { fetchTaskTypeConfigFromSupabase } from '../lib/taskTypeConfigRepository';
import { fetchLlmConfigFromSupabase } from '../lib/llmConfigRepository';
import { decodeSopTriggerRule, encodeSopTriggerRule, SopTriggerMode } from '../lib/sopTrigger';
import { List } from 'lucide-react';

const DEFAULT_SOP_OQAR_UNIFIED_PROMPT = [
  '你是资深大客户销售教练，请按 OQAR 体系处理问答场景。',
  '输入默认参数：我方提问（{question}）+ 客户回答（{answer}）+ 当前SOP任务内容（{sop_tasks}）。',
  '请结合当前本体字段、客户画像、联系人画像、最近聊天记录进行判断。',
  '输出要求：',
  '1）questionAnalysis：客户回答含义分析（诉求、约束、风险、情绪信号，以及我方提问承接是否到位）；',
  '2）answerSuggestion：建议回复话术（Observe/Qualify/Answer/Request）。'
].join('\n');

const DEFAULT_PROGRESSION_CHECK_PROMPT = [
  '你是资深销售阶段推进审查官。',
  '请根据当前阶段任务、单据快照、最近聊天记录、邮件记录、会议记录，判断该单据是否具备晋级到下一阶段的明确信号。',
  '输出必须为JSON对象：{"canAdvance":true,"summary":"...","signals":["..."],"risks":["..."],"suggestions":["..."]}',
  '判断规则：',
  '1) 若已出现明确需求、预算、决策人认可、技术验证通过、采购推进、项目立项等正向信号，可判定 canAdvance=true；',
  '2) 若证据不足、只有泛泛沟通、没有形成阶段性承诺，则 canAdvance=false；',
  '3) 当 canAdvance=false 时，suggestions 必须给出可执行的晋级补强策略；',
  '4) 禁止输出 JSON 之外的任何文字。'
].join('\n');

const mapOntologyCode = (code: string) => {
  const toSnake = (value: string) =>
    String(value || '')
      .replace(/^crm_/i, '')
      .replace(/^ba_/i, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  if (code === 'Employee') return 'ba_employeeinfo';
  if (code === 'Product') return 'ba_cpinfo';
  if (code === 'ProductCategory') return 'ba_cptype';
  if (code === 'Customer') return 'ba_manucustinfo';
  if (/^ba_/i.test(code)) return `ba_${toSnake(code)}`;
  return `crm_${toSnake(code)}`;
};

const normalizeOntologyObjects = (objects: OntologyObject[]): OntologyObject[] => {
  const codeMap = new Map<string, string>();
  objects.forEach((obj) => codeMap.set(obj.code, mapOntologyCode(obj.code)));
  const normalized = objects.map((obj) => {
    const mappedCode = codeMap.get(obj.code) || obj.code;
    const hasIdProperty = obj.properties.some((property) => property.code === 'id');
    return {
      ...obj,
      code: mappedCode,
      systemLink: `${mappedCode}表`,
      properties: hasIdProperty
        ? obj.properties
        : [{ id: `p_id_${obj.id}`, name: 'ID', code: 'id', type: 'String' as const, required: true }, ...obj.properties],
      relations: obj.relations.map((relation) => ({
        ...relation,
        targetObject: codeMap.get(relation.targetObject) || mapOntologyCode(relation.targetObject)
      }))
    };
  });
  const deduped = new Map<string, OntologyObject>();
  normalized.forEach((obj) => {
    if (!deduped.has(obj.code)) {
      deduped.set(obj.code, obj);
    }
  });
  return Array.from(deduped.values());
};

export default function ArchitectureSettings() {
  const savedAiDefaults = loadLocalState<{
    defaultAiModel: string;
    aiApiEndpoint: string;
    customModels: { name: string; value: string }[];
  }>('crm.architecture_ai_defaults', {
    defaultAiModel: 'gemini-3-flash-preview',
    aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    customModels: []
  });
  const [objects, setObjects] = useState<OntologyObject[]>(() =>
    loadLocalState<OntologyObject[]>('crm.architecture_objects', normalizeOntologyObjects(initialObjects))
  );
  const [systemFunctions, setSystemFunctions] = useState<SystemFunction[]>(() =>
    loadLocalState<SystemFunction[]>('crm.architecture_system_functions', initialSystemFunctions)
  );
  const [activeObjectId, setActiveObjectId] = useState<string>(initialObjects[0].id);
  const [activeTab, setActiveTab] = useState<'properties' | 'flows'>('properties');
  const [objectWorkspaceTab, setObjectWorkspaceTab] = useState<'basic' | 'flows'>('basic');
  const [designFlowId, setDesignFlowId] = useState<string | null>(null);

  // Global AI Settings
  const [defaultAiModel, setDefaultAiModel] = useState(savedAiDefaults.defaultAiModel || 'gemini-3-flash-preview');
  const [aiApiEndpoint, setAiApiEndpoint] = useState(savedAiDefaults.aiApiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/');
  const [customModels, setCustomModels] = useState(
    savedAiDefaults.customModels && savedAiDefaults.customModels.length > 0
      ? savedAiDefaults.customModels
      : [
          { name: 'Gemini 3 Flash', value: 'gemini-3-flash-preview' },
          { name: 'Gemini 3.1 Pro', value: 'gemini-3.1-pro-preview' },
          { name: 'MiniMax-abab6.5', value: 'minimax-abab6.5' },
          { name: '通义千问-Max', value: 'qwen-max' },
          { name: '通义千问-Plus', value: 'qwen-plus' },
          { name: 'Custom Model', value: 'custom' }
        ]
  );

  useEffect(() => {
    saveLocalState('crm.architecture_objects', objects);
  }, [objects]);

  useEffect(() => {
    saveLocalState('crm.architecture_system_functions', systemFunctions);
  }, [systemFunctions]);

  useEffect(() => {
    saveLocalState('crm.architecture_ai_defaults', {
      defaultAiModel,
      aiApiEndpoint,
      customModels
    });
  }, [defaultAiModel, aiApiEndpoint, customModels]);

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        await ensurePresetPublishedFlowsSeeded();
        const remote = await fetchArchitectureDataFromSupabase();
        if (remote.objects.length > 0) {
          const normalized = normalizeOntologyObjects(remote.objects);
          setObjects(normalized);
          setActiveObjectId(normalized[0].id);
        }
        if (remote.systemFunctions.length > 0) {
          setSystemFunctions(remote.systemFunctions);
        }
      } catch (error) {
        console.error('Error fetching architecture data:', error);
      }
    };
    fetchRemote();
  }, []);

  useEffect(() => {
    fetchTaskTypeConfigFromSupabase([])
      .then((types) => {
        const names = (types || []).map((t: any) => String(t?.name || '').trim()).filter(Boolean);
        if (names.length > 0) setTaskTypes(names);
      })
      .catch((error) => {
        console.error('Error fetching task types:', error);
      });
  }, []);

  useEffect(() => {
    fetchLlmConfigFromSupabase()
      .then((cfg) => {
        const models = cfg?.models || {};
        const options = Object.entries(models)
          .filter(([, conf]) => (conf as any)?.enabled !== false)
          .map(([id, conf]) => ({
            id,
            name: String((conf as any)?.name || id)
          }));
        setLlmModelOptions(options);
      })
      .catch((error) => {
        console.error('Error fetching llm models:', error);
      });
  }, []);

  const [isFlowDesignMode, setIsFlowDesignMode] = useState(false);
  const [flowDesignViewSource, setFlowDesignViewSource] = useState<'draft' | 'published'>('published');

  useEffect(() => {
    const timer = setTimeout(() => {
      const flowObjectCodes = isFlowDesignMode && activeObject?.code ? [activeObject.code] : [];
      saveArchitectureDataToSupabase(objects, systemFunctions, {
        saveFlows: isFlowDesignMode,
        flowTarget: 'draft',
        flowObjectCodes
      }).catch((error) => {
        console.error('Error syncing architecture data:', error);
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [objects, systemFunctions, isFlowDesignMode, activeObjectId]);

  useEffect(() => {
    setIsFlowDesignMode(false);
  }, [activeObjectId]);

  const refreshActiveObjectFlows = async (source: 'published' | 'draft') => {
    try {
      const flows = await fetchFlowsForObjectFromSupabase(activeObject.code, source);
      setObjects((prev) => prev.map((obj) => obj.id === activeObjectId ? { ...obj, flows } : obj));
    } catch (error) {
      console.error('Error refreshing flows:', error);
    }
  };

  const handleStartFlowDesign = async (flowId?: string) => {
    try {
      await prepareFlowDraftForObject(activeObject.code);
      setIsFlowDesignMode(true);
      setFlowDesignViewSource('draft');
      await refreshActiveObjectFlows('draft');
      setDesignFlowId(flowId || null);
    } catch (error) {
      console.error('Error starting flow design:', error);
      toast.error(`开启设计状态失败：${(error as Error)?.message || ''}`);
    }
  };

  const handleApplyFlowDesign = async () => {
    try {
      await publishFlowDraftForObject(activeObject.code);
      setIsFlowDesignMode(false);
      setDesignFlowId(null);
      setFlowDesignViewSource('published');
      await refreshActiveObjectFlows('published');
    } catch (error) {
      console.error('Error applying flow design:', error);
      toast.error(`应用失败：${(error as Error)?.message || ''}`);
    }
  };

  const handleDiscardFlowDesign = async () => {
    try {
      await discardFlowDraftForObject(activeObject.code);
      setIsFlowDesignMode(false);
      setDesignFlowId(null);
      setFlowDesignViewSource('published');
      await refreshActiveObjectFlows('published');
    } catch (error) {
      console.error('Error discarding flow design:', error);
      toast.error(`放弃草稿失败：${(error as Error)?.message || ''}`);
    }
  };

  const handleRollbackFlowPublished = async () => {
    try {
      await rollbackFlowPublishedForObject(activeObject.code);
      setIsFlowDesignMode(false);
      setDesignFlowId(null);
      setFlowDesignViewSource('published');
      await refreshActiveObjectFlows('published');
    } catch (error) {
      console.error('Error rolling back flow:', error);
      toast.error(`撤回失败：${(error as Error)?.message || ''}`);
    }
  };

  const ensureDesignMode = () => {
    if (isFlowDesignMode) return true;
    toast.error('请先开启设计状态，再编辑 SOP 模板');
    return false;
  };

  const handleViewDraftFlow = async () => {
    if (!isFlowDesignMode) return;
    await refreshActiveObjectFlows('draft');
    setFlowDesignViewSource('draft');
  };

  const handleViewPublishedFlow = async () => {
    if (!isFlowDesignMode) return;
    await refreshActiveObjectFlows('published');
    setFlowDesignViewSource('published');
  };

  const [isAddingFlow, setIsAddingFlow] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form states for new flow
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowTriggerType, setNewFlowTriggerType] = useState<'button' | 'auto' | 'timed'>('button');
  const [newFlowCondition, setNewFlowCondition] = useState('');
  const [newFlowFrequency, setNewFlowFrequency] = useState('');
  const [newFlowSimpleTriggerMode, setNewFlowSimpleTriggerMode] = useState<SopTriggerMode>('manual');
  const [newFlowSimpleTriggerField, setNewFlowSimpleTriggerField] = useState('');
  const [newFlowSimpleTriggerValue, setNewFlowSimpleTriggerValue] = useState('');
  const [newFlowIsActivation, setNewFlowIsActivation] = useState(false);
  const [newFlowTaskType, setNewFlowTaskType] = useState('普通任务');
  const [newFlowTaskEnabled, setNewFlowTaskEnabled] = useState(true);
  const [newFlowTaskTitleTemplate, setNewFlowTaskTitleTemplate] = useState('[SOP] {{sopName}} - {{customerName}}');
  const [newFlowTaskDescTemplate, setNewFlowTaskDescTemplate] = useState('请按SOP模板完成阶段目标推进。');
  const [newFlowTaskDueOffsetDays, setNewFlowTaskDueOffsetDays] = useState('3');
  const [newFlowTaskFields, setNewFlowTaskFields] = useState<string[]>([]);
  const [newFlowTaskFieldMappings, setNewFlowTaskFieldMappings] = useState<Array<{ taskField: string; sourceField: string }>>([]);
  const [newFlowPromptPrefix, setNewFlowPromptPrefix] = useState('');
  const [newFlowContextSources, setNewFlowContextSources] = useState<string[]>([]);
  const [newFlowModelId, setNewFlowModelId] = useState('');
  const [newFlowOqarReplyPrompt, setNewFlowOqarReplyPrompt] = useState('');
  const [newFlowProgressionCheckEnabled, setNewFlowProgressionCheckEnabled] = useState(false);
  const [newFlowProgressionCheckPrompt, setNewFlowProgressionCheckPrompt] = useState(DEFAULT_PROGRESSION_CHECK_PROMPT);
  const [llmModelOptions, setLlmModelOptions] = useState<Array<{ id: string; name: string }>>([]);

  // Form states for new node
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [isNodeReadOnly, setIsNodeReadOnly] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeDesc, setNewNodeDesc] = useState('');
  const [newNodeType, setNewNodeType] = useState<'automatic' | 'manual' | 'push_down' | 'condition'>('automatic');
  const [newNodeCondition, setNewNodeCondition] = useState('');
  const [conditionResults, setConditionResults] = useState<{ id: string; label: string; value: string }[]>([]);
  const [newNodeTaskType, setNewNodeTaskType] = useState('');
  const [isAiAssisted, setIsAiAssisted] = useState(true);
  
  // Automatic Config
  const [autoApiEndpoint, setAutoApiEndpoint] = useState('');
  const [autoApiKey, setAutoApiKey] = useState('');
  const [autoOutputFormat, setAutoOutputFormat] = useState('');
  const [autoPromptTemplate, setAutoPromptTemplate] = useState('');
  const [autoActions, setAutoActions] = useState<any[]>([]);

  // AI Config (for Manual AI Assisted)
  const [aiOntologyObject, setAiOntologyObject] = useState('');
  const [aiIdField, setAiIdField] = useState('');
  const [aiParameters, setAiParameters] = useState('');
  const [aiSuccessField, setAiSuccessField] = useState('');
  const [aiUpdates, setAiUpdates] = useState('');
  const [aiFailureReasonField, setAiFailureReasonField] = useState('');
  const [aiNodeApiEndpoint, setAiNodeApiEndpoint] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPromptTemplate, setAiPromptTemplate] = useState('');
  const [leadSpinPromptByAction, setLeadSpinPromptByAction] = useState<Record<string, string>>({});
  const [aiInputs, setAiInputs] = useState<AIInputParameter[]>([]);
  const [aiGoals, setAiGoals] = useState<AIGoalConfig[]>([{ id: 'goal_1', title: '总体建议', prompt: '请给出该阶段下一步执行建议。' }]);

  // Manual Config
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [manualTemplateId, setManualTemplateId] = useState('');

  // Push-down Config
  const [pushDownTarget, setPushDownTarget] = useState('');
  const [pushDownMapping, setPushDownMapping] = useState('');
  const [newNodeRole, setNewNodeRole] = useState('');
  const [newNodeFieldDefaults, setNewNodeFieldDefaults] = useState('');
  const [taskCustomerMode, setTaskCustomerMode] = useState<'field' | 'fixed'>('field');
  const [taskCustomerIdField, setTaskCustomerIdField] = useState('');
  const [taskCustomerNameField, setTaskCustomerNameField] = useState('');
  const [taskFixedCustomerId, setTaskFixedCustomerId] = useState('');
  const [taskFixedCustomerName, setTaskFixedCustomerName] = useState('');
  const [taskAssigneeMode, setTaskAssigneeMode] = useState<'current' | 'field' | 'fixed'>('current');
  const [taskAssigneeIdField, setTaskAssigneeIdField] = useState('');
  const [taskAssigneeNameField, setTaskAssigneeNameField] = useState('');
  const [taskFixedAssigneeId, setTaskFixedAssigneeId] = useState('');
  const [taskFixedAssigneeName, setTaskFixedAssigneeName] = useState('');
  const [taskDueDateMode, setTaskDueDateMode] = useState<'field' | 'fixed' | 'rule'>('rule');
  const [taskDueDateField, setTaskDueDateField] = useState('');
  const [taskFixedDueDate, setTaskFixedDueDate] = useState('');
  const [taskOffsetDays, setTaskOffsetDays] = useState('3');
  const [taskRequireConfirm, setTaskRequireConfirm] = useState(false);
  const [taskGenerateTask, setTaskGenerateTask] = useState(true);
  const [personaFieldIds, setPersonaFieldIds] = useState<string[]>([]);
  const [discoveryCanvasJson, setDiscoveryCanvasJson] = useState<string>('{"enabled":true,"items":[]}');
  const [oqarAssistJson, setOqarAssistJson] = useState<string>('{"enabled":true,"globalTemplate":"","minClosedQuestions":1,"minOpenQuestions":1,"feedbackTypePrompts":{}}');

  // Editing states
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingWorkflowFlow, setEditingWorkflowFlow] = useState<WorkflowFlow | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Form states for new rule
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState<'before_save' | 'after_save' | 'before_delete' | 'after_delete'>('before_save');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleActionType, setNewRuleActionType] = useState<'terminate' | 'warning' | 'execute_flow'>('terminate');
  const [newRuleActionValue, setNewRuleActionValue] = useState('');
  const [newRuleActionMessage, setNewRuleActionMessage] = useState('');

  const [taskTypes, setTaskTypes] = useState<string[]>(['客户拜访', '样品跟进', '报价跟进', '订单处理', '售后处理', '普通任务']);

  const activeObject = objects.find(o => o.id === activeObjectId) || objects[0];
  const activeDesignFlow = (activeObject?.flows || []).find((flow) => flow.id === designFlowId) || null;
  const openFlowWorkspace = () => {
    setActiveTab('flows');
    setObjectWorkspaceTab('flows');
  };

  const handleAddFlow = () => {
    if (!ensureDesignMode()) return;
    setEditingFlowId(null);
    const isCustomerObject = activeObject?.code === 'ba_manucustinfo';
    setNewFlowName(isCustomerObject ? '客户激活流程' : '');
    setNewFlowDesc(isCustomerObject ? '用于触发客户长时间未联系后的激活与画像相关流程。' : '');
    setNewFlowTriggerType(isCustomerObject ? 'auto' : 'button');
    setNewFlowCondition(isCustomerObject ? '客户长时间未联系' : '');
    setNewFlowFrequency('');
    setNewFlowSimpleTriggerMode(isCustomerObject ? 'on_field_change' : 'manual');
    setNewFlowSimpleTriggerField(isCustomerObject ? 'status' : '');
    setNewFlowSimpleTriggerValue(isCustomerObject ? '活跃' : '');
    setNewFlowIsActivation(isCustomerObject);
    setNewFlowTaskType('普通任务');
    setNewFlowTaskEnabled(true);
    setNewFlowTaskTitleTemplate('[SOP] {{sopName}} - {{customerName}}');
    setNewFlowTaskDescTemplate('请按SOP模板完成阶段目标推进。');
    setNewFlowTaskDueOffsetDays('3');
    setNewFlowTaskFields([]);
    setNewFlowTaskFieldMappings([]);
    setNewFlowPromptPrefix('');
    setNewFlowContextSources([]);
    setNewFlowModelId('');
    setNewFlowOqarReplyPrompt(DEFAULT_SOP_OQAR_UNIFIED_PROMPT);
    setNewFlowProgressionCheckEnabled(false);
    setNewFlowProgressionCheckPrompt(DEFAULT_PROGRESSION_CHECK_PROMPT);
    setIsAddingFlow(true);
  };

  const handleEditFlowMetadata = (flow: WorkflowFlow) => {
    if (!ensureDesignMode()) return;
    setEditingFlowId(flow.id);
    setNewFlowName(flow.name);
    setNewFlowDesc(flow.description);
    setNewFlowTriggerType(flow.triggerType);
    setNewFlowCondition(flow.triggerCondition || '');
    setNewFlowFrequency(flow.triggerFrequency || '');
    const parsedTrigger = decodeSopTriggerRule(flow.triggerType, flow.triggerCondition);
    setNewFlowSimpleTriggerMode(parsedTrigger.mode);
    setNewFlowSimpleTriggerField(String(parsedTrigger.fieldCode || ''));
    setNewFlowSimpleTriggerValue(String(parsedTrigger.expectedValue || ''));
    setNewFlowTaskType(flow.sopTaskConfig?.taskType || '普通任务');
    setNewFlowTaskEnabled(flow.sopTaskConfig?.enabled !== false);
    setNewFlowTaskTitleTemplate(flow.sopTaskConfig?.titleTemplate || '[SOP] {{sopName}} - {{customerName}}');
    setNewFlowTaskDescTemplate(flow.sopTaskConfig?.descriptionTemplate || '请按SOP模板完成阶段目标推进。');
    setNewFlowTaskDueOffsetDays(String(flow.sopTaskConfig?.dueOffsetDays ?? 3));
    setNewFlowTaskFields(Array.isArray(flow.sopTaskConfig?.fields) ? (flow.sopTaskConfig?.fields as string[]) : []);
    setNewFlowTaskFieldMappings(Array.isArray(flow.sopTaskConfig?.fieldMappings) ? (flow.sopTaskConfig?.fieldMappings as Array<{ taskField: string; sourceField: string }>) : []);
    setNewFlowPromptPrefix(String(flow.sopPromptConfig?.prefix || ''));
    setNewFlowContextSources(Array.isArray(flow.sopPromptConfig?.contextSources) ? (flow.sopPromptConfig?.contextSources as string[]) : []);
    setNewFlowModelId(String(flow.sopPromptConfig?.modelId || ''));
    setNewFlowOqarReplyPrompt(String(flow.sopOqarConfig?.unifiedPrompt || flow.sopOqarConfig?.replyPrompt || DEFAULT_SOP_OQAR_UNIFIED_PROMPT));
    setNewFlowProgressionCheckEnabled(flow.progressionCheck?.enabled === true);
    setNewFlowProgressionCheckPrompt(String(flow.progressionCheck?.promptTemplate || DEFAULT_PROGRESSION_CHECK_PROMPT));
    setIsAddingFlow(true);
  };

  const handleEditFlow = (flow: WorkflowFlow) => {
    if (!ensureDesignMode()) return;
    toast('流程图编辑已停用，请使用节点列表方式配置流程。');
  };

  const handleSaveFlow = () => {
    if (!ensureDesignMode()) return;
    if (!newFlowName) return;
    const effectiveTriggerType = newFlowIsActivation
      ? 'auto'
      : newFlowSimpleTriggerMode === 'manual'
        ? 'button'
        : 'auto';
    const simpleTriggerRule = newFlowIsActivation
      ? { mode: 'on_field_change' as const, fieldCode: 'status', expectedValue: '活跃' }
      : {
          mode: newFlowSimpleTriggerMode,
          fieldCode: newFlowSimpleTriggerField || undefined,
          expectedValue: newFlowSimpleTriggerValue || undefined
        };
    const effectiveCondition =
      effectiveTriggerType === 'auto'
        ? encodeSopTriggerRule(simpleTriggerRule)
        : undefined;
    const unifiedPrompt = String(newFlowOqarReplyPrompt || '').trim() || DEFAULT_SOP_OQAR_UNIFIED_PROMPT;
    if (editingFlowId) {
      setObjects(objects.map(obj => {
        if (obj.id === activeObjectId) {
          return {
            ...obj,
            flows: (obj.flows || []).map(f => f.id === editingFlowId ? {
              ...f,
              name: newFlowName,
              description: newFlowDesc,
              triggerType: effectiveTriggerType,
              triggerCondition: effectiveCondition,
              triggerFrequency: effectiveTriggerType === 'timed' ? newFlowFrequency : undefined,
              triggerRule: simpleTriggerRule,
              sopTaskConfig: {
                enabled: newFlowTaskEnabled,
                taskType: newFlowTaskType || '普通任务',
                titleTemplate: newFlowTaskTitleTemplate || '[SOP] {{sopName}} - {{customerName}}',
                descriptionTemplate: newFlowTaskDescTemplate || '请按SOP模板完成阶段目标推进。',
                assigneeRule: 'current',
                // 去掉偏移天数设置，沿用系统/规则默认
                priority: 'medium',
                fields: newFlowTaskFields,
                fieldMappings: newFlowTaskFieldMappings.filter((row) => String(row?.taskField || '').trim() && String(row?.sourceField || '').trim())
              },
              sopOqarConfig: {
                enabled: true,
                unifiedPrompt,
                replyPrompt: unifiedPrompt
              },
              sopPromptConfig: {
                prefix: String(newFlowPromptPrefix || '').trim(),
                contextSources: newFlowContextSources,
                modelId: String(newFlowModelId || '').trim() || undefined
              },
              progressionCheck: {
                enabled: newFlowProgressionCheckEnabled,
                promptTemplate: String(newFlowProgressionCheckPrompt || '').trim() || DEFAULT_PROGRESSION_CHECK_PROMPT
              }
            } : f)
          };
        }
        return obj;
      }));
    } else {
      const newFlow: WorkflowFlow = {
        id: `flow${Date.now()}`,
        name: newFlowName,
        description: newFlowDesc,
        triggerType: effectiveTriggerType,
        triggerCondition: effectiveCondition,
        triggerFrequency: effectiveTriggerType === 'timed' ? newFlowFrequency : undefined,
        triggerRule: simpleTriggerRule,
        sopTaskConfig: {
          enabled: newFlowTaskEnabled,
          taskType: newFlowTaskType || '普通任务',
          titleTemplate: newFlowTaskTitleTemplate || '[SOP] {{sopName}} - {{customerName}}',
          descriptionTemplate: newFlowTaskDescTemplate || '请按SOP模板完成阶段目标推进。',
          assigneeRule: 'current',
          // 去掉偏移天数设置，沿用系统/规则默认
          priority: 'medium',
          fields: newFlowTaskFields,
          fieldMappings: newFlowTaskFieldMappings.filter((row) => String(row?.taskField || '').trim() && String(row?.sourceField || '').trim())
        },
        sopOqarConfig: {
          enabled: true,
          unifiedPrompt,
          replyPrompt: unifiedPrompt
        },
        sopPromptConfig: {
          prefix: String(newFlowPromptPrefix || '').trim(),
          contextSources: newFlowContextSources,
          modelId: String(newFlowModelId || '').trim() || undefined
        },
        progressionCheck: {
          enabled: newFlowProgressionCheckEnabled,
          promptTemplate: String(newFlowProgressionCheckPrompt || '').trim() || DEFAULT_PROGRESSION_CHECK_PROMPT
        },
        nodes: []
      };

      setObjects(objects.map(obj => {
        if (obj.id === activeObjectId) {
          return { ...obj, flows: [...(obj.flows || []), newFlow] };
        }
        return obj;
      }));
    }
    
    setIsAddingFlow(false);
    setEditingFlowId(null);
    setNewFlowIsActivation(false);
  };

  const handleAddNode = (flowId: string) => {
    if (!ensureDesignMode()) return;
    setIsNodeReadOnly(false);
    setActiveFlowId(flowId);
    setEditingNodeId(null);
    setNewNodeName('');
    setNewNodeDesc('');
    setNewNodeType('manual');
    setNewNodeCondition('');
    setConditionResults([]);
    setNewNodeTaskType('');
    setIsAiAssisted(true);
    setAutoApiEndpoint('');
    setAutoApiKey('');
    setAutoOutputFormat('');
    setAutoPromptTemplate('');
    setAutoActions([]);
    setAiOntologyObject('');
    setAiIdField('');
    setAiParameters('');
    setAiSuccessField('');
    setAiUpdates('');
    setAiFailureReasonField('');
    setAiNodeApiEndpoint('');
    setAiApiKey('');
    setAiPromptTemplate('');
    setLeadSpinPromptByAction({});
    setAiInputs([]);
    setAiGoals([{ id: 'goal_1', title: '总体建议', prompt: '请给出该阶段下一步执行建议。' }]);
    setSelectedPropertyIds([]);
    setManualTemplateId('');
    setPushDownTarget('');
    setPushDownMapping('');
    setNewNodeRole('');
    setNewNodeFieldDefaults('');
    setTaskCustomerMode('field');
    setTaskCustomerIdField('');
    setTaskCustomerNameField('');
    setTaskFixedCustomerId('');
    setTaskFixedCustomerName('');
    setTaskAssigneeMode('current');
    setTaskAssigneeIdField('');
    setTaskAssigneeNameField('');
    setTaskFixedAssigneeId('');
    setTaskFixedAssigneeName('');
    setTaskDueDateMode('rule');
    setTaskDueDateField('');
    setTaskFixedDueDate('');
    setTaskOffsetDays('3');
    setTaskRequireConfirm(false);
    setTaskGenerateTask(true);
    setPersonaFieldIds([]);
    setDiscoveryCanvasJson('{"enabled":true,"items":[]}');
    setOqarAssistJson('{"enabled":true,"globalTemplate":"","minClosedQuestions":1,"minOpenQuestions":1,"feedbackTypePrompts":{}}');
    setIsAddingNode(true);
  };

  const handleEditNode = (flowId: string, node: ProcessingNode) => {
    setIsNodeReadOnly(!isFlowDesignMode);
    setActiveFlowId(flowId);
    setEditingNodeId(node.id);
    setNewNodeName(node.name);
    setNewNodeDesc(node.description);
    setNewNodeType(node.type);
    setNewNodeCondition(node.condition || '');
    setConditionResults(node.conditionConfig?.results || []);
    setNewNodeTaskType(node.taskType || '');
    setNewNodeFieldDefaults(node.manualConfig?.fieldDefaults || '');
    
    if (node.type === 'automatic' && node.automaticConfig) {
      setAutoApiEndpoint(node.automaticConfig.apiEndpoint);
      setAutoApiKey(node.automaticConfig.apiKey);
      setAutoOutputFormat(node.automaticConfig.outputFormat);
      setAutoPromptTemplate(node.automaticConfig.promptTemplate);
      setAutoActions(node.automaticConfig.actions);
    } else if (node.type === 'manual' && node.manualConfig) {
      setIsAiAssisted(node.manualConfig.isAiAssisted);
      if (node.manualConfig.isAiAssisted) {
        const aiCfg = node.manualConfig.aiConfig;
        setAiNodeApiEndpoint(aiCfg?.model || aiCfg?.apiEndpoint || node.manualConfig.aiApiEndpoint || '');
        setAiApiKey(node.manualConfig.aiApiKey || '');
        setAiPromptTemplate(aiCfg?.promptTemplate || '');
        setLeadSpinPromptByAction((aiCfg as any)?.spinPromptByAction && typeof (aiCfg as any).spinPromptByAction === 'object' ? (aiCfg as any).spinPromptByAction : {});
        setAiInputs(aiCfg?.inputs || []);
        setAiGoals(aiCfg?.goals && aiCfg.goals.length > 0 ? aiCfg.goals : [{ id: 'goal_1', title: '总体建议', prompt: aiCfg?.promptTemplate || '请给出该阶段下一步执行建议。' }]);
      }
      setSelectedPropertyIds(node.manualConfig.fields.map(f => f.fieldId));
      setManualTemplateId(node.manualConfig.templateId || '');
      const binding = node.manualConfig.taskBinding || {};
      setTaskCustomerMode(binding.customerMode || 'field');
      setTaskCustomerIdField(binding.customerIdField || '');
      setTaskCustomerNameField(binding.customerNameField || '');
      setTaskFixedCustomerId(binding.fixedCustomerId || '');
      setTaskFixedCustomerName(binding.fixedCustomerName || '');
      setTaskAssigneeMode(binding.assigneeMode || 'current');
      setTaskAssigneeIdField(binding.assigneeIdField || '');
      setTaskAssigneeNameField(binding.assigneeNameField || '');
      setTaskFixedAssigneeId(binding.fixedAssigneeId || '');
      setTaskFixedAssigneeName(binding.fixedAssigneeName || '');
      setTaskDueDateMode(binding.dueDateMode || 'rule');
      setTaskDueDateField(binding.dueDateField || '');
      setTaskFixedDueDate(binding.fixedDueDate || '');
      setTaskOffsetDays(String(binding.offsetDays ?? 3));
      setTaskRequireConfirm(Boolean(binding.requireConfirm));
      setTaskGenerateTask(binding.generateTask !== false);
      setPersonaFieldIds(Array.isArray(node.manualConfig.personaFieldIds) ? node.manualConfig.personaFieldIds : []);
      setDiscoveryCanvasJson(JSON.stringify(node.manualConfig.discoveryCanvas || { enabled: true, items: [] }, null, 2));
      setOqarAssistJson(
        JSON.stringify(
          node.manualConfig.oqarAssist || {
            enabled: true,
            globalTemplate: '',
            minClosedQuestions: 1,
            minOpenQuestions: 1,
            feedbackTypePrompts: {}
          },
          null,
          2
        )
      );
    } else if (node.type === 'push_down' && node.pushDownConfig) {
      setPushDownTarget(node.pushDownConfig.targetOntologyCode);
      setPushDownMapping(node.pushDownConfig.mapping.map(m => `${m.sourceField}:${m.targetField}`).join(', '));
    }
    
    setNewNodeRole(node.assignedRole || '');
    setIsAddingNode(true);
  };

  const handleSaveNode = () => {
    if (!ensureDesignMode()) return;
    if (!newNodeName || !activeFlowId) return;

    const nodeData: ProcessingNode = {
      id: editingNodeId || `pn${Date.now()}`,
      name: newNodeName,
      description: newNodeDesc,
      type: newNodeType,
      automaticConfig: newNodeType === 'automatic' ? {
        apiEndpoint: autoApiEndpoint,
        apiKey: autoApiKey,
        inputs: aiInputs,
        outputFormat: autoOutputFormat,
        actions: autoActions,
        promptTemplate: autoPromptTemplate
      } : undefined,
      manualConfig: newNodeType === 'manual' ? {
        // SOP块极简模式：仅保留目标(节点描述)与块提示词
        isAiAssisted: true,
        aiConfig: {
          promptTemplate: String(aiPromptTemplate || '').trim()
        },
        fields: []
      } : undefined,
      pushDownConfig: newNodeType === 'push_down' ? {
        targetOntologyCode: pushDownTarget,
        mapping: pushDownMapping.split(',').map(m => {
          const [sourceField, targetField] = m.split(':').map(s => s.trim());
          return { sourceField, targetField };
        })
      } : undefined,
      conditionConfig: newNodeType === 'condition' ? {
        field: newNodeCondition,
        operator: '==',
        results: conditionResults
      } : undefined,
      assignedRole: newNodeRole || undefined,
      taskType: undefined,
      condition: newNodeType === 'condition' ? newNodeCondition : undefined
    };

    setObjects(objects.map(obj => {
      if (obj.id === activeObjectId) {
        return {
          ...obj,
          flows: (obj.flows || []).map(flow => {
            if (flow.id === activeFlowId) {
              if (editingNodeId) {
                return { ...flow, nodes: flow.nodes.map(n => n.id === editingNodeId ? nodeData : n) };
              }
              return { ...flow, nodes: [...flow.nodes, nodeData] };
            }
            return flow;
          })
        };
      }
      return obj;
    }));

    setIsAddingNode(false);
    setIsNodeReadOnly(false);
    setActiveFlowId(null);
    setEditingNodeId(null);
  };

  const handleAddRule = () => {
    setNewRuleName('');
    setNewRuleTrigger('before_save');
    setNewRuleCondition('');
    setNewRuleActionType('terminate');
    setNewRuleActionValue('');
    setNewRuleActionMessage('');
    setIsAddingRule(true);
  };

  const handleSaveRule = () => {
    if (!newRuleName) return;

    const newRule: OntologyRule = {
      id: `rule${Date.now()}`,
      name: newRuleName,
      triggerPoint: newRuleTrigger,
      condition: newRuleCondition,
      actionType: newRuleActionType,
      actionValue: newRuleActionValue,
      actionMessage: newRuleActionMessage
    };

    setObjects(objects.map(obj => {
      if (obj.id === activeObjectId) {
        return { ...obj, rules: [...(obj.rules || []), newRule] };
      }
      return obj;
    }));

    setIsAddingRule(false);
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setIsAddingProperty(true);
  };

  const handleEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setIsAddingProperty(true);
  };

  const handleSaveProperty = (prop: Property) => {
    setObjects(objects.map(obj => {
      if (obj.id === activeObjectId) {
        const existingPropIndex = obj.properties.findIndex(p => p.id === prop.id);
        if (existingPropIndex > -1) {
          const newProps = [...obj.properties];
          newProps[existingPropIndex] = prop;
          return { ...obj, properties: newProps };
        } else {
          return { ...obj, properties: [...obj.properties, prop] };
        }
      }
      return obj;
    }));
    setIsAddingProperty(false);
    setEditingProperty(null);
  };

  const handleDeleteProperty = (propId: string) => {
    setObjects(objects.map(obj => {
      if (obj.id === activeObjectId) {
        return { ...obj, properties: obj.properties.filter(p => p.id !== propId) };
      }
      return obj;
    }));
  };

  const handleEditObjectBasic = () => {
    const current = activeObject;
    const name = window.prompt('请输入对象名称', current.name);
    if (!name) return;
    const description = window.prompt('请输入对象描述', current.description || '') ?? current.description;
    const systemLink = window.prompt('请输入系统关联', current.systemLink || '') ?? current.systemLink;
    setObjects(
      objects.map((obj) =>
        obj.id === activeObjectId
          ? { ...obj, name: name.trim(), description: description || '', systemLink: systemLink || '' }
          : obj
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 flex justify-between items-end gap-4">
        <div className="min-w-0">
          {objectWorkspaceTab === 'basic' && (
            <div className="inline-flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setObjectWorkspaceTab('basic')}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 bg-white text-indigo-700 shadow-sm"
              >
                <List className="w-4 h-4" />
                基本信息
              </button>
            </div>
          )}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {objectWorkspaceTab === 'basic' && (
            <button
              onClick={() => {
                setObjectWorkspaceTab('flows');
                setActiveTab('flows');
              }}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              SOP
            </button>
          )}
          {objectWorkspaceTab === 'flows' && (
            <button
              onClick={() => setObjectWorkspaceTab('basic')}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
            >
              返回基本信息
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        <ObjectView 
          objects={objects}
          activeObjectId={activeObjectId}
          setActiveObjectId={setActiveObjectId}
          activeObject={activeObject}
          activeTab={objectWorkspaceTab === 'flows' ? 'flows' : activeTab}
          setActiveTab={setActiveTab}
          handleAddFlow={handleAddFlow}
          handleEditFlowMetadata={handleEditFlowMetadata}
          handleAddNode={handleAddNode}
          handleEditNode={handleEditNode}
          handleAddProperty={handleAddProperty}
          handleEditProperty={handleEditProperty}
          handleDeleteProperty={handleDeleteProperty}
          handleEditObjectBasic={handleEditObjectBasic}
          isFlowDesignMode={isFlowDesignMode}
          flowDesignViewSource={flowDesignViewSource}
          onStartFlowDesign={() => handleStartFlowDesign(activeObject?.flows?.[0]?.id)}
          onViewDraftFlow={handleViewDraftFlow}
          onViewPublishedFlow={handleViewPublishedFlow}
          onApplyFlowDesign={handleApplyFlowDesign}
          onDiscardFlowDesign={handleDiscardFlowDesign}
          onRollbackFlowPublished={handleRollbackFlowPublished}
          flowOnly={objectWorkspaceTab === 'flows'}
        />
      </div>

      {/* Modals */}
      <AddFlowModal 
        isOpen={isAddingFlow}
        onClose={() => setIsAddingFlow(false)}
        onSave={handleSaveFlow}
        triggerType={newFlowTriggerType}
        setTriggerType={setNewFlowTriggerType}
        simpleTriggerMode={newFlowSimpleTriggerMode}
        setSimpleTriggerMode={setNewFlowSimpleTriggerMode}
        simpleTriggerField={newFlowSimpleTriggerField}
        setSimpleTriggerField={setNewFlowSimpleTriggerField}
        simpleTriggerValue={newFlowSimpleTriggerValue}
        setSimpleTriggerValue={setNewFlowSimpleTriggerValue}
        name={newFlowName}
        setName={setNewFlowName}
        desc={newFlowDesc}
        setDesc={setNewFlowDesc}
        condition={newFlowCondition}
        setCondition={setNewFlowCondition}
        frequency={newFlowFrequency}
        setFrequency={setNewFlowFrequency}
        sopTaskType={newFlowTaskType}
        setSopTaskType={setNewFlowTaskType}
        availableTaskTypes={taskTypes}
        sopTaskEnabled={newFlowTaskEnabled}
        setSopTaskEnabled={setNewFlowTaskEnabled}
        sopTaskTitleTemplate={newFlowTaskTitleTemplate}
        setSopTaskTitleTemplate={setNewFlowTaskTitleTemplate}
        sopTaskDescTemplate={newFlowTaskDescTemplate}
        setSopTaskDescTemplate={setNewFlowTaskDescTemplate}
        sopTaskFieldMappings={newFlowTaskFieldMappings}
        setSopTaskFieldMappings={setNewFlowTaskFieldMappings}
        availableSourceFields={(activeObject?.properties || []).map((p) => ({ code: p.code, name: p.name }))}
        sopPromptPrefix={newFlowPromptPrefix}
        setSopPromptPrefix={setNewFlowPromptPrefix}
        sopContextSources={newFlowContextSources}
        setSopContextSources={setNewFlowContextSources}
        sopModelId={newFlowModelId}
        setSopModelId={setNewFlowModelId}
        availableModels={llmModelOptions}
        sopReplyPrompt={newFlowOqarReplyPrompt}
        setSopReplyPrompt={setNewFlowOqarReplyPrompt}
        progressionCheckEnabled={newFlowProgressionCheckEnabled}
        setProgressionCheckEnabled={setNewFlowProgressionCheckEnabled}
        progressionCheckPrompt={newFlowProgressionCheckPrompt}
        setProgressionCheckPrompt={setNewFlowProgressionCheckPrompt}
        isCustomerObject={activeObject?.code === 'ba_manucustinfo'}
        isActivationFlow={newFlowIsActivation}
        setIsActivationFlow={(v) => {
          setNewFlowIsActivation(v);
          if (v) {
            setNewFlowTriggerType('auto');
            setNewFlowSimpleTriggerMode('on_field_change');
            setNewFlowSimpleTriggerField('status');
            setNewFlowSimpleTriggerValue('活跃');
          }
        }}
      />

      <AddNodeModal 
        isOpen={isAddingNode}
        onClose={() => {
          setIsAddingNode(false);
          setIsNodeReadOnly(false);
        }}
        onSave={handleSaveNode}
        readOnly={isNodeReadOnly}
        onEnableDesign={async () => {
          await handleStartFlowDesign(activeFlowId || undefined);
          setIsNodeReadOnly(false);
        }}
        name={newNodeName}
        setName={setNewNodeName}
        desc={newNodeDesc}
        setDesc={setNewNodeDesc}
        type={newNodeType}
        setType={setNewNodeType}
        condition={newNodeCondition}
        setCondition={setNewNodeCondition}
        conditionResults={conditionResults}
        setConditionResults={setConditionResults}
        taskType={newNodeTaskType}
        setTaskType={setNewNodeTaskType}
        availableTaskTypes={taskTypes}
        isAiAssisted={isAiAssisted}
        setIsAiAssisted={setIsAiAssisted}
        autoApiEndpoint={autoApiEndpoint}
        setAutoApiEndpoint={setAutoApiEndpoint}
        autoApiKey={autoApiKey}
        setAutoApiKey={setAutoApiKey}
        autoOutputFormat={autoOutputFormat}
        setAutoOutputFormat={setAutoOutputFormat}
        autoPromptTemplate={autoPromptTemplate}
        setAutoPromptTemplate={setAutoPromptTemplate}
        autoActions={autoActions}
        setAutoActions={setAutoActions}
        aiOntologyObject={aiOntologyObject}
        setAiOntologyObject={setAiOntologyObject}
        aiIdField={aiIdField}
        setAiIdField={setAiIdField}
        aiParameters={aiParameters}
        setAiParameters={setAiParameters}
        aiPromptTemplate={aiPromptTemplate}
        setAiPromptTemplate={setAiPromptTemplate}
        leadSpinPromptByAction={leadSpinPromptByAction}
        setLeadSpinPromptByAction={setLeadSpinPromptByAction}
        aiInputs={aiInputs}
        setAiInputs={setAiInputs}
        aiGoals={aiGoals}
        setAiGoals={setAiGoals}
        aiSuccessField={aiSuccessField}
        setAiSuccessField={setAiSuccessField}
        aiUpdates={aiUpdates}
        setAiUpdates={setAiUpdates}
        aiFailureReasonField={aiFailureReasonField}
        setAiFailureReasonField={setAiFailureReasonField}
        aiApiEndpoint={aiNodeApiEndpoint}
        setAiApiEndpoint={setAiNodeApiEndpoint}
        aiApiKey={aiApiKey}
        setAiApiKey={setAiApiKey}
        selectedPropertyIds={selectedPropertyIds}
        setSelectedPropertyIds={setSelectedPropertyIds}
        availableProperties={activeObject.properties}
        manualTemplateId={manualTemplateId}
        setManualTemplateId={setManualTemplateId}
        pushDownTarget={pushDownTarget}
        setPushDownTarget={setPushDownTarget}
        pushDownMapping={pushDownMapping}
        setPushDownMapping={setPushDownMapping}
        role={newNodeRole}
        setRole={setNewNodeRole}
        fieldDefaults={newNodeFieldDefaults}
        setFieldDefaults={setNewNodeFieldDefaults}
        taskCustomerMode={taskCustomerMode}
        setTaskCustomerMode={setTaskCustomerMode}
        taskCustomerIdField={taskCustomerIdField}
        setTaskCustomerIdField={setTaskCustomerIdField}
        taskCustomerNameField={taskCustomerNameField}
        setTaskCustomerNameField={setTaskCustomerNameField}
        taskFixedCustomerId={taskFixedCustomerId}
        setTaskFixedCustomerId={setTaskFixedCustomerId}
        taskFixedCustomerName={taskFixedCustomerName}
        setTaskFixedCustomerName={setTaskFixedCustomerName}
        taskAssigneeMode={taskAssigneeMode}
        setTaskAssigneeMode={setTaskAssigneeMode}
        taskAssigneeIdField={taskAssigneeIdField}
        setTaskAssigneeIdField={setTaskAssigneeIdField}
        taskAssigneeNameField={taskAssigneeNameField}
        setTaskAssigneeNameField={setTaskAssigneeNameField}
        taskFixedAssigneeId={taskFixedAssigneeId}
        setTaskFixedAssigneeId={setTaskFixedAssigneeId}
        taskFixedAssigneeName={taskFixedAssigneeName}
        setTaskFixedAssigneeName={setTaskFixedAssigneeName}
        taskDueDateMode={taskDueDateMode}
        setTaskDueDateMode={setTaskDueDateMode}
        taskDueDateField={taskDueDateField}
        setTaskDueDateField={setTaskDueDateField}
        taskFixedDueDate={taskFixedDueDate}
        setTaskFixedDueDate={setTaskFixedDueDate}
        taskOffsetDays={taskOffsetDays}
        setTaskOffsetDays={setTaskOffsetDays}
        taskRequireConfirm={taskRequireConfirm}
        setTaskRequireConfirm={setTaskRequireConfirm}
        taskGenerateTask={taskGenerateTask}
        setTaskGenerateTask={setTaskGenerateTask}
        personaFieldIds={personaFieldIds}
        setPersonaFieldIds={setPersonaFieldIds}
        discoveryCanvasJson={discoveryCanvasJson}
        setDiscoveryCanvasJson={setDiscoveryCanvasJson}
        oqarAssistJson={oqarAssistJson}
        setOqarAssistJson={setOqarAssistJson}
      />

      <AddPropertyModal 
        isOpen={isAddingProperty}
        onClose={() => setIsAddingProperty(false)}
        onSave={handleSaveProperty}
        editingProperty={editingProperty}
      />

    </div>
  );
}
