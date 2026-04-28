import React, { useState } from 'react';
import { X, Search, UserPlus, UserMinus, Shield, ShieldAlert } from 'lucide-react';
import { GroupChat, WeChatUserMapping } from '../types';
import { cn } from '../lib/utils';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: GroupChat | null;
  onUpdateMembers: (members: WeChatUserMapping[]) => void;
}

export default function ManageMembersModal({ isOpen, onClose, chat, onUpdateMembers }: ManageMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !chat) return null;

  const filteredMembers = chat.members.filter(m => 
    m.wechatNickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.mappedName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRole = (memberId: string) => {
    const newMembers = chat.members.map(m => {
      if (m.wechatUserId === memberId) {
        return { ...m, mappedType: m.mappedType === 'contact' ? 'user' : 'contact' } as WeChatUserMapping;
      }
      return m;
    });
    onUpdateMembers(newMembers);
  };

  const removeMember = (memberId: string) => {
    const newMembers = chat.members.filter(m => m.wechatUserId !== memberId);
    onUpdateMembers(newMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">管理群成员</h3>
            <p className="text-sm text-gray-500 mt-1">{chat.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索成员昵称或实名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMembers.map((member) => (
            <div key={member.wechatUserId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {member.wechatNickname[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{member.wechatNickname}</span>
                    {member.mappedName && (
                      <span className="text-xs text-gray-400">({member.mappedName})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      member.mappedType === 'user' ? "bg-indigo-100 text-indigo-700" :
                      member.mappedType === 'contact' ? "bg-emerald-100 text-emerald-700" :
                      "bg-gray-100 text-gray-500"
                    )}>
                      {member.mappedType === 'user' ? '内部员工' : 
                       member.mappedType === 'contact' ? '客户联系人' : '未关联'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => toggleRole(member.wechatUserId)}
                  className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-indigo-600 transition-all"
                  title="切换身份"
                >
                  {member.mappedType === 'user' ? <ShieldAlert className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => removeMember(member.wechatUserId)}
                  className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-rose-600 transition-all"
                  title="移除成员"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            邀请新成员
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
