begin;

-- ========= 员工信息表 =========
insert into public.ba_employeeinfo(id, no, name, username, email, role, department, is_active) values
  ('EMP001', 'E001', '系统管理员', 'admin', 'admin@example.com', '管理员', '系统管理部', true),
  ('EMP002', 'E002', '销售经理', 'sales_manager', 'sales_manager@example.com', '总监', '销售部', true),
  ('EMP003', 'E003', '业务员A', 'sales_a', 'sales_a@example.com', '业务员', '销售部', true),
  ('EMP004', 'E004', '业务员B', 'sales_b', 'sales_b@example.com', '业务员', '销售部', true),
  ('EMP005', 'E005', '业务员C', 'sales_c', 'sales_c@example.com', '业务员', '销售二组', true),
  ('EMP006', 'E006', '技术经理', 'tech_manager', 'tech_manager@example.com', '经理', '技术部', true),
  ('EMP007', 'E007', '跟单员A', 'mer_a', 'mer_a@example.com', '跟单员', '销售部', true),
  ('EMP008', 'E008', '跟单员B', 'mer_b', 'mer_b@example.com', '跟单员', '销售二组', true);

-- ========= 品牌表 =========
insert into public.ba_brand(id, name, status) values
  (1, '胜蓝', 1),
  (2, '万连', 1),
  (3, '电子谷', 1),
  (4, '莫氏', 1),
  (5, '中航光电', 1),
  (6, '德力西', 1);

-- ========= 归属小组表 =========
insert into public.ba_group(id, name, manager) values
  (1, '销售一组', 'EMP002'),
  (2, '销售二组', 'EMP005'),
  (3, '技术支持组', 'EMP006'),
  (4, '大客户组', 'EMP002'),
  (5, '渠道组', 'EMP004');

-- ========= 产品线表 =========
insert into public.ba_product_line(id, parent_id, name, manager) values
  (1, null, '接插件', '产品经理A'),
  (2, 1, '工业连接器', '产品经理B'),
  (3, 1, '新能源连接器', '产品经理C'),
  (4, null, '线束', '产品经理D'),
  (5, 4, '新能源线束', '产品经理E'),
  (6, 4, '工业线束', '产品经理F'),
  (7, null, '电子电气', '产品经理G'),
  (8, 7, '继电器', '产品经理H'),
  (9, 7, '接触器', '产品经理I');

-- ========= 产品分类表 =========
insert into public.ba_cptype(id, parent_id, name, fab_features, fab_advantages, fab_benefits, status) values
  (1, null, '接插件', '连接稳定', '一致性高', '降低返修率', 1),
  (2, null, '线束', '定制能力强', '交付柔性高', '提升交付确定性', 1),
  (3, null, '工业连接器', '耐恶劣环境', '可靠性高', '延长使用寿命', 1),
  (4, null, '新能源连接器', '耐高温高压', '安全性高', '符合行业标准', 1),
  (5, null, '继电器', '响应速度快', '寿命长', '降低能耗', 1),
  (6, null, '接触器', '承载能力大', '耐磨损', '稳定可靠', 1);

-- ========= SPU表 =========
insert into public.ba_spu(id, name, brand_id, category_id, category_name) values
  (1, '工业连接器标准系列', 1, 1, '接插件'),
  (2, '新能源线束系列', 1, 2, '线束'),
  (3, '高端工业连接器系列', 1, 3, '工业连接器'),
  (4, 'EV连接器系列', 2, 4, '新能源连接器'),
  (5, '继电器系列', 3, 5, '继电器'),
  (6, '智能家居线束系列', 1, 2, '线束'),
  (7, '接触器系列', 6, 6, '接触器');

-- ========= 公共属性名称表 =========
insert into public.public_property_name(id, specification_name, group_name, image, is_searchable) values
  (1, '接口类型', '基本属性', null, 1),
  (2, '额定电流', '电气属性', null, 1),
  (3, '额定电压', '电气属性', null, 1),
  (4, '防护等级', '环境属性', null, 1),
  (5, '工作温度', '环境属性', null, 1),
  (6, '材质', '物理属性', null, 1),
  (7, '安装方式', '机械属性', null, 1),
  (8, '认证', '品质属性', null, 1);

-- ========= 公共属性值表 =========
insert into public.public_property_value(id, property_id, property_value, property_value_image, public_property_name) values
  (1, 1, '8Pin', null, '接口类型'),
  (2, 1, '12Pin', null, '接口类型'),
  (3, 1, '16Pin', null, '接口类型'),
  (4, 1, '24Pin', null, '接口类型'),
  (5, 2, '10A', null, '额定电流'),
  (6, 2, '15A', null, '额定电流'),
  (7, 2, '20A', null, '额定电流'),
  (8, 2, '30A', null, '额定电流'),
  (9, 3, '250V', null, '额定电压'),
  (10, 3, '380V', null, '额定电压'),
  (11, 3, '480V', null, '额定电压'),
  (12, 4, 'IP67', null, '防护等级'),
  (13, 4, 'IP68', null, '防护等级'),
  (14, 4, 'IP69K', null, '防护等级'),
  (15, 5, '-40℃~85℃', null, '工作温度'),
  (16, 5, '-40℃~125℃', null, '工作温度'),
  (17, 6, '尼龙', null, '材质'),
  (18, 6, '铝合金', null, '材质'),
  (19, 7, '面板安装', null, '安装方式'),
  (20, 7, '导轨安装', null, '安装方式'),
  (21, 8, 'UL认证', null, '认证'),
  (22, 8, 'CE认证', null, '认证'),
  (23, 8, 'TUV认证', null, '认证');

-- ========= 产品系列表 =========
insert into public.crm_product_series(series_no, name, category_id, description, fab_features, fab_advantages, fab_benefits) values
  ('SER001', '工业连接器标准系列', 1, '面向工业控制场景', '耐振动', '长期稳定', '减少维护停机'),
  ('SER002', '新能源线束系列', 2, '面向新能源设备', '耐温', '轻量化', '提升系统效率'),
  ('SER003', '高端工业连接器系列', 3, '面向高端装备制造', '耐恶劣环境', '可靠性极高', '延长设备寿命'),
  ('SER004', 'EV充电连接器系列', 4, '面向新能源汽车充电', '耐高压', '安全性高', '符合国标'),
  ('SER005', '轨道交通连接器系列', 3, '面向轨道交通', '耐冲击', '抗振动', '稳定可靠'),
  ('SER006', '智能家居线束系列', 2, '面向智能家居', '美观小巧', '安装便捷', '降低成本');

-- ========= 物料信息表 =========
insert into public.ba_cpinfo(id, category_id, category_name, material_no, material_name, specification, unit, price, min_price, status, brand_id, brand_name, min_pack_qty, min_order_qty, product_line_level1_id, product_line_level2_id, group_id, group_name, spu_id, spu_name) values
  (1, 1, '接插件', 'IO-001', '工业连接器A', '8Pin IP67', 'pcs', 68.00, 62.00, 1, 1, '胜蓝', 10, 100, 1, 2, 1, '销售一组', 1, '工业连接器标准系列'),
  (2, 2, '线束', 'WH-101', '新能源线束B', 'UL认证', 'pcs', 96.00, 88.00, 1, 1, '胜蓝', 5, 50, 4, 5, 2, '销售二组', 2, '新能源线束系列'),
  (3, 3, '工业连接器', 'IO-201', '高端工业连接器C', '16Pin IP68', 'pcs', 158.00, 145.00, 1, 1, '胜蓝', 5, 50, 1, 3, 1, '销售一组', 3, '高端工业连接器系列'),
  (4, 4, '新能源连接器', 'EV-001', 'EV充电连接器D', 'IP67 国标', 'pcs', 85.00, 78.00, 1, 2, '万连', 10, 100, 1, 4, 1, '销售一组', 4, 'EV连接器系列'),
  (5, 1, '接插件', 'IO-301', '轨道交通连接器E', '24Pin IP69K', 'pcs', 220.00, 200.00, 1, 1, '胜蓝', 2, 20, 1, 3, 4, '大客户组', 5, '轨道交通连接器系列'),
  (6, 2, '线束', 'WH-201', '智能家居线束F', '小型化', 'pcs', 45.00, 40.00, 1, 1, '胜蓝', 20, 200, 4, 6, 2, '销售二组', 6, '智能家居线束系列'),
  (7, 5, '继电器', 'RL-101', '小型继电器G', '10A 250V', 'pcs', 12.00, 10.00, 1, 3, '电子谷', 50, 500, 7, 8, 3, '技术支持组', 5, '继电器系列'),
  (8, 6, '接触器', 'CT-101', '交流接触器H', '20A 380V', 'pcs', 180.00, 165.00, 1, 6, '德力西', 5, 50, 7, 9, 3, '技术支持组', 7, '接触器系列');

