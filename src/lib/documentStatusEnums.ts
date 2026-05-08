export type StatusTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

type StatusOption = {
  value: string;
  label: string;
  tone: StatusTone;
};

const QUOTATION_STATUS_OPTIONS: StatusOption[] = [
  { value: 'manual_quotation', label: '手动报价', tone: 'info' },
  { value: 'quotation_complete', label: '报价完成', tone: 'success' },
  { value: 'terminated', label: '已终止', tone: 'danger' },
  { value: 'timeout_cancellation', label: '超时取消', tone: 'warning' },
  { value: 'user_cancelled', label: '用户取消', tone: 'warning' }
];

const SALES_ORDER_STATUS_OPTIONS: StatusOption[] = [
  { value: 'not_submit', label: '未提交', tone: 'info' },
  { value: 'un_paid', label: '待付款', tone: 'warning' },
  { value: 'partial_payment', label: '部分付款', tone: 'warning' },
  { value: 'monthly_paid_audit', label: '月结审核中', tone: 'info' },
  { value: 'monthly_paid_audit_failed', label: '月结审核失败', tone: 'danger' },
  { value: 'offline_payment_audit', label: '线下付款审核中', tone: 'info' },
  { value: 'offline_payment_audit_failed', label: '线下付款审核失败', tone: 'danger' },
  { value: 'waiting_delivery', label: '待发货', tone: 'info' },
  { value: 'partial_delivery', label: '部分发货', tone: 'info' },
  { value: 'delivered', label: '已发货', tone: 'success' },
  { value: 'await_comment', label: '待评价', tone: 'info' },
  { value: 'completed', label: '已完成', tone: 'success' },
  { value: 'cancellation', label: '已取消', tone: 'warning' },
  { value: 'admin_cancellation', label: '后台取消', tone: 'warning' },
  { value: 'admin_cancellation_audit', label: '后台取消审核中', tone: 'warning' },
  { value: 'system_cancel', label: '系统取消', tone: 'warning' },
  { value: 'await_follow', label: '待跟进', tone: 'info' },
  { value: 'await_refund', label: '待退款', tone: 'warning' },
  { value: 'await_receipt_refund', label: '待收货退款', tone: 'warning' },
  { value: 'completed_refund', label: '已退款完成', tone: 'success' }
];

const SAMPLE_ORDER_STATUS_OPTIONS: StatusOption[] = [
  { value: 'wait_leader_examine', label: '待主管审核', tone: 'warning' },
  { value: 'leader_reject', label: '主管驳回', tone: 'danger' },
  { value: 'stay_follow_up', label: '待跟进', tone: 'info' },
  { value: 'completed', label: '已完成', tone: 'success' },
  { value: 'cancellation', label: '已取消', tone: 'warning' },
  { value: 'closure', label: '已关闭', tone: 'default' }
];

const LEGACY_STATUS_LABEL_MAP: Record<string, string> = {
  草稿: '未提交',
  手动报价: '手动报价',
  已发送: '已发送',
  已接受: '报价完成',
  已拒绝: '已拒绝',
  待执行: '未提交',
  执行中: '处理中',
  待审批: '待主管审核',
  待审核: '待主管审核'
};

const toneClassMap: Record<StatusTone, string> = {
  default: 'bg-gray-100 text-gray-700',
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700'
};

const toLookup = (options: StatusOption[]) =>
  options.reduce<Record<string, StatusOption>>((acc, option) => {
    acc[option.value] = option;
    return acc;
  }, {});

const quotationStatusLookup = toLookup(QUOTATION_STATUS_OPTIONS);
const orderStatusLookup = toLookup(SALES_ORDER_STATUS_OPTIONS);
const sampleStatusLookup = toLookup(SAMPLE_ORDER_STATUS_OPTIONS);

const findByLabel = (options: StatusOption[], label: string) => options.find((item) => item.label === label);

const normalizeLegacyLabel = (value: string) => LEGACY_STATUS_LABEL_MAP[value] || value;

const findStatus = (lookup: Record<string, StatusOption>, options: StatusOption[], raw: string): StatusOption | null => {
  const fromCode = lookup[raw];
  if (fromCode) return fromCode;
  const normalizedLabel = normalizeLegacyLabel(raw);
  return findByLabel(options, normalizedLabel) || null;
};

export const getQuotationStatusLabel = (status: string) => findStatus(quotationStatusLookup, QUOTATION_STATUS_OPTIONS, String(status || ''))?.label || String(status || '-');
export const getSalesOrderStatusLabel = (status: string) => findStatus(orderStatusLookup, SALES_ORDER_STATUS_OPTIONS, String(status || ''))?.label || String(status || '-');
export const getSampleOrderStatusLabel = (status: string) => findStatus(sampleStatusLookup, SAMPLE_ORDER_STATUS_OPTIONS, String(status || ''))?.label || String(status || '-');

export const getQuotationStatusToneClass = (status: string) => toneClassMap[findStatus(quotationStatusLookup, QUOTATION_STATUS_OPTIONS, String(status || ''))?.tone || 'default'];
export const getSalesOrderStatusToneClass = (status: string) => toneClassMap[findStatus(orderStatusLookup, SALES_ORDER_STATUS_OPTIONS, String(status || ''))?.tone || 'default'];
export const getSampleOrderStatusToneClass = (status: string) => toneClassMap[findStatus(sampleStatusLookup, SAMPLE_ORDER_STATUS_OPTIONS, String(status || ''))?.tone || 'default'];

export const quotationStatusOptions = QUOTATION_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label }));
export const salesOrderStatusOptions = SALES_ORDER_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label }));
export const sampleOrderStatusOptions = SAMPLE_ORDER_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label }));
