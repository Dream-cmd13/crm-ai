import { toast } from 'react-hot-toast';
import React from 'react';
import { createPortal } from 'react-dom';
import { XCircle, CheckCircle2, ListTodo, Calendar as CalendarIcon, Edit, Target, Sparkles, Loader2, Users, Plus, RefreshCw } from 'lucide-react';
import { Customer, TodoTask, CustomerPersona, Contact } from '../../types';
import { cn } from '../../lib/utils';
import UniversalSelector from '../UniversalSelector';

interface PersonaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: CustomerPersona) => void;
  editingPersona: CustomerPersona | null;
  setEditingPersona: (p: CustomerPersona | null) => void;
}

export const PersonaEditModal = ({ isOpen, onClose, onSave, editingPersona, setEditingPersona }: PersonaEditModalProps) => {
  if (!isOpen || !editingPersona) return null;
  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            编辑客户画像
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">企业规模</label>
              <input type="text" value={editingPersona.scale} onChange={e => setEditingPersona({...editingPersona, scale: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主营产品</label>
              <input type="text" value={editingPersona.mainProducts} onChange={e => setEditingPersona({...editingPersona, mainProducts: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">核心痛点</label>
            <textarea value={editingPersona.painPoints} onChange={e => setEditingPersona({...editingPersona, painPoints: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">研发协同设计要求</label>
            <textarea value={editingPersona.rdRequirements} onChange={e => setEditingPersona({...editingPersona, rdRequirements: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">样品准入要求</label>
            <textarea value={editingPersona.sampleRequirements} onChange={e => setEditingPersona({...editingPersona, sampleRequirements: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">量产准入要求</label>
            <textarea value={editingPersona.productionRequirements} onChange={e => setEditingPersona({...editingPersona, productionRequirements: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">取消</button>
          <button onClick={() => onSave(editingPersona)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">保存修改</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface ContactEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingContact: Contact | null;
  setEditingContact: (c: Contact | null) => void;
}

export const ContactEditModal = ({ isOpen, onClose, onSave, editingContact, setEditingContact }: ContactEditModalProps) => {
  if (!isOpen || !editingContact) return null;
  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-600" />
            编辑联系人
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-xs font-bold text-gray-600 mb-3">基础信息</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">姓名</label>
              <input type="text" value={editingContact.name} onChange={e => setEditingContact({...editingContact, name: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">称呼</label>
              <input type="text" value={editingContact.appellation} onChange={e => setEditingContact({...editingContact, appellation: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">职务</label>
              <input type="text" value={editingContact.position} onChange={e => setEditingContact({...editingContact, position: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">内部决策权</label>
              <select value={editingContact.decisionPower} onChange={e => setEditingContact({...editingContact, decisionPower: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg">
                <option value="">请选择</option>
                <option value="核心决策者">核心决策者</option>
                <option value="技术评估者">技术评估者</option>
                <option value="商务执行者">商务执行者</option>
                <option value="内部影响者">内部影响者</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">电话</label>
              <input type="text" value={editingContact.phone} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">邮箱</label>
              <input type="email" value={editingContact.email} onChange={e => setEditingContact({...editingContact, email: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">微信号</label>
              <input type="text" value={editingContact.wechatId || ''} onChange={e => setEditingContact({...editingContact, wechatId: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">年龄</label>
              <input type="number" value={editingContact.age || ''} onChange={e => setEditingContact({...editingContact, age: Number(e.target.value)})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/40">
            <div className="text-xs font-bold text-gray-600 mb-3">个人画像</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">性格</label>
              <input type="text" value={editingContact.personality || ''} onChange={e => setEditingContact({...editingContact, personality: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">家庭情况</label>
              <input type="text" value={editingContact.familySituation || ''} onChange={e => setEditingContact({...editingContact, familySituation: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">籍贯</label>
              <input type="text" value={editingContact.hometown || ''} onChange={e => setEditingContact({...editingContact, hometown: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">爱好 (逗号分隔)</label>
              <input type="text" value={editingContact.hobbies?.join(',') || ''} onChange={e => setEditingContact({...editingContact, hobbies: e.target.value.split(',')})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
            </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-xs font-bold text-gray-600 mb-3">社媒账号与行为</div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">视频号账号/链接</label>
                <input type="text" value={editingContact.videoChannelProfile || ''} onChange={e => setEditingContact({...editingContact, videoChannelProfile: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">抖音账号/链接</label>
                <input type="text" value={editingContact.douyinProfile || ''} onChange={e => setEditingContact({...editingContact, douyinProfile: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">小红书账号/链接</label>
                <input type="text" value={editingContact.xiaohongshuProfile || ''} onChange={e => setEditingContact({...editingContact, xiaohongshuProfile: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">社媒行为摘要</label>
                <textarea value={editingContact.socialMediaBehavior || ''} onChange={e => setEditingContact({...editingContact, socialMediaBehavior: e.target.value})} className="w-full text-sm p-2 border border-gray-200 rounded-lg h-24 resize-none" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 bg-white">
            <div className="text-xs font-bold text-gray-600 mb-3">联系标记</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isPrimaryEdit" checked={editingContact.isPrimary} onChange={e => setEditingContact({...editingContact, isPrimary: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="isPrimaryEdit" className="text-sm text-gray-700">设为主联系人</label>
            </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">取消</button>
          <button onClick={onSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">保存修改</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: any;
  onUpdateMembers: (members: any[]) => void;
  customer?: Customer;
}

export const ManageMembersModal = ({ isOpen, onClose, chat, onUpdateMembers, customer }: ManageMembersModalProps) => {
  const [showMappingSelection, setShowMappingSelection] = React.useState<{userId: string, type: 'user' | 'contact'} | null>(null);

  if (!isOpen || !chat) return null;
  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              管理群成员 - {chat.name}
            </h3>
            <button 
              onClick={() => {
                toast.error('已根据全局映射关系同步群成员对照关系');
              }}
              className="mt-1 flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              同步全局映射
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {chat.members.map((member: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm overflow-hidden">
                    {member.wechatAvatar ? (
                      <img src={member.wechatAvatar} alt={member.wechatNickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      member.wechatNickname.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.wechatNickname}</p>
                    <p className="text-xs text-gray-500">ID: {member.wechatUserId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={member.mappedType || 'unmapped'} 
                    onChange={(e) => {
                      const newMembers = [...chat.members];
                      newMembers[i] = { ...member, mappedType: e.target.value, mappedId: '', mappedName: '' };
                      onUpdateMembers(newMembers);
                    }}
                    className="text-xs p-1 border border-gray-200 rounded"
                  >
                    <option value="unmapped">未映射</option>
                    <option value="contact">客户联系人</option>
                    <option value="user">内部员工</option>
                  </select>
                  
                  {member.mappedType === 'user' && (
                    <button
                      onClick={() => setShowMappingSelection({ userId: member.wechatUserId, type: 'user' })}
                      className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-50 text-indigo-600 font-medium"
                    >
                      {member.mappedName || '选择员工...'}
                    </button>
                  )}
                  {member.mappedType === 'contact' && (
                    <button
                      onClick={() => setShowMappingSelection({ userId: member.wechatUserId, type: 'contact' })}
                      className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-50 text-indigo-600 font-medium"
                    >
                      {member.mappedName || '选择联系人...'}
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      const newMembers = chat.members.filter((_: any, index: number) => index !== i);
                      onUpdateMembers(newMembers);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            邀请新成员
          </button>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">完成</button>
        </div>
      </div>

      {showMappingSelection && showMappingSelection.type === 'user' && (
        <UniversalSelector
          type="user"
          onSelect={(user) => {
            const newMembers = chat.members.map((m: any) => 
              m.wechatUserId === showMappingSelection.userId 
                ? { ...m, mappedId: user.id, mappedName: user.name }
                : m
            );
            onUpdateMembers(newMembers);
            setShowMappingSelection(null);
          }}
          onClose={() => setShowMappingSelection(null)}
        />
      )}

      {showMappingSelection && showMappingSelection.type === 'contact' && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
               <h3 className="text-lg font-bold text-gray-900">选择联系人</h3>
               <button onClick={() => setShowMappingSelection(null)} className="text-gray-400 hover:text-gray-600">
                 <XCircle className="w-5 h-5" />
               </button>
             </div>
             <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  {customer?.contacts && customer.contacts.length > 0 ? (
                    customer.contacts.map(contact => (
                      <button 
                        key={contact.id}
                        onClick={() => {
                          const newMembers = chat.members.map((m: any) => 
                            m.wechatUserId === showMappingSelection.userId 
                              ? { ...m, mappedId: contact.id, mappedName: contact.name }
                              : m
                          );
                          onUpdateMembers(newMembers);
                          setShowMappingSelection(null);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="font-medium text-sm">{contact.name}</div>
                        <div className="text-xs text-gray-500">{contact.position || '未知职务'}</div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">该客户暂无联系人，请先在客户详情中添加。</p>
                  )}
                </div>
             </div>
           </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