-- ========= 产品属性关系表 =========
insert into public.ba_product_property_relation(id, material_id, product_id, spu_status, product_status, product_name, property_id, property_name, property_value, property_value_id, category_id, category_name) values
  (1, 'IO-001', 1, 1, 1, '工业连接器A', 1, '接口类型', '8Pin', 1, 1, '接插件'),
  (2, 'IO-001', 1, 1, 1, '工业连接器A', 4, '防护等级', 'IP67', 12, 1, '接插件'),
  (3, 'WH-101', 2, 1, 1, '新能源线束B', 3, '额定电压', '250V', 9, 2, '线束'),
  (4, 'WH-101', 2, 1, 1, '新能源线束B', 8, '认证', 'UL认证', 21, 2, '线束'),
  (5, 'IO-201', 3, 1, 1, '高端工业连接器C', 1, '接口类型', '16Pin', 3, 3, '工业连接器'),
  (6, 'IO-201', 3, 1, 1, '高端工业连接器C', 4, '防护等级', 'IP68', 13, 3, '工业连接器'),
  (7, 'EV-001', 4, 1, 1, 'EV充电连接器D', 3, '额定电压', '480V', 11, 4, '新能源连接器'),
  (8, 'EV-001', 4, 1, 1, 'EV充电连接器D', 5, '工作温度', '-40℃~85℃', 15, 4, '新能源连接器'),
  (9, 'IO-301', 5, 1, 1, '轨道交通连接器E', 1, '接口类型', '24Pin', 4, 1, '接插件'),
  (10, 'IO-301', 5, 1, 1, '轨道交通连接器E', 4, '防护等级', 'IP69K', 14, 1, '接插件');

-- ========= 客户信息表 =========
insert into public.ba_manucustinfo(
  id, customer_number, name, level, status, industry, source, region, sales_rep, payment_term, has_payment_term, customer_type, merchandiser, merchandiser_id, business_manager, currency, currency_id, customer_category, group_name, short_name, english_name, legal_person, registered_capital, company_address, company_type, website
) values
  (1, 'CUST001', '华东智造股份有限公司', '战略客户', 1, '工业自动化', 1, 1, 'EMP002', 30, 1, 1, '张跟单', 'MER001', '王经理', 'CNY', 1, 1, '华东区', '华东智造', 'East Manufacturing', '王建国', '5000万', '上海市浦东新区XX路1号', '股份有限公司', 'https://example.com'),
  (2, 'CUST002', '南方设备集团有限公司', '成长客户', 1, '新能源设备', 2, 2, 'EMP003', 60, 1, 1, '李跟单', 'MER002', '赵经理', 'CNY', 1, 2, '华南区', '南方设备', 'South Equipment', '李海峰', '3000万', '深圳市南山区YY路8号', '有限责任公司', 'https://example.org'),
  (3, 'CUST003', '北方工业科技有限公司', '普通客户', 1, '机械设备', 3, 3, 'EMP004', 30, 0, 1, '孙跟单', 'MER003', '刘经理', 'CNY', 1, 3, '华北区', '北方工业', 'North Industry', '张志强', '2000万', '北京市朝阳区ZZ路12号', '有限责任公司', 'https://example.cn'),
  (4, 'CUST004', '中部电气股份有限公司', '重要客户', 1, '电力设备', 4, 4, 'EMP005', 45, 1, 1, '周跟单', 'MER004', '郑经理', 'CNY', 1, 2, '华中区', '中部电气', 'Central Electric', '赵志明', '8000万', '武汉市东湖区AA路88号', '股份有限公司', 'https://example.edu'),
  (5, 'CUST005', '西部新能源有限公司', '战略客户', 1, '新能源', 5, 5, 'EMP002', 60, 1, 1, '吴跟单', 'MER005', '钱经理', 'CNY', 1, 4, '西南区', '西部新能源', 'West New Energy', '孙丽华', '1亿', '成都市高新区BB路66号', '有限责任公司', 'https://example.gov'),
  (6, 'CUST006', '华南汽车电子股份有限公司', '重要客户', 1, '汽车电子', 2, 2, 'EMP003', 30, 1, 1, '郑跟单', 'MER006', '陈经理', 'CNY', 1, 2, '华南区', '华南汽车电子', 'South Auto Electronics', '刘伟', '5000万', '广州市天河区CC路55号', '股份有限公司', 'https://example.net'),
  (7, 'CUST007', '华东轨道交通设备有限公司', '普通客户', 1, '轨道交通', 1, 1, 'EMP004', 45, 0, 1, '王跟单', 'MER007', '周经理', 'CNY', 1, 1, '华东区', '华东轨道', 'East Rail', '杨海东', '6000万', '南京市江宁区DD路33号', '有限责任公司', 'https://example.io'),
  (8, 'CUST008', '智能家居科技有限公司', '成长客户', 1, '智能家居', 6, 2, 'EMP005', 30, 1, 1, '冯跟单', 'MER008', '许经理', 'CNY', 1, 2, '华南区', '智能家居', 'Smart Home Tech', '刘德华', '3000万', '佛山市顺德区EE路99号', '股份有限公司', 'https://example.ai');

-- ========= 客户用户表 =========
insert into public.ba_customer_user(
  id, customer_id, member_name, contact_name, phone, email, is_primary, status, source
) values
  (1, 1, '华东智造采购账号', '王总', '13800000001', 'wang@example.com', 1, 1, 2),
  (2, 1, '华东智造技术账号', '赵工', '13800000011', 'zhao@example.com', 0, 1, 1),
  (3, 2, '南方设备研发账号', '李工', '13800000002', 'li@example.com', 1, 1, 2),
  (4, 2, '南方设备采购账号', '陈经理', '13800000022', 'chen@example.com', 0, 1, 1),
  (5, 3, '北方工业采购账号', '刘总', '13800000003', 'liu@example.com', 1, 1, 2),
  (6, 3, '北方工业技术账号', '王工', '13800000033', 'wang_tech@example.com', 0, 1, 1),
  (7, 4, '中部电气采购账号', '郑总', '13800000004', 'zheng@example.com', 1, 1, 2),
  (8, 4, '中部电气技术账号', '马工', '13800000044', 'ma@example.com', 0, 1, 1),
  (9, 5, '西部新能源采购账号', '钱总', '13800000005', 'qian@example.com', 1, 1, 2),
  (10, 5, '西部新能源技术账号', '赵工', '13800000055', 'zhao_newenergy@example.com', 0, 1, 1),
  (11, 6, '华南汽车采购账号', '陈总', '13800000006', 'chen_auto@example.com', 1, 1, 2),
  (12, 6, '华南汽车技术账号', '林工', '13800000066', 'lin@example.com', 0, 1, 1);

-- ========= 客户联系人表 =========
insert into public.crm_customer_contact(
  id, customer_id, name, position, department, phone, email, is_primary, buying_role, buying_mode, appellation,
  wechat_id, faction, attitude_to_us, attitude_score, role_tag, influence_level, relation_level, graduation_school,
  hometown, hobbies, family_situation, personality, preferences, key_concerns, follow_strategy
) values
  ('CON001', 1, '王总', '采购总监', '采购部', '13800000001', 'wang@example.com', true, '经济买家', '竞争性招标', '王总',
   'wx_wangzong', '总部派', '正面评价', 1, 'D', 5, 3, '同济大学', '上海', ARRAY['羽毛球','阅读'], '已婚', '务实谨慎', '数据化沟通', '成本与交付稳定', '双周同步关键里程碑'),
  ('CON002', 2, '李工', '研发经理', '研发部', '13800000002', 'li@example.com', true, '技术买家', '技术先行', '李工',
   'wx_ligong', '技术线', '中性评价', 0, 'E', 4, 2, '华南理工', '广州', ARRAY['跑步'], '已婚', '理性严谨', '先看样品验证', '可靠性和认证进度', '先做样品小闭环'),
  ('CON003', 3, '刘总', '总经理', '高层管理', '13800000003', 'liu@example.com', true, '决策买家', '综合评估', '刘总',
   'wx_liuzong', '总部派', '正面评价', 1, 'A', 5, 2, '清华大学', '北京', ARRAY['高尔夫','读书'], '已婚', '沉稳大气', '关注战略价值', '长期合作潜力', '定期高层拜访'),
  ('CON004', 4, '郑总', '采购总监', '采购部', '13800000004', 'zheng@example.com', true, '经济买家', '成本优先', '郑总',
   'wx_zhengzong', '总部派', '中性评价', 0, 'D', 4, 3, '华中科大', '武汉', ARRAY['钓鱼'], '已婚', '精打细算', '价格谈判', '账期和价格', '月度业务回顾'),
  ('CON005', 5, '钱总', '技术总监', '技术部', '13800000005', 'qian@example.com', true, '技术买家', '技术领先', '钱总',
   'wx_qianzong', '技术线', '正面评价', 1, 'C', 5, 3, '西安交大', '成都', ARRAY['摄影'], '已婚', '技术导向', '性能和认证', '技术支持和质量', '技术研讨会'),
  ('CON006', 6, '陈总', '采购经理', '采购部', '13800000006', 'chen_auto@example.com', true, '经济买家', '竞争性招标', '陈总',
   'wx_chenzong', '总部派', '中性评价', 0, 'D', 4, 2, '华南理工', '广州', ARRAY['羽毛球'], '已婚', '务实进取', '性价比', '成本控制和交付', '季度业务回顾'),
  ('CON007', 1, '赵工', '工程师', '研发部', '13800000011', 'zhao@example.com', false, '技术买家', '技术评估', '赵工',
   'wx_zhaogong', '技术线', '正面评价', 1, 'E', 3, 3, '上海交大', '上海', ARRAY['音乐'], '已婚', '专业严谨', '技术支持', '技术细节和方案', '技术交流会议'),
  ('CON008', 2, '陈经理', '采购经理', '采购部', '13800000022', 'chen@example.com', false, '经济买家', '成本优先', '陈经理',
   'wx_chenmanager', '总部派', '中性评价', 0, 'D', 4, 2, '华南理工', '深圳', ARRAY['登山'], '已婚', '务实', '价格和账期', '价格竞争力', '月度价格谈判'),
  ('CON009', 5, '孙工', '项目经理', '项目部', '13800000055', 'sun@example.com', false, '项目买家', '项目管理', '孙工',
   'wx_sungong', '项目线', '正面评价', 1, 'B', 3, 3, '电子科大', '成都', ARRAY['篮球'], '已婚', '项目导向', '进度和质量', '项目交付和里程碑', '项目例会'),
  ('CON010', 6, '林工', '质量工程师', '质量部', '13800000066', 'lin@example.com', false, '技术买家', '质量优先', '林工',
   'wx_lingong', '质量线', '中性评价', 0, 'E', 3, 2, '华南理工', '广州', ARRAY['烹饪'], '已婚', '质量导向', '质量认证', '质量标准和测试', '质量评审会议');

