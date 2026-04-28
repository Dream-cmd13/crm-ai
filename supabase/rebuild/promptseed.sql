begin;

-- ============================================================
-- 1) 基础配置：模型、聊天辅助、竞品配置
-- ============================================================
insert into public.crm_system_config(id, name, value_json) values
  ('llm_config', '大模型配置', '{
    "defaultModel":"deepseek-v4-pro",
    "temperature":0.7,
    "maxTokens":1000,
    "models":{
      "deepseek-v4-pro":{"name":"DeepSeek V4 Pro","provider":"openai_compatible","endpoint":"https://api.deepseek.com/v1/chat/completions","enabled":true},
      "gemini-3-flash-preview":{"name":"Gemini 3 Flash","provider":"gemini","endpoint":"","enabled":true},
      "gemini-3.1-pro-preview":{"name":"Gemini 3.1 Pro","provider":"gemini","endpoint":"","enabled":true}
    }
  }'::jsonb),
  ('competitor_swot_ai_config', '客户竞品SWOT AI设置', '{"model":"gemini-3.1-pro-preview","contextSources":["customer_name","competitor_profile","meeting_records"]}'::jsonb),
  ('chat_assist_config', '聊天会话AI辅助设置', '{
    "useFaqAnswer": true,
    "usePersonaAnswer": true,
    "useFocusCompetitorAnswer": true,
    "strictMode": true,
    "responseTone": "专业、口语化、可直接发送",
    "responseLength": "medium",
    "mustInclude": "匹配判断；OQAR应答；下一步推进动作；证据引用（工况/验证/交付/质量）",
    "forbidden": "空话套话；夸大承诺；无法落地的建议",
    "customPromptSuffix": "优先贴合当前聊天语境，不要重复客户已明确拒绝的点。",
    "retrieval": { "faqTopN": 3, "faqMinScore": 2, "focusTopN": 3, "caseTopN": 2, "seriesTopN": 2 },
    "analysisSteps": ["识别发言人与角色", "识别会话意图与阶段", "按意图检索FAQ/画像/关注点/案例/FAB", "输出建议话术与下一步动作"],
    "flows": [
      {
        "id": "flow_default_huawei",
        "name": "华为标准流程",
        "description": "标准大客户会话分析与回复流程",
        "enabled": true,
        "isDefault": true,
        "nodes": [
          { "id": "node_role_intent", "name": "识别发言人和意图", "enabled": true, "dataSources": ["chat_context", "intent", "persona", "department_prompt"], "contextSources": ["customer_name","contact_persona","chat_records"], "instruction": "先判断当前发言人角色、部门与意图，再决定后续检索方向。", "promptTemplate": "基于{chat}和{contact_persona}识别发言人角色与意图。", "outputVar": "role_intent_result" },
          { "id": "node_evidence", "name": "检索证据资料", "enabled": true, "dataSources": ["faq", "focus_competitor", "customer_profile", "customer_demand", "customer_cases", "product_fab"], "contextSources": ["customer_profile","customer_focus_archive","wechat_records","wechat_group_records","meeting_records"], "instruction": "按意图检索FAQ、关注点/竞品、客户需求、案例与FAB，优先高相关证据。", "promptTemplate": "结合{{intent_summary}}与{{role_intent_result}}并参考{profile}、{customer_focus_archive}汇总证据。", "outputVar": "evidence_result" },
          { "id": "node_reply", "name": "生成建议话术", "enabled": true, "dataSources": ["chat_context", "faq", "persona", "focus_competitor", "customer_cases", "product_fab"], "contextSources": ["customer_name","customer_profile","chat_records"], "instruction": "输出匹配判断、建议话术、下一步动作和风险提示，内容可直接发送。", "promptTemplate": "根据{custname}、{chat}和{{evidence_result}}输出最终话术。", "outputVar": "reply_result" }
        ]
      }
    ],
    "defaultFlowId": "flow_default_huawei"
  }'::jsonb),
  ('persona_ai_config', '客户画像AI设置', $${
    "model": "deepseek-v4-pro",
    "temperature": 0.7,
    "maxTokens": 2000,
    "basePrompt": "你是资深B2B客户研究分析师。请围绕“客户画像”任务进行多源信息交叉验证，只输出客户画像，不要生成跟进建议、话术、方案、任务等其他内容。\n客户名称：{custname}\n客户ID：{customer_id}\n默认背景信息：\n{default_context}",
    "analysisPrompt": "请基于输入背景与可获取的公开信息进行多源验证（官网/新闻/招投标/招聘/工商等），严格按维度输出客户画像。\n输出要求：\n1) 仅输出JSON；\n2) 仅包含已定义维度ID（如F1/F2）；\n3) 每个维度内容使用固定结构：\n【维度结论】...\n【多源验证依据】...\n【可信度】高/中/低（并说明）\n【待补证据】...\n4) 绝对不要输出维度以外字段，不要输出跟进建议/营销话术。",
    "followUpPrompt": "请参考华为大客户销售方法（LTC/MSP），基于客户画像输出AI跟进建议，并必须给出该客户的“客户阶次拜访框架”。\n输出要求：\n1. 先输出客户阶次拜访框架（4-6阶段，每阶段含目标/关键动作/退出标准）；\n2. 再输出关键人（A/D/S/E/I）推进策略；\n3. 输出本周/本月可执行动作与里程碑；\n4. 输出风险与备选预案。\n格式：标题+分点，可直接用于拜访与任务安排。",
    "analysisContextSources": ["customer_name","customer_focus_archive","chat_records","meeting_records","contact_persona"],
    "followUpContextSources": ["customer_name","customer_profile","customer_focus_archive","contact_persona","meeting_records","project_solution"],
    "fields": [
      {"id":"F1","name":"公司概要","description":"公司位置、行业地位、体量、发展阶段","analysisPrompt":"提炼客户公司简介、所在行业、规模与阶段判断；标注不确定信息。","suggestionPrompt":"输出“应重点验证的3个公司层面问题”。","contextSources":["customer_name","customer_focus_archive","chat_records","meeting_records"]},
      {"id":"F2","name":"主营业务","description":"产品线、应用场景、业务增长方向","analysisPrompt":"识别客户主营业务和关键应用场景，给出业务方向与机会点。","suggestionPrompt":"输出“我方可对齐的2-3个业务价值点”。","contextSources":["customer_name","customer_focus_archive","project_solution","chat_records"]},
      {"id":"F3","name":"财务状况","description":"预算能力、投入周期、回款与成本偏好","analysisPrompt":"判断客户预算敏感度、投入周期与采购决策节奏，区分已证实/待验证。","suggestionPrompt":"输出“报价策略建议（保守/均衡/进攻）及理由”。","contextSources":["customer_focus_archive","chat_records","meeting_records","email_records"]},
      {"id":"F4","name":"客户解读","description":"客户关注点、诉求与风险顾虑","analysisPrompt":"提炼客户最关心的目标、痛点和顾虑，按优先级排序。","suggestionPrompt":"输出“下次沟通必须覆盖的3个问题”。","contextSources":["customer_name","customer_focus_archive","chat_records","project_solution"]},
      {"id":"F5","name":"客户地图","description":"组织架构、关键角色、决策链路","analysisPrompt":"识别决策链关键人，按A/D/S/E/I角色输出，并给出初始态度判断。","suggestionPrompt":"输出“本周优先触达对象+目标动作”。","contextSources":["customer_focus_archive","contact_persona","chat_records","meeting_records"]},
      {"id":"F6","name":"关键人物（KP）","description":"关键人画像、需求层次、影响方式","analysisPrompt":"对关键人物进行简画像：职位影响力、偏好、潜在诉求、对我方态度。","suggestionPrompt":"输出每位关键人的“沟通策略一句话”。","contextSources":["customer_focus_archive","contact_persona","wechat_records","chat_records"]},
      {"id":"F7","name":"供应商管理","description":"现有供应商格局与替换窗口","analysisPrompt":"分析客户现有供应商结构、切换门槛与可切入环节。","suggestionPrompt":"输出“可切入环节 + 证据不足项”。","contextSources":["customer_focus_archive","chat_records","meeting_records","project_solution"]},
      {"id":"F8","name":"流程&IT","description":"采购流程、系统与协同节点","analysisPrompt":"识别采购流程、审批链、系统化程度（如ERP/PLM/CRM）及影响。","suggestionPrompt":"输出“流程推进关键节点和卡点”。","contextSources":["customer_name","customer_focus_archive","contact_persona","chat_records"]}
    ]
  }$$::jsonb)
