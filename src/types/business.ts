import { BaseEntity } from './common';
import { SampleOrder, ReturnOrder } from './sales';
import { TodoTask } from './task';
import { GroupChat } from './wechat';

export interface CommunicationDetail {
  id: string;
  date: string;
  sender: string;
  content: string;
  type: 'wechat' | 'wechat_group' | 'email' | 'phone' | 'meeting' | 'screenshot' | 'voice';
  attachmentUrl?: string;
  duration?: number; // for voice
  sourceId?: string; // ID of Inquiry, Lead, Opportunity, or Project
  customerId?: string; // ID of the associated customer
  sourceGroup?: string; // e.g. "WeChat Group A", "1688 Inquiry"
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  content: string; // data URL
}

export interface Inquiry extends BaseEntity {
  date: string;
  customerId?: string;
  companyName: string;
  customerName: string;
  contact: string;
  sourceChannel: string;
  category: string;
  productSeries: string;
  province: string;
  situation: string;
  customerInquiry?: string;
  status: '待处理' | '已转线索' | '关闭';
  classification?: '处理中' | '有效' | '无效';
  unconvertReason?: string;
  unconvertedTime?: string;
  notes?: string;
  associatedLead?: string;
  creator: string;
  updater?: string;
  updateDate?: string;
  contactPerson?: string;
  communicationDetails?: CommunicationDetail[];
  // New fields for the 5-step process
  companyBackground?: string;
  purchaseScale?: string;
  buyerRole?: '技术买家' | '用户买家' | '经济买家' | '教练' | '经济买家(采购总监/研发VP)' | '技术买家(陈工 (结构工程师))' | '教练（推动者）';
  buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
  intentScore?: number;
  contactId?: string;
  attachments?: FileAttachment[];
  aiAnalysis?: {
    inquiryType?: '技术咨询' | '价格索取' | '寻找替代品' | '定制需求' | '样品替换';
    profile?: string; // Structured customer profile
    warmerScript?: string; // Challenger Sale style warmer
    buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
    suggestedQuestions?: string[]; // Questions to detect buying mode
    intentScore?: number;
    industryPainPoints?: string;
    teachingStory?: string[];
  };
}

export interface Lead extends BaseEntity {
  customerId?: string;
  customerType?: '新客户' | '老客户';
  customerName: string;
  name: string;
  phone: string;
  customerAction: string;
  industry: string;
  status: '未跟进' | '跟进中' | '关闭' | '转商机';
  classification?: '处理中' | '有效' | '无效';
  assignee: string;
  entryTime: string;
  channelPlatform: string;
  source: string;
  productCategory: string;
  productSeries: string;
  sourceStatus: string;
  productIndustry?: '基础接插件' | '新能源' | '线束' | '定制' | '胜蓝' | '胜蓝电气' | '工业';
  customerOpportunity?: string;
  closeTime?: string;
  closeReason?: string;
  creator: string;
  department?: string;
  contactPerson?: string;
  inquiryId?: string;
  communicationDetails?: CommunicationDetail[];
  // Inherited/Refined from Inquiry
  buyerRole?: '技术买家' | '用户买家' | '经济买家' | '教练' | '经济买家(采购总监/研发VP)' | '技术买家(陈工 (结构工程师))' | '教练（推动者）';
  buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
  intentScore?: number;
  contactId?: string;
  attachments?: FileAttachment[];
  aiAnalysis?: {
    buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
    intentScore?: number;
    suggestedQuestions?: string[];
    followUpStrategy?: string;
    teachingStory?: string[];
    spinQuestions?: {
      situation: string[];
      problem: string[];
      implication: string[];
      needPayoff: string[];
    };
    impactCase?: {
      title: string;
      metrics: string;
      description: string;
      valueStatement: string;
    };
    decisionChain?: {
      economicBuyer?: string;
      technicalBuyer?: string;
      userBuyer?: string;
      coach?: string;
      missingRoles?: string[];
    };
    summaryEmailDraft?: string;
  };
}

