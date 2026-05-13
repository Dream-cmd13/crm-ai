export type CustomerEnumOption = { value: string; label: string };

export const CUSTOMER_SOURCE_OPTIONS: CustomerEnumOption[] = [
  { value: '1', label: '展会收集' },
  { value: '2', label: '朋友介绍' },
  { value: '3', label: '网络推广' },
  { value: '4', label: '客户转介绍' },
  { value: '5', label: '个人观察' },
  { value: '6', label: '网上搜索' },
  { value: '7', label: '电商平台' }
];

export const CUSTOMER_REGION_OPTIONS: CustomerEnumOption[] = [
  { value: '1', label: '东北地区' },
  { value: '2', label: '华北地区' },
  { value: '3', label: '西北地区' },
  { value: '4', label: '华东地区' },
  { value: '5', label: '华南地区' },
  { value: '6', label: '西南地区' },
  { value: '7', label: '港澳台地区' },
  { value: '8', label: '国外' },
  { value: '9', label: '华中地区' }
];

export const CUSTOMER_TYPE_OPTIONS: CustomerEnumOption[] = [
  { value: '0', label: '普通企业' },
  { value: '1', label: '认证企业' },
  { value: '2', label: '个人' }
];

export const CUSTOMER_CURRENCY_OPTIONS: CustomerEnumOption[] = [
  { value: '1', label: '人民币' },
  { value: '2', label: '美元' }
];

export const PAYMENT_TERM_OPTIONS: CustomerEnumOption[] = [
  { value: '3', label: '30天' },
  { value: '6', label: '60天' },
  { value: '9', label: '90天' },
  { value: '12', label: '120天' }
];

export const CUSTOMER_INDUSTRY_OPTIONS: string[] = [
  '办公设备',
  '工业电气',
  '数码3C',
  '5G',
  '医疗',
  '国防军工',
  '智能家居',
  '航天航空',
  '汽车',
  '新能源',
  '消费电子'
];

const resolveEnumLabel = (value: string | number | null | undefined, options: CustomerEnumOption[]): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hit = options.find((item) => item.value === raw);
  return hit?.label || raw;
};

export const formatCustomerSourceLabel = (value: string | number | null | undefined): string =>
  resolveEnumLabel(value, CUSTOMER_SOURCE_OPTIONS);

export const formatCustomerRegionLabel = (value: string | number | null | undefined): string =>
  resolveEnumLabel(value, CUSTOMER_REGION_OPTIONS);

export const formatCustomerTypeLabel = (value: string | number | null | undefined): string =>
  resolveEnumLabel(value, CUSTOMER_TYPE_OPTIONS);

export const formatCustomerCurrencyLabel = (value: string | number | null | undefined): string =>
  resolveEnumLabel(value, CUSTOMER_CURRENCY_OPTIONS);

export const formatPaymentTermLabel = (value: string | number | null | undefined): string =>
  resolveEnumLabel(value, PAYMENT_TERM_OPTIONS);

export const resolveCustomerCurrencyValue = (label: string | null | undefined): string => {
  const raw = String(label || '').trim();
  if (!raw) return '';
  const hit = CUSTOMER_CURRENCY_OPTIONS.find((item) => item.label === raw || item.value === raw);
  return hit?.value || '';
};