on conflict (id) do update
set name = excluded.name, value_json = excluded.value_json, updated_at = now();

-- ============================================================
-- 2) 工业连接器销售四阶段默认提示（LTC + SPIN + Blue Sheet）
-- ============================================================
insert into public.crm_system_config(id, name, value_json)
values (
  'stage_canvas_config',
  '阶段任务画布默认配置',
  $${
    "version": "v20260423_connector",
    "methodology": "Huawei LTC + SPIN + Blue Sheet",
    "stages": {
      "inquiry": {
        "enabled": true,
        "promptPrefix": "你是工业连接器大客户售前顾问。严格按LTC早期识别思路，先澄清场景与边界，再输出可执行动作。",
        "items": [
          {
            "id": "inq_app_env",
            "label": "应用场景与工况",
            "required": true,
            "priority": "high",
            "questionPrompt": "连接器用于哪类设备与工况（温度、振动、IP等级、寿命）？",
            "taskPrompt": "结合SPIN中的S/P问题，输出2-3条信息补齐与验证动作。",
            "taskTemplate": "确认工况参数、接口标准与失效风险，形成评估基线。",
            "completionRule": "形成可验证工况清单"
          },
          {
            "id": "inq_time_qty",
            "label": "交付窗口与批量",
            "required": true,
            "priority": "high",
            "questionPrompt": "首批打样和量产节点分别是什么时间，数量预估是多少？",
            "taskPrompt": "输出交期评估、产能校核与风险预案任务。",
            "taskTemplate": "明确打样/量产节奏，制定交付与备料预案。",
            "completionRule": "确认首批时间与数量区间"
          }
        ]
      },
      "lead": {
        "enabled": true,
        "promptPrefix": "你是工业连接器销售推进顾问。按SPIN完成需求挖掘，从问题影响到价值诉求形成可推进线索。",
        "items": [
          {
            "id": "lead_decision_roles",
            "label": "决策角色识别",
            "required": true,
            "priority": "high",
            "questionPrompt": "项目中谁负责技术选型、谁负责商务采购、谁最终拍板？",
            "taskPrompt": "输出关键人地图补齐动作与沟通节奏安排。",
            "taskTemplate": "建立技术/采购/决策三角色沟通策略与责任人。",
            "completionRule": "决策链至少覆盖三类角色"
          },
          {
            "id": "lead_pain_impact",
            "label": "痛点与影响量化",
            "required": true,
            "priority": "high",
            "questionPrompt": "当前连接器方案造成的主要问题是什么，对成本/良率/停线影响多大？",
            "taskPrompt": "输出痛点量化与价值锚定动作，沉淀可对比指标。",
            "taskTemplate": "形成痛点-影响-目标指标三联表。",
            "completionRule": "至少形成2项可量化改进指标"
          }
        ]
      },
      "opportunity": {
        "enabled": true,
        "promptPrefix": "你是工业连接器商机经理。按Blue Sheet推进赢单路径，围绕竞争差异、决策标准和试产计划输出行动。",
        "items": [
          {
            "id": "opp_win_strategy",
            "label": "赢单策略与竞品差异",
            "required": true,
            "priority": "high",
            "questionPrompt": "客户对比的竞品方案有哪些，最终评估权重是什么？",
            "taskPrompt": "输出差异化证据准备、风险反制与内部资源协同动作。",
            "taskTemplate": "形成竞品对比证据包与赢单主张。",
            "completionRule": "明确TOP竞品与关键胜负手"
          },
          {
            "id": "opp_trial_plan",
            "label": "试产验证计划",
            "required": true,
            "priority": "high",
            "questionPrompt": "客户可接受的试样验证步骤、周期和验收标准是什么？",
            "taskPrompt": "输出试样验证、问题闭环与商务并行推进任务。",
            "taskTemplate": "制定试样-验证-复盘-转量产计划。",
            "completionRule": "确认试样节奏与验收口径"
          }
        ]
      },
      "project": {
        "enabled": true,
        "promptPrefix": "你是工业连接器项目交付经理。按LTC后段执行与复盘，保障交付稳定、质量闭环和二次经营。",
        "items": [
          {
            "id": "proj_delivery_quality",
            "label": "交付与质量闭环",
            "required": true,
            "priority": "high",
            "questionPrompt": "当前交付风险点是什么，质量异常的闭环机制是否已确认？",
            "taskPrompt": "输出交付里程碑、质量控制点与异常升级任务。",
            "taskTemplate": "建立交付看板、异常升级与责任闭环机制。",
            "completionRule": "交付与质量责任矩阵已确认"
          },
          {
            "id": "proj_expand_plan",
            "label": "复购与扩展机会",
            "required": true,
            "priority": "medium",
            "questionPrompt": "项目稳定后，下一步可扩展到哪些机型/产线/区域？",
            "taskPrompt": "输出复盘沉淀、案例提炼与二次销售机会动作。",
            "taskTemplate": "形成复购与扩展机会清单及跟进计划。",
            "completionRule": "形成至少1条可执行扩展机会"
          }
        ]
      }
    }
  }$$::jsonb
)
on conflict (id) do update
set name = excluded.name, value_json = excluded.value_json, updated_at = now();

