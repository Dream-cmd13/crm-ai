import { toast } from 'react-hot-toast';
import React from 'react';
import { ChevronRight, Edit, FileText, Link as LinkIcon, Sparkles, Loader2, RefreshCw, MessageSquare, Link, Users, MessageCircle, Clock, Target, Building2, AlertCircle, Package as FileBox, Briefcase, Plus, CheckCircle2 } from 'lucide-react';
import { Project, Role, TodoTask, CommunicationDetail, GroupChat } from '../../types';
import { initialObjects } from '../../data/ontologyData';
import { performStatusAnalysis } from '../../lib/ai';
import { fetchArchitectureDataFromSupabase } from '../../lib/architectureRepository';
import AIAnalysisModal from '../AIAnalysisModal';
import ReservedButtons from '../ReservedButtons';
import AiStageAssistant from '../AiStageAssistant';
import QuickTaskModal from '../QuickTaskModal';
import TaskDetailModal from '../TaskDetailModal';
import { ProjectTeam } from './ProjectTeam';
import { RelatedRecords } from './RelatedRecords';
import { ProjectNotes } from './ProjectNotes';
import { ManageMembersModal } from '../customers/CustomerModals';
import DetailModal from '../DetailModal';
import { cn } from '../../lib/utils';

interface ProjectDetailProps {
  selectedProject: Project;
  role: Role;
  onBack: () => void;
  onEdit: () => void;
  onNavigateTo: (view: string, params?: any) => void;
  getProjectFlowNodes: (project: Project) => any[];
  getProjectStages: (type: string) => string[];
  normalizeStage: (stage: string) => string;
  expandedStages: string[];
  toggleStage: (stage: string) => void;
  setIsAddingTask: (v: boolean) => void;
  setNewTask: (v: any) => void;
  isAddingTask: boolean;
  newTask: any;
  handleAddTask: () => void;
  setIsEditingMembers: (v: boolean) => void;
  users: any[];
  quotations: any[];
  orders: any[];
  sampleOrders: any[];
  returnOrders: any[];
  relatedOpportunityDisplay?: string;
  relatedLeadDisplay?: string;
  relatedInquiryDisplay?: string;
  newNote: string;
  setNewNote: (v: string) => void;
  handleAddNote: () => void;
  isAnalyzing?: boolean;
  onAIAnalysis?: () => void;
  onRegenerateAI?: (nodeId: string, field: string, prompt: string) => void;
  communications: CommunicationDetail[];
  onAddCommunication: (comm: Partial<CommunicationDetail>) => void;
  groupChats: GroupChat[];
  selectedChat: GroupChat | null;
  setSelectedChat: (v: GroupChat | null) => void;
  chatSubTab: string;
  setChatSubTab: (v: any) => void;
  isSyncingChats: boolean;
  handleSyncChats: () => void;
}

