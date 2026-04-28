# 数据库表逻辑与架构说明

本项目数据库按照职责划分为多个逻辑层，从底层的原始数据接收，到中间的消息解析与联系人同步，再到上层的 CRM 业务投影。以下是各个表的逻辑、作用及关联关系的详细说明。

## 1. 原始回调数据层 (Callback Raw Layer)
用于第一时间持久化接收到的 Webhook 推送数据，确保数据不丢失，作为后续异步处理和溯源的基石。

* **`wechat_callback_raw` (个微回调原始表)**: 存储个人微信的原始回调数据。
* **`wework_callback_raw` (企微回调原始表)**: 存储企业微信的原始回调数据。
  * **核心逻辑**: 通过 `dedupe_key` 保证数据去重。采用 `route_status` 记录当前数据的路由分发状态（如 `received`）。包含完整的 `payload`。

## 2. 消息事件层 (Message Events Layer)
从原始回调数据中解析出的结构化事件，区分了私聊、群聊及其他通知事件。

### 个人微信 (WeChat)
* **`wechat_group_message_events` (个微群聊消息表)**: 记录群聊消息，核心字段包括 `guid`（所属号）、`roomid`（群ID）、`sender`（发送者）、`content`（消息内容）等。
* **`wechat_private_message_events` (个微私聊消息表)**: 记录私聊消息，核心字段包括 `sender`（发送者）、`receiver`（接收者）。
* **`wechat_other_events` (个微其他事件表)**: 记录如好友添加、状态变更等非聊天消息事件。

### 企业微信 (WeWork)
* **`wework_group_message_events` (企微群聊消息表)**
* **`wework_private_message_events` (企微私聊消息表)**
* **`wework_other_events` (企微其他事件表)**
  * **核心逻辑**: 将 `payload` 拆解为具体的业务字段（如 `msg_type`, `sendtime`, `content`），方便按时间、发送者、消息类型进行快速检索。包含了与媒体处理相关的扩展字段（`local_media_path`, `remote_media_url`, `voice_trans_text`）。

## 3. 媒体文件处理层 (Media Processing Layer)
处理语音转文字、图片/视频下载等耗时的异步任务。

* **`message_media_jobs` (媒体任务队列)**: 记录需要下载媒体或转换语音的任务（`job_type`）。包含重试机制（`attempt_count`, `next_retry_at`）和状态流转（`pending`, `processing`, `success`, `failed`）。
* **`message_media_results` (媒体任务结果)**: 存储任务执行成功后的结果（如本地路径、远端 URL、转写文本），通过 `job_id` 关联到任务表。
* **`cdn_runtime_state`**: 缓存各个微信实例（`guid`）的 CDN 配置信息和过期时间，供媒体下载时使用。

## 4. 联系人与群组同步层 (Contact & Chatroom Sync Layer)
维护微信通讯录、群组及群成员的最新状态，支持增量同步。

* **`wechat_sync_state` (同步状态表)**: 记录每个 `guid` 的通讯录同步游标（`contact_seq`）和群同步游标（`room_seq`），确保增量同步的连续性。
* **`wechat_contacts` (微信联系人表)**: 存储微信好友/联系人的详细信息（昵称、备注、性别、类型等）。
* **`wechat_chatrooms` (微信群组表)**: 存储微信群组的基本信息及版本号（`chatroom_version`, `chatroom_info_version`）。
* **`wechat_chatroom_members` (微信群成员表)**: 维护群组与用户的多对多关系，包含用户在群内的显示名称（`display_name`）和邀请人信息。
* **`wechat_contact_sync_jobs` (同步任务队列)**: 管理异步的增量同步或特定事件触发的同步任务，确保不会因高并发请求阻塞主线程。

## 5. CRM 投影层 (CRM Projection Layer)
将底层的微信原始数据和联系人数据，抽象并映射为 CRM 系统中的标准业务模型。

* **`crm_wx_conversation` (统一会话表)**: 将私聊和群聊统一为“会话”模型。关联到具体的 CRM 客户（`customer_id`）和负责人（`owner_employee_id`）。记录最后一条消息的时间和预览。
* **`crm_wx_message` (标准化消息表)**: 从底层消息事件表投影而来，屏蔽了个微/企微的差异，提供统一的消息视图。
* **`crm_wx_conversation_member` (会话成员表)**: 记录参与会话的成员，并区分其身份类型（`customer_contact` 客户, `employee` 员工, `external_unknown` 外部未知）。
* **`crm_wx_binding_candidate` (绑定候选表)**: 当发现新的微信联系人时，系统基于匹配规则生成的 CRM 客户/联系人绑定建议（包含匹配来源和分数）。
* **`crm_wx_projection_jobs` (投影任务队列)**: 异步处理新消息，将其从原始事件表平滑地转换并写入到 CRM 投影层的任务队列。

## 架构总结
1. **数据流向**: `回调接入 -> 原始数据落库 -> 消息/事件解析提取 -> 媒体处理/CRM 投影`。
2. **解耦设计**: 通过各种 `*_jobs` 表实现了重度操作（如下载、同步、复杂业务映射）的异步化，保证了 Webhook 接口的高可用。
3. **分层清晰**: 微信协议层（Seq、BitVal、VerifyFlag）被隔离在同步层；业务逻辑层（Customer, Employee, Conversation）只与 CRM 投影层交互。