insert into public.crm_system_config(id, name, value_json)
values (
  'oqar_stage_assist_config',
  '阶段OQAR AI辅助配置',
  $${
    "version": "v20260423_connector",
    "default": {
      "enabled": true,
      "globalTemplate": "Observe先对齐客户场景，Qualify识别约束与风险，Answer给工业连接器可执行建议，Request提出1个封闭+1个开放问题推进下一步。",
      "openingPrompt": "根据当前阶段目标与工业连接器场景，输出3条可直接发送的OQAR开场话术。",
      "openingCount": 3,
      "followupPrompt": "基于客户回复，输出结构化OQAR继续建议，重点体现交付、质量、成本和替代风险。",
      "minClosedQuestions": 1,
      "minOpenQuestions": 1
    },
    "stageOverrides": {
      "inquiry": { "focus": "先澄清工况、接口与时间窗口，避免直接报方案。" },
      "lead": { "focus": "按SPIN量化痛点影响，推动需求从模糊到可验证。" },
      "opportunity": { "focus": "按Blue Sheet对齐决策标准，强化差异化证据与赢单路径。" },
      "project": { "focus": "强调交付稳定和质量闭环，并引导复购与扩展机会。" }
    }
  }$$::jsonb
)
on conflict (id) do update
set name = excluded.name, value_json = excluded.value_json, updated_at = now();

