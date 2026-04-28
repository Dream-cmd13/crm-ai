import React, { useEffect, useMemo, useState } from 'react';
import { UserX, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchCustomersModuleDataFromSupabase, saveVisitPlansSnapshotToSupabase } from '../lib/customerRepository';
import { fetchCustomerTypesFromSupabase } from '../lib/customerTypeRepository';
import { defaultVisitActivationConfig, fetchVisitActivationConfig } from '../lib/visitActivationConfigRepository';
import { buildActivationCandidates, buildActivationTask, groupActivationCandidates, resolveActivationTemplate, ActivationCandidate } from '../lib/visitActivationService';

export default function VisitPlanPool() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerTypes, setCustomerTypes] = useState<any[]>([]);
  const [activationConfig, setActivationConfig] = useState<any>(defaultVisitActivationConfig);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsBootstrapping(true);
      try {
        const [moduleData, types, config] = await Promise.all([
          fetchCustomersModuleDataFromSupabase(),
          fetchCustomerTypesFromSupabase(),
          fetchVisitActivationConfig()
        ]);
        setCustomers(moduleData.customers || []);
        setCustomerTypes(types || []);
        setActivationConfig(config || defaultVisitActivationConfig);
      } catch (error) {
        console.error(error);
        toast.error('加载激活池失败，请稍后重试');
      } finally {
        setIsBootstrapping(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const candidates = buildActivationCandidates(customers, customerTypes, activationConfig);
    return groupActivationCandidates(candidates);
  }, [customers, customerTypes, activationConfig]);

  const toggleCustomer = (candidate: ActivationCandidate, checked: boolean) => {
    const id = String(candidate.customer.id || '');
    if (!id) return;
    setSelectedCustomerIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id));
  };

  const handleGenerateTasks = async () => {
    const allCandidates = [...grouped.potential, ...grouped.formal];
    const selected = allCandidates.filter((c) => selectedCustomerIds.includes(String(c.customer.id || '')));
    if (selected.length === 0) {
      toast.error('请先选择客户');
      return;
    }
    try {
      const generated = await Promise.all(selected.map(async (candidate) => {
        const customerTypeId = candidate.customerType?.id || candidate.customer?.customerType || candidate.customer?.customer_type;
        const template = await resolveActivationTemplate(customerTypeId, activationConfig, candidate.group === '潜在客户');
        const task = buildActivationTask(candidate, template);
        return {
          ...task,
          dueDate: scheduleDate,
          taskType: '客户激活任务',
          sourceType: 'customer' as const,
          sourceId: candidate.customer?.id,
          associatedCustomerId: candidate.customer?.id,
          associatedCustomerName: candidate.customer?.name,
          description: `${template.description}\n客户：${candidate.customer?.name || ''}\n沉睡天数：${candidate.daysSinceLastContact}天`
        };
      }));
      await saveVisitPlansSnapshotToSupabase(generated as any);
      toast.success(`已生成 ${generated.length} 条客户激活任务`);
      setSelectedCustomerIds([]);
    } catch (error) {
      console.error(error);
      toast.error('批量生成激活任务失败');
    }
  };

  const totalCount = grouped.potential.length + grouped.formal.length;

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserX className="w-6 h-6 text-red-500" />
            客户激活任务池
          </h1>
          <p className="text-sm text-gray-500 mt-1">超过活跃阈值的客户会进入激活池，支持多选批量生成客户激活任务。</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button
            onClick={handleGenerateTasks}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4" />
            生成激活任务（{selectedCustomerIds.length}）
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-700">待激活客户列表（共 {totalCount}）</h2>
        {isBootstrapping ? (
          <div className="p-6 border border-gray-200 rounded-xl bg-white text-sm text-gray-500">加载中...</div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="text-xs font-bold text-orange-700">潜在客户 ({grouped.potential.length})</div>
              {grouped.potential.map((item) => (
                <label
                  key={item.customer.id}
                  className="p-4 border rounded-xl transition-colors border-gray-200 bg-white hover:border-indigo-300 flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(String(item.customer.id))}
                    onChange={(e) => toggleCustomer(item, e.target.checked)}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">{item.customer.name}</h3>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">沉睡 {item.daysSinceLastContact} 天</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">阈值: {item.thresholdDays} 天 | 类型: {item.customerType?.name || item.customer.customerType || item.customer.level || '未分类'}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="space-y-2 pt-3">
              <div className="text-xs font-bold text-blue-700">正式客户 ({grouped.formal.length})</div>
              {grouped.formal.map((item) => (
                <label
                  key={item.customer.id}
                  className="p-4 border rounded-xl transition-colors border-gray-200 bg-white hover:border-indigo-300 flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(String(item.customer.id))}
                    onChange={(e) => toggleCustomer(item, e.target.checked)}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">{item.customer.name}</h3>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">沉睡 {item.daysSinceLastContact} 天</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">阈值: {item.thresholdDays} 天 | 类型: {item.customerType?.name || item.customer.customerType || item.customer.level || '未分类'}</p>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
