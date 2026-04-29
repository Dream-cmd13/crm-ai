import { Inquiry, Lead, Opportunity, Project, CommunicationDetail, Customer, CustomerCase, CustomerPersona, CustomerFeedback } from '../types';

export const mockCommunications: CommunicationDetail[] = [
  { id: 'C1', date: '2026-03-17 10:00', sender: '陈工 (大疆)', content: '您好，我们正在寻找一款用于新一代云台的高柔性排线，需要支持在-40度环境下工作。', type: 'wechat', sourceId: 'INQ-20260317-001' },
  { id: 'C2', date: '2026-03-17 10:15', sender: '张三 (销售)', content: '陈工您好，没问题。我们有专门针对极寒环境的氟塑料排线方案。请问贵司目前的弯折寿命要求是多少？', type: 'wechat', sourceId: 'INQ-20260317-001' },
  { id: 'C3', date: '2026-03-17 10:30', sender: '陈工 (大疆)', content: '要求至少100万次往复弯折。目前用的某品牌在低温下容易脆裂。', type: 'wechat', sourceId: 'INQ-20260317-001' },
  { id: 'C4', date: '2026-03-18 14:00', sender: '张三 (销售)', content: '陈工，报价方案已发您邮箱。包含ROI测算，预计能为贵司降低15%的综合售后成本。', type: 'wechat', sourceId: 'OPP-20260317-001' },
  { id: 'C5', date: '2026-03-18 15:00', sender: '陈工 (大疆)', content: '收到，方案很专业。我已转发给采购总监，下周安排技术对标。', type: 'wechat', sourceId: 'OPP-20260317-001' }
];

export const mockBusinessCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: '大疆创新',
    level: '战略客户',
    status: '活跃',
    industry: '无人机',
    source: '官网询盘',
    region: '广东深圳',
    salesRep: '张三',
    contacts: [
      {
        id: 'CON-001',
        name: '陈工',
        position: '结构工程师',
        department: '研发部',
        orgBelonging: '发起部门',
        participationDepth: '技术评估，方案制定',
        phone: '13900139000',
        email: 'chen@dji.com',
        isPrimary: true,
        personality: '严谨、专业',
        buyingRole: '技术买家',
        buyingMode: '增长模式',
        attitude: '积极配合，对新技术感兴趣',
        winResults: {
          result: '解决云台排线低温断裂问题',
          win: '项目按期交付，获得内部技术奖'
        },
        relationshipQuality: {
          privateRelation: '良好，有共同的技术话题',
          trustLevel: '高'
        },
        spinPainPoints: {
          problem: '现有供应商低温性能达不到要求',
          implication: '导致新机型上市推迟'
        },
        infoSharingLevel: '高',
        keyConcerns: '产品可靠性、低温性能'
      }
    ],
    followUps: [],
    createDate: '2026-03-17',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    inquiryIds: ['INQ-20260317-001'],
    leadIds: ['LEAD-20260317-001'],
    opportunityIds: ['OPP-20260317-001'],
    projectIds: ['PROJ-20260317-001']
  }
];

// Historical alias kept for pages still importing mockCustomers from ../data
export const mockCustomers: Customer[] = mockBusinessCustomers;

export const mockPersonas: CustomerPersona[] = [
  {
    id: 'PER-20260317-001',
    customerId: 'CUST-001',
    scale: '大型制造企业',
    mainProducts: '无人机整机与核心模组',
    orgStructure: '研发主导，采购与质量协同决策',
    buyingMode: '增长模式',
    painPoints: '低温工况下排线脆裂、交期与一致性风险',
    competitiveLandscape: {
      supplier: '多家连接器与线束供应商并行',
      preference: '优先稳定交付与快速技术响应'
    },
    uniqueNeeds: '高弯折寿命、极寒环境可靠性、快速试样',
    rdRequirements: '支持极寒材料验证与结构协同设计',
    sampleRequirements: '7-10天内样品交付并附测试报告',
    productionRequirements: '量产一致性与批次追溯能力',
    lastUpdated: '2026-03-18'
  }
];

