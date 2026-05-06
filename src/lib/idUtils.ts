/**
 * 统一业务编号生成工具
 * 默认格式：业务前缀 + 日期(YYMMDD) + 累积流水号(4位)
 * 客户特殊：业务前缀 + 日期(YYYYMMDD) + 累积流水号(6位)
 */
export function generateBusinessId(prefix: string, existingItems?: any[]): string {
  const now = new Date();
  const isCustomer = prefix === ID_PREFIX.CUSTOMER;
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = isCustomer ? `${yyyy}${mm}${dd}` : `${yy}${mm}${dd}`;
  const serialLen = isCustomer ? 6 : 4;

  let sequence = 1;

  // 1. 优先从现有列表中查找该前缀的最大流水号
  if (existingItems && existingItems.length > 0) {
    const pattern = new RegExp(`^${prefix}\\d{${isCustomer ? 8 : 6}}(\\d{${serialLen}})$`);
    const extractCandidateValues = (item: any): string[] => {
      if (typeof item === 'string') return [item];
      if (!item || typeof item !== 'object') return [];
      return [
        item.id,
        item.inquiryNo,
        item.leadNo,
        item.opportunityNo,
        item.projectNo,
        item.quoteNo,
        item.orderNo,
        item.sampleNo,
        item.returnNo,
        item.taskNo,
        item.no,
      ]
        .filter(Boolean)
        .map((v) => String(v));
    };
    const sequences = existingItems
      .map((item) => {
        const candidates = extractCandidateValues(item);
        let maxSeq = 0;
        for (const value of candidates) {
          const match = value.match(pattern);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        }
        return maxSeq;
      })
      .filter((seq) => seq > 0);
    
    if (sequences.length > 0) {
      sequence = Math.max(...sequences) + 1;
    } else {
      sequence = existingItems.length + 1;
    }
  } else {
    // 2. 如果没有列表，尝试从 localStorage 读取该前缀的全局计数器
    const storageKey = `crm_global_counter_${prefix}`;
    const stored = localStorage.getItem(storageKey);
    sequence = stored ? parseInt(stored, 10) + 1 : 1;
  }

  // 更新持久化计数器（仅作为前端兜底，实际应由后端保证）
  localStorage.setItem(`crm_global_counter_${prefix}`, sequence.toString());

  const serialNo = String(sequence).padStart(serialLen, '0');
  return `${prefix}${datePart}${serialNo}`;
}

/**
 * 业务前缀常量定义
 */
export const ID_PREFIX = {
  COMPETITOR: 'XP',    // 竞品
  CASE: 'AL',          // 案例
  LEAD: 'XS',          // 线索
  OPPORTUNITY: 'JH',   // 机会
  INQUIRY: 'XJ',       // 询价
  PROJECT: 'XM',       // 项目
  QUOTATION: 'BJ',     // 报价
  SALES_ORDER: 'DD',   // 订单
  SAMPLE_ORDER: 'YP',  // 样品
  RETURN_ORDER: 'TH',  // 退货
  CUSTOMER: 'KH',      // 客户
  PRODUCT: 'CP',       // 产品
  TASK: 'RW',          // 任务
  CONTACT: 'LX',       // 联系人
  GROUP: 'QW',         // 企微群
  MESSAGE: 'XX',       // 消息
  USER: 'YH',          // 用户
  SOP: 'SOP',          // SOP
  FOLLOW_UP: 'HF',     // 回访/跟进
  PERSONA: 'PER',      // 画像
  FOCUS_POINT: 'FP',   // 关注点
  ITEM: 'MX',          // 明细 (Ming Xi)
};
