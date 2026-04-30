import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { Role, SalesQuotation } from '../types';
import { cn } from '../lib/utils';
import DocumentDetail from '../components/DocumentDetail';
import { deleteQuotationFromSupabase, fetchQuotationsFromSupabase, saveQuotationToSupabase } from '../lib/documentRepository';
import { ensureDeleteAllowed } from '../lib/deleteGuard';

interface SalesQuotationsProps {
  role: Role;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function SalesQuotations({ role, viewParams, navigateTo, goBack }: SalesQuotationsProps) {
  const [selectedQuotation, setSelectedQuotation] = useState<SalesQuotation | null>(null);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const remote = await fetchQuotationsFromSupabase();
        setQuotations(remote);
      } catch (error) {
        console.error('Error fetching quotations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (viewParams) {
      const quote = quotations.find(q => q.id === viewParams);
      if (quote) setSelectedQuotation(quote);
    }
  }, [viewParams, quotations]);

  const handleSaveQuotation = async (updatedData: SalesQuotation, shouldClose = true) => {
    const payload = updatedData.id ? updatedData : { ...updatedData, id: `QUO${Date.now()}` };
    try {
      await saveQuotationToSupabase(payload as any);
      if (quotations.find(q => q.id === payload.id)) {
        setQuotations(quotations.map(q => q.id === payload.id ? payload : q));
      } else {
        setQuotations([payload, ...quotations]);
      }
      if (shouldClose) {
        setSelectedQuotation(null);
      } else {
        setSelectedQuotation(payload);
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      toast.error(`报价单保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleCreateNew = () => {
    setSelectedQuotation({
      id: '',
      quoteNo: `QT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(quotations.length + 1).padStart(3, '0')}`,
      customerName: '',
      customerId: '',
      projectId: '',
      projectName: '',
      quoteDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      taxIncludedTotalAmount: 0,
      taxExcludedTotalAmount: 0,
      status: '草稿',
      items: [],
      auditStatus: '未审核',
      changeRecords: [],
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      createDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteQuotation = async (id: string) => {
    const quote = quotations.find((q) => q.id === id);
    if (!quote) return;
    const downstreamCount = String(quote.status || '').includes('接受') ? 1 : 0;
    const ok = await ensureDeleteAllowed({ record: quote, entityName: '报价单', downstreamCount, downstreamLabel: '下游订单' });
    if (!ok) return;
    try {
      await deleteQuotationFromSupabase(id);
      setQuotations(quotations.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error(`报价单删除失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  if (selectedQuotation) {
    return (
      <DocumentDetail
        onBack={() => { setSelectedQuotation(null); if (viewParams) goBack?.(); }}
        document={selectedQuotation}
        documentType="quotation"
        onSave={handleSaveQuotation}
        moduleCode="quotation_management"
        navigateTo={navigateTo}
        onConvertedToOrder={(orderId) => navigateTo?.('sales', orderId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">销售报价单</h2>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新建报价单
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <p>暂无销售报价单数据</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">报价单编号</th>
                  <th className="px-6 py-4">客户名称</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedQuotation(q)}>{q.quoteNo}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{q.customerName}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", q.status === '已接受' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800")}>
                        {q.status}
                      </span>
                      {q.auditStatus === '已审核' && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          已审核
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedQuotation(q)} className="text-indigo-600 hover:text-indigo-700 font-medium">查看详情</button>
                        <button onClick={() => handleDeleteQuotation(q.id)} className="text-red-500 hover:text-red-700 font-medium inline-flex items-center gap-1">
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
              {quotations.map(q => (
                <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3" onClick={() => setSelectedQuotation(q)}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900">{q.customerName}</h3>
                      <p className="text-xs text-indigo-600 font-medium">{q.quoteNo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        q.status === '已接受' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {q.status}
                      </span>
                      {q.auditStatus === '已审核' && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          已审核
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); }} className="text-indigo-600 text-sm font-medium">查看详情</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteQuotation(q.id); }} className="text-red-500 text-sm font-medium flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
