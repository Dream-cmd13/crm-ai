import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Users, Building2, User, Plus, Save } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function SystemWechatQuery() {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddIndividual, setShowAddIndividual] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [indForm, setIndForm] = useState<{ my_wechat_id: string; peer_wechat_id: string; customer_id?: string; contact_id?: string }>({
    my_wechat_id: '',
    peer_wechat_id: '',
    customer_id: '',
    contact_id: ''
  });
  const [grpForm, setGrpForm] = useState<{ group_id: string; group_name: string; customer_id?: string }>({
    group_id: '',
    group_name: '',
    customer_id: ''
  });
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindMode, setBindMode] = useState<'individual' | 'group'>('individual');
  const [bindTargetId, setBindTargetId] = useState('');
  const [bindCustomerId, setBindCustomerId] = useState('');
  const [bindContactId, setBindContactId] = useState('');
  
  // Mocks for fallback
  const [individualChats, setIndividualChats] = useState([
    { id: '1', my_wechat_id: 'sales_001', peer_wechat_id: 'client_A', customer_name: 'Tech Corp', contact_name: 'John Doe' },
    { id: '2', my_wechat_id: 'sales_002', peer_wechat_id: 'client_B', customer_name: 'Global Inc', contact_name: 'Jane Smith' },
  ]);

  const [groupChats, setGroupChats] = useState([
    { id: 'g1', group_name: 'Tech Corp VIP Support', group_id: 'wx_grp_123', customer_name: 'Tech Corp', member_count: 5 },
    { id: 'g2', group_name: 'Global Inc Project Sync', group_id: 'wx_grp_456', customer_name: 'Global Inc', member_count: 8 },
  ]);

  const fetchChats = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    try {
      // 真实查询：通过customer_id和contact_id关联客户表（如果是真实的连表查询，这里简化处理）
      const { data: indData } = await supabase.from('crm_wechat_session').select('*');
      if (indData) setIndividualChats(indData as any);
      
      const { data: grpData } = await supabase.from('crm_wechat_group').select('*');
      if (grpData) setGroupChats(grpData as any);
    } catch (e) {
      console.error(e);
      toast.error('微信会话表未找到，请先执行最新 init 脚本');
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const saveIndividualToDb = async () => {
    if (!isSupabaseConfigured()) return;
    if (!indForm.my_wechat_id.trim() || !indForm.peer_wechat_id.trim()) return;
    const supabase = getSupabaseClient();
    try {
      const payload: any = {
        my_wechat_id: indForm.my_wechat_id.trim(),
        peer_wechat_id: indForm.peer_wechat_id.trim()
      };
      if (indForm.customer_id) payload.customer_id = indForm.customer_id.trim();
      if (indForm.contact_id) payload.contact_id = indForm.contact_id.trim();
      const { error } = await supabase
        .from('crm_wechat_session')
        .upsert(payload, { onConflict: 'my_wechat_id,peer_wechat_id' });
      if (error) throw error;
      setShowAddIndividual(false);
      setIndForm({ my_wechat_id: '', peer_wechat_id: '', customer_id: '', contact_id: '' });
      await fetchChats();
    } catch (e) {
      console.error(e);
      toast.error('个人会话落库失败，请确认已执行最新 init 脚本');
    }
  };

  const saveGroupToDb = async () => {
    if (!isSupabaseConfigured()) return;
    if (!grpForm.group_id.trim() || !grpForm.group_name.trim()) return;
    const supabase = getSupabaseClient();
    try {
      const payload: any = {
        group_id: grpForm.group_id.trim(),
        group_name: grpForm.group_name.trim()
      };
      if (grpForm.customer_id) payload.customer_id = grpForm.customer_id.trim();
      const { error } = await supabase
        .from('crm_wechat_group')
        .upsert(payload, { onConflict: 'group_id' });
      if (error) throw error;
      setShowAddGroup(false);
      setGrpForm({ group_id: '', group_name: '', customer_id: '' });
      await fetchChats();
    } catch (e) {
      console.error(e);
      toast.error('群聊会话落库失败，请确认已执行最新 init 脚本');
    }
  };

  const openBindModal = (mode: 'individual' | 'group', row: any) => {
    setBindMode(mode);
    setBindTargetId(String(row?.id || ''));
    setBindCustomerId(String(row?.customer_id || ''));
    setBindContactId(String(row?.contact_id || ''));
    setShowBindModal(true);
  };

  const saveBinding = async () => {
    if (!isSupabaseConfigured()) return;
    if (!bindTargetId || !bindCustomerId.trim()) {
      toast.error('请填写客户ID');
      return;
    }
    try {
      const supabase = getSupabaseClient();
      if (bindMode === 'individual') {
        const { error } = await supabase
          .from('crm_wechat_session')
          .update({ customer_id: bindCustomerId.trim(), contact_id: bindContactId.trim() || null })
          .eq('id', bindTargetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_wechat_group')
          .update({ customer_id: bindCustomerId.trim() })
          .eq('id', bindTargetId);
        if (error) throw error;
      }
      setShowBindModal(false);
      await fetchChats();
      toast.success('绑定成功');
    } catch (e) {
      console.error(e);
      toast.error('绑定失败，请确认会话表存在并且有写权限');
    }
  };

  const filteredIndividuals = individualChats.filter(c => 
    c.peer_wechat_id.includes(searchQuery) || 
    c.my_wechat_id.includes(searchQuery) || 
    c.customer_name?.includes(searchQuery)
  );

  const filteredGroups = groupChats.filter(c => 
    c.group_name.includes(searchQuery) || 
    c.group_id.includes(searchQuery) || 
    c.customer_name?.includes(searchQuery)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 min-h-[500px]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            微信会话查询
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            查询系统内同步的微信个人会话及群聊会话，并查看关联的客户。
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'individual' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('individual')}
          >
            个人会话
          </button>
          <button 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'group' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('group')}
          >
            群聊会话
          </button>
        </div>
        
        <div className="relative w-64">
          <input
            type="text"
            placeholder="搜索微信号/群名/客户..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div />
        {activeTab === 'individual' ? (
          <button
            onClick={() => setShowAddIndividual(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
          >
            <Plus className="w-3.5 h-3.5" /> 新增个人会话（落库）
          </button>
        ) : (
          <button
            onClick={() => setShowAddGroup(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded bg-green-50 hover:bg-green-100"
          >
            <Plus className="w-3.5 h-3.5" /> 新增群聊会话（落库）
          </button>
        )}
      </div>

      {showAddIndividual && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
          <div className="text-sm font-bold text-green-800">新增个人会话</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">我的微信号</label>
              <input value={indForm.my_wechat_id} onChange={(e) => setIndForm({ ...indForm, my_wechat_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">对方微信号</label>
              <input value={indForm.peer_wechat_id} onChange={(e) => setIndForm({ ...indForm, peer_wechat_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户ID（可选）</label>
              <input value={indForm.customer_id || ''} onChange={(e) => setIndForm({ ...indForm, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">联系人ID（可选）</label>
              <input value={indForm.contact_id || ''} onChange={(e) => setIndForm({ ...indForm, contact_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveIndividualToDb} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded">
              <Save className="w-3.5 h-3.5" /> 保存
            </button>
            <button onClick={() => setShowAddIndividual(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
          </div>
        </div>
      )}

      {showAddGroup && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-3">
          <div className="text-sm font-bold text-green-800">新增群聊会话</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">群ID</label>
              <input value={grpForm.group_id} onChange={(e) => setGrpForm({ ...grpForm, group_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">群名称</label>
              <input value={grpForm.group_name} onChange={(e) => setGrpForm({ ...grpForm, group_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户ID（可选）</label>
              <input value={grpForm.customer_id || ''} onChange={(e) => setGrpForm({ ...grpForm, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveGroupToDb} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-green-600 text-white rounded">
              <Save className="w-3.5 h-3.5" /> 保存
            </button>
            <button onClick={() => setShowAddGroup(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {activeTab === 'individual' ? (
                <>
                  <th className="p-4 text-sm font-medium text-gray-500">我的微信号</th>
                  <th className="p-4 text-sm font-medium text-gray-500">对方微信号</th>
                  <th className="p-4 text-sm font-medium text-gray-500">匹配客户</th>
                  <th className="p-4 text-sm font-medium text-gray-500">匹配联系人</th>
                  <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                </>
              ) : (
                <>
                  <th className="p-4 text-sm font-medium text-gray-500">群ID</th>
                  <th className="p-4 text-sm font-medium text-gray-500">群名称</th>
                  <th className="p-4 text-sm font-medium text-gray-500">成员数</th>
                  <th className="p-4 text-sm font-medium text-gray-500">匹配客户</th>
                  <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {activeTab === 'individual' ? (
              filteredIndividuals.length > 0 ? filteredIndividuals.map(chat => (
                <tr key={chat.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-900 font-medium">{chat.my_wechat_id}</td>
                  <td className="p-4 text-sm text-gray-900">{chat.peer_wechat_id}</td>
                  <td className="p-4">
                    {chat.customer_name ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        {chat.customer_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">未匹配</span>
                    )}
                  </td>
                  <td className="p-4">
                    {chat.contact_name ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                        <User className="w-3.5 h-3.5" />
                        {chat.contact_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">未匹配</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openBindModal('individual', chat)}
                      className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded bg-white hover:bg-green-50"
                    >
                      绑定客户
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">暂无数据</td></tr>
              )
            ) : (
              filteredGroups.length > 0 ? filteredGroups.map(group => (
                <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-900 font-mono">{group.group_id}</td>
                  <td className="p-4 text-sm text-gray-900 font-medium">{group.group_name}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      {group.member_count}
                    </div>
                  </td>
                  <td className="p-4">
                    {group.customer_name ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        {group.customer_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">未匹配</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openBindModal('group', group)}
                      className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded bg-white hover:bg-green-50"
                    >
                      绑定客户
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 text-sm">暂无数据</td></tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {showBindModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4">
            <h4 className="text-base font-bold text-gray-900">{bindMode === 'individual' ? '绑定个人会话客户' : '绑定群聊会话客户'}</h4>
            <div>
              <label className="block text-xs text-gray-600 mb-1">客户ID（必填）</label>
              <input
                value={bindCustomerId}
                onChange={(e) => setBindCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="例如：CUST001"
              />
            </div>
            {bindMode === 'individual' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">联系人ID（可选）</label>
                <input
                  value={bindContactId}
                  onChange={(e) => setBindContactId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="例如：CON001"
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBindModal(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white">取消</button>
              <button onClick={saveBinding} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded">保存绑定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
