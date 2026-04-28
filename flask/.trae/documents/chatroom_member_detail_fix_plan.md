# 修复计划：`wechat_chatroom_members` 仅落单人成员的问题

## Summary

目标是修复 `wechat_raw.wechat_chatroom_members` 当前“很多群只落 1 个成员”的问题，使群成员表能够与 `/room/get_chatroom_member_detail` 的真实返回一致，避免出现 19 个群只有 19 条成员数据的异常现象。

本次修复聚焦两类问题：
- `/room/get_chatroom_member_detail` 响应中的成员列表解析是否被当前通用提取器误判，导致只提取到 1 个成员。
- `ContactSyncService.sync_chatroom_details_and_members()` 是否仅依赖 `members` 明细写库，而没有对 `allMemberUserNameList` 做必要的补齐与一致性保护。

## Current State Analysis

### 1. 表结构本身支持“一群多人”

- `wechat_raw.wechat_chatroom_members` 的主键是 `(guid, room_username, username)`，不是 `room_username` 单列唯一。
- 这说明当前数据库设计明确支持“同一个群对应多名成员”，不是“一群只能一人”。
- 相关定义见 [schema.sql](file:///d:/salesflow-crm-ai/flask/schema.sql#L538-L555)。

### 2. 群成员表的主写入入口只有一处

- 群成员写入发生在 [contact_sync_service.py](file:///d:/salesflow-crm-ai/flask/services/contact_sync_service.py#L993-L1098) 的 `sync_chatroom_details_and_members()`。
- 当 `current_version != old_version` 时，代码会调用 `self.wechat_client.get_chatroom_member_detail(guid, room_username, old_member_version)`。
- 然后只遍历 `member_result["members"]` 执行 `upsert` 写入 `wechat_raw.wechat_chatroom_members`。

### 3. 当前解析器对成员列表的提取过于宽松

- `WechatApiClient.get_chatroom_member_detail()` 使用 `_extract_records()` 从响应中提取成员列表，位置见 [wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py#L119-L167)。
- `_extract_records()` 在未命中列表时，会把某个“看起来像记录”的 `dict` 直接当成单条记录返回，位置见 [wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py#L215-L233)。
- `_looks_like_record()` 的判断条件很宽，只要包含 `userName`、`nickname`、`chatRoomOwner` 等字段就可能命中，位置见 [wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py#L358-L374)。
- 对于 `/room/get_chatroom_member_detail` 这种返回里同时存在 `chatRoomOwner`、`newChatroomData`、`chatRoomMember` 的结构，这种兜底逻辑很容易把整个响应树中的一个 `dict` 误判成单个成员，进而导致 `members` 只剩 1 个元素。

### 4. 当前逻辑存在“只写 members，不补齐 username list”的缺口

- `get_chatroom_member_detail()` 同时返回：
  - `members`
  - `all_member_usernames`
  - `all_member_count`
- 但是在 [contact_sync_service.py](file:///d:/salesflow-crm-ai/flask/services/contact_sync_service.py#L1031-L1098) 中：
  - 只有 `members` 被用于 `upsert` 成员表；
  - `all_member_usernames` 只被用于：
    - `_mark_missing_chatroom_members_deleted()` 删除缺失成员；
    - 更新 `wechat_chatrooms.member_count` 和 `all_member_count`。
- 这意味着：即使接口已经告诉系统“群里有 33 个人”，如果 `members` 实际只解析出 1 人，表里仍然只会写 1 行，但人数却可能被更新为 33。

### 5. 消息到达并不会直接写 `wechat_chatroom_members`

- 群消息进入后，`route_payload()` 只会调用 `enqueue_room_sync(guid, roomid)`，见 [app.py](file:///d:/salesflow-crm-ai/flask/app.py#L453-L489)。
- 后续由 worker 消费 `room_sync` 任务，走 `sync_single_room()` 再调用 `sync_chatroom_details_and_members()`。
- 也就是说，消息触发的是“异步群同步”，而不是“收到谁发言就直接把谁写进 `wechat_chatroom_members`”。
- 因此“同群两个人都发了消息，但后发的人没进群成员表”是当前实现可以出现的现象。

## Proposed Changes

### 1. 为 `/room/get_chatroom_member_detail` 改成专用解析逻辑

修改文件：[wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py)

修改内容：
- 不再直接复用通用 `_extract_records()` 解析 `/room/get_chatroom_member_detail` 的成员列表。
- 为该接口增加“专用成员提取逻辑”，优先严格按接口结构提取：
  - `data["newChatroomData"]["chatRoomMember"]`
  - 兼容少量命名变体，但要求最终命中的值必须是 `list`
- 如果命中的不是 `list`，不得兜底成单条成员记录。

修改原因：
- 避免当前 `_extract_records()` 将复杂响应中的单个 `dict` 误判成一条成员，从而导致整群只有 1 条成员数据。

实现要求：
- `members` 的来源必须与接口返回结构一一对应。
- 对这个接口，不允许使用“像记录就返回 `[data]`”的宽松兜底。

### 2. 给群成员接口增加一致性校验与告警

修改文件：[wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py)

修改内容：
- 在 `get_chatroom_member_detail()` 返回前增加校验：
  - 如果 `all_member_count > 1` 或 `all_member_usernames` 长度明显大于 `members` 长度；
  - 或者 `memberCount/allMemberCount` 与 `members` 解析结果明显不符；
  - 记录 warning 日志，输出 `guid`、`room_username`、`member_count`、`all_member_count`、`len(members)`。

修改原因：
- 避免再次出现“解析结果只有 1 人，但接口实际返回 33 人”却无日志痕迹的问题。

### 3. 在同步服务中补齐 `allMemberUserNameList` 中缺失的成员占位记录

修改文件：[contact_sync_service.py](file:///d:/salesflow-crm-ai/flask/services/contact_sync_service.py)

修改内容：
- 在遍历 `members` upsert 完成后，收集已写入的 `username` 集合。
- 对 `all_member_usernames` 中存在、但本次 `members` 明细未返回的成员，补写一条最小占位记录到 `wechat_raw.wechat_chatroom_members`，字段至少包括：
  - `guid`
  - `room_username`
  - `room_name`
  - `room_remark_name`
  - `username`
  - `is_deleted = False`
  - `last_synced_at`
  - `updated_at`
- 其他字段如 `nickname`、`display_name`、`avatar_small`、`avatar_big`、`member_flag`、`status`、`join_scene_xml`、`raw_json` 保持 `NULL`。

修改原因：
- 既然接口已经明确返回该成员属于该群，就应保证成员表至少有这条成员身份记录。
- 这样即使某个版本的 API 未返回该成员完整明细，也不会出现“群里明明有 33 个人，成员表却只有 1 条”的严重失真。

### 4. 对删除逻辑增加数据完整性保护

修改文件：[contact_sync_service.py](file:///d:/salesflow-crm-ai/flask/services/contact_sync_service.py)

修改内容：
- 在调用 `_mark_missing_chatroom_members_deleted()` 前增加保护条件。
- 只有在 `all_member_usernames` 非空，且与本次接口返回的群总人数信息大致一致时，才允许执行缺失成员软删除。
- 如果本次响应明显不完整，跳过删除并打 warning。

修改原因：
- 避免在“解析失败 / 接口只返回部分数据”的情况下，把原有正常成员误删。

### 5. 核对 `version` 的使用语义并固定首次全量同步策略

修改文件：
- [contact_sync_service.py](file:///d:/salesflow-crm-ai/flask/services/contact_sync_service.py)
- [wechat_api_client.py](file:///d:/salesflow-crm-ai/flask/clients/wechat_api_client.py)

修改内容：
- 明确 `old_member_version` 的语义是否用于增量拉取。
- 若当前 `room_sync` 任务希望拿到整群完整成员，应确保首次群同步或重建时以 `version = 0` 拉全量。
- 若保留增量策略，则必须保证增量结果不会破坏成员表完整性。

修改原因：
- 当前触发成员拉取的条件比较的是 `chatroom_version`，请求时传的是 `member_version`，两者语义不清晰。
- 需要避免“用错误版本游标去请求成员详情，导致只拿到部分成员”的风险。

## Assumptions & Decisions

- 假设 `/room/get_chatroom_member_detail` 的真实权威成员集合至少包含 `allMemberUserNameList`，即便 `chatRoomMember` 明细存在缺失，也可以将 `allMemberUserNameList` 作为成员存在性的可信来源。
- 决定将 `wechat_raw.wechat_chatroom_members` 定位为“群成员完整快照表”，而不是“仅保存接口本次返回的明细表”。
- 决定优先修复“解析错误导致只落 1 人”的问题，同时增加“缺失明细占位补齐”，确保成员表完整性。
- 不修改现有表主键，因为当前表结构已经正确支持一群多人。
- 保持用户此前要求：成员字段仍然按接口字段一对一写入；对于补齐出来的占位成员，不做额外推断，不从别处补 nickname/display_name/avatar。

## Verification Steps

### 1. 解析结果验证

- 用用户提供的 `/room/get_chatroom_member_detail` 响应样例做本地验证：
  - `members` 应解析出完整的 `chatRoomMember` 列表，而不是 1 条。
  - `all_member_usernames` 应解析出 33 个成员用户名。

### 2. 落库结果验证

- 对同一个测试群执行一次 `sync_single_room()` 或等价同步流程后：
  - `wechat_raw.wechat_chatroom_members` 中该群的记录数应接近或等于 `allMemberUserNameList` 长度。
  - 不能再出现“群人数 33，但成员表只有 1 行”的情况。

### 3. 字段完整性验证

- 对接口中存在 `displayName` 的成员：
  - `display_name` 应正确落库。
- 对接口中没有 `displayName` 的成员：
  - `display_name` 应保持 `NULL`。
- 对仅从 `allMemberUserNameList` 补齐的成员：
  - `username` 必须存在；
  - 非接口明细未提供字段应保持 `NULL`。

### 4. 删除保护验证

- 构造“接口返回不完整”的场景，确认不会错误执行 `_mark_missing_chatroom_members_deleted()`。
- 构造“接口返回完整列表”的场景，确认缺失成员仍可被正常软删除。

### 5. 回归验证

- 验证群消息入库后，`room_sync` 任务仍能正常触发。
- 验证 `crm_wx_projection_service` 对 `wechat_chatroom_members` 的读取行为不受破坏，尤其是 [crm_wx_projection_service.py](file:///d:/salesflow-crm-ai/flask/services/crm_wx_projection_service.py#L588-L706) 依赖的成员显示名回填链路。