export const mockCustomerFeedbacks: CustomerFeedback[] = [
  {
    id: 'FDB-20260320-001',
    customerName: '大疆创新',
    content: '首批样品低温弯折测试通过，但希望进一步缩短二次打样周期。',
    source: '微信',
    status: '处理中',
    projectId: 'PROJ-20260317-001',
    department: '研发中心',
    assignee: '张三',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-20'
  },
  {
    id: 'FDB-20260322-002',
    customerName: '大疆创新',
    content: '希望报价单增加不同年采购量下的阶梯价格。',
    source: '邮件',
    status: '待处理',
    projectId: 'PROJ-20260317-001',
    department: '销售一组',
    assignee: '李四',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-22'
  }
];

export const mockInquiries: Inquiry[] = [
  {
    id: 'INQ-20260317-001',
    date: '2026-03-17',
    companyName: '大疆创新',
    customerName: '陈工',
    contact: '13900139000',
    sourceChannel: '官网',
    category: '线束',
    productSeries: '排线系列',
    province: '广东',
    situation: '云台高柔性排线定制，需耐低温-40度，弯折100万次',
    status: '已转线索',
    creator: '张三',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17',
    communicationDetails: mockCommunications.filter(c => c.sourceId === 'INQ-20260317-001'),
    aiAnalysis: {
      inquiryType: '定制需求',
      profile: '大疆创新是全球领先的无人机制造商，对核心零部件的可靠性要求极高。',
      warmerScript: '陈工，针对极寒环境下的弯折脆裂，我们曾为某极地科考设备提供过方案，通过改变护套分子结构解决了低温硬化问题。',
      suggestedQuestions: [
        '目前的脆裂问题是出现在研发测试阶段，还是已经影响到了售后返修率？',
        '如果新方案能提升50%的低温柔韧性，对贵司产品的市场竞争力有何提升？'
      ],
      industryPainPoints: '低温环境下的材料脆化与信号传输稳定性。'
    }
  }
];

export const mockLeads: Lead[] = [
  {
    id: 'LEAD-20260317-001',
    inquiryId: 'INQ-20260317-001',
    customerName: '大疆创新',
    name: '陈工',
    phone: '13900139000',
    customerAction: '官网留言咨询云台排线',
    industry: '无人机',
    status: '转商机',
    assignee: '张三',
    entryTime: '2026-03-17',
    channelPlatform: '官网',
    source: '线上咨询',
    productCategory: '线束',
    productSeries: '排线系列',
    sourceStatus: '活跃',
    creator: '张三',
    department: '销售一组',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17',
    communicationDetails: mockCommunications.filter(c => c.sourceId === 'INQ-20260317-001'),
    aiAnalysis: {
      buyingMode: '增长模式',
      intentScore: 92,
      spinQuestions: {
        situation: ['贵司目前云台排线的月均出货量是多少？'],
        problem: ['在极寒环境下，现有的排线是否出现过断裂或信号传输不稳的情况？'],
        implication: ['如果因为排线寿命导致云台在保修期内失效，对贵司的品牌声誉和售后成本有何影响？'],
        needPayoff: ['如果排线弯折寿命提升30%，是否能显著降低贵司的售后返修率？']
      },
      impactCase: {
        title: '某知名无人机厂商高频弯折优化案例',
        metrics: '售后返修率降低25%',
        description: '通过采用我司定制的高柔性排线，解决了客户在低温环境下的断裂问题。',
        valueStatement: '陈工，我们曾帮一个类似规模的无人机客户将排线寿命提升了30%，成功将其售后返修率降低了25%。'
      },
      decisionChain: {
        economicBuyer: '采购总监/研发VP',
        technicalBuyer: '陈工 (结构工程师)',
        userBuyer: '售后服务经理',
        coach: '陈工',
        missingRoles: ['经济买家']
      },
      summaryEmailDraft: '陈工您好，感谢沟通。我们确认了贵司在云台排线弯折寿命方面的核心挑战...'
    }
  }
];

