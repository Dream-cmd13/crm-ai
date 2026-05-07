begin;

insert into public.users(id, username, name, email, role, employee_no, is_active) values
  ('admin-user-id', 'admin', '系统管理员', 'admin@example.com', 'Admin', 'E001', true),
  ('user-sales-mgr', 'sales_manager', '销售经理', 'sales_manager@example.com', 'Admin', 'E002', true),
  ('user-sales-a', 'sales_a', '业务员A', 'sales_a@example.com', 'User', 'E003', true)
on conflict (id) do nothing;

insert into public.departments(id, name, roles, role_members, sub_departments, okrs, reviews) values
  ('dept-fae', 'FAE部', '["FAE工程师"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-product', '产品部', '["产品工程师","产品报价工程师","产品开发工程师","技术员","PE工程师","IE工程师"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-quality', '品质部', '["DQE","SQE","CQE","IQC","驻厂QA","OQC"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-it', 'IT部', '["流程工程师","开发工程师","运维工程师","网络硬件工程师"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-finance', '财务部', '["应收会计","应付会计","成本会计","总账会计"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-hr', '人力资源部', '["招聘专员"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-sales', '业务部', '["销售工程师","外贸销售工程师"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-supply-chain', '供应链部', '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-marketing', '市场运营部', '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-executive', '总经办', '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-1774350647874', '技术支持部', '["3D绘图员","绘图员","编撰工程师"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-1774349702745', '文控部', '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-1774349760986', '客服部', '["业务助理"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-1774349542675', '采购部', '["量产采购","开发采购","PMC"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb),
  ('dept-1774349730631', '运营部', '["内容策划","推广专员","平面设计","客服专员"]'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.ba_brand(id, name, status) values
  (1, '胜蓝', 1),
  (2, '万连', 1),
  (3, '电子谷', 1)
on conflict (id) do nothing;

insert into public.ba_group(id, name, manager) values
  (1, '销售一组', 'user-sales-mgr'),
  (2, '销售二组', 'user-sales-a'),
  (3, '技术支持组', '技术经理')
on conflict (id) do nothing;

insert into public.ba_product_line(id, parent_id, name, manager) values
  (1, null, '接插件', '产品经理A'),
  (2, 1, '工业连接器', '产品经理B'),
  (3, 1, '新能源连接器', '产品经理C'),
  (4, null, '线束', '产品经理D'),
  (5, 4, '新能源线束', '产品经理E'),
  (6, 4, '工业线束', '产品经理F')
on conflict (id) do nothing;

insert into public.ba_cptype(id, parent_id, name, fab_features, fab_advantages, fab_benefits, status) values
  (1, null, '接插件', '连接稳定', '一致性高', '降低返修率', 1),
  (2, null, '线束', '定制能力强', '交付柔性高', '提升交付确定性', 1)
on conflict (id) do nothing;

insert into public.ba_spu(id, name, brand_id, category_id, category_name) values
  (1, '工业连接器标准系列', 1, 1, '接插件'),
  (2, '新能源线束系列', 1, 2, '线束')
on conflict (id) do nothing;

insert into public.public_property_name(id, specification_name, group_name, image, is_searchable) values
  (1, '接口类型', '基本属性', null, 1),
  (2, '额定电流', '电气属性', null, 1),
  (3, '额定电压', '电气属性', null, 1),
  (4, '防护等级', '环境属性', null, 1)
on conflict (id) do nothing;

insert into public.public_property_value(id, property_id, property_value, property_value_image, public_property_name) values
  (1, 1, '8Pin', null, '接口类型'),
  (2, 1, '12Pin', null, '接口类型'),
  (3, 2, '10A', null, '额定电流'),
  (4, 2, '15A', null, '额定电流'),
  (5, 3, '250V', null, '额定电压'),
  (6, 3, '380V', null, '额定电压'),
  (7, 4, 'IP67', null, '防护等级'),
  (8, 4, 'IP68', null, '防护等级')
on conflict (id) do nothing;

insert into public.crm_product_series(series_no, name, category_id, description, fab_features, fab_advantages, fab_benefits) values
  ('SER001', '工业连接器标准系列', 1, '面向工业控制场景', '耐振动', '长期稳定', '减少维护停机'),
  ('SER002', '新能源线束系列', 2, '面向新能源设备', '耐温', '轻量化', '提升系统效率')
on conflict (id) do nothing;

insert into public.ba_cpinfo(id, category_id, category_name, material_no, material_name, specification, unit, price, min_price, status, brand_id, brand_name, min_pack_qty, min_order_qty, product_line_level1_id, product_line_level2_id, group_id, group_name, spu_id, spu_name) values
  (1, 1, '接插件', 'IO-001', '工业连接器A', '8Pin IP67', 'pcs', 68.00, 62.00, 1, 1, '胜蓝', 10, 100, 1, 2, 1, '销售一组', 1, '工业连接器标准系列'),
  (2, 2, '线束', 'WH-101', '新能源线束B', 'UL认证', 'pcs', 96.00, 88.00, 1, 1, '胜蓝', 5, 50, 4, 5, 2, '销售二组', 2, '新能源线束系列')
on conflict (id) do nothing;

insert into public.ba_product_property_relation(id, material_id, product_id, spu_status, product_status, product_name, property_id, property_name, property_value, property_value_id, category_id, category_name) values
  (1, 'IO-001', 1, 1, 1, '工业连接器A', 1, '接口类型', '8Pin', 1, 1, '接插件'),
  (2, 'IO-001', 1, 1, 1, '工业连接器A', 4, '防护等级', 'IP67', 7, 1, '接插件'),
  (3, 'WH-101', 2, 1, 1, '新能源线束B', 3, '额定电压', '250V', 5, 2, '线束')
on conflict (id) do nothing;

insert into public.ba_manucustinfo(
  id, customer_number, name, level, status, industry, source, region, sales_rep, payment_term, has_payment_term, customer_type, merchandiser, merchandiser_id, business_manager, currency, currency_id, customer_category, group_name, short_name, english_name, legal_person, registered_capital, company_address, company_type, website
) values
  (1, 'CUST001', '华东智造股份有限公司', '战略客户', 1, '工业自动化', 1, 1, 'user-sales-mgr', 30, 1, 1, '张跟单', 'MER001', '王经理', 'CNY', 1, 1, '华东区', '华东智造', 'East Manufacturing', '王建国', '5000万', '上海市浦东新区XX路1号', '股份有限公司', 'https://example.com'),
  (2, 'CUST002', '南方设备集团有限公司', '成长客户', 1, '新能源设备', 2, 2, 'user-sales-a', 60, 1, 1, '李跟单', 'MER002', '赵经理', 'CNY', 1, 2, '华南区', '南方设备', 'South Equipment', '李海峰', '3000万', '深圳市南山区YY路8号', '有限责任公司', 'https://example.org')
on conflict (id) do nothing;

insert into public.ba_customer_user(
  id, customer_id, member_name, contact_name, phone, email, is_primary, status, source
) values
  (1, 1, '华东智造采购账号', '王总', '13800000001', 'wang@example.com', 1, 1, 2),
  (2, 1, '华东智造技术账号', '赵工', '13800000011', 'zhao@example.com', 0, 1, 1),
  (3, 2, '南方设备研发账号', '李工', '13800000002', 'li@example.com', 1, 1, 2),
  (4, 2, '南方设备采购账号', '陈经理', '13800000022', 'chen@example.com', 0, 1, 1)
on conflict (id) do nothing;

insert into public.crm_customer_contact(
  id, customer_id, name, position, department, phone, email, is_primary, buying_role, buying_mode, appellation,
  wechat_id, faction, attitude_to_us, attitude_score, role_tag, influence_level, relation_level, graduation_school,
  hometown, hobbies, family_situation, personality, preferences, key_concerns, follow_strategy
) values
  ('CON001', 1, '王总', '采购总监', '采购部', '13800000001', 'wang@example.com', true, '经济买家', '竞争性招标', '王总',
   'wx_wangzong', '总部派', '正面评价', 1, 'D', 5, 3, '同济大学', '上海', '{"羽毛球","阅读"}', '已婚', '务实谨慎', '数据化沟通', '成本与交付稳定', '双周同步关键里程碑'),
  ('CON002', 2, '李工', '研发经理', '研发部', '13800000002', 'li@example.com', true, '技术买家', '技术先行', '李工',
   'wx_ligong', '技术线', '中性评价', 0, 'E', 4, 2, '华南理工', '广州', '{"跑步"}', '已婚', '理性严谨', '先看样品验证', '可靠性和认证进度', '先做样品小闭环')
on conflict (id) do nothing;

insert into public.crm_customer_persona(
  id, customer_id, scale, main_products, org_structure, buying_mode, pain_points, competitive_supplier,
  competitive_preference, unique_needs, rd_requirements, sample_requirements, production_requirements, last_updated
) values
  ('PER001', 1, '大型', '工业控制系统', '事业部制', '理性决策', '交付波动导致项目延期',
   '某国际品牌', '稳定优先', '需要可快速替代方案', '强调兼容性', '2周内出样', '季度稳定供货', current_date),
  ('PER002', 2, '中型', '新能源设备', '矩阵管理', '成本与性能平衡', '认证周期长',
   '国产厂商', '性价比优先', '希望缩短认证周期', '重视技术支持', '1周快速打样', '批量一致性', current_date)
on conflict (id) do nothing;

insert into public.crm_inquiry(
  inquiry_no, customer_id, company_name, customer_name, contact, source_channel, category, province, situation,
  status, classification, customer_inquiry, notes, create_date, update_date, creator_id, creator_name
) values
  ('INQ-2026-001', 1, '华东智造股份有限公司', '华东智造股份有限公司', '王总', '其他', '技术咨询', '上海',
   '希望确认替代型号交付稳定性', '待处理', '有效', '是否有长期稳定供货方案', '客户对二供方案兴趣高', current_date, current_date, 'user-sales-mgr', '销售经理'),
  ('INQ-2026-002', 2, '南方设备集团有限公司', '南方设备集团有限公司', '李工', '官网', '产品询价', '深圳',
   '关注认证和样品进度', '待处理', '处理中', '能否一周内交样', '希望同步FAE支持', current_date, current_date, 'user-sales-a', '业务员A')
on conflict (inquiry_no) do nothing;

insert into public.crm_lead(
  lead_no, customer_id, customer_name, name, phone, customer_action, industry, status, classification, assignee,
  source_channel, source_type, product_category, product_series, source_status, inquiry_id, contact_id,
  buying_mode, buyer_role, product_industry, customer_opportunity, create_date, creator_id, creator_name
) values
  ('LEAD-2026-001', 1, '华东智造股份有限公司', '王总', '13800000001', '寻替代品', '工业自动化', '跟进中', '有效', 'user-sales-mgr',
   '其他', '在线', '接插件', '工业连接器标准系列', '客服', 1, 'CON001', '理性决策', '决策者', '工业', '替代导入项目', current_date, 'user-sales-mgr', '销售经理')
on conflict (lead_no) do nothing;

insert into public.crm_opportunity(
  opportunity_no, customer_id, customer_name, opp_date, status, opp_summary, product_line, sales_rep, opp_level, intent_amount,
  associated_project, end_customer, end_project, product_industry, lead_id, inquiry_id, application_scenario,
  estimated_usage, estimated_mass_production_date
) values
  ('OPP-2026-001', 1, '华东智造股份有限公司', current_date, '跟进中', '温控系统替代导入', '工业连接器', 'user-sales-mgr', 'A级', 800000,
   'PRJ001', '华东终端客户A', '产线升级项目', '工业', 1, 1, '温控产线', '月均5万pcs', current_date + interval '120 day')
on conflict (opportunity_no) do nothing;

insert into public.crm_project(
  project_no, customer_id, customer_name, project_name, status, stage, manager, project_type, project_level, wechat_group,
  team, intent_amount, end_customer, opp_summary, application_scenario, product_industry, estimated_usage,
  estimated_mass_production_date, customer_action, sales_rep, product_owner, quality_owner, purchaser, fae,
  lead_id, opportunity_id, inquiry_id, product_line, start_date, end_date, create_date, creator_id, creator_name
) values
  ('PRJ-2026-001', 1, '华东智造股份有限公司', '华东智造温控升级项目', '跟进中', '设计阶段', '张项目经理',
   '研发型项目', 'A', '华东智造-项目群',
   '{"sales":"user-sales-mgr","pm":"张项目经理","product":"产品经理A","quality":"质量负责人B","purchasing":"采购C","fae":"FAE-D"}'::jsonb,
   800000, '华东终端客户A', '核心机型导入', '温控产线', '工业', '月均5万pcs',
   current_date + interval '120 day', '寻替代品', 'user-sales-mgr', '产品经理A', '质量负责人B', '采购C', 'FAE-D',
   1, 1, 1, '工业连接器', current_date, current_date + interval '180 day', current_date, 'user-sales-mgr', '销售经理')
on conflict (project_no) do nothing;

do $$
begin
  if to_regclass('public.crm_wx_conversation') is not null then
    insert into public.crm_wx_conversation(
      conversation_key, source_guid, conversation_type, conversation_identity_type, is_internal_chat,
      my_wechat_id, my_wechat_name, peer_wechat_id, peer_wechat_name, room_username, conversation_name,
      room_name, room_remark_name, customer_id, primary_contact_id, owner_employee_id, status
    ) values
      ('private:wx_sales_manager:wx_wangzong', 'wx_guid_001', 'private', 'private_direct', false, 'wx_sales_manager', '销售经理', 'wx_wangzong', '王总', null, '王总私聊', null, null, '1', 'CON001', 'user-sales-mgr', 'active'),
      ('private:wx_sales_a:wx_ligong', 'wx_guid_001', 'private', 'private_direct', false, 'wx_sales_a', '业务员A', 'wx_ligong', '李工', null, '李工私聊', null, null, '2', 'CON002', 'user-sales-a', 'active'),
      ('group:wx_grp_huadong_001', 'wx_guid_001', 'group', 'group', false, null, null, null, null, 'wx_grp_huadong_001', '华东智造项目群', '华东智造项目群', '华东项目群', '1', 'CON001', 'user-sales-mgr', 'active'),
      ('group:wx_grp_nanfang_001', 'wx_guid_001', 'group', 'group', false, null, null, null, null, 'wx_grp_nanfang_001', '南方设备技术群', '南方设备技术群', '南方技术群', '2', 'CON002', 'user-sales-a', 'active')
    on conflict (conversation_key) do update
    set
      customer_id = excluded.customer_id,
      primary_contact_id = excluded.primary_contact_id,
      owner_employee_id = excluded.owner_employee_id,
      conversation_name = excluded.conversation_name,
      room_name = excluded.room_name,
      room_remark_name = excluded.room_remark_name,
      updated_at = now();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.crm_wx_message') is not null then
    insert into public.crm_wx_message(
      conversation_id, source_guid, message_scope, message_origin_type, raw_event_table, raw_event_dedupe_key,
      raw_msg_id, sender_wechat_id, sender_display_name, receiver_wechat_id, msg_type, content, send_time
    )
    select
      c.id,
      c.source_guid,
      'private',
      'private_forward',
      'wechat_raw.wechat_private_message_events',
      format('seed-private-%s', i),
      format('seed-private-msg-%s', i),
      case when mod(i, 2) = 1 then c.my_wechat_id else c.peer_wechat_id end,
      case when mod(i, 2) = 1 then c.my_wechat_name else c.peer_wechat_name end,
      case when mod(i, 2) = 1 then c.peer_wechat_id else c.my_wechat_id end,
      1,
      case mod(i, 5)
        when 0 then format('私聊第%s条：请确认交付节奏和风险兜底方案。', i)
        when 1 then format('私聊第%s条：客户关注价格边界，请给TCO测算。', i)
        when 2 then format('私聊第%s条：请补充认证资料与测试计划。', i)
        when 3 then format('私聊第%s条：交期是否可以压缩到两周内？', i)
        else format('私聊第%s条：建议先小批试产再推进量产。', i)
      end,
      now() - interval '3 day' + (i || ' minutes')::interval
    from generate_series(1, 100) as g(i)
    cross join lateral (
      select id, source_guid, my_wechat_id, my_wechat_name, peer_wechat_id, peer_wechat_name
      from public.crm_wx_conversation
      where conversation_key = case when mod(i, 2) = 1 then 'private:wx_sales_manager:wx_wangzong' else 'private:wx_sales_a:wx_ligong' end
      limit 1
    ) c
    on conflict (raw_event_table, raw_event_dedupe_key) do nothing;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.crm_wx_message') is not null then
    insert into public.crm_wx_message(
      conversation_id, source_guid, message_scope, message_origin_type, raw_event_table, raw_event_dedupe_key,
      raw_msg_id, sender_wechat_id, sender_display_name, room_username, room_name, room_remark_name, msg_type, content, send_time
    )
    select
      c.id,
      c.source_guid,
      'group',
      'group_live',
      'wechat_raw.wechat_group_message_events',
      format('seed-group-%s', i),
      format('seed-group-msg-%s', i),
      case
        when mod(i, 5) = 0 then 'wx_sales_manager'
        when mod(i, 5) = 1 then 'wx_procurement_hd'
        when mod(i, 5) = 2 then 'wx_sales_a'
        when mod(i, 5) = 3 then 'wx_ligong'
        else 'wx_quality_team'
      end,
      case
        when mod(i, 5) = 0 then '销售经理'
        when mod(i, 5) = 1 then '采购同事'
        when mod(i, 5) = 2 then '业务员A'
        when mod(i, 5) = 3 then '李工'
        else '质量团队'
      end,
      c.room_username,
      c.room_name,
      c.room_remark_name,
      1,
      case mod(i, 10)
        when 0 then format('群聊第%s条：今天同步试产节奏与里程碑。', i)
        when 1 then format('群聊第%s条：请补充异常升级路径和责任人。', i)
        when 2 then format('群聊第%s条：客户要求先验证耐温和振动指标。', i)
        when 3 then format('群聊第%s条：请确认本周样品出货与签收时间。', i)
        when 4 then format('群聊第%s条：竞品在价格上有优势，我们强调可靠性。', i)
        when 5 then format('群聊第%s条：请更新供应链备货安全库存。', i)
        when 6 then format('群聊第%s条：会议纪要已发，待各部门确认。', i)
        when 7 then format('群聊第%s条：客户关注点转向交付一致性。', i)
        when 8 then format('群聊第%s条：下周安排联合测试和问题复盘。', i)
        else format('群聊第%s条：请在今天18点前反馈风险项。', i)
      end,
      now() - interval '2 day' + (i || ' minutes')::interval
    from generate_series(1, 100) as g(i)
    cross join lateral (
      select id, source_guid, room_username, room_name, room_remark_name
      from public.crm_wx_conversation
      where conversation_key = case when mod(i, 2) = 1 then 'group:wx_grp_huadong_001' else 'group:wx_grp_nanfang_001' end
      limit 1
    ) c
    on conflict (raw_event_table, raw_event_dedupe_key) do nothing;
  end if;
end
$$;

insert into public.crm_communication_log(id, source_id, customer_id, date, sender, content, type, source_group, is_summarized) values
  ('LOG001', '11111111-1111-1111-1111-111111111001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '王总您好，关于替代型号这边已完成首轮验证，交期可控在两周内。', 'wechat', 'wx_wangzong', false),
  ('LOG002', '11111111-1111-1111-1111-111111111001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '王总', '如果两周能稳定交付，我们可以先走小批量。', 'wechat', 'wx_wangzong', false),
  ('LOG003', '22222222-2222-2222-2222-222222222001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '各位好，今天同步试产节奏和风险清单。', 'wechat_group', '华东智造项目群', false),
  ('LOG004', '22222222-2222-2222-2222-222222222001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '采购同事', '请把备货策略和异常升级路径发到群里。', 'wechat_group', '华东智造项目群', false),
  ('LOG005', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), 'sales_manager@example.com', '已邮件发送报价与TCO测算，请查收附件。', 'email', '邮件往来', false),
  ('LOG006', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '周例会已确认试产窗口，客户关注点聚焦在交期和一致性。', 'meeting', '周会纪要', false),
  ('LOG007', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '电话沟通后，客户接受先导入一个机型验证。', 'phone', 'customer_followup', false),
  ('LOG008', '11111111-1111-1111-1111-111111111002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '李工您好，样品认证资料今天内会补齐。', 'wechat', 'wx_ligong', false),
  ('LOG009', '11111111-1111-1111-1111-111111111002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '李工', '好的，重点把UL认证和耐温数据一并发我。', 'wechat', 'wx_ligong', false),
  ('LOG010', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '会议结论：下周安排联合测试，确认量产前验证项。', 'meeting', '技术评审会', false),
  ('LOG011', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '邮件已发送测试计划和里程碑，请研发团队确认。', 'email', '邮件往来', false),
  ('LOG012', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '聊天记录：客户要求一周内出样，优先验证可靠性。', 'phone', 'customer_followup', false)
on conflict (id) do nothing;

insert into public.crm_task_type(id, name, default_hours) values
  ('TT001', '客户拜访', 24),
  ('TT002', '样品跟进', 48),
  ('TT003', '报价跟进', 24)
on conflict (id) do nothing;

insert into public.crm_task(
  id, title, description, module, related_id, source_type, source_id, task_type, status, importance, urgency,
  assignee_id, assignee_name, due_date, create_date, creator_id, creator_name, auxiliary_json
) values
  ('TASK001', '拜访王总确认导入节奏', '围绕交付稳定和导入风险进行面谈', 'customer_visit', 'CUST001', 'visit', 'CUST001', '客户拜访',
   '待办', '高', '紧急', 'user-sales-mgr', '销售经理', current_date + interval '2 day', current_date, 'user-sales-mgr', '销售经理',
   '{"objectives":[{"id":"obj_1","title":"确认试产节奏"},{"id":"obj_2","title":"明确风险点"}]}'::jsonb)
on conflict (id) do nothing;

insert into public.crm_competitor(id, name, advantages, disadvantages, positioning, product_matrix) values
  ('COMP001', '竞品A', '交付快，渠道广', '定制深度不足', '中端标准化', '[{"productName":"竞品连接器A","benchmarkCategory":"接插件","advantages":"交期快","disadvantages":"定制弱"}]'::jsonb),
  ('COMP002', '竞品B', '价格低', '质量波动', '价格驱动型', '[{"productName":"竞品线束B","benchmarkCategory":"线束","advantages":"价格低","disadvantages":"一致性一般"}]'::jsonb)
on conflict (id) do nothing;

insert into public.crm_customer_competitor(id, customer_id, competitor_id, threat_level, notes) values
  ('CC001', 1, 'COMP001', '高', '王总重点对比对象')
on conflict (id) do nothing;

insert into public.crm_customer_focus_swot(
  id, customer_id, customer_focus, key_contact, focus_level, our_strengths, our_weaknesses, ai_script, sort_order
) values
  ('FS001', 1, '交付稳定性', '王总', 5, '["国产替代成功案例","本地服务团队"]'::jsonb, '["库存安全垫不足"]'::jsonb, '建议先以小批量试产建立信任，再推进批量导入。', 0)
on conflict (id) do nothing;

insert into public.crm_customer_focus_competitor(
  id, focus_id, customer_id, competitor_name, strengths, weaknesses, sort_order
) values
  ('FC001', 'FS001', 1, '竞品A', '["交期短"]'::jsonb, '["定制能力一般"]'::jsonb, 0)
on conflict (id) do nothing;

insert into public.crm_customer_follow_strategy_config(id, config) values
  ('default', '{
    "focusPoints":[
      {"id":"fp_1","name":"业务结果","positions":["总经理"],"askMethod":"本季度核心目标是什么？","metric":"营收增长率"},
      {"id":"fp_2","name":"风险控制","positions":["采购总监"],"askMethod":"您最担心哪类交付风险？","metric":"准时交付率"}
    ],
    "rules":[
      {
        "id":"sr_1",
        "name":"决策层攻坚（A/D）",
        "positionKeywords":["总","总监"],
        "roleTags":["A","D"],
        "attitudeMin":-2,
        "attitudeMax":1,
        "influenceMin":3,
        "influenceMax":5,
        "relationMin":1,
        "relationMax":3,
        "contextSources":["customer_name","contact_persona","meeting_records"],
        "promptTemplate":"请为{customer_name}联系人{contact_name}制定下一步推进策略。"
      }
    ]
  }'::jsonb)
on conflict (id) do update set config = excluded.config, updated_at = now();

insert into public.crm_customer_faq_library_config(id, config) values
  ('default', '{
    "categories":[
      {
        "id":"faq_cat_01","name":"战略与业务价值",
        "subCategories":[
          {"id":"faq_sub_01_01","name":"是否匹配客户战略","question":"我们的方案是否匹配今年战略目标？","answer":"先对齐贵司今年增长与交付目标，再说明方案如何缩短导入周期并降低失效风险，建议先做低风险试点验证。"},
          {"id":"faq_sub_01_02","name":"ROI不清晰","question":"这个项目的ROI怎么证明？","answer":"先建立现有成本TCO基线，再拆解节省项和风险下降项，形成可审计ROI测算并与财务采购共同复核。"}
        ]
      },
      {
        "id":"faq_cat_02","name":"需求澄清与场景定义",
        "subCategories":[
          {"id":"faq_sub_02_01","name":"需求描述模糊","question":"我们要更稳定，但还没法给明确指标怎么办？","answer":"先确认现状故障率和交付波动，再量化影响到停机和返工成本，最后共同冻结验收指标。"},
          {"id":"faq_sub_02_02","name":"需求频繁变更","question":"需求一直变，项目周期怎么控？","answer":"建议按Must/Should/Could分层，先锁定核心范围，再在里程碑节点处理增量需求。"}
        ]
      },
      {
        "id":"faq_cat_03","name":"产品与技术方案",
        "subCategories":[
          {"id":"faq_sub_03_01","name":"性能指标是否达标","question":"你们性能指标是否能达标？","answer":"按双方确认指标做联合验证，提供测试数据并明确边界条件和风险兜底方案。"},
          {"id":"faq_sub_03_02","name":"兼容与集成风险","question":"替换后兼容风险怎么控制？","answer":"先做接口差异清单，再给适配步骤和回退机制，确保导入风险可控。"}
        ]
      },
      {
        "id":"faq_cat_04","name":"价格与商务条款",
        "subCategories":[
          {"id":"faq_sub_04_01","name":"价格高于预期","question":"你们价格比预期高，怎么谈？","answer":"不只比较单价，更看总拥有成本和交付风险，建议按基础版/增强版分层对齐预算。"},
          {"id":"faq_sub_04_02","name":"付款与账期争议","question":"账期和付款条款怎么平衡？","answer":"可讨论分阶段付款与量产折扣联动，但需要保障现金流安全和交付资源。"}
        ]
      }
    ]
  }'::jsonb)
on conflict (id) do update set config = excluded.config, updated_at = now();

insert into public.crm_stakeholder_assessment(
  id, customer_id, stakeholder_id, assessment_date, need_level_score, power_score, attitude_score, relation_score,
  business_alignment_score, confidence_score, conclusion, strategy_suggestion, source_type, ai_model, created_by
) values
  ('ASM001', 1, 'CON001', current_date, 4, 5, 1, 3, 4, 72, '王总可推动替代导入，但需要风险兜底。', '先安排小批量试产并建立周报机制。', 'manual', 'gemini-3.1-pro-preview', 'user-sales-mgr')
on conflict (id) do nothing;

insert into public.crm_quotation(
  quote_no, customer_id, customer_name, project_id, project_name, quote_date, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, contact_person, valid_until
) values
  ('Q-2026-001', 1, '华东智造股份有限公司', 1, '华东智造温控升级项目', current_date, 'quotation_complete', '未审核', 6800, 6017.70, 6800, '王总', current_date + interval '30 day')
on conflict (quote_no) do nothing;

insert into public.crm_quotation_item(
  quotation_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, lead_time, moq
) values
  (1, 1, '工业连接器A', 'IO-001', 100, '增值税专票', 13, 68, 60.1770, 6800, 6017.70, 782.30, '15天', 100)
on conflict (id) do nothing;

insert into public.crm_sales_order(
  order_no, customer_id, customer_name, project_id, project_name, order_date, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, sales_rep, merchandiser
) values
  ('SO-2026-001', 1, '华东智造股份有限公司', 1, '华东智造温控升级项目', current_date, 'un_paid', '未审核', 13600, 12035.40, 13600, 'user-sales-mgr', '张跟单')
on conflict (order_no) do nothing;

insert into public.crm_sales_order_item(
  sales_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount
) values
  (1, 1, '工业连接器A', 'IO-001', 200, '增值税专票', 13, 68, 60.1770, 13600, 12035.40, 1564.60)
on conflict (id) do nothing;

insert into public.crm_sample_order(
  sample_no, customer_id, customer_name, applicant, project_id, project_name, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, sales_rep, merchandiser
) values
  ('SAM-2026-001', 1, '华东智造股份有限公司', 'user-sales-mgr', 1, '华东智造温控升级项目', 'wait_leader_examine', '未审核', 680, 601.77, 680, 'user-sales-mgr', '张跟单')
on conflict (sample_no) do nothing;

insert into public.crm_sample_order_item(
  sample_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount
) values
  (1, 1, '工业连接器A', 'IO-001', 10, '增值税专票', 13, 68, 60.1770, 680, 601.77, 78.23)
on conflict (id) do nothing;

insert into public.crm_return_order(
  return_no, order_no, original_order_no, customer_id, customer_name, reason, handler, sales_rep, merchandiser,
  project_id, project_name, status, audit_status, tax_included_total_amount, tax_excluded_total_amount,
  after_sale_no, after_sale_reason
) values
  ('RET-2026-001', 'SO-2026-001', 'SO-2026-001', 1, '华东智造股份有限公司', '批次外观不一致', 'user-sales-mgr',
   'user-sales-mgr', '张跟单', 1, '华东智造温控升级项目', '待处理', '未审核', 680, 601.77, 'RET-2026-001', '批次外观不一致')
on conflict (return_no) do nothing;

insert into public.crm_return_order_item(
  return_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, order_no, return_no, material_id,
  material_name, expected_after_sale_method, after_sale_reason, issue_description, return_tracking_no,
  final_handling_method, return_qty, return_method, after_sale_order_id, after_sale_no, material_qty
) values
  (1, 1, '工业连接器A', 'IO-001', 10, '增值税专票', 13, 68, 60.1770, 680, 601.77, 78.23,
   'SO-2026-001', 'RET-2026-001', 'IO-001', '工业连接器A', '退货', '外观问题', '外观色差超标', 'SF12345678',
   '退货入库', 10, '退货入库', 1, 'RET-2026-001', 10)
on conflict (id) do nothing;

insert into public.crm_purchase_quotation(
  purchase_quote_no, project_id, quote_time, supplier, created_by, customer_name, customer_id, valid_until
) values
  ('PQ-2026-001', 1, current_date, '供应商A', 'user-sales-mgr', '华东智造股份有限公司', 1, current_date + interval '15 day')
on conflict (purchase_quote_no) do nothing;

insert into public.crm_purchase_quotation_item(
  material_no, material_desc, tax_included_unit_price, tax_excluded_unit_price, sample_price, unit, lead_time, moq, mpq,
  purchase_quotation_id
) values
  ('IO-001', '工业连接器A', 58, 51.33, 68, 'pcs', '10天', 50, 100, 1)
on conflict (id) do nothing;

insert into public.crm_potential_customer(id, name) values
  ('PC001', '北方精工有限公司'),
  ('PC002', '中部电气技术有限公司')
on conflict (id) do nothing;

insert into public.crm_ontology_object(id, name, code, description, system_link, is_sub_table) values
  ('OBJ001', '客户本体', 'ba_manucustinfo', '客户主数据', 'ba_manucustinfo', false),
  ('OBJ002', '询盘', 'crm_inquiry', '询盘业务对象', 'crm_inquiry', false),
  ('OBJ003', '线索', 'crm_lead', '线索业务对象', 'crm_lead', false),
  ('OBJ004', '商机', 'crm_opportunity', '商机业务对象', 'crm_opportunity', false),
  ('OBJ005', '项目', 'crm_project', '项目业务对象', 'crm_project', false)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  system_link = excluded.system_link,
  is_sub_table = excluded.is_sub_table,
  updated_at = now();

commit;
