# 微信发送人消息列表与客户会话重构计划

## Summary

* 目标：去除当前“个人会话按客户/对端归纳”的逻辑，改为“按发送人（我的微信）聚合消息列表”；在消息列表中支持单选/多选消息创建客户会话，并把该会话展示到客户库“沟通详情”中。

* 决策：

  * 客户沟通详情采用“会话卡片”方案作为默认展示。

  * 本次仅重构个人会话，群聊维持现状。

  * 数据库采用“直接重建”方式，不保留历史微信相关数据。

  * 创建客户会话时：客户必选、联系人可空。

  * 发送人唯一键：优先使用 `sender_wechat_id`，缺失时回退显示名。

  * 已归档到客户会话的消息仍保留在原始发送人消息列表中，并显示归档标记。

* 总体方案：保留 `crm_wx_message` 作为原始微信消息事实表；新增“客户会话”业务表与“会话-消息关联”表；前端个人微信入口改造成“发送人消息列表”，客户库沟通详情改造成“会话卡片 + 会话消息”。

## Current State Analysis

### 现有实现断点

* `src/components/SystemWechatQuery.tsx`

  * 当前个人页仍基于 `crm_wx_conversation` 列表。

  * 个人列表含“客户微信”列。

  * 列表和详情页都存在“绑定客户”按钮。

  * “进入会话”进入的是按 `conversation_id` 查询的旧式会话详情。

  * 仍支持“新增个人会话”，本质是手工向 `crm_wx_conversation` upsert。

* `src/lib/customerRepository.ts`

  * 客户库沟通详情仍在读取旧表 `crm_wechat_session / crm_wechat_message / crm_wechat_group / crm_wechat_group_message`。

  * 该仓库与 `SystemWechatQuery` 使用的新表 `crm_wx_*` 已不一致。

  * 未配置 Supabase 时仍回退 `mockCustomers / mockPersonas / mockTodoTasks`。

* `src/components/CommunicationLog.tsx`

  * 当前“沟通详情”按沟通类型切 Tab，不存在明确的“客户会话”业务实体。

  * 已有消息多选状态 `selectedMessageIds`，但主要服务于 AI 面板，尚未用于“创建客户会话”。

  * 仍保留“选择系统微信会话”与旧绑定式入口。

* `src/components/WechatChatSelectorModal.tsx`

  * 仍查询旧表 `crm_wechat_session / crm_wechat_group`，并包含本地 mock 数据。

* `src/pages/Customers.tsx`

  * 初始化客户、画像、任务、群聊时仍使用 mock 数据作为默认值。

  * 页面内部仍有对 `mockPersonas`、`mockCustomers` 的直接查找。

* `flask/schema.sql`

  * 已是最新微信投影模型，包含 `crm_wx_conversation / crm_wx_message / crm_wx_conversation_member`。

  * 但其“个人会话”概念仍偏向原始聊天会话，不是用户现在要的“发送人消息列表”。

* `supabase/rebuild/init.sql` 与 `supabase/rebuild/seed.sql`

  * 仍保留旧 `crm_wechat_*` 表与种子数据，和当前前端/后端真实模型已漂移。

### 已确认的用户意图

* 去掉个人会话里的“客户归纳到哪个会话”的思路。

* 个人列表不再显示“客户微信”。

* “进入会话”改成“进入消息列表”。

* 对个人消息，只保留“发送人 = 我的微信”这个聚合维度。

* 同一发送人只有一个消息列表；该发送人的所有消息都进同一个列表。

* 转发消息拆解为多条的现有能力要保留。

* 移除“绑定客户”按钮。

* 在消息列表里可单选/多选消息创建客户会话。

* 创建客户会话时：搜索选择客户；联系人可不填。

* 创建后的客户会话，展示在客户库“沟通详情”里。

* 客户库去掉 mock 展示，改为数据库数据。

* 系统未上线，可直接改表重建，无需历史迁移。

## 会话概念设计备选

### 方案 A：会话卡片（推荐）

* 定义：

  * 原始层：发送人消息列表，仅负责收拢待处理消息。

  * 业务层：从消息列表中选择若干条消息，创建一个“客户会话”。

* 展示：

  * 客户库“沟通详情”顶部显示会话卡片列表。

  * 卡片内展示：客户、联系人、来源发送人、消息数、最后消息时间、最后摘要。

  * 点击卡片后显示该会话下的消息明细。