-- ============================================================
-- 3) 客户跟进策略：联系人 AI 搜集提示词默认值
-- ============================================================
insert into public.crm_customer_follow_strategy_config(id, config)
values (
  'default',
  jsonb_build_object(
    'contactSearchPrompt',
    $contact_prompt$
你是B2B销售联系人研究员，请根据客户名称、联系人姓名、手机号、职位进行网络检索与多源交叉验证（官网/新闻/工商/招聘/演讲/社媒公开资料等）。
目标：补齐联系人字段，并重点提炼其视频号、抖音、小红书等社媒行为线索。
输出要求：
1) 仅输出 JSON 对象，不要代码块，不要额外解释；
2) 字段仅允许：name, position, phone, email, wechatId, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior；
3) 联系人姓名必须带“AI”后缀；
4) 无可靠证据的字段留空字符串；
5) socialMediaBehavior 要总结该联系人公开社媒行为特征与内容偏好；
6) 所有结论必须基于交叉验证，不得编造。
    $contact_prompt$
  )
)
on conflict (id) do update
set
  config = coalesce(public.crm_customer_follow_strategy_config.config, '{}'::jsonb) ||
           jsonb_build_object(
             'contactSearchPrompt',
             $contact_prompt$
你是B2B销售联系人研究员，请根据客户名称、联系人姓名、手机号、职位进行网络检索与多源交叉验证（官网/新闻/工商/招聘/演讲/社媒公开资料等）。
目标：补齐联系人字段，并重点提炼其视频号、抖音、小红书等社媒行为线索。
输出要求：
1) 仅输出 JSON 对象，不要代码块，不要额外解释；
2) 字段仅允许：name, position, phone, email, wechatId, graduationSchool, hometown, hobbies, personality, preferences, keyConcerns, followStrategy, videoChannelProfile, douyinProfile, xiaohongshuProfile, socialMediaBehavior；
3) 联系人姓名必须带“AI”后缀；
4) 无可靠证据的字段留空字符串；
5) socialMediaBehavior 要总结该联系人公开社媒行为特征与内容偏好；
6) 所有结论必须基于交叉验证，不得编造。
             $contact_prompt$
           ),
  updated_at = now();

