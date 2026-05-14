import React from 'react';
import { Plus, Search, Filter, Building2, Clock, ChevronRight } from 'lucide-react';
import { Customer } from '../../types';
import { cn } from '../../lib/utils';
import { formatCustomerTypeLabel } from '../../lib/customerEnums';
import { confirmDialog } from '../../lib/toastConfirm';

interface CustomerListProps {
  customers: Customer[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterLevel: string;
  setFilterLevel: (v: string) => void;
  filterIndustry: string;
  setFilterIndustry: (v: string) => void;
  filterOverdue: boolean;
  setFilterOverdue: (v: boolean) => void;
  uniqueIndustries: string[];
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onDeleteCustomer?: (customerId: string) => void | Promise<void>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  PAGE_SIZE_OPTIONS: number[];
}

export const CustomerList = ({
  customers, searchTerm, setSearchTerm, filterLevel, setFilterLevel,
  filterIndustry, setFilterIndustry, filterOverdue, setFilterOverdue,
  uniqueIndustries, onSelectCustomer, onAddCustomer, onDeleteCustomer, page, setPage, pageSize, setPageSize, PAGE_SIZE_OPTIONS
}: CustomerListProps) => {
  const total = customers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page, setPage]);

  const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div className="space-y-3">
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddCustomer}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新增客户
          </button>
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="搜索客户名称、客户编号..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-200">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-sm font-medium text-gray-700 outline-none"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
            >
              <option value="全部">全部等级</option>
              <option value="战略客户">战略客户</option>
              <option value="成长型客户">成长型客户</option>
              <option value="普通客户">普通客户</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-200">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select 
              className="bg-transparent text-sm font-medium text-gray-700 outline-none"
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
            >
              <option value="全部">全部行业</option>
              {uniqueIndustries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-200">
            <input 
              type="checkbox" 
              checked={filterOverdue}
              onChange={(e) => setFilterOverdue(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">超期未拜访</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {paginatedCustomers.map((customer) => {
          const customerTypeLabel = formatCustomerTypeLabel(customer.customerType) || '-';
          return (
          <div 
            key={customer.id}
            onClick={() => onSelectCustomer(customer)}
            className="group bg-white p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    customer.level === '战略客户' ? 'bg-indigo-100 text-indigo-700' :
                    customer.level === '成长型客户' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {customer.level}
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    customerTypeLabel === '认证企业' ? 'bg-indigo-100 text-indigo-700' :
                    customerTypeLabel === '普通企业' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {customerTypeLabel}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors truncate">
                {customer.name}
                {customer.customerNumber ? `（${customer.customerNumber}）` : ''}
              </h3>
              <p className="text-[11px] text-gray-500 mb-2">客户编号: {customer.customerNumber || '-'}</p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">行业</span>
                  <span className="font-medium text-gray-900 truncate max-w-[58%] text-right">{customer.industry}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">业务员</span>
                  <span className="font-medium text-gray-900 truncate max-w-[58%] text-right">{customer.salesRep}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">末次跟进</span>
                  <div className="flex items-center gap-1 text-gray-900">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-[11px]">{customer.followUps[0]?.date || customer.createDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {customer.contacts.slice(0, 3).map((contact, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600">
                      {contact.name.charAt(0)}
                    </div>
                  ))}
                  {customer.contacts.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400">
                      +{customer.contacts.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onDeleteCustomer && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await confirmDialog('确定要删除这个客户吗？');
                        if (confirmed) {
                          await onDeleteCustomer(customer.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">未找到相关客户</h3>
          <p className="text-sm text-gray-500">尝试调整搜索词或筛选条件</p>
        </div>
      )}

      {customers.length > 0 && (
        <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {total} 条</span>
            <span className="ml-2">每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {Math.min(page, totalPages)} / {totalPages} 页
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
