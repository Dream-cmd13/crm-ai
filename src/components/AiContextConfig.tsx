import React from 'react';
import { HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface AiContextSource {
  key: string;
  enabled: boolean;
  limit?: number;
}

export const AI_CONTEXT_OPTIONS = [
  { key: 'customer_name', param: '{custname}', label: '客户名称', hasLimit: false, example: '示例：特斯拉科技有限公司' },
  { key: 'customer_profile', param: '{profile}', label: '客户画像', hasLimit: false, example: '示例：\n【规模】500人\n【主要产品】新能源车\n【痛点】产能不足' },
  { key: 'contact_persona', param: '{contact_persona}', label: '联系人信息', hasLimit: false, example: '示例：\n张三（采购总监，态度+1，影响力4）\n李四（技术经理，态度0，影响力3）' },
  { key: 'project_solution', param: '{project_solution}', label: '项目方案', hasLimit: false, example: '示例：\n主推系列：SER001\n方案优势：交期与稳定性更优' },
  { key: 'email_records', param: '{email}', label: '邮件记录', hasLimit: true, defaultLimit: 2, example: '示例：\n[2026-04-18] 发件人: 张三\n内容: 确认采购意向，请提供报价单。' },
  { key: 'wechat_records', param: '{wechat}', label: '微信记录', hasLimit: true, defaultLimit: 10, example: '示例：\n[2026-04-17] 张三: 好的，合同收到了。' },
  { key: 'wechat_group_records', param: '{wechat_group}', label: '微信群聊记录', hasLimit: true, defaultLimit: 10, example: '示例：\n[2026-04-16] 李四 (项目沟通群): 进度已更新，请查看。' },
  { key: 'meeting_records', param: '{meeting}', label: '会议记录', hasLimit: true, defaultLimit: 10, example: '示例：\n[2026-04-15] 会议主题: 季度评审\n纪要: 确定了下一批交付时间。' },
  { key: 'chat_records', param: '{chat}', label: '系统聊天记录', hasLimit: true, defaultLimit: 10, example: '示例：\n[2026-04-14] 系统通知: 客户确认了订单。' },
  { key: 'customer_focus_archive', param: '{customer_focus_archive}', label: '客户关注点档案', hasLimit: false, example: '示例：\n关注点：交付稳定性\n关键联系人：王总\n我方优势：本地服务响应快' },
  { key: 'competitor_profile', param: '{competitor}', label: '竞品档案', hasLimit: false, example: '示例：\n【名称】竞品A\n【优势】交期快\n【劣势】定制化差' }
  ,
  { key: 'current_ontology_fields', param: '{current_fields}', label: '当前本体字段', hasLimit: false, example: '示例：\n【custname】XX公司\n【industry】新能源\n【level】A类客户' }
];

interface AiContextConfigProps {
  value: AiContextSource[];
  onChange: (next: AiContextSource[]) => void;
  allowedKeys?: string[];
}

export function AiContextConfig({ value, onChange, allowedKeys }: AiContextConfigProps) {
  const options = allowedKeys 
    ? AI_CONTEXT_OPTIONS.filter(opt => allowedKeys.includes(opt.key))
    : AI_CONTEXT_OPTIONS;

  const handleToggle = (opt: any, checked: boolean) => {
    if (checked) {
      onChange([...value, { key: opt.key, enabled: true, limit: opt.hasLimit ? opt.defaultLimit : undefined }]);
    } else {
      onChange(value.filter(v => v.key !== opt.key));
    }
  };

  const handleLimitChange = (optKey: string, newLimit: number) => {
    onChange(value.map(v => v.key === optKey ? { ...v, limit: newLimit } : v));
  };

  const showExample = (example: string, label: string) => {
    alert(`【${label}】数据示例：\n\n${example}`);
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const item = value.find(v => v.key === opt.key);
        const isEnabled = !!item?.enabled;

        return (
          <div key={opt.key} className={`flex items-center justify-between p-2 border rounded-lg text-sm transition-colors ${isEnabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleToggle(opt, e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="font-medium text-gray-700">{opt.label}</span>
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{opt.param}</span>
              <button
                type="button"
                onClick={() => showExample(opt.example, opt.label)}
                className="text-gray-400 hover:text-indigo-600 focus:outline-none"
                title="查看数据示例"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            
            {isEnabled && opt.hasLimit && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">提取条数:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={item.limit || opt.defaultLimit}
                  onChange={(e) => handleLimitChange(opt.key, parseInt(e.target.value, 10) || opt.defaultLimit)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