export const mockOpportunities: Opportunity[] = [
  {
    id: 'OPP-20260317-001',
    leadId: 'LEAD-20260317-001',
    inquiryId: 'INQ-20260317-001',
    customerName: '大疆创新',
    oppDate: '2026-03-17',
    status: '转项目',
    oppSummary: '大疆新一代云台高柔性排线定制项目',
    productLine: '工业线束',
    salesRep: '张三',
    projectManager: '赵六',
    productOwner: '钱七',
    oppLevel: 'S级',
    intentAmount: '1,200,000',
    associatedProject: 'XM20260317-001',
    endCustomer: '大疆创新',
    endProject: '御系列新机型',
    salesType: '定制开发',
    productIndustry: '无人机',
    productSeries: '高柔性排线',
    completeness: 85,
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17',
    communicationDetails: mockCommunications.filter(c => c.sourceId === 'INQ-20260317-001' || c.sourceId === 'OPP-20260317-001'),
    aiAnalysis: {
      winProbability: 88,
      spinAnalysis: {
        situation: '大疆新机型研发中，排线为核心痛点',
        problem: '现有供应商无法满足-40度下的100万次弯折',
        implication: '若不解决，将导致新机型推迟上市或面临大规模召回风险',
        needPayoff: '需要一款能通过极端环境测试的定制化排线',
        deepQuestions: ['如果新机型因为排线问题推迟一个月上市，贵司的损失大概是多少？']
      },
      blueSheet: {
        economicBuyer: { name: '李总', position: '采购总监', status: '未接触', winResult: '降低售后成本，提升供应链稳定性' },
        technicalBuyer: { name: '陈工', position: '结构工程师', status: '已接触', winResult: '解决技术难题，确保项目按期交付' },
        userBuyer: { name: '王经理', position: '售后经理', status: '未接触', winResult: '减少客户投诉，降低返修压力' },
        coach: { name: '陈工', position: '结构工程师', status: '已接触', winResult: '个人职业成就感' }
      },
      teachingStory: {
        concept: '从“买排线”转向“买飞行稳定性保障”',
        impactCase: '某极地科考无人机项目',
        valueStatement: '陈工，我们提供的不仅仅是排线，而是确保贵司新机型在极地环境下也能稳定飞行的保障。'
      },
      redFlags: [
        { risk: '未接触经济买家', severity: '高', description: '采购总监尚未直接参与对标，需陈工引荐。' }
      ],
      summaryEmailDraft: '陈工您好，基于我们的技术对标，我司方案完全满足-40度100万次弯折要求...'
    }
  }
];

export const mockCustomerCases: CustomerCase[] = [
  {
    id: 'CASE-001',
    title: '某全球领先无人机厂商高频弯折优化案例',
    industry: '无人机/机器人',
    painPoints: ['低温环境下材料脆化', '信号传输不稳', '售后返修率高'],
    solution: '采用定制化氟塑料配方，优化护套分子结构，提升低温柔韧性。',
    metrics: '售后返修率降低25%，弯折寿命提升30%',
    valueStatement: '通过材料创新解决极端环境下的可靠性问题，确保新机型按期上市。',
    tags: ['高柔性', '耐低温', '定制开发'],
    createDate: '2026-01-15',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三'
  },
  {
    id: 'CASE-002',
    title: '医疗内窥镜超细线束高密度集成方案',
    industry: '医疗器械',
    painPoints: ['空间极度受限', '信号干扰严重', '生物兼容性要求'],
    solution: '极细同轴线加工工艺，多层屏蔽结构设计，符合ISO 10993生物兼容性。',
    metrics: '体积缩小40%，信号信噪比提升15dB',
    valueStatement: '在极小空间内实现高质量图像传输，助力微创手术精准化。',
    tags: ['极细同轴', '生物兼容', '高屏蔽'],
    createDate: '2026-02-10',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三'
  },
  {
    id: 'CASE-003',
    title: '某极地科考设备低温排线替换方案',
    industry: '特种设备',
    painPoints: ['低温脆裂', '信号传输中断', '维护成本极高'],
    solution: '采用氟塑料改性材料，配合多股绞合工艺。',
    metrics: '故障率降低95%，维护成本节省200万/年',
    tags: ['低温', '高可靠性', '氟塑料'],
    valueStatement: '我们不仅提供线材，更提供在极端环境下确保任务成功的保障。',
    createDate: '2026-03-10',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三'
  },
  {
    id: 'CASE-004',
    title: '工业机器人百万次弯折寿命提升项目',
    industry: '工业自动化',
    painPoints: ['寿命短', '停机损失大', '更换频繁'],
    solution: '引入IMPACT价值模型，重新设计内部绞合节距。',
    metrics: '寿命提升140%，停机时间减少60%',
    tags: ['高寿命', '机器人', 'IMPACT'],
    valueStatement: '通过精密设计，将您的设备运行效率推向极致。',
    createDate: '2026-03-15',
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三'
  }
];

