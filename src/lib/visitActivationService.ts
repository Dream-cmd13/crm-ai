import { CustomerType, TodoTask } from '../types';
import { ActivationTaskTemplate, VisitActivationConfig } from './visitActivationConfigRepository';

export type ActivationCandidate = {
  customer: any;
  group: '潜在客户' | '正式客户';
  customerType?: CustomerType;
  thresholdDays: number;
  daysSinceLastContact: number;
  lastContactTime?: string;
};

const msPerDay = 24 * 60 * 60 * 1000;

const toDate = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveCustomerType = (customer: any, types: CustomerType[]) => {
  const code = String(customer?.customerType || customer?.customer_type || '').trim();
  if (!code) return null;
  return types.find((t) => t.id === code || t.name === code) || null;
};

const resolveGroup = (customer: any, type?: CustomerType | null): '潜在客户' | '正式客户' => {
  const typeName = String(type?.name || customer?.customerType || customer?.customer_type || '').trim();
  if (typeName.includes('潜在')) return '潜在客户';
  return String(customer?.level || '').trim() === '潜在客户' ? '潜在客户' : '正式客户';
};

const resolveThreshold = (customer: any, type: CustomerType | null, group: '潜在客户' | '正式客户', config: VisitActivationConfig) => {
  const typeId = type?.id || String(customer?.customerType || customer?.customer_type || '').trim() || undefined;
  const isPotential = group === '潜在客户';
  const flowRuleMatched = (config.flows || []).find((flow: any) => {
    const typeMatched = !flow.customerTypeId || flow.customerTypeId === typeId;
    const potentialMatched = typeof flow.isPotential !== 'boolean' || flow.isPotential === isPotential;
    return typeMatched && potentialMatched;
  });
  if (Number(flowRuleMatched?.inactiveDays || 0) > 0) return Number(flowRuleMatched.inactiveDays);
  const matchedRule = (config.thresholdRules || []).find((rule) => {
    const typeMatched = !rule.customerTypeId || rule.customerTypeId === typeId;
    const potentialMatched = typeof rule.isPotential !== 'boolean' || rule.isPotential === isPotential;
    return typeMatched && potentialMatched;
  });
  if (matchedRule?.inactiveDays) return matchedRule.inactiveDays;
  const v = Number(type?.inactiveDays || 0);
  if (Number.isFinite(v) && v > 0) return v;
  return Number(config.defaultInactiveDays || 30) || 30;
};

export const buildActivationCandidates = (
  customers: any[],
  customerTypes: CustomerType[],
  config: VisitActivationConfig,
  now: Date = new Date()
) => {
  const all = (customers || []).map((customer) => {
    const type = resolveCustomerType(customer, customerTypes);
    const group = resolveGroup(customer, type);
    const thresholdDays = resolveThreshold(customer, type, group, config);
    const lastContactTime = String(customer?.lastContactTime || customer?.lastVisitDate || customer?.createDate || '').trim();
    const lastDate = toDate(lastContactTime);
    const daysSinceLastContact = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / msPerDay) : thresholdDays + 1;
    return {
      customer,
      group,
      customerType: type || undefined,
      thresholdDays,
      daysSinceLastContact,
      lastContactTime
    } as ActivationCandidate;
  });

  return all.filter((item) => item.daysSinceLastContact >= item.thresholdDays);
};

export const groupActivationCandidates = (candidates: ActivationCandidate[]) => ({
  potential: candidates.filter((c) => c.group === '潜在客户'),
  formal: candidates.filter((c) => c.group === '正式客户')
});

export const resolveActivationTemplate = async (
  customerTypeId: string | undefined,
  config: VisitActivationConfig,
  isPotential?: boolean
): Promise<ActivationTaskTemplate> => {
  const flowRuleMatched = (config.flows || []).find((f) => {
    const typeMatched = !f.customerTypeId || f.customerTypeId === customerTypeId;
    const potentialMatched = typeof f.isPotential !== 'boolean' || f.isPotential === isPotential;
    return typeMatched && potentialMatched;
  });
  if (flowRuleMatched && Array.isArray(flowRuleMatched.nodes) && flowRuleMatched.nodes.length > 0) {
    return {
      title: flowRuleMatched.name,
      description: flowRuleMatched.description || '客户激活流程任务',
      objectives: flowRuleMatched.nodes.map((node, idx) => ({ id: node.id || `obj_${idx + 1}`, title: node.name }))
    };
  }
  const template = customerTypeId ? config.templatesByType?.[customerTypeId] : null;
  if (template?.title && Array.isArray(template.objectives) && template.objectives.length > 0) {
    return template;
  }
  return config.defaultTemplate;
};

export const buildActivationTask = (
  candidate: ActivationCandidate,
  template: ActivationTaskTemplate,
  assignee: string = '系统'
): TodoTask => {
  const now = new Date();
  const due = new Date(now.getTime() + 3 * msPerDay);
  return {
    id: `ACT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: template.title,
    description: `${template.description}\n客户：${candidate.customer?.name || ''}\n沉睡天数：${candidate.daysSinceLastContact}天`,
    status: '待办',
    dueDate: due.toISOString().slice(0, 10),
    assignee,
    taskType: '客户激活',
    sourceType: 'customer',
    sourceId: candidate.customer?.id,
    associatedCustomerId: candidate.customer?.id,
    associatedCustomerName: candidate.customer?.name,
    createDate: now.toISOString().slice(0, 10),
    creatorId: 'system',
    creatorNo: 'system',
    creatorName: '系统',
    objectives: template.objectives.map((o, idx) => ({
      id: o.id || `obj_${idx + 1}`,
      title: o.title,
      completed: false,
      feedback: ''
    }))
  } as any;
};