* 优点：

  * “原始消息”与“业务归档会话”职责清晰。

  * 用户可以先处理消息，再沉淀为客户会话，符合 CRM 归档心智。

  * 健壮性高，后续可扩展负责人、状态、标签、二次跟进等字段。

* 缺点：

  * 需要新增业务表与一些前端状态切换。

### 方案 B：时间线分组

* 定义：不引入独立“会话卡片”区域，在客户沟通详情里仍用时间线，但按会话分组折叠。

* 优点：

  * 界面改动较轻。

  * 用户仍能顺序浏览所有沟通。

* 缺点：

  * “会话”边界弱，不利于后续管理和筛选。

  * 同时承载原始沟通与业务会话，语义容易混杂。

### 方案 C：仅标签聚合

* 定义：不做独立会话实体，仅给选中消息打上“客户/联系人/会话标签”。

* 优点：

  * 改动最小。

* 缺点：

  * 不符合“创建会话”的用户心智。

  * 可维护性与可扩展性最差。

### 推荐结论

* 采用方案 A。

* 原因：用户明确要求“创建会话”，且希望它在客户库中成为可见、可管理的对象；方案 A 的边界、体验和鲁棒性最佳。

## Proposed Changes

### 一、数据库与表结构

#### 1. 保留并弱化原 `crm_wx_conversation` 的个人业务职责

* 文件：

  * `flask/schema.sql`

  * `supabase/rebuild/init.sql`

  * `supabase/rebuild/seed.sql`

* 调整方向：

  * 旧 `crm_wechat_*` 表彻底移除，不再保留。

  * `crm_wx_message` 继续作为微信消息事实表，不再承载“客户归档会话”业务语义。

  * `crm_wx_conversation` 群聊用途保留；个人页前端不再依赖它做“客户归纳”。

* 原因：

  * 发送人消息列表应从消息事实出发，而不是继续复用“原始聊天会话”实体。

#### 2. 新增“客户会话”业务表

* 推荐新增表：`crm_customer_message_session`

* 字段建议：

  * `id`

  * `customer_id`：必填

  * `contact_id`：可空

  * `channel`：固定为 `wechat_private`

  * `source_sender_key`：发送人聚合键，优先 `sender_wechat_id`，否则回退显示名键

  * `source_sender_wechat_id`

  * `source_sender_display_name`

  * `title`：默认可自动生成，如“{客户名} - {发送人} 会话”

  * `message_count`

  * `last_message_at`

  * `last_message_preview`

  * `status`：默认 `active`

  * `created_at`

  * `updated_at`

* 作用：

  * 这是客户库中真正可展示的“会话”实体。

#### 3. 新增“客户会话-微信消息关联表”

* 推荐新增表：`crm_customer_message_session_item`

* 字段建议：

  * `id`

  * `session_id`

  * `wx_message_id`

  * `sort_order`

  * `created_at`

* 约束建议：

  * `unique(session_id, wx_message_id)`

  * 额外增加 `unique(wx_message_id)`，默认一个原始消息只能归档到一个客户会话，避免一条消息被多处复用导致业务歧义。

* 作用：

  * 让“原始消息”和“业务会话”解耦。

  * 支持消息仍保留在原始列表中，但显示已归档状态。

#### 4. 新增发送人消息列表视图或查询模型

* 推荐方式：新增只读视图 `crm_wx_sender_inbox_v`

* 视图聚合逻辑：

  * 仅聚合个人消息。

  * 聚合键：`coalesce(nullif(sender_wechat_id,''), lower(trim(sender_display_name)))`

  * 输出字段：

    * `sender_key`

    * `sender_wechat_id`

    * `sender_display_name`

    * `message_count`

    * `last_message_at`

    * `last_message_preview`

    * `archived_message_count`

* 原因：

  * “一个发送人一个消息列表”是新的展示模型，使用视图比硬改原消息表语义更稳妥。

### 二、系统微信页重构

#### 1. 个人 Tab 改为“发送人消息列表”

* 文件：`src/components/SystemWechatQuery.tsx`

* 具体改法：

  * 个人列表数据源从 `crm_wx_conversation` 改为 `crm_wx_sender_inbox_v` 或基于 `crm_wx_message` 的聚合查询。

  * 列标题改为：

    * 我的微信（发送人）

    * 消息数

    * 最近消息

    * 最近时间

    * 已归档数

    * 操作

  * 删除“客户微信”列。

  * 删除个人列表中的“绑定客户”按钮。

  * “进入会话”文案改为“进入消息列表”。

  * 删除“新增个人会话”入口与表单。

