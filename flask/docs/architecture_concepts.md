# 架构概念解析：投影、快照与轮询

在现代软件架构中，投影（Projection）、快照（Snapshot）和轮询（Polling）是三个非常重要且常用的概念。结合当前项目的实际代码实现，以下是这三个概念的详细解析。

---

## 1. 投影 (Projection)

### 概念定义
投影通常指的是将**底层的数据模型**（或原始事件数据）转化为**满足特定业务场景需求的数据视图**的过程。在事件驱动架构（如 CQRS/Event Sourcing）中，"读模型"就是通过对底层"事件流"的投影得到的。

**通俗理解**：就像用手电筒照一个复杂的 3D 物品（底层数据），投射到墙上的影子（2D视图）只保留了墙面（特定业务）关心的轮廓，忽略了内部复杂的结构。

### 本项目中的应用
在本项目中，`services/crm_wx_projection_service.py` 专门负责投影工作。

**具体逻辑**：
1. **数据源（底层数据）**：底层接收到的原始微信消息事件（存储在 `wechat_private_message_events` 和 `wechat_group_message_events` 表中）。
2. **投影目标（业务视图）**：业务 CRM 系统真正关心的数据结构。
   - `crm_wx_conversation`（会话表）：提取对话双方或群组信息。
   - `crm_wx_message`（消息表）：将原始消息内容、类型、发送时间提取出来。
   - `crm_wx_conversation_member`（成员表）：解析并提取群成员信息。
3. **实现方式**：
   `app.py` 收到消息后，会将原始消息入库，同时把任务塞进 `crm_wx_projection_jobs` 队列。后台 Worker 会消费这个队列，调用 `project_message` 方法。该方法会根据 `guid`、收发件人 ID 等拼装成结构化的 `message_context`，并更新 CRM 的会话、消息及最后一条消息的预览摘要。这就完成了一次从"通信层数据"向"业务层数据"的**投影**。

---

## 2. 快照 (Snapshot)

### 概念定义
快照是指在**某一特定时间点**，系统或数据的**完整状态副本**。它的核心作用是记录历史状态，用于回溯、版本对比、数据恢复或减少计算量（不用每次都从头重演事件流）。

**通俗理解**：就像给快速运动的物体拍了一张照片，定格了按下快门那一瞬间的所有状态。

### 本项目中的应用
本项目在联系人和群聊同步中使用了**快照思想**。虽然代码里不一定有个叫 `snapshot` 的类，但逻辑本质是快照模式。

**具体逻辑**：
1. **状态快照落盘**：在 `services/contact_sync_service.py` 中，联系人或群组的每次全量/增量同步（如 `batch_get_contact_brief_info`），系统会把接口返回的那一瞬间的联系人 JSON 数据完整地存入数据库的 `raw_json` 字段中。
   ```python
   # 典型代码片段
   self.supabase.upsert(
       "wechat_chatrooms",
       {
           # ...提取的结构化字段...
           "chatroom_version": current_version,
           "raw_json": contact, # 👈 这里就是快照数据
           "updated_at": now_iso,
       }
   )
   ```
2. **版本比对 (Version Control)**：项目利用微信接口返回的 `chatroom_version` 和 `chatroom_info_version` 来比对本地数据库中的历史快照。如果发现当前接口版本号与本地快照版本号不一致，说明发生了变化，才会触发下一次拉取动作。这种设计极大地减少了不必要的网络请求。

*注：在你的 `supabase_tables.md` 中，也提到了 `crm_ontology_flow_publish_history` 表有 `snapshot_json` 字段，用于记录工作流发布时的快照。*

---

## 3. 轮询 (Polling)

### 概念定义
轮询是一种通信或任务调度机制。客户端（或工作进程）以**固定的时间间隔**不断地向服务器（或任务队列）发送请求，询问“有新数据吗？”或者“任务处理完了吗？”。

**通俗理解**：就像你在等外卖，每隔 5 分钟就打开 App 看一下骑手到哪了，这就是轮询。

### 本项目中的应用
本项目大量使用了轮询机制，主要体现在两个维度：**队列轮询**和**状态轮询**。

**具体逻辑**：
1. **任务队列轮询 (Queue Polling)**：
   在 `worker.py` 中，`MediaWorker` 是一个死循环的常驻进程。它不断地通过 `claim_next_job()` 向数据库（Supabase）发起查询，检查是否有 `status='pending'` 的新任务。
   ```python
   while True:
       # ...
       job = self.job_service.claim_next_job()
       if job:
           self.process_job(job)
           time.sleep(self.settings.worker_task_sleep_seconds) # 短轮询间隔
           continue
       # ... 其他任务的 claim
       time.sleep(self.settings.worker_idle_sleep_seconds) # 闲置时的长轮询间隔
   ```