export const mockProjects: Project[] = [
  {
    id: 'XM20260317-001',
    opportunityId: 'OPP-20260317-001',
    leadId: 'LEAD-20260317-001',
    inquiryId: 'INQ-20260317-001',
    projectName: '大疆云台高柔性排线研发项目',
    projectType: '研发型项目',
    customerName: '大疆创新',
    projectLevel: 'S',
    health: '绿',
    stage: '设计阶段',
    status: '跟进中',
    oppSummary: '大疆新一代云台高柔性排线定制项目',
    intentAmount: '1,200,000',
    estimatedUsage: '200,000',
    team: {
      sales: '张三',
      pm: '赵六',
      product: '钱七',
      quality: '孙八',
      purchasing: '周九',
      fae: '吴十'
    },
    wechatGroup: '大疆-云台排线项目对标群',
    updateDate: '2026-03-18',
    communicationDetails: [
      ...mockCommunications.filter(c => c.sourceId === 'INQ-20260317-001'),
      { id: 'C4', date: '2026-03-18 14:00', sender: '张三 (销售)', content: '陈工，报价方案已发您邮箱。包含ROI测算，预计能为贵司降低15%的综合售后成本。', type: 'wechat' },
      { id: 'C5', date: '2026-03-18 15:00', sender: '陈工 (大疆)', content: '收到，方案很专业。我已转发给采购总监，下周安排技术对标。', type: 'wechat' }
    ],
    notes: [
      { id: 'N1', author: '张三', role: '业务员', content: '已完成初步需求确认，进入方案设计阶段。', date: '2026-03-18' }
    ],
    creatorId: 'U1',
    creatorNo: 'E001',
    creatorName: '张三',
    createDate: '2026-03-17',
    aiAnalysis: {
      conceptualSelling: {
        roi测算: '预计降低售后返修成本约180万/年，提升品牌溢价。',
        economicBuyerScript: '李总，我们的方案虽然单价略高，但通过提升首年稳定性，可以为您节省数倍的售后物流和维修成本。',
        technicalBuyerScript: '陈工，我们采用了特殊的氟塑料配方，确保在-40度下依然保持极佳的柔韧性。'
      },
      redFlags: [
        { risk: '样品测试周期长', severity: '中', description: '100万次弯折测试约需3周，需提前协调实验室资源。' }
      ],
      sampleServicePackage: {
        installationGuide: '云台排线安装张力控制指南',
        troubleshootingTips: '低温环境下信号衰减的补偿建议'
      },
      challengerScripts: {
        priceObjection: '陈工，如果为了节省几毛钱的成本而面临新机型召回的风险，这是否符合贵司的质量战略？',
        valueDefense: '我们的价值在于确保您的项目按期交付且无后顾之忧。'
      },
      orderWarning: {
        isDelayed: false,
        daysSinceApproval: 0,
        coachAdvice: '目前进度正常，下周需跟进采购合同细节。'
      }
    }
  }
];