-- ========= 客户画像表 =========
insert into public.crm_customer_persona(
  id, customer_id, scale, main_products, org_structure, buying_mode, pain_points, competitive_supplier,
  competitive_preference, unique_needs, rd_requirements, sample_requirements, production_requirements, last_updated
) values
  ('PER001', 1, '大型', '工业控制系统', '事业部制', '理性决策', '交付波动导致项目延期',
   '某国际品牌', '稳定优先', '需要可快速替代方案', '强调兼容性', '2周内出样', '季度稳定供货', current_date),
  ('PER002', 2, '中型', '新能源设备', '矩阵管理', '成本与性能平衡', '认证周期长',
   '国产厂商', '性价比优先', '希望缩短认证周期', '重视技术支持', '1周快速打样', '批量一致性', current_date),
  ('PER003', 3, '中型', '工业设备', '直线制', '价格敏感', '原材料成本波动',
   '本地供应商', '价格优先', '稳定供货保障', '常规需求', '常规交期', '批量采购优惠', current_date),
  ('PER004', 4, '大型', '电力设备', '事业部制', '品质优先', '质量稳定性要求高',
   '国际品牌', '品质优先', '高质量产品', '严格质量标准', '严苛测试要求', '零缺陷要求', current_date),
  ('PER005', 5, '中型', '光伏设备', '项目制', '技术支持优先', '技术方案匹配度',
   '多家对比', '技术领先', '专业技术支持', '定制化需求', '快速打样验证', '灵活交付', current_date),
  ('PER006', 6, '中型', '汽车电子', '事业部制', '性价比与品质平衡', '车规级认证要求',
   '国际Tier1', '认证齐全', '车规级产品', 'IATF16949', 'A样B样阶段', '量产稳定性', current_date),
  ('PER007', 7, '中型', '轨道交通设备', '项目制', '可靠性优先', '长周期供货保障',
   '央企供应商', '可靠优先', '长期合作供应商', '严格资质要求', '长周期备货', '生命周期内供货', current_date),
  ('PER008', 8, '小型', '智能家居产品', '扁平化', '快速响应', '研发周期短',
   '电商平台', '交期快', '小批量快样', '快速迭代', '3-5天交付', '柔性生产', current_date);

-- ========= 询盘表 =========
insert into public.crm_inquiry(
  id, inquiry_no, customer_id, company_name, customer_name, contact, source_channel, category, province, situation,
  status, classification, customer_inquiry, notes, create_date, update_date, creator_id, creator_name
) values
  (1, 'XJ2604010001', 1, '华东智造股份有限公司', '华东智造股份有限公司', '王总', '其他', '技术咨询', '上海',
   '希望确认替代型号交付稳定性', '待处理', '有效', '是否有长期稳定供货方案', '客户对二供方案兴趣高', current_date, current_date, 'EMP002', '销售经理'),
  (2, 'XJ2604020001', 2, '南方设备集团有限公司', '南方设备集团有限公司', '李工', '官网', '产品询价', '深圳',
   '关注认证和样品进度', '待处理', '处理中', '能否一周内交样', '希望同步FAE支持', current_date, current_date, 'EMP003', '业务员A'),
  (3, 'XJ2604030001', 3, '北方工业科技有限公司', '北方工业科技有限公司', '刘总', '1688', '报价咨询', '北京',
   '批量采购询价', '已转线索', '有效', '工业连接器批量采购', '价格谈判中', current_date, current_date, 'EMP004', '业务员B'),
  (4, 'XJ2604040001', 4, '中部电气股份有限公司', '中部电气股份有限公司', '郑总', '电子谷', '产品咨询', '武汉',
   '高端连接器需求', '待处理', '有效', '轨道交通级别连接器', '需要技术对接', current_date, current_date, 'EMP005', '业务员C'),
  (5, 'XJ2604050001', 5, '西部新能源有限公司', '西部新能源有限公司', '钱总', '展会', '技术合作', '成都',
   '新能源项目合作', '待处理', '有效', '光伏逆变器连接器方案', '需要联合研发', current_date, current_date, 'EMP002', '销售经理'),
  (6, 'XJ2604060001', 6, '华南汽车电子股份有限公司', '华南汽车电子股份有限公司', '陈总', '万连', '车规级产品', '广州',
   '汽车电子连接器', '待处理', '处理中', '车载连接器车规级认证', '需要IATF16949', current_date, current_date, 'EMP003', '业务员A'),
  (7, 'XJ2604070001', 7, '华东轨道交通设备有限公司', '华东轨道交通设备有限公司', '刘总', '其他', '项目咨询', '南京',
   '地铁项目连接器', '已转线索', '有效', '轨道交通专用连接器', '资质审查中', current_date, current_date, 'EMP004', '业务员B'),
  (8, 'XJ2604080001', 8, '智能家居科技有限公司', '智能家居科技有限公司', '冯总', '淘宝', '小批量询价', '佛山',
   '智能家居线束小批量', '待处理', '有效', '智能家居用小型线束', '快速交付', current_date, current_date, 'EMP005', '业务员C');

-- ========= 线索表 =========
insert into public.crm_lead(
  id, lead_no, customer_id, customer_name, name, phone, customer_action, industry, status, classification, assignee,
  source_channel, source_type, product_category, product_series, source_status, inquiry_id, contact_id,
  buying_mode, buyer_role, product_industry, customer_opportunity, create_date, creator_id, creator_name
) values
  (1, 'XS2604010001', 1, '华东智造股份有限公司', '王总', '13800000001', '寻替代品', '工业自动化', '跟进中', '有效', 'EMP002',
   '其他', '在线', '接插件', '工业连接器标准系列', '客服', 1, 'CON001', '理性决策', '决策者', '工业', '替代导入项目', current_date, 'EMP002', '销售经理'),
  (2, 'XS2604020001', 2, '南方设备集团有限公司', '李工', '13800000002', '寻替代品', '新能源设备', '跟进中', '有效', 'EMP003',
   '官网', '在线', '新能源连接器', 'EV连接器系列', '自己开发', 2, 'CON002', '技术先行', '技术决策', '新能源', '新能源项目替代', current_date, 'EMP003', '业务员A'),
  (3, 'XS2604030001', 3, '北方工业科技有限公司', '刘总', '13800000003', '找货寻料', '机械设备', '跟进中', '有效', 'EMP004',
   '1688', '在线', '工业连接器', '工业连接器标准系列', '自己开发', 3, 'CON003', '价格敏感', '决策者', '工业', '批量采购机会', current_date, 'EMP004', '业务员B'),
  (4, 'XS2604040001', 4, '中部电气股份有限公司', '郑总', '13800000004', '指定料号', '电力设备', '跟进中', '有效', 'EMP005',
   '电子谷', '在线', '轨道交通连接器', '轨道交通连接器系列', '自己开发', 4, 'CON004', '品质优先', '决策者', '工业', '高端项目机会', current_date, 'EMP005', '业务员C'),
  (5, 'XS2604050001', 5, '西部新能源有限公司', '钱总', '13800000005', '寻替代品', '新能源', '跟进中', '有效', 'EMP002',
   '展会', '其他', '新能源连接器', 'EV连接器系列', '客服', 5, 'CON005', '技术领先', '技术决策', '新能源', '光伏项目合作', current_date, 'EMP002', '销售经理'),
  (6, 'XS2604060001', 6, '华南汽车电子股份有限公司', '陈总', '13800000006', '寻替代品', '汽车电子', '跟进中', '有效', 'EMP003',
   '万连', '在线', '车载连接器', '工业连接器标准系列', '自己开发', 6, 'CON006', '性价比与品质', '经济决策', '新能源', '车载项目导入', current_date, 'EMP003', '业务员A');

