import { BaseEntity } from './common';

export interface DocumentItem {
  id: string;
  productId?: string;
  partNumber: string;
  productName?: string;
  materialName?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxIncludedPrice?: number;
  taxExcludedPrice?: number;
  taxIncludedAmount?: number;
  taxExcludedAmount?: number;
  taxAmount?: number;
  taxType?: string;
  description?: string;
  materialNo?: string;
  materialId?: string;
  returnMethod?: string;
  orderNo?: string;
  returnNo?: string;
  expectedAfterSaleMethod?: string;
  afterSaleReason?: string;
  afterSaleMaterialImage?: string;
  issueDescription?: string;
  returnTrackingNo?: string;
  finalHandlingMethod?: string;
  returnQty?: number;
  facePrice?: number;
  discount?: string;
  subtotal?: number;
}

export interface ChangeRecord {
  id: string;
  timestamp?: string;
  date?: string;
  action: string;
  operator?: string;
  user?: string;
  details?: string;
  changes?: string;
}

export interface SalesQuotation extends BaseEntity {
  quoteNo: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  quoteDate: string;
  totalAmount: number;
  taxIncludedTotalAmount: number;
  taxExcludedTotalAmount: number;
  status: '草稿' | '已发送' | '已接受' | '已拒绝';
  auditStatus: '未审核' | '审核中' | '已审核';
  changeRecords: ChangeRecord[];
  items: DocumentItem[];
}

export interface SalesOrder extends BaseEntity {
  orderNo: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  projectName?: string;
  orderDate: string;
  totalAmount: number;
  taxIncludedTotalAmount: number;
  taxExcludedTotalAmount: number;
  status: '待执行' | '执行中' | '已完成' | '已取消';
  auditStatus: '未审核' | '审核中' | '已审核';
  changeRecords: ChangeRecord[];
  items: DocumentItem[];
  aiAnalysis?: {
    winResults?: {
      role: string;
      benefit: string;
    }[];
    loyaltyScore?: number;
    referralOpportunity?: boolean;
  };
}

export interface SampleOrder extends BaseEntity {
  sampleNo: string;
  customerId: string;
  customerName: string;
  applicant: string;
  status: '进行中' | '已完成' | '已取消' | '待审批';
  totalAmount: number;
  taxIncludedTotalAmount: number;
  taxExcludedTotalAmount: number;
  auditStatus: '未审核' | '审核中' | '已审核';
  changeRecords: ChangeRecord[];
  projectId: string;
  projectName: string;
  items: DocumentItem[];
}

export interface ReturnOrder extends BaseEntity {
  returnNo: string;
  orderNo?: string;
  originalOrderNo: string;
  customerId: string;
  customerName: string;
  afterSaleQty?: number;
  afterSaleType?: string;
  reason: string;
  status: '待处理' | '处理中' | '已完成';
  handler: string;
  salesRep?: string;
  merchandiser?: string;
  projectId: string;
  projectName: string;
  rootCauseAnalysis?: string;
  taxIncludedTotalAmount: number;
  taxExcludedTotalAmount: number;
  auditStatus: '未审核' | '审核中' | '已审核';
  changeRecords: ChangeRecord[];
  items: DocumentItem[];
}
