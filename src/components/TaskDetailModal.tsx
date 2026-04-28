import { toast } from 'react-hot-toast';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { X, Building2, Briefcase, User, Calendar, Clock, AlertCircle, CheckCircle2, FileText, Bot, Mic, Image as ImageIcon, GitBranch, Target, History, Share2, Layers, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { mockTaskTypes, mockTodoTasks } from '../data';
import { callAiProxy } from '../lib/aiProxy';
import { fetchCustomerCommunicationsFromSupabase } from '../lib/customerRepository';
import { parseAiJson } from '../lib/aiJson';

const AUXILIARY_LABELS: Record<string, string> = {
  activationStage: '激活阶段',
  activationSuggestion: '激活建议',
  priority: '优先级'
};

const AUXILIARY_HIDDEN_KEYS = new Set([
  'assignee',
  'customer',
  'project',
  'date',
  'contact',
  'activationModelId',
  'sopTemplateId',
  'sopTemplateName',
  'sopTaskConfig',
  'sopTaskFieldMappings',
  'sopOqarConfig',
  'sopPromptConfig',
  'sopBlocks'
]);

const DEFAULT_PROGRESSION_CHECK_PROMPT = [
  '你是资深销售阶段推进审查官。',
  '请根据当前阶段任务、单据快照、最近聊天记录、邮件记录、会议记录，以及本次“完成备注”，判断该单据是否具备晋级到下一阶段的明确信号。',
  '判定重点：完成备注是否体现了当前阶段已达成的可晋级证据。',
  '输出必须为JSON对象：{"canAdvance":true,"summary":"...","signals":["..."],"risks":["..."],"suggestions":["..."],"cautions":["..."]}',
  '若证据不足则 canAdvance=false，且 suggestions 必须输出补强晋级策略；若 canAdvance=true，cautions 必须输出晋级后的注意事项。'
].join('\n');

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  navigateTo?: (view: string, params?: any) => void;
  onComplete?: (taskId: string, completionData: { completionTime?: string, completionEffect?: '完成' | '失败' | '暂停', completionNote?: string }) => void;
  onDecompose?: (taskId: string) => void;
  onTransfer?: (taskId: string) => void;
  onViewTask?: (taskId: string) => void;
  onUpdate?: (updatedTask: any) => void;
}

