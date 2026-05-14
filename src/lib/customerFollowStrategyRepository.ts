import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type FocusPointProfile = {
  id: string;
  name: string; // 关注点
  positions: string[]; // 对应的顾客岗位
  askMethod: string; // 如何询问关注点
  metric: string; // 关注点对应指标
};

export type FollowStrategyRule = {
  id: string;
  name: string;
  positionKeywords: string[];
  roleTags: Array<'A' | 'D' | 'S' | 'E' | 'I'>;
  attitudeMin: number;
  attitudeMax: number;
  influenceMin: number;
  influenceMax: number;
  relationMin: number;
  relationMax: number;
  contextSources?: string[];
  promptTemplate: string;
};

export type CompanyIntroTemplate = {
  vision: string; // 公司愿景/定位
  business: string; // 主营业务/行业地位
  advantages: string; // 核心优势
  cases: string; // 知名案例
};

export type PersonalIntroTemplate = {
  id: string;
  position: string; // 适用岗位
  identity: string; // 我是谁
  value: string; // 我能为你提供什么价值
  background: string; // 我的专业背景/过往成绩
  commitment: string; // 我对本次合作的承诺
};

export type CustomerFollowStrategyConfig = {
  focusPoints: FocusPointProfile[];
  rules: FollowStrategyRule[];
  companyIntro?: CompanyIntroTemplate;
  personalIntros?: PersonalIntroTemplate[];
  contactSearchPrompt?: string;
};

const CONFIG_ROW_ID = 'default';

export const defaultCustomerFollowStrategyConfig: CustomerFollowStrategyConfig = {
  contactSearchPrompt: [
    '你是B2B销售联系人研究员，请根据客户名称、联系人姓名、手机号、职位进行网络检索与多源交叉验证（官网/新闻/工商/招聘/演讲/社媒公开资料等）。',
    '目标：补齐联系人字段，并重点提炼其视频号、抖音、小红书等社媒行为线索。',
    '输出要求：',
    '1) 仅输出 JSON 对象，不要代码块，不要额外解释；',
    '2) 字段仅允许：name, position, phone, email, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior；',
    '3) 联系人姓名必须带“AI”后缀；',
    '4) 无可靠证据的字段留空字符串；',
    '5) socialMediaBehavior 要总结该联系人公开社媒行为特征与内容偏好；',
    '6) 所有结论必须基于交叉验证，不得编造。'
  ].join('\n'),
  companyIntro: {
    vision: '成为全球领先的智能连接解决方案提供商。',
    business: '专注于高端连接器研发制造，在新能源汽车与工控领域位居国内前三。',
    advantages: '拥有全链条自主研发能力，交付周期比行业平均快30%，不良率控制在0.1%以内。',
    cases: '已深度服务比亚迪、大疆、宁德时代等行业龙头，连续3年获评核心供应商。'
  },
  personalIntros: [
    {
      id: 'pi_1',
      position: '大客户销售',
      identity: '您好，我是负责华南区大客户业务的张三。',
      value: '我不仅为您提供产品报价，更希望能作为您的内部连接器专家，帮您规避选型风险，优化BOM成本。',
      background: '我在电子元器件行业有8年从业经验，主导过多个千万级新能源项目导入。',
      commitment: '在接下来的合作中，我会保证2小时内响应您的任何需求，并对交付进度负责到底。'
    }
  ],
  focusPoints: [
    {
      id: 'fp_1',
      name: '业务结果',
      positions: ['总经理', '总裁', '业务负责人'],
      askMethod: '您对目前业务达成的最大期望是什么？',
      metric: '营收增长率、利润率'
    },
    {
      id: 'fp_2',
      name: '风险控制',
      positions: ['总经理', '法务总监'],
      askMethod: '在这个项目中，您最担心的风险点在哪里？',
      metric: '合规性、稳定性'
    },
    {
      id: 'fp_3',
      name: '成本',
      positions: ['采购', '供应链', '商务'],
      askMethod: '针对这个项目，预算和成本优化的目标是多少？',
      metric: 'TCO、采购单价'
    },
    {
      id: 'fp_4',
      name: '交付稳定性',
      positions: ['采购', '供应链', '项目经理'],
      askMethod: '对于项目交付时间节点，有哪些硬性要求？',
      metric: '按时交付率、良品率'
    }
  ],
  rules: [
    {
      id: 'sr_1',
      name: '决策层攻坚（A/D）',
      positionKeywords: ['总', '总监', '总经理'],
      roleTags: ['A', 'D'],
      attitudeMin: -2,
      attitudeMax: 1,
      influenceMin: 3,
      influenceMax: 5,
      relationMin: 1,
      relationMax: 3,
      contextSources: ['customer_name', 'customer_profile', 'customer_focus_archive', 'contact_persona', 'meeting_records'],
      promptTemplate:
        '请基于华为大客户销售方法，为客户{customer_name}联系人{contact_name}制定“决策层攻坚”跟进策略。输入：职位{position}，角色{roleTag}，态度{attitudeScore}，影响力{influenceLevel}，关系{relationLevel}。输出：1) 关键诉求验证问题 2) 高层价值话术 3) 风险兜底方案 4) 下一次拜访任务建议。'
    },
    {
      id: 'sr_2',
      name: '技术评审推进（E/D）',
      positionKeywords: ['技术', '架构', '研发', '工程'],
      roleTags: ['E', 'D'],
      attitudeMin: -1,
      attitudeMax: 2,
      influenceMin: 2,
      influenceMax: 5,
      relationMin: 1,
      relationMax: 4,
      contextSources: ['customer_name', 'customer_focus_archive', 'contact_persona', 'chat_records', 'meeting_records'],
      promptTemplate:
        '请为联系人{contact_name}制定“技术评审推进”策略：围绕技术风险、集成周期、验证路径给出沟通话术，并给出可执行拜访任务清单。输入：{position} {roleTag} 态度{attitudeScore} 影响力{influenceLevel} 关系{relationLevel}。'
    },
    {
      id: 'sr_3',
      name: '采购谈判推进（D/S）',
      positionKeywords: ['采购', '供应链', '商务'],
      roleTags: ['D', 'S'],
      attitudeMin: -1,
      attitudeMax: 2,
      influenceMin: 2,
      influenceMax: 5,
      relationMin: 1,
      relationMax: 4,
      contextSources: ['customer_name', 'customer_focus_archive', 'email_records', 'wechat_records', 'meeting_records'],
      promptTemplate:
        '请为联系人{contact_name}制定“采购谈判推进”建议，重点包含：价格与价值对齐、条款博弈、交付保障、内部签批推进。输入：职位{position} 角色{roleTag} 态度{attitudeScore} 影响力{influenceLevel} 关系{relationLevel}。'
    },
    {
      id: 'sr_4',
      name: '支持者放大（S/I）',
      positionKeywords: [],
      roleTags: ['S', 'I'],
      attitudeMin: 0,
      attitudeMax: 2,
      influenceMin: 1,
      influenceMax: 4,
      relationMin: 2,
      relationMax: 4,
      contextSources: ['customer_name', 'customer_focus_archive', 'contact_persona', 'wechat_records'],
      promptTemplate:
        '请为联系人{contact_name}制定“支持者放大”方案：包括内部扩散动作、跨层引荐动作、信息同步节奏与拜访任务安排。输入：职位{position}，角色{roleTag}，态度{attitudeScore}，影响力{influenceLevel}，关系{relationLevel}。'
    }
  ]
};

