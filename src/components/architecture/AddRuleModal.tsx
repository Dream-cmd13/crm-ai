import React, { useState } from 'react';
import { X, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { OntologyObject } from '../../types/ontology';

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  name: string;
  setName: (v: string) => void;
  trigger: 'before_save' | 'after_save' | 'before_delete' | 'after_delete';
  setTrigger: (v: 'before_save' | 'after_save' | 'before_delete' | 'after_delete') => void;
  condition: string;
  setCondition: (v: string) => void;
  actionType: 'terminate' | 'warning' | 'execute_flow';
  setActionType: (v: 'terminate' | 'warning' | 'execute_flow') => void;
  actionValue: string;
  setActionValue: (v: string) => void;
  actionMessage: string;
  setActionMessage: (v: string) => void;
  availableFlows?: { id: string, name: string }[];
  activeObject?: OntologyObject;
}

export const AddRuleModal = ({
  isOpen, onClose, onSave,
  name, setName, trigger, setTrigger, condition, setCondition, 
  actionType, setActionType, actionValue, setActionValue, actionMessage, setActionMessage,
  availableFlows = [],
  activeObject
}: AddRuleModalProps) => {
  const [selectedPropId, setSelectedPropId] = useState('');
  const [operator, setOperator] = useState('==');
  const [compareValue, setCompareValue] = useState('');

  if (!isOpen) return null;

  const selectedProp = activeObject?.properties.find(p => p.id === selectedPropId);

  const addCondition = () => {
    if (!selectedPropId || !operator || !compareValue) return;
    const prop = activeObject?.properties.find(p => p.id === selectedPropId);
    if (!prop) return;
    
    const newCond = `${prop.code} ${operator} ${prop.type === 'Number' ? compareValue : `'${compareValue}'`}`;
    setCondition(condition ? `${condition} && ${newCond}` : newCond);
    setSelectedPropId('');
    setCompareValue('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            添加业务规则
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">规则名称</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="例如: 自动校验手机号格式"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发时机</label>
              <select 
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="before_save">保存前 (Before Save)</option>
                <option value="after_save">保存后 (After Save)</option>
                <option value="before_delete">删除前 (Before Delete)</option>
                <option value="after_delete">删除后 (After Delete)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">执行动作类型</label>
              <select 
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="terminate">终止 (Terminate)</option>
                <option value="warning">警告 (Warning)</option>
                <option value="execute_flow">执行流程 (Execute Flow)</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
            <label className="block text-sm font-bold text-indigo-900">条件构造器</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select 
                value={selectedPropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="">选择属性...</option>
                {activeObject?.properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select 
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
              >
                <option value="==">等于 (==)</option>
                <option value="!=">不等于 (!=)</option>
                <option value=">">大于 (&gt;)</option>
                <option value="<">小于 (&lt;)</option>
                <option value="contains">包含 (contains)</option>
              </select>
              {selectedProp?.type === 'Enum' && selectedProp.options ? (
                <select 
                  value={compareValue}
                  onChange={(e) => setCompareValue(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
                >
                  <option value="">选择值...</option>
                  {selectedProp.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text"
                  value={compareValue}
                  onChange={(e) => setCompareValue(e.target.value)}
                  placeholder="比较值"
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
                />
              )}
            </div>
            <button 
              onClick={addCondition}
              disabled={!selectedPropId || !compareValue}
              className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" />
              添加条件
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">触发条件 (Condition)</label>
              <button onClick={() => setCondition('')} className="text-[10px] text-red-600 hover:underline">清空条件</button>
            </div>
            <textarea 
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm h-20"
              placeholder="例如: phone != null"
            />
          </div>

          {(actionType === 'terminate' || actionType === 'warning') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示消息</label>
              <textarea 
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 text-sm"
                placeholder="请输入提示给用户的信息..."
              />
            </div>
          )}

          {actionType === 'execute_flow' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择流程</label>
              <select 
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">请选择流程...</option>
                {availableFlows.map(flow => (
                  <option key={flow.id} value={flow.id}>{flow.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">取消</button>
          <button onClick={onSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">保存规则</button>
        </div>
      </div>
    </div>
  );
};