-- ============================================================
-- 4) 为已有本体 flows 补齐 SOP 提示词默认值（兼容旧/新两种本体结构）
--    - 旧结构：public.crm_ontology(flows jsonb)
--    - 新结构：public.crm_ontology_flow / crm_ontology_flow_draft(description 存 __flow_json__ 元数据)
-- ============================================================
do $$
declare
  v_sop_prefix text := '你是资深大客户销售教练，请基于华为大客户销售方法输出SOP多块建议。请结合阶段目标、最新客户沟通记录，输出推进动作。';
  v_unified_prompt text := E'你是资深大客户销售教练，请按 OQAR 体系处理问答场景。\n输入默认参数：\n- 我方提问：{question}\n- 客户回答：{answer}\n- 当前SOP任务内容：{sop_tasks}\n- 当前本体字段：{current_fields}\n- 客户画像：{profile}\n- 联系人画像：{contact_persona}\n- 最近聊天记录：{chat}\n输出要求：\n1）questionAnalysis：分析客户回答的真实含义（诉求/约束/风险/情绪信号），并判断我方提问是否承接到位；\n2）answerSuggestion：给可直接发送给客户的话术，必须包含 Observe / Qualify / Answer / Request 四段；\n3）话术专业、简洁、可执行，避免空话。';
  v_progression_prompt text := E'你是华为大客户销售方法论（LTC + SPIN + Blue Sheet）阶段晋级审查官。\n请结合以下信息判断“当前任务完成后，是否可晋级到下一阶段”：\n- 当前任务与SOP目标\n- 单据快照与关键字段\n- 最近沟通证据（聊天/邮件/会议）\n- 本次任务完成内容（completionNote）\n\n审查要求：\n1) 先证据后结论：必须引用已给出的事实，不得编造；\n2) 按LTC判断阶段退出条件是否满足（目标达成、关键人承诺、下一步里程碑）；\n3) 按SPIN检查问题深度（情境/问题/影响/需求收益）是否闭环；\n4) 按Blue Sheet检查赢单要素（决策标准、权力地图A/D/S/E/I、竞品态势、风险与应对）是否具备；\n5) 若证据不足，必须给出可执行补强动作（谁、做什么、何时、产出物）。\n\n输出必须为JSON对象：\n{"canAdvance":true,"summary":"...","signals":["..."],"risks":["..."],"suggestions":["..."],"cautions":["..."]}\n\n字段要求：\n- canAdvance: 是否可晋级；\n- summary: 结论摘要（1-2句话）；\n- signals: 支持晋级的证据要点；\n- risks: 当前阻塞点/风险；\n- suggestions: 不可晋级时的补强行动建议；\n- cautions: 可晋级后的注意事项。';
