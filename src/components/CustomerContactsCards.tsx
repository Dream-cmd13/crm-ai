import React from 'react';
import { Mail, Phone, Plus, MessageSquare, Sparkles, MapPin, Edit, CalendarClock } from 'lucide-react';
import { Contact } from '../types';

interface CustomerContactsCardsProps {
  contacts: Contact[];
  onAddContact?: () => void;
  onEditContact?: (contact: Contact) => void;
  onVisitContact?: (contact: Contact) => void;
  onPickForArchitecture?: (contact: Contact) => void;
  onAnalyzeContact?: (contactId: string) => void;
  analyzingContactId?: string | null;
  visitRecords?: string[];
}

export default function CustomerContactsCards({
  contacts,
  onAddContact,
  onEditContact,
  onVisitContact,
  onPickForArchitecture,
  onAnalyzeContact,
  analyzingContactId,
  visitRecords = []
}: CustomerContactsCardsProps) {
  const attitudeStyle = (attitude?: string) => {
    if (attitude === '积极推进') return 'bg-emerald-100 text-emerald-700';
    if (attitude === '正面评价') return 'bg-blue-100 text-blue-700';
    if (attitude === '反对者') return 'bg-rose-100 text-rose-700';
    return 'bg-gray-100 text-gray-700';
  };

  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const roots = contacts.filter((c) => !c.managerContactId || !contactMap.has(c.managerContactId));
  const childrenMap = contacts.reduce<Record<string, Contact[]>>((acc, item) => {
    if (!item.managerContactId) return acc;
    if (!acc[item.managerContactId]) acc[item.managerContactId] = [];
    acc[item.managerContactId].push(item);
    return acc;
  }, {});

  const renderOrgNode = (contact: Contact, level = 0): React.ReactNode => (
    <div key={`org_${contact.id}`} className="space-y-1">
      <div className="flex items-center gap-2 text-sm" style={{ paddingLeft: `${level * 18}px` }}>
        <span className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="font-medium text-gray-900">{contact.name}</span>
        <span className="text-gray-500">{contact.position || '联系人'}</span>
        <span className={`px-2 py-0.5 rounded text-xs ${attitudeStyle(contact.attitudeToUs)}`}>{contact.attitudeToUs || '中性评价'}</span>
        {contact.faction && <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">派系:{contact.faction}</span>}
      </div>
      {(childrenMap[contact.id] || []).map((child) => renderOrgNode(child, level + 1))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <h4 className="text-sm font-bold text-gray-700">联系人列表</h4>
        {onAddContact && (
          <button
            onClick={onAddContact}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新增联系人
          </button>
        )}
      </div>
      <div className="p-4 grid grid-cols-1 gap-4">
        {contacts.map((contact) => (
          <div key={contact.id} className="p-5 border border-indigo-100 rounded-2xl transition-colors bg-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-bold text-gray-900 text-2xl leading-none">{contact.name}</h5>
                    {contact.appellation && <span className="text-gray-500 text-lg">({contact.appellation})</span>}
                    {contact.isPrimary && <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">首要联系人</span>}
                  </div>
                  <p className="text-base font-semibold text-gray-700 mt-1">{contact.position || '联系人'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-xs font-bold text-gray-400 uppercase">内部决策权</span>
                  <span className={cn(
                    "text-sm font-bold",
                    contact.decisionPower === '核心决策者' ? 'text-rose-600' :
                    contact.decisionPower === '技术评估者' ? 'text-blue-600' :
                    contact.decisionPower === '商务执行者' ? 'text-amber-600' :
                    'text-gray-600'
                  )}>
                    {contact.decisionPower || '未定义'}
                  </span>
                </div>
                {onEditContact && (
                  <button
                    onClick={() => onEditContact(contact)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold flex items-center gap-2 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                )}
                {onVisitContact && (
                  <button
                    onClick={() => onVisitContact(contact)}
                    className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold flex items-center gap-2 hover:bg-indigo-100"
                  >
                    <MapPin className="w-4 h-4" />
                    发起任务
                  </button>
                )}
                {onPickForArchitecture && (
                  <button
                    onClick={() => onPickForArchitecture(contact)}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-bold flex items-center gap-2 hover:bg-emerald-100"
                  >
                    <Plus className="w-4 h-4" />
                    带入架构
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-base text-gray-800">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {contact.phone || '-'}
                </div>
                <div className="flex items-center gap-2 text-base text-gray-800">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {contact.email || '-'}
                </div>
                <div className="flex items-center gap-2 text-base text-gray-800">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    {contact.wechatId || '-'}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs ${attitudeStyle(contact.attitudeToUs)}`}>{contact.attitudeToUs || '中性评价'}</span>
                  {contact.faction && <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">派系:{contact.faction}</span>}
                  {contact.managerContactId && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      上级:{contacts.find((c) => c.id === contact.managerContactId)?.name || contact.managerContactId}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-l border-gray-100 pl-8">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">年龄: </span>
                    <span className="text-gray-700">{contact.age || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">性格: </span>
                    <span className="text-gray-700">{contact.personality || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">籍贯: </span>
                    <span className="text-gray-700">{contact.hometown || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">家庭情况: </span>
                    <span className="text-gray-700">{contact.familySituation || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">爱好: </span>
                    <span className="text-gray-700">{contact.hobbies?.filter(h => h.trim()).join(', ') || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Section */}
            {(contact.videoChannelProfile || contact.douyinProfile || contact.xiaohongshuProfile || contact.socialMediaBehavior) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">社媒画像与行为</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                  {contact.videoChannelProfile && (
                    <div className="text-xs">
                      <span className="text-gray-500">视频号: </span>
                      <span className="text-indigo-600 truncate block">{contact.videoChannelProfile}</span>
                    </div>
                  )}
                  {contact.douyinProfile && (
                    <div className="text-xs">
                      <span className="text-gray-500">抖音: </span>
                      <span className="text-indigo-600 truncate block">{contact.douyinProfile}</span>
                    </div>
                  )}
                  {contact.xiaohongshuProfile && (
                    <div className="text-xs">
                      <span className="text-gray-500">小红书: </span>
                      <span className="text-indigo-600 truncate block">{contact.xiaohongshuProfile}</span>
                    </div>
                  )}
                </div>
                {contact.socialMediaBehavior && (
                  <p className="text-xs text-gray-600 italic">“{contact.socialMediaBehavior}”</p>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <h6 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  AI 拜访与交往建议
                </h6>
                {onAnalyzeContact && (
                  <button
                    onClick={() => onAnalyzeContact(contact.id)}
                  className="text-indigo-600 text-base font-bold hover:text-indigo-700"
                  >
                    {analyzingContactId === contact.id ? '分析中...' : 'AI 分析'}
                  </button>
                )}
              </div>
              <p className="text-base italic text-gray-400 mt-3">
                {contact.iceBreakingScript || contact.appointmentScript || '点击 "AI 分析" 获取基于联系人画像和历史拜访记录的专属交往建议。'}
              </p>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <h6 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-indigo-500" />
                历史拜访记录
              </h6>
              <button
                type="button"
                className="w-full mt-4 px-4 py-3 rounded-2xl bg-indigo-50 text-indigo-600 text-lg font-bold border border-indigo-100 hover:bg-indigo-100"
              >
                <Sparkles className="inline-block w-5 h-5 mr-1" />
                提取沟通记录并定位盲点
              </button>
              <p className="text-lg text-gray-400 mt-3">
                {visitRecords[0] || '点击自动分析提取该联系人的历史拜访发言'}
              </p>
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400 border border-dashed rounded-xl">
            暂无联系人数据
          </div>
        )}
      </div>
      {contacts.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50/40">
          <h4 className="text-sm font-bold text-gray-700 mb-2">组织架构图（简版）</h4>
          <div className="space-y-1">
            {roots.map((root) => renderOrgNode(root))}
          </div>
        </div>
      )}
    </div>
  );
}
