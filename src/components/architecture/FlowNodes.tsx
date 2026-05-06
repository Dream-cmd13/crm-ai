import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ProcessingNode } from '../../types/ontology';

interface FlowNodesProps {
  nodes: ProcessingNode[];
  onAddNode: () => void;
  onEditNode: (node: ProcessingNode) => void;
  onDeleteNode?: (node: ProcessingNode) => void;
  readOnly?: boolean;
}

export const FlowNodes = ({ nodes, onAddNode, onEditNode, onDeleteNode, readOnly }: FlowNodesProps) => (
  <div className="space-y-3">
    <h5 className="text-sm font-bold text-gray-700 mb-3">SOP 处理节点 ({nodes.length})</h5>
    {nodes.map((node, index) => (
      <div key={node.id} className="flex gap-3 items-start">
        <div className="flex flex-col items-center mt-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
            node.type === 'automatic' ? 'bg-purple-500' : node.type === 'push_down' ? 'bg-blue-500' : node.type === 'condition' ? 'bg-orange-500' : 'bg-emerald-500'
          }`}>
            {index + 1}
          </div>
          {index < nodes.length - 1 && (
            <div className="w-0.5 h-full bg-gray-200 my-1"></div>
          )}
        </div>
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{node.name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                node.type === 'automatic' ? 'bg-purple-100 text-purple-700' : 
                node.type === 'push_down' ? 'bg-blue-100 text-blue-700' : 
                node.type === 'condition' ? 'bg-orange-100 text-orange-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {node.type === 'automatic' ? '自动节点' : node.type === 'push_down' ? '下推节点' : node.type === 'condition' ? '判断节点' : '人工节点'}
                {node.manualConfig?.isAiAssisted && ' (AI辅助)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onEditNode(node)}
                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                title={readOnly ? '查看块配置' : '编辑块配置'}
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {!readOnly && onDeleteNode && (
                <button
                  onClick={() => onDeleteNode(node)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                  title="删除块"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{node.description}</p>
          
          {node.automaticConfig && (
            <div className="mb-3 space-y-2">
              <div className="text-[10px] text-gray-500">
                API: {node.automaticConfig.apiEndpoint}
              </div>
            </div>
          )}

          {node.pushDownConfig && (
            <div className="mb-3 text-xs text-gray-600">
              <span className="text-gray-500 font-medium">下推目标:</span> {node.pushDownConfig.targetOntologyCode}
            </div>
          )}
        </div>
      </div>
    ))}
    
    <button 
      onClick={() => {
        if (readOnly) return;
        onAddNode();
      }}
      className="ml-9 flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-60"
      disabled={readOnly}
    >
      <Plus className="w-4 h-4" /> 添加块
    </button>
  </div>
);