2. **异步结果状态轮询 (State Polling)**：
   在处理语音转写任务（`_handle_transcribe_voice`）时。调用转写接口是异步的，提交任务后不会立刻返回结果。代码通过 `for _ in range(10):` 循环调用 `/msg/check_voice_trans` 接口：
   - 询问接口：“转译好了吗？”
   - 如果接口返回未完成，就 `time.sleep(interval_seconds)` 等待一会儿，然后继续问。
   - 直到接口返回 `done` 或 `success`，再去拿真正的文本。这就是典型的**客户端状态轮询**。

---

## 4. 幂等性 (Idempotency)

### 概念定义
幂等性是指一个操作执行一次和执行多次所产生的影响是相同的。在分布式系统和 Webhook 接收端中，这是一个极其重要的设计，用于防止网络重试导致的数据重复或业务逻辑重复执行。

### 本项目中的应用
本项目在 `app.py` 中深度应用了幂等性设计，确保微信服务器重发回调时系统不会错乱。

**具体逻辑**：
1. **生成去重键 (Dedupe Key)**：`build_dedupe_key` 方法根据消息的 `guid`、`notify_type` 以及 `msg_id`（或 `seq`）生成一个全局唯一的字符串。
2. **冲突忽略 (Upsert on Conflict)**：在将原始 payload 或结构化消息插入数据库时，使用的是 `supabase.upsert(..., on_conflict="dedupe_key")`。如果相同的消息被微信重发，数据库层面会基于 `dedupe_key` 的唯一性约束直接覆盖（或忽略），从而保证了数据和后续任务的幂等。

---

## 5. 异步事件驱动 / 生产消费者模式 (Event-Driven / Producer-Consumer)

### 概念定义
这是将系统的请求接收（生产）与请求处理（消费）解耦的一种架构模式。通常通过消息队列（Message Queue）或任务表作为中间缓冲。

### 本项目中的应用
项目明确划分了 API 接收层（`app.py`）和后台处理层（`worker.py`）。

**具体逻辑**：
1. **生产者 (app.py)**：负责以最快的速度接收微信的回调 POST 请求，做简单的校验和落库（入库到 `_events` 表），然后将繁重的任务（如下载媒体、同步联系人）作为“作业（Job）”插入到对应的任务表（如 `job_queue`, `crm_wx_projection_jobs`）中，立刻返回 200 OK。
2. **消费者 (worker.py)**：常驻内存的循环进程，通过轮询任务表，从队列中取出任务慢慢消化处理。这保证了 Web 服务器的响应速度，防止因处理图片或下载文件而耗尽 HTTP 连接池。

---

## 6. 指数退避重试 (Exponential Backoff with Retry)

### 概念定义
在网络请求或后台任务失败时，系统不应该立刻或以固定频率疯狂重试（这可能导致目标服务器雪崩），而是应该延长每次重试之间的等待时间（如 1秒、2秒、4秒、8秒...），这种策略被称为指数退避。

### 本项目中的应用
本项目在 `job_service.py` 和各个 Worker 的失败处理逻辑中实现了该机制。

**具体逻辑**：
- **失败计数与延迟时间**：任务表中维护了 `attempt_count`（尝试次数）和 `next_retry_at`（下次重试时间）。
- **计算逻辑**：当一个任务（如媒体下载或 CRM 投影）执行失败抛出异常时，代码会捕获异常，将 `attempt_count` + 1，并计算 `next_retry_at = now + 2 ^ attempt_count * base_interval`。这意味着随着失败次数的增加，任务会被越来越往后推迟，直到达到最大重试次数（如 15 次）才最终标记为 `failed` 或放入死信队列 (Dead Letter Queue)。

---

## 总结

| 概念 | 核心作用 | 在本项目中的具体体现 |
| :--- | :--- | :--- |
| **投影 (Projection)** | 转换数据视图，隔离通信层与业务层 | `CrmWxProjectionService` 将原始 Webhook 消息转化为 CRM 的会话和消息模型。 |
| **快照 (Snapshot)** | 记录特定时刻的状态副本，用于比对或追溯 | `ContactSyncService` 中保存联系人的 `raw_json` 以及依赖 `version` 进行版本比对。 |
| **轮询 (Polling)** | 定期检查任务或状态是否就绪 | `worker.py` 循环拉取待处理任务，以及语音转写时循环调用检查接口直到完成。 |
| **幂等性 (Idempotency)** | 保证重复请求不会导致重复处理 | `build_dedupe_key` 配合数据库的 Upsert 机制，防止微信重复推送造成数据污染。 |
| **生产消费者模式** | 解耦接收与处理，削峰填谷 | `app.py` 快速接收并产生任务，`worker.py` 后台异步消费执行下载、同步等耗时任务。 |
| **指数退避重试** | 优雅地处理暂时性网络或服务故障 | `job_service` 在任务失败时，动态计算 `next_retry_at`，随失败次数递增等待时间。 |
