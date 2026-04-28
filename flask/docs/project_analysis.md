# WeChat & WeWork Callback Server 项目代码逻辑分析

## 1. 项目概述

本项目是一个基于 Flask 的 Webhook 服务及后台任务处理系统，主要用于接收和处理来自企微 (WeWork) 和微信 (WeChat) 的回调事件。该系统通过聚合机器人 (Juhe Bot) 接口获取数据，并将清洗、提取后的结构化数据以及关联的媒体文件、联系人信息等持久化到 Supabase (PostgreSQL) 中，同时为下游 CRM 系统提供数据映射与投影。

项目主要分为两部分：
1. **API Server (`app.py`)**: 接收 Webhook 消息，进行初步解析、去重，并保存原始数据及事件，然后将进一步的耗时操作推入任务队列。
2. **Worker (`worker.py`)**: 后台任务进程，轮询数据库中的任务队列，执行媒体下载、语音转文字、联系人同步及 CRM 消息投影等异步任务。

---

## 2. 核心目录结构

- **根目录**: 
  - `app.py`: Flask Web 应用入口，处理路由及回调逻辑。
  - `worker.py`: 后台任务工作进程 (`MediaWorker`)，负责消费并处理各种异步任务。
  - `config.py`: 配置管理，加载环境变量并初始化 `Settings`。
- **`clients/`**: API 客户端，封装了与第三方服务的通信。
  - `cloud_api_client.py`: 封装向云端请求媒体下载的接口。
  - `guid_request_client.py`: 通用的 Juhe Bot 请求客户端。
  - `supabase_client.py`: 封装 Supabase REST API (PostgREST) 的 CRUD 客户端。
  - `wechat_api_client.py`: 封装特定的微信 API (如联系人初始化、群详情获取等)。
- **`services/`**: 业务逻辑服务层，封装了核心的业务处理逻辑。
  - `cdn_state_service.py`: 维护和刷新媒体下载所需的 CDN 状态。
  - `contact_sync_service.py`: 处理联系人和群组的同步逻辑 (增量同步和事件触发同步)。
  - `crm_wx_projection_service.py`: 将微信的原始消息投影到 CRM 会话、消息和成员表中。
  - `job_service.py`: 媒体作业 (下载、语音转译) 的队列管理及状态更新。
  - `schema_guard.py`: 数据库表校验相关。
- **`parsers/`**: 消息解析工具。
  - `xml_parser.py`: 负责解析微信消息体中的 XML 格式数据。

---

## 3. 核心业务流程

### 3.1 消息接收与路由 (`app.py`)

1. **请求入口**: 提供 `/callback/wecom` 和 `/callback/wechat` 接收 `POST` 请求。
2. **生成去重键 (Dedupe Key)**: 根据 `source` (微信/企微)、`guid`、`notify_type` 及消息的 `msg_id` / `seq` 构建唯一的去重键，防止回调重试导致的数据重复处理。
3. **入库原始数据**: 将接收到的 Payload 存入对应的 `_raw` 表中 (如 `wechat_callback_raw`)。
4. **事件分发与提取**: 
   - 判断消息类型是否为**聊天消息** (`notify_type` 为 1010/11010)。如果是，进一步解析发送者、接收者、群组等信息，并将数据写入**群聊消息表**或**私聊消息表**中。
   - 如果是**其他事件**，则写入 `_other_events` 表。
5. **入队异步任务**:
   - 对聊天消息，调用 `job_service.enqueue_jobs_for_payload` 解析消息是否包含图片/文件 (推入媒体下载任务) 或语音 (推入语音转译任务)。
   - 调用 `crm_wx_projection_service.enqueue_message_projection` 将消息推入 CRM 投影队列。
   - 若 `notify_type` 为 1200/1201 (联系人变更事件)，推入 `ContactSyncService` 的联系人同步队列。

### 3.2 异步任务处理 (`worker.py`)

`MediaWorker` 是一个常驻的后台循环进程，它依次轮询以下三个主要服务队列，并处理超时恢复机制 (Stale Job Recovery)：

