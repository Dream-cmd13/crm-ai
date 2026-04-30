import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Package } from 'lucide-react';
import { Role, SalesQuotation, SalesOrder } from '../types';
import { cn } from '../lib/utils';
import DocumentDetail from '../components/DocumentDetail';
import { fetchQuotationsFromSupabase, fetchSalesOrdersFromSupabase, saveQuotationToSupabase, saveSalesOrderToSupabase } from '../lib/documentRepository';

interface SalesProps {
  role: Role;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Sales({ role, viewParams, navigateTo, goBack }: SalesProps) {
  const [activeModule, setActiveModule] = useState<'quotations' | 'orders'>('quotations');
  const [selectedQuotation, setSelectedQuotation] = useState<SalesQuotation | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotationRows, orderRows] = await Promise.all([
        fetchQuotationsFromSupabase(),
        fetchSalesOrdersFromSupabase()
      ]);
      setQuotations((quotationRows || []) as SalesQuotation[]);
      setOrders((orderRows || []) as SalesOrder[]);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setQuotations([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      const maxCount = activeModule === 'quotations' ? quotations.length : orders.length;
      if (displayCount < maxCount) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  useEffect(() => {
    if (viewParams && (quotations.length > 0 || orders.length > 0)) {
      if (viewParams.tab === 'quotations') {
        setActiveModule('quotations');
        const quote = quotations.find(q => q.id === viewParams.id);
        if (quote) setSelectedQuotation(quote);
      } else if (viewParams.tab === 'orders') {
        setActiveModule('orders');
        const order = orders.find(o => o.id === viewParams.id);
        if (order) setSelectedOrder(order);
      }
    }
  }, [viewParams, quotations, orders]);

  const handleSaveQuotation = async (updatedData: SalesQuotation) => {
    try {
      await saveQuotationToSupabase(updatedData);
      await fetchData();
      setSelectedQuotation(null);
    } catch (error) {
      console.error('Error saving quotation:', error);
    }
  };

  const handleSaveOrder = async (updatedData: SalesOrder) => {
    try {
      await saveSalesOrderToSupabase(updatedData);
      await fetchData();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error saving sales order:', error);
    }
  };

  const handleCreateNew = () => {
    if (activeModule === 'quotations') {
      setSelectedQuotation({
        id: '',
        quoteNo: '',
        customerName: '',
        customerId: '',
        projectId: '',
        projectName: '',
        quoteDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxIncludedTotalAmount: 0,
        taxExcludedTotalAmount: 0,
        status: '草稿',
        auditStatus: '未审核',
        changeRecords: [],
        items: [],
        creatorId: 'system',
        creatorNo: 'system',
        creatorName: 'system',
        createDate: new Date().toISOString().split('T')[0]
      });
    } else {
      setSelectedOrder({
        id: '',
        orderNo: '',
        customerName: '',
        customerId: '',
        projectId: '',
        projectName: '',
        orderDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        taxIncludedTotalAmount: 0,
        taxExcludedTotalAmount: 0,
        status: '待执行',
        auditStatus: '未审核',
        changeRecords: [],
        items: [],
        creatorId: 'system',
        creatorNo: 'system',
        creatorName: 'system',
        createDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const searchLower = searchTerm.toLowerCase();
    return q.quoteNo.toLowerCase().includes(searchLower) || q.customerName.toLowerCase().includes(searchLower);
  });

  const filteredOrders = orders.filter(o => {
    const searchLower = searchTerm.toLowerCase();
    return o.orderNo.toLowerCase().includes(searchLower) || o.customerName.toLowerCase().includes(searchLower);
  });

  if (selectedQuotation || selectedOrder) {
    return (
      <DocumentDetail
        onBack={() => { setSelectedQuotation(null); setSelectedOrder(null); if (viewParams) goBack?.(); }}
        document={selectedQuotation || selectedOrder}
        documentType={selectedQuotation ? 'quotation' : 'order'}
        onSave={selectedQuotation ? handleSaveQuotation : handleSaveOrder}
        moduleCode={selectedQuotation ? "quotation_management" : "order_management"}
        navigateTo={navigateTo}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveModule('quotations')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeModule === 'quotations' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              销售报价单
            </button>
            <button 
              onClick={() => setActiveModule('orders')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeModule === 'orders' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              销售订单
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索..." 
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
            新建{activeModule === 'quotations' ? '报价单' : '订单'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]" onScroll={handleScroll}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (activeModule === 'quotations' && filteredQuotations.length === 0) || (activeModule === 'orders' && filteredOrders.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Package className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">暂无{activeModule === 'quotations' ? '报价单' : '订单'}数据</p>
            <p className="text-sm mt-1">点击右上角"新建{activeModule === 'quotations' ? '报价单' : '订单'}"创建</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">单号</th>
                    <th className="px-6 py-4">客户名称</th>
                    <th className="px-6 py-4">关联项目</th>
                    <th className="px-6 py-4">日期</th>
                    <th className="px-6 py-4">状态</th>
                    <th className="px-6 py-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
              {activeModule === 'quotations' ? (
                filteredQuotations.slice(0, displayCount).map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedQuotation(q)}>{q.quoteNo}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{q.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{q.projectName || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{q.quoteDate}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        q.status === '已接受' ? "bg-emerald-100 text-emerald-800" :
                        q.status === '已发送' ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedQuotation(q)} className="text-indigo-600 hover:text-indigo-700 font-medium">查看详情</button>
                    </td>
                  </tr>
                ))
              ) : (
                filteredOrders.slice(0, displayCount).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedOrder(o)}>{o.orderNo}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{o.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{o.projectName || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{o.orderDate}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        o.status === '已完成' ? "bg-emerald-100 text-emerald-800" :
                        o.status === '待执行' ? "bg-amber-100 text-amber-800" :
                        "bg-blue-100 text-blue-800"
                      )}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedOrder(o)} className="text-indigo-600 hover:text-indigo-700 font-medium">查看详情</button>
                    </td>
                  </tr>
                ))
              )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
              {activeModule === 'quotations' ? (
                filteredQuotations.slice(0, displayCount).map(q => (
                  <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3" onClick={() => setSelectedQuotation(q)}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">{q.customerName}</h3>
                        <p className="text-xs text-indigo-600 font-medium">{q.quoteNo}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        q.status === '已接受' ? "bg-emerald-100 text-emerald-800" :
                        q.status === '已发送' ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {q.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">关联项目</p>
                        <p className="text-gray-900">{q.projectName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">日期</p>
                        <p className="text-gray-900">{q.quoteDate}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-end">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedQuotation(q); }} className="text-indigo-600 text-sm font-medium">详情</button>
                    </div>
                  </div>
                ))
              ) : (
                filteredOrders.slice(0, displayCount).map(o => (
                  <div key={o.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3" onClick={() => setSelectedOrder(o)}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-900">{o.customerName}</h3>
                        <p className="text-xs text-indigo-600 font-medium">{o.orderNo}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        o.status === '已完成' ? "bg-emerald-100 text-emerald-800" :
                        o.status === '待执行' ? "bg-amber-100 text-amber-800" :
                        "bg-blue-100 text-blue-800"
                      )}>
                        {o.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs">关联项目</p>
                        <p className="text-gray-900">{o.projectName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">日期</p>
                        <p className="text-gray-900">{o.orderDate}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex justify-end">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="text-indigo-600 text-sm font-medium">详情</button>
                    </div>
                  </div>
                ))
              )}
              {displayCount < (activeModule === 'quotations' ? filteredQuotations.length : filteredOrders.length) && (
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
