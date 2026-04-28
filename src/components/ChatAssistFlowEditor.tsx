import React from 'react';
import { ChatAssistConfig, ChatAssistFlow, defaultChatAssistConfig } from '../lib/chatAssistConfigRepository';
import { AiContextConfig } from './AiContextConfig';
import { fetchLlmConfigFromSupabase } from '../lib/llmConfigRepository';

type Props = {
  value: ChatAssistConfig;
  onChange: (next: ChatAssistConfig) => void;
};

const makePresetFlow = (kind: 'huawei' | 'tech' | 'biz', defaultModelId?: string): ChatAssistFlow => {
  if (kind === 'tech') {
    return {
      id: `flow_tech_${Date.now()}`,
      name: '技术答复流程',
      description: '适合技术评审/参数异议场景',
      modelId: String(defaultModelId || '').trim(),
      enabled: true,
      nodes: [
        { id: `n_${Date.now()}_1`, name: '识别技术问题', enabled: true, dataSources: ['chat_context', 'intent', 'persona'], instruction: '识别技术问题、风险点和发言人角色', promptTemplate: '基于{{chat_context}}识别技术问题，输出关键风险。', outputVar: 'role_intent_result' },
        { id: `n_${Date.now()}_2`, name: '检索证据', enabled: true, dataSources: ['faq', 'customer_demand', 'product_fab', 'customer_cases'], instruction: '检索FAQ、需求、FAB、案例', promptTemplate: '根据{{intent_summary}}和{{customer_demand}}检索证据。', outputVar: 'evidence_result', contextSources: ['customer_profile', 'customer_focus_archive', 'wechat_records'] },
        { id: `n_${Date.now()}_3`, name: '生成答复', enabled: true, dataSources: ['chat_context', 'product_fab', 'customer_cases'], instruction: '生成可直接发送的技术答复', promptTemplate: '结合{{chat_context}}和{{evidence_result}}输出技术答复。', outputVar: 'reply_result', contextSources: ['customer_name', 'chat_records'] }
      ]
    };
  }
  if (kind === 'biz') {
    return {
      id: `flow_biz_${Date.now()}`,
      name: '商务谈判流程',
      description: '适合价格/条款/交付谈判场景',
      modelId: String(defaultModelId || '').trim(),
      enabled: true,
      nodes: [
        { id: `n_${Date.now()}_1`, name: '识别商务诉求', enabled: true, dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'], instruction: '识别价格、账期、条款诉求', promptTemplate: '基于{{chat_context}}识别商务诉求与角色。', outputVar: 'role_intent_result', contextSources: ['customer_name', 'contact_persona', 'chat_records'] },
        { id: `n_${Date.now()}_2`, name: '检索价值依据', enabled: true, dataSources: ['faq', 'focus_competitor', 'customer_cases', 'customer_profile'], instruction: '检索价值证据与竞品差异', promptTemplate: '结合{{focus_context}}和{{customer_cases}}形成价值依据。', outputVar: 'evidence_result', contextSources: ['customer_profile', 'customer_focus_archive', 'wechat_records', 'wechat_group_records'] },
        { id: `n_${Date.now()}_3`, name: '输出谈判话术', enabled: true, dataSources: ['chat_context', 'focus_competitor', 'customer_cases'], instruction: '先价值后价格，输出谈判话术', promptTemplate: '根据{{chat_context}}和{{evidence_result}}输出谈判话术。', outputVar: 'reply_result', contextSources: ['customer_name', 'chat_records'] }
      ]
    };
  }
  return {
    id: `flow_hw_${Date.now()}`,
    name: '华为标准流程',
    description: '标准大客户销售会话流程',
    modelId: String(defaultModelId || '').trim(),
    enabled: true,
    nodes: [
      { id: `n_${Date.now()}_1`, name: '识别发言人与阶段', enabled: true, dataSources: ['chat_context', 'intent', 'persona', 'department_prompt'], instruction: '识别角色与会话阶段', promptTemplate: '基于{{chat_context}}识别发言人角色、意图和阶段。', outputVar: 'role_intent_result', contextSources: ['customer_name', 'contact_persona', 'chat_records'] },
      { id: `n_${Date.now()}_2`, name: '检索多源证据', enabled: true, dataSources: ['faq', 'focus_competitor', 'customer_profile', 'customer_demand', 'customer_cases', 'product_fab'], instruction: '按意图检索多源资料', promptTemplate: '按{{intent_summary}}检索FAQ/需求/案例/FAB并输出证据链。', outputVar: 'evidence_result', contextSources: ['customer_profile', 'customer_focus_archive', 'wechat_records', 'wechat_group_records', 'meeting_records'] },
      { id: `n_${Date.now()}_3`, name: '生成建议话术', enabled: true, dataSources: ['chat_context', 'faq', 'persona', 'focus_competitor', 'customer_cases', 'product_fab'], instruction: '输出可发送话术与推进动作', promptTemplate: '结合{{chat_context}}、{{evidence_result}}输出最终话术。', outputVar: 'reply_result', contextSources: ['customer_name', 'customer_profile', 'chat_records'] }
    ]
  };
};

export default function ChatAssistFlowEditor({ value, onChange }: Props) {
  const cfg = value || defaultChatAssistConfig;
  const flows = cfg.flows || [];
  const activeFlow = flows.find((f) => f.id === cfg.defaultFlowId) || flows[0];
  const [modelOptions, setModelOptions] = React.useState<Array<{ id: string; name: string }>>([]);
  const [defaultModelId, setDefaultModelId] = React.useState<string>('');

  React.useEffect(() => {
    fetchLlmConfigFromSupabase()
      .then((llm) => {
        const models = llm.models || {};
        setDefaultModelId(String(llm.defaultModel || '').trim());
        const options = Object.entries(models)
          .filter(([, m]) => m?.enabled !== false)
          .map(([id, m]) => ({ id, name: m?.name || id }));
        setModelOptions(options);
      })
      .catch(() => undefined);
  }, []);

  const updateFlow = (flowId: string, updater: (flow: ChatAssistFlow) => ChatAssistFlow) => {
    onChange({
      ...cfg,
      flows: flows.map((flow) => flow.id === flowId ? updater(flow) : flow)
    });
  };

  return (
    <div className="space-y-5">
      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
        <div className="text-sm font-bold text-indigo-900">傻瓜化流程设置</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onChange({ ...cfg, flows: [...flows, makePresetFlow('huawei', defaultModelId)] })} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">新增：华为标准流程</button>
          <button onClick={() => onChange({ ...cfg, flows: [...flows, makePresetFlow('tech', defaultModelId)] })} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">新增：技术答复流程</button>
          <button onClick={() => onChange({ ...cfg, flows: [...flows, makePresetFlow('biz', defaultModelId)] })} className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50">新增：商务谈判流程</button>
        </div>
        <div className="text-[11px] text-indigo-700">可配置多个流程，其中一个设为默认。聊天 AI 辅助时优先执行默认流程。</div>
        {modelOptions.length === 0 && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">未配置可用大模型，请先到系统设置中启用模型。</div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => onChange({ ...cfg, defaultFlowId: flow.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${cfg.defaultFlowId === flow.id ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {flow.name}{cfg.defaultFlowId === flow.id ? '（默认）' : ''}
            </button>
          ))}
        </div>
        {activeFlow && (
          <div className="p-4 border border-gray-200 rounded-xl space-y-3 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_220px_auto_auto] gap-2 items-center">
              <input value={activeFlow.name} onChange={(e) => updateFlow(activeFlow.id, (f) => ({ ...f, name: e.target.value }))} className="px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="流程名称" />
              <input value={activeFlow.description || ''} onChange={(e) => updateFlow(activeFlow.id, (f) => ({ ...f, description: e.target.value }))} className="px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="流程描述" />
              <select
                value={activeFlow.modelId || ''}
                onChange={(e) => updateFlow(activeFlow.id, (f) => ({ ...f, modelId: e.target.value }))}
                className="px-2 py-1.5 border border-gray-200 rounded text-sm"
              >
                <option value="">未设置大模型</option>
                {modelOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <label className="text-xs text-gray-600 flex items-center gap-1">
                <input type="checkbox" checked={activeFlow.enabled !== false} onChange={(e) => updateFlow(activeFlow.id, (f) => ({ ...f, enabled: e.target.checked }))} />
                启用
              </label>
              <button
                onClick={() => {
                  const next = flows.filter((f) => f.id !== activeFlow.id);
                  onChange({
                    ...cfg,
                    flows: next,
                    defaultFlowId: cfg.defaultFlowId === activeFlow.id ? (next[0]?.id || '') : cfg.defaultFlowId
                  });
                }}
                className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded bg-red-50"
              >
                删除流程
              </button>
            </div>

            <div className="space-y-2">
              {(activeFlow.nodes || []).map((node, idx) => (
                <div key={node.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50/30 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <input
                      value={node.name}
                      onChange={(e) => updateFlow(activeFlow.id, (f) => ({
                        ...f,
                        nodes: f.nodes.map((n) => n.id === node.id ? { ...n, name: e.target.value } : n)
                      }))}
                      className="px-2 py-1.5 border border-gray-200 rounded text-sm"
                      placeholder={`节点${idx + 1}名称`}
                    />
                    <label className="text-xs text-gray-600 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={node.enabled !== false}
                        onChange={(e) => updateFlow(activeFlow.id, (f) => ({
                          ...f,
                          nodes: f.nodes.map((n) => n.id === node.id ? { ...n, enabled: e.target.checked } : n)
                        }))}
                      />
                      启用
                    </label>
                    <button
                      onClick={() => updateFlow(activeFlow.id, (f) => ({ ...f, nodes: f.nodes.filter((n) => n.id !== node.id) }))}
                      className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded bg-red-50"
                    >
                      删除节点
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">节点带入背景参数</label>
                    <AiContextConfig
                      value={(node.contextSources || []).map((k) => ({ key: k, enabled: true }))}
                      onChange={(next) => updateFlow(activeFlow.id, (f) => ({
                        ...f,
                        nodes: f.nodes.map((n) => n.id === node.id ? { ...n, contextSources: next.filter((x) => x.enabled).map((x) => x.key) } : n)
                      }))}
                      allowedKeys={['customer_name', 'customer_profile', 'contact_persona', 'customer_focus_archive', 'competitor_profile', 'email_records', 'wechat_records', 'wechat_group_records', 'meeting_records', 'chat_records']}
                    />
                  </div>

                  <textarea
                    value={node.instruction || ''}
                    onChange={(e) => updateFlow(activeFlow.id, (f) => ({
                      ...f,
                      nodes: f.nodes.map((n) => n.id === node.id ? { ...n, instruction: e.target.value } : n)
                    }))}
                    className="w-full min-h-[56px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="节点执行说明"
                  />
                  <textarea
                    value={node.promptTemplate || ''}
                    onChange={(e) => updateFlow(activeFlow.id, (f) => ({
                      ...f,
                      nodes: f.nodes.map((n) => n.id === node.id ? { ...n, promptTemplate: e.target.value } : n)
                    }))}
                    className="w-full min-h-[72px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="节点模板（支持 {{chat_context}} {{faq_context}} {{customer_demand}} {{node_result_xxx}} 等）"
                  />
                  <input
                    value={node.outputVar || ''}
                    onChange={(e) => updateFlow(activeFlow.id, (f) => ({
                      ...f,
                      nodes: f.nodes.map((n) => n.id === node.id ? { ...n, outputVar: e.target.value } : n)
                    }))}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                    placeholder="节点输出变量名（如 evidence_result）"
                  />
                </div>
              ))}
              <button
                onClick={() => updateFlow(activeFlow.id, (f) => ({
                  ...f,
                  nodes: [
                    ...(f.nodes || []),
                    {
                      id: `node_${Date.now()}`,
                      name: `新节点${(f.nodes || []).length + 1}`,
                      enabled: true,
                      dataSources: ['chat_context'],
                      instruction: '',
                      promptTemplate: '',
                      outputVar: `node_result_${(f.nodes || []).length + 1}`,
                      contextSources: ['chat_records']
                    }
                  ]
                }))}
                className="text-xs px-3 py-1.5 border border-indigo-200 text-indigo-700 rounded bg-white hover:bg-indigo-50"
              >
                新增节点
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
