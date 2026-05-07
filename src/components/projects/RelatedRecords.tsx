import React from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface RelatedRecordsProps {
  projectId: string;
  opportunityId?: string;
  leadId?: string;
  inquiryId?: string;
  opportunityDisplay?: string;
  leadDisplay?: string;
  inquiryDisplay?: string;
  quotations: any[];
  orders: any[];
  sampleOrders: any[];
  returnOrders: any[];
  onNavigateTo: (view: string, params?: any) => void;
}

export const RelatedRecords: React.FC<RelatedRecordsProps> = ({ 
  projectId, opportunityId, leadId, inquiryId, opportunityDisplay, leadDisplay, inquiryDisplay, quotations, orders, sampleOrders, returnOrders, onNavigateTo 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <LinkIcon className="w-5 h-5 text-indigo-500" />
        关联业务记录
      </h3>
      <div className="space-y-4">
        {(inquiryId || leadId || opportunityId) && (
          <div className="pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2">上游记录</p>
            <div className="space-y-2">
              {inquiryId && (
                <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                  <span className="text-gray-600">关联询盘</span>
                  <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('inquiries', inquiryId)}>{inquiryDisplay || inquiryId}</span>
                </div>
              )}
              {leadId && (
                <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                  <span className="text-gray-600">关联线索</span>
                  <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('leads', leadId)}>{leadDisplay || leadId}</span>
                </div>
              )}
              {opportunityId && (
                <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg text-sm">
                  <span className="text-gray-600">关联商机</span>
                  <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('opportunities', opportunityId)}>{opportunityDisplay || opportunityId}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 mb-2">报价单 ({quotations.filter(q => q.projectId === projectId).length})</p>
          <div className="space-y-2">
            {quotations.filter(q => q.projectId === projectId).map(q => (
              <div key={q.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('sales', { tab: 'quotations', id: q.id })}>{q.quoteNo}</span>
                <span className="text-gray-500">¥{q.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">订单 ({orders.filter(o => o.projectId === projectId).length})</p>
          <div className="space-y-2">
            {orders.filter(o => o.projectId === projectId).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('sales', { tab: 'orders', id: o.id })}>{o.orderNo}</span>
                <span className="text-gray-500">¥{o.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">样品单 ({sampleOrders.filter(o => o.projectId === projectId).length})</p>
          <div className="space-y-2">
            {sampleOrders.filter(o => o.projectId === projectId).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('sample-orders', o.id)}>{o.sampleNo}</span>
                <span className="text-gray-500">¥{o.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">退货客诉单 ({returnOrders.filter(o => o.projectId === projectId).length})</p>
          <div className="space-y-2">
            {returnOrders.filter(o => o.projectId === projectId).map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <span className="font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => onNavigateTo('return-orders', o.id)}>{o.returnNo}</span>
                <span className="text-gray-500">{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
