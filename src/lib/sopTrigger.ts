export type SopTriggerMode = 'manual' | 'on_create' | 'on_approve' | 'on_field_change';

export interface SopTriggerRule {
  mode: SopTriggerMode;
  fieldCode?: string;
  expectedValue?: string;
}

const SOP_TRIGGER_PREFIX = '__sop_trigger__:';
const APPROVED_WORDS = ['已审核', '审核通过', '已通过', '通过', 'approved', 'pass'];

export const encodeSopTriggerRule = (rule: SopTriggerRule): string => {
  return `${SOP_TRIGGER_PREFIX}${JSON.stringify(rule)}`;
};

const parseRawJson = (text: string): any => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const decodeSopTriggerRule = (triggerType?: string, triggerCondition?: string): SopTriggerRule => {
  const type = String(triggerType || '').toLowerCase();
  const cond = String(triggerCondition || '').trim();
  if (type === 'button') return { mode: 'manual' };

  if (cond.startsWith(SOP_TRIGGER_PREFIX)) {
    const payload = parseRawJson(cond.slice(SOP_TRIGGER_PREFIX.length));
    const mode = String(payload?.mode || '') as SopTriggerMode;
    if (mode === 'on_create' || mode === 'on_approve' || mode === 'on_field_change' || mode === 'manual') {
      return {
        mode,
        fieldCode: String(payload?.fieldCode || '').trim() || undefined,
        expectedValue: String(payload?.expectedValue || '').trim() || undefined
      };
    }
  }

  const maybeJson = parseRawJson(cond);
  if (maybeJson && typeof maybeJson === 'object') {
    const mode = String(maybeJson?.mode || '') as SopTriggerMode;
    if (mode === 'on_create' || mode === 'on_approve' || mode === 'on_field_change' || mode === 'manual') {
      return {
        mode,
        fieldCode: String(maybeJson?.fieldCode || '').trim() || undefined,
        expectedValue: String(maybeJson?.expectedValue || '').trim() || undefined
      };
    }
  }

  const lower = cond.toLowerCase();
  if (['on_create', 'create', 'created', '创建', '新建', '新增后'].some((k) => lower.includes(k))) {
    return { mode: 'on_create' };
  }
  if (['审核后', '审核通过', 'approved', 'pass'].some((k) => lower.includes(k))) {
    return { mode: 'on_approve' };
  }

  if (type === 'auto') return { mode: 'on_create' };
  return { mode: 'manual' };
};

const isApprovedValue = (value: any) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return APPROVED_WORDS.some((word) => text.includes(word.toLowerCase()));
};

const getField = (record: Record<string, any> | undefined, key: string) => {
  if (!record) return '';
  const value = record[key];
  return value === null || value === undefined ? '' : String(value);
};

export const matchSopTriggerRule = (
  rule: SopTriggerRule,
  record: Record<string, any>,
  options?: { event?: 'view' | 'create' | 'save'; previousRecord?: Record<string, any> }
) => {
  const event = options?.event || 'view';
  const prev = options?.previousRecord || {};
  if (rule.mode === 'manual') return true;
  if (rule.mode === 'on_create') return event === 'create' || event === 'view';

  if (rule.mode === 'on_approve') {
    const currentApproved = ['audit_status', 'status', 'approval_status'].some((field) => isApprovedValue(record?.[field]));
    if (event === 'view') return currentApproved;
    const prevApproved = ['audit_status', 'status', 'approval_status'].some((field) => isApprovedValue(prev?.[field]));
    return currentApproved && !prevApproved;
  }

  if (rule.mode === 'on_field_change') {
    const fieldCode = String(rule.fieldCode || '').trim();
    if (!fieldCode) return false;
    const currentValue = getField(record, fieldCode);
    const expected = String(rule.expectedValue || '').trim();
    if (event === 'view') return expected ? currentValue === expected : true;
    const prevValue = getField(prev, fieldCode);
    const changed = prevValue !== currentValue;
    if (!changed) return false;
    return expected ? currentValue === expected : true;
  }

  return false;
};

