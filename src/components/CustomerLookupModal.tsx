import React, { useState } from 'react';
import { Loader2, Search, X, Building2, UserCircle, Plus } from 'lucide-react';
import { Customer, PotentialCustomer } from '../types';
import { cn } from '../lib/utils';
import { searchCustomersByNameFromSupabase } from '../lib/customerRepository';
import { createPotentialCustomerInSupabase, ensurePotentialCustomerLinkedInSupabase, searchPotentialCustomersByNameFromSupabase } from '../lib/potentialCustomerRepository';

type LookupResult =
  | { source: 'customer'; data: Customer }
  | { source: 'potential'; data: PotentialCustomer };

export interface CustomerLookupModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSelect: (payload: { id: string; name: string; source: 'customer' | 'potential' }) => void;
  allowPotential?: boolean; // 新增属性，控制是否允许查询/新建潜在客户
}

export default function CustomerLookupModal({ isOpen, initialQuery, onClose, onSelect, allowPotential = true }: CustomerLookupModalProps) {  
  const [query, setQuery] = useState((initialQuery || '').trim());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<LookupResult[]>([]);
  const [error, setError] = useState<string>('');
  const [showPotential, setShowPotential] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const q = query.trim();
    setError('');
    setSearched(true);
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [customers, potentials] = await Promise.all([
        searchCustomersByNameFromSupabase(q, 20),
        allowPotential && showPotential ? searchPotentialCustomersByNameFromSupabase(q, 20) : Promise.resolve([])
      ]);
      const merged: LookupResult[] = [
        ...(customers || []).map((c) => ({ source: 'customer' as const, data: c })),
        ...(potentials || []).map((p) => ({ source: 'potential' as const, data: p }))
      ];
      setResults(merged);
    } catch (e) {
      setResults([]);
      setError((e as Error)?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePotential = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      const created = await createPotentialCustomerInSupabase(q);
      onSelect({ id: created.id, name: created.name, source: 'potential' });
      onClose();
    } catch (e) {
      setError((e as Error)?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (r: LookupResult) => {
    const id = r.data.id;
    const name = (r.data as any).name || '';
    setLoading(true);
    setError('');
    try {
      if (r.source === 'potential') {
        await ensurePotentialCustomerLinkedInSupabase(id, name);
      }
      onSelect({ id, name, source: r.source });
      onClose();
    } catch (e) {
      setError((e as Error)?.message || '选择失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (searched && query.trim()) {
      handleSearch();
    }
  }, [showPotential]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">查找客户</h3>
            <p className="text-xs text-gray-500 mt-0.5">支持模糊匹配客户资料与潜在客户资料</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入客户名称..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '查找'}
            </button>
          </div>

          {allowPotential && (
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showPotential} 
                  onChange={(e) => setShowPotential(e.target.checked)} 
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">包括潜在客户</span>
              </label>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="max-h-[45vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  查询中...
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {results.map((r) => {
                    const isCustomer = r.source === 'customer';
                    const id = r.data.id;
                    const name = (r.data as any).name || '';
                    return (
                      <button
                        key={`${r.source}-${id}`}
                        type="button"
                        onClick={() => {
                          if (!loading) {
                            void handleSelectResult(r);
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3"
                      >
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isCustomer ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700")}>
                          {isCustomer ? <Building2 className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 truncate">{name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {r.source === 'customer' && (r.data as Customer).customerNumber ? (r.data as Customer).customerNumber : id}
                          </div>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isCustomer ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700")}>
                          {isCustomer ? '客户库' : '潜在客户'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : searched ? (
                <div className="p-6 text-sm text-gray-500 space-y-3">
                  <div>未匹配到客户记录。</div>
                  <button
                    type="button"
                    onClick={handleCreatePotential}
                    disabled={loading || !query.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    新建潜在客户并选中
                  </button>
                </div>
              ) : (
                <div className="p-6 text-sm text-gray-500">输入客户名称后点击“查找”。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