const normalizeContextSources = (sources: any): string[] => {
  const arr = Array.isArray(sources) ? sources : [];
  const merged = Array.from(new Set(['customer_focus_archive', ...arr.map((x) => String(x || '').trim()).filter(Boolean)]));
  return merged.filter((x) => x !== 'persona_summary');
};

const normalizeConfig = (raw: any): CustomerFollowStrategyConfig => ({
  focusPoints: Array.isArray(raw?.focusPoints) && raw.focusPoints.length > 0 ? raw.focusPoints : defaultCustomerFollowStrategyConfig.focusPoints,
  rules: Array.isArray(raw?.rules) && raw.rules.length > 0
    ? raw.rules.map((r: any) => ({ ...r, contextSources: normalizeContextSources(r?.contextSources) }))
    : defaultCustomerFollowStrategyConfig.rules.map((r) => ({ ...r, contextSources: normalizeContextSources(r.contextSources) })),
  companyIntro: raw?.companyIntro ? raw.companyIntro : defaultCustomerFollowStrategyConfig.companyIntro,
  personalIntros: Array.isArray(raw?.personalIntros) && raw.personalIntros.length > 0 ? raw.personalIntros : defaultCustomerFollowStrategyConfig.personalIntros,
  contactSearchPrompt: String(raw?.contactSearchPrompt || defaultCustomerFollowStrategyConfig.contactSearchPrompt || '')
});

export const fetchCustomerFollowStrategyConfig = async (): Promise<CustomerFollowStrategyConfig> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('crm_customer_follow_strategy_config')
        .select('*')
        .eq('id', CONFIG_ROW_ID)
        .maybeSingle();
      if (!error && data?.config) {
        return normalizeConfig(data.config);
      }
    } catch (error) {
      console.error('fetchCustomerFollowStrategyConfig supabase failed:', error);
    }
  }
  return defaultCustomerFollowStrategyConfig;
};

export const saveCustomerFollowStrategyConfig = async (config: CustomerFollowStrategyConfig) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_customer_follow_strategy_config').upsert({
    id: CONFIG_ROW_ID,
    config,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if (error) throw error;
};