-- ========= 商机表 =========
insert into public.crm_opportunity(
  id, opportunity_no, customer_id, customer_name, opp_date, status, opp_summary, product_line, sales_rep, opp_level, intent_amount,
  associated_project, end_customer, end_project, product_industry, lead_id, inquiry_id, application_scenario,
  estimated_usage, estimated_mass_production_date
) values
  (1, 'JH2604010001', 1, '华东智造股份有限公司', current_date, '跟进中', '温控系统替代导入', '工业连接器', 'EMP002', 'A级', 800000,
   'PRJ001', '华东终端客户A', '产线升级项目', '工业', 1, 1, '温控产线', '月均5万pcs', current_date + interval '120 day'),
  (2, 'JH2604020001', 2, '南方设备集团有限公司', current_date, '跟进中', '光伏逆变器连接器项目', '工业连接器', 'EMP003', 'A级', 1200000,
   'PRJ002', '南方终端客户B', '光伏项目', '新能源', 2, 2, '光伏逆变器', '月均8万pcs', current_date + interval '150 day'),
  (3, 'JH2604030001', 3, '北方工业科技有限公司', current_date, '跟进中', '工业设备批量采购', '工业连接器', 'EMP004', 'B级', 350000,
   'PRJ003', '北方工业直接客户', '设备升级项目', '工业', 3, 3, '工业控制柜', '月均3万pcs', current_date + interval '90 day'),
  (4, 'JH2604040001', 4, '中部电气股份有限公司', current_date, '跟进中', '轨道交通连接器项目', '工业连接器', 'EMP005', 'A级', 2000000,
   'PRJ004', '地铁建设方', '地铁项目', '工业', 4, 4, '轨道交通设备', '月均10万pcs', current_date + interval '180 day'),
  (5, 'JH2604050001', 5, '西部新能源有限公司', current_date, '跟进中', '光伏连接器联合研发', '工业连接器', 'EMP002', 'A级', 1500000,
   'PRJ005', '西部终端客户', '光伏项目', '新能源', 5, 5, '光伏接线盒', '月均6万pcs', current_date + interval '200 day'),
  (6, 'JH2604060001', 6, '华南汽车电子股份有限公司', current_date, '跟进中', '车载连接器项目导入', '接插件', 'EMP003', 'B级', 600000,
   'PRJ006', '汽车OEM', '车载项目', '新能源', 6, 6, '车载娱乐系统', '月均4万pcs', current_date + interval '240 day');

-- ========= 项目表 =========
insert into public.crm_project(
  id, project_no, customer_id, customer_name, project_name, status, stage, manager, project_type, project_level, wechat_group,
  team, intent_amount, end_customer, opp_summary, application_scenario, product_industry, estimated_usage,
  estimated_mass_production_date, customer_action, sales_rep, product_owner, quality_owner, purchaser, fae,
  lead_id, opportunity_id, inquiry_id, product_line, start_date, end_date, create_date, creator_id, creator_name
) values
  (1, 'XM2604010001', 1, '华东智造股份有限公司', '华东智造温控升级项目', '跟进中', '设计阶段', '张项目经理',
   '研发型项目', 'A', '华东智造-项目群',
   '{"sales":"EMP002","pm":"张项目经理","product":"产品经理A","quality":"质量负责人B","purchasing":"采购C","fae":"FAE-D"}'::jsonb,
   800000, '华东终端客户A', '核心机型导入', '温控产线', '工业', '月均5万pcs',
   current_date + interval '120 day', '寻替代品', 'EMP002', '产品经理A', '质量负责人B', '采购C', 'FAE-D',
   1, 1, 1, '工业连接器', current_date, current_date + interval '180 day', current_date, 'EMP002', '销售经理'),
  (2, 'XM2604020001', 2, '南方设备集团有限公司', '南方光伏逆变器项目', '跟进中', '报价阶段', '李项目经理',
   '研发型项目', 'A', '南方光伏-项目群',
   '{"sales":"EMP003","pm":"李项目经理","product":"产品经理C","quality":"质量负责人E","purchasing":"采购D","fae":"FAE-F"}'::jsonb,
   1200000, '南方终端客户B', '光伏逆变器连接器方案', '光伏逆变器', '新能源', '月均8万pcs',
   current_date + interval '150 day', '寻替代品', 'EMP003', '产品经理C', '质量负责人E', '采购D', 'FAE-F',
   2, 2, 2, '工业连接器', current_date, current_date + interval '210 day', current_date, 'EMP003', '业务员A'),
  (3, 'XM2604030001', 3, '北方工业科技有限公司', '北方工业设备升级项目', '跟进中', '需求阶段', '王项目经理',
   '标准项目', 'B', '北方工业-项目群',
   '{"sales":"EMP004","pm":"王项目经理","product":"产品经理B","quality":"质量负责人C","purchasing":"采购E","fae":"FAE-G"}'::jsonb,
   350000, '北方工业直接客户', '批量采购工业连接器', '工业控制柜', '工业', '月均3万pcs',
   current_date + interval '90 day', '找货寻料', 'EMP004', '产品经理B', '质量负责人C', '采购E', 'FAE-G',
   3, 3, 3, '工业连接器', current_date, current_date + interval '150 day', current_date, 'EMP004', '业务员B'),
  (4, 'XM2604040001', 4, '中部电气股份有限公司', '中部轨道交通连接器项目', '跟进中', '样品制作', '赵项目经理',
   '研发型项目', 'A', '中部轨道-项目群',
   '{"sales":"EMP005","pm":"赵项目经理","product":"产品经理D","quality":"质量负责人F","purchasing":"采购F","fae":"FAE-H"}'::jsonb,
   2000000, '地铁建设方', '轨道交通专用连接器', '轨道交通设备', '工业', '月均10万pcs',
   current_date + interval '180 day', '指定料号', 'EMP005', '产品经理D', '质量负责人F', '采购F', 'FAE-H',
   4, 4, 4, '工业连接器', current_date, current_date + interval '240 day', current_date, 'EMP005', '业务员C'),
  (5, 'XM2604050001', 5, '西部新能源有限公司', '西部光伏联合研发项目', '跟进中', '设计阶段', '孙项目经理',
   '联合研发项目', 'A', '西部光伏-项目群',
   '{"sales":"EMP002","pm":"孙项目经理","product":"产品经理E","quality":"质量负责人G","purchasing":"采购G","fae":"FAE-I"}'::jsonb,
   1500000, '西部终端客户', '光伏接线盒连接器联合研发', '光伏接线盒', '新能源', '月均6万pcs',
   current_date + interval '200 day', '寻替代品', 'EMP002', '产品经理E', '质量负责人G', '采购G', 'FAE-I',
   5, 5, 5, '工业连接器', current_date, current_date + interval '280 day', current_date, 'EMP002', '销售经理'),
  (6, 'XM2604060001', 6, '华南汽车电子股份有限公司', '华南车载连接器项目', '跟进中', '需求阶段', '周项目经理',
   '车规级项目', 'B', '华南汽车-项目群',
   '{"sales":"EMP003","pm":"周项目经理","product":"产品经理F","quality":"质量负责人H","purchasing":"采购H","fae":"FAE-J"}'::jsonb,
   600000, '汽车OEM', '车载娱乐系统连接器', '车载娱乐系统', '新能源', '月均4万pcs',
   current_date + interval '240 day', '寻替代品', 'EMP003', '产品经理F', '质量负责人H', '采购H', 'FAE-J',
   6, 6, 6, '工业连接器', current_date, current_date + interval '300 day', current_date, 'EMP003', '业务员A');

-- ========= 微信会话表 =========
do $$
begin
  if to_regclass('public.crm_wx_conversation') is not null then
    insert into public.crm_wx_conversation(
      conversation_key, source_guid, conversation_type, conversation_identity_type, is_internal_chat,
      my_wechat_id, my_wechat_name, peer_wechat_id, peer_wechat_name, room_username, conversation_name,
      room_name, room_remark_name, customer_id, primary_contact_id, owner_employee_id, status
    ) values
      ('private:wx_sales_manager:wx_wangzong', 'wx_guid_001', 'private', 'private_direct', false, 'wx_sales_manager', '销售经理', 'wx_wangzong', '王总', null, '王总私聊', null, null, '1', 'CON001', 'EMP002', 'active'),
      ('private:wx_sales_a:wx_ligong', 'wx_guid_001', 'private', 'private_direct', false, 'wx_sales_a', '业务员A', 'wx_ligong', '李工', null, '李工私聊', null, null, '2', 'CON002', 'EMP003', 'active'),
      ('group:wx_grp_huadong_001', 'wx_guid_001', 'group', 'group', false, null, null, null, null, 'wx_grp_huadong_001', '华东智造项目群', '华东智造项目群', '华东项目群', '1', 'CON001', 'EMP002', 'active'),
      ('group:wx_grp_nanfang_001', 'wx_guid_001', 'group', 'group', false, null, null, null, null, 'wx_grp_nanfang_001', '南方设备技术群', '南方设备技术群', '南方技术群', '2', 'CON002', 'EMP003', 'active')
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

