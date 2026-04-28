import React, { useState } from 'react';
import { Bot, User, CheckCircle2, Clock, Circle, ChevronDown, ChevronRight, Plus, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

export interface AiCoachingBlock {
  id: string;
  title: string;
  content: string;
  inputs?: string[];
  field?: string;
  prompt?: string;
}

export interface ProcessingNode {
  id: string;
  label: string;
  type: 'ai' | 'manual';
  status: 'completed' | 'current' | 'pending';
  assignee?: string;
  date?: string;
  aiThoughtProcess?: string;
  aiCoachingBlocks?: AiCoachingBlock[]; // Multiple AI coaching/guidance blocks
  debugPrompt?: string; // Admin debug prompt with replaced parameters
  taskId?: string;
  isRegenerating?: boolean;
  field?: string;
  prompt?: string;
}

interface ProcessingFlowProps {
  nodes: ProcessingNode[];
  onViewTask?: (taskId: string) => void;
  onAddTask?: (nodeId: string) => void;
  onRegenerateAI?: (nodeId: string, blockId: string, field: string, prompt: string) => void;
  isAdmin?: boolean;
}

export default function ProcessingFlow({ nodes, onViewTask, onAddTask, onRegenerateAI, isAdmin }: ProcessingFlowProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const completedCount = nodes.filter((n) => n.status === 'completed').length;
  const currentCount = nodes.filter((n) => n.status === 'current').length;

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">SOP标准</h3>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              已完成 {completedCount}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              进行中 {currentCount}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              全部 {nodes.length}
            </span>
          </div>
        </div>
      </div>
      <div className="relative px-6 py-5">
        <div className="absolute left-10 top-8 bottom-8 w-0.5 bg-gray-200" />
        
        <div className="space-y-8 relative">
          {nodes.map((node, index) => {
            const isPending = node.status === 'pending';
            const isExpanded = expandedNodes[node.id] || !isPending;

            return (
              <div key={node.id} className="flex items-start gap-4">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  node.status === 'completed' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' :
                  node.status === 'current' ? 'bg-indigo-50 border-indigo-500 text-indigo-600' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {node.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : node.status === 'current' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                
                <div className={`flex-grow bg-white rounded-xl border shadow-sm overflow-hidden ${
                  node.status === 'current' ? 'border-indigo-200 ring-1 ring-indigo-500/20' : 'border-gray-200'
                }`}>
                  <div 
                    className={`p-4 flex items-center justify-between ${isPending ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => isPending && toggleNode(node.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      <h4 className={`font-semibold ${node.status === 'pending' ? 'text-gray-500' : 'text-gray-900'}`}>
                        {node.label}
                      </h4>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        node.type === 'ai' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {node.type === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {node.type === 'ai' ? 'AI节点' : '人工节点'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        node.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        node.status === 'current' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {node.status === 'completed' ? '已完成' : node.status === 'current' ? '进行中' : '待处理'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {node.date && (
                        <span className="text-xs text-gray-500">{node.date}</span>
                      )}
                      {onAddTask && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddTask(node.id);
                          }}
                          className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                          title="新增任务"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                      {node.type === 'manual' && node.assignee && (
                        <div className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                          <span className="text-gray-400">执行人:</span>
                          <span className="font-medium">{node.assignee}</span>
                        </div>
                      )}
                      
                      {node.type === 'manual' && node.taskId && onViewTask && (
                        <button 
                          onClick={() => onViewTask(node.taskId!)}
                          className="mt-2 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          查看关联任务
                        </button>
                      )}

                      {node.type === 'ai' && node.aiThoughtProcess && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100">
                          <div className="flex items-center gap-2 mb-2 text-purple-600 font-medium">
                            <Bot className="w-4 h-4" />
                            AI 思考过程
                          </div>
                          <div className="whitespace-pre-wrap font-mono text-xs">
                            {node.aiThoughtProcess}
                          </div>
                        </div>
                      )}

                      {node.aiCoachingBlocks?.map((block) => (
                        <div key={block.id} className="mt-3 bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700 border border-indigo-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 font-bold">
                              <Sparkles className="w-4 h-4" />
                              {block.title}
                            </div>
                            {onRegenerateAI && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRegenerateAI(node.id, block.id, block.field || '', block.prompt || '');
                                }}
                                disabled={node.isRegenerating}
                                className={`flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium ${node.isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {node.isRegenerating ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                重新生成
                              </button>
                            )}
                          </div>
                          <div className="whitespace-pre-wrap text-xs leading-relaxed mb-3">
                            {block.content}
                          </div>
                          {block.inputs && block.inputs.length > 0 && (
                            <div className="pt-2 border-t border-indigo-100">
                              <p className="text-[10px] text-indigo-400 font-medium mb-1 uppercase tracking-wider">输入内容:</p>
                              <div className="flex flex-wrap gap-1">
                                {block.inputs.map((input, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-indigo-100/50 rounded text-[10px] text-indigo-500">
                                    {input}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Admin Debug Prompt */}
                      {isAdmin && node.debugPrompt && (
                        <div className="mt-3 bg-red-50 rounded-lg p-3 text-sm text-red-700 border border-red-100">
                          <div className="flex items-center gap-2 mb-2 font-bold">
                            <Bot className="w-4 h-4" />
                            AI 提示词调试 (管理员可见)
                          </div>
                          <div className="whitespace-pre-wrap text-[10px] font-mono bg-white/50 p-2 rounded border border-red-100">
                            {node.debugPrompt}
                          </div>
                        </div>
                      )}
                      
                      {node.status === 'current' && node.type === 'manual' && !node.taskId && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            已生成人工代办任务，等待处理
                          </p>
                        </div>
                      )}
                      {node.status === 'current' && node.type === 'ai' && !node.aiThoughtProcess && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                            <Bot className="w-3 h-3 animate-pulse" />
                            AI 正在处理中...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
