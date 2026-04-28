import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Property } from '../../types/ontology';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: Property) => void;
  editingProperty: Property | null;
}

export const AddPropertyModal = ({ isOpen, onClose, onSave, editingProperty }: AddPropertyModalProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('string');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (editingProperty) {
      setName(editingProperty.name);
      setCode(editingProperty.code);
      setType(editingProperty.type);
      setRequired(editingProperty.required);
      setOptions(editingProperty.options || []);
    } else {
      setName('');
      setCode('');
      setType('String');
      setRequired(false);
      setOptions([]);
    }
  }, [editingProperty, isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, { value: '', label: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: 'value' | 'label', val: string) => {
    const newOptions = [...options];
    newOptions[index][field] = val;
    setOptions(newOptions);
  };

  const handleSave = () => {
    if (!name || !code) return;
    onSave({
      id: editingProperty?.id || `prop${Date.now()}`,
      name,
      code,
      type: type as any,
      required,
      options: type === 'Enum' ? options : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">{editingProperty ? '编辑属性' : '添加属性'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">属性名称</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="如：客户名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标识符 (Code)</label>
            <input 
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              placeholder="如：customer_name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数据类型</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="String">字符串 (String)</option>
              <option value="Number">数字 (Number)</option>
              <option value="Boolean">布尔值 (Boolean)</option>
              <option value="Date">日期 (Date)</option>
              <option value="DateTime">日期时间 (DateTime)</option>
              <option value="Enum">枚举/下拉 (Enum)</option>
              <option value="Text">多行文本 (Text)</option>
              <option value="List">列表 (List)</option>
              <option value="Image">图片 (Image)</option>
              <option value="Attachment">附件 (Attachment)</option>
            </select>
          </div>

          {type === 'Enum' && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">选项映射配置</label>
                <button 
                  onClick={handleAddOption}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  添加选项
                </button>
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input 
                      type="text"
                      value={opt.value}
                      onChange={(e) => handleOptionChange(idx, 'value', e.target.value)}
                      placeholder="存储值"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <input 
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                      placeholder="显示文字"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2 italic">暂无选项，请点击上方添加</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="required" className="text-sm font-medium text-gray-700">设为必填</label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-6 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors">取消</button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">保存属性</button>
        </div>
      </div>
    </div>
  );
};
