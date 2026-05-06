import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, CheckCircle, RotateCcw, History, Sparkles, Loader2, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { initialBusinessCustomers, initialProjects, initialProducts } from '../data';
import { DocumentItem, ChangeRecord, TodoTask } from '../types';
import ReservedButtons from './ReservedButtons';
import ProcessingFlow, { ProcessingNode } from './ProcessingFlow';
import QuickTaskModal from './QuickTaskModal';
import TaskDetailModal from './TaskDetailModal';
import { initialTasks } from '../data';
import { cn } from '../lib/utils';


import SelectionModal from './SelectionModal';
import UniversalSelector from './UniversalSelector';
import { fetchProjectsFromSupabase } from '../lib/projectRepository';
import { pushQuotationToSalesOrderInSupabase } from '../lib/pushdown';
import { fetchArchitectureDataFromSupabase } from '../lib/architectureRepository';
import { hasSopTaskForSource, saveTasksSnapshotToSupabase } from '../lib/taskRepository';

interface DocumentDetailProps {
  onBack: () => void;
  document: any;
  documentType: 'quotation' | 'order' | 'sample' | 'return';
  onSave: (doc: any, shouldClose?: boolean) => void;
  moduleCode: string;
  navigateTo?: (view: string, params?: any) => void;
  isAnalyzing?: boolean;
  onAIAnalysis?: () => void;
  onConvertedToOrder?: (orderId: string) => void;
}