1. **媒体任务 (`job_service`)**:
   - **下载媒体 (`download_media`)**: 解析 XML 获取 `file_id` 和 `aes_key`，通过 `cdn_state_service` 获取当前的 CDN Token 和状态，然后调用 `CloudApiClient` 执行下载，成功后将结果和 URL 更新回原消息记录。
   - **语音转写 (`transcribe_voice`)**: 通过 `GuidRequestClient` 上传语音任务 (`upload_voice_trans`)，并轮询转写结果 (`check_voice_trans` 和 `get_voice_trans`)，成功后将文本更新到消息记录中。
2. **联系人同步任务 (`contact_sync_service`)**:
   - **全量/增量同步 (`incremental_sync`)**: 调用 `wechat_api_client.init_contact` 抓取并比对 `contact_seq` 和 `room_seq`，分批次获取变更的联系人或群组信息并入库。
   - **事件触发同步 (`contact_change`)**: 当接收到回调事件 (如新增好友、被踢出群) 时，定向拉取特定 `username` 的资料更新。
3. **CRM 投影任务 (`crm_wx_projection_service`)**:
   - **消息投影 (`project_message`)**: 
     - 将零散的单条聊天记录组合到 `crm_wx_conversation` (会话表) 和 `crm_wx_message` (CRM 消息表)。
     - 维护 `crm_wx_conversation_member` (会话成员)。
     - 对转发到机器人 GUID 的私聊聊天记录，按“我的微信名 / 对方微信名”建立个人会话；群聊转发记录则归入群聊会话。
     - 客户和联系人关联完全依赖前端人工绑定，不做自动候选推荐。

---

## 4. 关键服务 (Services) 解析

### 4.1 ContactSyncService (联系人同步)
负责维持微信环境与本地数据库 (`wechat_contacts`, `wechat_chatrooms`, `wechat_chatroom_members`) 的一致性。
- 通过解析 `bitVal` 和 `verifyFlag` 将联系人分类 (如: 陌生人、系统号、好友、公众号、群聊)。
- 同步群聊时，采用双版本控制 (`chatroom_version` 和 `chatroom_info_version`) 来决定是否需要拉取群详情或群成员列表。
- 支持基于软删除 (`is_deleted = True`) 来标记已被删除的联系人或退出的群聊。

### 4.2 CrmWxProjectionService (CRM 数据投影)
此服务的目的是将底层的通信数据结构转化为面向业务 (CRM) 的结构。
- **会话聚合**: 基于 `guid`、消息收发方 (`my_wechat_id`, `peer_wechat_id` 或 `room_username`) 生成统一的 `conversation_key`。
- **摘要更新**: 每次投影新消息时，更新会话的最后一条消息预览 (`last_message_preview`) 和时间 (`last_message_at`)，并维护消息计数 (`message_count`)。

### 4.3 JobService (媒体任务)
- 对每条可能需要处理的媒体消息生成 `dedupe_key` 并插入任务表。
- 支持重试机制 (`attempt_count`)，采用指数退避算法计算下次重试时间 (`next_retry_at`)，最大重试次数可配置 (默认 15 次)。

---

## 5. 数据库交互与客户端

- **SupabaseClient**: 没有使用官方的 SDK，而是自行封装了基于 `requests` 的轻量级 REST 客户端。支持 `select`、`insert` (支持忽略重复)、`upsert` (处理冲突更新)、`update` 等方法。
- **网络容错**: `build_requests_session` 配置了 `urllib3.util.retry.Retry`，对 408, 429, 50x 错误自动重试。
- **并发与超时**: 设置了连接池池大小 (50) 和请求超时，确保在高并发的 Webhook 场景下应用的健壮性。

## 6. 总结

该系统是一个典型的**事件驱动架构**。通过分离接收层 (Webhook) 和处理层 (Worker)，它保证了对微信海量回调消息的高吞吐接收能力。同时，借助 Supabase 提供的冲突处理 (Upsert) 结合业务上的 `dedupe_key` 生成策略，确保了即使在上游重发或并发环境下的**幂等性** (Idempotency)。结构设计清晰，易于横向扩展和维护。
