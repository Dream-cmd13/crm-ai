import { TodoTask } from '../types';
import { fetchArchitectureDataFromSupabase } from './architectureRepository';
import { saveTasksSnapshotToSupabase } from './taskRepository';
import { fetchTaskTypeConfigFromSupabase } from './taskTypeConfigRepository';
import { decodeSopTriggerRule, matchSopTriggerRule } from './sopTrigger';

const today = () => new Date().toISOString().split('T')[0];

const addDays = (date: string, days: number) => {
  const base = date ? new Date(date) : new Date();
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const loadTaskTypes = async () => {
  try {
    return await fetchTaskTypeConfigFromSupabase([]);
  } catch {
    return [];
  }
};

const matchCondition = (cond: any, ctx: { customerLevel?: string }) => {
  const fieldId = String(cond?.fieldId || '');
  const op = String(cond?.operator || 'equals');
  const value = String(cond?.value || '');
  if (!fieldId) return false;

  if (fieldId === 'customer_level') {
    const left = String(ctx.customerLevel || '');
    if (op === 'equals') return left === value;
    if (op === 'contains') return left.includes(value);
    return false;
  }

  return false;
};

const resolveHoursForTask = async (taskTypeName: string, ctx: { customerLevel?: string }) => {
  const types = await loadTaskTypes();
  const type = types.find((t: any) => String(t?.name || '') === taskTypeName);
  if (!type) return null;
  const rules = Array.isArray(type.responseTimeRules) ? type.responseTimeRules : [];
  for (const rule of rules) {
    const conds = Array.isArray(rule?.condition) ? rule.condition : [];
    if (conds.length === 0) continue;
    if (conds.every((c: any) => matchCondition(c, ctx))) {
      const hours = Number(rule?.hours);
      if (Number.isFinite(hours) && hours > 0) return hours;
    }
  }
  const fallback = Number(type.defaultHours);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
};

const getObjectKey = (sourceType: TodoTask['sourceType']) => {
  if (sourceType === 'inquiry') return 'crm_inquiry';
  if (sourceType === 'lead') return 'crm_lead';
  if (sourceType === 'opportunity') return 'crm_opportunity';
  if (sourceType === 'project') return 'crm_project';
  if (sourceType === 'quotation') return 'crm_quotation';
  if (sourceType === 'order') return 'crm_sales_order';
  if (sourceType === 'sample') return 'crm_sample_order';
  if (sourceType === 'return') return 'crm_return_order';
  return '';
};

const normalizeObjectCode = (code?: string) =>
  String(code || '')
    .replace(/^crm_/i, '')
    .replace(/^ba_/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const shouldTriggerFlow = (
  flow: any,
  record: any,
  options?: { event?: 'create' | 'save'; previousRecord?: any }
) => {
  const rule = decodeSopTriggerRule(flow?.triggerType, flow?.triggerCondition);
  return matchSopTriggerRule(rule, record || {}, {
    event: options?.event || 'create',
    previousRecord: options?.previousRecord || {}
  });
};

const stageTaskTypeBySource: Record<string, string> = {
  inquiry: '询盘处理',
  lead: '线索跟进',
  opportunity: '商机推进',
  project: '项目跟进',
  quotation: '报价跟进',
  order: '订单跟进',
  sample: '样品跟进',
  return: '售后跟进'
};

const getRecordField = (record: any, fieldCode?: string) => {
  const key = String(fieldCode || '').trim();
  if (!key) return '';
  const value = record?.[key];
  return value === null || value === undefined ? '' : String(value);
};

const applyTaskFieldMappings = (
  task: TodoTask,
  mappings: Array<{ taskField?: string; sourceField?: string }>,
  record: any
) => {
  let next = { ...task };
  mappings.forEach((mapping) => {
    const taskField = String(mapping?.taskField || '').trim();
    const sourceField = String(mapping?.sourceField || '').trim();
    if (!taskField || !sourceField) return;
    const value = getRecordField(record, sourceField);
    if (!value) return;
    if (taskField === 'task.title') next = { ...next, title: value };
    if (taskField === 'task.description') next = { ...next, description: value };
    if (taskField === 'task.taskType') next = { ...next, taskType: value };
    if (taskField === 'task.assigneeName') next = { ...next, assignee: value, assigneeName: value };
    if (taskField === 'task.dueDate') next = { ...next, dueDate: value };
    if (taskField === 'task.importance' && ['高', '中', '低'].includes(value)) next = { ...next, importance: value as any };
    if (taskField === 'task.urgency' && ['紧急', '正常', '暂缓'].includes(value)) next = { ...next, urgency: value as any };
  });
  return next;
};

const resolveTaskCustomer = (record: any) => {
  return {
    customerId: String(record?.customerId || record?.associatedCustomerId || '').trim(),
    customerName: String(record?.customerName || record?.companyName || '').trim()
  };
};

const resolveTaskAssignee = (
  creatorId: string,
  creatorName: string
) => {
  return { assigneeId: creatorId, assigneeName: creatorName };
};

const buildSopBlocks = (nodes: any[]) => {
  return (nodes || [])
    .map((node, idx) => {
      const manual = node?.manualConfig || {};
      const automatic = node?.automaticConfig || {};
      return {
        id: String(node?.id || `node_${idx + 1}`),
        name: String(node?.name || `块${idx + 1}`),
        goal:
          String(manual?.stageOutput || manual?.output || '').trim() ||
          String(node?.description || node?.name || '').trim(),
        blockPrompt:
          String(manual?.aiConfig?.promptTemplate || '').trim() ||
          String(automatic?.promptTemplate || '').trim(),
        taskCanvas: [],
        oqarAssist: null
      };
    });
};

export const triggerAutoFlowsForCreate = async (
  sourceType: TodoTask['sourceType'],
  record: any,
  currentUser?: { id: string; name: string },
  options?: { event?: 'create' | 'save'; previousRecord?: any }
) => {
  const objectKey = getObjectKey(sourceType);
  if (!objectKey) return;

  const { objects } = await fetchArchitectureDataFromSupabase();
  const objectNorm = normalizeObjectCode(objectKey);
  const obj =
    objects.find((o) => normalizeObjectCode(o.code) === objectNorm) ||
    objects.find((o) => normalizeObjectCode(o.name) === objectNorm);
  if (!obj) return;

  const flows = (obj.flows || []).filter((f) =>
    shouldTriggerFlow(f, record, { event: options?.event || 'create', previousRecord: options?.previousRecord })
  );
  if (flows.length === 0) return;

  const creatorId = String(currentUser?.id || 'EMP001');
  const creatorName = String(currentUser?.name || '系统管理员');

  const createdTasks: TodoTask[] = [];
  for (const flow of flows) {
    const taskCfg = flow?.sopTaskConfig || {};
    if (taskCfg?.enabled === false) continue;
    const taskType = String(taskCfg?.taskType || stageTaskTypeBySource[sourceType] || '普通任务');
    const { assigneeId, assigneeName } = resolveTaskAssignee(creatorId, creatorName);
    const { customerId, customerName } = resolveTaskCustomer(record);
    const customerLevel = String(record?.customerLevel || record?.customer_level || record?.level || '').trim() || undefined;
    const hours = await resolveHoursForTask(taskType, { customerLevel });
    const dueDays = hours ? Math.max(1, Math.floor(hours / 24)) : 3;
    const dueDate = addDays(today(), dueDays);
    const titleTemplate = String(taskCfg?.titleTemplate || '[SOP] {{sopName}} - {{customerName}}');
    const descTemplate = String(taskCfg?.descriptionTemplate || '请按SOP模板完成阶段目标推进。');
    const title = titleTemplate
      .replace('{{sopName}}', String(flow?.name || 'SOP模板'))
      .replace('{{customerName}}', String(customerName || '客户'));
    const description = descTemplate
      .replace('{{sopName}}', String(flow?.name || 'SOP模板'))
      .replace('{{customerName}}', String(customerName || '客户'));
    let task: TodoTask = {
      id: crypto.randomUUID(),
      title,
      description,
      status: '待办',
      importance: '中',
      urgency: '正常',
      assignee: assigneeName,
      assigneeId,
      assigneeName,
      dueDate,
      createDate: today(),
      creatorId,
      creatorNo: 'system',
      creatorName,
      taskType,
      sourceType,
      sourceId: record?.id || '',
      associatedCustomerId: customerId,
      associatedCustomerName: customerName,
      originatingFlowId: flow.id,
      originatingFlowName: flow.name,
      originatingOntologyName: obj.name,
      auxiliaryData: {
        sopTemplateId: flow.id,
        sopTemplateName: flow.name,
        sopTaskConfig: taskCfg,
        sopTaskFieldMappings: Array.isArray(taskCfg?.fieldMappings) ? taskCfg.fieldMappings : [],
        sopOqarConfig: flow?.sopOqarConfig || null,
        sopPromptConfig: flow?.sopPromptConfig || null,
        progressionCheckConfig: flow?.progressionCheck || null,
        sourceSnapshot: record || null,
        sopBlocks: buildSopBlocks(flow?.nodes || [])
      }
    };
    task = applyTaskFieldMappings(
      task,
      Array.isArray(taskCfg?.fieldMappings) ? taskCfg.fieldMappings : [],
      record
    );
    createdTasks.push(task);
  }

  if (createdTasks.length === 0) return;
  await saveTasksSnapshotToSupabase(createdTasks, 'task_center');
};