export interface Opportunity extends BaseEntity {
  customerId?: string;
  customerType?: '新客户' | '老客户';
  customerName: string;
  oppDate: string;
  status: '未跟进' | '跟进中' | '关闭' | '转项目';
  oppSummary: string;
  closeTime?: string;
  closeReason?: string;
  productLine: '接插件' | '线束' | '工业连接器' | 'IO连接器' | '电子电气' | '其他' | string;
  salesRep: string;
  projectManager: string;
  productOwner: string;
  oppLevel: string;
  intentAmount: string;
  associatedProject: string;
  endCustomer: string;
  endProject: string;
  applicationScenario?: string;
  estimatedUsage?: string;
  estimatedMassProductionDate?: string;
  salesType: string;
  productIndustry: string;
  productSeries: string;
  completeness: number;
  contactPerson?: string;
  leadId?: string;
  inquiryId?: string;
  contactId?: string;
  attachments?: FileAttachment[];
  communicationDetails?: CommunicationDetail[];
  aiAnalysis?: {
    spinAnalysis?: {
      situation?: string;
      problem?: string;
      implication?: string;
      needPayoff?: string;
      deepQuestions?: string[]; // Deep SPIN questions
    };
    blueSheet?: {
      economicBuyer?: { name: string; position: string; status: '已接触' | '未接触'; winResult?: string };
      technicalBuyer?: { name: string; position: string; status: '已接触' | '未接触'; winResult?: string };
      userBuyer?: { name: string; position: string; status: '已接触' | '未接触'; winResult?: string };
      coach?: { name: string; position: string; status: '已接触' | '未接触'; winResult?: string };
    };
    teachingStory?: {
      concept: string;
      impactCase: string;
      valueStatement: string;
    };
    redFlags?: {
      risk: string;
      severity: '高' | '中' | '低';
      description: string;
    }[];
    summaryEmailDraft?: string;
    winProbability?: number;
  };
}

export interface DesignVersion {
  id: string;
  version: string;
  type: '图纸' | '方案';
  name: string;
  url: string;
  uploadDate: string;
  isConfirmed: boolean;
  confirmedDate?: string;
}

export interface CustomerResource {
  id: string;
  name: string;
  description: string;
  quantity?: number;
  unit?: string;
  estimatedValue?: string;
}

export interface Project extends BaseEntity {
  name?: string; // Alias for projectName
  projectName: string;
  projectType: '研发型项目' | '标品类项目' | string;
  customerName: string;
  customerId?: string;
  projectLevel: string;
  health?: '红' | '黄' | '绿';
  stage: '需求阶段' | '设计阶段' | '报价阶段' | '样品制作' | '样品承认' | '试产阶段' | '重复试产' | '量产阶段';
  productLine?: '接插件' | '线束' | '工业连接器' | 'IO连接器' | '电子电气' | '其他';
  status: '跟进中' | '样品' | '小批量' | '样品/小批量' | '已合作' | '关闭' | '暂停' | '已完成' | '已关闭';
  oppSummary: string;
  intentAmount: string;
  estimatedUsage: string;
  endCustomer?: string;
  endProject?: string;
  productIndustry?: '基础接插件' | '新能源' | '线束' | '定制' | '胜蓝' | '胜蓝电气' | '工业';
  estimatedMassProductionTime?: string;
  salesRep?: string;
  productOwner?: string;
  qualityOwner?: string;
  purchaser?: string;
  fae?: string;
  team: {
    sales: string;
    pm: string;
    product: string;
    quality: string;
    purchasing: string;
    fae: string;
  };
  wechatGroup: string;
  updateDate: string;
  startDate?: string;
  endDate?: string;
  opportunityId?: string;
  leadId?: string;
  inquiryId?: string;
  attachments?: FileAttachment[];
  communicationDetails?: CommunicationDetail[];
  notes: ProjectNote[];
  applicationScenario?: string;
  recordingDegree?: string;
  customerAction?: string;
  projectDesc?: string;
  closeReason?: string;
  closeTime?: string;
  isKeyProject?: boolean;
  requirements?: ProjectRequirement[];
  progress?: ProjectProgress[];
  tasks?: TodoTask[];
  samples?: ProjectSample[];
  purchasingQuotes?: PurchasingQuote[];
  quotations?: Quotation[];
  requirementChanges?: RequirementChange[];
  sampleOrders?: SampleOrder[];
  designVersions?: DesignVersion[];
  customerResources?: CustomerResource[];
  aiAnalysis?: {
    buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
    spinAnalysis?: string;
    intentScore?: number;
    conceptualSelling?: {
      roi测算: string;
      economicBuyerScript: string;
      technicalBuyerScript: string;
    };
    redFlags?: {
      risk: string;
      severity: '高' | '中' | '低';
      description: string;
    }[];
    sampleServicePackage?: {
      installationGuide: string;
      troubleshootingTips: string;
    };
    challengerScripts?: {
      priceObjection: string;
      valueDefense: string;
    };
    orderWarning?: {
      isDelayed: boolean;
      daysSinceApproval: number;
      coachAdvice: string;
    };
    deepAnalysis?: string;
  };
  buyerRoles?: {
    economicBuyer?: string;
    userBuyer?: string[];
    technicalBuyer?: string[];
    coach?: string;
  };
  valueProposition?: string;
  customerInvestment?: {
    teamSize: number;
    timeSpent: string;
    equipmentInvolved?: string;
  };
  formalCommitment?: string;
  nextOrderPlan?: string;
}

