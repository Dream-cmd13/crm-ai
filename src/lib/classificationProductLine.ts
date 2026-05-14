export const CLASSIFICATION_PRODUCT_LINE_OPTIONS = [
  { value: '1', label: 'IO' },
  { value: '5', label: '线束' },
  { value: '2', label: '工业' },
  { value: '6', label: '新能源' },
  { value: '4', label: '接插件' },
  { value: '7', label: '原厂' },
  { value: '3', label: '加工' }
] as const;

const CLASSIFICATION_PRODUCT_LINE_LABEL_MAP: Record<string, string> =
  CLASSIFICATION_PRODUCT_LINE_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

export const normalizeClassificationProductLineKey = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const normalized = String(value).trim();
  return CLASSIFICATION_PRODUCT_LINE_LABEL_MAP[normalized] ? normalized : '';
};

export const toClassificationProductLineDbValue = (value: unknown): number | null => {
  const normalized = normalizeClassificationProductLineKey(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getClassificationProductLineLabel = (value: unknown): string => {
  const normalized = normalizeClassificationProductLineKey(value);
  return normalized ? CLASSIFICATION_PRODUCT_LINE_LABEL_MAP[normalized] : '';
};
