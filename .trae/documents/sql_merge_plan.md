# SQL 文件合并计划

## 一、任务概述

将 `/Users/hvai/trae/crm-ai-v3.8/new_version/migrations` 文件夹中的 SQL 文件合并到 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/init.sql` 中，并根据新生成的文件更新 `/Users/hvai/trae/crm-ai-v3.8/supabase/rebuild/seed.sql` 文件。

## 二、文件分析

### 1. migrations 文件夹中的 SQL 文件

| 文件名 | 功能描述 |
|-------|---------|
| add_new_tables.sql | 新增品牌表（ba_brand）、归属小组表（ba_group）、产品线表（ba_product_line） |
| add_product_property_relation_table.sql | 新增产品属性关系表（ba_product_property_relation） |
| add_public_property_tables.sql | 新增公共属性名称表（public_property_name）和公共属性值表（public_property_value） |
| modify_ba_cpinfo.sql | 修改 ba_cpinfo 表结构，包括：<br>1. id 改为 int 类型、自动递增、唯一主键<br>2. status 改为 int 类型<br>3. 新增 26 个业务字段 |
| modify_ba_cptype.sql | 修改 ba_cptype 表结构，包括：<br>1. id 改为 int 类型、自动递增、唯一主键<br>2. 新增 status 字段<br>3. 修改 parent_id 字段为 int 类型 |
| modify_ba_manucustinfo.sql | 修改 ba_manucustinfo 表结构，包括：<br>1. id 改为 int 类型、自动递增、唯一主键<br>2. 多个字段类型从 text 改为 int<br>3. 新增多个业务字段 |
| modify_ba_spu.sql | 修改 ba_spu 表结构，包括：<br>1. 移除冗余的 brand 字段<br>2. 修改 brand_id 字段类型为 int 并添加外键约束 |

### 2. 现有的 init.sql 文件

包含完整的数据库初始化脚本，包括：
- 扩展和模式创建
- 枚举类型定义
- 表结构创建
- 索引创建
- 触发器创建
- RLS 策略配置

### 3. 现有的 seed.sql 文件

包含种子数据的插入语句，涵盖：
- 员工信息
- 产品类别
- 产品系列
- 产品信息
- 客户信息
- 客户联系人
- 客户画像
- 询盘
- 线索
- 商机
- 项目
- 微信会话和消息
- 沟通日志
- 任务类型和任务
- 竞争对手
- 客户关注点和竞争对手分析
- 客户跟进策略配置
- 客户 FAQ 库配置
- 利益相关者评估
- 报价
- 销售订单
- 样品订单
- 退货订单
- 潜在客户
- 本体对象

## 三、合并策略

### 1. 合并顺序

按照以下顺序合并 migrations 中的 SQL 文件到 init.sql 中：

1. **add_new_tables.sql** - 首先创建新表，因为其他表可能会引用这些新表
2. **add_public_property_tables.sql** - 创建公共属性相关表
3. **add_product_property_relation_table.sql** - 创建产品属性关系表
4. **modify_ba_cptype.sql** - 修改产品类别表，因为其他表会引用它
5. **modify_ba_manucustinfo.sql** - 修改客户信息表
6. **modify_ba_cpinfo.sql** - 修改产品信息表
7. **modify_ba_spu.sql** - 修改 SPU 表

### 2. 合并方法

1. **表创建**：将新表的创建语句添加到 init.sql 的相应位置
2. **表修改**：替换 init.sql 中对应的表结构定义
3. **索引创建**：确保所有必要的索引都被创建
4. **外键约束**：确保所有必要的外键约束都被添加
5. **触发器和 RLS 策略**：确保新表也被包含在触发器和 RLS 策略中

### 3. 验证步骤

1. 检查合并后的 init.sql 文件是否有语法错误
2. 确保表创建和修改的顺序正确，避免依赖关系错误
3. 确保所有必要的字段、索引和约束都被正确添加

## 四、seed.sql 更新策略

1. **新增表的种子数据**：为新创建的表（ba_brand、ba_group、ba_product_line、public_property_name、public_property_value、ba_product_property_relation）添加种子数据
2. **修改表的种子数据**：更新现有表的种子数据，以适应表结构的变化
3. **数据类型调整**：确保种子数据的数据类型与新的表结构匹配
4. **外键关联**：确保种子数据中的外键关联正确

## 五、具体实施步骤

### 1. 合并 init.sql

1. **添加新表**：
   - 在 `BASE TABLES` 部分添加 ba_brand、ba_group、ba_product_line 表
   - 在适当位置添加 public_property_name、public_property_value 表
   - 在适当位置添加 ba_product_property_relation 表

2. **修改现有表**：
   - 替换 ba_cptype 表的定义
   - 替换 ba_manucustinfo 表的定义
   - 替换 ba_cpinfo 表的定义
   - 修改 ba_spu 表的定义

3. **更新触发器和 RLS 策略**：
   - 在 `updated_tables` 数组中添加新表
   - 确保新表也被包含在 RLS 策略中

4. **添加索引**：
   - 为新表添加必要的索引
   - 确保现有表的索引正确

### 2. 更新 seed.sql

1. **添加新表的种子数据**：
   - 为 ba_brand 添加品牌数据
   - 为 ba_group 添加归属小组数据
   - 为 ba_product_line 添加产品线数据
   - 为 public_property_name 和 public_property_value 添加公共属性数据
   - 为 ba_product_property_relation 添加产品属性关系数据

2. **更新现有表的种子数据**：
   - 更新 ba_cptype 的种子数据，适应新的表结构
   - 更新 ba_manucustinfo 的种子数据，适应新的表结构
   - 更新 ba_cpinfo 的种子数据，适应新的表结构
   - 更新 ba_spu 的种子数据，适应新的表结构

3. **调整数据类型**：
   - 确保所有种子数据的数据类型与新的表结构匹配
   - 特别是将 text 类型的 id 改为 int 类型

4. **修复外键关联**：
   - 确保种子数据中的外键关联正确
   - 特别是与新创建的表的关联

## 六、风险评估

1. **依赖关系风险**：表创建和修改的顺序可能会导致依赖关系错误，需要确保正确的顺序
2. **数据类型风险**：表结构修改后，种子数据的数据类型可能不匹配，需要仔细检查
3. **外键约束风险**：外键约束可能会导致种子数据插入失败，需要确保外键关联正确
4. **语法错误风险**：合并过程中可能会引入语法错误，需要仔细检查

## 七、验收标准

1. 合并后的 init.sql 文件无语法错误
2. 更新后的 seed.sql 文件无语法错误
3. 所有新表都被正确创建
4. 所有现有表都被正确修改
5. 所有必要的索引和约束都被添加
6. 所有种子数据都能正确插入
7. 外键关联正确

## 八、时间估计

- 合并 init.sql 文件：约 1 小时
- 更新 seed.sql 文件：约 1 小时
- 验证和测试：约 30 分钟
- 总计：约 2.5 小时