import React, { useState } from 'react';
import { Role } from '../types';
import { mockCustomerFeedbacks } from '../data';
import { HeadphonesIcon, Search, Filter, MessageSquare, Phone, Mail, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface FeedbackProps {
  role: Role;
}

export default function Feedback({ role }: FeedbackProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('全部');

  const statuses = ['全部', '待处理', '处理中', '已解决'];

  const filteredFeedbacks = mockCustomerFeedbacks.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeStatus === '全部' || item.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户反馈闭环</h1>
          <p className="text-gray-500 mt-1">多渠道信息收集，智能归因与任务创建</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <HeadphonesIcon className="w-5 h-5" />
          录入反馈
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索反馈内容、客户名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeStatus === status
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFeedbacks.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.source === '微信' ? 'bg-emerald-100 text-emerald-600' :
                  item.source === '电话' ? 'bg-blue-100 text-blue-600' :
                  item.source === '邮件' ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.source === '微信' ? <MessageSquare className="w-5 h-5" /> :
                   item.source === '电话' ? <Phone className="w-5 h-5" /> :
                   item.source === '邮件' ? <Mail className="w-5 h-5" /> :
                   <User className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{item.customerName}</h3>
                  <p className="text-xs text-gray-500">{item.createDate} · 来源: {item.source}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                item.status === '待处理' ? 'bg-rose-50 text-rose-700' :
                item.status === '处理中' ? 'bg-amber-50 text-amber-700' :
                'bg-emerald-50 text-emerald-700'
              }`}>
                {item.status === '待处理' ? <AlertCircle className="w-3 h-3" /> :
                 item.status === '处理中' ? <Clock className="w-3 h-3" /> :
                 <CheckCircle2 className="w-3 h-3" />}
                {item.status}
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl mb-4 text-sm text-gray-700 border border-gray-100">
              "{item.content}"
            </div>
            
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-900">关联项目:</span>
                <span className="text-indigo-600 hover:underline cursor-pointer">{item.projectId || '无'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-900">责任部门:</span>
                <span>{item.department || '未分配'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-900">处理人:</span>
                <span>{item.assignee || '未分配'}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                查看详情
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                处理反馈
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