export interface ProjectNote {
  id: string;
  author: string;
  role: string;
  content: string;
  date: string;
}

export interface ProjectRequirement {
  id: string;
  product: string;
  partNumber: string;
  quantity: number;
  specDescription: string;
  drawing: string;
  envRequirement: string;
  certRequirement: string;
  brandRequirement: string;
}

export interface ProjectProgress {
  id: string;
  time: string;
  handler: string;
  latestStatus: string;
  nextAction: string;
}

export interface ProjectSample {
  id: string;
  applyTime: string;
  partNumber: string;
  wlPartNumber: string;
  specDescription: string;
  quantity: number;
  deliveryTime: string;
  sender: string;
  customerApproveTime: string;
  approveStatus: string;
  certApplyTime: string;
  certMaker: string;
  certDeliveryTime: string;
  certFile: string;
  deliveryStatus: string;
  deliveryCondition: string;
  drawingFile: string;
  sampleLeadTime: string;
}

export interface PurchasingQuote {
  id: string;
  quoteNo: string;
  projectId: string;
  quoteTime: string;
  task: string;
  supplier: string;
  items: any[];
}

export interface Quotation {
  id: string;
  quoteNo: string;
  projectId: string;
  sales: string;
  contact: string;
  phone: string;
  quoteTime: string;
  customerAddress: string;
  tel: string;
  email: string;
  wechatId?: string;
  website: string;
  address: string;
  totalAmount: number;
  customerName: string;
  items: any[];
}

export interface RequirementChange {
  id: string;
  changeNo: string;
  projectId: string;
  projectName: string;
  title: string;
  content: string;
  applyTime: string;
  applicant: string;
  changeDrawing: string;
  originalRequirement: string;
  reviewer: string;
  reviewResult: string;
  reviewTime: string;
}

export interface Customer extends BaseEntity {
  name: string;
  level: '战略客户' | '成长型客户' | '普通客户' | string;
  status: '活跃' | '休眠' | '流失';
  industry: string;
  source: string;
  region: string;
  salesRep: string;
  paymentTerm?: string;
  hasPaymentTerm?: boolean;
  customerType?: string;
  merchandiser?: string;
  isPublicPool?: boolean;
  monthSettlementApplyStatus?: string;
  businessManager?: string;
  currency?: string;
  customerCategory?: string;
  groupName?: string;
  isListedCompany?: boolean;
  shortName?: string;
  englishName?: string;
  insuredCount?: number;
  paidInCapital?: string;
  wechatGroup?: string;
  legalPerson?: string;
  registeredCapital?: string;
  industryLevel1?: string;
  industryLevel2?: string;
  industryLevel3?: string;
  employeeCount?: string;
  establishmentDate?: string;
  unifiedSocialCreditCode?: string;
  companyAddress?: string;
  companyType?: string;
  faxNumber?: string;
  monthSettlementAttachment?: string;
  monthSettlementAgreement?: string;
  businessScope?: string;
  website?: string;
  contacts: Contact[];
  followUps: FollowUp[];
  devPlan?: string;
  carePlan?: string;
  sampleOrders?: SampleOrder[];
  returnOrders?: ReturnOrder[];
  customVisitFrequency?: number;
  lastVisitDate?: string;
  lastContactTime?: string; // Phase 1: 沉睡预警
  lastContactAction?: string; // Phase 1: 沉睡预警
  latestNextVisitTime?: string;
  inquiryIds?: string[];
  leadIds?: string[];
  opportunityIds?: string[];
  projectIds?: string[];
  competitors?: CustomerCompetitor[];
}

