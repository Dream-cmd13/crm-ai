import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, XCircle, Save } from 'lucide-react';
import { CustomerType } from '../types';
import { fetchCustomerTypesFromSupabase, saveCustomerTypesToSupabase } from '../lib/customerTypeRepository';

import { confirmDialog } from '../lib/toastConfirm';

export default function CustomerTypes() {
  const [types, setTypes] = useState<CustomerType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingType, setEditingType] = useState<CustomerType | null>(null);
  const [newType, setNewType] = useState<Partial<CustomerType>>({
    name: '',
    visitFrequency: 30,
    sop: '',
    conditionDescription: '',
    inactiveDays: 30,
    activationTemplateId: ''
  });

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const remote = await fetchCustomerTypesFromSupabase();
        setTypes(remote || []);
      } catch (error) {
        console.error('Error fetching customer types:', error);
      }
    };
    fetchRemote();
  }, []);

  const filteredTypes = types.filter(t => t.name.includes(searchTerm));

  const handleSave = async () => {
    const name = String(newType.name || '').trim();
    if (!name) {
      toast.error('客户类型名称不能为空');
      return;
    }
    const nextTypes = editingType
      ? types.map(t => t.id === editingType.id ? { ...editingType, ...newType, name, visitFrequency: t.visitFrequency || 30, inactiveDays: t.inactiveDays || 30, activationTemplateId: t.activationTemplateId || '' } as CustomerType : t)
      : [...types, { ...newType, id: `CT${Date.now()}`, name, visitFrequency: 30, inactiveDays: 30, activationTemplateId: '' } as CustomerType];

    setTypes(nextTypes);
    setIsAdding(false);
    setEditingType(null);
    setNewType({ name: '', visitFrequency: 30, sop: '', conditionDescription: '', inactiveDays: 30, activationTemplateId: '' });

    saveCustomerTypesToSupabase(nextTypes).catch((error) => {
      console.error('Error saving customer types:', error);
      toast.error(`客户类型保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    });
  };

  const handleEdit = (type: CustomerType) => {
    setEditingType(type);
    setNewType(type);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirmDialog('确定要删除此客户类型吗？')) {
      setTypes(types.filter(t => t.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">客户类型设置</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索客户类型..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            onClick={() => {
              setEditingType(null);
              setNewType({ name: '', visitFrequency: 30, sop: '', conditionDescription: '', inactiveDays: 30, activationTemplateId: '' });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            新增类型
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
        {filteredTypes.map(type => (
          <div key={type.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(type)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(type.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">类型设置条件描述</span>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {type.conditionDescription || '暂无条件描述'}
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">跟进 SOP</span>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {type.sop || '暂无 SOP'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{editingType ? '编辑客户类型' : '新增客户类型'}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">类型名称</label>
                  <input 
                    type="text" 
                    value={newType.name}
                    onChange={(e) => setNewType({...newType, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="例如: 战略客户"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">类型设置条件描述</label>
                  <textarea
                    value={newType.conditionDescription || ''}
                    onChange={(e) => setNewType({ ...newType, conditionDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                    placeholder="例如：年度采购额≥500万，关键项目覆盖全国，决策链完整"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">跟进 SOP</label>
                <textarea 
                  value={newType.sop}
                  onChange={(e) => setNewType({...newType, sop: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]" 
                  placeholder="输入该类型客户的标准跟进流程..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-white transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
