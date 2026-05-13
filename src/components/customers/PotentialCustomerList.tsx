import React from 'react';
import { RefreshCw, Search, ArrowRight } from 'lucide-react';
import { PotentialCustomer } from '../../types';
import { cn } from '../../lib/utils';

interface PotentialCustomerListProps {
  items: PotentialCustomer[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  loading?: boolean;
  onRefresh: () => void;
  onConvert: (item: PotentialCustomer) => void;
  onSelectCustomer: (item: PotentialCustomer) => void;
}

export default function PotentialCustomerList({ items, searchTerm, setSearchTerm, loading, onRefresh, onConvert, onSelectCustomer }: PotentialCustomerListProps) {
  const filtered = items.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">潜在客户</h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm w-fit self-start lg:self-auto",
            loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading ? "animate-spin" : "")} />
          刷新
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索潜在客户名称、潜在客户ID..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">客户名称</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">系统客户编号</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">潜在客户ID</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} onClick={() => onSelectCustomer(item)} className="hover:bg-indigo-50/40 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.customerNumber || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.id}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConvert(item);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      转为正式客户
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-500">
                    暂无潜在客户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
