import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User as UserIcon, Package, Building2, Image as ImageIcon, FileText, Search, Upload, Trash2, Paperclip } from 'lucide-react';
import UniversalSelector from './UniversalSelector';
import CustomerLookupModal from './CustomerLookupModal';
import ReservedButtons from './ReservedButtons';
import WorkflowProgress from './WorkflowProgress';
import { fetchUsersFromSupabase } from '../lib/userRepository';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  onSave?: (data: any) => void | boolean | Promise<void | boolean>;
  fields: { key: string; label: string; type?: string; options?: (string | { value: string; label: string })[]; required?: boolean; hidden?: boolean; customerIdKey?: string; disabled?: boolean; allowPotential?: boolean }[];
  fieldValidators?: Record<string, (value: any, formData: any) => string>;
  isEditing?: boolean;
  onEdit?: () => void;
  moduleCode?: string;
}

export default function DetailModal({ isOpen, onClose, title, data, onSave, fields, fieldValidators, isEditing = true, onEdit, moduleCode }: DetailModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [activeSelector, setActiveSelector] = useState<{ key: string, type: 'user' | 'product' | 'customer' | 'category', customerIdKey?: string } | null>(null);
  const [activeCustomerLookup, setActiveCustomerLookup] = useState<{ key: string; customerIdKey?: string; allowPotential?: boolean } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // 避免父组件重渲染导致 data 引用变化时清空正在输入的内容
    // 仅在弹窗打开或切换到不同记录(id)时重置表单
    if (isOpen && data) {
      setFormData(data);
      setFieldErrors({});
      setCustomFieldErrors({});
    }
  }, [isOpen, data?.id]);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsersFromSupabase()
      .then((users) => {
        const map = new Map<string, string>();
        (users || []).forEach((user) => {
          const id = String(user.id || '').trim();
          const name = String(user.name || user.username || '').trim();
          if (id && name) map.set(id, name);
        });
        setUserNameMap(map);
      })
      .catch(() => {
        setUserNameMap(new Map());
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...(prev?.[parent] || {}),
          [child]: value
        }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [key]: value }));
    }
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCustomFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFieldBlur = (key: string) => {
    const validator = fieldValidators?.[key];
    if (!validator) return;
    const value = getFieldValue(key);
    const message = String(validator(value, formData) || '').trim();
    setCustomFieldErrors((prev) => {
      if (!message) {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: message };
    });
  };

  const handleImageUpload = (key: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleChange(key, String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentsUpload = async (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const encoded = await Promise.all(
      incoming.map((file) => new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            uploadedAt: new Date().toISOString(),
            content: String(reader.result || '')
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }))
    );
    const current = getFieldValue(key);
    const existing = Array.isArray(current) ? current : [];
    handleChange(key, [...existing, ...encoded]);
  };

  const getFieldValue = (key: string) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      return formData[parent]?.[child];
    }
    return formData[key];
  };

  const isEmptyValue = (value: any) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return Number.isNaN(value);
    if (Array.isArray(value)) return value.length === 0;
    return false;
  };

  const validateRequiredFields = () => {
    const errors: Record<string, string> = {};
    const missingLabels: string[] = [];

    fields.filter((f) => !f.hidden && Boolean(f.required)).forEach((field) => {
      const value = getFieldValue(field.key);
      const idKey = field.customerIdKey || (field.key === 'customerName' ? 'customerId' : undefined);

      if (isEmptyValue(value)) {
        errors[field.key] = `${field.label}不能为空`;
        missingLabels.push(field.label);
        return;
      }

      if ((field.type === 'customer_lookup' || field.type === 'customer') && idKey) {
        const idValue = getFieldValue(idKey);
        if (isEmptyValue(idValue)) {
          errors[field.key] = `${field.label}未选择客户`;
          missingLabels.push(field.label);
        }
      }
    });

    setFieldErrors(errors);

    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const safeKey = String(firstKey).replace(/"/g, '\\"');
      const el = document.querySelector(`[data-field-key="${safeKey}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (el as any)?.focus?.();
      toast.error(`请先填写必填项：\n${missingLabels.join('、')}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    if (!validateRequiredFields()) return;
    const payload = { ...formData };
    const result = await Promise.resolve(onSave(payload));
    if (result === false) return;
    onClose();
  };

  const getDisplayName = (key: string, type: string) => {
    const value = getFieldValue(key);
    if (!value) return '';
    const text = String(value).trim();
    if (!text) return '';
    if (type === 'user') {
      return userNameMap.get(text) || text;
    }
    return text;
  };

  const hasWorkflow = moduleCode && ['INQUIRY', 'LEAD', 'OPPORTUNITY', 'PROJECT', 'TASK'].includes(moduleCode) && !isEditing;
  const displayCode =
    formData.customerNumber ||
    formData.inquiryNo ||
    formData.leadNo ||
    formData.opportunityNo ||
    formData.projectNo ||
    formData.orderNo ||
    formData.quoteNo ||
    formData.id ||
    'NEW';

  const workflowSteps: any[] = [];

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${hasWorkflow ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-gray-500">
                编号: {displayCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {moduleCode && data && !isEditing && (
              <ReservedButtons moduleCode={moduleCode} contextData={data} />
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-4">
            <form id="detail-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.filter(field => !field.hidden).map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : 'space-y-2'}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required ? <span className="text-rose-600 ml-1">*</span> : null}
                  </label>
                {field.type === 'select' ? (
                  <select
                    aria-label={field.label}
                    data-field-key={field.key}
                    value={getFieldValue(field.key) || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onBlur={() => handleFieldBlur(field.key)}
                    disabled={!isEditing || Boolean(field.disabled)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-indigo-500'}`}
                  >
                    <option value="">请选择</option>
                    {field.options?.map((opt) => {
                      const value = typeof opt === 'string' ? opt : opt.value;
                      const label = typeof opt === 'string' ? opt : opt.label;
                      return <option key={value} value={value}>{label}</option>;
                    })}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    aria-label={field.label}
                    data-field-key={field.key}
                    value={getFieldValue(field.key) || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onBlur={() => handleFieldBlur(field.key)}
                    rows={3}
                    disabled={!isEditing || Boolean(field.disabled)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-indigo-500'}`}
                  />
                ) : field.type === 'multi-select' ? (
                  <div
                    data-field-key={field.key}
                    className={`w-full px-3 py-2 border rounded-lg text-sm space-y-2 ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : ''}`}
                  >
                    {(field.options || []).map((opt) => {
                      const value = typeof opt === 'string' ? opt : opt.value;
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const current = getFieldValue(field.key);
                      const selectedValues: string[] = Array.isArray(current) ? current : [];
                      const checked = selectedValues.includes(value);
                      return (
                        <label key={value} className={`flex items-center gap-2 ${(!isEditing || field.disabled) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (!isEditing || field.disabled) return;
                              const next = e.target.checked
                                ? Array.from(new Set([...selectedValues, value]))
                                : selectedValues.filter((v) => v !== value);
                              handleChange(field.key, next);
                            }}
                            disabled={!isEditing || Boolean(field.disabled)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center h-full pt-2">
                    <input
                      aria-label={field.label}
                      data-field-key={field.key}
                      type="checkbox"
                      checked={!!getFieldValue(field.key)}
                      onChange={(e) => handleChange(field.key, e.target.checked)}
                      disabled={!isEditing || Boolean(field.disabled)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </div>
                ) : field.type === 'user' ? (
                  <div className="relative">
                    <div 
                      data-field-key={field.key}
                      onClick={() => isEditing && !field.disabled && setActiveSelector({ key: field.key, type: 'user' })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : 'hover:border-indigo-300'}`}
                    >
                      <span>{getDisplayName(field.key, 'user') || '请选择用户'}</span>
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : field.type === 'product' ? (
                  <div className="relative">
                    <div 
                      data-field-key={field.key}
                      onClick={() => isEditing && !field.disabled && setActiveSelector({ key: field.key, type: 'product' })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : 'hover:border-indigo-300'}`}
                    >
                      <span>{getDisplayName(field.key, 'product') || '请选择产品'}</span>
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : field.type === 'customer' ? (
                  <div className="relative">
                    <div 
                      data-field-key={field.key}
                      onClick={() => isEditing && !field.disabled && setActiveSelector({ key: field.key, type: 'customer', customerIdKey: field.customerIdKey })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : 'hover:border-indigo-300'}`}
                    >
                      <span>{getDisplayName(field.key, 'customer') || '请选择客户'}</span>
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : field.type === 'customer_lookup' ? (
                  <div className="relative">
                    <div
                      data-field-key={field.key}
                      onClick={() => isEditing && !field.disabled && setActiveCustomerLookup({ key: field.key, customerIdKey: field.customerIdKey, allowPotential: field.allowPotential !== false })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : 'hover:border-indigo-300'}`}
                    >
                      <span>{getFieldValue(field.key) || '点击查找/选择客户'}</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ) : field.type === 'category' ? (
                  <div
                    data-field-key={field.key}
                    onClick={() => isEditing && !field.disabled && setActiveSelector({ key: field.key, type: 'category' })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${fieldErrors[field.key] ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : 'hover:border-indigo-300'}`}
                  >
                    <span>{getFieldValue(field.key) || '请选择产品分类'}</span>
                    <Building2 className="w-4 h-4 text-gray-400" />
                  </div>
                ) : field.type === 'image' ? (
                  <div className="space-y-2">
                    {getFieldValue(field.key) && (
                      <img 
                        src={getFieldValue(field.key)} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="relative">
                      <input
                        aria-label={field.label}
                        data-field-key={field.key}
                        type="text"
                        placeholder="输入图片URL..."
                        value={getFieldValue(field.key) || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        disabled={!isEditing || Boolean(field.disabled)}
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${fieldErrors[field.key] ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-indigo-500'}`}
                      />
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!isEditing || Boolean(field.disabled)}
                        onChange={(e) => handleImageUpload(field.key, e.target.files?.[0])}
                        className="block w-full text-xs text-gray-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  </div>
                ) : field.type === 'attachments' ? (
                  <div className="space-y-3">
                    <div
                      data-field-key={field.key}
                    className={`w-full p-3 border rounded-lg text-sm ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200'} ${(!isEditing || field.disabled) ? 'bg-gray-50 text-gray-500' : ''}`}
                    >
                      <div className="space-y-2">
                        {(Array.isArray(getFieldValue(field.key)) ? getFieldValue(field.key) : []).map((item: any, idx: number) => (
                          <div key={`${item?.name || 'file'}-${idx}`} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2">
                            <a
                              href={item?.content || '#'}
                              download={item?.name || `file-${idx + 1}`}
                              className="flex items-center gap-2 text-indigo-600 hover:underline truncate"
                            >
                              <Paperclip className="w-4 h-4 shrink-0" />
                              <span className="truncate">{item?.name || `附件${idx + 1}`}</span>
                            </a>
                            {isEditing && !field.disabled ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const current = Array.isArray(getFieldValue(field.key)) ? getFieldValue(field.key) : [];
                                  handleChange(field.key, current.filter((_: any, i: number) => i !== idx));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700"
                                title="删除附件"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {(!Array.isArray(getFieldValue(field.key)) || getFieldValue(field.key).length === 0) && (
                          <div className="text-xs text-gray-500">暂无附件</div>
                        )}
                      </div>
                    </div>
                    {isEditing && !field.disabled ? (
                      <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100">
                        <Upload className="w-4 h-4" />
                        上传附件
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleAttachmentsUpload(field.key, e.target.files).catch(() => {
                              toast.error('附件读取失败，请重试');
                            });
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <input
                    aria-label={field.label}
                    data-field-key={field.key}
                    type={field.type || 'text'}
                    value={getFieldValue(field.key) || ''}
                    onChange={(e) => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    onBlur={() => handleFieldBlur(field.key)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${(fieldErrors[field.key] || customFieldErrors[field.key]) ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-indigo-500'}`}
                    disabled={!isEditing || Boolean(field.disabled) || (field.key === 'id' && Boolean(data?.id) && !data?._isNew)}
                  />
                )}
                {(fieldErrors[field.key] || customFieldErrors[field.key]) ? (
                  <div className="text-xs text-rose-600">{fieldErrors[field.key] || customFieldErrors[field.key]}</div>
                ) : null}
              </div>
            ))}
          </form>
        </div>

        {hasWorkflow && (
          <div className="w-80 border-l border-gray-100 bg-gray-50/50 p-6 overflow-y-auto shrink-0">
            <WorkflowProgress steps={workflowSteps} />
          </div>
        )}
      </div>
        
        <div className="px-4 py-2.5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          {isEditing && onSave ? (
            <button
              type="submit"
              form="detail-form"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              保存
            </button>
          ) : onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              编辑
            </button>
          ) : null}
        </div>
      </div>

      {/* Selectors */}
      {activeSelector && (
        <UniversalSelector
          type={activeSelector.type as any}
          onSelect={(item) => {
            if (activeSelector.type === 'user') {
              const selectedName = String(item.name || item.username || '').trim();
              handleChange(activeSelector.key, selectedName || String(item.id || '').trim());
            } else if (activeSelector.type === 'product') {
              handleChange(activeSelector.key, item.id);
            } else if (activeSelector.type === 'category') {
              handleChange(activeSelector.key, item.name);
            } else if (activeSelector.type === 'customer') {
              handleChange(activeSelector.key, item.name);
              if (activeSelector.customerIdKey) {
                handleChange(activeSelector.customerIdKey, item.id);
              } else if (activeSelector.key === 'customerName') {
                handleChange('customerId', item.id);
              }
            } else if (activeSelector.type === 'contact') {
              handleChange(activeSelector.key, item.name);
            }
            setActiveSelector(null);
          }}
          onClose={() => setActiveSelector(null)}
        />
      )}

      {activeCustomerLookup && (
        <CustomerLookupModal
          isOpen={true}
          initialQuery={String(getFieldValue(activeCustomerLookup.key) || '')}
          onClose={() => setActiveCustomerLookup(null)}
          allowPotential={activeCustomerLookup.allowPotential}
          onSelect={({ id, name }) => {
            handleChange(activeCustomerLookup.key, name);
            if (activeCustomerLookup.customerIdKey) {
              handleChange(activeCustomerLookup.customerIdKey, id);
            }
            setActiveCustomerLookup(null);
          }}
        />
      )}
    </div>,
    document.body
  );
}
