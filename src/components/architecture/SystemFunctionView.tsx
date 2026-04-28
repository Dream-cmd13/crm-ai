import React from 'react';
import { Plus, Edit2, Trash2, Database, Settings } from 'lucide-react';
import { SystemFunction, OntologyObject } from '../../types/ontology';

interface SystemFunctionViewProps {
  systemFunctions: SystemFunction[];
  objects: OntologyObject[];
}

export const SystemFunctionView = ({ systemFunctions, objects }: SystemFunctionViewProps) => {
  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">系统功能设置</h2>
          <p className="text-gray-500 mt-1 text-sm">配置系统各模块功能，关联本体对象，并绑定基础操作和自定义函数。</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          新增功能模块
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {systemFunctions.map(sf => {
            const linkedOntology = objects.find(o => o.id === sf.associatedOntologyId);
            
            return (
              <div key={sf.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{sf.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{sf.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">关联本体对象</span>
                  {linkedOntology ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-medium">
                      <Database className="w-4 h-4" />
                      {linkedOntology.name} ({linkedOntology.code})
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">未关联</span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">基础功能</span>
                  <div className="flex flex-wrap gap-2">
                    {['add', 'edit', 'save', 'delete', 'submit_review', 'approve'].map(feature => {
                      const isEnabled = sf.basicFeatures.includes(feature);
                      const labels: Record<string, string> = {
                        'add': '新增', 'edit': '修改', 'save': '保存', 
                        'delete': '删除', 'submit_review': '送审', 'approve': '审核'
                      };
                      return (
                        <span key={feature} className={`px-2.5 py-1 rounded text-xs font-medium border ${isEnabled ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-400 border-gray-100 opacity-50'}`}>
                          {labels[feature]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">预留按钮 (自定义流程)</span>
                  <div className="space-y-2">
                    {sf.customFlows.length > 0 ? sf.customFlows.map(flowId => {
                      const flow = (linkedOntology?.flows || []).find(f => f.id === flowId);
                      if (!flow) return null;
                      return (
                        <div key={flowId} className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-800">{flow.name}</span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-sm text-gray-400 italic p-2 bg-gray-50 rounded border border-gray-100">无绑定的自定义流程</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
