import { BaseEntity } from './common';

export type StakeholderRoleTag = 'A' | 'D' | 'S' | 'E' | 'I';
export type StakeholderNeedLevel = '生理需求' | '安全需求' | '归属需求' | '尊重需求' | '自我实现需求' | '';

export interface CustomerStakeholder extends BaseEntity {
  customerId: string;
  contactId?: string; // 绑定客户联系人ID，双向同步用
  name: string;
  title?: string;
  department?: string;
  roleTag: StakeholderRoleTag;
  influenceLevel: number; // 1-5
  attitudeScore: -2 | -1 | 0 | 1 | 2;
  relationLevel: 1 | 2 | 3 | 4;
  needLevel?: StakeholderNeedLevel;
  businessFocus?: string;
  ownerUserId?: string;
  managerStakeholderId?: string; // 组织架构中的上级干系人
  lastTouchTime?: string;
  lastTouchSummary?: string;
  extra?: Record<string, any>;
}

export interface StakeholderAssessment extends BaseEntity {
  customerId: string;
  stakeholderId: string;
  assessmentDate: string;
  needLevelScore?: number;
  powerScore?: number;
  attitudeScore?: number;
  relationScore?: number;
  businessAlignmentScore?: number;
  confidenceScore?: number;
  conclusion?: string;
  strategySuggestion?: string;
  sourceType?: 'manual' | 'ai';
  aiModel?: string;
}
