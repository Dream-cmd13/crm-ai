import React from 'react';
import { Database, Plus, Edit2, Trash2, List, Link as LinkIcon, ShieldAlert, Link2, Clock, MousePointer2, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { OntologyObject, Property, Relation, WorkflowFlow, ProcessingNode, OntologyRule } from '../../types/ontology';
import { EmptyFlows } from './EmptyFlows';
import { FlowNodes } from './FlowNodes';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ObjectViewProps {
  objects: OntologyObject[];
  activeObjectId: string;
  setActiveObjectId: (id: string) => void;
  activeObject: OntologyObject;
  activeTab: 'properties' | 'relations' | 'flows' | 'rules';
  setActiveTab: (tab: any) => void;
  handleAddFlow: () => void;
  handleEditFlowMetadata: (flow: WorkflowFlow) => void;
  handleAddNode: (flowId: string) => void;
  handleEditNode: (flowId: string, node: ProcessingNode) => void;
  handleDeleteNode: (flowId: string, nodeId: string) => void;
  handleDeleteFlow: (flowId: string) => void;
  handleAddProperty: () => void;
  handleEditProperty: (prop: Property) => void;
  handleDeleteProperty: (propId: string) => void;
  handleEditObjectBasic: () => void;
  isFlowDesignMode: boolean;
  flowDesignViewSource: 'draft' | 'published';
  onStartFlowDesign: () => void;
  onViewDraftFlow: () => void;
  onViewPublishedFlow: () => void;
  onApplyFlowDesign: () => void;
  onDiscardFlowDesign: () => void;
  onRollbackFlowPublished: () => void;
  flowOnly?: boolean;
}

export const ObjectView = ({
  objects, activeObjectId, setActiveObjectId, activeObject,
  activeTab, setActiveTab, handleAddFlow, handleEditFlowMetadata, handleAddNode, handleEditNode, handleDeleteNode, handleDeleteFlow,
  handleAddProperty, handleEditProperty, handleDeleteProperty,
  handleEditObjectBasic,
  isFlowDesignMode,
  flowDesignViewSource,
  onStartFlowDesign,
  onViewDraftFlow,
  onViewPublishedFlow,
  onApplyFlowDesign,
  onDiscardFlowDesign,
  onRollbackFlowPublished,
  flowOnly = false
}: ObjectViewProps) => {
  const [isObjectDrawerCollapsed, setIsObjectDrawerCollapsed] = React.useState(false);
  const [activeFlowId, setActiveFlowId] = React.useState<string | null>(null);
  const flowList = activeObject.flows || [];
  const activeFlow = flowList.find((f) => f.id === activeFlowId) || flowList[0] || null;
  const flowInDesign = Boolean(isFlowDesignMode);
  const canEditFlow = flowInDesign && flowDesignViewSource === 'draft';

  React.useEffect(() => {
    if (!flowList.length) {
      setActiveFlowId(null);
      return;
    }
    if (!activeFlowId || !flowList.some((f) => f.id === activeFlowId)) {
      setActiveFlowId(flowList[0].id);
    }
  }, [activeObjectId, flowList.length]);

  return (
    <>
      {/* Left Sidebar - Object List */}
      <div className={`${flowOnly ? (isObjectDrawerCollapsed ? 'w-14' : 'w-52') : 'w-64'} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden transition-all`}>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Database className="w-4 h-4" />
            {!isObjectDrawerCollapsed && '业务对象'}
          </h2>
          <div className="flex items-center gap-1">
            {flowOnly && (
              <button
                onClick={() => setIsObjectDrawerCollapsed(!isObjectDrawerCollapsed)}
                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                title={isObjectDrawerCollapsed ? '展开对象抽屉' : '收起对象抽屉'}
              >
                {isObjectDrawerCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            {!isObjectDrawerCollapsed && (
              <button className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {objects.filter(obj => !obj.isSubTable).map(obj => (
            <button
              key={obj.id}
              onClick={() => setActiveObjectId(obj.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeObjectId === obj.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`flex ${isObjectDrawerCollapsed ? 'justify-center' : 'justify-start'} items-center`}>
                <span className={isObjectDrawerCollapsed ? 'text-xs' : ''}>{isObjectDrawerCollapsed ? obj.name.slice(0, 1) : obj.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Content - Object Details */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Object Header */}
        {!flowOnly && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  {activeObject.name}
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md font-mono border border-gray-200">
                    {activeObject.code}
                  </span>
                </h2>
                <p className="text-gray-500 mt-2 text-sm">{activeObject.description}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg inline-flex border border-indigo-100">
                  <Link2 className="w-4 h-4" />
                  <span className="font-medium">系统关联:</span>
                  <span className="font-mono">{activeObject.systemLink}</span>
                </div>
              </div>
              <button onClick={handleEditObjectBasic} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" />
                编辑基础信息
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {!flowOnly && (
          <div className="flex border-b border-gray-200 px-6 bg-gray-50/50">
            {[
              { id: 'properties', label: '属性 (Properties)', icon: List },
              { id: 'relations', label: '关联 (Relations)', icon: LinkIcon },
              { id: 'flows', label: 'SOP', icon: Settings2 },
              { id: 'rules', label: '规则 (Rules)', icon: ShieldAlert },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className={`flex-1 overflow-y-auto ${flowOnly ? 'p-4' : 'p-6'} bg-gray-50/30`}>
          {activeTab === 'properties' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">对象属性</h3>
                  <button 
                    onClick={handleAddProperty}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    添加属性
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">属性名称</th>
                        <th className="px-4 py-3 font-medium">标识符 (Code)</th>
                        <th className="px-4 py-3 font-medium">数据类型</th>
                        <th className="px-4 py-3 font-medium">必填</th>
                        <th className="px-4 py-3 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeObject.properties.length > 0 ? activeObject.properties.map(prop => (
                        <tr key={prop.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{prop.name}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{prop.code}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">{prop.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            {prop.required ? (
                              <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs border border-red-100">是</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">否</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditProperty(prop)}
                                className="p-1 text-gray-400 hover:text-indigo-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProperty(prop.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">暂无属性定义</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'relations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">对象关联 (Relations)</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  <Plus className="w-4 h-4" />
                  添加关联
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeObject.relations || []).map(rel => (
                  <div key={rel.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-gray-900">{rel.targetObject}</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono border border-gray-200">{rel.relationType}</span>
                      </div>
                      <p className="text-xs text-gray-500">{rel.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {(activeObject.relations || []).length === 0 && (
                  <div className="col-span-2 py-8 text-center text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl">
                    暂无关联定义
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'flows' && (
            <div className="space-y-4">
              {activeObject.code === 'ba_manucustinfo' && (
                <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50 text-xs text-indigo-800">
                  客户对象可新增“客户激活流程”（条件建议：客户长时间未联系）。激活任务模板请在系统设置里维护。
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {!flowOnly && <h3 className="text-lg font-medium text-gray-900">SOP 模板</h3>}
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold border",
                    flowInDesign ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {flowInDesign ? '当前流程设计中' : '正式'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!flowInDesign ? (
                    <>
                      <button
                        onClick={onStartFlowDesign}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                      >
                        开启设计
                      </button>
                      <button
                        onClick={onRollbackFlowPublished}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        撤回上个版本
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onViewDraftFlow}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border",
                          flowDesignViewSource === 'draft'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        查看草稿
                      </button>
                      <button
                        onClick={onViewPublishedFlow}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border",
                          flowDesignViewSource === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        查看正式
                      </button>
                      <button
                        onClick={onApplyFlowDesign}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                      >
                        应用
                      </button>
                      <button
                        onClick={onDiscardFlowDesign}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        放弃草稿
                      </button>
                      <button 
                        onClick={handleAddFlow}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" />
                        添加 SOP 模板
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {flowList.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {flowList.map((flow) => (
                        <button
                          key={flow.id}
                          onClick={() => setActiveFlowId(flow.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold border',
                            activeFlow?.id === flow.id
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          )}
                        >
                          {flow.name}
                        </button>
                      ))}
                    </div>
                    {activeFlow && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-bold text-gray-900 text-lg">{activeFlow.name}</h4>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-0.5 border rounded text-xs font-medium flex items-center gap-1",
                                  activeFlow.triggerType === 'button' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  activeFlow.triggerType === 'auto' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                  {activeFlow.triggerType === 'button' ? <MousePointer2 className="w-3 h-3" /> :
                                   activeFlow.triggerType === 'auto' ? <Settings2 className="w-3 h-3" /> :
                                   <Clock className="w-3 h-3" />}
                                  {activeFlow.triggerType === 'button' ? '按钮触发' :
                                   activeFlow.triggerType === 'auto' ? '自动触发' : '定时触发'}
                                </span>
                                {activeFlow.triggerCondition && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-xs font-mono">
                                    条件: {activeFlow.triggerCondition}
                                  </span>
                                )}
                                {activeFlow.triggerFrequency && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-xs font-mono">
                                    频率: {activeFlow.triggerFrequency}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{activeFlow.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                if (!canEditFlow) {
                                  toast('请切到“查看草稿”后再编辑SOP模板');
                                  return;
                                }
                                handleEditFlowMetadata(activeFlow);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (!canEditFlow) {
                                  toast('请切到“查看草稿”后再删除SOP模板');
                                  return;
                                }
                                handleDeleteFlow(activeFlow.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              disabled={!canEditFlow}
                              title={canEditFlow ? '删除SOP模板' : '切换到草稿后可删除'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          <FlowNodes
                            nodes={activeFlow.nodes || []}
                            onAddNode={() => handleAddNode(activeFlow.id)}
                            onEditNode={(node) => handleEditNode(activeFlow.id, node)}
                            onDeleteNode={(node) => handleDeleteNode(activeFlow.id, node.id)}
                            readOnly={!canEditFlow}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyFlows onAdd={handleAddFlow} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">规则定义 (Rules)</h3>
                <button 
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  添加规则
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">规则名称</th>
                      <th className="px-4 py-3 font-medium">触发点</th>
                      <th className="px-4 py-3 font-medium">条件</th>
                      <th className="px-4 py-3 font-medium">动作</th>
                      <th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activeObject.rules || []).length > 0 ? activeObject.rules.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs border border-orange-100 font-mono">{rule.triggerPoint}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{rule.condition}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {rule.actionType === 'terminate' ? '终止: ' : rule.actionType === 'warning' ? '警告: ' : '执行流程: '}
                          {rule.actionType === 'execute_flow' ? rule.actionValue : rule.actionMessage}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="p-1 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                            <button className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">暂无规则定义</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
