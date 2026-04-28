# 新增数据库表计划

## 任务概述

根据用户要求，需要新增三个数据库表：
1. 品牌表（brand）
2. 归属小组表（group）
3. 产品线表（product_line）

同时需要更新文档并生成SQL迁移文件。

## 详细计划

### 1. 更新 supabase_tables.md 文档

在 `new_version/supabase_tables.md` 文件中添加三个新表的结构定义，遵循现有文档的格式和风格。

#### 1.1 品牌表（ba_brand）
- 字段：id (int, 自动递增, 主键)、name (text, 非空)、status (int, 默认 1)、created_at (timestamptz)、updated_at (timestamptz)

#### 1.2 归属小组表（ba_group）
- 字段：id (int, 自动递增, 主键)、name (text, 非空)、manager (text)、created_at (timestamptz)、updated_at (timestamptz)

#### 1.3 产品线表（ba_product_line）
- 字段：id (int, 自动递增, 主键)、parent_id (int, 外键)、name (text, 非空)、manager (text)、created_at (timestamptz)、updated_at (timestamptz)

### 2. 生成 SQL 迁移文件

在 `new_version/migrations` 目录下创建新的 SQL 迁移文件 `add_new_tables.sql`，包含以下内容：

#### 2.1 品牌表（ba_brand）
- 检查表是否存在，不存在则创建
- 定义字段和约束
- 设置默认值

#### 2.2 归属小组表（ba_group）
- 检查表是否存在，不存在则创建
- 定义字段和约束
- 设置默认值

#### 2.3 产品线表（ba_product_line）
- 检查表是否存在，不存在则创建
- 定义字段和约束，包括外键
- 设置默认值

### 3. 验证和测试

- 确保 SQL 语句语法正确
- 确保表结构符合要求
- 确保文档更新完整

## 技术细节

### 主键设置
- 类型：int
- 自动递增：使用 SERIAL 类型
- 唯一：通过 PRIMARY KEY 约束保证

### 时间戳字段
- 使用 timestamptz 类型
- 默认值：NOW()

### 状态字段
- 类型：int
- 默认值：1（启用）
- 含义：1=启用，0=禁用

### 外键关系
- 产品线表的 parent_id 字段引用自身的 id 字段，支持树形结构

## 风险评估

- 低风险：新增表操作不会影响现有数据
- 建议在执行 SQL 前备份现有数据库

## 执行步骤

1. 编写 supabase_tables.md 文档更新
2. 编写 SQL 迁移文件
3. 验证文件内容
4. 提交变更