export default function DocumentDetail({ onBack, document, documentType, onSave, moduleCode, navigateTo, isAnalyzing, onAIAnalysis, onConvertedToOrder }: DocumentDetailProps) {
  const [formData, setFormData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'flow' | 'history'>('details');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TodoTask[]>(initialTasks);
  const [isPushingDown, setIsPushingDown] = useState(false);
  const [showCustomerSelection, setShowCustomerSelection] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [showProductSelection, setShowProductSelection] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [projectOptions, setProjectOptions] = useState<any[]>(initialProjects);
  const [sopFlows, setSopFlows] = useState<any[]>([]);
  const [hasConvertedSopTask, setHasConvertedSopTask] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    return {
      productName: 200,
      quantity: 120,
      taxType: 150,
      taxRate: 100,
      taxIncludedPrice: 120,
      taxExcludedPrice: 120,
      taxIncludedAmount: 120,
      taxExcludedAmount: 120,
      taxAmount: 120
    };
  });

  const handleResize = (column: string, width: number) => {
    const newWidths = { ...columnWidths, [column]: Math.max(width, 50) };
    setColumnWidths(newWidths);
  };

  const recalculateDocumentTotals = (items: DocumentItem[]) => {
    const normalizedItems = items.map((item) => {
      const calculated = calculateItem(
        {
          ...item,
          quantity: Number(item.quantity || 0),
          taxRate: Number(item.taxRate || 0),
          taxIncludedPrice: Number(item.taxIncludedPrice || 0),
          taxExcludedPrice: Number(item.taxExcludedPrice || 0)
        },
        item.taxIncludedPrice && item.taxIncludedPrice > 0 ? 'taxIncludedPrice' : 'taxExcludedPrice'
      );
      return {
        ...item,
        ...calculated
      };
    });
    const taxIncludedTotalAmount = normalizedItems.reduce((sum, item) => sum + (item.taxIncludedAmount || 0), 0);
    const taxExcludedTotalAmount = normalizedItems.reduce((sum, item) => sum + (item.taxExcludedAmount || 0), 0);
    return {
      items: normalizedItems,
      taxIncludedTotalAmount,
      taxExcludedTotalAmount,
      totalAmount: taxIncludedTotalAmount
    };
  };

  useEffect(() => {
    if (document) {
      const cloned = JSON.parse(JSON.stringify(document));
      const totals = recalculateDocumentTotals(cloned.items || []);
      setFormData({ ...cloned, ...totals });
      setIsEditing(!document.id); // Auto-edit if new
    }
  }, [document]);

  useEffect(() => {
    const fetchRemoteProjects = async () => {
      try {
        const remoteProjects = await fetchProjectsFromSupabase();
        if (remoteProjects.length > 0) {
          setProjectOptions(remoteProjects as any[]);
        }
      } catch (error) {
        console.error('Error fetching projects for document detail:', error);
      }
    };
    fetchRemoteProjects();
  }, []);

  useEffect(() => {
    const normalize = (value: string) =>
      String(value || '')
        .replace(/^crm_/i, '')
        .replace(/^ba_/i, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    const aliases = (() => {
      if (documentType === 'quotation') return ['quotation_management', 'crm_quotation', 'quotation', '报价单'];
      if (documentType === 'order') return ['order_management', 'crm_sales_order', 'sales_order', 'order', '订单', '销售订单'];
      if (documentType === 'sample') return ['sample_management', 'crm_sample_order', 'sample_order', 'sample', '样品单'];
      return ['return_management', 'crm_return_order', 'return_order', 'return', '退货单'];
    })();
    const aliasSet = new Set(aliases.map(normalize));
    const fetchSopFlows = async () => {
      try {
        const { objects } = await fetchArchitectureDataFromSupabase();
        const matched = (objects || []).find((obj: any) => {
          const codeNorm = normalize(String(obj?.code || ''));
          const nameNorm = normalize(String(obj?.name || ''));
          return aliasSet.has(codeNorm) || aliasSet.has(nameNorm);
        });
        const flows = (matched?.flows || []).filter((flow: any) => (flow?.sopTaskConfig?.enabled !== false));
        setSopFlows(flows);
      } catch (error) {
        console.error('load sop flows failed:', error);
        setSopFlows([]);
      }
    };
    fetchSopFlows();
  }, [documentType, moduleCode]);

  const hasSopFlows = sopFlows.length > 0;
  useEffect(() => {
    if (activeTab === 'flow' && !hasSopFlows) setActiveTab('details');
  }, [activeTab, hasSopFlows]);

  const getSourceTypeByDocType = (): TodoTask['sourceType'] => {
    if (documentType === 'quotation') return 'quotation';
    if (documentType === 'order') return 'order';
    if (documentType === 'sample') return 'sample';
    return 'return';
  };

  const getDocNo = () => {
    if (documentType === 'quotation') return formData.quoteNo || formData.id || '';
    if (documentType === 'order') return formData.orderNo || formData.id || '';
    if (documentType === 'sample') return formData.sampleNo || formData.id || '';
    return formData.returnNo || formData.id || '';
  };

  useEffect(() => {
    let mounted = true;
    const checkConverted = async () => {
      try {
        const sourceType = getSourceTypeByDocType();
        const sourceId = String(formData?.id || '');
        if (!sourceId) {
          if (mounted) setHasConvertedSopTask(false);
          return;
        }
        const exists = await hasSopTaskForSource(sourceType, sourceId);
        if (mounted) setHasConvertedSopTask(exists);
      } catch (error) {
        console.warn('check converted sop task failed:', error);
      }
    };
    checkConverted();
    return () => {
      mounted = false;
    };
  }, [documentType, formData?.id]);

  const convertSopToTask = async (flow: any) => {
    try {
      const sourceType = getSourceTypeByDocType();
      const sourceId = String(formData?.id || '');
      if (!sourceId) {
        toast.error('请先保存单据后再转任务');
        return;
      }
      if (hasConvertedSopTask) {
        toast.error('当前单据已转过SOP任务，不能重复转任务');
        return;
      }
      const exists = await hasSopTaskForSource(sourceType, sourceId);
      if (exists) {
        setHasConvertedSopTask(true);
        toast.error('当前单据已转过SOP任务，不能重复转任务');
        return;
      }
      const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const taskType = String(flow?.sopTaskConfig?.taskType || 'SOP跟进任务');
      const title = String(flow?.sopTaskConfig?.titleTemplate || '[SOP] {{sopName}} - {{docNo}}')
        .replace('{{sopName}}', String(flow?.name || 'SOP流程'))
        .replace('{{docNo}}', String(getDocNo() || '单据'));
      const description = String(flow?.sopTaskConfig?.descriptionTemplate || '请按SOP流程完成当前阶段任务。')
        .replace('{{sopName}}', String(flow?.name || 'SOP流程'))
        .replace('{{docNo}}', String(getDocNo() || '单据'));
      const task: TodoTask = {
        id: crypto.randomUUID(),
        title,
        description,
        status: '待办',
        importance: '中',
        urgency: '正常',
        assignee: String(formData.creatorName || '系统管理员'),
        assigneeId: String(formData.creatorId || 'system'),
        assigneeName: String(formData.creatorName || '系统管理员'),
        dueDate,
        createDate: new Date().toISOString().split('T')[0],
        creatorId: String(formData.creatorId || 'system'),
        creatorNo: String(formData.creatorNo || 'system'),
        creatorName: String(formData.creatorName || '系统管理员'),
        taskType,
        sourceType,
        sourceId,
        associatedCustomerId: String(formData.customerId || ''),
        associatedCustomerName: String(formData.customerName || ''),
        originatingFlowId: String(flow?.id || ''),
        originatingFlowName: String(flow?.name || ''),
        auxiliaryData: {
          sopTemplateId: flow?.id,
          sopTemplateName: flow?.name,
          sopTaskConfig: flow?.sopTaskConfig || null,
          sopOqarConfig: flow?.sopOqarConfig || null,
          sopPromptConfig: flow?.sopPromptConfig || null,
          progressionCheckConfig: flow?.progressionCheck || null,
          sourceSnapshot: formData || null
        }
      };
      await saveTasksSnapshotToSupabase([task], 'task_center');
      setHasConvertedSopTask(true);
      toast.success(`已将“SOP-${flow?.name || '流程'}”转为任务`);
    } catch (error) {
      console.error('convert sop to task failed:', error);
      toast.error('SOP转任务失败，请稍后重试');
    }
  };

  if (!formData) return null;

  const isAudited = formData.auditStatus === '已审核';

  const handleSave = () => {
    // Add change record if it's an existing document
    let updatedDoc = { ...formData };
    if (document.id && JSON.stringify(document) !== JSON.stringify(formData)) {
      const record: ChangeRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        user: '当前用户', // Should be actual user
        action: '修改',
        changes: '修改了单据内容' // Could be more detailed
      };
      updatedDoc.changeRecords = [...(updatedDoc.changeRecords || []), record];
    }
    onSave(updatedDoc);
    setIsEditing(false);
  };

  const handleAudit = (isReverse: boolean) => {
    const updatedDoc = {
      ...formData,
      auditStatus: isReverse ? '未审核' : '已审核',
      changeRecords: [
        ...(formData.changeRecords || []),
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          user: '当前用户',
          action: isReverse ? '反审核' : '审核',
          changes: isReverse ? '反审核了单据' : '审核了单据'
        }
      ]
    };
    onSave(updatedDoc, !isReverse);
    setFormData(updatedDoc);
  };

  function calculateItem(item: DocumentItem, changedField: 'taxIncludedPrice' | 'taxExcludedPrice' | 'taxRate' | 'quantity') {
    const rate = (item.taxRate || 0) / 100;
    const qty = item.quantity || 0;
    let incPrice = item.taxIncludedPrice || 0;
    let excPrice = item.taxExcludedPrice || 0;

    if (changedField === 'taxIncludedPrice' || (changedField === 'taxRate' && incPrice > 0)) {
      excPrice = incPrice / (1 + rate);
    } else if (changedField === 'taxExcludedPrice' || (changedField === 'taxRate' && excPrice > 0)) {
      incPrice = excPrice * (1 + rate);
    }

    const taxIncludedAmount = Number((incPrice * qty).toFixed(2));
    const taxExcludedAmount = Number((excPrice * qty).toFixed(2));

    return {
      ...item,
      taxIncludedPrice: Number(incPrice.toFixed(2)),
      taxExcludedPrice: Number(excPrice.toFixed(2)),
      taxIncludedAmount,
      taxExcludedAmount,
      taxAmount: Number((taxIncludedAmount - taxExcludedAmount).toFixed(2)),
    };
  }

  const updateItem = (index: number, updates: Partial<DocumentItem>) => {
    const newItems = [...formData.items];
    let item = { ...newItems[index], ...updates };
    
    const changedFields = Object.keys(updates);
    const needsRecalc = changedFields.some(f => ['taxIncludedPrice', 'taxExcludedPrice', 'taxRate', 'quantity'].includes(f));
    
    if (needsRecalc) {
      // Determine which price field changed to drive the calculation
      const changedField = changedFields.includes('taxIncludedPrice') ? 'taxIncludedPrice' : 
                          changedFields.includes('taxExcludedPrice') ? 'taxExcludedPrice' : 
                          changedFields.includes('taxRate') ? 'taxRate' : 'quantity';
      item = calculateItem(item, changedField as any);
    }
    
    newItems[index] = item;
    
    // Recalculate totals
    const taxIncludedTotalAmount = newItems.reduce((sum, item) => sum + (item.taxIncludedAmount || 0), 0);
    const taxExcludedTotalAmount = newItems.reduce((sum, item) => sum + (item.taxExcludedAmount || 0), 0);
    
    setFormData({ 
      ...formData, 
      items: newItems,
      totalAmount: taxIncludedTotalAmount, // Legacy field
      taxIncludedTotalAmount,
      taxExcludedTotalAmount
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), {
        id: crypto.randomUUID(),
        productName: '',
        quantity: 1,
        taxType: '增值税专用发票',
        taxRate: 13,
        taxIncludedPrice: 0,
        taxExcludedPrice: 0,
        taxIncludedAmount: 0,
        taxExcludedAmount: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    
    const taxIncludedTotalAmount = newItems.reduce((sum, item) => sum + (item.taxIncludedAmount || 0), 0);
    const taxExcludedTotalAmount = newItems.reduce((sum, item) => sum + (item.taxExcludedAmount || 0), 0);
    
    setFormData({ 
      ...formData, 
      items: newItems,
      totalAmount: taxIncludedTotalAmount,
      taxIncludedTotalAmount,
      taxExcludedTotalAmount
    });
  };

  const getTitle = () => {
    switch (documentType) {
      case 'quotation': return `报价单: ${formData.quoteNo || '新建'}`;
      case 'order': return `销售订单: ${formData.orderNo || '新建'}`;
      case 'sample': return `样品单: ${formData.sampleNo || '新建'}`;
      case 'return': return `退货单: ${formData.returnNo || '新建'}`;
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h3 className="text-lg md:text-xl font-bold text-gray-900">{getTitle()}</h3>
          {formData.auditStatus && (
            <span className={cn("px-3 py-1 rounded-full text-sm font-medium", 
              isAudited ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            )}>
              {formData.auditStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReservedButtons moduleCode={moduleCode} contextData={formData} />

          {documentType === 'quotation' && document.id && !isEditing && (
            <button
              onClick={async () => {
                if (isPushingDown) return;
                try {
                  setIsPushingDown(true);
                  const orderId = await pushQuotationToSalesOrderInSupabase(formData);
                  toast.error(`已下推生成订单：${orderId}`);
                  onConvertedToOrder?.(orderId);
                } catch (error) {
                  console.error('Error pushing quotation to order:', error);
                  toast.error(`报价转订单失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
                } finally {
                  setIsPushingDown(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60"
              disabled={isPushingDown}
            >
              {isPushingDown ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              转为订单
            </button>
          )}
          
          {!isAudited && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
              编辑
            </button>
          )}
          
          {isEditing && (
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Save className="w-4 h-4" /> 保存
            </button>
          )}

          {document.id && !isEditing && (
            <>
              {!isAudited ? (
                <button onClick={() => handleAudit(false)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                  <CheckCircle className="w-4 h-4" /> 审核
                </button>
              ) : (
                <button onClick={() => handleAudit(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                  <RotateCcw className="w-4 h-4" /> 反审核
                </button>
              )}
            </>
          )}

          <button onClick={() => setActiveTab('history')} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors" title="变更记录">
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {documentType === 'quotation' ? '报价单编号' : 
                   documentType === 'order' ? '订单编号' : 
                   documentType === 'sample' ? '样品单编号' : '退货单编号'}
                </label>
                <input
                  type="text"
                  value={getDocNo()}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户名称</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formData.customerName || ''}
                    onClick={() => (isEditing && !isAudited) && setShowCustomerSelection(true)}
                    placeholder="点击选择客户"
                    className={cn(
                      "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                      (!isEditing || isAudited) && "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">项目</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formData.projectName || ''}
                    onClick={() => {
                      if (isEditing && !isAudited) {
                        if (!formData.customerId) {
                          toast.error('请先选择客户');
                          return;
                        }
                        setShowProjectSelection(true);
                      }
                    }}
                    placeholder="点击选择项目"
                    className={cn(
                      "w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                      (!isEditing || isAudited) && "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">单据日期</label>
                <input
                  type="date"
                  value={formData.quoteDate || formData.orderDate || formData.sampleDate || formData.returnDate || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const key = documentType === 'quotation' ? 'quoteDate' : 
                               documentType === 'order' ? 'orderDate' : 
                               documentType === 'sample' ? 'sampleDate' : 'returnDate';
                    setFormData({ ...formData, [key]: val });
                  }}
                  disabled={!isEditing || isAudited}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <input 
                  type="text" 
                  value={formData.status || ''} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  disabled={!isEditing || isAudited}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">创建人</label>
                <input
                  type="text"
                  value={formData.creatorName || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-not-allowed"
                />
              </div>
            </div>
            {documentType === 'return' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">订单编号</label>
                  <input
                    type="text"
                    value={formData.orderNo || ''}
                    onChange={e => setFormData({ ...formData, orderNo: e.target.value })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">原始订单号</label>
                  <input
                    type="text"
                    value={formData.originalOrderNo || ''}
                    onChange={e => setFormData({ ...formData, originalOrderNo: e.target.value })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">售后类型</label>
                  <input
                    type="text"
                    value={formData.afterSaleType || ''}
                    onChange={e => setFormData({ ...formData, afterSaleType: e.target.value })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">售后数量</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.afterSaleQty ?? 0}
                    onChange={e => setFormData({ ...formData, afterSaleQty: Number(e.target.value || 0) })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">业务员</label>
                  <input
                    type="text"
                    value={formData.salesRep || ''}
                    onChange={e => setFormData({ ...formData, salesRep: e.target.value })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">跟单员</label>
                  <input
                    type="text"
                    value={formData.merchandiser || ''}
                    onChange={e => setFormData({ ...formData, merchandiser: e.target.value })}
                    disabled={!isEditing || isAudited}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">退货原因</label>
                  <textarea
                    value={formData.reason || ''}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    disabled={!isEditing || isAudited}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                  activeTab === 'details' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                细表
              </button>
              {hasSopFlows && (
                <button
                  onClick={() => setActiveTab('flow')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                    activeTab === 'flow' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  SOP
                </button>
              )}
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
                  activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                变更记录
              </button>
            </div>

            {/* Return-specific fields - Removed AI Analysis as requested */}
            {documentType === 'return' && activeTab === 'details' && (
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900">退货处理 (Win-Win Strategy)</h3>
                    <p className="text-xs text-indigo-600">基于客户双赢策略的处理流程</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  退货处理应优先考虑客户的长期价值。通过深入分析退货原因，制定既能解决客户痛点又能维护公司利益的双赢方案，将客诉转化为二次销售的机会。
                </p>
              </div>
            )}
            {/* Items */}
            {activeTab === 'details' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                {isEditing && !isAudited && (
                  <button onClick={addItem} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    <Plus className="w-4 h-4" /> 添加明细
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto border border-gray-200 rounded-xl relative">
                <table
                  className={cn(
                    "text-left text-sm whitespace-nowrap",
                    documentType === 'return' ? "w-max min-w-[2800px] table-auto" : "w-full table-fixed"
                  )}
                >
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th style={{ width: columnWidths.productName }} className="px-4 py-3 relative group">
                        产品名称
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            const startX = e.pageX;
                            const startWidth = columnWidths.productName;
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              handleResize('productName', startWidth + (moveEvent.pageX - startX));
                            };
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                      </th>
                      <th style={{ width: columnWidths.quantity }} className="px-4 py-3 relative group">
                        数量
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            const startX = e.pageX;
                            const startWidth = columnWidths.quantity;
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              handleResize('quantity', startWidth + (moveEvent.pageX - startX));
                            };
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                      </th>
                      <th style={{ width: columnWidths.taxType }} className="px-4 py-3 relative group">
                            税别
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxType;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxType', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxRate }} className="px-4 py-3 relative group">
                            税率
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxRate;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxRate', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxIncludedPrice }} className="px-4 py-3 relative group">
                            含税价
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxIncludedPrice;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxIncludedPrice', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxExcludedPrice }} className="px-4 py-3 relative group">
                            不含税价
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxExcludedPrice;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxExcludedPrice', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxIncludedAmount }} className="px-4 py-3 relative group">
                            含税金额
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxIncludedAmount;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxIncludedAmount', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxExcludedAmount }} className="px-4 py-3 relative group">
                            不含税金额
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxExcludedAmount;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxExcludedAmount', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                          <th style={{ width: columnWidths.taxAmount }} className="px-4 py-3 relative group">
                            税额
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                const startX = e.pageX;
                                const startWidth = columnWidths.taxAmount;
                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                  handleResize('taxAmount', startWidth + (moveEvent.pageX - startX));
                                };
                                const handleMouseUp = () => {
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            />
                          </th>
                      {documentType === 'return' && (
                        <>
                          <th style={{ width: 160 }} className="px-4 py-3">期望售后方式</th>
                          <th style={{ width: 180 }} className="px-4 py-3">售后原因</th>
                          <th style={{ width: 200 }} className="px-4 py-3">问题描述</th>
                          <th style={{ width: 140 }} className="px-4 py-3">退货单号</th>
                          <th style={{ width: 140 }} className="px-4 py-3">订单编号</th>
                          <th style={{ width: 120 }} className="px-4 py-3">退货数量</th>
                          <th style={{ width: 160 }} className="px-4 py-3">处理方式</th>
                        </>
                      )}
                      {isEditing && !isAudited && <th className="px-4 py-3 w-16">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(formData.items || []).map((item: DocumentItem, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input 
                            type="text" 
                            readOnly
                            value={item.productName || ''} 
                            onClick={() => (isEditing && !isAudited) && (setShowProductSelection(true), setActiveItemIndex(index))}
                            disabled={!isEditing || isAudited}
                            className={cn(
                              "w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70 cursor-pointer",
                              (!isEditing || isAudited) && "cursor-not-allowed"
                            )}
                            placeholder="点击选择产品"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            value={item.quantity || 0} 
                            onChange={e => updateItem(index, { quantity: Number(e.target.value) })}
                            disabled={!isEditing || isAudited}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70 min-w-[80px]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select 
                            value={item.taxType || ''} 
                            onChange={e => updateItem(index, { taxType: e.target.value })}
                            disabled={!isEditing || isAudited}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                          >
                            <option value="增值税专用发票">增值税专用发票</option>
                            <option value="增值税普通发票">增值税普通发票</option>
                            <option value="无税">无税</option>
                          </select>
                        </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" step="0.01"
                                value={item.taxRate || 0} 
                                onChange={e => updateItem(index, { taxRate: Number(e.target.value) })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" step="0.01"
                                value={item.taxIncludedPrice || 0} 
                                onChange={e => updateItem(index, { taxIncludedPrice: Number(e.target.value) })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" step="0.01"
                                value={item.taxExcludedPrice || 0} 
                                onChange={e => updateItem(index, { taxExcludedPrice: Number(e.target.value) })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-900">
                              ¥{(item.taxIncludedAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-900">
                              ¥{(item.taxExcludedAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-900">
                              ¥{(item.taxAmount || 0).toFixed(2)}
                            </td>
                        {documentType === 'return' && (
                          <>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.expectedAfterSaleMethod || item.returnMethod || ''}
                                onChange={e => updateItem(index, { expectedAfterSaleMethod: e.target.value, returnMethod: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.afterSaleReason || ''}
                                onChange={e => updateItem(index, { afterSaleReason: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.issueDescription || ''}
                                onChange={e => updateItem(index, { issueDescription: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.returnNo || ''}
                                onChange={e => updateItem(index, { returnNo: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.orderNo || ''}
                                onChange={e => updateItem(index, { orderNo: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.0001"
                                value={item.returnQty ?? item.quantity ?? 0}
                                onChange={e => updateItem(index, { returnQty: Number(e.target.value || 0) })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.finalHandlingMethod || ''}
                                onChange={e => updateItem(index, { finalHandlingMethod: e.target.value })}
                                disabled={!isEditing || isAudited}
                                className="w-full px-2 py-1 border border-transparent hover:border-gray-200 focus:border-indigo-500 rounded bg-transparent disabled:opacity-70"
                              />
                            </td>
                          </>
                        )}
                        {isEditing && !isAudited && (
                          <td className="px-4 py-2">
                            <button onClick={() => removeItem(index)} className="p-1 text-red-400 hover:text-red-600 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!formData.items || formData.items.length === 0) && (
                      <tr>
                        <td colSpan={(isEditing && !isAudited ? 10 : 9) + (documentType === 'return' ? 7 : 0)} className="px-4 py-8 text-center text-gray-500">
                          暂无明细，请点击"添加明细"
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-900">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">合计:</td>
                      <td colSpan={4}></td>
                      <td className="px-4 py-3 text-indigo-600">¥{(formData.taxIncludedTotalAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-indigo-600">¥{(formData.taxExcludedTotalAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-indigo-600">¥{((formData.taxIncludedTotalAmount || 0) - (formData.taxExcludedTotalAmount || 0)).toFixed(2)}</td>
                      {isEditing && !isAudited && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            )}

            {/* SOP Flow */}
            {!isEditing && activeTab === 'flow' && (
              <div className="mt-4 pt-6 border-t border-gray-100">
                <div className="space-y-3">
                  {sopFlows.map((flow: any) => (
                    <div key={flow.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-indigo-900">{flow.name || '未命名SOP'}</div>
                          <div className="text-xs text-indigo-700 mt-1 whitespace-pre-wrap">{flow.description || '暂无说明'}</div>
                          <div className="mt-2 text-[11px] text-gray-500">
                            节点数：{Array.isArray(flow.nodes) ? flow.nodes.length : 0}
                            {flow?.progressionCheck?.enabled ? ' · 启用晋级检查' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => convertSopToTask(flow)}
                          disabled={hasConvertedSopTask}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={hasConvertedSopTask ? '当前单据已转过任务' : '将当前SOP转为任务'}
                        >
                          {hasConvertedSopTask ? '已转任务' : '转任务'}
                        </button>
                      </div>
                      {Array.isArray(flow.nodes) && flow.nodes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {flow.nodes.map((node: any) => (
                            <span key={node.id} className="px-2 py-1 text-[11px] rounded border border-indigo-200 bg-white text-indigo-700">
                              {node.name || node.id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeTab === 'history' && (
            <div className="border border-gray-100 rounded-xl p-4 md:p-6 overflow-y-auto">
              <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                变更记录
              </h4>
              <div className="space-y-6">
                {(formData.changeRecords || []).map((record: ChangeRecord, idx: number) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-indigo-100 pb-6 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500"></div>
                    <div className="text-sm font-medium text-gray-900">{record.user}</div>
                    <div className="text-xs text-gray-500 mb-1">{new Date(record.date).toLocaleString()}</div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">{record.changes}</div>
                  </div>
                ))}
                {(!formData.changeRecords || formData.changeRecords.length === 0) && (
                  <div className="text-sm text-gray-500 text-center py-8">
                    暂无变更记录
                  </div>
                )}
              </div>
            </div>
          )}
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
              createDate: new Date().toISOString().split('T')[0],
              creatorId: 'U001',
              creatorNo: 'E001',
              creatorName: '当前用户'
            };
            setTasks([newTask, ...tasks]);
            setIsAddingTask(false);
          }}
          initialData={{
            title: `处理${getTitle()?.split(':')[0] || ''}: ${formData.id || ''}`,
            module: documentType === 'quotation' ? '报价' : documentType === 'order' ? '订单' : documentType === 'sample' ? '样品' : '退货',
            relatedId: formData.id || ''
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          task={tasks.find(t => t.id === selectedTaskId) || tasks[0]}
          navigateTo={navigateTo}
          onUpdate={(updatedTask) => {
            setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
          }}
        />
      )}

      {showCustomerSelection && (
        <UniversalSelector
          type="customer"
          onSelect={(customer) => {
            setFormData({ ...formData, customerId: customer.id, customerName: customer.name, projectId: '', projectName: '' });
            setShowCustomerSelection(false);
          }}
          onClose={() => setShowCustomerSelection(false)}
        />
      )}

      <SelectionModal
        isOpen={showProjectSelection}
        onClose={() => setShowProjectSelection(false)}
        title="选择项目"
        items={projectOptions.filter((p) => p.customerId === formData.customerId)}
        onSelect={(project) => {
          setFormData({ ...formData, projectId: project.id, projectName: project.projectName });
        }}
      />

      {showProductSelection && (
        <UniversalSelector
          type="product"
          onSelect={(product) => {
            if (activeItemIndex !== null) {
              updateItem(activeItemIndex, {
                productId: product.id,
                productName: product.materialName,
                taxIncludedPrice: (product as any).price || (product as any).facePrice || 0
              });
            }
            setShowProductSelection(false);
          }}
          onClose={() => setShowProductSelection(false)}
        />
      )}
    </div>
    </>
  );
}