* 原因：

  * 完整符合“按发送人聚合”的新模型。

#### 2. 个人详情页改为“消息列表 + 创建客户会话”

* 文件：`src/components/SystemWechatQuery.tsx`

* 具体改法：

  * 详情页顶部显示发送人信息，而不是“个人会话 / 客户微信”。

  * 查询该发送人下的全部个人消息，按时间排序展示。

  * 保留转发消息拆解后的逐条展示逻辑与引用附件渲染逻辑。

  * 为消息项增加单选/多选交互。

  * 增加“创建客户会话”按钮。

  * 创建时弹出新表单：搜索客户（必选）+ 搜索联系人（可空）+ 会话标题（可选）。

  * 创建成功后：

    * 写入 `crm_customer_message_session`

    * 写入 `crm_customer_message_session_item`

    * 当前消息列表刷新归档标记

* 原因：

  * 让消息处理与客户归档在同一工作流内完成。

#### 3. 群聊逻辑本次保持不动

* 文件：`src/components/SystemWechatQuery.tsx`

* 处理方式：

  * 群聊仍基于现有 `crm_wx_conversation` / `crm_wx_conversation_member`。

  * 不把群聊纳入本轮“发送人消息列表”改造。

* 原因：

  * 已确认本次仅改个人会话，控制风险与范围。

### 三、客户库沟通详情重构

#### 1. 客户沟通详情引入“会话卡片”

* 文件：

  * `src/components/CommunicationLog.tsx`

  * `src/lib/customerRepository.ts`

  * 视情况新增：`src/lib/customerMessageSessionRepository.ts`

* 具体改法：

  * 在客户库“沟通详情”里新增“会话卡片区”。

  * 卡片数据来自 `crm_customer_message_session`。

  * 卡片点击后，在右侧或下方展示该会话对应的原始微信消息。

  * 默认仍保留普通 `crm_communication_log` 的非微信沟通记录。

* 原因：

  * 让“客户沟通详情”同时包含传统沟通和结构化微信客户会话。

#### 2. 客户沟通数据源切到新模型

* 文件：`src/lib/customerRepository.ts`

* 具体改法：

  * 停止读取旧 `crm_wechat_session / crm_wechat_message / crm_wechat_group / crm_wechat_group_message`。

  * 新增查询：

    * 传统沟通记录：`crm_communication_log`

    * 客户会话：`crm_customer_message_session`

    * 会话消息：`crm_customer_message_session_item` + `crm_wx_message`

  * 对外返回结构扩展为：

    * 普通沟通记录

    * 客户会话列表

    * 会话消息映射

* 原因：

  * 解决当前系统微信页与客户库读取两套表模型不一致的问题。

#### 3. 移除旧“绑定系统微信会话”思路

* 文件：

  * `src/components/CommunicationLog.tsx`

  * `src/components/WechatChatSelectorModal.tsx`

* 具体改法：

  * 删掉“选择系统微信会话并绑定到客户”的旧入口。

  * 用“从消息列表创建客户会话”替代。

  * `WechatChatSelectorModal.tsx` 如无复用价值则删除；否则重写为“创建客户会话弹窗”。

* 原因：

  * 产品语义已从“绑定会话”切换为“基于消息创建客户会话”。

### 四、客户库去除 mock 数据

#### 1. 初始化状态去 mock

* 文件：

  * `src/pages/Customers.tsx`

  * `src/lib/customerRepository.ts`

* 具体改法：

  * `customers / personas / todoTasks / groupChats / followUpPlans` 初始值改为空数组或数据库结果，不再依赖 `mock*`。

  * `fetchCustomersModuleDataFromSupabase` 未配置 Supabase 时返回空数组，不再返回 mock。

  * 页面补充加载中/空状态。

* 原因：

  * 用户明确要求“客户库写死 mock 数据去除，用数据库数据展示”。

#### 2. 清理页面内部直接引用 mock 的逻辑

* 文件：`src/pages/Customers.tsx`

* 具体改法：

  * `handleAnalyzeContact` 中使用当前 `personas` 状态替代 `mockPersonas`。

  * `handleSaveActual` 中使用当前 `customers` 状态替代 `mockCustomers`。

  * 清理无用 `mockGroupChats / mockTodoTasks` 依赖。

* 原因：

  * 避免界面已切数据库，但局部逻辑仍偷偷读 mock，造成前后不一致。

