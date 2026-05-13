import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Trash2, RefreshCw, Loader2, Link2, AlertTriangle, UserCheck, Eye, EyeOff, Users, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  fetchWechatBindings,
  deleteWechatBinding,
  fetchUnresolvedNicknames,
  resolveNicknameConflict,
  ignoreNickname,
  triggerAutoMatch,
  searchEmployees,
  searchContacts,
  fetchNameSnapshots,
} from '../lib/wechatBindingRepository';
import { fetchUsersFromSupabase, saveUserToSupabase } from '../lib/userRepository';
import type { WechatBinding, UnresolvedNickname, CandidateWxid } from '../types';
import { confirmDialog } from '../lib/toastConfirm';

interface ResolveModalProps {
  item: UnresolvedNickname;
  onClose: () => void;
  onResolved: () => void;
}

function ResolveModal({ item, onClose, onResolved }: ResolveModalProps) {
  const [bindType, setBindType] = useState<'employee' | 'customer_contact'>('employee');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBindId, setSelectedBindId] = useState('');
  const [selectedBindName, setSelectedBindName] = useState('');
  const [saving, setSaving] = useState(false);

  const chosenWxid = item.candidateWxids?.[0]?.wxid || '';

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      if (bindType === 'employee') {
        setResults(await searchEmployees(searchTerm));
      } else {
        setResults(await searchContacts(searchTerm));
      }
    } catch (e: any) {
      toast.error('搜索失败: ' + e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedBindId) { toast.error('请选择一个绑定目标'); return; }
    setSaving(true);
    try {
      await resolveNicknameConflict(item.id, chosenWxid, bindType, selectedBindId);
      // Also backfill wechat_id on the user/contact
      if (bindType === 'employee') {
        await saveUserToSupabase({ id: selectedBindId, wechat_id: chosenWxid } as any);
      }
      toast.success('已绑定');
      onResolved();
      onClose();
    } catch (e: any) {
      toast.error('绑定失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">解析重名昵称</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>昵称: <span className="font-medium text-gray-900">{item.nickname}</span></p>
          <p>候选 wxid:</p>
          <div className="space-y-1 ml-2">
            {(item.candidateWxids || []).map((c: CandidateWxid, i: number) => (
              <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1">
                <span className="font-mono">{c.wxid}</span>
                <span className="text-gray-400 ml-2">{c.nickname}</span>
                <span className="text-gray-400 ml-2">({c.source})</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">绑定类型</label>
          <div className="flex gap-2 mt-1">
            {(['employee', 'customer_contact'] as const).map(t => (
              <button
                key={t}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                  bindType === t ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
                onClick={() => { setBindType(t); setSelectedBindId(''); setSelectedBindName(''); setResults([]); }}
              >
                {t === 'employee' ? '员工' : '客户联系人'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">搜索绑定目标</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={bindType === 'employee' ? '搜索员工姓名...' : '搜索联系人姓名...'}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
            />
            <button onClick={handleSearch} disabled={searching} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
            {results.map((r: any) => (
              <div
                key={r.id}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 transition-colors',
                  selectedBindId === r.id && 'bg-indigo-50 border-l-2 border-indigo-500'
                )}
                onClick={() => { setSelectedBindId(r.id); setSelectedBindName(r.name || '-'); }}
              >
                <span className="font-medium">{r.name || r.username}</span>
                {r.position && <span className="text-gray-400 ml-2">{r.position}</span>}
              </div>
            ))}
          </div>
        )}

        {selectedBindId && (
          <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            已选择: {selectedBindName} ({bindType === 'employee' ? '员工' : '联系人'})
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
          <button onClick={handleResolve} disabled={saving || !selectedBindId} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}确认绑定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WechatBindingManagement() {
  const [bindings, setBindings] = useState<WechatBinding[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedNickname[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bindings' | 'unresolved' | 'snapshots'>('bindings');
  const [searchTerm, setSearchTerm] = useState('');
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [autoMatching, setAutoMatching] = useState(false);
  const [resolveItem, setResolveItem] = useState<UnresolvedNickname | null>(null);
  const [showVerified, setShowVerified] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, u, s] = await Promise.all([
        fetchWechatBindings(),
        fetchUnresolvedNicknames('pending'),
        fetchNameSnapshots(),
      ]);
      setBindings(b);
      setUnresolved(u);
      setSnapshots(s);

      // Build name maps for bind_id → display name
      try {
        const users = await fetchUsersFromSupabase();
        const umap: Record<string, string> = {};
        users.forEach((u: any) => { umap[u.id] = u.name || u.username; });
        setUserMap(umap);
      } catch { /* allow partial */ }

      // Build contact name map from bindings that are customer_contact type
      try {
        const { getSupabaseClient, isSupabaseConfigured } = await import('../lib/supabaseClient');
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          const contactIds = b.filter(x => x.bindType === 'customer_contact').map(x => x.bindId);
          if (contactIds.length > 0) {
            const { data } = await supabase.from('crm_customer_contact').select('id, name').in('id', contactIds);
            const cmap: Record<string, string> = {};
            (data || []).forEach((c: any) => { cmap[c.id] = c.name; });
            setContactMap(cmap);
          }
        }
      } catch { /* allow partial */ }
    } catch (e: any) {
      console.error('Failed to load binding data', e);
      toast.error('加载数据失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleVerify = async (b: WechatBinding) => {
    try {
      const { getSupabaseClient } = await import('../lib/supabaseClient');
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      await supabase.from('crm_wechat_binding').update({
        is_verified: !b.isVerified,
        verified_at: b.isVerified ? null : now,
        updated_at: now,
      }).eq('id', b.id);
      setBindings(prev => prev.map(x => x.id === b.id ? { ...x, isVerified: !x.isVerified } : x));
      toast.success(b.isVerified ? '已取消验证' : '已验证');
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const handleDelete = async (b: WechatBinding) => {
    if (!await confirmDialog(`确定要删除绑定 "${b.wechatName || b.wechatId}" 吗？`)) return;
    try {
      await deleteWechatBinding(b.id);
      setBindings(prev => prev.filter(x => x.id !== b.id));
      toast.success('已删除');
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleAutoMatch = async () => {
    setAutoMatching(true);
    try {
      const result = await triggerAutoMatch();
      toast.success(`自动匹配完成，匹配到 ${(result || []).length} 条`);
      await loadData();
    } catch (e: any) {
      toast.error('自动匹配失败: ' + e.message);
    } finally {
      setAutoMatching(false);
    }
  };

  const handleIgnore = async (id: number) => {
    if (!await confirmDialog('确定忽略此昵称吗？')) return;
    try {
      await ignoreNickname(id);
      setUnresolved(prev => prev.filter(x => x.id !== id));
      toast.success('已忽略');
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const bindName = (b: WechatBinding) => {
    if (b.bindType === 'employee') return userMap[b.bindId] || b.bindId;
    return contactMap[b.bindId] || b.bindId;
  };

  const filteredBindings = bindings.filter(b => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (b.wechatId || '').toLowerCase().includes(q)
      || (b.wechatName || '').toLowerCase().includes(q)
      || (bindName(b) || '').toLowerCase().includes(q);
  });

  const filteredSnapshots = snapshots.filter(s => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (s.original_nickname || '').toLowerCase().includes(q)
      || (s.wechat_id || '').toLowerCase().includes(q);
  });

  const tabs = [
    { key: 'bindings' as const, label: '绑定列表', icon: Link2, count: bindings.length },
    { key: 'unresolved' as const, label: '待解析', icon: AlertTriangle, count: unresolved.length },
    { key: 'snapshots' as const, label: '快照表', icon: Clock, count: snapshots.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">微信绑定管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理微信昵称 ↔ wxid 绑定关系，处理重名冲突</p>
        </div>
        <button
          onClick={handleAutoMatch}
          disabled={autoMatching}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          {autoMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          触发自动匹配
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="搜索..."
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
        />
      </div>

      {/* ========== TAB 1: Bindings ========== */}
      {activeTab === 'bindings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={showVerified} onChange={e => setShowVerified(e.target.checked)} className="rounded" />
              显示已验证
            </label>
          </div>

          {filteredBindings.filter(b => showVerified || !b.isVerified).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无绑定记录</p>
              <p className="text-xs mt-1">为员工/联系人填写微信昵称后，自动匹配会生成绑定</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">微信 ID</th>
                    <th className="text-left px-4 py-3 font-medium">微信昵称</th>
                    <th className="text-left px-4 py-3 font-medium">绑定类型</th>
                    <th className="text-left px-4 py-3 font-medium">绑定目标</th>
                    <th className="text-left px-4 py-3 font-medium">匹配来源</th>
                    <th className="text-left px-4 py-3 font-medium">已验证</th>
                    <th className="text-left px-4 py-3 font-medium">创建时间</th>
                    <th className="text-right px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBindings.filter(b => showVerified || !b.isVerified).map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{b.wechatId}</td>
                      <td className="px-4 py-3">{b.wechatName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          b.bindType === 'employee' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                        )}>
                          {b.bindType === 'employee' ? '员工' : '联系人'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{bindName(b)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {b.matchSource === 'nickname' ? '昵称匹配' : b.matchSource === 'manual_confirm' ? '人工确认' : b.matchSource === 'group_member' ? '群成员' : b.matchSource}
                      </td>
                      <td className="px-4 py-3">
                        {b.isVerified ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" />已确认</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-xs"><AlertTriangle className="w-3.5 h-3.5" />未确认</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleVerify(b)}
                            title={b.isVerified ? '取消验证' : '确认验证'}
                            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          >
                            {b.isVerified ? <EyeOff className="w-4 h-4 text-gray-400" /> : <UserCheck className="w-4 h-4 text-indigo-500" />}
                          </button>
                          <button
                            onClick={() => handleDelete(b)}
                            title="删除绑定"
                            className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB 2: Unresolved ========== */}
      {activeTab === 'unresolved' && (
        <div className="space-y-4">
          {unresolved.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p>暂无待解析的重名昵称</p>
              <p className="text-xs mt-1">当同一昵称对应多个 wxid 时会出现在这里</p>
            </div>
          ) : (
            unresolved.map(item => (
              <div key={item.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.nickname}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResolveItem(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> 解析
                    </button>
                    <button
                      onClick={() => handleIgnore(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-sm"
                    >
                      <XCircle className="w-3.5 h-3.5" /> 忽略
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">候选 wxid:</p>
                  {(item.candidateWxids || []).map((c: CandidateWxid, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <code className="font-mono text-gray-800">{c.wxid}</code>
                      <span className="text-gray-500">{c.nickname}</span>
                      <span className="text-gray-400 ml-auto">{c.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========== TAB 3: Snapshots ========== */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          <div className="text-xs text-gray-400">数据来源：群成员同步 / 好友同步。匹配时与此表的 original_nickname 精确比对。</div>
          {filteredSnapshots.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无快照数据</p>
              <p className="text-xs mt-1">等待机器人同步群成员或好友列表后自动生成</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">昵称 (original_nickname)</th>
                    <th className="text-left px-4 py-3 font-medium">展示名</th>
                    <th className="text-left px-4 py-3 font-medium">wxid</th>
                    <th className="text-left px-4 py-3 font-medium">来源表</th>
                    <th className="text-left px-4 py-3 font-medium">来源群</th>
                    <th className="text-left px-4 py-3 font-medium">最后出现</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSnapshots.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{s.original_nickname}</td>
                      <td className="px-4 py-3 text-gray-500">{s.display_name || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.wechat_id}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{s.source_table}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{s.source_context || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {s.last_seen_at ? new Date(s.last_seen_at).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Resolve Modal */}
      {resolveItem && (
        <ResolveModal
          item={resolveItem}
          onClose={() => setResolveItem(null)}
          onResolved={loadData}
        />
      )}
    </div>
  );
}
