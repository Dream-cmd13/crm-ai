import { OntologyObject, SystemFunction } from '../types/ontology';

export const initialObjects: OntologyObject[] = [
  {
    id: '1', name: '询盘', code: 'Inquiry', description: '客户发起的初步咨询',
    systemLink: 'inquiries表 / 询盘管理模块',
    properties: [
      { id: 'p1', name: '询盘编号', code: 'inquiryNo', type: 'String', required: true },
      { id: 'p2', name: '客户名称', code: 'customerName', type: 'String', required: true },
      { id: 'p_cust_id', name: '客户ID', code: 'customerId', type: 'String', required: false },
      { id: 'p3', name: '询盘内容', code: 'content', type: 'Text', required: false },
      { id: 'p4', name: '来源', code: 'source', type: 'Enum', required: true, options: [
        { value: 'website', label: '官网' },
        { value: '1688', label: '1688' },
        { value: 'exhibition', label: '展会' },
        { value: 'referral', label: '客户介绍' }
      ]},
      { id: 'p5', name: '状态', code: 'status', type: 'Enum', required: true, options: [
        { value: 'pending', label: '待处理' },
        { value: 'processing', label: '处理中' },
        { value: 'converted', label: '已转线索' },
        { value: 'closed', label: '已关闭' }
      ]},
      { id: 'p6', name: '产品类别', code: 'productCategory', type: 'String', required: false },
      { id: 'p7', name: '产品系列', code: 'productSeries', type: 'String', required: false },
      { id: 'p8', name: '购买模式', code: 'buyingMode', type: 'Enum', required: false, options: [
        { value: 'direct', label: '直接购买' },
        { value: 'tender', label: '招标' },
        { value: 'agent', label: '代理商' }
      ]},
      { id: 'p9', name: '意向分级', code: 'intentScore', type: 'Number', required: false },
      { id: 'p_attach', name: '附件', code: 'attachments', type: 'Attachment', required: false },
      { id: 'p_img', name: '图片', code: 'images', type: 'Image', required: false },
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '多个询盘对应一个客户' },
      { id: 'r_comm', targetObject: 'CommunicationLog', relationType: '1:N', description: '询盘沟通记录' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '负责跟进的员工' }
    ],
    flows: [
      {
        id: 'flow_inquiry_on_create',
        name: '询盘阶段任务流',
        description: '询盘新增时自动生成阶段任务，任务内可重复点击 AI 获取建议。',
        triggerType: 'auto',
        triggerCondition: 'on_create',
        sopPromptConfig: {
          prefix: '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。请结合阶段目标、最新客户沟通记录，输出推进动作。'
        },
        sopOqarConfig: {
          enabled: true,
          suggestedQuestions: [
            '本次推进里，您最关注交付时间还是效果达成？',
            '如果先做小范围试点，您希望验证哪两个指标？'
          ],
          replyPrompt: '你是大客户销售顾问，请按 OQAR 输出建议回复。\n输出格式：\n【Observe】：复述客户问题并确认焦点\n【Qualify】：识别阶段风险与机会\n【Answer】：给可直接发送的回复话术\n【Request】：给后续建议提问（1个封闭+1个开放）'
        },
        nodes: [
          {
            id: 'inq_s1',
            name: '阶段1-受理与补充信息',
            description: '补齐关键信息（客户、产品、场景、预算、时间）并完成首次联系。',
            type: 'manual',
            taskType: '询盘处理',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '你是销售助理，请根据询盘信息给出“必须补齐的信息清单（字段级）+首次联系话术+3个SPIN问题”。询盘信息：客户={{companyName}}，省份={{province}}，产品系列={{productSeries}}，类别={{category}}，情况={{situation}}',
                inputs: []
              },
              fields: [],
              taskType: '询盘处理',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'inq_s2',
            name: '阶段2-需求澄清与资格评估',
            description: '完成BANT与决策链评估，判断是否具备转线索条件。',
            type: 'manual',
            taskType: '询盘处理',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '基于询盘信息，输出：BANT评估（缺口/证据/下一步提问）、Buying Influences（经济/技术/用户/教练）识别建议、是否建议转线索（是/否/待补充）及原因。',
                inputs: []
              },
              fields: [],
              taskType: '询盘处理',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'inq_s3',
            name: '阶段3-转线索准备',
            description: '整理线索关键字段并发起转线索。',
            type: 'manual',
            taskType: '线索判定',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出“转线索必填字段清单+推荐默认值+风险提示（≥3条）”。',
                inputs: []
              },
              fields: [],
              taskType: '线索判定',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'inq_s4',
            name: '阶段4-关闭或转化复盘',
            description: '若未转化，记录原因与复盘；若已转化，确认线索已创建并交接。',
            type: 'manual',
            taskType: '询盘处理',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请基于当前信息给出“未转化原因候选（可选项）+改进建议+下次同类询盘的处理要点”。',
                inputs: []
              },
              fields: [],
              taskType: '询盘处理',
              assigneeRule: '当前处理人'
            }
          }
        ]
      },
      {
        id: 'flow_inq_1',
        name: '询盘处理标准流',
        description: '从询盘接收到转线索的全过程',
        triggerType: 'auto',
        triggerCondition: 'status == "pending"',
        nodes: [
          {
            id: 'n1', name: '询盘深度分析', description: 'AI辅助分析询盘内容、提取画像及行业痛点',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '请分析以下询盘内容：{param1}，并提取客户画像和意向评分。',
                inputs: [
                  { id: 'param1', name: '询盘内容', type: 'current_field', currentFieldCode: 'content' }
                ]
              },
              fields: [
                { fieldId: 'p_profile', label: '客户画像', type: 'Text', updateTarget: 'profile' },
                { fieldId: 'p9', label: '意向评分', type: 'Number', updateTarget: 'intentScore' }
              ]
            },
            taskType: '询盘分析',
            assignedRole: '业务员'
          },
          {
            id: 'c1', name: '意向分级判断', description: '根据AI评分决定后续路径',
            type: 'condition',
            conditionConfig: {
              field: 'intentScore',
              operator: '>=',
              results: [
                { id: 'res1', label: '高意向 (>=70)', value: '70' },
                { id: 'res2', label: '中等意向 (40-69)', value: '40' },
                { id: 'res3', label: '低意向 (<40)', value: '0' }
              ]
            }
          },
          {
            id: 'n2', name: '专业预热 (Warmer)', description: 'AI辅助生成针对性的预热话术',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '基于客户画像：{param1}，生成一段专业的预热话术。',
                inputs: [
                  { id: 'param1', name: '客户画像', type: 'current_field', currentFieldCode: 'profile' }
                ]
              },
              fields: [
                { fieldId: 'p_script', label: '预热话术', type: 'Text', updateTarget: 'warmerScript' }
              ]
            },
            taskType: '话术生成',
            assignedRole: '业务员'
          },
          {
            id: 'n3', name: '角色身份识别', description: '识别客户在决策链中的角色',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '分析沟通记录：{param1}，识别客户的角色。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_role', label: '买家角色', type: 'Enum', updateTarget: 'buyerRole' }
              ]
            },
            taskType: '角色识别',
            assignedRole: '业务员'
          },
          {
            id: 'n4', name: '购买模式探测', description: '分析客户的购买动机与模式',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '分析沟通记录：{param1}，探测购买模式。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p8', label: '购买模式', type: 'Enum', updateTarget: 'buyingMode' }
              ]
            },
            taskType: '模式探测',
            assignedRole: '业务员'
          },
          {
            id: 'n5', name: '意向分级与线索判定', description: '综合评估意向并决定是否转为线索',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '请根据当前询盘信息提供处理建议。',
                inputs: [],
                outputFormat: { successField: 'ok', updates: [], failureReasonField: 'err' }
              },
              fields: [{ fieldId: 'p5', label: '处理状态', type: 'Enum', updateTarget: 'status' }],
              fieldDefaults: 'status:converted'
            },
            taskType: '线索判定',
            assignedRole: '业务员'
          }
        ]
      }
    ],
    rules: [],
    statusAnalysis: {
      enabled: true,
      model: 'gemini-3-flash-preview',
      promptTemplate: '你是资深销售教练，请基于米勒·希曼（Miller Heiman）战略/概念销售方法，对“询盘”做状态分析。\n\n【询盘信息】\n客户：{{companyName}}\n省份：{{province}}\n产品系列：{{productSeries}}\n类别：{{category}}\n情况：{{situation}}\n当前状态：{{status}}\n\n【输出要求】\n1）一句话判断：是否值得优先跟进（高/中/低）+原因\n2）Win-Results（客户期望结果 / 我方期望结果）\n3）Buying Influences（经济买家/技术买家/用户买家/教练：当前是否已识别，缺口是什么）\n4）Response Mode（客户更像是成长/麻烦/过度竞争/未知；给出判断依据）\n5）Red Flags（≥3条）与对应对策\n6）下一步行动（≤5条，按优先级排序，可执行到“电话/微信/拜访/资料/报价/样品”等）\n\n请用要点输出。',
      inputs: [
        { id: 'in_companyName', name: 'companyName', type: 'current_field', currentFieldCode: 'companyName' },
        { id: 'in_province', name: 'province', type: 'current_field', currentFieldCode: 'province' },
        { id: 'in_productSeries', name: 'productSeries', type: 'current_field', currentFieldCode: 'productSeries' },
        { id: 'in_category', name: 'category', type: 'current_field', currentFieldCode: 'category' },
        { id: 'in_situation', name: 'situation', type: 'current_field', currentFieldCode: 'situation' },
        { id: 'in_status', name: 'status', type: 'current_field', currentFieldCode: 'status' }
      ]
    }
  },
  { 
    id: '2', name: '线索', code: 'Lead', description: '潜在的销售机会', systemLink: 'leads表 / 线索管理模块',
    properties: [
      { id: 'p1', name: '线索编号', code: 'leadNo', type: 'String', required: true },
      { id: 'p2', name: '联系人', code: 'contactName', type: 'String', required: true },
      { id: 'p3', name: '联系方式', code: 'contactInfo', type: 'String', required: true },
      { id: 'p_cust_id', name: '客户ID', code: 'customerId', type: 'String', required: false },
      { id: 'p4', name: '线索评分', code: 'score', type: 'Number', required: false },
      { id: 'p5', name: '状态', code: 'status', type: 'Enum', required: true, options: [
        { value: 'following', label: '跟进中' },
        { value: 'converted', label: '已转商机' },
        { value: 'closed', label: '已关闭' }
      ]},
      { id: 'p6', name: '来源询盘ID', code: 'inquiryId', type: 'String', required: false },
      { id: 'p7', name: '买家角色', code: 'buyerRole', type: 'Enum', required: false, options: [
        { value: 'decision_maker', label: '决策者' },
        { value: 'influencer', label: '影响者' },
        { value: 'user', label: '使用者' }
      ]},
      { id: 'p8', name: '购买模式', code: 'buyingMode', type: 'Enum', required: false, options: [
        { value: 'direct', label: '直接购买' },
        { value: 'tender', label: '招标' }
      ]},
    ], 
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '归属客户' },
      { id: 'r_comm', targetObject: 'CommunicationLog', relationType: '1:N', description: '线索沟通记录' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '负责跟进的员工' }
    ], 
    flows: [
      {
        id: 'flow_lead_on_create',
        name: '线索阶段任务流',
        description: '线索新增时自动生成阶段任务，任务内可重复点击 AI 获取建议。',
        triggerType: 'auto',
        triggerCondition: 'on_create',
        sopPromptConfig: {
          prefix: '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。请结合阶段目标、最新客户沟通记录，输出推进动作。'
        },
        sopOqarConfig: {
          enabled: true,
          suggestedQuestions: [
            '当前阶段的主要痛点是成本控制还是技术达标？',
            '本次评估的决策流程大概是怎样的？'
          ],
          replyPrompt: '你是大客户销售顾问，请按 OQAR 输出建议回复。\n输出格式：\n【Observe】：复述客户问题并确认焦点\n【Qualify】：识别阶段风险与机会\n【Answer】：给可直接发送的回复话术\n【Request】：给后续建议提问（1个封闭+1个开放）'
        },
        nodes: [
          {
            id: 'lead_s1',
            name: '阶段1-首次跟进与信息校验',
            description: '确认联系人/角色/联系方式，完成首次触达并记录结果。',
            type: 'manual',
            taskType: '线索跟进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请根据线索信息输出：首次触达话术（电话/微信各一版）、3个资格评估问题、以及“下一步行动计划（≤5条）”。',
                inputs: []
              },
              fields: [],
              taskType: '线索跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'lead_s2',
            name: '阶段2-需求挖掘（SPIN）',
            description: '聚焦痛点/决策链/预算/时间，形成清晰需求摘要。',
            type: 'manual',
            taskType: '线索跟进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请基于线索当前信息给出 SPIN 提问清单（≥8条）+预期可获得的证据点+常见反对意见与应对（≥3条）。',
                inputs: []
              },
              fields: [],
              taskType: '线索跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'lead_s3',
            name: '阶段3-方案沟通与会议推进',
            description: '安排会议/演示，补齐关键角色与技术指标。',
            type: 'manual',
            taskType: '线索跟进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出会议大纲（议程+材料清单+问题清单）以及“转商机需要补齐的字段清单（字段级）”。',
                inputs: []
              },
              fields: [],
              taskType: '线索跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'lead_s4',
            name: '阶段4-转商机判定',
            description: '判断是否满足转商机条件（需求明确/预算/时间/角色/竞品）。',
            type: 'manual',
            taskType: '商机判定',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：是否建议转商机（是/否/待补充）+关键缺口+补齐路径+下一步行动（≤5条）。',
                inputs: []
              },
              fields: [],
              taskType: '商机判定',
              assigneeRule: '当前处理人'
            }
          }
        ]
      },
      {
        id: 'flow_lead_1',
        name: '线索培育标准流',
        description: '从线索分配到转商机的全过程',
        triggerType: 'auto',
        triggerCondition: 'status == "following"',
        nodes: [
          {
            id: 'n1', name: '自动画像提取', description: 'AI辅助从沟通记录中提取客户详细画像',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析沟通记录：{param1}，提取客户详细画像。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_profile', label: '客户画像', type: 'Text', updateTarget: 'profile' }
              ]
            },
            taskType: '画像提取',
            assignedRole: '业务员'
          },
          {
            id: 'n2', name: '关键联系人识别', description: '识别并分析关键决策人的性格与偏好',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '识别联系人：{param1}，并分析其偏好。',
                inputs: [
                  { id: 'param1', name: '联系人姓名', type: 'current_field', currentFieldCode: 'contactName' }
                ]
              },
              fields: [
                { fieldId: 'p7', label: '买家角色', type: 'Enum', updateTarget: 'buyerRole' }
              ]
            },
            taskType: '联系人识别',
            assignedRole: '业务员'
          },
          {
            id: 'n3', name: '需求初步确认', description: '确认客户的核心痛点与初步需求',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '分析沟通记录：{param1}，确认客户需求。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_pain', label: '核心痛点', type: 'Text', updateTarget: 'painPoints' }
              ]
            },
            taskType: '需求确认',
            assignedRole: '业务员'
          },
          {
            id: 'n4', name: '意向分级与商机判定', description: '判定是否具备转为商机的条件',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '请根据当前线索信息提供处理建议。',
                inputs: [],
                outputFormat: { successField: 'ok', updates: [], failureReasonField: 'err' }
              },
              fields: [{ fieldId: 'p5', label: '处理状态', type: 'Enum', updateTarget: 'status' }],
              fieldDefaults: 'status:converted'
            },
            taskType: '商机判定',
            assignedRole: '业务员'
          }
        ]
      }
    ],
    rules: [],
    statusAnalysis: {
      enabled: true,
      model: 'gemini-3-flash-preview',
      promptTemplate: '你是资深销售教练，请基于米勒·希曼（Miller Heiman）战略/概念销售方法，对“线索”做状态分析。\n\n【线索信息】\n客户：{{customerName}}\n线索姓名：{{name}}\n手机号：{{phone}}\n来源：{{source}}\n当前状态：{{status}}\n分类标签：{{classification}}\n最后跟进：{{lastFollowUp}}\n备注：{{remarks}}\n\n【输出要求】\n1）一句话判断：是否具备转商机条件（是/否/待补充）+最关键缺口\n2）Win-Results（客户/我方）\n3）Buying Influences：当前已覆盖/缺失的买家角色与补齐路径\n4）Response Mode 判断与依据\n5）Red Flags（≥3条）\n6）转换建议：要转商机需要补齐哪些信息（字段级别列出）\n7）下一步行动（≤5条）\n\n请用要点输出。',
      inputs: [
        { id: 'lead_customerName', name: 'customerName', type: 'current_field', currentFieldCode: 'customerName' },
        { id: 'lead_name', name: 'name', type: 'current_field', currentFieldCode: 'name' },
        { id: 'lead_phone', name: 'phone', type: 'current_field', currentFieldCode: 'phone' },
        { id: 'lead_source', name: 'source', type: 'current_field', currentFieldCode: 'source' },
        { id: 'lead_status', name: 'status', type: 'current_field', currentFieldCode: 'status' },
        { id: 'lead_classification', name: 'classification', type: 'current_field', currentFieldCode: 'classification' },
        { id: 'lead_lastFollowUp', name: 'lastFollowUp', type: 'current_field', currentFieldCode: 'lastFollowUp' },
        { id: 'lead_remarks', name: 'remarks', type: 'current_field', currentFieldCode: 'remarks' }
      ]
    }
  },
  { 
    id: '3', name: '商机', code: 'Opportunity', description: '确认有购买意向的销售机会', systemLink: 'opportunities表 / 商机管理模块',
    properties: [
      { id: 'p1', name: '商机编号', code: 'oppNo', type: 'String', required: true },
      { id: 'p2', name: '预计金额', code: 'amount', type: 'Number', required: true },
      { id: 'p3', name: '销售阶段', code: 'stage', type: 'Enum', required: true, options: [
        { value: 'discovery', label: '需求发现' },
        { value: 'proposal', label: '方案报价' },
        { value: 'negotiation', label: '谈判审核' },
        { value: 'closed_won', label: '赢单' },
        { value: 'closed_lost', label: '输单' }
      ]},
      { id: 'p4', name: '状态', code: 'status', type: 'Enum', required: true, options: [
        { value: 'following', label: '跟进中' },
        { value: 'won', label: '已赢单' },
        { value: 'lost', label: '已输单' }
      ]},
      { id: 'p5', name: '来源线索ID', code: 'leadId', type: 'String', required: false },
      { id: 'p6', name: '来源询盘ID', code: 'inquiryId', type: 'String', required: false },
      { id: 'p7', name: '客户动作', code: 'customerAction', type: 'String', required: false },
      { id: 'p8', name: '产品类别', code: 'productCategory', type: 'String', required: false },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '归属客户' },
      { id: 'r2', targetObject: 'Project', relationType: '1:1', description: '赢单后转化的项目' },
      { id: 'r_comm', targetObject: 'CommunicationLog', relationType: '1:N', description: '商机沟通记录' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '负责跟进的员工' }
    ], 
    flows: [
      {
        id: 'flow_opp_on_create',
        name: '商机阶段任务流',
        description: '商机新增时自动生成阶段任务，任务内可重复点击 AI 获取建议。',
        triggerType: 'auto',
        triggerCondition: 'on_create',
        sopPromptConfig: {
          prefix: '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。请结合阶段目标、最新客户沟通记录，输出推进动作。'
        },
        sopOqarConfig: {
          enabled: true,
          suggestedQuestions: [
            '为了确保我们的方案最契合，您觉得还有哪些细节需要我们在方案中体现？',
            '如果我们能满足这几个关键指标，下一步会进入什么流程？'
          ],
          replyPrompt: '你是大客户销售顾问，请按 OQAR 输出建议回复。\n输出格式：\n【Observe】：复述客户问题并确认焦点\n【Qualify】：识别阶段风险与机会\n【Answer】：给可直接发送的回复话术\n【Request】：给后续建议提问（1个封闭+1个开放）'
        },
        nodes: [
          {
            id: 'opp_s1',
            name: '阶段1-立项评估',
            description: '确认Win-Results、关键角色、竞争态势与最大不确定性。',
            type: 'manual',
            taskType: '商机推进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请基于商机信息输出：Win-Results（客户/我方）、Buying Influences 覆盖情况、竞争假设与证据缺口、红旗（≥5条）与对策。',
                inputs: []
              },
              fields: [],
              taskType: '商机推进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'opp_s2',
            name: '阶段2-方案与报价策略',
            description: '形成解决方案要点、差异化、报价策略与材料清单。',
            type: 'manual',
            taskType: '商机推进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：方案结构（≤8条要点）+报价策略（风险/底线/可让步项）+客户异议清单与应对（≥5条）。',
                inputs: []
              },
              fields: [],
              taskType: '商机推进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'opp_s3',
            name: '阶段3-商务谈判与赢假设',
            description: '明确谈判议题、条件交换、关键人推进路径。',
            type: 'manual',
            taskType: '商机推进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：谈判议题清单（≥6条）+每条的目标/底线/让步策略+关键人推进话术建议。',
                inputs: []
              },
              fields: [],
              taskType: '商机推进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'opp_s4',
            name: '阶段4-转项目准备',
            description: '补齐项目立项字段、交付范围与计划，满足“转项目”条件。',
            type: 'manual',
            taskType: '项目立项',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：转项目所需信息清单（字段级）+交付里程碑建议（≤6条）+风险清单（≥5条）与对策。',
                inputs: []
              },
              fields: [],
              taskType: '项目立项',
              assigneeRule: '当前处理人'
            }
          }
        ]
      },
      {
        id: 'flow_opp_1',
        name: '商机攻坚标准流 (Miller Heiman)',
        description: '应用战略销售方法论推进商机',
        triggerType: 'auto',
        triggerCondition: 'status == "following"',
        nodes: [
          {
            id: 'n1', name: '深度痛点与需求确认 (SPIN)', description: 'AI辅助进行SPIN提问设计与痛点挖掘',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析商机摘要：{param1} 和 沟通记录：{param2}，进行SPIN分析。',
                inputs: [
                  { id: 'param1', name: '商机摘要', type: 'current_field', currentFieldCode: 'oppSummary' },
                  { id: 'param2', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_spin', label: 'SPIN分析', type: 'Text', updateTarget: 'spinAnalysis' }
              ]
            },
            taskType: '需求分析',
            assignedRole: '业务员'
          },
          {
            id: 'n2', name: '决策链 (买家角色) 识别', description: '分析经济买家、技术买家、用户买家与教练',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '基于沟通记录：{param1}，识别买家角色。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_blue', label: '决策链分析', type: 'Text', updateTarget: 'blueSheet' }
              ]
            },
            taskType: '决策链分析',
            assignedRole: '业务员'
          },
          {
            id: 'n3', name: '商业教学与认知重构 (IMPACT)', description: 'AI辅助生成挑战式销售话术与价值主张',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '结合SPIN分析：{param1} 和 决策链：{param2}，生成挑战式销售话术。',
                inputs: [
                  { id: 'param1', name: 'SPIN分析', type: 'current_field', currentFieldCode: 'spinAnalysis' },
                  { id: 'param2', name: '决策链', type: 'current_field', currentFieldCode: 'blueSheet' }
                ]
              },
              fields: [
                { fieldId: 'p_teaching', label: '挑战式话术', type: 'Text', updateTarget: 'teachingStory' }
              ]
            },
            taskType: '话术生成',
            assignedRole: '业务员'
          },
          {
            id: 'n4', name: '红旗风险检测与个人赢分析', description: '识别商机中的红旗风险与关键人的个人赢',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析沟通记录：{param1}，识别红旗风险。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_risks', label: '红旗风险', type: 'Text', updateTarget: 'redFlags' }
              ]
            },
            taskType: '风险检测',
            assignedRole: '业务员'
          },
          {
            id: 'n5', name: '阶段性总结邮件草拟', description: 'AI辅助自动生成包含价值确认的总结邮件',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '基于SPIN分析：{param1}，生成总结邮件。',
                inputs: [
                  { id: 'param1', name: 'SPIN分析', type: 'current_field', currentFieldCode: 'spinAnalysis' }
                ]
              },
              fields: [
                { fieldId: 'p_email', label: '邮件草稿', type: 'Text', updateTarget: 'summaryEmailDraft' }
              ]
            },
            taskType: '邮件草拟',
            assignedRole: '业务员'
          }
        ]
      }
    ],
    rules: [],
    statusAnalysis: {
      enabled: true,
      model: 'gemini-3-flash-preview',
      promptTemplate: '你是资深销售教练，请基于米勒·希曼（Miller Heiman）战略/概念销售方法，对“商机”做状态分析。\n\n【商机信息】\n客户：{{customerName}}\n商机日期：{{oppDate}}\n商机状态：{{status}}\n阶段：{{stage}}\n产品线：{{productLine}}\n意向金额：{{amount}}\n概要：{{oppSummary}}\n\n【输出要求】\n1）一句话判断：赢面（高/中/低）+最大不确定性\n2）Win-Results（客户/我方）\n3）Buying Influences（经济/技术/用户/教练）与个人赢假设\n4）竞争态势（可能竞品、差异化、证据缺口）\n5）Red Flags（≥5条）与对策\n6）推进策略：本阶段的“销售目标”与“客户行为目标”\n7）下一步行动（≤5条，含推进到“转项目”的条件）\n\n请用要点输出。',
      inputs: [
        { id: 'opp_customerName', name: 'customerName', type: 'current_field', currentFieldCode: 'customerName' },
        { id: 'opp_oppDate', name: 'oppDate', type: 'current_field', currentFieldCode: 'oppDate' },
        { id: 'opp_status', name: 'status', type: 'current_field', currentFieldCode: 'status' },
        { id: 'opp_stage', name: 'stage', type: 'current_field', currentFieldCode: 'stage' },
        { id: 'opp_productLine', name: 'productLine', type: 'current_field', currentFieldCode: 'productLine' },
        { id: 'opp_amount', name: 'amount', type: 'current_field', currentFieldCode: 'amount' },
        { id: 'opp_oppSummary', name: 'oppSummary', type: 'current_field', currentFieldCode: 'oppSummary' }
      ]
    }
  },
  { 
    id: '4', name: '项目', code: 'Project', description: '商机立项后的详细跟进过程', systemLink: 'projects表 / 项目管理模块',
    properties: [
      { id: 'p1', name: '项目编号', code: 'projectNo', type: 'String', required: true },
      { id: 'p2', name: '项目名称', code: 'projectName', type: 'String', required: true },
      { id: 'p_type', name: '项目类型', code: 'projectType', type: 'Enum', required: true, options: [
        { value: 'custom', label: '定制开发' },
        { value: 'standard', label: '标准产品' },
        { value: 'service', label: '技术服务' }
      ]},
      { id: 'p3', name: '项目状态', code: 'status', type: 'Enum', required: true, options: [
        { value: 'following', label: '跟进中' },
        { value: 'completed', label: '已完结' },
        { value: 'paused', label: '已暂停' }
      ]},
      { id: 'p_stage', name: '项目阶段', code: 'stage', type: 'Enum', required: true, options: [
        { value: 'design', label: '方案设计' },
        { value: 'sample', label: '样品阶段' },
        { value: 'delivery', label: '交付阶段' },
        { value: 'acceptance', label: '验收阶段' }
      ]},
      { id: 'p4', name: '项目等级', code: 'projectLevel', type: 'Enum', required: false, options: [
        { value: 'A', label: 'A级 (重大)' },
        { value: 'B', label: 'B级 (重要)' },
        { value: 'C', label: 'C级 (普通)' }
      ]},
      { id: 'p5', name: '健康度', code: 'health', type: 'Enum', required: false, options: [
        { value: 'green', label: '正常' },
        { value: 'yellow', label: '预警' },
        { value: 'red', label: '异常' }
      ]},
      { id: 'p6', name: '来源商机ID', code: 'opportunityId', type: 'String', required: false },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Opportunity', relationType: '1:1', description: '来源商机' },
      { id: 'r_task', targetObject: 'ProjectTask', relationType: '1:N', description: '项目任务细表' },
      { id: 'r_note', targetObject: 'ProjectNote', relationType: '1:N', description: '项目备注细表' },
      { id: 'r_comm', targetObject: 'CommunicationLog', relationType: '1:N', description: '项目沟通记录' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '项目负责人' }
    ], 
    flows: [
      {
        id: 'flow_project_on_create',
        name: '项目阶段任务流',
        description: '项目新增时自动生成阶段任务，任务内可重复点击 AI 获取建议。',
        triggerType: 'auto',
        triggerCondition: 'on_create',
        sopPromptConfig: {
          prefix: '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。请结合阶段目标、最新客户沟通记录，输出推进动作。'
        },
        sopOqarConfig: {
          enabled: true,
          suggestedQuestions: [
            '目前项目的交付进度是否符合您的预期？',
            '在下一阶段交付中，有哪些可能影响进度的风险点需要我们重点关注？'
          ],
          replyPrompt: '你是大客户销售顾问，请按 OQAR 输出建议回复。\n输出格式：\n【Observe】：复述客户问题并确认焦点\n【Qualify】：识别阶段风险与机会\n【Answer】：给可直接发送的回复话术\n【Request】：给后续建议提问（1个封闭+1个开放）'
        },
        nodes: [
          {
            id: 'prj_s1',
            name: '阶段1-需求确认',
            description: '明确范围、关键指标、里程碑与成功标准。',
            type: 'manual',
            taskType: '项目跟进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：需求澄清清单（字段级）+里程碑（≤6条）+关键风险（≥5条）+需要拉齐的角色列表。',
                inputs: []
              },
              fields: [],
              taskType: '项目跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'prj_s2',
            name: '阶段2-技术/样品验证',
            description: '制定验证计划、样品交付与验证通过标准。',
            type: 'manual',
            taskType: '样品跟进',
            assignedRole: '技术支持',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：验证计划（步骤/输入/输出/通过标准）+样品交付清单+客户侧验证配合事项。',
                inputs: []
              },
              fields: [],
              taskType: '样品跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'prj_s3',
            name: '阶段3-报价/合同与订单推进',
            description: '整理报价条件、合同条款关键点并推进下单。',
            type: 'manual',
            taskType: '报价跟进',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：报价策略（底线/让步项）+合同条款风险点（≥5条）+下单推进清单（≤8条）。',
                inputs: []
              },
              fields: [],
              taskType: '报价跟进',
              assigneeRule: '当前处理人'
            }
          },
          {
            id: 'prj_s4',
            name: '阶段4-交付与回款跟进',
            description: '交付里程碑、验收资料、回款节点与风险预警。',
            type: 'manual',
            taskType: '订单处理',
            assignedRole: '业务员',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-3-flash-preview',
                promptTemplate: '请输出：交付节点（≤6条）+验收资料清单+回款计划+延期风险预警与动作建议。',
                inputs: []
              },
              fields: [],
              taskType: '订单处理',
              assigneeRule: '当前处理人'
            }
          }
        ]
      },
      {
        id: 'flow_proj_1',
        name: '项目执行标准流 (IMPACT)',
        description: '从方案设计到正式订单的全过程',
        triggerType: 'auto',
        triggerCondition: 'status == "following"',
        nodes: [
          {
            id: 'n1', name: '设计报价方案 (IMPACT)', description: 'AI辅助生成基于价值的报价方案与ROI分析',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '基于项目名称：{param1}，生成报价方案。',
                inputs: [
                  { id: 'param1', name: '项目名称', type: 'current_field', currentFieldCode: 'projectName' }
                ]
              },
              fields: [
                { fieldId: 'p_solution', label: '报价方案', type: 'Text', updateTarget: 'conceptualSelling' }
              ]
            },
            taskType: '方案设计',
            assignedRole: '业务员'
          },
          {
            id: 'n2', name: '样品订单 (Commitment)', description: 'AI辅助分析样品订单的承诺度与风险',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析沟通记录：{param1}，评估样品订单风险。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_risks', label: '红旗风险', type: 'Text', updateTarget: 'redFlags' }
              ]
            },
            taskType: '风险评估',
            assignedRole: '业务员'
          },
          {
            id: 'n3', name: '样品交付 (Service)', description: 'AI辅助生成交付指南与服务建议',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '基于方案：{param1}，生成交付指南。',
                inputs: [
                  { id: 'param1', name: '报价方案', type: 'current_field', currentFieldCode: 'conceptualSelling' }
                ]
              },
              fields: [
                { fieldId: 'p_service', label: '服务包', type: 'Text', updateTarget: 'sampleServicePackage' }
              ]
            },
            taskType: '交付准备',
            assignedRole: '业务员'
          },
          {
            id: 'n4', name: '样品承认 (Joint Review)', description: 'AI辅助进行联合评审与异议处理',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '分析沟通记录：{param1}，辅助联合评审。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_scripts', label: '挑战者话术', type: 'Text', updateTarget: 'challengerScripts' }
              ]
            },
            taskType: '联合评审',
            assignedRole: '业务员'
          },
          {
            id: 'n5', name: '正式订单 (Closing)', description: 'AI辅助预测成交概率并提供结案建议',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析沟通记录：{param1}，预测成交概率。',
                inputs: [
                  { id: 'param1', name: '沟通记录', type: 'ontology', ontologyCode: 'CommunicationLog', idField: 'sourceId', fields: ['content'] }
                ]
              },
              fields: [
                { fieldId: 'p_warning', label: '成交预警', type: 'Text', updateTarget: 'orderWarning' }
              ]
            },
            taskType: '结案预测',
            assignedRole: '业务员'
          }
        ]
      }
    ],
    rules: [],
    statusAnalysis: {
      enabled: true,
      model: 'gemini-3-flash-preview',
      promptTemplate: '你是资深销售教练，请基于米勒·希曼（Miller Heiman）战略/概念销售方法，对“项目”做状态分析。\n\n【项目信息】\n客户：{{customerName}}\n项目名称：{{projectName}}\n项目等级：{{projectLevel}}\n阶段：{{stage}}\n项目状态：{{status}}\n商机概要：{{oppSummary}}\n意向金额：{{intentAmount}}\n\n【输出要求】\n1）一句话判断：当前阶段是否推进到位（是/否）+卡点\n2）Win-Results（客户/我方）\n3）Buying Influences：关键角色覆盖情况与个人赢假设\n4）风险与红旗（≥5条）\n5）推进路线图：本阶段必须完成的客户行为目标（≤6条）\n6）下一步行动（≤5条，含责任人建议：业务/技术/管理）\n\n请用要点输出。',
      inputs: [
        { id: 'proj_customerName', name: 'customerName', type: 'current_field', currentFieldCode: 'customerName' },
        { id: 'proj_projectName', name: 'projectName', type: 'current_field', currentFieldCode: 'projectName' },
        { id: 'proj_projectLevel', name: 'projectLevel', type: 'current_field', currentFieldCode: 'projectLevel' },
        { id: 'proj_stage', name: 'stage', type: 'current_field', currentFieldCode: 'stage' },
        { id: 'proj_status', name: 'status', type: 'current_field', currentFieldCode: 'status' },
        { id: 'proj_oppSummary', name: 'oppSummary', type: 'current_field', currentFieldCode: 'oppSummary' },
        { id: 'proj_intentAmount', name: 'intentAmount', type: 'current_field', currentFieldCode: 'intentAmount' }
      ]
    }
  },
  { 
    id: '5', name: '客户', code: 'Customer', description: '购买产品或服务的实体', systemLink: 'customers表 / 客户管理模块',
    properties: [
      { id: 'p1', name: '客户编号', code: 'customerNo', type: 'String', required: true },
      { id: 'p2', name: '客户名称', code: 'name', type: 'String', required: true },
      { id: 'p3', name: '客户等级', code: 'level', type: 'Enum', required: true },
      { id: 'p4', name: '自定义拜访频率', code: 'customVisitFrequency', type: 'Number', required: false },
      { id: 'p5', name: '最近下一次拜访时间', code: 'latestNextVisitTime', type: 'Date', required: false },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: '1:N', description: '客户的所有项目' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '客户经理' }
    ], 
    flows: [
      {
        id: 'flow_cust_1',
        name: '客户画像定期更新',
        description: '每月1号更新客户360度画像',
        triggerType: 'timed',
        triggerFrequency: '每月1号 00:00',
        nodes: [
          {
            id: 'n_cust_1', name: 'AI画像深度分析', description: '综合订单、沟通记录、行为数据生成360度画像',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '请分析客户 {param1} 的全维度画像。包含：1. 业务规模与行业地位；2. 核心决策链条；3. 历史采购偏好；4. 当前业务痛点与潜在机会。',
                inputs: [
                  { id: 'param1', name: '客户全量信息', type: 'ontology', ontologyCode: 'Customer', idField: 'customerNo', fields: ['name', 'level', 'industry', 'region'] }
                ]
              },
              fields: [
                { fieldId: 'p_persona', label: '客户画像', type: 'Text', updateTarget: 'persona' }
              ]
            },
            taskType: '画像分析',
            assignedRole: '客户经理'
          }
        ]
      }
    ],
    rules: []
  },
  { 
    id: '6', name: '报价单', code: 'Quote', description: '向客户提供的价格明细', systemLink: 'quotes表 / 报价单模块',
    properties: [
      { id: 'p1', name: '报价单号', code: 'quoteNo', type: 'String', required: true },
      { id: 'p2', name: '总金额', code: 'totalAmount', type: 'Number', required: true },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Product', relationType: 'N:N', description: '报价包含的产品' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '报价人' }
    ], 
    flows: [],
    rules: []
  },
  { 
    id: '7', name: '样品单', code: 'SampleOrder', description: '客户索要的样品订单', systemLink: 'sample_orders表 / 样品单模块',
    properties: [
      { id: 'p1', name: '样品单号', code: 'sampleNo', type: 'String', required: true },
      { id: 'p2', name: '客户反馈', code: 'feedback', type: 'Text', required: false },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Product', relationType: 'N:N', description: '包含的样品产品' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '跟进人' }
    ], 
    flows: [],
    rules: []
  },
  { 
    id: '8', name: '订单', code: 'Order', description: '正式的销售合同/订单', systemLink: 'orders表 / 订单模块',
    properties: [
      { id: 'p1', name: '订单编号', code: 'orderNo', type: 'String', required: true },
      { id: 'p2', name: '订单金额', code: 'totalAmount', type: 'Number', required: true },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '负责跟进的员工' }
    ], 
    flows: [],
    rules: []
  },
  { 
    id: '9', name: '退货单', code: 'ReturnOrder', description: '客户退回产品的记录', systemLink: 'return_orders表 / 退货单模块',
    properties: [
      { id: 'p1', name: '退货单号', code: 'returnNo', type: 'String', required: true },
      { id: 'p2', name: '退货原因', code: 'reason', type: 'Text', required: true },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Order', relationType: 'N:1', description: '关联的原订单' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '处理人' }
    ], 
    flows: [
      {
        id: 'flow_return_1',
        name: '退货处理双赢流',
        description: '基于客户双赢策略的退货处理流程',
        triggerType: 'auto',
        triggerCondition: 'status == "pending"',
        nodes: [
          {
            id: 'n1', name: '退货原因深度分析', description: 'AI辅助分析退货原因，识别产品缺陷或服务问题',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-1.5-flash',
                promptTemplate: '分析退货原因：{param1}，并提供改进建议。',
                inputs: [
                  { id: 'param1', name: '退货原因', type: 'current_field', currentFieldCode: 'reason' }
                ]
              },
              fields: [
                { fieldId: 'p_analysis', label: '原因分析', type: 'Text', updateTarget: 'analysis' }
              ]
            },
            taskType: '原因分析',
            assignedRole: '售后专员'
          },
          {
            id: 'n2', name: '双赢方案制定', description: '基于客户价值与公司成本，制定双赢的退货/补偿方案',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '基于原因分析：{param1}，制定一个既能满足客户需求又能控制公司损失的双赢方案。',
                inputs: [
                  { id: 'param1', name: '原因分析', type: 'current_field', currentFieldCode: 'analysis' }
                ]
              },
              fields: [
                { fieldId: 'p_solution', label: '双赢方案', type: 'Text', updateTarget: 'winWinSolution' }
              ]
            },
            taskType: '方案制定',
            assignedRole: '客户成功经理'
          },
          {
            id: 'n3', name: '客户沟通与确认', description: '与客户沟通双赢方案并达成一致',
            type: 'manual',
            taskType: '客户沟通',
            assignedRole: '业务员'
          }
        ]
      }
    ],
    rules: []
  },
  { 
    id: '10', name: '产品', code: 'Product', description: '公司销售的商品 or 服务', systemLink: 'products表 / 产品资料模块',
    properties: [
      { id: 'p1', name: '产品编号', code: 'productNo', type: 'String', required: true },
      { id: 'p2', name: '产品名称', code: 'name', type: 'String', required: true },
    ], 
    relations: [], 
    flows: [],
    rules: []
  },
  { 
    id: '11', name: '任务', code: 'Task', description: '项目或商机跟进过程中的具体工作项', systemLink: 'tasks表 / 任务管理模块',
    properties: [
      { id: 'p1', name: '任务编号', code: 'taskNo', type: 'String', required: true },
      { id: 'p2', name: '任务标题', code: 'title', type: 'String', required: true },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '执行人' }
    ], 
    flows: [],
    rules: []
  },
  { 
    id: '13', name: '微信群聊天记录', code: 'WeChatGroupChat', description: '与客户的微信群沟通记录', systemLink: 'wechat_messages表 / 企微集成模块',
    properties: [
      { id: 'p1', name: '消息ID', code: 'msgId', type: 'String', required: true },
      { id: 'p2', name: '群组ID', code: 'groupId', type: 'String', required: true },
      { id: 'p3', name: '发送人', code: 'sender', type: 'String', required: true },
      { id: 'p4', name: '消息内容', code: 'content', type: 'Text', required: true },
      { id: 'p5', name: '发送时间', code: 'timestamp', type: 'Date', required: true },
    ], 
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '群组对应的客户' },
      { id: 'r2', targetObject: 'Project', relationType: 'N:1', description: '群组对应的项目' },
      { id: 'r_emp', targetObject: 'Employee', relationType: 'N:1', description: '群组内的员工' }
    ], 
    flows: [
      {
        id: 'flow_wechat_1',
        name: '每日聊天摘要',
        description: '每天下班前生成群聊摘要',
        triggerType: 'timed',
        triggerFrequency: '每天 18:00',
        nodes: [
          {
            id: 'n_wechat_1', name: 'AI聊天摘要生成', description: '分析今日聊天内容，提取关键信息与待办事项',
            type: 'manual',
            manualConfig: {
              isAiAssisted: true,
              aiApiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro',
              aiApiKey: 'sk-xxx',
              aiConfig: {
                model: 'gemini-1.5-pro',
                promptTemplate: '分析今日微信群聊天内容：{param1}，并生成摘要。摘要应包含：1. 客户主要关切点；2. 双方达成的共识；3. 明确的下一步待办事项。',
                inputs: [
                  { id: 'param1', name: '聊天记录', type: 'ontology', ontologyCode: 'WeChatGroupChat', idField: 'groupId', fields: ['content', 'sender', 'timestamp'] }
                ]
              },
              fields: [
                { fieldId: 'p_summary', label: '今日摘要', type: 'Text', updateTarget: 'summary' }
              ]
            },
            taskType: '沟通摘要',
            assignedRole: '项目经理'
          }
        ]
      }
    ],
    rules: []
  },
  {
    id: '14', name: '员工', code: 'Employee', description: '公司内部员工', systemLink: 'users表 / 组织架构模块',
    properties: [
      { id: 'p1', name: '员工编号', code: 'empNo', type: 'String', required: true },
      { id: 'p2', name: '姓名', code: 'name', type: 'String', required: true },
      { id: 'p3', name: '部门', code: 'department', type: 'String', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: '1:N', description: '负责的客户' },
      { id: 'r2', targetObject: 'Project', relationType: '1:N', description: '负责的项目' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '15', name: '沟通记录', code: 'CommunicationLog', description: '全渠道沟通记录细表', systemLink: 'communication_logs表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '记录ID', code: 'logId', type: 'String', required: true },
      { id: 'p_cust', name: '客户ID', code: 'customerId', type: 'String', required: true },
      { id: 'p2', name: '沟通类型', code: 'type', type: 'Enum', required: true, options: [
        { value: 'wechat', label: '微信' },
        { value: 'email', label: '邮件' },
        { value: 'phone', label: '电话' },
        { value: 'meeting', label: '会议' },
        { value: 'other', label: '其他' }
      ]},
      { id: 'p3', name: '内容摘要', code: 'content', type: 'Text', required: true },
      { id: 'p4', name: '发送人', code: 'sender', type: 'String', required: true },
      { id: 'p5', name: '时间', code: 'timestamp', type: 'DateTime', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '16', name: '项目任务', code: 'ProjectTask', description: '项目执行过程中的具体任务细表', systemLink: 'project_tasks表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '任务ID', code: 'taskId', type: 'String', required: true },
      { id: 'p2', name: '任务名称', code: 'title', type: 'String', required: true },
      { id: 'p3', name: '执行人', code: 'assignee', type: 'String', required: true },
      { id: 'p4', name: '截止日期', code: 'dueDate', type: 'Date', required: true },
      { id: 'p5', name: '状态', code: 'status', type: 'Enum', required: true, options: [
        { value: 'todo', label: '待处理' },
        { value: 'doing', label: '进行中' },
        { value: 'done', label: '已完成' }
      ]}
    ],
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '17', name: '项目备注', code: 'ProjectNote', description: '项目过程中的备忘与记录细表', systemLink: 'project_notes表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '备注ID', code: 'noteId', type: 'String', required: true },
      { id: 'p2', name: '作者', code: 'author', type: 'String', required: true },
      { id: 'p3', name: '内容', code: 'content', type: 'Text', required: true },
      { id: 'p4', name: '日期', code: 'date', type: 'Date', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '18', name: '客户案例', code: 'CustomerCase', description: '沉淀的行业成功案例库', systemLink: 'customer_cases表',
    properties: [
      { id: 'p1', name: '案例ID', code: 'caseId', type: 'String', required: true },
      { id: 'p2', name: '标题', code: 'title', type: 'String', required: true },
      { id: 'p3', name: '行业', code: 'industry', type: 'String', required: true },
      { id: 'p4', name: '核心痛点', code: 'painPoints', type: 'List', required: true },
      { id: 'p5', name: '解决方案', code: 'solution', type: 'Text', required: true },
      { id: 'p6', name: '关键指标', code: 'metrics', type: 'String', required: true },
      { id: 'p7', name: '价值陈述', code: 'valueStatement', type: 'Text', required: true }
    ],
    relations: [],
    flows: [],
    rules: []
  },
  {
    id: '19', name: '微信群设置', code: 'WeChatGroupSettings', description: '配置微信群同步与监控规则', systemLink: 'wechat_groups表',
    properties: [
      { id: 'p1', name: '群ID', code: 'groupId', type: 'String', required: true },
      { id: 'p_cust', name: '客户ID', code: 'customerId', type: 'String', required: true },
      { id: 'p2', name: '群名称', code: 'name', type: 'String', required: true },
      { id: 'p3', name: '同步状态', code: 'syncStatus', type: 'Boolean', required: true },
      { id: 'p4', name: '监控关键词', code: 'keywords', type: 'List', required: false },
      { id: 'p_members', name: '群成员', code: 'members', type: 'List', required: false },
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '20', name: '聊天记录', code: 'ChatRecord', description: '全渠道聊天记录明细', systemLink: 'chat_records表',
    properties: [
      { id: 'p1', name: '记录ID', code: 'recordId', type: 'String', required: true },
      { id: 'p_cust', name: '客户ID', code: 'customerId', type: 'String', required: true },
      { id: 'p2', name: '类型', code: 'type', type: 'Enum', required: true, options: [
        { value: 'wechat_group', label: '微信群' },
        { value: '1688', label: '1688' },
        { value: 'personal_wechat', label: '个人微信' },
        { value: 'enterprise_wechat', label: '企业微信' },
        { value: 'official_website', label: '官网' },
        { value: 'taobao', label: '淘宝' }
      ]},
      { id: 'p3', name: '内容', code: 'content', type: 'Text', required: true },
      { id: 'p4', name: '发送人', code: 'sender', type: 'String', required: true },
      { id: 'p5', name: '时间', code: 'timestamp', type: 'DateTime', required: true },
      { id: 'p6', name: '来源分组', code: 'sourceGroup', type: 'String', required: false },
      { id: 'p_group_id', name: '微信群ID', code: 'groupId', type: 'String', required: false },
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' },
      { id: 'r2', targetObject: 'WeChatGroupSettings', relationType: 'N:1', description: '所属微信群' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '21', name: '报价单', code: 'Quotation', description: '向客户提供的正式报价', systemLink: 'quotations表',
    properties: [
      { id: 'p1', name: '报价单号', code: 'quotationNo', type: 'String', required: true },
      { id: 'p2', name: '金额', code: 'amount', type: 'Number', required: true },
      { id: 'p3', name: '有效期', code: 'validUntil', type: 'Date', required: true },
      { id: 'p4', name: '状态', code: 'status', type: 'Enum', required: true },
    ],
    relations: [
      { id: 'r1', targetObject: 'Opportunity', relationType: 'N:1', description: '所属商机' },
      { id: 'r2', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '22', name: '销售订单', code: 'Order', description: '客户确认后的正式订单', systemLink: 'orders表',
    properties: [
      { id: 'p1', name: '订单编号', code: 'orderNo', type: 'String', required: true },
      { id: 'p2', name: '订单金额', code: 'totalAmount', type: 'Number', required: true },
      { id: 'p3', name: '下单日期', code: 'orderDate', type: 'Date', required: true },
      { id: 'p4', name: '状态', code: 'status', type: 'Enum', required: true },
    ],
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' },
      { id: 'r2', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '23', name: '样品单', code: 'SampleOrder', description: '项目过程中的样品需求单', systemLink: 'sample_orders表',
    properties: [
      { id: 'p1', name: '样品单号', code: 'sampleNo', type: 'String', required: true },
      { id: 'p2', name: '样品数量', code: 'quantity', type: 'Number', required: true },
      { id: 'p3', name: '期望交付日期', code: 'expectedDate', type: 'Date', required: true },
      { id: 'p4', name: '状态', code: 'status', type: 'Enum', required: true },
    ],
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '24', name: '项目里程碑明细', code: 'ProjectMilestone', description: '项目细表：里程碑节点', systemLink: 'project_milestones表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '里程碑ID', code: 'milestoneId', type: 'String', required: true },
      { id: 'p2', name: '阶段名称', code: 'stageName', type: 'String', required: true },
      { id: 'p3', name: '计划日期', code: 'plannedDate', type: 'Date', required: false },
      { id: 'p4', name: '完成状态', code: 'status', type: 'Enum', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Project', relationType: 'N:1', description: '所属项目' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '25', name: '里程碑任务明细', code: 'MilestoneTask', description: '三层细表：里程碑下任务', systemLink: 'milestone_tasks表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '任务ID', code: 'taskId', type: 'String', required: true },
      { id: 'p2', name: '任务名称', code: 'taskName', type: 'String', required: true },
      { id: 'p3', name: '执行人', code: 'owner', type: 'String', required: false },
      { id: 'p4', name: '状态', code: 'status', type: 'Enum', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'ProjectMilestone', relationType: 'N:1', description: '所属里程碑' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '26', name: '里程碑任务日志', code: 'MilestoneTaskLog', description: '四层细表：任务过程日志', systemLink: 'milestone_task_logs表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '日志ID', code: 'logId', type: 'String', required: true },
      { id: 'p2', name: '记录时间', code: 'logTime', type: 'DateTime', required: true },
      { id: 'p3', name: '日志内容', code: 'content', type: 'Text', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'MilestoneTask', relationType: 'N:1', description: '所属里程碑任务' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '27', name: '客户联系人明细', code: 'CustomerContactSub', description: '客户细表：联系人明细', systemLink: 'customer_contacts表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '联系人ID', code: 'contactId', type: 'String', required: true },
      { id: 'p2', name: '姓名', code: 'name', type: 'String', required: true },
      { id: 'p3', name: '购买角色', code: 'buyingRole', type: 'Enum', required: false },
      { id: 'p4', name: '联系方式', code: 'phone', type: 'String', required: false }
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '28', name: '客户地址明细', code: 'CustomerAddressSub', description: '客户细表：地址信息', systemLink: 'customer_addresses表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '地址ID', code: 'addressId', type: 'String', required: true },
      { id: 'p2', name: '地址类型', code: 'addressType', type: 'Enum', required: true },
      { id: 'p3', name: '详细地址', code: 'address', type: 'Text', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Customer', relationType: 'N:1', description: '所属客户' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '29', name: '报价单明细行', code: 'QuotationLine', description: '报价单细表：明细行', systemLink: 'quotation_lines表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '行ID', code: 'lineId', type: 'String', required: true },
      { id: 'p2', name: '产品编号', code: 'materialNo', type: 'String', required: true },
      { id: 'p3', name: '数量', code: 'qty', type: 'Number', required: true },
      { id: 'p4', name: '单价', code: 'price', type: 'Number', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Quotation', relationType: 'N:1', description: '所属报价单' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '30', name: '报价明细批次', code: 'QuotationLineBatch', description: '三层细表：报价明细批次', systemLink: 'quotation_line_batches表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '批次ID', code: 'batchId', type: 'String', required: true },
      { id: 'p2', name: '批次号', code: 'batchNo', type: 'String', required: true },
      { id: 'p3', name: '批次数量', code: 'qty', type: 'Number', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'QuotationLine', relationType: 'N:1', description: '所属报价明细行' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '31', name: '报价批次序列号', code: 'QuotationBatchSerial', description: '四层细表：批次序列号', systemLink: 'quotation_batch_serials表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '序列号ID', code: 'serialId', type: 'String', required: true },
      { id: 'p2', name: '序列号', code: 'serialNo', type: 'String', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'QuotationLineBatch', relationType: 'N:1', description: '所属报价批次' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '32', name: '样品单明细行', code: 'SampleOrderLine', description: '样品单细表：样品明细', systemLink: 'sample_order_lines表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '明细ID', code: 'lineId', type: 'String', required: true },
      { id: 'p2', name: '产品编号', code: 'materialNo', type: 'String', required: true },
      { id: 'p3', name: '样品数量', code: 'qty', type: 'Number', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'SampleOrder', relationType: 'N:1', description: '所属样品单' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '33', name: '订单明细行', code: 'OrderLine', description: '订单细表：产品明细', systemLink: 'order_lines表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '明细ID', code: 'lineId', type: 'String', required: true },
      { id: 'p2', name: '产品编号', code: 'materialNo', type: 'String', required: true },
      { id: 'p3', name: '数量', code: 'qty', type: 'Number', required: true },
      { id: 'p4', name: '含税金额', code: 'amount', type: 'Number', required: false }
    ],
    relations: [
      { id: 'r1', targetObject: 'Order', relationType: 'N:1', description: '所属订单' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '34', name: '订单出货计划', code: 'OrderShipmentPlan', description: '订单细表：出货计划', systemLink: 'order_shipments表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '计划ID', code: 'planId', type: 'String', required: true },
      { id: 'p2', name: '计划发货日期', code: 'shipDate', type: 'Date', required: true },
      { id: 'p3', name: '发货数量', code: 'shipQty', type: 'Number', required: true }
    ],
    relations: [
      { id: 'r1', targetObject: 'Order', relationType: 'N:1', description: '所属订单' }
    ],
    flows: [],
    rules: []
  },
  {
    id: '35', name: '退货单明细行', code: 'ReturnOrderLine', description: '退货单细表：退货明细', systemLink: 'return_order_lines表',
    isSubTable: true,
    properties: [
      { id: 'p1', name: '明细ID', code: 'lineId', type: 'String', required: true },
      { id: 'p2', name: '退货产品编号', code: 'materialNo', type: 'String', required: true },
      { id: 'p3', name: '退货数量', code: 'qty', type: 'Number', required: true },
      { id: 'p4', name: '退货原因', code: 'reason', type: 'Text', required: false }
    ],
    relations: [
      { id: 'r1', targetObject: 'ReturnOrder', relationType: 'N:1', description: '所属退货单' }
    ],
    flows: [],
    rules: []
  }
];

export const initialSystemFunctions: SystemFunction[] = [
  {
    id: 'sf1',
    name: '询盘管理',
    code: 'Inquiry',
    associatedOntologyId: '1',
    basicFeatures: ['add', 'edit', 'save', 'delete'],
    customFlows: ['flow_inq_1']
  },
  {
    id: 'sf2',
    name: '线索管理',
    code: 'Lead',
    associatedOntologyId: '2',
    basicFeatures: ['add', 'edit', 'save', 'delete'],
    customFlows: ['flow_lead_1']
  },
  {
    id: 'sf3',
    name: '商机管理',
    code: 'Opportunity',
    associatedOntologyId: '3',
    basicFeatures: ['add', 'edit', 'save', 'delete'],
    customFlows: ['flow_opp_1']
  },
  {
    id: 'sf4',
    name: '项目管理',
    code: 'Project',
    associatedOntologyId: '4',
    basicFeatures: ['add', 'edit', 'save', 'delete'],
    customFlows: ['flow_proj_1']
  }
];