-- ========= 微信消息表 =========
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

-- ========= 沟通记录表 =========
insert into public.crm_communication_log(id, source_id, customer_id, date, sender, content, type, source_group, is_summarized) values
  ('LOG001', '11111111-1111-1111-1111-111111111001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '王总您好，关于替代型号这边已完成首轮验证，交期可控在两周内。', 'wechat', 'wx_wangzong', false),
  ('LOG002', '11111111-1111-1111-1111-111111111001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '王总', '如果两周能稳定交付，我们可以先走小批量。', 'wechat', 'wx_wangzong', false),
  ('LOG003', '22222222-2222-2222-2222-222222222001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '各位好，今天同步试产节奏和风险清单。', 'wechat_group', '华东智造项目群', false),
  ('LOG004', '22222222-2222-2222-2222-222222222001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '采购同事', '请把备货策略和异常升级路径发到群里。', 'wechat_group', '华东智造项目群', false),
  ('LOG005', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), 'sales_manager@example.com', '已邮件发送报价与TCO测算，请查收附件。', 'email', '邮件往来', false),
  ('LOG006', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '周例会已确认试产窗口，客户关注点聚焦在交期和一致性。', 'meeting', '周会纪要', false),
  ('LOG007', 'CUST001', 1, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '销售经理', '电话沟通后，客户接受先导入一个机型验证。', 'phone', 'customer_followup', false),
  ('LOG008', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '李工您好，样品认证资料今天内会补齐。', 'wechat', 'wx_ligong', false),
  ('LOG009', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '李工', '好的，重点把UL认证和耐温数据一并发我。', 'wechat', 'wx_ligong', false),
  ('LOG010', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '会议结论：下周安排联合测试，确认量产前验证项。', 'meeting', '技术评审会', false),
  ('LOG011', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '邮件已发送测试计划和里程碑，请研发团队确认。', 'email', '邮件往来', false),
  ('LOG012', 'CUST002', 2, to_char(current_date, 'YYYY-MM-DD HH24:MI:SS'), '业务员A', '聊天记录：客户要求一周内出样，优先验证可靠性。', 'phone', 'customer_followup', false);

-- ========= 任务类型表 =========
insert into public.crm_task_type(id, name, default_hours) values
  ('TT001', '客户拜访', 24),
  ('TT002', '样品跟进', 48),
  ('TT003', '报价跟进', 24),
  ('TT004', '项目推进', 72),
  ('TT005', '售后处理', 24);

-- ========= 任务表 =========
insert into public.crm_task(
  id, title, description, module, related_id, source_type, source_id, task_type, status, importance, urgency,
  assignee_id, assignee_name, due_date, create_date, creator_id, creator_name, auxiliary_json
) values
  ('TASK001', '拜访王总确认导入节奏', '围绕交付稳定和导入风险进行面谈', 'customer_visit', 'CUST001', 'visit', 'CUST001', '客户拜访',
   '待办', '高', '紧急', 'EMP002', '销售经理', current_date + interval '2 day', current_date, 'EMP002', '销售经理',
   '{"objectives":[{"id":"obj_1","title":"确认试产节奏"},{"id":"obj_2","title":"明确风险点"}]}'::jsonb),
  ('TASK002', '李工样品认证跟进', '跟进UL认证和耐温测试进度', 'sample', 'SAMPLE001', 'sample', 'SAMPLE001', '样品跟进',
   '待办', '高', '紧急', 'EMP003', '业务员A', current_date + interval '3 day', current_date, 'EMP003', '业务员A',
   '{"objectives":[{"id":"obj_1","title":"获取UL认证"},{"id":"obj_2","title":"耐温测试通过"}]}'::jsonb),
  ('TASK003', '刘总批量报价', '提供工业连接器批量采购报价', 'quotation', 'Q001', 'quotation', 'Q001', '报价跟进',
   '进行中', '中', '高', 'EMP004', '业务员B', current_date + interval '1 day', current_date, 'EMP004', '业务员B',
   '{"objectives":[{"id":"obj_1","title":"提供报价单"},{"id":"obj_2","title":"确认交期"}]}'::jsonb),
  ('TASK004', '郑总技术对接', '轨道交通连接器技术方案对接', 'project', 'PRJ004', 'project', 'XM2604040001', '项目推进',
   '待办', '高', '中', 'EMP005', '业务员C', current_date + interval '5 day', current_date, 'EMP005', '业务员C',
   '{"objectives":[{"id":"obj_1","title":"技术方案确认"},{"id":"obj_2","title":"样品需求明确"}]}'::jsonb),
  ('TASK005', '钱总联合研发会议', '光伏连接器联合研发方案讨论', 'project', 'PRJ005', 'project', 'XM2604050001', '项目推进',
   '待办', '高', '紧急', 'EMP002', '销售经理', current_date + interval '4 day', current_date, 'EMP002', '销售经理',
   '{"objectives":[{"id":"obj_1","title":"确定研发方向"},{"id":"obj_2","title":"分工确认"}]}'::jsonb),
  ('TASK006', '陈总车载项目报价', '车载连接器车规级产品报价', 'quotation', 'Q002', 'quotation', 'Q002', '报价跟进',
   '待办', '中', '中', 'EMP003', '业务员A', current_date + interval '2 day', current_date, 'EMP003', '业务员A',
   '{"objectives":[{"id":"obj_1","title":"提供车规级报价"},{"id":"obj_2","title":"IATF16949资料准备"}]}'::jsonb),
  ('TASK007', '王总售后问题处理', '处理温控系统连接器售后问题', 'after_sale', 'RET001', 'after_sale', 'RET001', '售后处理',
   '待办', '高', '紧急', 'EMP002', '销售经理', current_date + interval '1 day', current_date, 'EMP002', '销售经理',
   '{"objectives":[{"id":"obj_1","title":"确认问题原因"},{"id":"obj_2","title":"制定解决方案"}]}'::jsonb),
  ('TASK008', '周例会准备', '准备下周项目进度周例会', 'meeting', 'CUST001', 'meeting', 'CUST001', '客户拜访',
   '待办', '中', '低', 'EMP002', '销售经理', current_date + interval '7 day', current_date, 'EMP002', '销售经理',
   '{"objectives":[{"id":"obj_1","title":"更新项目进度"},{"id":"obj_2","title":"识别风险项"}]}'::jsonb);

-- ========= 竞争对手表 =========
insert into public.crm_competitor(id, name, advantages, disadvantages, positioning, product_matrix) values
  ('COMP001', '竞品A', '交付快，渠道广', '定制深度不足', '中端标准化', '[{"productName":"竞品连接器A","benchmarkCategory":"接插件","advantages":"交期快","disadvantages":"定制弱"}]'::jsonb),
  ('COMP002', '竞品B', '价格低', '质量波动', '价格驱动型', '[{"productName":"竞品线束B","benchmarkCategory":"线束","advantages":"价格低","disadvantages":"一致性一般"}]'::jsonb),
  ('COMP003', '竞品C', '国际品牌影响力大', '价格高，交期长', '高端市场', '[{"productName":"竞品连接器C","benchmarkCategory":"工业连接器","advantages":"品牌强","disadvantages":"价格高"}]'::jsonb),
  ('COMP004', '竞品D', '技术领先', '产能不足', '技术驱动型', '[{"productName":"竞品新能源连接器D","benchmarkCategory":"新能源连接器","advantages":"技术领先","disadvantages":"产能有限"}]'::jsonb),
  ('COMP005', '竞品E', '本土化服务好', '品牌知名度低', '性价比', '[{"productName":"竞品线束E","benchmarkCategory":"线束","advantages":"服务灵活","disadvantages":"品牌弱"}]'::jsonb),
  ('COMP006', '竞品F', '车规级认证齐全', '研发周期长', '汽车行业', '[{"productName":"竞品车载连接器F","benchmarkCategory":"车载连接器","advantages":"认证全","disadvantages":"研发慢"}]'::jsonb);

-- ========= 客户竞争对手表 =========
insert into public.crm_customer_competitor(id, customer_id, competitor_id, threat_level, notes) values
  ('CC001', 1, 'COMP001', '高', '王总重点对比对象'),
  ('CC002', 2, 'COMP002', '中', '李工在评估替代方案'),
  ('CC003', 3, 'COMP001', '高', '刘总关注价格竞争力'),
  ('CC004', 4, 'COMP003', '高', '郑总注重品牌和质量'),
  ('CC005', 5, 'COMP004', '中', '钱总关注技术合作'),
  ('CC006', 6, 'COMP006', '高', '陈总要求车规级认证'),
  ('CC007', 1, 'COMP003', '中', '国际品牌对比'),
  ('CC008', 2, 'COMP004', '中', '新能源技术对比');

-- ========= 客户关注SWOT表 =========
insert into public.crm_customer_focus_swot(
  id, customer_id, customer_focus, key_contact, focus_level, our_strengths, our_weaknesses, ai_script, sort_order
) values
  ('FS001', 1, '交付稳定性', '王总', 5, '["国产替代成功案例","本地服务团队"]'::jsonb, '["库存安全垫不足"]'::jsonb, '建议先以小批量试产建立信任，再推进批量导入。', 0),
  ('FS002', 2, '技术支持能力', '李工', 5, '["FAE现场支持","快速样品响应"]'::jsonb, '["高端认证经验不足"]'::jsonb, '重点展示FAE团队实力和技术认证案例。', 0),
  ('FS003', 3, '价格竞争力', '刘总', 4, '["规模化成本优势","灵活定价策略"]'::jsonb, '["原材料成本波动"]'::jsonb, '提供有竞争力的批量采购价格方案。', 0),
  ('FS004', 4, '品质可靠性', '郑总', 5, '["轨道交通认证齐全","零缺陷质量体系"]'::jsonb, '["高端产品产能有限"]'::jsonb, '强调质量体系和行业认证，提供案例背书。', 0),
  ('FS005', 5, '联合研发能力', '钱总', 5, '["研发团队强大","联合研发经验"]'::jsonb, '["研发周期不确定"]'::jsonb, '展示联合研发成功案例，明确研发里程碑。', 0),
  ('FS006', 6, '车规级认证', '陈总', 5, '["IATF16949认证","车规级产品线"]'::jsonb, '["车载项目经验少"]'::jsonb, '提供车规级认证资料和项目经验证明。', 0),
  ('FS007', 1, '长期合作关系', '王总', 4, '["战略合作伙伴","长期供货保障"]'::jsonb, '["新品导入周期长"]'::jsonb, '探讨建立战略合作关系，获得优先供货权。', 1),
  ('FS008', 2, '认证进度', '李工', 4, '["认证团队专业","认证流程熟悉"]'::jsonb, '["部分认证缺失"]'::jsonb, '明确认证时间表，提供认证支持。', 1);

-- ========= 客户关注竞争对手表 =========
insert into public.crm_customer_focus_competitor(
  id, focus_id, customer_id, competitor_name, strengths, weaknesses, sort_order
) values
  ('FC001', 'FS001', 1, '竞品A', '["交期短"]'::jsonb, '["定制能力一般"]'::jsonb, 0),
  ('FC002', 'FS002', 2, '竞品B', '["技术支持强"]'::jsonb, '["价格高"]'::jsonb, 0),
  ('FC003', 'FS003', 3, '竞品A', '["价格低"]'::jsonb, '["质量一般"]'::jsonb, 0),
  ('FC004', 'FS004', 4, '竞品C', '["品牌强"]'::jsonb, '["交期长"]'::jsonb, 0),
  ('FC005', 'FS005', 5, '竞品D', '["技术领先"]'::jsonb, '["产能不足"]'::jsonb, 0),
  ('FC006', 'FS006', 6, '竞品F', '["认证全"]'::jsonb, '["价格高"]'::jsonb, 0),
  ('FC007', 'FS001', 1, '竞品C', '["品牌强"]'::jsonb, '["价格高"]'::jsonb, 1),
  ('FC008', 'FS002', 2, '竞品D', '["技术好"]'::jsonb, '["交期慢"]'::jsonb, 1);

-- ========= 客户跟进策略配置表 =========
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

-- ========= 客户FAQ库配置表 =========
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

-- ========= 干系人评估表 =========
insert into public.crm_stakeholder_assessment(
  id, customer_id, stakeholder_id, assessment_date, need_level_score, power_score, attitude_score, relation_score,
  business_alignment_score, confidence_score, conclusion, strategy_suggestion, source_type, ai_model, created_by
) values
  ('ASM001', 1, 'CON001', current_date, 4, 5, 1, 3, 4, 72, '王总可推动替代导入，但需要风险兜底。', '先安排小批量试产并建立周报机制。', 'manual', 'gemini-3.1-pro-preview', 'EMP002'),
  ('ASM002', 2, 'CON002', current_date, 5, 3, 0, 4, 3, 65, '李工关注技术，需要充分技术支持。', '加强FAE现场支持，提供技术文档。', 'manual', 'gemini-3.1-pro-preview', 'EMP003'),
  ('ASM003', 3, 'CON003', current_date, 3, 5, 1, 2, 4, 70, '刘总决策权大，关注性价比。', '提供有竞争力的批量价格方案。', 'manual', 'gemini-3.1-pro-preview', 'EMP004'),
  ('ASM004', 4, 'CON004', current_date, 4, 4, 0, 3, 3, 60, '郑总注重品质，需要质量保证。', '强调质量体系和行业认证，提供案例。', 'manual', 'gemini-3.1-pro-preview', 'EMP005'),
  ('ASM005', 5, 'CON005', current_date, 5, 4, 1, 4, 5, 78, '钱总关注技术联合研发。', '展示研发能力，安排技术交流会议。', 'manual', 'gemini-3.1-pro-preview', 'EMP002'),
  ('ASM006', 6, 'CON006', current_date, 4, 4, 0, 2, 3, 58, '陈总关注车规级认证和成本。', '提供认证资料，讨论成本优化方案。', 'manual', 'gemini-3.1-pro-preview', 'EMP003');

-- ========= 报价单表 =========
insert into public.crm_quotation(
  id, quote_no, customer_id, customer_name, project_id, project_name, quote_date, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, contact_person, valid_until
) values
  (1, 'BJ2604010001', 1, '华东智造股份有限公司', 1, '华东智造温控升级项目', current_date, 'quotation_complete', '未审核', 6800, 6017.70, 6800, '王总', current_date + interval '30 day'),
  (2, 'BJ2604020001', 2, '南方设备集团有限公司', 2, '南方光伏逆变器项目', current_date, 'quotation_complete', '已审核', 9600, 8495.58, 9600, '李工', current_date + interval '30 day'),
  (3, 'BJ2604030001', 3, '北方工业科技有限公司', 3, '北方工业设备升级项目', current_date, 'quotation_complete', '未审核', 4800, 4247.79, 4800, '刘总', current_date + interval '30 day'),
  (4, 'BJ2604040001', 4, '中部电气股份有限公司', 4, '中部轨道交通连接器项目', current_date, 'quotation_complete', '已审核', 22000, 19469.03, 22000, '郑总', current_date + interval '30 day'),
  (5, 'BJ2604050001', 5, '西部新能源有限公司', 5, '西部光伏联合研发项目', current_date, 'quotation_complete', '已审核', 8500, 7522.12, 8500, '钱总', current_date + interval '30 day'),
  (6, 'BJ2604060001', 6, '华南汽车电子股份有限公司', 6, '华南车载连接器项目', current_date, 'quotation_complete', '未审核', 6400, 5663.72, 6400, '陈总', current_date + interval '30 day');

-- ========= 报价单明细表 =========
insert into public.crm_quotation_item(
  id, quotation_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, lead_time, moq
) values
  (1, 1, 1, '工业连接器A', 'IO-001', 100, '增值税专票', 13, 68, 60.1770, 6800, 6017.70, 782.30, '15天', 100),
  (2, 2, 4, 'EV充电连接器D', 'EV-001', 100, '增值税专票', 13, 85, 75.2212, 8500, 7522.12, 977.88, '20天', 100),
  (3, 2, 2, '新能源线束B', 'WH-101', 50, '增值税专票', 13, 96, 84.9558, 4800, 4247.79, 552.21, '15天', 50),
  (4, 3, 1, '工业连接器A', 'IO-001', 200, '增值税专票', 13, 68, 60.1770, 13600, 12035.40, 1564.60, '15天', 100),
  (5, 4, 5, '轨道交通连接器E', 'IO-301', 100, '增值税专票', 13, 220, 194.6903, 22000, 19469.03, 2530.97, '30天', 20),
  (6, 5, 4, 'EV充电连接器D', 'EV-001', 100, '增值税专票', 13, 85, 75.2212, 8500, 7522.12, 977.88, '20天', 100),
  (7, 6, 1, '工业连接器A', 'IO-001', 100, '增值税专票', 13, 68, 60.1770, 6800, 6017.70, 782.30, '15天', 100);

-- ========= 销售订单表 =========
insert into public.crm_sales_order(
  id, order_no, customer_id, customer_name, project_id, project_name, order_date, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, actual_received_amount, pending_amount,
  sales_rep, merchandiser, province, city, district, shipping_address, consignee_name, consignee_phone
) values
  (1, 'DD2604010001', 1, '华东智造股份有限公司', 1, '华东智造温控升级项目', current_date, 'un_paid', '未审核',
   13600, 12035.40, 13600, 0, 13600, 'EMP002', '张跟单', '上海', '上海市', '浦东新区', '上海市浦东新区XX路1号', '王总', '13800000001'),
  (2, 'DD2604020001', 2, '南方设备集团有限公司', 2, '南方光伏逆变器项目', current_date, 'partial_payment', '已审核',
   19200, 16991.15, 19200, 9600, 9600, 'EMP003', '李跟单', '广东', '深圳市', '南山区', '深圳市南山区YY路8号', '陈经理', '13800000022'),
  (3, 'DD2604030001', 3, '北方工业科技有限公司', 3, '北方工业设备升级项目', current_date, 'un_paid', '未审核',
   4800, 4247.79, 4800, 0, 4800, 'EMP004', '孙跟单', '北京', '北京市', '朝阳区', '北京市朝阳区ZZ路12号', '刘总', '13800000003'),
  (4, 'DD2604040001', 4, '中部电气股份有限公司', 4, '中部轨道交通连接器项目', current_date, 'waiting_delivery', '已审核',
   44000, 38938.05, 44000, 44000, 0, 'EMP005', '周跟单', '湖北', '武汉市', '东湖区', '武汉市东湖区AA路88号', '郑总', '13800000004'),
  (5, 'DD2604050001', 5, '西部新能源有限公司', 5, '西部光伏联合研发项目', current_date, 'un_paid', '已审核',
   8500, 7522.12, 8500, 0, 8500, 'EMP002', '吴跟单', '四川', '成都市', '高新区', '成都市高新区BB路66号', '钱总', '13800000005'),
  (6, 'DD2604060001', 6, '华南汽车电子股份有限公司', 6, '华南车载连接器项目', current_date, 'un_paid', '未审核',
   6400, 5663.72, 6400, 0, 6400, 'EMP003', '郑跟单', '广东', '广州市', '天河区', '广州市天河区CC路55号', '陈总', '13800000006'),
  (7, 'DD2604070001', 1, '华东智造股份有限公司', 1, '华东智造温控升级项目', current_date - interval '10 day', 'delivered', '已审核',
   6800, 6017.70, 6800, 6800, 0, 'EMP002', '张跟单', '上海', '上海市', '浦东新区', '上海市浦东新区XX路1号', '王总', '13800000001'),
  (8, 'DD2604080001', 2, '南方设备集团有限公司', 2, '南方光伏逆变器项目', current_date - interval '15 day', 'completed', '已审核',
   9600, 8495.58, 9600, 9600, 0, 'EMP003', '李跟单', '广东', '深圳市', '南山区', '深圳市南山区YY路8号', '李工', '13800000002');

-- ========= 销售订单明细表 =========
insert into public.crm_sales_order_item(
  id, sales_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, customer_material_no
) values
  (1, 1, 1, '工业连接器A', 'IO-001', 200, '增值税专票', 13, 68, 60.1770, 13600, 12035.40, 1564.60, 'MAT-001'),
  (2, 2, 4, 'EV充电连接器D', 'EV-001', 100, '增值税专票', 13, 85, 75.2212, 8500, 7522.12, 977.88, 'EV-MAT-001'),
  (3, 2, 2, '新能源线束B', 'WH-101', 100, '增值税专票', 13, 96, 84.9558, 9600, 8495.58, 1104.42, 'WH-MAT-001'),
  (4, 3, 1, '工业连接器A', 'IO-001', 200, '增值税专票', 13, 68, 60.1770, 13600, 12035.40, 1564.60, 'MAT-001'),
  (5, 4, 5, '轨道交通连接器E', 'IO-301', 200, '增值税专票', 13, 220, 194.6903, 44000, 38938.05, 5061.95, 'RAIL-001'),
  (6, 5, 4, 'EV充电连接器D', 'EV-001', 100, '增值税专票', 13, 85, 75.2212, 8500, 7522.12, 977.88, 'EV-MAT-001'),
  (7, 6, 1, '工业连接器A', 'IO-001', 100, '增值税专票', 13, 68, 60.1770, 6800, 6017.70, 782.30, 'MAT-001'),
  (8, 7, 1, '工业连接器A', 'IO-001', 100, '增值税专票', 13, 68, 60.1770, 6800, 6017.70, 782.30, 'MAT-001'),
  (9, 8, 4, 'EV充电连接器D', 'EV-001', 100, '增值税专票', 13, 85, 75.2212, 8500, 7522.12, 977.88, 'EV-MAT-001'),
  (10, 8, 2, '新能源线束B', 'WH-101', 50, '增值税专票', 13, 96, 84.9558, 4800, 4247.79, 552.21, 'WH-MAT-001');

-- ========= 样品订单表 =========
insert into public.crm_sample_order(
  id, sample_no, customer_id, customer_name, applicant, project_id, project_name, status, audit_status,
  tax_included_total_amount, tax_excluded_total_amount, total_amount, sales_rep, merchandiser,
  recipient, mobile_phone, province, city, district, detail_address
) values
  (1, 'YP2604010001', 1, '华东智造股份有限公司', 'EMP002', 1, '华东智造温控升级项目', 'wait_leader_examine', '未审核',
   680, 601.77, 680, 'EMP002', '张跟单', '王总', '13800000001', '上海', '上海市', '浦东新区', '上海市浦东新区XX路1号'),
  (2, 'YP2604020001', 2, '南方设备集团有限公司', 'EMP003', 2, '南方光伏逆变器项目', 'completed', '已审核',
   850, 752.21, 850, 'EMP003', '李跟单', '李工', '13800000002', '广东', '深圳市', '南山区', '深圳市南山区YY路8号'),
  (3, 'YP2604030001', 3, '北方工业科技有限公司', 'EMP004', 3, '北方工业设备升级项目', 'stay_follow_up', '已审核',
   340, 300.88, 340, 'EMP004', '孙跟单', '刘总', '13800000003', '北京', '北京市', '朝阳区', '北京市朝阳区ZZ路12号'),
  (4, 'YP2604040001', 4, '中部电气股份有限公司', 'EMP005', 4, '中部轨道交通连接器项目', 'completed', '已审核',
   2200, 1946.90, 2200, 'EMP005', '周跟单', '郑总', '13800000004', '湖北', '武汉市', '东湖区', '武汉市东湖区AA路88号'),
  (5, 'YP2604050001', 5, '西部新能源有限公司', 'EMP002', 5, '西部光伏联合研发项目', 'wait_leader_examine', '未审核',
   850, 752.21, 850, 'EMP002', '吴跟单', '钱总', '13800000005', '四川', '成都市', '高新区', '成都市高新区BB路66号'),
  (6, 'YP2604060001', 6, '华南汽车电子股份有限公司', 'EMP003', 6, '华南车载连接器项目', 'leader_reject', '已驳回',
   680, 601.77, 680, 'EMP003', '郑跟单', '陈总', '13800000006', '广东', '广州市', '天河区', '广州市天河区CC路55号');

-- ========= 样品订单明细表 =========
insert into public.crm_sample_order_item(
  id, sample_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, customer_material_no
) values
  (1, 1, 1, '工业连接器A', 'IO-001', 10, '增值税专票', 13, 68, 60.1770, 680, 601.77, 78.23, 'MAT-001'),
  (2, 2, 4, 'EV充电连接器D', 'EV-001', 10, '增值税专票', 13, 85, 75.2212, 850, 752.21, 97.79, 'EV-MAT-001'),
  (3, 3, 1, '工业连接器A', 'IO-001', 5, '增值税专票', 13, 68, 60.1770, 340, 300.88, 39.12, 'MAT-001'),
  (4, 4, 5, '轨道交通连接器E', 'IO-301', 10, '增值税专票', 13, 220, 194.6903, 2200, 1946.90, 253.10, 'RAIL-001'),
  (5, 5, 4, 'EV充电连接器D', 'EV-001', 10, '增值税专票', 13, 85, 75.2212, 850, 752.21, 97.79, 'EV-MAT-001'),
  (6, 6, 1, '工业连接器A', 'IO-001', 10, '增值税专票', 13, 68, 60.1770, 680, 601.77, 78.23, 'MAT-001');

-- ========= 售后订单表 =========
insert into public.crm_return_order(
  id, return_no, order_no, original_order_no, customer_id, customer_name, reason, handler, sales_rep, merchandiser,
  project_id, project_name, status, audit_status, tax_included_total_amount, tax_excluded_total_amount,
  after_sale_no, after_sale_reason
) values
  (1, 'TH2604010001', 'DD2604010001', 'DD2604010001', 1, '华东智造股份有限公司', '批次外观不一致', 'EMP002',
   'EMP002', '张跟单', 1, '华东智造温控升级项目', '待处理', '未审核', 680, 601.77, 'TH2604010001', '批次外观不一致'),
  (2, 'TH2604020001', 'DD2604020001', 'DD2604020001', 2, '南方设备集团有限公司', '产品不良', 'EMP003',
   'EMP003', '李跟单', 2, '南方光伏逆变器项目', '处理中', '已审核', 850, 752.21, 'TH2604020001', '产品不良'),
  (3, 'TH2604030001', 'DD2604040001', 'DD2604040001', 4, '中部电气股份有限公司', '规格不符', 'EMP005',
   'EMP005', '周跟单', 4, '中部轨道交通连接器项目', '已完成', '已审核', 2200, 1946.90, 'TH2604030001', '规格不符'),
  (4, 'TH2604040001', 'DD2604050001', 'DD2604050001', 5, '西部新能源有限公司', '客户要求退货', 'EMP002',
   'EMP002', '吴跟单', 5, '西部光伏联合研发项目', '待处理', '未审核', 850, 752.21, 'TH2604040001', '客户要求退货'),
  (5, 'TH2604050001', 'DD2604070001', 'DD2604070001', 1, '华东智造股份有限公司', '项目变更', 'EMP002',
   'EMP002', '张跟单', 1, '华东智造温控升级项目', '已取消', '已审核', 340, 300.88, 'TH2604050001', '项目变更取消订单');

-- ========= 售后订单明细表 =========
insert into public.crm_return_order_item(
  id, return_order_id, product_id, product_name, material_no, quantity, tax_type, tax_rate, tax_included_price,
  tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount, order_no, return_no, material_id,
  material_name, expected_after_sale_method, after_sale_reason, issue_description, return_tracking_no,
  final_handling_method, return_qty, return_method, after_sale_order_id, after_sale_no, material_qty
) values
  (1, 1, 1, '工业连接器A', 'IO-001', 10, '增值税专票', 13, 68, 60.1770, 680, 601.77, 78.23,
   'DD2604010001', 'TH2604010001', 'IO-001', '工业连接器A', '退货', '外观问题', '外观色差超标', 'SF12345678',
   '退货入库', 10, '退货入库', 1, 'TH2604010001', 10),
  (2, 2, 4, 'EV充电连接器D', 'EV-001', 10, '增值税专票', 13, 85, 75.2212, 850, 752.21, 97.79,
   'DD2604020001', 'TH2604020001', 'EV-001', 'EV充电连接器D', '换货', '功能不良', '测试异常', 'SF23456789',
   '换货处理', 10, '换货', 2, 'TH2604020001', 10),
  (3, 3, 5, '轨道交通连接器E', 'IO-301', 10, '增值税专票', 13, 220, 194.6903, 2200, 1946.90, 253.10,
   'DD2604040001', 'TH2604030001', 'IO-301', '轨道交通连接器E', '退货', '规格不符', '针脚定义不一致', 'SF34567890',
   '退货退款', 10, '退货退款', 3, 'TH2604030001', 10),
  (4, 4, 4, 'EV充电连接器D', 'EV-001', 10, '增值税专票', 13, 85, 75.2212, 850, 752.21, 97.79,
   'DD2604050001', 'TH2604040001', 'EV-001', 'EV充电连接器D', '退货', '客户要求', '项目取消', 'SF45678901',
   '退货入库', 10, '退货', 4, 'TH2604040001', 10),
  (5, 5, 1, '工业连接器A', 'IO-001', 5, '增值税专票', 13, 68, 60.1770, 340, 300.88, 39.12,
   'DD2604070001', 'TH2604050001', 'IO-001', '工业连接器A', '取消', '项目变更', '客户项目取消', null,
   '订单取消', 5, '取消订单', 5, 'TH2604050001', 5);

-- ========= 采购报价单表 =========
insert into public.crm_purchase_quotation(
  id, purchase_quote_no, project_id, quote_time, supplier, created_by, customer_name, customer_id, valid_until
) values
  (1, 'PQT2604010001', 1, current_date, '供应商A', 'EMP002', '华东智造股份有限公司', 1, current_date + interval '15 day'),
  (2, 'PQT2604020001', 2, current_date, '供应商B', 'EMP003', '南方设备集团有限公司', 2, current_date + interval '15 day'),
  (3, 'PQT2604030001', 3, current_date, '供应商A', 'EMP004', '北方工业科技有限公司', 3, current_date + interval '15 day'),
  (4, 'PQT2604040001', 4, current_date, '供应商C', 'EMP005', '中部电气股份有限公司', 4, current_date + interval '15 day'),
  (5, 'PQT2604050001', 5, current_date, '供应商B', 'EMP002', '西部新能源有限公司', 5, current_date + interval '15 day');

-- ========= 采购报价单明细表 =========
insert into public.crm_purchase_quotation_item(
  id, material_no, material_desc, tax_included_unit_price, tax_excluded_unit_price, sample_price, unit, lead_time, moq, mpq,
  purchase_quotation_id
) values
  (1, 'IO-001', '工业连接器A', 58, 51.33, 68, 'pcs', '10天', 50, 100, 1),
  (2, 'EV-001', 'EV充电连接器D', 72, 63.72, 85, 'pcs', '15天', 50, 100, 2),
  (3, 'WH-101', '新能源线束B', 82, 72.57, 96, 'pcs', '12天', 30, 60, 2),
  (4, 'IO-001', '工业连接器A', 56, 49.56, 68, 'pcs', '10天', 50, 100, 3),
  (5, 'IO-301', '轨道交通连接器E', 190, 168.14, 220, 'pcs', '25天', 20, 50, 4),
  (6, 'EV-001', 'EV充电连接器D', 70, 61.95, 85, 'pcs', '15天', 50, 100, 5);

-- ========= 潜在客户表 =========
insert into public.crm_potential_customer(id, name) values
  ('PC001', '北方精工有限公司'),
  ('PC002', '中部电气技术有限公司'),
  ('PC003', '东方科技股份有限公司'),
  ('PC004', '南方工业集团'),
  ('PC005', '西部机械制造有限公司'),
  ('PC006', '中原电子科技有限公司');

-- ========= 本体对象表 =========
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

-- ========= 客户案例库表 =========
insert into public.crm_case_library(
  id, title, customer_id, customer_name, project_id, industry, pain_points, solution,
  metrics, value_statement, tags, product_series_ids, product_category_ids, created_at
) values
  ('CASE001', '华东智造温控系统替代成功案例', '1', '华东智造股份有限公司', '1', '工业自动化', 
   '交付周期不稳定||质量波动||替代成本高', 
   '采用工业连接器标准系列，提供稳定供货保障和本地化技术支持。通过小批量试产验证，逐步替代原供应商，降低整体风险。',
   '交付周期缩短30%，返修率降低25%，综合成本下降15%',
   '通过高可靠性连接方案，确保了客户核心温控系统的稳定运行，实现了国产替代的平稳过渡。',
   '工业自动化||国产替代||温控系统',
   '1||3', '1||3', current_date),
  ('CASE002', '南方设备光伏逆变器连接器案例', '2', '南方设备集团有限公司', '2', '新能源设备',
   '认证周期长||技术支持不足||交付柔性低',
   '提供EV充电连接器系列，配套完整的UL认证资料和FAE现场支持。建立快速打样机制，满足客户研发周期要求。',
   '认证周期缩短40%，样品交付周期缩短50%，技术问题响应时间<2小时',
   '通过专业的技术支持和快速响应能力，帮助客户加快了光伏逆变器产品的上市进度。',
   '新能源||光伏||快速交付',
   '2||4', '2||4', current_date),
  ('CASE003', '中部电气轨道交通连接器项目', '4', '中部电气股份有限公司', '4', '轨道交通',
   '可靠性要求高||资质要求严格||长周期供货',
   '提供轨道交通专用连接器，满足IP69K防护等级和严苛的可靠性测试要求。建立专项备货机制，保障长期稳定供货。',
   '产品可靠性达到99.99%，供货周期稳定在45天内，零质量事故',
   '凭借过硬的产品品质和完善的服务体系，成功进入轨道交通核心供应商名录。',
   '轨道交通||高可靠性||IP69K',
   '5', '3', current_date),
  ('CASE004', '西部新能源光伏接线盒联合研发', '5', '西部新能源有限公司', '5', '新能源',
   '技术方案匹配度不足||定制化需求高||研发周期不确定',
   '成立联合研发团队，深入理解客户需求，定制开发专用连接器方案。建立敏捷开发流程，快速迭代验证。',
   '技术方案匹配度提升80%，研发周期缩短30%，定制化需求响应<1周',
   '通过深度的技术合作，与客户建立了战略合作伙伴关系，共同推动光伏行业技术进步。',
   '联合研发||光伏||定制化',
   '4||2', '4||2', current_date),
  ('CASE005', '华南汽车电子车载连接器导入', '6', '华南汽车电子股份有限公司', '6', '汽车电子',
   '车规级认证要求高||质量标准严苛||供应链要求严格',
   '提供IATF16949认证的车载连接器产品，建立完整的PPAP文件包。导入严格的质量追溯体系，满足车规级要求。',
   'IATF16949认证通过，PPAP文件一次性审核通过，产品良率99.8%',
   '成功进入汽车电子供应链，为后续车载项目合作奠定了坚实基础。',
   '汽车电子||车规级||IATF16949',
   '1||3', '1||3', current_date)
on conflict (id) do nothing;

commit;