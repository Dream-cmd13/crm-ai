import { confirmDialog } from './toastConfirm';
import { toast } from 'react-hot-toast';

const APPROVAL_KEYWORDS = ['送审', '审核中', '已审核', '审批中', '已审批'];

export const isApprovalLocked = (record: any): boolean => {
  const values = [
    record?.status,
    record?.auditStatus,
    record?.approvalStatus,
    record?.documentStatus
  ]
    .map((v) => String(v || ''))
    .filter(Boolean);
  return values.some((v) => APPROVAL_KEYWORDS.some((k) => v.includes(k)));
};

export const ensureDeleteAllowed = async (opts: {
  record: any;
  entityName: string;
  downstreamCount?: number;
  downstreamLabel?: string;
}) => {
  const { record, entityName, downstreamCount = 0, downstreamLabel = '下游单据' } = opts;
  if (isApprovalLocked(record)) {
    toast.error(`${entityName}处于送审/审核流程中，不允许删除`);
    return false;
  }
  if (downstreamCount > 0) {
    toast.error(`${entityName}存在${downstreamCount}条${downstreamLabel}，不允许删除`);
    return false;
  }
  return await confirmDialog(`确定要删除此${entityName}吗？`);
};
