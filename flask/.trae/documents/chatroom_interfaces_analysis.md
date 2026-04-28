# 群聊接口调用与表结构分析报告

## 1. 分析结论摘要 (Summary)
- **接口调用情况**：目前 Flask 系统中**有调用**这两个接口。
- **表结构正确性**：群成员表结构**完全正确且契合**；群聊主表结构**基本正确，但缺失了群公告内容相关的字段**。

## 2. 接口调用情况分析 (Current State Analysis)
经过对代码库的检索与分析，这两个接口均已封装并被核心同步逻辑调用：

1. **`/room/get_chatroom_detail`**
   - **封装位置**：`clients/wechat_api_client.py` 的 `get_chatroom_detail` 方法。
   - **调用位置**：`services/contact_sync_service.py` 的 `_fetch_room_profile` 方法。
   - **调用逻辑**：当系统尝试通过常规 `get_contact` 接口获取群信息失败时，会调用此接口作为**兜底方案**来获取群详情。

2. **`/room/get_chatroom_member_detail`**
   - **封装位置**：`clients/wechat_api_client.py` 的 `get_chatroom_member_detail` 方法。
   - **调用位置**：`services/contact_sync_service.py` 的 `sync_chatroom_details_and_members` 方法。
   - **调用逻辑**：系统会对比群聊当前的 `member_version` 和数据库中旧的 `member_version`，当版本号发生变化时，就会调用此接口拉取最新的群成员明细及 `allMemberUserNameList`，实现群成员的增量同步。

## 3. 表结构正确性分析 (Schema Analysis)

对比您提供的 JSON 示例与系统中的 `schema.sql`，分析如下：

### ✅ 群成员表 (`wechat_raw.wechat_chatroom_members`)：结构非常完善且正确
您提供的 JSON 中的字段在数据库中均有精准对应的列，且解析逻辑已实现：
- `userName` -> `username`
- `nickName` -> `nickname`
- `displayName` -> `display_name` (群昵称/名片)
- `inviterUserName` -> `inviter_username` (邀请人)
- `bigHeadImgUrl` / `smallHeadImgUrl` -> `avatar_big` / `avatar_small`
- `chatroomMemberFlag` -> `member_flag`
- `status` -> `status`
- `addChatRoomSceneNewXml` -> `join_scene_xml` (入群场景XML，记录了邀请信息)

### ⚠️ 群聊主表 (`wechat_raw.wechat_chatrooms`)：存在字段遗漏
大部分核心字段（如版本号、状态、业务类型）均已正确映射：
- `chatRoomInfoVersion` -> `chatroom_info_version`
- `chatRoomStatus` -> `chatroom_status`
- `chatRoomBusinessType` -> `business_type`
- `announcementPublishTime` -> `announcement_publish_time`

**遗漏点**：系统虽然记录了公告的**发布时间** (`announcement_publish_time`)，但**没有建立字段来存储公告的具体内容**。API 响应中包含以下三个关键公告字段，目前在表中缺失：
1. `announcement`：群公告的纯文本内容。
2. `announcementEditor`：发布群公告的微信 ID。
3. `xmlAnnouncement`：群公告的 XML 富文本结构（包含文件/图片链接等）。

## 4. 建议的修改计划 (Proposed Changes)

如果您希望在 CRM 系统中记录和展示群公告信息，建议进行以下优化：

1. **修改表结构 (`schema.sql`)**：
   在 `wechat_raw.wechat_chatrooms` 表中增加以下三个字段：
   ```sql
   announcement text,
   announcement_editor text,
   xml_announcement text,
   ```

2. **更新同步逻辑 (`contact_sync_service.py`)**：
   在 `_build_chatroom_upsert_payload` 方法中，增加对上述三个字段的提取：
   ```python
   announcement = self._extract_chatroom_text(raw_source, "announcement")
   announcement_editor = self._extract_chatroom_text(raw_source, "announcementEditor")
   xml_announcement = self._extract_chatroom_text(raw_source, "xmlAnnouncement")
   # 并将它们加入到 payload 中
   ```

如果您确认需要补全这些群公告字段，请告知我，我将在执行阶段为您完成代码和 Schema 的修改。