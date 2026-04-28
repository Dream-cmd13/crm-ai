# 创建用户表计划

## 任务概述

根据用户要求，需要创建用户表（ba_customer_user），包含会员相关信息。同时需要更新文档并生成SQL迁移文件。

## 详细计划

### 1. 更新 supabase_tables.md 文档

在 `new_version/supabase_tables.md` 文件的"基础表结构"部分添加新表 `ba_customer_user`（用户表/会员表），遵循现有文档的格式和风格。

#### 表结构定义
| 字段名 | 数据类型 | 约束 | 默认值 | 描述 |
|-------|---------|------|-------|------|
| id | int | not null unsigned auto_increment primary key | <br /> | 主键 |
| customer_id | int | not null references ba_manucustinfo(id) | <br /> | 客户ID |
| member_name | text | not null | <br /> | 会员名称 |
| contact_name | text | <br /> | <br /> | 联系人 |
| phone | text | <br /> | <br /> | 手机号 |
| email | text | <br /> | <br /> | 邮箱 |
| is_primary | int | not null | 0 | 是否首联系人（0否，1是） |
| status | int | not null | 1 | 账户状态（1正常，0冻结） |
| source | int | not null | <br /> | 账户来源（1线上，2后台，3公众号注册，4短信推广注册，5微信小程序） |
| created_at | timestamptz | not null | now() | 创建时间 |
| updated_at | timestamptz | not null | now() | 更新时间 |

### 2. 生成 SQL 迁移文件

在 `new_version/migrations` 目录下创建新的 SQL 迁移文件 `add_ba_customer_user.sql`，包含以下内容：

#### 2.1 创建用户表（ba_customer_user）
- 检查表是否存在，不存在则创建
- 定义字段和约束，包括：
  - 主键：id (int, auto_increment, primary key, unsigned)
  - 客户ID：customer_id (int, not null, 外键关联 ba_manucustinfo)
  - 会员名称：member_name (text, not null)
  - 联系人：contact_name (text)
  - 手机号：phone (text)
  - 邮箱：email (text)
  - 是否首联系人：is_primary (int, not null, default 0)
  - 账户状态：status (int, not null, default 1)
  - 账户来源：source (int, not null)
  - 创建时间：created_at (timestamptz)
  - 更新时间：updated_at (timestamptz)
- 应用 updated_at 触发器
- 设置 RLS 策略

### 3. 执行步骤

1. 更新 supabase_tables.md 文档，添加新表结构定义
2. 创建 new_version/migrations 目录（如不存在）
3. 创建 SQL 迁移文件 add_ba_customer_user.sql
4. 验证文件内容

## 技术细节

### 主键设置
- 类型：int
- 约束：unsigned, auto_increment, primary key
- 在 PostgreSQL 中使用 SERIAL/BIGSERIAL 类型实现

### 字段说明
- customer_id: 关联客户信息表，外键
- member_name: 会员名称，必填
- contact_name: 联系人姓名
- phone: 手机号码
- email: 电子邮箱
- is_primary: 是否为首联系人，0=否，1=是
- status: 账户状态，1=正常，0=冻结
- source: 账户来源，1=线上，2=后台，3=公众号注册，4=短信推广注册，5=微信小程序

### 时间戳字段
- 使用 timestamptz 类型
- 默认值：NOW()
- 通过触发器自动更新 updated_at

## 风险评估

- 低风险：新增表操作不会影响现有数据
- 建议在执行 SQL 前备份现有数据库
