import React, { useMemo, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { AiContextConfig } from '../AiContextConfig';

const OQAR_ALLOWED_CONTEXT_KEYS = [
  'customer_name',
  'customer_profile',
  'contact_persona',
  'email_records',
  'wechat_records',
  'wechat_group_records',
  'meeting_records',
  'chat_records',
  'customer_focus_archive',
  'current_ontology_fields'
];

interface AddFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  triggerType: 'button' | 'auto' | 'timed';
  setTriggerType: (v: 'button' | 'auto' | 'timed') => void;
  simpleTriggerMode?: 'manual' | 'on_create' | 'on_approve' | 'on_field_change';
  setSimpleTriggerMode?: (v: 'manual' | 'on_create' | 'on_approve' | 'on_field_change') => void;
  simpleTriggerField?: string;
  setSimpleTriggerField?: (v: string) => void;
  simpleTriggerValue?: string;
  setSimpleTriggerValue?: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  frequency: string;
  setFrequency: (v: string) => void;
  isCustomerObject?: boolean;
  isActivationFlow?: boolean;
  setIsActivationFlow?: (v: boolean) => void;
  sopTaskType: string;
  setSopTaskType: (v: string) => void;
  availableTaskTypes?: string[];
  sopTaskEnabled: boolean;
  setSopTaskEnabled: (v: boolean) => void;
  sopTaskTitleTemplate: string;
  setSopTaskTitleTemplate: (v: string) => void;
  sopTaskDescTemplate: string;
  setSopTaskDescTemplate: (v: string) => void;
  sopTaskFieldMappings?: Array<{ taskField: string; sourceField: string }>;
  setSopTaskFieldMappings?: (v: Array<{ taskField: string; sourceField: string }>) => void;
  availableSourceFields?: Array<{ code: string; name: string }>;
  sopReplyPrompt: string;
  setSopReplyPrompt: (v: string) => void;
  sopPromptPrefix: string;
  setSopPromptPrefix: (v: string) => void;
  sopContextSources?: string[];
  setSopContextSources?: (v: string[]) => void;
  sopModelId?: string;
  setSopModelId?: (v: string) => void;
  availableModels?: Array<{ id: string; name: string }>;
  progressionCheckEnabled?: boolean;
  setProgressionCheckEnabled?: (v: boolean) => void;
  progressionCheckPrompt?: string;
  setProgressionCheckPrompt?: (v: string) => void;
}