export default function TaskDetailModal({ isOpen, onClose, task, navigateTo, onComplete, onDecompose, onTransfer, onViewTask, onUpdate }: TaskDetailModalProps) {
  const [actualVisitContent, setActualVisitContent] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionTime, setCompletionTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [completionEffect, setCompletionEffect] = useState<'完成' | '失败' | '暂停'>('完成');
  const [completionNote, setCompletionNote] = useState('');
  const [isCheckingProgression, setIsCheckingProgression] = useState(false);
  const [progressionCheckResult, setProgressionCheckResult] = useState<any | null>(null);
  const [hasProgressionPassed, setHasProgressionPassed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const taskTypeConfig = useMemo(() => {
    return mockTaskTypes.find(t => t.name === task?.taskType) || {
      completionConfig: {
        requireCompletionTime: true,
        requireCompletionEffect: true,
        requireCompletionNote: false
      }
    };
  }, [task?.taskType]);

  const parentTask = useMemo(() => {
    if (!task?.parentId) return null;
    return mockTodoTasks.find(t => t.id === task.parentId);
  }, [task?.parentId]);
  const effectiveAuxiliaryEntries = useMemo(() => {
    const raw = task?.auxiliaryData || {};
    return Object.entries(raw).flatMap(([key, value]) => {
      if (AUXILIARY_HIDDEN_KEYS.has(key)) return [];
      if (/^sop/i.test(key) || /(Config|Blocks|Mappings)$/i.test(key)) return [];
      if (value == null) return [];
      if (Array.isArray(value)) return [];
      if (typeof value === 'object') return [];

      const text = String(value).trim();
      if (!text || text === '[object Object]') return [];

      return [[AUXILIARY_LABELS[key] || key, text] as [string, string]];
    });
  }, [task?.auxiliaryData]);
  const progressionCheckConfig = task?.auxiliaryData?.progressionCheckConfig;
  const progressionRequired = Boolean(progressionCheckConfig?.enabled);

  useEffect(() => {
    if (!progressionRequired) return;
    setHasProgressionPassed(false);
    setProgressionCheckResult(null);
  }, [completionNote, actualVisitContent, progressionRequired]);

  if (!isOpen || !task) return null;

  const handleNavigateToCustomer = () => {
    if (task.customerId && navigateTo) {
      navigateTo('customers', { customerId: task.customerId });
      onClose();
    }
  };

  const handleNavigateToProject = () => {
    if (task.projectId && navigateTo) {
      navigateTo('projects', { projectId: task.projectId });
      onClose();
    }
  };

  const handleNavigateToInquiry = () => {
    if (task.sourceId && task.sourceType === 'inquiry' && navigateTo) {
      navigateTo('inquiries', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToLead = () => {
    if (task.sourceId && task.sourceType === 'lead' && navigateTo) {
      navigateTo('leads', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToOpportunity = () => {
    if (task.sourceId && task.sourceType === 'opportunity' && navigateTo) {
      navigateTo('opportunities', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToQuotation = () => {
    if (task.sourceId && task.sourceType === 'quotation' && navigateTo) {
      navigateTo('quotations', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToOrder = () => {
    if (task.sourceId && task.sourceType === 'order' && navigateTo) {
      navigateTo('sales', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToSample = () => {
    if (task.sourceId && task.sourceType === 'sample' && navigateTo) {
      navigateTo('sample-orders', task.sourceId);
      onClose();
    }
  };

  const handleNavigateToReturn = () => {
    if (task.sourceId && task.sourceType === 'return' && navigateTo) {
      navigateTo('return-orders', task.sourceId);
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已完成': return 'text-green-600 bg-green-50 border-green-200';
      case '已延期': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  const handleAIOrganizeRecord = async () => {
    if (!actualVisitContent && !fileInputRef.current?.files?.[0]) return;
    setIsOrganizing(true);
    try {
      const prompt = `
        你是一个资深的销售助理AI。请根据以下提供的原始拜访记录（可能是零散的文字、语音转文字内容或图片描述），
        整理成一份结构化、专业且易于阅读的销售拜访总结。
        
        整理要求：
        1. 提取关键信息：客户需求、关注点、痛点。
        2. 识别后续计划：明确的下一步行动、时间点、责任人。
        3. 总结客户反馈：对产品、方案或服务的态度。
        4. 保持专业语气。
        
        原始记录：
        ${actualVisitContent}
      `;
      const text = await callAiProxy(prompt);

      setActualVisitContent(prev => 
        prev + (prev ? '\n\n' : '') + 
        '【AI 自动整理的拜访记录】\n' + text
      );
    } catch (error) {
      console.error('AI organization failed:', error);
      toast.error('AI 整理失败，请稍后重试');
    } finally {
      setIsOrganizing(false);
    }
  };

  const runProgressionCheck = async () => {
    if (!progressionCheckConfig?.enabled) return true;
    const completionContent = String(completionNote || actualVisitContent || '').trim();
    if (!completionContent) {
      toast.error('请先填写任务完成内容，再执行晋级检查');
      return false;
    }
    setIsCheckingProgression(true);
    try {
      const customerId = String(task?.associatedCustomerId || '').trim();
      const communications = customerId ? await fetchCustomerCommunicationsFromSupabase(customerId).catch(() => []) : [];
      const chatRecords = communications
        .filter((item: any) => ['wechat', 'wechat_group', 'phone'].includes(String(item?.type || '')))
        .slice(-8)
        .map((item: any) => `${item.date || ''} ${item.sender || ''}: ${item.content || ''}`)
        .join('\n');
      const emailRecords = communications
        .filter((item: any) => String(item?.type || '') === 'email')
        .slice(-5)
        .map((item: any) => `${item.date || ''} ${item.sender || ''}: ${item.content || ''}`)
        .join('\n');
      const meetingRecords = communications
        .filter((item: any) => String(item?.type || '') === 'meeting')
        .slice(-5)
        .map((item: any) => `${item.date || ''} ${item.sender || ''}: ${item.content || ''}`)
        .join('\n');
      const prompt = [
        String(progressionCheckConfig?.promptTemplate || DEFAULT_PROGRESSION_CHECK_PROMPT).trim(),
        `模块：${task?.sourceType || '-'}`,
        `来源单据ID：${task?.sourceId || '-'}`,
        `当前任务：${task?.title || '-'}`,
        `任务描述：${task?.description || task?.content || '-'}`,
        `SOP模板：${task?.originatingFlowName || '-'}`,
        `客户：${task?.associatedCustomerName || '-'}`,
        `完成备注：${completionContent || '-'}`,
        `单据快照：${JSON.stringify(task?.auxiliaryData?.sourceSnapshot || {}, null, 2)}`,
        `聊天记录：\n${chatRecords || '暂无'}`,
        `邮件记录：\n${emailRecords || '暂无'}`,
        `会议记录：\n${meetingRecords || '暂无'}`
      ].join('\n\n');
      const text = await callAiProxy(prompt);
      const parsed = parseAiJson(text || '{}') as any;
      const normalized = {
        canAdvance: Boolean(parsed?.canAdvance),
        summary: String(parsed?.summary || ''),
        signals: Array.isArray(parsed?.signals) ? parsed.signals.map((x: any) => String(x || '').trim()).filter(Boolean) : [],
        risks: Array.isArray(parsed?.risks) ? parsed.risks.map((x: any) => String(x || '').trim()).filter(Boolean) : [],
        suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.map((x: any) => String(x || '').trim()).filter(Boolean) : [],
        cautions: Array.isArray(parsed?.cautions) ? parsed.cautions.map((x: any) => String(x || '').trim()).filter(Boolean) : []
      };
      setProgressionCheckResult(normalized);
      if (!normalized.canAdvance) {
        setHasProgressionPassed(false);
        toast.error('未能晋级，建议先完成补充动作');
        return false;
      }
      setHasProgressionPassed(true);
      if (normalized.cautions.length > 0) {
        toast.success(`可晋级，注意：${normalized.cautions[0]}`);
      } else {
        toast.success('已通过晋级检查，可完成任务');
      }
      return true;
    } catch (error) {
      console.error('progression check failed:', error);
      toast.error('晋级检查失败，请稍后重试');
      return false;
    } finally {
      setIsCheckingProgression(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAIOrganizeRecord();
    }
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">任务详情</h3>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(task.status))}>
              {task.status || '待处理'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('detail')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-lg transition-colors",
                activeTab === 'detail' ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              详情
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-lg transition-colors",
                activeTab === 'history' ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              历史
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'detail' ? (
            <>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{task.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>执行人: {task.handler || task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>发布人: {task.creatorName || task.creator || '系统'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>截止时间: {task.dueDate || task.expectedCompletionTime}</span>
                  </div>
                </div>
              </div>

              {/* Parent Task Info */}
              {parentTask && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <span className="text-amber-600 font-medium">原任务: </span>
                      <span className="text-amber-800">{parentTask.title}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (onViewTask) {
                        onViewTask(parentTask.id);
                      } else {
                        toast.error('原任务ID: ' + parentTask.id);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    查看原任务
                  </button>
                </div>
              )}

              {/* Origin Flow Info */}
              {(task.originatingFlowName || task.originatingOntologyName) && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="text-sm">
                    <span className="text-blue-600 font-medium">任务来源: </span>
                    <span className="text-blue-800">
                      {task.originatingOntologyName} - {task.originatingFlowName}
                    </span>
                  </div>
                </div>
              )}

              {/* Task Goal */}
              {task.goal && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                  <Target className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="text-emerald-600 font-medium">任务目标: </span>
                    <span className="text-emerald-800">{task.goal}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {task.customerId && (
                  <div 
                    onClick={handleNavigateToCustomer}
                    className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium text-sm">关联客户</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-indigo-700 transition-colors">
                      {task.customerName || '查看客户详情'}
                    </div>
                  </div>
                )}
                
                {task.projectId && (
                  <div 
                    onClick={handleNavigateToProject}
                    className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium text-sm">关联项目</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-emerald-700 transition-colors">
                      {task.projectName || '查看项目详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'inquiry' && (
                  <div 
                    onClick={handleNavigateToInquiry}
                    className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-sm">关联询盘</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-amber-700 transition-colors">
                      {task.sourceId || '查看询盘详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'lead' && (
                  <div 
                    onClick={handleNavigateToLead}
                    className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-rose-600 mb-1">
                      <Target className="w-4 h-4" />
                      <span className="font-medium text-sm">关联线索</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-rose-700 transition-colors">
                      {task.sourceId || '查看线索详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'opportunity' && (
                  <div 
                    onClick={handleNavigateToOpportunity}
                    className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium text-sm">关联商机</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-blue-700 transition-colors">
                      {task.sourceId || '查看商机详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'quotation' && (
                  <div
                    onClick={handleNavigateToQuotation}
                    className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-sm">关联报价单</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-indigo-700 transition-colors">
                      {task.sourceId || '查看报价单详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'order' && (
                  <div
                    onClick={handleNavigateToOrder}
                    className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium text-sm">关联订单</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-emerald-700 transition-colors">
                      {task.sourceId || '查看订单详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'sample' && (
                  <div
                    onClick={handleNavigateToSample}
                    className="p-4 rounded-xl border border-cyan-100 bg-cyan-50/50 hover:bg-cyan-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-cyan-700 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-sm">关联样品单</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-cyan-700 transition-colors">
                      {task.sourceId || '查看样品单详情'}
                    </div>
                  </div>
                )}

                {task.sourceType === 'return' && (
                  <div
                    onClick={handleNavigateToReturn}
                    className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-amber-700 mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium text-sm">关联退货单</span>
                    </div>
                    <div className="text-gray-900 font-medium group-hover:text-amber-700 transition-colors">
                      {task.sourceId || '查看退货单详情'}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  任务内容
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                  {task.content || task.description || '暂无详细内容'}
                </div>
              </div>

              <div>
                {progressionCheckResult && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      晋级检查
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500">结论：</span>
                        <span className={cn('font-medium', progressionCheckResult.canAdvance ? 'text-emerald-700' : 'text-amber-700')}>
                          {progressionCheckResult.canAdvance ? '可晋级' : '暂不满足晋级条件'}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-gray-700">{progressionCheckResult.summary || '暂无检查摘要'}</div>
                      {progressionCheckResult.signals?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">已发现信号</div>
                          <div className="space-y-1">
                            {progressionCheckResult.signals.map((item: string, idx: number) => (
                              <div key={idx} className="text-sm text-emerald-700">{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {progressionCheckResult.risks?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">阻塞点</div>
                          <div className="space-y-1">
                            {progressionCheckResult.risks.map((item: string, idx: number) => (
                              <div key={idx} className="text-sm text-amber-700">{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {progressionCheckResult.suggestions?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">行动建议</div>
                          <div className="space-y-1">
                            {progressionCheckResult.suggestions.map((item: string, idx: number) => (
                              <div key={idx} className="text-sm text-indigo-700">{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {progressionCheckResult.cautions?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">晋级注意事项</div>
                          <div className="space-y-1">
                            {progressionCheckResult.cautions.map((item: string, idx: number) => (
                              <div key={idx} className="text-sm text-blue-700">{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {effectiveAuxiliaryEntries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    附加信息
                  </div>
                  <div className="bg-indigo-50/50 rounded-xl p-4 text-sm text-gray-700 border border-indigo-100/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {effectiveAuxiliaryEntries.map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500 block text-xs mb-1">{key}</span>
                        <span className="font-medium whitespace-pre-wrap break-words">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {task.sourceType === 'ai_agent' && task.aiDraftContent && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    AI 起草内容 (需人工确认)
                  </div>
                  <div className="bg-rose-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap break-words border border-rose-100 max-h-[240px] overflow-y-auto">
                    {typeof task.aiDraftContent === 'string' ? task.aiDraftContent : JSON.stringify(task.aiDraftContent, null, 2)}
                  </div>
                </div>
              )}

              {task.taskType === '拜访' && task.status !== '已完成' && showCompletionForm && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      实际拜访记录
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload}
                      />
                      <button 
                        onClick={() => triggerFileInput('audio/*')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        上传录音
                      </button>
                      <button 
                        onClick={() => triggerFileInput('image/*')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        上传截图
                      </button>
                      <button 
                        onClick={() => triggerFileInput('.txt,.doc,.docx,.pdf')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        上传文档
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={actualVisitContent}
                      onChange={(e) => setActualVisitContent(e.target.value)}
                      placeholder="在此输入实际拜访记录，或上传录音/截图后由 AI 自动整理..."
                      className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                    />
                    <button
                      onClick={handleAIOrganizeRecord}
                      disabled={isOrganizing}
                      className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      {isOrganizing ? 'AI 整理中...' : 'AI 自动整理'}
                    </button>
                  </div>
                </div>
              )}
              
              {task.status !== '已完成' && showCompletionForm && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    任务完成配置
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {taskTypeConfig.completionConfig?.requireCompletionTime !== false && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          完成时间 <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="datetime-local" 
                          value={completionTime}
                          onChange={(e) => setCompletionTime(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          required
                        />
                      </div>
                    )}
                    {taskTypeConfig.completionConfig?.requireCompletionEffect !== false && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          完成效果 <span className="text-red-500">*</span>
                        </label>
                        <select 
                          value={completionEffect}
                          onChange={(e) => setCompletionEffect(e.target.value as any)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          required
                        >
                          <option value="完成">完成</option>
                          <option value="失败">失败</option>
                          <option value="暂停">暂停</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">
                        完成备注 {taskTypeConfig.completionConfig?.requireCompletionNote ? <span className="text-red-500">*</span> : '(选填)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            const mockSpeech = "客户对我们的新产品很感兴趣，希望下周能安排一次详细的产品演示。";
                            setCompletionNote(prev => prev ? prev + '\n' + mockSpeech : mockSpeech);
                          }}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Mic className="w-3 h-3" />
                          语音输入
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            toast.error('已开始录音，再次点击结束录音。');
                          }}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Mic className="w-3 h-3" />
                          音频录制
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      placeholder="请输入完成备注，或使用语音输入..."
                      className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                      required={taskTypeConfig.completionConfig?.requireCompletionNote}
                    />
                  </div>
                </div>
              )}
              
              {task.status === '已完成' && task.actualContent && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    实际拜访记录
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
                    {task.actualContent}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-4">
                <History className="w-4 h-4 text-indigo-500" />
                任务流转历史
              </div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100"></div>
                <div className="space-y-6 relative">
                  {(task.history || [
                    { id: 'h1', timestamp: task.createDate, action: '创建任务', operator: task.creatorName, details: '系统根据流程自动创建' },
                    { id: 'h2', timestamp: task.createDate, action: '指派任务', operator: '系统', details: `指派给 ${task.assignee}` }
                  ]).map((h: any) => (
                    <div key={h.id} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shrink-0 z-10">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">{h.action}</span>
                          <span className="text-xs text-gray-400">{h.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600">操作人: {h.operator}</p>
                        {h.details && <p className="text-xs text-gray-400 mt-1">{h.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            {task.status !== '已完成' && (
              <>
                <button 
                  onClick={() => onDecompose?.(task.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  任务分解
                </button>
                <button 
                  onClick={() => onTransfer?.(task.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  任务转交
                </button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
            {task.status !== '已完成' && (
              !showCompletionForm ? (
                <button 
                  onClick={() => setShowCompletionForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  完成任务
                </button>
              ) : (
                <>
                  {progressionRequired && (
                    <button
                      onClick={runProgressionCheck}
                      disabled={isCheckingProgression}
                      className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-60"
                    >
                      {isCheckingProgression ? '晋级检查中...' : '晋级检查'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (taskTypeConfig.completionConfig?.requireCompletionNote && !completionNote && !actualVisitContent) {
                        toast.error('请填写完成备注');
                        return;
                      }
                      if (progressionRequired && !hasProgressionPassed) {
                        toast.error('请先执行晋级检查并通过后再完成任务');
                        return;
                      }
                      onComplete?.(task.id, {
                        completionTime: taskTypeConfig.completionConfig?.requireCompletionTime !== false ? completionTime : undefined,
                        completionEffect: taskTypeConfig.completionConfig?.requireCompletionEffect !== false ? completionEffect : undefined,
                        completionNote: completionNote || actualVisitContent
                      });
                      onClose();
                    }}
                    disabled={isCheckingProgression || (progressionRequired && !hasProgressionPassed)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
                  >
                    {progressionRequired && !hasProgressionPassed ? '晋级通过后可完成' : (task.requiresHumanApproval ? '确认并完成' : '提交完成配置')}
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
