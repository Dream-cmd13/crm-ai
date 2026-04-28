import { SampleOrder, ReturnOrder, SalesQuotation, SalesOrder } from '../types';

export const mockSampleOrders: SampleOrder[] = [
  {
    id: 'SO1',
    sampleNo: 'SO20260317001',
    customerId: 'CUS-20260317-001',
    customerName: '四信通信',
    applicant: '张三',
    status: '进行中',
    totalAmount: 1200,
    taxIncludedTotalAmount: 1356,
    taxExcludedTotalAmount: 1200,
    auditStatus: '已审核',
    changeRecords: [],
    projectId: 'XM2603173188',
    projectName: '海康威视-安防摄像头线束定制',
    items: [
      { id: 'I1', partNumber: 'M12-4P-M-A', quantity: 10, unitPrice: 120 }
    ],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17'
  }
];

export const mockReturnOrders: ReturnOrder[] = [
  {
    id: 'RO1',
    returnNo: 'RO20260317001',
    originalOrderNo: 'OR20260310001',
    customerId: 'CUS-20260317-002',
    customerName: '大疆创新',
    reason: '规格不符',
    status: '待处理',
    handler: '李四',
    projectId: 'XM2603173188',
    projectName: '海康威视-安防摄像头线束定制',
    taxIncludedTotalAmount: 500,
    taxExcludedTotalAmount: 442,
    auditStatus: '未审核',
    changeRecords: [],
    items: [
      { id: 'I2', partNumber: 'M8-3P-F-B', quantity: 50, unitPrice: 10 }
    ],
    creatorId: 'U2',
    creatorNo: 'E002',
    creatorName: '李四',
    createDate: '2026-03-17'
  }
];

export const mockSalesQuotations: SalesQuotation[] = [
  {
    id: 'Q1',
    quoteNo: 'Q20260317001',
    customerId: 'CUS-20260317-001',
    customerName: '四信通信',
    projectId: 'XM2603173188',
    projectName: '海康威视-安防摄像头线束定制',
    quoteDate: '2026-03-17',
    totalAmount: 15000,
    taxIncludedTotalAmount: 16950,
    taxExcludedTotalAmount: 15000,
    status: '已发送',
    auditStatus: '已审核',
    changeRecords: [],
    items: [],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17'
  }
];

export const mockQuotations = mockSalesQuotations;

export const mockSalesOrders: SalesOrder[] = [
  {
    id: 'OR1',
    orderNo: 'OR20260317001',
    customerId: 'CUS-20260317-002',
    customerName: '大疆创新',
    orderDate: '2026-03-17',
    totalAmount: 50000,
    taxIncludedTotalAmount: 56500,
    taxExcludedTotalAmount: 50000,
    status: '待执行',
    auditStatus: '已审核',
    changeRecords: [],
    items: [],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17'
  }
];

export const mockOrders = mockSalesOrders;
