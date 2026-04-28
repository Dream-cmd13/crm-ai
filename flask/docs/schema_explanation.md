# Flask 目录 schema.sql 数据库结构解释文档

本文档对 `flask` 目录下的核心数据库初始化脚本 [schema.sql](file:///d:/salesflow-crm-ai/flask/schema.sql) 进行详细的结构与业务逻辑解释。

## 1. 概述与 Schema 划分

该 SQL 文件主要用于初始化微信/企微机器人的底层数据表与 CRM 投影层表。整个数据库结构被明确划分在两个 `Schema` 下：
*   **`wechat_raw`**：存储所有直接来自机器人回调（个微、企微）的原始事件、原始联系人数据、媒体下载队列及处理结果。
*   **`public`**：存储经过清洗、聚合后，用于 CRM 侧正式业务展示的投影数据（会话、消息、客户绑定关系等）。

---

## 2. 核心模块详解

### 2.1 原始回调数据表 (Callback Raw)
这部分主要用于作为第一道防线，记录所有未经深入解析的原始回调 payload，确保数据不丢失。
*   **`wechat_raw.wechat_callback_raw`**：个微原始回调日志表。
*   **`wechat_raw.wework_callback_raw`**：企微原始回调日志表。
*   **核心字段**：`dedupe_key` (防重键), `guid` (机器人ID), `notify_type` (通知类型), `payload` (原始 JSON), `route_status` (路由分发状态)。

### 2.2 消息事件快照表 (Message Events)
用于结构化存储聊天消息事件，按照平台（个微/企微）和场景（群聊/私聊）拆分了四张表。
*   **`wechat_raw.wechat_group_message_events`** / **`wechat_raw.wechat_private_message_events`**：个微群聊/私聊消息表。
*   **`wechat_raw.wework_group_message_events`** / **`wechat_raw.wework_private_message_events`**：企微群聊/私聊消息表。
*   **核心设计**：
    *   消息体包含了发送者 (`sender`)、接收者 (`receiver`)、群ID (`roomid`)、消息类型 (`msg_type`、`content_type`) 等标准字段。
    *   个微表已扩展了多媒体支持字段，如 `local_media_path`、`remote_media_url`、`voice_trans_text` (语音转文字) 等。
    *   个微表也针对群名展示补充了 `sender_display_name`, `room_name` (原群名), `room_remark_name` (备注群名) 等快照字段。

### 2.3 其他事件与媒体处理队列 (Other Events & Media Jobs)
处理非消息类事件以及异步媒体任务。
*   **`wechat_raw.wechat_other_events`** / **`wechat_raw.wework_other_events`**：个微与企微的其他事件表（例如状态变更、好友添加、系统错误等）。
*   **`wechat_raw.message_media_jobs`**：媒体处理异步队列。用于管理下载图片/视频、语音转文字的重试与状态 (`pending`, `processing`, `success`, `failed`)。
*   **`wechat_raw.message_media_results`**：媒体任务执行结果表，存放 CDN 转换后的远端 URL 和本地路径。
*   **`wechat_raw.cdn_runtime_state`**：存储各个机器人 (`guid`) 的 CDN 运行时参数和过期时间。

### 2.4 联系人与群组基础表 (Contacts & Chatrooms)
存放机器人好友、所在群聊及群成员的结构化状态。
*   **`wechat_raw.wechat_sync_state`**：记录每个机器人的同步进度（`contact_seq`, `room_seq` 及各维度最后同步时间）。
*   **`wechat_raw.wechat_contacts`**：好友联系人表，存储昵称、备注、拼音、头像等。
*   **`wechat_raw.wechat_chatrooms`**：群聊表。区分了 `room_name` (群原名) 和 `room_remark_name` (备注群名)。
*   **`wechat_raw.wechat_chatroom_members`**：群成员表。记录每个群中所有成员的身份、状态、邀请人等。

### 2.5 异步同步队列 (Sync Queue)
*   **`wechat_raw.wechat_contact_sync_jobs`**：联系人同步任务队列表。处理如 `incremental_sync` (增量同步), `contact_change` (联系人变更), `room_sync` (群同步) 等任务，带有重试机制。

### 2.6 CRM 业务投影层 (CRM Projection Layer)
位于 `public` Schema 下，是将底层的杂乱事件清洗为 CRM 系统中清晰可用的“会话 (Conversation)”与“消息 (Message)”体系。
*   **`public.crm_wx_conversation`**：CRM 侧会话聚合表（群聊或单聊）。包含了与 CRM 实体的关联字段 (`customer_id`, `primary_contact_id`, `owner_employee_id`)，以及聚合后的 `conversation_name` (展示名) 和私聊场景使用的 `my_wechat_name` / `peer_wechat_name`。
*   **`public.crm_wx_message`**：CRM 侧展示消息表。直接绑定到 `conversation_id`。
*   **`public.crm_wx_conversation_member`**：会话成员表，标记成员是否为内部员工或外部客户。
*   **`public.crm_wx_projection_jobs`**：投影任务队列表。将底层事件表（如 `wechat_group_message_events`）转换为 `crm_wx_message` 的异步队列。

---

## 3. 设计亮点与关键机制

1. **防重机制 (Deduplication)**
   每张事件表和队列任务表都包含强制性的 `dedupe_key` 并设立了唯一索引 (Unique Index)，以防机器人的网络重试导致数据重复插入。

2. **异步化处理 (Async Queue Driven)**
   从媒体文件下载 (`message_media_jobs`)，到联系人同步 (`wechat_contact_sync_jobs`)，再到消息推送到 CRM 投影 (`crm_wx_projection_jobs`)，大量采用轮询/异步队列表架构。包含 `status`、`attempt_count` 和 `next_retry_at` 等标准流转字段，确保高可用与幂等性。

3. **语义分离的群名设计**
   在 `wechat_chatrooms`、`wechat_group_message_events` 及 CRM 投影层中，显式分离了 `room_name`（群原名）和 `room_remark_name`（机器人备注群名），使得业务显示层可以通过 `conversation_name` 进行灵活的优先级回退策略（备注优先）。

4. **软删除与快照**
   联系人和群组引入了 `is_deleted` 软删除字段和 `raw_json` 快照，保留完整原始数据追溯能力。