### 五、类型与仓库层整理

#### 1. 扩展前端类型

* 文件：

  * `src/types/business.ts`

  * 视情况新增 `src/types/wechat.ts` 补充业务类型

* 建议新增类型：

  * `WechatSenderInbox`

  * `CustomerMessageSession`

  * `CustomerMessageSessionItem`

  * `CustomerMessageSessionDetail`

* 原因：

  * 避免继续用 `CommunicationDetail` 强行承载“原始消息 + 客户会话”两种概念。

#### 2. 仓库层职责拆分

* 文件：

  * 现有：`src/lib/customerRepository.ts`

  * 建议新增：`src/lib/customerMessageSessionRepository.ts`

* 处理方式：

  * `customerRepository.ts` 继续负责客户主数据、传统沟通数据。

  * 新仓库负责：

    * 获取发送人消息列表

    * 获取发送人消息明细

    * 创建客户会话

    * 查询客户会话及会话消息

* 原因：

  * 降低 `customerRepository.ts` 持续膨胀与概念混杂。

## Assumptions & Decisions

* 已确定仅改个人会话，群聊维持现状。

* 已确定直接重建微信相关结构，不做历史迁移。

* 发送人聚合键规则：

  * 优先 `sender_wechat_id`

  * 缺失时回退 `lower(trim(sender_display_name))`

* 单个原始微信消息默认只允许归档到一个客户会话。

* “客户会话”属于客户沟通详情的业务归档结果，不等同于底层原始微信会话。

* 原始发送人消息列表保留全部消息，已归档消息只做标记，不从列表中删除。

* 本次不处理群聊也切换到新客户会话模型。

* 本次不保留“手工新增个人会话”能力；个人消息仅来源于原始微信消息表。

## 还应补充但不阻塞本次实施的信息

* 需要“会话关闭/归档/删除”状态。

* 不需要允许一条消息后续被“改派”到其他客户会话。

* 会话标题允许用户编辑，默认自动生成。

* 需要在消息列表增加“仅看未归档 / 查看全部”切换。

* 是否需要在客户沟通详情中把普通沟通和客户会话拆成两个子页签。

## Verification Steps

### 数据库验证

* 执行最新 schema 后，确认以下对象存在且可查询：

  * `crm_wx_message`

  * `crm_wx_conversation`

  * `crm_customer_message_session`

  * `crm_customer_message_session_item`

  * `crm_wx_sender_inbox_v`

* 确认旧 `crm_wechat_*` 表已不再被前端查询。

### 页面验证

* 系统设置 > 微信查询：

  * 个人页显示“发送人消息列表”而不是旧个人会话列表。

  * 不再显示“客户微信”列。

  * 不再显示个人“绑定客户”按钮。

  * “进入消息列表”可打开该发送人的所有消息。

  * 转发消息拆解、多条消息展示、附件/图片预览仍正常。

  * 单选/多选消息后可创建客户会话。

  * 创建成功后消息显示归档标记。

* 客户库：

  * 客户列表与详情只显示数据库数据，不再显示 mock 客户。

  * “沟通详情”中可看到新建的客户会话卡片。

  * 点击卡片能查看对应消息。

  * 非微信沟通记录仍可正常查看与新增。

### 代码质量验证

* 对本次改动文件运行 TypeScript/ESLint 诊断。

* 确认不存在对以下旧模型的残留引用：

  * `crm_wechat_session`

  * `crm_wechat_message`

  * `crm_wechat_group`

  * `crm_wechat_group_message`

  * `mockCustomers`

  * `mockPersonas`

  * `mockTodoTasks`

  * `mockGroupChats`

## 执行顺序建议

1. 先改 `flask/schema.sql`，定义新会话业务表与发送人聚合视图，并清理旧微信表。
2. 同步 `supabase/rebuild/init.sql` 与 `supabase/rebuild/seed.sql`，消除本地重建脚本漂移。
3. 新建仓库层：发送人消息列表、消息明细、创建客户会话、客户会话查询。
4. 重构 `SystemWechatQuery.tsx` 个人页为“发送人消息列表 + 创建客户会话”。
5. 重构 `customerRepository.ts` 与 `CommunicationLog.tsx`，让客户库显示会话卡片。
6. 清理 `Customers.tsx` 和 `WechatChatSelectorModal.tsx` 中所有 mock / 旧表引用。
7. 跑诊断与页面联调，最后补文案与空状态。

