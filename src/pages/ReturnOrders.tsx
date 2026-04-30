import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Package, Loader2 } from 'lucide-react';
import { Role, ReturnOrder } from '../types';
import { cn } from '../lib/utils';
import DocumentDetail from '../components/DocumentDetail';
import { deleteReturnOrderFromSupabase, fetchReturnOrdersFromSupabase, saveReturnOrderToSupabase } from '../lib/documentRepository';
import { ensureDeleteAllowed } from '../lib/deleteGuard';

interface ReturnOrdersProps {
  role: Role;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function ReturnOrders({ role, viewParams, navigateTo, goBack }: ReturnOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReturnOrders();
  }, []);

  const fetchReturnOrders = async () => {
    setIsLoading(true);
    try {
      const remote = await fetchReturnOrdersFromSupabase();
      setOrders(remote);
    } catch (error) {
      console.error('Error fetching return orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewParams && orders.length > 0) {
      const order = orders.find(o => o.id === viewParams);
      if (order) {
        setSelectedOrder(order);
      }
    }
  }, [viewParams, orders]);

  const handleSaveOrder = async (updatedData: ReturnOrder, shouldClose = true) => {
    const payload = updatedData.id ? updatedData : { ...updatedData, id: `RET${Date.now()}` };
    try {
      await saveReturnOrderToSupabase(payload as any);
      if (payload.id && orders.find(o => o.id === payload.id)) {
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
      console.error('Error saving return order:', error);
      toast.error(`退货单保存失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleCreateNew = () => {
    setSelectedOrder({
      id: '',
      returnNo: `RET${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(orders.length + 1).padStart(3, '0')}`,
      orderNo: '',
      originalOrderNo: '',
      customerId: '',
      customerName: '',
      afterSaleQty: 0,
      afterSaleType: '',
      projectId: '',
      projectName: '',
      reason: '',
      handler: '',
      salesRep: '',
      merchandiser: '',
      createDate: new Date().toISOString().split('T')[0],
      status: '待处理',
      items: [],
      creatorId: 'system',
      creatorNo: 'system',
      creatorName: 'system',
      taxIncludedTotalAmount: 0,
      taxExcludedTotalAmount: 0,
      auditStatus: '未审核',
      changeRecords: []
    });
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.returnNo || '').toLowerCase().includes(searchLower) ||
      (order.customerName || '').toLowerCase().includes(searchLower) ||
      ((order.projectName || '').toLowerCase().includes(searchLower))
    );
  });

  const handleDeleteOrder = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const ok = await ensureDeleteAllowed({ record: order, entityName: '退货单' });
    if (!ok) return;
    try {
      await deleteReturnOrderFromSupabase(id);
      setOrders(orders.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting return order:', error);
      toast.error(`退货单删除失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < filteredOrders.length) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  if (selectedOrder) {
    return (
      <DocumentDetail
        onBack={() => { setSelectedOrder(null); if (viewParams) goBack?.(); }}
        document={selectedOrder}
        documentType="return"
        onSave={handleSaveOrder}
        moduleCode="return_management"
        navigateTo={navigateTo}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">退货客诉单管理</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索售后单号/客户..." 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            新建退货单
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]" onScroll={handleScroll}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Package className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">暂无退货单</p>
            <p className="text-sm mt-1">点击右上角"新建退货单"创建</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">退货单号</th>
                    <th className="px-6 py-4">订单编号</th>
                    <th className="px-6 py-4">原始订单号</th>
                    <th className="px-6 py-4">客户名称</th>
                    <th className="px-6 py-4">关联项目</th>
                    <th className="px-6 py-4">售后类型</th>
                    <th className="px-6 py-4">售后原因</th>
                    <th className="px-6 py-4">处理人</th>
                    <th className="px-6 py-4">创建时间</th>
                    <th className="px-6 py-4">状态</th>
                    <th className="px-6 py-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.slice(0, displayCount).map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedOrder(o)}>{o.returnNo}</td>
                      <td className="px-6 py-4 text-gray-600">{o.orderNo || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{o.originalOrderNo}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{o.customerName}</td>
                      <td className="px-6 py-4 text-gray-600">{o.projectName || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{o.afterSaleType || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{o.reason}</td>
                      <td className="px-6 py-4 text-gray-600">{o.handler}</td>
                      <td className="px-6 py-4 text-gray-500">{o.createDate}</td>
                      <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      o.status === '已完成' ? "bg-emerald-100 text-emerald-800" :
                      o.status === '待处理' ? "bg-amber-100 text-amber-800" :
                      "bg-blue-100 text-blue-800"
                    )}>
                      {o.status}
                    </span>
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
          {filteredOrders.slice(0, displayCount).map(o => (
            <div key={o.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3" onClick={() => setSelectedOrder(o)}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{o.customerName}</h3>
                  <p className="text-xs text-indigo-600 font-medium">{o.returnNo}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  o.status === '已完成' ? "bg-emerald-100 text-emerald-800" :
                  o.status === '待处理' ? "bg-amber-100 text-amber-800" :
                  "bg-blue-100 text-blue-800"
                )}>
                  {o.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">订单编号</p>
                  <p className="text-gray-900">{o.orderNo || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">原始订单号</p>
                  <p className="text-gray-900">{o.originalOrderNo}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">售后类型</p>
                  <p className="text-gray-900">{o.afterSaleType || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">处理人</p>
                  <p className="text-gray-900">{o.handler}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">创建时间</p>
                  <p className="text-gray-900">{o.createDate}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">售后原因</p>
                  <p className="text-gray-900 line-clamp-1">{o.reason}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-indigo-600 text-sm font-medium">详情</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id); }} className="text-red-500 text-sm font-medium">删除</button>
                </div>
              </div>
            </div>
          ))}
          {displayCount < filteredOrders.length && (
            <div className="py-4 text-center text-gray-500 text-sm">
              正在加载更多...
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
