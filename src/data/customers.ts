import { Customer, CustomerPersona, CustomerFeedback } from '../types';

export const mockCustomers: Customer[] = [
  {
    id: 'CUS-20260317-001',
    name: '四信通信',
    level: '战略客户',
    status: '活跃',
    industry: '工业物联网',
    source: '展会',
    region: '华南',
    salesRep: '张三',
    wechatGroup: '四信通信-项目沟通群',
    contacts: [
      { 
        id: 'CON1', 
        name: '王总', 
        position: '采购总监', 
        department: '采购部',
        orgBelonging: '决策部门',
        participationDepth: '核心决策，全程参与',
        phone: '13800138000', 
        email: 'wang@sixin.com', 
        isPrimary: true,
        buyingRole: '经济买家',
        buyingMode: '平稳模式',
        attitude: '中立，关注成本与稳定性',
        winResults: {
          result: '降低年度采购成本5%',
          win: '获得年度优秀供应商管理奖'
        },
        relationshipQuality: {
          privateRelation: '一般，仅限于商务往来',
          trustLevel: '中等'
        },
        spinPainPoints: {
          problem: '现有供应商交期不准',
          implication: '导致生产线停工待料，损失巨大'
        },
        infoSharingLevel: '较低，仅分享必要商务信息'
      },
      { 
        id: 'CON2', 
        name: '李工', 
        position: '研发经理', 
        department: '研发部',
        orgBelonging: '发起部门',
        participationDepth: '技术评估，方案制定',
        phone: '13800138001', 
        email: 'li@sixin.com', 
        isPrimary: false,
        buyingRole: '技术买家',
        buyingMode: '增长模式',
        attitude: '积极，追求技术领先',
        winResults: {
          result: '提升产品防水等级至IP68',
          win: '个人技术突破，获得内部创新奖'
        },
        relationshipQuality: {
          privateRelation: '较好，经常交流技术趋势',
          trustLevel: '高'
        },
        spinPainPoints: {
          problem: '高频信号传输不稳定',
          implication: '影响产品核心竞争力'
        },
        infoSharingLevel: '高，愿意分享技术路线图'
      }
    ],
    followUps: [
      { id: 'F1', date: '2026-03-10', type: '现场拜访', content: '讨论5G天线项目进度，客户对样品满意。', author: '张三' },
      { id: 'F2', date: '2026-03-15', type: '微信跟进', content: '确认下周小批量产订单。', author: '张三' }
    ],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-01',
    customVisitFrequency: 7,
    latestNextVisitTime: '2026-04-09'
  },
  {
    id: 'CUS-20260317-002',
    name: '大疆创新',
    level: '战略客户',
    status: '活跃',
    industry: '无人机',
    source: '官网咨询',
    region: '华南',
    salesRep: '张三',
    wechatGroup: '大疆创新-项目沟通群',
    contacts: [
      { id: 'CON3', name: '陈工', position: '结构工程师', phone: '13900139000', email: 'chen@dji.com', isPrimary: true }
    ],
    followUps: [
      { id: 'F3', date: '2026-03-12', type: '电话跟进', content: '云台排线样品测试反馈，需要微调长度。', author: '张三' }
    ],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-05',
    customVisitFrequency: 14,
    latestNextVisitTime: '2026-04-16'
  }
];

export const mockCustomerPersonas: CustomerPersona[] = [
  {
    id: 'CP1',
    customerId: 'CUS-20260317-001',
    scale: '500-1000人',
    mainProducts: '5G工业路由器、DTU、边缘计算网关',
    orgStructure: '采购部负责商务，研发部负责技术准入，总经理最终签字',
    buyingMode: '增长模式',
    painPoints: '现有供应商交期不稳定，导致停机损失；防水等级达不到IP68，影响户外应用',
    competitiveLandscape: {
      supplier: '某国际知名品牌',
      preference: '倾向于寻找高性价比的国产替代方案'
    },
    uniqueNeeds: '需要定制化防水接头，支持高频信号传输，且需提供详细的可靠性测试报告',
    rdRequirements: '需要定制化防水接头，支持高频信号传输',
    sampleRequirements: '样品周期需控制在7天内',
    productionRequirements: '年需求量约10万套，分批交付',
    lastUpdated: '2026-03-15'
  }
];

export const mockPersonas = mockCustomerPersonas;

export const mockCustomerFeedback: CustomerFeedback[] = [
  {
    id: 'CF1',
    customerName: '海康威视',
    content: '上周交付的1000条防水线束在户外测试中发现有30条出现渗水现象，导致设备短路。',
    source: '邮件',
    status: '处理中',
    projectId: 'XM2603173188',
    department: '品质部',
    assignee: '品质主管',
    creatorId: 'A4',
    creatorNo: 'A4',
    creatorName: 'Delivery Agent',
    createDate: '2026-03-31'
  }
];

export const mockCustomerFeedbacks = mockCustomerFeedback;
