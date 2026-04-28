import React, { useEffect, useState } from 'react';
import { Bell, Layers, Sparkles, Swords, Save, Edit2, Trash2, Plus, Briefcase, Users, BookOpen, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomerTypes from './CustomerTypes';
import PersonaAISettings from '../components/PersonaAISettings';
import CompetitorAiSettings from '../components/CompetitorAiSettings';
import { defaultVisitActivationConfig, fetchVisitActivationConfig, saveVisitActivationConfig } from '../lib/visitActivationConfigRepository';
import { fetchCustomerTypesFromSupabase } from '../lib/customerTypeRepository';
import { fetchLlmConfigFromSupabase } from '../lib/llmConfigRepository';
import { fetchArchitectureDataFromSupabase } from '../lib/architectureRepository';
import { AddNodeModal } from '../components/architecture/AddNodeModal';
import { ProcessingNode, AIInputParameter, AIGoalConfig, Property } from '../types/ontology';
import {
  CustomerFollowStrategyConfig,
  defaultCustomerFollowStrategyConfig,
  fetchCustomerFollowStrategyConfig,
  saveCustomerFollowStrategyConfig
} from '../lib/customerFollowStrategyRepository';
import {
  CustomerFaqSubCategory,
  CustomerFaqLibraryConfig,
  defaultCustomerFaqLibraryConfig,
  fetchCustomerFaqLibraryConfig,
  saveCustomerFaqLibraryConfig
} from '../lib/customerFaqLibraryRepository';
import { AiContextConfig } from '../components/AiContextConfig';
import {
  ChatAssistConfig,
  defaultChatAssistConfig,
  fetchChatAssistConfigFromSupabase,
  saveChatAssistConfigToSupabase
} from '../lib/chatAssistConfigRepository';
import ChatAssistFlowEditor from '../components/ChatAssistFlowEditor';

const RANGE_PRESETS = {
  attitude: [
    { label: '强反对~中立', min: -2, max: 0 },
    { label: '反对~支持', min: -1, max: 1 },
    { label: '中立~强支持', min: 0, max: 2 }
  ],
  influence: [
    { label: '低影响(1-2)', min: 1, max: 2 },
    { label: '中高影响(3-4)', min: 3, max: 4 },
    { label: '关键影响(4-5)', min: 4, max: 5 }
  ],
  relation: [
    { label: '弱关系(1-2)', min: 1, max: 2 },
    { label: '稳定关系(2-3)', min: 2, max: 3 },
    { label: '深度关系(3-4)', min: 3, max: 4 }
  ]
};

const RULE_TEMPLATE_PRESETS = [
  {
    label: '决策层攻坚模板',
    value: '请基于华为大客户销售方法，为客户{customer_name}联系人{contact_name}制定“决策层攻坚”跟进策略。输入：职位{position}，角色{roleTag}，态度{attitudeScore}，影响力{influenceLevel}，关系{relationLevel}。输出：1) 关键诉求验证问题 2) 高层价值话术 3) 风险兜底方案 4) 下一次拜访任务建议。'
  },
  {
    label: '技术评审模板',
    value: '请为联系人{contact_name}制定“技术评审推进”策略：围绕技术风险、集成周期、验证路径给出沟通话术，并给出可执行拜访任务清单。输入：{position} {roleTag} 态度{attitudeScore} 影响力{influenceLevel} 关系{relationLevel}。'
  },
  {
    label: '采购谈判模板',
    value: '请为联系人{contact_name}制定“采购谈判推进”建议，重点包含：价格与价值对齐、条款博弈、交付保障、内部签批推进。输入：职位{position} 角色{roleTag} 态度{attitudeScore} 影响力{influenceLevel} 关系{relationLevel}。'
  }
];

const ACTIVATION_DEFAULT_CONTEXT_SOURCES = ['customer_name', 'customer_profile', 'contact_persona', 'chat_records', 'customer_focus_archive'];
const ACTIVATION_DEFAULT_PROMPT_TEMPLATE =
  '你是华为大客户销售顾问，请基于华为销售法（LTC/SPIN/Blue Sheet）深度分析当前客户状态，并给出可执行的客户激活策略。\n' +
  '输入信息：客户名称{custname}、客户画像{profile}、联系人画像{contact_persona}、最近沟通记录{chat}、客户关注点档案{customer_focus_archive}。\n' +
  '输出要求：\n' +
  '1）判断客户当前阶段、关键阻塞与激活机会；\n' +
  '2）输出一个完整激活策略块（目标、关键动作、风险应对、下一步推进）；\n' +
  '3）语言务实、可执行。';

export default function CustomerStrategy() {
  const [activeTab, setActiveTab] = useState<'customer-types' | 'visit-activation' | 'persona-ai' | 'competitor-ai' | 'follow-strategy' | 'intro-templates' | 'faq-library' | 'chat-assist'>('customer-types');
  const [visitActivationConfig, setVisitActivationConfig] = useState<any>(defaultVisitActivationConfig);
  const [followStrategyConfig, setFollowStrategyConfig] = useState<CustomerFollowStrategyConfig>(defaultCustomerFollowStrategyConfig);
  const [faqLibraryConfig, setFaqLibraryConfig] = useState<CustomerFaqLibraryConfig>(defaultCustomerFaqLibraryConfig);
  const [chatAssistConfig, setChatAssistConfig] = useState<ChatAssistConfig>(defaultChatAssistConfig);
  const [selectedFaqCategoryId, setSelectedFaqCategoryId] = useState('');
  const [selectedFaqSubCategoryId, setSelectedFaqSubCategoryId] = useState('');
  const [faqEditMode, setFaqEditMode] = useState(false);
  const [customerTypesMeta, setCustomerTypesMeta] = useState<Array<{ id: string; name: string }>>([]);
  const [llmModelOptions, setLlmModelOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [activationFlowTab, setActivationFlowTab] = useState(0);
  const [ruleTab, setRuleTab] = useState(0);
  const [followStrategyTab, setFollowStrategyTab] = useState<'focus' | 'rules' | 'contact_ai'>('focus');
  const [ruleContextExpanded, setRuleContextExpanded] = useState<Record<string, boolean>>({});
  const [nodeTabs, setNodeTabs] = useState<Record<string, 'desc' | 'ai' | 'task'>>({});

  const [customerObjectProps, setCustomerObjectProps] = useState<Property[]>([]);

  // Node editing states
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeDesc, setNewNodeDesc] = useState('');
  const [newNodeType, setNewNodeType] = useState<'automatic' | 'manual' | 'push_down' | 'condition'>('automatic');
  const [newNodeCondition, setNewNodeCondition] = useState('');
  const [conditionResults, setConditionResults] = useState<{ id: string; label: string; value: string }[]>([]);
  const [newNodeTaskType, setNewNodeTaskType] = useState('');
  const [isAiAssisted, setIsAiAssisted] = useState(true);
  const [autoApiEndpoint, setAutoApiEndpoint] = useState('');
  const [autoApiKey, setAutoApiKey] = useState('');
  const [autoOutputFormat, setAutoOutputFormat] = useState('');
  const [autoPromptTemplate, setAutoPromptTemplate] = useState('');
  const [autoActions, setAutoActions] = useState<any[]>([]);
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
  const [activationNodeContextSources, setActivationNodeContextSources] = useState<string[]>(ACTIVATION_DEFAULT_CONTEXT_SOURCES);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [manualTemplateId, setManualTemplateId] = useState('');
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

  useEffect(() => {
    fetchVisitActivationConfig().then(setVisitActivationConfig).catch(console.error);
    fetchCustomerFollowStrategyConfig().then(setFollowStrategyConfig).catch(console.error);
    fetchCustomerFaqLibraryConfig().then(setFaqLibraryConfig).catch(console.error);
    fetchChatAssistConfigFromSupabase().then(setChatAssistConfig).catch(console.error);
    fetchCustomerTypesFromSupabase().then((types) => setCustomerTypesMeta((types || []).map((t) => ({ id: t.id, name: t.name })))).catch(console.error);
    fetchLlmConfigFromSupabase().then((cfg: any) => {
      const models = cfg?.models || {};
      const options = Object.keys(models).map((id) => ({ id, name: String(models[id]?.name || id) }));
      setLlmModelOptions(options);
    }).catch(console.error);
    fetchArchitectureDataFromSupabase().then(({ objects }) => {
      const customerObj = objects.find(o => o.code === 'ba_manucustinfo' || o.name === '客户');
      if (customerObj) {
        setCustomerObjectProps(customerObj.properties || []);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const categories = faqLibraryConfig.categories || [];
    if (categories.length === 0) {
      setSelectedFaqCategoryId('');
      setSelectedFaqSubCategoryId('');
      return;
    }

    const currentCategory = categories.find((c) => c.id === selectedFaqCategoryId) || categories[0];
    if (currentCategory.id !== selectedFaqCategoryId) {
      setSelectedFaqCategoryId(currentCategory.id);
    }

    const subs = currentCategory.subCategories || [];
    if (subs.length === 0) {
      setSelectedFaqSubCategoryId('');
      return;
    }
    const currentSub = subs.find((s) => s.id === selectedFaqSubCategoryId) || subs[0];
    if (currentSub.id !== selectedFaqSubCategoryId) {
      setSelectedFaqSubCategoryId(currentSub.id);
    }
  }, [faqLibraryConfig, selectedFaqCategoryId, selectedFaqSubCategoryId]);

  const selectedFaqCategory = (faqLibraryConfig.categories || []).find((c) => c.id === selectedFaqCategoryId);
  const selectedFaqSubCategory = (selectedFaqCategory?.subCategories || []).find((s) => s.id === selectedFaqSubCategoryId);
  const updateSelectedFaqSubCategory = (updater: (sub: CustomerFaqSubCategory) => CustomerFaqSubCategory) => {
    if (!selectedFaqCategoryId || !selectedFaqSubCategoryId) return;
    setFaqLibraryConfig((prev) => ({
      ...prev,
      categories: (prev.categories || []).map((category) => {
        if (category.id !== selectedFaqCategoryId) return category;
        return {
          ...category,
          subCategories: (category.subCategories || []).map((sub) => {
            if (sub.id !== selectedFaqSubCategoryId) return sub;
            return updater(sub);
          })
        };
      })
    }));
  };

  const saveActivation = async () => {
    try {
      await saveVisitActivationConfig(visitActivationConfig);
      toast.success('客户激活设置已保存');
    } catch (e) {
      console.error(e);
      toast.error('客户激活设置保存失败');
    }
  };
  const saveCurrentFlow = async (flowId?: string) => {
    try {
      const cfg = {
        ...visitActivationConfig,
        flows: (visitActivationConfig.flows || []).map((f: any) =>
          !flowId || f.id === flowId ? { ...f, mountTarget: 'customer_profile' } : f
        )
      };
      setVisitActivationConfig(cfg);
      await saveVisitActivationConfig(cfg);
      toast.success('当前激活流程已保存并挂载到客户资料');
    } catch (e) {
      console.error(e);
      toast.error('当前激活流程保存失败');
    }
  };
  const getNodeTab = (nodeId: string) => nodeTabs[nodeId] || 'desc';
  const setNodeTab = (nodeId: string, tab: 'desc' | 'ai' | 'task') => setNodeTabs((prev) => ({ ...prev, [nodeId]: tab }));
  const updateNode = (flow: any, nIdx: number, updater: (node: any) => any) => {
    const next = [...(visitActivationConfig.flows || [])];
    const nodes = [...(flow.nodes || [])];
    nodes[nIdx] = updater(nodes[nIdx] || {});
    next[activationFlowTab] = { ...flow, nodes };
    setVisitActivationConfig({ ...visitActivationConfig, flows: next });
  };

  const handleEditNode = (flow: any, node: ProcessingNode) => {
    setEditingNodeId(node.id);
    setNewNodeName(node.name);
    setNewNodeDesc(node.description || '');
    setNewNodeType(node.type || 'manual');
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
    } else if ((node.type === 'manual' || !node.type) && node.manualConfig) {
      setIsAiAssisted(node.manualConfig.isAiAssisted);
      if (node.manualConfig.isAiAssisted) {
        const aiCfg = node.manualConfig.aiConfig;
        setAiNodeApiEndpoint(aiCfg?.model || aiCfg?.apiEndpoint || node.manualConfig.aiApiEndpoint || '');
        setAiApiKey(node.manualConfig.aiApiKey || '');
        setAiPromptTemplate(aiCfg?.promptTemplate || '');
        setLeadSpinPromptByAction(aiCfg?.spinPromptByAction || {});
        setAiInputs(aiCfg?.inputs || []);
        setAiGoals(aiCfg?.goals && aiCfg.goals.length > 0 ? aiCfg.goals : [{ id: 'goal_1', title: '总体建议', prompt: aiCfg?.promptTemplate || '请给出该阶段下一步执行建议。' }]);
      }
      setSelectedPropertyIds(node.manualConfig.fields?.map(f => f.fieldId) || []);
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
    } else if (node.type === 'push_down' && node.pushDownConfig) {
      setPushDownTarget(node.pushDownConfig.targetOntologyCode);
      setPushDownMapping(node.pushDownConfig.mapping.map(m => `${m.sourceField}:${m.targetField}`).join(', '));
    }
    const flatPrompt = String((node as any).aiPromptTemplate || '').trim();
    const flatModel = String((node as any).aiModelId || '').trim();
    const flatContextSources = Array.isArray((node as any).contextSources)
      ? (node as any).contextSources.map((s: any) => String(s || '').trim()).filter(Boolean)
      : [];
    if (flatPrompt) setAiPromptTemplate(flatPrompt);
    if (flatModel) setAiNodeApiEndpoint(flatModel);
    setActivationNodeContextSources(
      flatContextSources.length > 0
        ? flatContextSources
        : (Array.isArray((node as any)?.manualConfig?.aiConfig?.contextSources)
          ? (node as any).manualConfig.aiConfig.contextSources
          : ACTIVATION_DEFAULT_CONTEXT_SOURCES)
    );
    
    setNewNodeRole(node.assignedRole || '');
    setIsAddingNode(true);
  };

  const handleSaveNode = () => {
    if (!newNodeName) return;

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
        isAiAssisted: isAiAssisted,
        aiApiEndpoint: undefined,
        aiApiKey: undefined,
        aiConfig: isAiAssisted ? {
          model: aiNodeApiEndpoint || undefined,
          promptTemplate: aiPromptTemplate,
          contextSources: activationNodeContextSources,
          spinPromptByAction: leadSpinPromptByAction,
          inputs: aiInputs,
          goals: aiGoals
        } : undefined,
        fields: selectedPropertyIds.map(id => {
          const prop = customerObjectProps.find(p => p.id === id);
          return {
            fieldId: id,
            label: prop?.name || '',
            type: prop?.type || 'String',
            updateTarget: prop?.code || ''
          };
        }),
        templateId: manualTemplateId,
        fieldDefaults: newNodeFieldDefaults,
        personaFieldIds: personaFieldIds,
        taskBinding: {
          customerMode: 'field',
          customerIdField: 'id',
          customerNameField: 'custname',
          fixedCustomerId: '',
          fixedCustomerName: '',
          assigneeMode: taskAssigneeMode,
          assigneeIdField: taskAssigneeIdField,
          assigneeNameField: taskAssigneeNameField,
          fixedAssigneeId: taskFixedAssigneeId,
          fixedAssigneeName: taskFixedAssigneeName,
          dueDateMode: taskDueDateMode,
          dueDateField: taskDueDateField,
          fixedDueDate: taskFixedDueDate,
          offsetDays: parseInt(taskOffsetDays, 10) || 0,
          requireConfirm: taskRequireConfirm,
          generateTask: taskGenerateTask
        }
      } : undefined,
      pushDownConfig: newNodeType === 'push_down' ? {
        targetOntologyCode: pushDownTarget,
        mapping: pushDownMapping.split(',').map(m => {
          const [s, t] = m.split(':').map(x => x.trim());
          return { sourceField: s, targetField: t };
        }).filter(m => m.sourceField && m.targetField)
      } : undefined,
      condition: newNodeType === 'condition' ? newNodeCondition : undefined,
      conditionConfig: newNodeType === 'condition' ? {
        field: newNodeCondition,
        operator: 'equals',
        results: conditionResults
      } : undefined,
      assignedRole: newNodeRole,
      taskType: newNodeTaskType,
      aiPromptTemplate: String(aiPromptTemplate || ACTIVATION_DEFAULT_PROMPT_TEMPLATE).trim(),
      aiModelId: String(aiNodeApiEndpoint || '').trim(),
      contextSources: activationNodeContextSources
    };

    const next = [...(visitActivationConfig.flows || [])];
    const flow = next[activationFlowTab];
    if (flow) {
      const nodes = [...(flow.nodes || [])];
      const existIdx = nodes.findIndex(n => n.id === editingNodeId);
      if (existIdx >= 0) {
        nodes[existIdx] = { ...nodes[existIdx], ...nodeData };
      } else {
        nodes.push(nodeData);
      }
      flow.nodes = nodes;
      setVisitActivationConfig({ ...visitActivationConfig, flows: next });
    }
    
    setIsAddingNode(false);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">客户策略</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button onClick={() => setActiveTab('customer-types')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'customer-types' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Layers className="w-4 h-4" />客户类型设置</button>
            <button onClick={() => setActiveTab('visit-activation')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'visit-activation' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Bell className="w-4 h-4" />客户激活设置</button>
            <button onClick={() => setActiveTab('persona-ai')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'persona-ai' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Sparkles className="w-4 h-4" />客户画像AI设置</button>
            <button onClick={() => setActiveTab('competitor-ai')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'competitor-ai' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Swords className="w-4 h-4" />客户竞品分析</button>
            <button onClick={() => setActiveTab('follow-strategy')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'follow-strategy' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Sparkles className="w-4 h-4" />顾客策略配置</button>
            <button onClick={() => setActiveTab('intro-templates')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'intro-templates' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><Briefcase className="w-4 h-4" />介绍模板设置</button>
            <button onClick={() => setActiveTab('faq-library')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'faq-library' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><BookOpen className="w-4 h-4" />客户常见问题库</button>
            <button onClick={() => setActiveTab('chat-assist')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${activeTab === 'chat-assist' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare className="w-4 h-4" />聊天AI辅助流程</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'customer-types' && <CustomerTypes />}

          {activeTab === 'visit-activation' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">客户激活设置</h3>
                  <p className="text-sm text-gray-500 mt-1">客户激活任务模板与流程（节点结构与业务流程一致）。</p>
                </div>
                <button onClick={saveActivation} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4" />保存</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">激活规则模板（规则+流程一体）</h4>
                  <button type="button" onClick={() => { const next = [...(visitActivationConfig.flows || []), { id: `flow_${Date.now()}`, name: `激活规则${(visitActivationConfig.flows || []).length + 1}`, description: '', triggerCondition: '客户长时间未联系', customerTypeId: '', isPotential: undefined, inactiveDays: 30, nodes: [{ id: `node_${Date.now()}`, name: '节点1', description: '', aiPromptTemplate: ACTIVATION_DEFAULT_PROMPT_TEMPLATE, aiModelId: '', contextSources: ACTIVATION_DEFAULT_CONTEXT_SOURCES }] }]; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); setActivationFlowTab(next.length - 1); }} className="px-2 py-1 text-xs font-bold rounded bg-indigo-600 text-white">新增规则模板</button>
                </div>
                <div className="flex flex-wrap gap-2">{(visitActivationConfig.flows || []).map((flow: any, idx: number) => <button key={flow.id} onClick={() => setActivationFlowTab(idx)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${activationFlowTab === idx ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200'}`}>{flow.name}</button>)}</div>
                {(visitActivationConfig.flows || [])[activationFlowTab] && (() => {
                  const flow = (visitActivationConfig.flows || [])[activationFlowTab];
                  return <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">挂载位置：客户资料 {'>'} 激活任务流</span>
                      <button onClick={() => saveCurrentFlow(flow.id)} className="px-3 py-1.5 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700">保存当前流程</button>
                    </div>
                    <input value={flow.name || ''} onChange={(e) => { const next = [...(visitActivationConfig.flows || [])]; next[activationFlowTab] = { ...flow, name: e.target.value }; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="规则模板名称" />
                    <div className="grid grid-cols-12 gap-2">
                      <select value={flow.customerTypeId || ''} onChange={(e) => { const next = [...(visitActivationConfig.flows || [])]; next[activationFlowTab] = { ...flow, customerTypeId: e.target.value }; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); }} className="col-span-4 px-2 py-2 border border-gray-300 rounded text-sm">
                        <option value="">全部客户类型</option>
                        {customerTypesMeta.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <select value={typeof flow.isPotential === 'boolean' ? String(flow.isPotential) : ''} onChange={(e) => { const next = [...(visitActivationConfig.flows || [])]; next[activationFlowTab] = { ...flow, isPotential: e.target.value === '' ? undefined : e.target.value === 'true' }; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); }} className="col-span-3 px-2 py-2 border border-gray-300 rounded text-sm">
                        <option value="">潜在/正式都匹配</option>
                        <option value="true">仅潜在客户</option>
                        <option value="false">仅正式客户</option>
                      </select>
                      <input type="number" min={1} value={flow.inactiveDays || 30} onChange={(e) => { const next = [...(visitActivationConfig.flows || [])]; next[activationFlowTab] = { ...flow, inactiveDays: parseInt(e.target.value, 10) || 30 }; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); }} className="col-span-2 px-2 py-2 border border-gray-300 rounded text-sm" placeholder="阈值天数" />
                      <input value={flow.triggerCondition || ''} onChange={(e) => { const next = [...(visitActivationConfig.flows || [])]; next[activationFlowTab] = { ...flow, triggerCondition: e.target.value }; setVisitActivationConfig({ ...visitActivationConfig, flows: next }); }} className="col-span-3 px-2 py-2 border border-gray-300 rounded text-sm" placeholder="触发条件" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-bold text-gray-700">节点设置</h5>
                      <button type="button" onClick={() => {
                        setEditingNodeId(null);
                        setNewNodeName('');
                        setNewNodeDesc('');
                        setNewNodeType('manual');
                        setAiPromptTemplate(ACTIVATION_DEFAULT_PROMPT_TEMPLATE);
                        setAiNodeApiEndpoint('');
                        setActivationNodeContextSources(ACTIVATION_DEFAULT_CONTEXT_SOURCES);
                        setIsAddingNode(true);
                      }} className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Plus className="w-3 h-3" />添加节点</button>
                    </div>
                    <div className="space-y-2">
                      {(flow.nodes || []).map((node: any, nIdx: number) => (
                        <div key={node.id} className="p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-gray-900">{node.name || '未命名节点'}</div>
                              <div className="text-xs text-gray-500 mt-1 break-words">{node.description || '暂无描述'}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleEditNode(flow, node)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded bg-gray-50 hover:bg-indigo-50"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => {
                                const next = [...(visitActivationConfig.flows || [])];
                                next[activationFlowTab].nodes = next[activationFlowTab].nodes.filter((n: any) => n.id !== node.id);
                                setVisitActivationConfig({ ...visitActivationConfig, flows: next });
                              }} className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">激活策略提示词（华为销售法）</label>
                              <textarea
                                value={String(node.aiPromptTemplate || ACTIVATION_DEFAULT_PROMPT_TEMPLATE)}
                                onChange={(e) => updateNode(flow, nIdx, (prev) => ({ ...prev, aiPromptTemplate: e.target.value }))}
                                className="w-full px-2 py-2 border border-gray-200 rounded text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[88px]"
                                placeholder="请输入激活策略提示词"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">使用模型</label>
                              <select
                                value={String(node.aiModelId || '')}
                                onChange={(e) => updateNode(flow, nIdx, (prev) => ({ ...prev, aiModelId: e.target.value }))}
                                className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">跟随系统默认模型</option>
                                {llmModelOptions.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">背景项数量</label>
                              <div className="h-[38px] px-2 flex items-center text-sm rounded border border-gray-200 bg-gray-50 text-gray-700">
                                {Array.isArray(node.contextSources) ? node.contextSources.length : 0} 项
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">带入背景信息</label>
                              <AiContextConfig
                                value={(Array.isArray(node.contextSources) && node.contextSources.length > 0
                                  ? node.contextSources
                                  : ACTIVATION_DEFAULT_CONTEXT_SOURCES
                                ).map((k: string) => ({ key: k, enabled: true }))}
                                onChange={(nextCtx) => updateNode(flow, nIdx, (prev) => ({ ...prev, contextSources: nextCtx.filter((x: any) => x.enabled).map((x: any) => x.key) }))}
                                allowedKeys={['customer_name', 'customer_profile', 'contact_persona', 'chat_records', 'customer_focus_archive', 'current_ontology_fields']}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>;
                })()}
              </div>
            </div>
          )}

          {activeTab === 'persona-ai' && <PersonaAISettings />}

          {activeTab === 'competitor-ai' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-800">
                竞品库已独立到“资源中心 - 竞品库”。这里仅保留竞品SWOT分析AI策略配置。
              </div>
              <CompetitorAiSettings />
            </div>
          )}

          {activeTab === 'follow-strategy' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">顾客策略配置</h3>
                  <p className="text-sm text-gray-500 mt-1">可按职位/角色/态度/影响力/关系组合配置跟进策略提示词；用于联系人“跟进建议”。</p>
                </div>
                <button
                  onClick={async () => {
                    await saveCustomerFollowStrategyConfig(followStrategyConfig);
                    toast.success('顾客策略已保存');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>

              <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 p-1 bg-gray-50 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setFollowStrategyTab('focus')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${followStrategyTab === 'focus' ? 'bg-white text-indigo-700 border border-indigo-100 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  关注点配置
                </button>
                <button
                  type="button"
                  onClick={() => setFollowStrategyTab('rules')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${followStrategyTab === 'rules' ? 'bg-white text-indigo-700 border border-indigo-100 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  组合跟进策略规则
                </button>
                <button
                  type="button"
                  onClick={() => setFollowStrategyTab('contact_ai')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${followStrategyTab === 'contact_ai' ? 'bg-white text-indigo-700 border border-indigo-100 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  联系人AI搜索
                </button>
              </div>

              {followStrategyTab === 'focus' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800">关注点配置</h4>
                  <button
                    className="px-2 py-1 text-xs font-bold rounded bg-indigo-600 text-white"
                    onClick={() => setFollowStrategyConfig({
                      ...followStrategyConfig,
                      focusPoints: [...(followStrategyConfig.focusPoints || []), { id: `fp_${Date.now()}`, name: '', positions: [], askMethod: '', metric: '' }]
                    })}
                  >
                    新增关注点
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(followStrategyConfig.focusPoints || []).map((p, idx) => (
                    <div key={p.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative group">
                      <button
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFollowStrategyConfig({
                          ...followStrategyConfig,
                          focusPoints: followStrategyConfig.focusPoints.filter((_, i) => i !== idx)
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="space-y-3 pr-8">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">关注点名称</label>
                          <input
                            value={p.name}
                            onChange={(e) => setFollowStrategyConfig({
                              ...followStrategyConfig,
                              focusPoints: followStrategyConfig.focusPoints.map((x, i) => i === idx ? { ...x, name: e.target.value } : x)
                            })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                            placeholder="如：业务结果"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">适用岗位（；分隔）</label>
                          <input
                            value={(p.positions || []).join('；')}
                            onChange={(e) => setFollowStrategyConfig({
                              ...followStrategyConfig,
                              focusPoints: followStrategyConfig.focusPoints.map((x, i) => i === idx ? { ...x, positions: e.target.value.split('；').map(s => s.trim()).filter(Boolean) } : x)
                            })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="如：总经理；总裁"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">如何询问（话术）</label>
                          <input
                            value={p.askMethod}
                            onChange={(e) => setFollowStrategyConfig({
                              ...followStrategyConfig,
                              focusPoints: followStrategyConfig.focusPoints.map((x, i) => i === idx ? { ...x, askMethod: e.target.value } : x)
                            })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="如：您对目前业务达成的最大期望是什么？"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">评估指标</label>
                          <input
                            value={p.metric}
                            onChange={(e) => setFollowStrategyConfig({
                              ...followStrategyConfig,
                              focusPoints: followStrategyConfig.focusPoints.map((x, i) => i === idx ? { ...x, metric: e.target.value } : x)
                            })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-indigo-600"
                            placeholder="如：营收增长率、利润率"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {followStrategyTab === 'rules' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-800">组合跟进策略规则（傻瓜式）</h4>
                  <button
                    className="px-2 py-1 text-xs font-bold rounded bg-indigo-600 text-white"
                    onClick={() => {
                      const newRules = [...(followStrategyConfig.rules || []), {
                        id: `sr_${Date.now()}`,
                        name: `新规则${(followStrategyConfig.rules || []).length + 1}`,
                        positionKeywords: [],
                        roleTags: ['I'] as Array<'A' | 'D' | 'S' | 'E' | 'I'>,
                        attitudeMin: -2,
                        attitudeMax: 2,
                        influenceMin: 1,
                        influenceMax: 5,
                        relationMin: 1,
                        relationMax: 4,
                        contextSources: ['customer_name', 'customer_focus_archive', 'contact_persona'],
                        promptTemplate: defaultCustomerFollowStrategyConfig.rules[0].promptTemplate
                      }];
                      setFollowStrategyConfig({ ...followStrategyConfig, rules: newRules });
                      setRuleTab(newRules.length - 1);
                    }}
                  >
                    新增规则
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(followStrategyConfig.rules || []).map((r, idx) => (
                    <button 
                      key={r.id} 
                      onClick={() => setRuleTab(idx)} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${ruleTab === idx ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                      {r.name || `规则${idx + 1}`}
                    </button>
                  ))}
                </div>

                {(followStrategyConfig.rules || [])[ruleTab] && (() => {
                  const r = (followStrategyConfig.rules || [])[ruleTab];
                  const idx = ruleTab;
                  return (
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded">配置：{r.name}</span>
                        <button className="px-3 py-1.5 text-xs font-bold rounded border border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                          const nextRules = followStrategyConfig.rules.filter((_, i) => i !== idx);
                          setFollowStrategyConfig({ ...followStrategyConfig, rules: nextRules });
                          setRuleTab(Math.max(0, idx - 1));
                        }}>删除当前规则</button>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-lg border border-gray-100">
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">规则名称</label>
                          <input
                            value={r.name}
                            onChange={(e) => setFollowStrategyConfig({ ...followStrategyConfig, rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, name: e.target.value } : x) })}
                            className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="例如：采购谈判推进"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-8">
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">适用岗位关键词（包含即可，；分隔）</label>
                          <input
                            value={r.positionKeywords.join('；')}
                            onChange={(e) => setFollowStrategyConfig({
                              ...followStrategyConfig,
                              rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, positionKeywords: e.target.value.split('；').map(s => s.trim()).filter(Boolean) } : x)
                            })}
                            className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="如：总；总监；总经理（留空则不限）"
                          />
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-100 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-2">包含角色</label>
                          <div className="flex flex-wrap gap-2">
                            {(['A', 'D', 'S', 'E', 'I'] as const).map((tag) => {
                              const ROLE_LABELS: Record<string, string> = { 'A': 'A 审批者', 'D': 'D 决策者', 'S': 'S 支持者', 'E': 'E 评估者', 'I': 'I 影响者' };
                              const selected = r.roleTags?.includes(tag);
                              return (
                                <button
                                  key={`${r.id}_${tag}`}
                                  onClick={() => setFollowStrategyConfig({
                                    ...followStrategyConfig,
                                    rules: followStrategyConfig.rules.map((x, i) => {
                                      if (i !== idx) return x;
                                      const next = selected ? x.roleTags.filter((t) => t !== tag) : [...(x.roleTags || []), tag];
                                      return { ...x, roleTags: next as any };
                                    })
                                  })}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                                  type="button"
                                >
                                  {ROLE_LABELS[tag]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">态度范围</label>
                            <select
                              value={`${r.attitudeMin}_${r.attitudeMax}`}
                              onChange={(e) => {
                                const [min, max] = e.target.value.split('_').map(Number);
                                setFollowStrategyConfig({
                                  ...followStrategyConfig,
                                  rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, attitudeMin: min, attitudeMax: max } : x)
                                });
                              }}
                              className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                              {RANGE_PRESETS.attitude.map((p) => (
                                <option key={`${p.min}_${p.max}`} value={`${p.min}_${p.max}`}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">影响力范围</label>
                            <select
                              value={`${r.influenceMin}_${r.influenceMax}`}
                              onChange={(e) => {
                                const [min, max] = e.target.value.split('_').map(Number);
                                setFollowStrategyConfig({
                                  ...followStrategyConfig,
                                  rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, influenceMin: min, influenceMax: max } : x)
                                });
                              }}
                              className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                              {RANGE_PRESETS.influence.map((p) => (
                                <option key={`${p.min}_${p.max}`} value={`${p.min}_${p.max}`}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1">关系范围</label>
                            <select
                              value={`${r.relationMin}_${r.relationMax}`}
                              onChange={(e) => {
                                const [min, max] = e.target.value.split('_').map(Number);
                                setFollowStrategyConfig({
                                  ...followStrategyConfig,
                                  rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, relationMin: min, relationMax: max } : x)
                                });
                              }}
                              className="w-full px-2 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                              {RANGE_PRESETS.relation.map((p) => (
                                <option key={`${p.min}_${p.max}`} value={`${p.min}_${p.max}`}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-100 space-y-3">
                          <label className="block text-sm font-bold text-gray-800">策略生成提示词（可插入变量）</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {RULE_TEMPLATE_PRESETS.map((tpl) => (
                              <button
                                key={tpl.label}
                                onClick={() => setFollowStrategyConfig({ ...followStrategyConfig, rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, promptTemplate: tpl.value } : x) })}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors"
                              >
                                套用{tpl.label}模板
                              </button>
                            ))}
                          </div>
                          <div className="relative">
                              <textarea
                                value={r.promptTemplate}
                                onChange={(e) => setFollowStrategyConfig({ ...followStrategyConfig, rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, promptTemplate: e.target.value } : x) })}
                                className="w-full min-h-[120px] px-3 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="输入策略生成提示词..."
                              />
                              <div className="flex flex-wrap gap-1 mt-2">
                                {[
                                  { key: 'customer_name', name: '客户名称' },
                                  { key: 'customer_profile', name: '客户画像' },
                                  { key: 'contact_name', name: '联系人姓名' },
                                  { key: 'position', name: '联系人职位' },
                                  { key: 'roleTag', name: '角色(A/D/S/E/I)' },
                                  { key: 'attitudeScore', name: '态度分值' },
                                  { key: 'influenceLevel', name: '影响力分值' },
                                  { key: 'relationLevel', name: '关系分值' }
                                ].map((param) => (
                                  <button
                                    key={param.key}
                                    onClick={() => setFollowStrategyConfig({
                                      ...followStrategyConfig,
                                      rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, promptTemplate: `${x.promptTemplate || ''}{${param.key}}` } : x)
                                    })}
                                    className="px-2 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded border border-indigo-100 transition-colors"
                                  >
                                    +{param.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <button
                            onClick={() => setRuleContextExpanded({ ...ruleContextExpanded, [r.id]: !ruleContextExpanded[r.id] })}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-800"
                          >
                            <span>带入背景信息配置（当前已启用 {Array.isArray(r.contextSources) ? r.contextSources.length : 0} 项）</span>
                            <span className="text-gray-400 text-xs">{ruleContextExpanded[r.id] ? '收起' : '展开配置'}</span>
                          </button>
                          {ruleContextExpanded[r.id] && (
                            <div className="p-4 border-t border-gray-100">
                              <AiContextConfig
                                value={Array.isArray(r.contextSources) ? r.contextSources.map((s: string) => ({ key: s, enabled: true })) : []}
                                onChange={(next) => setFollowStrategyConfig({
                                  ...followStrategyConfig,
                                  rules: followStrategyConfig.rules.map((x, i) => i === idx ? { ...x, contextSources: next.filter((n: any) => n.enabled).map((n: any) => n.key) } : x)
                                })}
                                allowedKeys={['customer_name', 'customer_profile', 'customer_focus_archive', 'contact_persona', 'email_records', 'wechat_records', 'meeting_records', 'chat_records']}
                              />
                            </div>
                          )}
                        </div>
                    </div>
                  );
                })()}
              </div>
              )}

              {followStrategyTab === 'contact_ai' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm text-indigo-800">
                    联系人 AI 搜索会按联系人姓名、手机号、职位进行网络公开信息搜集，并要求多源交叉验证。系统会自动把 AI 搜集到的联系人姓名补上“AI”后缀，同时补齐视频号、抖音、小红书等社媒行为资料。
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
                    <label className="block text-sm font-bold text-gray-800">联系人 AI 搜索提示词</label>
                    <textarea
                      value={followStrategyConfig.contactSearchPrompt || ''}
                      onChange={(e) => setFollowStrategyConfig({
                        ...followStrategyConfig,
                        contactSearchPrompt: e.target.value
                      })}
                      className="w-full min-h-[240px] px-3 py-2 border border-gray-200 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="配置联系人公开资料 AI 搜索提示词..."
                    />
                    <div className="text-xs text-gray-500">
                      建议约束：仅输出 JSON、要求多源交叉验证、未知字段留空、姓名加 AI 后缀、重点补齐社媒行为资料。
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'intro-templates' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">介绍模板设置</h3>
                  <p className="text-sm text-gray-500 mt-1">配置公司介绍及各岗位个人介绍模板，用于生成标准化的对外话术。</p>
                </div>
                <button
                  onClick={async () => {
                    await saveCustomerFollowStrategyConfig(followStrategyConfig);
                    toast.success('介绍模板已保存');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>

              <div className="space-y-6">
                {/* 公司介绍模板 */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-indigo-600" />
                        公司介绍模板
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">基于华为大客户销售法，提炼公司核心价值，用于统一对外宣讲口径。</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1">公司愿景/定位</label>
                      <textarea
                        value={followStrategyConfig.companyIntro?.vision || ''}
                        onChange={(e) => setFollowStrategyConfig({
                          ...followStrategyConfig,
                          companyIntro: { ...followStrategyConfig.companyIntro!, vision: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                        placeholder="例如：成为全球领先的智能连接解决方案提供商。"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1">主营业务/行业地位</label>
                      <textarea
                        value={followStrategyConfig.companyIntro?.business || ''}
                        onChange={(e) => setFollowStrategyConfig({
                          ...followStrategyConfig,
                          companyIntro: { ...followStrategyConfig.companyIntro!, business: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                        placeholder="例如：专注于高端连接器研发制造，在新能源汽车与工控领域位居国内前三。"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1">核心优势</label>
                      <textarea
                        value={followStrategyConfig.companyIntro?.advantages || ''}
                        onChange={(e) => setFollowStrategyConfig({
                          ...followStrategyConfig,
                          companyIntro: { ...followStrategyConfig.companyIntro!, advantages: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                        placeholder="例如：拥有全链条自主研发能力，交付周期比行业平均快30%。"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-gray-700 mb-1">知名案例</label>
                      <textarea
                        value={followStrategyConfig.companyIntro?.cases || ''}
                        onChange={(e) => setFollowStrategyConfig({
                          ...followStrategyConfig,
                          companyIntro: { ...followStrategyConfig.companyIntro!, cases: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]"
                        placeholder="例如：已深度服务比亚迪、大疆等行业龙头。"
                      />
                    </div>
                  </div>
                </div>

                {/* 个人介绍模板 */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        个人介绍模板 (按岗位)
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">针对不同角色（如销售、售前、交付）制定标准化个人介绍，突出专业价值与承诺。</p>
                    </div>
                    <button
                      onClick={() => setFollowStrategyConfig({
                        ...followStrategyConfig,
                        personalIntros: [...(followStrategyConfig.personalIntros || []), {
                          id: `pi_${Date.now()}`, position: '新岗位', identity: '', value: '', background: '', commitment: ''
                        }]
                      })}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      新增岗位模板
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(followStrategyConfig.personalIntros || []).map((pi, idx) => (
                      <div key={pi.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 relative group">
                        <button
                          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-600 rounded bg-white hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          onClick={() => setFollowStrategyConfig({
                            ...followStrategyConfig,
                            personalIntros: followStrategyConfig.personalIntros!.filter((_, i) => i !== idx)
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                          <div className="md:col-span-2">
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">适用岗位</label>
                            <input
                              value={pi.position}
                              onChange={(e) => setFollowStrategyConfig({
                                ...followStrategyConfig,
                                personalIntros: followStrategyConfig.personalIntros!.map((x, i) => i === idx ? { ...x, position: e.target.value } : x)
                              })}
                              className="w-1/3 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-700"
                              placeholder="例如：大客户销售"
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">我是谁</label>
                            <textarea
                              value={pi.identity}
                              onChange={(e) => setFollowStrategyConfig({
                                ...followStrategyConfig,
                                personalIntros: followStrategyConfig.personalIntros!.map((x, i) => i === idx ? { ...x, identity: e.target.value } : x)
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                              placeholder="例如：您好，我是负责华南区大客户业务的张三。"
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">我能为你提供什么价值</label>
                            <textarea
                              value={pi.value}
                              onChange={(e) => setFollowStrategyConfig({
                                ...followStrategyConfig,
                                personalIntros: followStrategyConfig.personalIntros!.map((x, i) => i === idx ? { ...x, value: e.target.value } : x)
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                              placeholder="例如：希望能作为您的内部连接器专家，帮您规避选型风险。"
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">我的专业背景/过往成绩</label>
                            <textarea
                              value={pi.background}
                              onChange={(e) => setFollowStrategyConfig({
                                ...followStrategyConfig,
                                personalIntros: followStrategyConfig.personalIntros!.map((x, i) => i === idx ? { ...x, background: e.target.value } : x)
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                              placeholder="例如：我在电子元器件行业有8年从业经验..."
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-bold text-gray-700 mb-1">我对本次合作的承诺</label>
                            <textarea
                              value={pi.commitment}
                              onChange={(e) => setFollowStrategyConfig({
                                ...followStrategyConfig,
                                personalIntros: followStrategyConfig.personalIntros!.map((x, i) => i === idx ? { ...x, commitment: e.target.value } : x)
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                              placeholder="例如：我会保证2小时内响应您的任何需求。"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(followStrategyConfig.personalIntros?.length || 0) === 0 && (
                      <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        暂无个人介绍模板，请点击右上角新增
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq-library' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">客户常见问题库</h3>
                  <p className="text-sm text-gray-500 mt-1">仅保留问题分类、问题和答案。左侧切换，右侧查看/编辑。</p>
                </div>
                <div className="flex items-center gap-2">
                  {!faqEditMode ? (
                    <button
                      onClick={() => setFaqEditMode(true)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={async () => {
                          const latest = await fetchCustomerFaqLibraryConfig();
                          setFaqLibraryConfig(latest);
                          setFaqEditMode(false);
                          toast.success('已取消编辑');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={async () => {
                          await saveCustomerFaqLibraryConfig(faqLibraryConfig);
                          setFaqEditMode(false);
                          toast.success('客户常见问题库已保存');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 min-h-[520px]">
                <div className="col-span-12 lg:col-span-4 rounded-xl border border-gray-200 bg-gray-50/40 p-3 overflow-y-auto max-h-[620px]">
                  <div className="space-y-2">
                    {(faqLibraryConfig.categories || []).map((category) => {
                      const isCategoryActive = category.id === selectedFaqCategoryId;
                      return (
                        <div key={category.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFaqCategoryId(category.id);
                              setSelectedFaqSubCategoryId(category.subCategories?.[0]?.id || '');
                            }}
                            className={`w-full text-left px-3 py-2.5 border-b border-gray-100 ${isCategoryActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            <div className="text-sm font-bold">{category.name}</div>
                          </button>
                          <div className="py-1">
                            {(category.subCategories || []).map((sub) => {
                              const isSubActive = isCategoryActive && sub.id === selectedFaqSubCategoryId;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFaqCategoryId(category.id);
                                    setSelectedFaqSubCategoryId(sub.id);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm border-l-2 ${isSubActive ? 'border-indigo-500 bg-indigo-50/60 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-8 rounded-xl border border-gray-200 bg-white p-5">
                  {!selectedFaqSubCategory ? (
                    <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-400">
                      暂无问题条目，请先在左侧选择分类
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-gray-100">
                        <div className="text-xs text-gray-500">分类：{selectedFaqCategory?.name || '-'}</div>
                        <h4 className="text-lg font-bold text-gray-900 mt-1">{selectedFaqSubCategory.name || '未命名条目'}</h4>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500">问题</label>
                        {faqEditMode ? (
                          <textarea
                            value={selectedFaqSubCategory.question}
                            onChange={(e) => updateSelectedFaqSubCategory((sub) => ({ ...sub, question: e.target.value }))}
                            className="w-full min-h-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="输入问题内容"
                          />
                        ) : (
                          <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">{selectedFaqSubCategory.question || '-'}</div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500">答案</label>
                        {faqEditMode ? (
                          <textarea
                            value={selectedFaqSubCategory.answer}
                            onChange={(e) => updateSelectedFaqSubCategory((sub) => ({ ...sub, answer: e.target.value }))}
                            className="w-full min-h-[140px] px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="输入答案"
                          />
                        ) : (
                          <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap min-h-[120px]">{selectedFaqSubCategory.answer || '-'}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat-assist' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">聊天AI辅助流程设置</h3>
                  <p className="text-sm text-gray-500 mt-1">支持多流程配置与默认流程选择。聊天 AI 将按默认流程节点检索数据库并生成回复。</p>
                </div>
                <button
                  onClick={async () => {
                    await saveChatAssistConfigToSupabase(chatAssistConfig);
                    toast.success('聊天AI辅助流程已保存');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
              <ChatAssistFlowEditor value={chatAssistConfig} onChange={setChatAssistConfig} />
            </div>
          )}
        </div>
      </div>

      <AddNodeModal
        isOpen={isAddingNode}
        onClose={() => setIsAddingNode(false)}
        onSave={handleSaveNode}
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
        availableTaskTypes={['客户拜访', '普通任务']}
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
        availableProperties={customerObjectProps}
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
      />
    </div>
  );
}
