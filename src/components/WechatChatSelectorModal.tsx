import React, { useState, useEffect } from 'react';
import { X, Search, Users, User, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import { GroupChat } from '../types';

interface WechatChatSelectorModalProps {
  mode: 'individual' | 'group';
  customerId: string;
  contacts: any[];
  onClose: () => void;
  onSelect: (chat: any) => void;
}

export default function WechatChatSelectorModal({ mode, customerId, contacts, onClose, onSelect }: WechatChatSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      if (!isSupabaseConfigured()) {
        setChats([]);
        setLoading(false);
        return;
      }
      
      const supabase = getSupabaseClient();
      try {
        if (mode === 'individual') {
          // 通过绑定表查找联系人关联的微信号，再查对应会话
          const contactIds = contacts.map(c => c.id).filter(Boolean);
          if (contactIds.length > 0) {
            const { data: bindings } = await supabase.from('crm_wechat_binding').select('wechat_id').eq('bind_type', 'contact').in('bind_id', contactIds);
            const wxids = (bindings || []).map((b: any) => b.wechat_id).filter(Boolean);
            if (wxids.length > 0) {
              const { data } = await supabase.from('crm_wechat_session').select('*').in('peer_wechat_id', wxids);
              setChats(data || []);
            } else {
              setChats([]);
            }
          } else {
            setChats([]);
          }
        } else {
          // 查未匹配客户ID的群聊
          const { data } = await supabase.from('crm_wechat_group').select('*').is('customer_id', null);
          setChats(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
  }, [mode, customerId, contacts]);

  const filtered = chats.filter(c => {
    const text = mode === 'individual' ? c.peer_wechat_id : c.group_name;
    return text?.includes(searchQuery);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            选择{mode === 'individual' ? '联系人会话' : '群聊会话'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          {mode === 'individual' && contacts.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">提示：联系人需在微信绑定管理中绑定微信号后才可关联会话。</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : filtered.length > 0 ? (
            filtered.map(chat => (
              <button
                key={chat.id}
                onClick={() => onSelect(chat)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    {mode === 'individual' ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {mode === 'individual' ? chat.peer_wechat_id : chat.group_name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                      {mode === 'individual' ? `我的微信: ${chat.my_wechat_id}` : `成员数: ${chat.member_count}`}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              {mode === 'individual' ? '没有找到关联的微信会话' : '没有未匹配的群聊'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