begin
  -- 旧结构兼容：仅在表存在时执行
  if to_regclass('public.crm_ontology') is not null then
    update public.crm_ontology as t
    set flows = (
      select jsonb_agg(
        case
          when (f->'sopPromptConfig'->>'prefix') is null or trim(f->'sopPromptConfig'->>'prefix') = '' then
            jsonb_set(
              f,
              '{sopPromptConfig}',
              coalesce(f->'sopPromptConfig', '{}'::jsonb) || jsonb_build_object('prefix', v_sop_prefix)
            )
          else f
        end
      )
      from jsonb_array_elements(t.flows) as f
    )
    where t.flows is not null and jsonb_array_length(t.flows) > 0;

    update public.crm_ontology as t
    set flows = (
      select jsonb_agg(
        case
          when jsonb_typeof(f->'sopPromptConfig'->'contextSources') is distinct from 'array'
               or jsonb_array_length(coalesce(f->'sopPromptConfig'->'contextSources', '[]'::jsonb)) = 0 then
            jsonb_set(
              f,
              '{sopPromptConfig}',
              coalesce(f->'sopPromptConfig', '{}'::jsonb) ||
              '{"contextSources":["customer_name","customer_profile","contact_persona","current_ontology_fields","chat_records"]}'::jsonb
            )
          else f
        end
      )
      from jsonb_array_elements(t.flows) as f
    )
    where t.flows is not null and jsonb_array_length(t.flows) > 0;

    update public.crm_ontology as t
    set flows = (
      select jsonb_agg(
        case
          when (f->'sopOqarConfig'->>'unifiedPrompt') is null or trim(f->'sopOqarConfig'->>'unifiedPrompt') = '' then
            jsonb_set(
              f,
              '{sopOqarConfig}',
              coalesce(f->'sopOqarConfig', '{}'::jsonb) ||
              jsonb_build_object('enabled', true, 'unifiedPrompt', v_unified_prompt, 'replyPrompt', v_unified_prompt)
            )
          else f
        end
      )
      from jsonb_array_elements(t.flows) as f
    )
    where t.flows is not null and jsonb_array_length(t.flows) > 0;

    update public.crm_ontology as t
    set flows = (
      select jsonb_agg(
        case
          when coalesce(trim(f #>> '{progressionCheck,promptTemplate}'), '') = '' then
            jsonb_set(
              f,
              '{progressionCheck}',
              coalesce(f->'progressionCheck', '{}'::jsonb) ||
              jsonb_build_object('enabled', coalesce((f->'progressionCheck'->>'enabled')::boolean, false), 'promptTemplate', v_progression_prompt),
              true
            )
          else f
        end
      )
      from jsonb_array_elements(t.flows) as f
    )
    where t.flows is not null and jsonb_array_length(t.flows) > 0;
  end if;

  -- 新结构兼容：published flows（description 里维护 __flow_json__ 元数据）
  if to_regclass('public.crm_ontology_flow') is not null then
    with base as (
      select
        f.id,
        case
          when coalesce(f.description, '') like '__flow_json__:%' then
            coalesce(nullif(substr(f.description, length('__flow_json__:') + 1), ''), '{}')::jsonb
          else jsonb_build_object('description', coalesce(f.description, ''))
        end as payload
      from public.crm_ontology_flow f
    ),
    patched as (
      select
        b.id,
        (
          case
            when coalesce(trim(b.payload #>> '{sopPromptConfig,prefix}'), '') = '' then
              jsonb_set(
                b.payload,
                '{sopPromptConfig}',
                coalesce(b.payload->'sopPromptConfig', '{}'::jsonb) || jsonb_build_object('prefix', v_sop_prefix),
                true
              )
            else b.payload
          end
        ) as p1
      from base b
    ),
    patched2 as (
      select
        p.id,
        (
          case
            when jsonb_typeof(p.p1 #> '{sopPromptConfig,contextSources}') is distinct from 'array'
                 or jsonb_array_length(coalesce(p.p1 #> '{sopPromptConfig,contextSources}', '[]'::jsonb)) = 0 then
              jsonb_set(
                p.p1,
                '{sopPromptConfig}',
                coalesce(p.p1->'sopPromptConfig', '{}'::jsonb) ||
                '{"contextSources":["customer_name","customer_profile","contact_persona","current_ontology_fields","chat_records"]}'::jsonb,
                true
              )
            else p.p1
          end
        ) as p2
      from patched p
    ),
    patched3 as (
      select
        p.id,
        (
          case
            when coalesce(trim(p.p2 #>> '{sopOqarConfig,unifiedPrompt}'), '') = '' then
              jsonb_set(
                p.p2,
                '{sopOqarConfig}',
                coalesce(p.p2->'sopOqarConfig', '{}'::jsonb) ||
                jsonb_build_object('enabled', true, 'unifiedPrompt', v_unified_prompt, 'replyPrompt', v_unified_prompt),
                true
              )
            else p.p2
          end
        ) as final_payload
      from patched2 p
    ),
    patched4 as (
      select
        p.id,
        (
          case
            when coalesce(trim(p.final_payload #>> '{progressionCheck,promptTemplate}'), '') = '' then
              jsonb_set(
                p.final_payload,
                '{progressionCheck}',
                coalesce(p.final_payload->'progressionCheck', '{}'::jsonb) ||
                jsonb_build_object('enabled', coalesce((p.final_payload->'progressionCheck'->>'enabled')::boolean, false), 'promptTemplate', v_progression_prompt),
                true
              )
            else p.final_payload
          end
        ) as final_payload2
      from patched3 p
    )
    update public.crm_ontology_flow f
    set description = '__flow_json__:' || p.final_payload2::text
    from patched4 p
    where f.id = p.id
      and coalesce(f.description, '') is distinct from ('__flow_json__:' || p.final_payload2::text);
  end if;

  -- 新结构兼容：draft flows 也补齐默认值，避免编辑态与发布态不一致
  if to_regclass('public.crm_ontology_flow_draft') is not null then
    with base as (
      select
        f.id,
        case
          when coalesce(f.description, '') like '__flow_json__:%' then
            coalesce(nullif(substr(f.description, length('__flow_json__:') + 1), ''), '{}')::jsonb
          else jsonb_build_object('description', coalesce(f.description, ''))
        end as payload
      from public.crm_ontology_flow_draft f
    ),
    patched as (
      select
        b.id,
        (
          case
            when coalesce(trim(b.payload #>> '{sopPromptConfig,prefix}'), '') = '' then
              jsonb_set(
                b.payload,
                '{sopPromptConfig}',
                coalesce(b.payload->'sopPromptConfig', '{}'::jsonb) || jsonb_build_object('prefix', v_sop_prefix),
                true
              )
            else b.payload
          end
        ) as p1
      from base b
    ),
    patched2 as (
      select
        p.id,
        (
          case
            when jsonb_typeof(p.p1 #> '{sopPromptConfig,contextSources}') is distinct from 'array'
                 or jsonb_array_length(coalesce(p.p1 #> '{sopPromptConfig,contextSources}', '[]'::jsonb)) = 0 then
              jsonb_set(
                p.p1,
                '{sopPromptConfig}',
                coalesce(p.p1->'sopPromptConfig', '{}'::jsonb) ||
                '{"contextSources":["customer_name","customer_profile","contact_persona","current_ontology_fields","chat_records"]}'::jsonb,
                true
              )
            else p.p1
          end
        ) as p2
      from patched p
    ),
    patched3 as (
      select
        p.id,
        (
          case
            when coalesce(trim(p.p2 #>> '{sopOqarConfig,unifiedPrompt}'), '') = '' then
              jsonb_set(
                p.p2,
                '{sopOqarConfig}',
                coalesce(p.p2->'sopOqarConfig', '{}'::jsonb) ||
                jsonb_build_object('enabled', true, 'unifiedPrompt', v_unified_prompt, 'replyPrompt', v_unified_prompt),
                true
              )
            else p.p2
          end
        ) as final_payload
      from patched2 p
    ),
    patched4 as (
      select
        p.id,
        (
          case
            when coalesce(trim(p.final_payload #>> '{progressionCheck,promptTemplate}'), '') = '' then
              jsonb_set(
                p.final_payload,
                '{progressionCheck}',
                coalesce(p.final_payload->'progressionCheck', '{}'::jsonb) ||
                jsonb_build_object('enabled', coalesce((p.final_payload->'progressionCheck'->>'enabled')::boolean, false), 'promptTemplate', v_progression_prompt),
                true
              )
            else p.final_payload
          end
        ) as final_payload2
      from patched3 p
    )
    update public.crm_ontology_flow_draft f
    set description = '__flow_json__:' || p.final_payload2::text
    from patched4 p
    where f.id = p.id
      and coalesce(f.description, '') is distinct from ('__flow_json__:' || p.final_payload2::text);
  end if;
end
$$;

commit;