export interface Contact {
  id: string;
  name: string;
  position: string;
  department?: string;
  orgBelonging?: '发起部门' | '使用部门' | '决策部门';
  participationDepth?: string;
  phone: string;
  email: string;
  wechatId?: string;
  isPrimary: boolean;
  managerContactId?: string; // 上级联系人ID（组织架构）
  faction?: string; // 派系标签
  attitudeToUs?: '积极推进' | '正面评价' | '中性评价' | '反对者';
  attitudeScore?: -2 | -1 | 0 | 1 | 2;
  roleTag?: 'A' | 'D' | 'S' | 'E' | 'I';
  influenceLevel?: number;
  relationLevel?: 1 | 2 | 3 | 4;
  age?: number;
  personality?: string;
  decisionPower?: string;
  buyingRole?: '经济买家' | '技术买家' | '用户买家' | '教练';
  buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
  attitude?: string;
  winResults?: {
    result: string; // 业务结果 (Result)
    win: string;    // 个人赢 (Win)
  };
  relationshipQuality?: {
    privateRelation: string;
    trustLevel: string;
  };
  spinPainPoints?: {
    problem: string;
    implication: string;
  };
  infoSharingLevel?: string;
  appellation?: string;
  familySituation?: string;
  hometown?: string;
  graduationSchool?: string;
  hobbies?: string[];
  preferences?: string;
  keyConcerns?: string;
  followStrategy?: string;
  iceBreakingScript?: string;
  appointmentScript?: string;
  videoChannelProfile?: string;
  douyinProfile?: string;
  xiaohongshuProfile?: string;
  socialMediaBehavior?: string;
}

export interface FollowUp {
  id: string;
  date: string;
  type: string;
  content: string;
  author: string;
}

export interface CustomerPersona {
  id: string;
  customerId: string;
  scale: string;
  mainProducts: string;
  orgStructure?: string; // 组织架构
  buyingMode?: '增长模式' | '困难模式' | '平稳模式' | '过度自信模式';
  painPoints: string;
  competitiveLandscape?: {
    supplier: string;
    preference: string;
  };
  uniqueNeeds?: string;
  rdRequirements: string;
  sampleRequirements: string;
  productionRequirements: string;
  lastUpdated: string;
  dynamicData?: Record<string, any>;
}

export interface CustomerFeedback extends BaseEntity {
  customerName: string;
  content: string;
  source: string;
  status: '待处理' | '处理中' | '已解决';
  projectId?: string;
  department?: string;
  assignee?: string;
}

export interface KnowledgeItem extends BaseEntity {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface PerformanceMetric {
  id: string;
  userId: string;
  userName: string;
  period: string;
  score: number;
  metrics: {
    [key: string]: {
      label: string;
      value: string | number;
      target: string | number;
    };
  };
}

export interface CustomerCase extends BaseEntity {
  title: string;
  industry: string;
  marketScenario?: string;
  productCategory?: string;
  painPoints: string[];
  solution: string;
  metrics: string;
  valueStatement: string;
  tags: string[];
  images?: string[];
  attachments?: string[];
  productIds?: string[];
  productCategoryIds?: string[];
  productSeriesIds?: string[];
  customerId?: string;
  projectId?: string;
}

export interface PotentialCustomer {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeChatGroupSettings extends BaseEntity {
  groupName: string;
  groupType: '微信群' | '1688' | '个人微信' | '企业微信' | '官网' | '淘宝';
  ownerId: string;
  memberCount: number;
  status: 'active' | 'inactive';
}

export interface ChatRecord extends BaseEntity {
  groupId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'voice' | 'file';
  channelType: '微信群' | '1688' | '个人微信' | '企业微信' | '官网' | '淘宝';
}

export interface Competitor extends BaseEntity {
  name: string;
  advantages?: string;
  disadvantages?: string;
  positioning?: string;
  productProfiles?: Array<{
    productName: string;
    benchmarkCategory: string;
    advantages?: string;
    disadvantages?: string;
  }>;
}

export interface CustomerCompetitor extends BaseEntity {
  customerId: string;
  competitorId: string;
  threatLevel?: '高' | '中' | '低' | string;
  notes?: string;
  competitor?: Competitor; // Expanded for UI
}