export const ProjectDetail = ({
  selectedProject, role, onBack, onEdit, onNavigateTo,
  getProjectFlowNodes, getProjectStages, normalizeStage,
  expandedStages, toggleStage, setIsAddingTask, setNewTask, isAddingTask, newTask, handleAddTask,
  setIsEditingMembers, users, quotations, orders, sampleOrders, returnOrders,
  relatedOpportunityDisplay, relatedLeadDisplay, relatedInquiryDisplay,
  newNote, setNewNote, handleAddNote,
  isAnalyzing, onAIAnalysis, onRegenerateAI,
  communications, onAddCommunication,
  groupChats, selectedChat, setSelectedChat, chatSubTab, setChatSubTab,
  isSyncingChats, handleSyncChats
}: ProjectDetailProps) => {
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState<TodoTask[]>([]);
  const [activeTab, setActiveTab] = React.useState<'info' | 'flow'>('info');
  const [activeDetailTab, setActiveDetailTab] = React.useState<'flow' | 'design_versions' | 'customer_resources'>('flow');
  const [isManagingMembers, setIsManagingMembers] = React.useState(false);
  const [isAddingGroupChat, setIsAddingGroupChat] = React.useState(false);
  const [isAddingDesign, setIsAddingDesign] = React.useState(false);
  const [isAddingResource, setIsAddingResource] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<any>(null);

  // AI Status Analysis states
  const [isAnalyzingStatus, setIsAnalyzingStatus] = React.useState(false);
  const [statusAnalysisResult, setStatusAnalysisResult] = React.useState('');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = React.useState(false);

  const handleAIDepthAnalysis = async () => {
    const { objects } = await fetchArchitectureDataFromSupabase();
    const projectObject =
      objects.find(obj => obj.code === 'Project' || obj.code === 'crm_Project' || obj.code === 'crm_project' || obj.name === '项目') ||
      initialObjects.find(obj => obj.code === 'Project');
    if (!projectObject || !projectObject.statusAnalysis?.enabled) {
      toast.error('该模块未配置 AI 状态分析');
      return;
    }

    setIsAnalyzingStatus(true);
    setIsAnalysisModalOpen(true);
    setStatusAnalysisResult('');

    try {
      const result = await performStatusAnalysis(projectObject, selectedProject);
      setStatusAnalysisResult(result);
    } catch (error) {
      setStatusAnalysisResult('分析失败，请稍后重试。');
    } finally {
      setIsAnalyzingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="text-gray-500 hover:text-gray-900 font-medium"
          >
            项目管理
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-bold">{selectedProject.projectName}</span>
        </div>
        <div className="flex items-center gap-3">
          <ReservedButtons moduleCode="project_tracking" contextData={selectedProject} />
          <button 
            onClick={handleAIDepthAnalysis}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI 深度分析
          </button>
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Edit className="w-4 h-4" />
            编辑项目
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar bg-white sticky top-0 z-10 rounded-t-2xl">
        <div className="flex min-w-max px-2">
          {[
            { id: 'info', label: '项目详情', icon: FileText },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'info' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  项目基本情况
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-sm text-gray-500">项目编号</p>
                    <p className="font-medium text-gray-900">{selectedProject.projectNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">客户名称</p>
                    {selectedProject.customerId ? (
                      <button
                        type="button"
                        onClick={() => onNavigateTo('customers', { customerId: selectedProject.customerId })}
                        className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {selectedProject.customerName || '-'}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900">{selectedProject.customerName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">项目名称</p>
                    <p className="font-medium text-gray-900">{selectedProject.projectName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">项目等级</p>
                    <p className="font-medium text-gray-900">{selectedProject.projectLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">项目类型</p>
                    <p className="font-medium text-gray-900">{selectedProject.projectType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">阶段</p>
                    <p className="font-medium text-indigo-600">{selectedProject.stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">产品线</p>
                    <p className="font-medium text-gray-900">{selectedProject.productLine || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">项目状态</p>
                    <p className="font-medium text-gray-900">{selectedProject.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">客户行动</p>
                    <p className="font-medium text-gray-900">{selectedProject.customerAction || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">意向金额(RMB)</p>
                    <p className="font-medium text-indigo-600">¥{selectedProject.intentAmount || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">预估用量</p>
                    <p className="font-medium text-gray-900">{selectedProject.estimatedUsage || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">应用场景</p>
                    <p className="font-medium text-gray-900">{selectedProject.applicationScenario || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">终端客户</p>
                    <p className="font-medium text-gray-900">{selectedProject.endCustomer || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">终端项目</p>
                    <p className="font-medium text-gray-900">{selectedProject.endProject || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">产品所属行业</p>
                    <p className="font-medium text-gray-900">{selectedProject.productIndustry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">预计量产时间</p>
                    <p className="font-medium text-gray-900">{selectedProject.estimatedMassProductionTime || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">立项日期</p>
                    <p className="font-medium text-gray-900">{selectedProject.startDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">结束日期</p>
                    <p className="font-medium text-gray-900">{selectedProject.endDate || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">关闭时间</p>
                    <p className="font-medium text-gray-900">{selectedProject.closeTime || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">微信项目群</p>
                    <p className="font-medium text-gray-900">{selectedProject.wechatGroup || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建人</p>
                    <p className="font-medium text-gray-900">{selectedProject.creatorName || selectedProject.creator || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">创建日期</p>
                    <p className="font-medium text-gray-900">{selectedProject.createDate || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-sm text-gray-500">关闭原因</p>
                    <p className="font-medium text-gray-900">{selectedProject.closeReason || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-sm text-gray-500">商机概要</p>
                    <p className="font-medium text-gray-900">{selectedProject.oppSummary}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-sm text-gray-500">附件</p>
                    {Array.isArray(selectedProject.attachments) && selectedProject.attachments.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {selectedProject.attachments.map((file, idx) => (
                          <a
                            key={`${file?.name || 'file'}-${idx}`}
                            href={file?.content || '#'}
                            download={file?.name || `附件${idx + 1}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <span className="text-sm font-medium text-indigo-600 truncate">{file?.name || `附件${idx + 1}`}</span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {(Number(file?.size || 0) / 1024).toFixed(1)} KB
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI 项目深度分析 (Miller Heiman)
                  </h3>
                  <button 
                    onClick={onAIAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    深度分析
                  </button>
                </div>
                
                {selectedProject.aiAnalysis?.deepAnalysis ? (
                  <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      {selectedProject.aiAnalysis.deepAnalysis.split('\n').map((line, i) => (
                        <p key={i} className="mb-2">{line}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 mb-3">尚未进行深度 AI 分析 (基于本体数据与 Miller Heiman 原则)</p>
                    <button 
                      onClick={onAIAnalysis}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 mx-auto"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      生成深度分析报告
                    </button>
                  </div>
                )}
              </div>

              <div className="col-span-2 md:col-span-3 mt-6">
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveDetailTab('flow')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'flow'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    推进流程
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('design_versions')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'design_versions'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <FileBox className="w-4 h-4" />
                    图纸与方案
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('customer_resources')}
                    className={cn(
                      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
                      activeDetailTab === 'customer_resources'
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    客户投入资源
                  </button>
                </div>

                {activeDetailTab === 'flow' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <AiStageAssistant
                      kind="project"
                      title="项目SOP标准"
                      sourceType="project"
                      sourceId={selectedProject.id}
                      customerId={selectedProject.customerId}
                      customerName={selectedProject.customerName}
                      sourceRecord={selectedProject as any}
                    />
                  </div>
                )}

                {activeDetailTab === 'design_versions' && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h4 className="text-sm font-bold text-gray-900">版本记录 (图纸与方案)</h4>
                      <button 
                        onClick={() => setIsAddingDesign(true)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        上传新版本
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-100/30">
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">版本号</th>
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">类型</th>
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">名称</th>
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">上传日期</th>
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">客户确认</th>
                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedProject.designVersions || [
                            { id: 'v1', version: 'V1.0', type: '图纸', name: '初步结构设计图', uploadDate: '2026-03-15', isConfirmed: true, confirmedDate: '2026-03-16' },
                            { id: 'v2', version: 'V1.1', type: '图纸', name: '结构优化图-A版', uploadDate: '2026-03-20', isConfirmed: false },
                            { id: 'v3', version: 'V1.0', type: '方案', name: '技术实现方案书', uploadDate: '2026-03-18', isConfirmed: true, confirmedDate: '2026-03-19' },
                          ]).map(v => (
                            <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 text-sm font-medium text-gray-900">{v.version}</td>
                              <td className="p-3">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  v.type === '图纸' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                )}>
                                  {v.type}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-gray-700">{v.name}</td>
                              <td className="p-3 text-xs text-gray-500">{v.uploadDate}</td>
                              <td className="p-3">
                                <div className="flex flex-col">
                                  {v.isConfirmed ? (
                                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      已确认
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => {/* Toggle confirmation */}}
                                      className="text-amber-600 text-xs font-bold flex items-center gap-1 hover:underline"
                                    >
                                      <Clock className="w-3 h-3" />
                                      待确认 (点击修改)
                                    </button>
                                  )}
                                  {v.confirmedDate && <span className="text-[10px] text-gray-400">{v.confirmedDate}</span>}
                                </div>
                              </td>
                              <td className="p-3">
                                <button 
                                  onClick={() => {/* View detail */}}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                >
                                  查看详情
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'customer_resources' && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h4 className="text-sm font-bold text-gray-900">客户投入资源</h4>
                      <button 
                        onClick={() => setIsAddingResource(true)}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        添加资源
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(selectedProject.customerResources || [
                          { id: 'r1', name: '研发团队', description: '投入3名核心研发工程师参与联合开发', quantity: 3, unit: '人', estimatedValue: '¥50,000/月' },
                          { id: 'r2', name: '测试设备', description: '提供专用高低温测试箱使用权', quantity: 1, unit: '台', estimatedValue: '¥2,000/天' },
                          { id: 'r3', name: '模具费用', description: '客户承担首批模具开发费用', estimatedValue: '¥120,000' },
                        ]).map(r => (
                          <div key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                            <button 
                              onClick={() => {
                                setEditingResource(r);
                                setIsAddingResource(true);
                              }}
                              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <h5 className="font-bold text-gray-900 text-sm mb-1">{r.name}</h5>
                            <p className="text-xs text-gray-600 mb-2">{r.description}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50">
                              <span className="text-[10px] text-gray-500">数量: {r.quantity ? `${r.quantity} ${r.unit}` : '-'}</span>
                              <span className="text-[10px] font-bold text-indigo-600">预估价值: {r.estimatedValue || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI 项目深度分析
                  </h3>
                  <button 
                    onClick={onAIAnalysis}
                    disabled={isAnalyzing}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    重新分析
                  </button>
                </div>
                
                {selectedProject.aiAnalysis ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">购买模式 (Buying Mode)</p>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        selectedProject.aiAnalysis.buyingMode === '增长模式' ? 'bg-emerald-100 text-emerald-700' :
                        selectedProject.aiAnalysis.buyingMode === '困难模式' ? 'bg-rose-100 text-rose-700' :
                        'bg-gray-200 text-gray-700'
                      )}>
                        {selectedProject.aiAnalysis.buyingMode || '待分析'}
                      </span>
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">意向评分 (Intent Score)</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-indigo-600">{selectedProject.aiAnalysis.intentScore || 0}</span>
                        <div className="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-1000" 
                            style={{ width: `${selectedProject.aiAnalysis.intentScore || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-xs text-gray-500 mb-1">SPIN 痛点分析</p>
                      <p className="text-xs text-gray-700 line-clamp-2">{selectedProject.aiAnalysis.spinAnalysis || '待分析'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 mb-3">尚未进行深度 AI 分析</p>
                    <button 
                      onClick={onAIAnalysis}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 mx-auto"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      立即开始 AI 深度分析
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        <div className="space-y-6">
          <ProjectTeam 
            team={selectedProject.team}
            users={users}
            setIsEditingMembers={setIsEditingMembers}
          />

          <RelatedRecords 
            projectId={selectedProject.id}
            opportunityId={selectedProject.opportunityId}
            leadId={selectedProject.leadId}
            inquiryId={selectedProject.inquiryId}
            opportunityDisplay={relatedOpportunityDisplay}
            leadDisplay={relatedLeadDisplay}
            inquiryDisplay={relatedInquiryDisplay}
            quotations={quotations}
            orders={orders}
            sampleOrders={sampleOrders}
            returnOrders={returnOrders}
            onNavigateTo={onNavigateTo}
          />

          <ProjectNotes 
            notes={selectedProject.notes}
            newNote={newNote}
            setNewNote={setNewNote}
            handleAddNote={handleAddNote}
          />
        </div>
      </div>

      {isAddingTask && (
        <QuickTaskModal
          isOpen={isAddingTask}
          onClose={() => setIsAddingTask(false)}
          onSave={(taskData) => {
            const newTask: TodoTask = {
              id: crypto.randomUUID(),
              ...taskData,
              status: '待办',
              importance: '中',
              urgency: '正常',
              sourceType: 'project',
              sourceId: selectedProject.id,
              taskType: taskData.taskType || '项目跟进',
              createDate: new Date().toISOString().split('T')[0],
              creatorId: 'U001',
              creatorNo: 'E001',
              creatorName: String(role)
            };
            setTasks([newTask, ...tasks]);
            setIsAddingTask(false);
          }}
          initialData={{
            title: `项目推进: ${selectedProject.projectName}`,
            module: '项目',
            relatedId: selectedProject.id
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          task={tasks.find(t => t.id === selectedTaskId) || tasks[0]}
          onUpdate={(updatedTask) => {
            setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
          }}
        />
      )}

      <ManageMembersModal 
        isOpen={isManagingMembers}
        onClose={() => setIsManagingMembers(false)}
        chat={selectedChat}
        onUpdateMembers={(newMembers) => {
          if (selectedChat) {
            setSelectedChat({ ...selectedChat, members: newMembers });
          }
        }}
      />

      {isAddingGroupChat && (
        <DetailModal
          isOpen={true}
          onClose={() => setIsAddingGroupChat(false)}
          title="新增微信群聊"
          fields={[
            { key: 'name', label: '群聊名称' },
            { key: 'members', label: '初始成员', type: 'select', options: ['张三', '李四', '王五'] }
          ]}
          data={null}
          onSave={(data) => {
            // In a real app, this would save to the database
            setIsAddingGroupChat(false);
          }}
        />
      )}

      {isAddingDesign && (
        <DetailModal
          isOpen={true}
          onClose={() => setIsAddingDesign(false)}
          title="上传图纸/方案"
          fields={[
            { key: 'type', label: '类型', type: 'select', options: ['图纸', '方案'] },
            { key: 'name', label: '名称' }
          ]}
          data={null}
          onSave={(data) => {
            setIsAddingDesign(false);
          }}
        />
      )}

      {isAddingResource && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setIsAddingResource(false);
            setEditingResource(null);
          }}
          title={editingResource ? "修改投入资源" : "添加投入资源"}
          fields={[
            { key: 'name', label: '资源名称' },
            { key: 'description', label: '资源描述', type: 'textarea' },
            { key: 'quantity', label: '数量', type: 'number' },
            { key: 'unit', label: '单位' },
            { key: 'estimatedValue', label: '预估价值' }
          ]}
          data={editingResource}
          onSave={(data) => {
            setIsAddingResource(false);
            setEditingResource(null);
          }}
        />
      )}
      <AIAnalysisModal 
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          title={`项目深度分析: ${selectedProject.projectName}`}
          content={statusAnalysisResult}
          isAnalyzing={isAnalyzingStatus}
        />
      </div>
    );
  };
