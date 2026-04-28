import { PerformanceMetric } from '../types';

export const mockPerformanceMetrics: PerformanceMetric[] = [
  {
    id: 'PM1',
    userId: 'U1',
    userName: '张三',
    period: '2026-03',
    score: 92,
    metrics: {
      sales: { label: '销售额', value: 450000, target: 500000 },
      visits: { label: '拜访量', value: 12, target: 10 },
      conversion: { label: '转化率', value: 0.15, target: 0.12 },
      satisfaction: { label: '客户满意度', value: 4.8, target: 4.5 }
    }
  }
];