export const AddFlowModal = ({
  isOpen, onClose, onSave, triggerType, setTriggerType,
  simpleTriggerMode = 'manual', setSimpleTriggerMode,
  simpleTriggerField = '', setSimpleTriggerField,
  simpleTriggerValue = '', setSimpleTriggerValue,
  name, setName, desc, setDesc,
  condition, setCondition, frequency, setFrequency,
  isCustomerObject = false, isActivationFlow = false, setIsActivationFlow,
  sopTaskType, setSopTaskType, availableTaskTypes = [], sopTaskEnabled, setSopTaskEnabled, sopTaskTitleTemplate, setSopTaskTitleTemplate,
  sopTaskDescTemplate, setSopTaskDescTemplate,
  sopTaskFieldMappings = [], setSopTaskFieldMappings,
  availableSourceFields = [],
  sopReplyPrompt, setSopReplyPrompt, sopPromptPrefix, setSopPromptPrefix,
  sopContextSources = [], setSopContextSources,
  sopModelId = '', setSopModelId,
  availableModels = [],
  progressionCheckEnabled = false, setProgressionCheckEnabled,
  progressionCheckPrompt = '', setProgressionCheckPrompt
}: AddFlowModalProps) => {
  if (!isOpen) return null;
  const [activeTab, setActiveTab] = useState<'basic' | 'task' | 'prompt' | 'oqar' | 'progression'>('basic');
  const taskFieldOptions = [
    { value: 'task.title', label: '任务标题' },
    { value: 'task.description', label: '任务描述' },
    { value: 'task.taskType', label: '任务类型' },
    { value: 'task.assigneeName', label: '执行人名称' },
    { value: 'task.dueDate', label: '截止时间' },
    { value: 'task.importance', label: '重要程度' },
    { value: 'task.urgency', label: '紧急程度' }
  ];
  const triggerOptions = useMemo(() => (['button', 'auto', 'timed'] as const), []);
  const triggerFieldOptions = (availableSourceFields || []).filter((f) => String(f?.code || '').trim());
  const tabBtn = (id: 'basic' | 'task' | 'prompt' | 'oqar' | 'progression', label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${activeTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            添加 SOP 模板
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            {tabBtn('basic', '基础')}
            {tabBtn('task', '任务')}
            {tabBtn('prompt', '提示词')}
            {tabBtn('oqar', 'OQAR')}
            {tabBtn('progression', '晋级检查')}
          </div>
          {activeTab === 'basic' && (
          <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SOP 模板名称</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="例如: 询盘首轮推进 SOP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SOP 触发方式</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {triggerOptions.map(type => (
                <button
                  key={type}
                  onClick={() => setTriggerType(type)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${triggerType === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {type === 'button' ? '按钮点击' : type === 'auto' ? '自动触发' : '定时触发'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SOP 描述</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-16"
              placeholder="简要说明该 SOP 模板的作用..."
            />
          </div>
          {triggerType === 'auto' && (
            <div className="space-y-2 p-3 rounded-lg border border-indigo-100 bg-indigo-50/40">
              <label className="block text-sm font-medium text-gray-700">自动触发规则（傻瓜式）</label>
              <select
                value={simpleTriggerMode}
                onChange={(e) => setSimpleTriggerMode && setSimpleTriggerMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="on_create">新增后</option>
                <option value="on_approve">审核后</option>
                <option value="on_field_change">修改字段保存后</option>
                <option value="manual">仅手动触发</option>
              </select>
              {simpleTriggerMode === 'on_field_change' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <select
                    value={simpleTriggerField}
                    onChange={(e) => setSimpleTriggerField && setSimpleTriggerField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">选择字段</option>
                    {triggerFieldOptions.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={simpleTriggerValue}
                    onChange={(e) => setSimpleTriggerValue && setSimpleTriggerValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="字段保存后等于该值时触发"
                  />
                </div>
              )}
            </div>
          )}
          {isCustomerObject && setIsActivationFlow && (
            <label className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
              <input
                type="checkbox"
                checked={isActivationFlow}
                onChange={(e) => setIsActivationFlow(e.target.checked)}
              />
              这是客户激活流程（默认条件：客户长时间未联系）
            </label>
          )}
          {(triggerType === 'auto' || triggerType === 'timed') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发条件 (Condition)</label>
              <input 
                type="text" 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                placeholder="例如: status == '已转线索'"
              />
            </div>
          )}
          {triggerType === 'timed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发频率 (Cron/Frequency)</label>
              <input 
                type="text" 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                placeholder="例如: 0 9 * * * (每天早上9点)"
              />
            </div>
          )}
          </>
          )}
          {activeTab === 'task' && (
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <h4 className="text-sm font-bold text-gray-800">SOP 任务配置（SOP级）</h4>
            <label className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
              <input
                type="checkbox"
                checked={sopTaskEnabled}
                onChange={(e) => setSopTaskEnabled(e.target.checked)}
              />
              启用SOP生成人工任务（同激活流程开关）
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务类型</label>
              <select
                value={sopTaskType}
                onChange={(e) => setSopTaskType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {availableTaskTypes.length === 0 && (
                  <option value="">暂无任务类型</option>
                )}
                {availableTaskTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {!!sopTaskType && !availableTaskTypes.includes(sopTaskType) && (
                  <option value={sopTaskType}>{sopTaskType}（历史值）</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务标题模板</label>
              <input
                type="text"
                value={sopTaskTitleTemplate}
                onChange={(e) => setSopTaskTitleTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="例如：[SOP] {{sopName}} - {{customerName}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务描述模板</label>
              <textarea
                value={sopTaskDescTemplate}
                onChange={(e) => setSopTaskDescTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-16"
                placeholder="例如：按该SOP完成阶段目标推进。"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务字段映射（任务字段 ← 当前表单字段）</label>
              <div className="space-y-2">
                {sopTaskFieldMappings.map((row, idx) => (
                  <div key={`map_${idx}`} className="grid grid-cols-12 gap-2">
                    <select
                      value={row.taskField}
                      onChange={(e) => {
                        const next = [...sopTaskFieldMappings];
                        next[idx] = { ...next[idx], taskField: e.target.value };
                        setSopTaskFieldMappings && setSopTaskFieldMappings(next);
                      }}
                      className="col-span-5 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">选择任务字段</option>
                      {taskFieldOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <select
                      value={row.sourceField}
                      onChange={(e) => {
                        const next = [...sopTaskFieldMappings];
                        next[idx] = { ...next[idx], sourceField: e.target.value };
                        setSopTaskFieldMappings && setSopTaskFieldMappings(next);
                      }}
                      className="col-span-6 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">选择表单字段</option>
                      {availableSourceFields.map((field) => (
                        <option key={field.code} value={field.code}>
                          {field.name} ({field.code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSopTaskFieldMappings && setSopTaskFieldMappings(sopTaskFieldMappings.filter((_, i) => i !== idx))}
                      className="col-span-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      删
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSopTaskFieldMappings && setSopTaskFieldMappings([...sopTaskFieldMappings, { taskField: '', sourceField: '' }])}
                  className="text-xs px-2.5 py-1 rounded border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50"
                >
                  新增映射
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">示例：任务标题 ← custname；任务描述 ← current_stage_summary。</p>
            </div>
            <div className="text-[11px] text-gray-500">已取消“截止偏移天数”设置。</div>
          </div>
          )}
          {activeTab === 'prompt' && (
          <div className="pt-2 border-t border-gray-200 space-y-3 h-[420px] overflow-y-auto pr-1">
            <h4 className="text-sm font-bold text-gray-800">SOP 生成提示词配置</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SOP 使用模型</label>
              <select
                value={sopModelId}
                onChange={(e) => setSopModelId && setSopModelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">跟随系统默认模型</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">总体提示词前缀</label>
              <textarea
                value={sopPromptPrefix}
                onChange={(e) => setSopPromptPrefix(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-28"
                placeholder="用于拼接每个块提示词前的统一上下文。"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">带入背景（同客户画像AI设置）</label>
              <AiContextConfig
                value={(sopContextSources || []).map((k) => ({ key: k, enabled: true }))}
                onChange={(next) => setSopContextSources && setSopContextSources(next.filter((x) => x.enabled).map((x) => x.key))}
              />
            </div>
          </div>
          )}
          {activeTab === 'oqar' && (
          <div className="pt-2 border-t border-gray-200 space-y-3 h-[420px] overflow-y-auto pr-1">
            <h4 className="text-sm font-bold text-gray-800">SOP 回复 OQAR 配置（SOP级）</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">带入背景（与生成建议一致）</label>
              <AiContextConfig
                value={(sopContextSources || []).map((k) => ({ key: k, enabled: true }))}
                onChange={(next) => setSopContextSources && setSopContextSources(next.filter((x) => x.enabled).map((x) => x.key))}
                allowedKeys={OQAR_ALLOWED_CONTEXT_KEYS}
              />
              <p className="text-[11px] text-gray-500 mt-1">OQAR回复场景已移除“项目方案”“竞品档案”背景项。</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">问答 OQAR 统一提示词</label>
              <textarea
                value={sopReplyPrompt}
                onChange={(e) => setSopReplyPrompt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-[220px]"
                placeholder="用于基于“我方提问 + 客户回答 + 背景信息”生成结果（输出两块：提问分析/回答建议话术）。"
              />
              <p className="text-[11px] text-gray-500 mt-1">系统会自动拼接固定后缀，强制输出JSON两块结果，便于详情界面展示。</p>
            </div>
          </div>
          )}
          {activeTab === 'progression' && (
          <div className="pt-2 border-t border-gray-200 space-y-3">
            <h4 className="text-sm font-bold text-gray-800">晋级检查</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={progressionCheckEnabled}
                  onChange={(e) => setProgressionCheckEnabled?.(e.target.checked)}
                />
                启用晋级检查
              </label>
              <p className="text-[11px] text-gray-500">完成任务时，系统会结合聊天、邮件、会议记录与任务完成内容判断是否具备晋级信号；未满足时阻止完成并输出行动建议。</p>
            </div>
            {progressionCheckEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">晋级检查提示词</label>
                <textarea
                  value={progressionCheckPrompt}
                  onChange={(e) => setProgressionCheckPrompt?.(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-40"
                  placeholder="用于判断该阶段是否满足晋级到下一阶段。"
                />
              </div>
            )}
          </div>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">取消</button>
          <button onClick={onSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">保存 SOP 模板</button>
        </div>
      </div>
    </div>
  );
};
