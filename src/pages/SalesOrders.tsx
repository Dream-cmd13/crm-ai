import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { Role, SalesOrder } from '../types';
import { cn } from '../lib/utils';
import { callAiProxy } from '../lib/aiProxy';
import { parseAiJson } from '../lib/aiJson';
import DocumentDetail from '../components/DocumentDetail';
import { fetchSalesOrdersFromSupabase, saveSalesOrderToSupabase, deleteSalesOrderFromSupabase } from '../lib/documentRepository';
import { ensureDeleteAllowed } from '../lib/deleteGuard';
interface SalesOrdersProps {
  role: Role;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function SalesOrders({ role, viewParams, navigateTo, goBack }: SalesOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const remote = await fetchSalesOrdersFromSupabase();
        setOrders(remote);
      } catch (error) {
        console.error('Error fetching sales orders:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (viewParams) {
      const order = orders.find(o => o.id === viewParams);
      if (order) setSelectedOrder(order);
    }
  }, [viewParams, orders]);

  const handleSaveOrder = async (updatedData: SalesOrder, shouldClose = true) => {
    const payload = updatedData.id ? updatedData : { ...updatedData, id: `ORD${Date.now()}` };
    try {
      await saveSalesOrderToSupabase(payload as any);
      if (orders.find(o => o.id === payload.id)) {
        setOrders(orders.map(o => o.id === payload.id ? payload : o));
      } else {
        setOrders([payload, ...orders]);
      }
      if (shouldClose) {
        setSelectedOrder(null);
      } else {
        setSelectedOrder(payload);
      }
    } catch (error) {
      console.error('Error saving sales order:', error);
      toast.error(`订单保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedOrder) return;
    setIsAnalyzing(true);
    try {
      const prompt = `
        作为一名资深销售专家，请基于“双赢销售 (Win-Win Selling)”方法论分析以下销售订单：
        订单编号: ${selectedOrder.orderNo}
        客户名称: ${selectedOrder.customerName}
        总金额: ${selectedOrder.totalAmount}
        
        请输出JSON格式，包含以下字段：
        1. winResults (string): 本次交易的双赢结果分析 (Win-Results)
        2. loyaltyScore (number, 0-100): 客户忠诚度评分
        3. referralOpportunity (string): 潜在的转介绍或增购机会分析
        4. strategicAdvice (string): 针对该客户的长期维护建议
      `;
      const text = await callAiProxy(prompt);
      const analysis = parseAiJson(text || '{}');
      const updatedOrder = { ...selectedOrder, aiAnalysis: analysis };
      setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedOrder({
      id: '',
      orderNo: `SO${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(orders.length + 1).padStart(3, '0')}`,
      customerName: '',
      customerId: '',
      projectId: '',
      projectName: '',
      orderDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      taxIncludedTotalAmount: 0,
      taxExcludedTotalAmount: 0,
      status: '待执行',
      items: [],
      auditStatus: '未审核',
      changeRecords: [],
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      createDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const downstreamCount = String(order.status || '').includes('退') ? 1 : 0;
    const ok = await ensureDeleteAllowed({ record: order, entityName: '销售订单', downstreamCount, downstreamLabel: '下游售后/退货单据' });
    if (!ok) return;
    try {
      await deleteSalesOrderFromSupabase(id);
      setOrders(orders.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting sales order:', error);
      toast.error(`订单删除失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  if (selectedOrder) {
    return (
      <DocumentDetail
        onBack={() => { setSelectedOrder(null); if (viewParams) goBack?.(); }}
        document={selectedOrder}
        documentType="order"
        onSave={handleSaveOrder}
        moduleCode="order_management"
        navigateTo={navigateTo}
        isAnalyzing={isAnalyzing}
        onAIAnalysis={handleAIAnalysis}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">销售订单</h2>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          新建订单
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <p>暂无销售订单数据</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">订单编号</th>
                  <th className="px-6 py-4">客户名称</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedOrder(o)}>{o.orderNo}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{o.customerName}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", o.status === '已完成' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800")}>
                        {o.status}
                      </span>
                      {o.auditStatus === '已审核' && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          已审核
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedOrder(o)} className="text-indigo-600 hover:text-indigo-700 font-medium">查看详情</button>
                        <button onClick={() => handleDeleteOrder(o.id)} className="text-red-500 hover:text-red-700 font-medium inline-flex items-center gap-1">
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
              {orders.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3" onClick={() => setSelectedOrder(o)}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900">{o.customerName}</h3>
                      <p className="text-xs text-indigo-600 font-medium">{o.orderNo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        o.status === '已完成' ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {o.status}
                      </span>
                      {o.auditStatus === '已审核' && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          已审核
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-indigo-600 text-sm font-medium">查看详情</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }} className="text-red-500 text-sm font-medium flex items-center gap-1">
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
