# 微信联系人与群组同步字段扩展分析方案

## 1. 目标与背景
根据用户提供的多个聚合 API 接口（`/contact/init_contact`、`/contact/batch_get_contact_brief_info`、`/contact/get_contact`、`/room/get_chatroom_detail`、`/room/get_chatroom_member_detail`）的返回 JSON，当前系统数据库在存储微信联系人和群组信息时，虽然保留了 `raw_json`，但缺少了一些对业务分析和展示非常有用的独立字段。本方案旨在分析这些缺失的字段，并提出相应的数据库表结构和同步代码调整方案。

## 2. 现状分析
通过审查 `schema.sql` 和 `services/contact_sync_service.py`：

- **`wechat_contacts`**：
  - **已有字段**：`guid, username, nickname, alias, avatar, type, gender, verify_flag, bit_val, remark, is_deleted, last_synced_at`
  - **缺失的高价值字段**：地理位置（`province`, `city`）、个性签名（`signature`）、好友来源（`source`，如扫码、群聊添加等）、添加时间（`createTime`）。
- **`wechat_chatrooms`**：
  - **已有字段**：`guid, room_username, nickname, avatar, chatroom_version, chatroom_info_version, is_deleted, last_synced_at`
  - **缺失的高价值字段**：群主（`chatRoomOwner`）、群成员总数（`allMemberCount` 或 `memberCount`）、管理员数量（`adminCount`）。
- **`wechat_chatroom_members`**：
  - **已有字段**：`guid, room_username, username, nickname, display_name, inviter_username, is_deleted, last_synced_at`
  - **缺失的高价值字段**：群成员头像（`smallHeadImgUrl`/`bigHeadImgUrl`，目前群成员表没有独立头像字段）、群成员标志位（`chatroomMemberFlag`，区分普通成员/群主/管理员）、状态（`status`）。

## 3. 拟定调整方案

### 3.1 数据库结构调整 (SQL Migrations)
建议新建一个迁移脚本（如 `20260421180000_add_wechat_sync_fields.sql`），执行以下修改：

```sql
-- 1. wechat_contacts 增加扩展字段
ALTER TABLE public.wechat_contacts
    ADD COLUMN IF NOT EXISTS province text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS signature text,
    ADD COLUMN IF NOT EXISTS source integer,
    ADD COLUMN IF NOT EXISTS create_time bigint;

-- 2. wechat_chatrooms 增加扩展字段
ALTER TABLE public.wechat_chatrooms
    ADD COLUMN IF NOT EXISTS owner_username text,
    ADD COLUMN IF NOT EXISTS member_count integer,
    ADD COLUMN IF NOT EXISTS admin_count integer;

-- 3. wechat_chatroom_members 增加扩展字段
ALTER TABLE public.wechat_chatroom_members
    ADD COLUMN IF NOT EXISTS avatar text,
    ADD COLUMN IF NOT EXISTS member_flag integer,
    ADD COLUMN IF NOT EXISTS status integer;
```

### 3.2 同步代码调整 (`services/contact_sync_service.py`)

- **联系人数据提取 (`_save_single_contact`)**：
  - 从 `contact` 字典中提取 `province`, `city`, `signature`, `source` (int), `createTime` (int)。
  - 在更新 `wechat_contacts` 的 `upsert` 操作中加入这些字段。
  
- **群成员数据提取 (`sync_chatroom_details_and_members`)**：
  - 针对 `members` 列表循环，新增提取成员头像（复用 `_extract_contact_avatar`）、`chatroomMemberFlag`、`status`，加入到 `wechat_chatroom_members` 的 `upsert` 逻辑中。
  - 从 `member_result.get("raw")` 提取群级别的数据：`chatRoomOwner`、`allMemberCount` (如果不存在则尝试从 `newChatroomData.memberCount` 获取)、`adminCount`。
  - 将这些提取到的群数据合并更新到 `wechat_chatrooms` 的 `upsert` 中。

- **解析辅助方法扩充 (`_pick_contact_value`)**：
  - 确保能够支持驼峰命名和下划线命名的兼容提取，比如 `createTime`、`chatRoomOwner` 等。

## 4. 结论
通过上述调整，可以利用现有的同步任务（`incremental_sync` 和 `room_sync`），自动将更丰富的联系人地理/来源信息、群主身份、群人数等关键业务数据抽取到独立的列中，从而极大方便后续 CRM 系统中的数据过滤、分析与视图展示。由于 `raw_json` 中已经存储了这些数据，只需要改表结构和代码映射，不影响历史数据的完整性。