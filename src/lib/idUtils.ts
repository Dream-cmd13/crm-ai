import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

/**
 * 生成 UUID v4，用于 text 主键表的 ID。
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * 生成本地业务编号（兜底方案）。
 * 格式：PREFIX + YYMMDD + 随机十六进制字符
 * 例如：XJ250506A3F2
 */
function generateLocalBusinessNumber(prefix: string, padLen: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = crypto.randomUUID().replace(/-/g, '');
  return `${prefix}${yy}${mm}${dd}${hex.slice(0, padLen).toUpperCase()}`;
}

/** 每会话缓存：去重计数器，避免同会话内多次调用返回重复编号 */
const sessionCounters = new Map<string, number>();

/**
 * 生成业务编号。
 * 1. 优先调用 Supabase RPC generate_business_number（数据库保证唯一性）
 * 2. RPC 不可用时生成本地唯一编号（格式：PREFIX + YYMMDD + 随机HEX）
 *
 * @param prefix 业务前缀，如 'XJ', 'XS', 'JH', 'XM', 'BJ', 'DD', 'YP', 'TH'
 * @returns 业务编号字符串
 */
export async function generateBusinessNumber(prefix: string): Promise<string> {
  const config = BUSINESS_NUMBER_TABLE_MAP[prefix];
  const padLen = config?.padLen ?? 4;

  // 尝试 RPC
  if (config && isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      // 先尝试 4 参数版本
      const { data, error } = await supabase.rpc('generate_business_number', {
        prefix,
        table_name: config.table,
        column_name: config.column,
        pad_len: padLen,
      });
      if (!error && typeof data === 'string' && data) {
        return dedupWithinSession(prefix, data, padLen);
      }
    } catch {
      // RPC 不存在或调用失败
    }

    // 尝试 3 参数版本
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('generate_business_number', {
        prefix,
        table_name: config.table,
        pad_len: padLen,
      });
      if (!error && typeof data === 'string' && data) {
        return dedupWithinSession(prefix, data, padLen);
      }
    } catch {
      // 3 参数版本也不可用
    }
  }

  // RPC 不可用：生成本地唯一编号
  return dedupWithinSession(prefix, generateLocalBusinessNumber(prefix, padLen), padLen);
}

/**
 * 会话内去重：同一前缀多次调用时保证编号不重复。
 */
function dedupWithinSession(prefix: string, baseId: string, padLen: number): string {
  const count = sessionCounters.get(prefix) || 0;
  sessionCounters.set(prefix, count + 1);
  if (count === 0) return baseId;

  return baseId.replace(/([A-F0-9]+)$/, (match) => {
    const num = parseInt(match, 16) + count;
    return num.toString(16).toUpperCase().padStart(padLen, '0').slice(-padLen);
  });
}

/**
 * generate_business_number RPC 所需的表/列映射。
 */
const BUSINESS_NUMBER_TABLE_MAP: Partial<Record<string, { table: string; column: string; padLen: number }>> = {
  XP: { table: 'crm_inquiry', column: 'inquiry_no', padLen: 4 },
  XS: { table: 'crm_lead', column: 'lead_no', padLen: 4 },
  JH: { table: 'crm_opportunity', column: 'opportunity_no', padLen: 4 },
  XM: { table: 'crm_project', column: 'project_no', padLen: 4 },
  BJ: { table: 'crm_quotation', column: 'quote_no', padLen: 4 },
  DD: { table: 'crm_sales_order', column: 'order_no', padLen: 4 },
  YP: { table: 'crm_sample_order', column: 'sample_no', padLen: 4 },
  TH: { table: 'crm_return_order', column: 'return_no', padLen: 4 },
};

/**
 * 业务前缀常量定义。
 */
export const ID_PREFIX = {
  COMPETITOR: 'JP',
  CASE: 'AL',
  LEAD: 'XS',
  OPPORTUNITY: 'JH',
  INQUIRY: 'XP',
  PROJECT: 'XM',
  QUOTATION: 'BJ',
  SALES_ORDER: 'DD',
  SAMPLE_ORDER: 'YP',
  RETURN_ORDER: 'TH',
  CUSTOMER: 'KH',
  PRODUCT: 'CP',
  TASK: 'RW',
  CONTACT: 'LX',
  GROUP: 'QW',
  MESSAGE: 'XX',
  USER: 'YH',
  SOP: 'SOP',
  FOLLOW_UP: 'HF',
  PERSONA: 'PER',
  FOCUS_POINT: 'FP',
  ITEM: 'MX',
} as const;
