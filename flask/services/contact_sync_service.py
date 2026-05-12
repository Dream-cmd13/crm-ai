import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from clients.supabase_client import SupabaseClient
from clients.wechat_api_client import WechatApiClient
from config import Settings
from services.schema_guard import assert_tables_exist


logger = logging.getLogger(__name__)

SYNC_REQUIRED_TABLES = (
    "wechat_raw.wechat_sync_state",
    "wechat_raw.wechat_contacts",
    "wechat_raw.wechat_chatrooms",
    "wechat_raw.wechat_chatroom_members",
    "wechat_raw.wechat_contact_sync_jobs",
)

SYSTEM_CONTACTS = [
    "qmessage",
    "masssend",
    "fmessage",
    "floatbottle",
    "filehelper",
    "weixin",
    "tmessage",
    "medianote",
    "qqmail",
    "newsapp",
    "blogapp",
    "notifymessage",
    "qqsafe",
    "weibo",
]


class ContactType:
    Stranger = 0
    System = 1
    Friend = 2
    Mp = 3
    ChatRoom = 4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except Exception:
        return None


def build_retry_at(attempt_count: int) -> str:
    delay_minutes = min(2 ** attempt_count, 720)
    return (datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)).isoformat()


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value in (None, ""):
            return default
        return int(value)
    except Exception:
        return default


def safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def get_contact_type(username: str, bit_val: int, verify_flag: int) -> int:
    if "@chatroom" in username:
        return ContactType.ChatRoom
    if verify_flag != 0:
        return ContactType.Mp
    if username in SYSTEM_CONTACTS:
        return ContactType.System
    if (bit_val & 1) == 1:
        return ContactType.Friend
    return ContactType.Stranger


class ContactSyncService:
    def __init__(self, supabase: SupabaseClient, wechat_client: WechatApiClient, settings: Settings):
        self.supabase = supabase
        self.wechat_client = wechat_client
        self.settings = settings
        self._validated_table_groups: set[tuple[str, ...]] = set()

    def enqueue_incremental_sync(self, guid: str) -> None:
        now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
        self._enqueue_job(
            {
                "dedupe_key": f"incremental_sync:{guid}:{now}",
                "job_type": "incremental_sync",
                "guid": guid,
                "username": None,
                "room_username": None,
                "notify_type": None,
                "payload": None,
            }
        )

    def enqueue_room_sync(self, guid: str, room_username: str) -> None:
        clean_guid = safe_str(guid)
        clean_room_username = safe_str(room_username)
        if not clean_guid or not clean_room_username:
            return
        now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
        self._enqueue_job(
            {
                "dedupe_key": f"room_sync:{clean_guid}:{clean_room_username}:{now}",
                "job_type": "room_sync",
                "guid": clean_guid,
                "username": None,
                "room_username": clean_room_username,
                "notify_type": None,
                "payload": None,
            }
        )

    def enqueue_contact_change_event(self, guid: str, notify_type: int, payload: dict[str, Any], dedupe_key: str) -> None:
        username = self._extract_changed_username(payload)
        room_username = username if "@chatroom" in username else safe_str(payload.get("data", {}).get("room_username"))
        self._enqueue_job(
            {
                "dedupe_key": f"contact_change:{guid}:{notify_type}:{dedupe_key}",
                "job_type": "contact_change",
                "guid": guid,
                "username": username or None,
                "room_username": room_username or None,
                "notify_type": notify_type,
                "payload": payload,
            }
        )

    def claim_next_job(self) -> dict[str, Any] | None:
        self._ensure_tables(SYNC_REQUIRED_TABLES)
        now_iso = utc_now_iso()
        candidate_filter = f"(status.eq.pending,and(status.eq.retrying,next_retry_at.lte.{now_iso}))"
        rows = self.supabase.select(
            "wechat_raw.wechat_contact_sync_jobs",
            filters={"or": candidate_filter},
            order="created_at.asc",
            limit=1,
        )
        if not rows:
            return None

        job = rows[0]
        claimed_rows = self.supabase.update(
            "wechat_raw.wechat_contact_sync_jobs",
            {
                "status": "processing",
                "processing_started_at": now_iso,
                "updated_at": now_iso,
                "last_error": None,
            },
            filters={"id": f"eq.{job['id']}", "or": candidate_filter},
            returning="representation",
        )
        if claimed_rows:
            return claimed_rows[0]

        return self.supabase.select_one(
            "wechat_raw.wechat_contact_sync_jobs",
            filters={"id": f"eq.{job['id']}", "status": "eq.processing"},
        )

    def recover_stale_jobs(self) -> int:
        self._ensure_tables(SYNC_REQUIRED_TABLES)
        rows = self.supabase.select(
            "wechat_raw.wechat_contact_sync_jobs",
            filters={"status": "eq.processing"},
            order="processing_started_at.asc",
            limit=200,
        )
        if not rows:
            return 0

        recovered = 0
        now = datetime.now(timezone.utc)
        for row in rows:
            started_at = parse_iso_datetime(row.get("processing_started_at"))
            if started_at is not None:
                age_seconds = (now - started_at).total_seconds()
                if age_seconds < self.settings.worker_stale_processing_seconds:
                    continue
            self.supabase.update(
                "wechat_raw.wechat_contact_sync_jobs",
                {
                    "status": "retrying",
                    "next_retry_at": utc_now_iso(),
                    "last_error": "auto-recovered from stale processing",
                    "updated_at": utc_now_iso(),
                    "processing_started_at": None,
                },
                filters={"id": f"eq.{row['id']}", "status": "eq.processing"},
            )
            recovered += 1
        return recovered

    def process_job(self, job: dict[str, Any]) -> None:
        try:
            job_type = job.get("job_type")
            if job_type == "incremental_sync":
                self.sync_contacts_incremental(str(job.get("guid") or ""))
            elif job_type == "room_sync":
                self.sync_single_room(str(job.get("guid") or ""), safe_str(job.get("room_username")))
            elif job_type == "contact_change":
                self.handle_contact_change_event(
                    str(job.get("guid") or ""),
                    safe_int(job.get("notify_type")),
                    job.get("payload") or {},
                )
            else:
                raise RuntimeError(f"unsupported contact sync job_type={job_type}")
            self._complete_job(job)
        except Exception as exc:
            logger.exception("contact sync job failed id=%s job_type=%s", job.get("id"), job.get("job_type"))
            self._mark_retry_or_failed(job, exc)

    def sync_contacts_incremental(self, guid: str) -> None:
        if not guid:
            raise RuntimeError("guid is required for contact sync")
        self._ensure_tables(SYNC_REQUIRED_TABLES)

        state = self.get_sync_state(guid)
        start_contact_seq = safe_int(state.get("contact_seq"))
        start_room_seq = safe_int(state.get("room_seq"))
        current_contact_seq = start_contact_seq
        current_room_seq = start_room_seq
        sync_kind = "full" if start_contact_seq == 0 and start_room_seq == 0 else "incremental"

        for round_index in range(1, 11):
            result = self.wechat_client.init_contact(guid, current_contact_seq, current_room_seq)
            usernames = result.get("usernames") or []
            new_contact_seq = safe_int(result.get("contact_seq"), default=current_contact_seq)
            new_room_seq = safe_int(result.get("room_seq"), default=current_room_seq)
            continue_flag = safe_int(result.get("continue_flag"))

            if usernames:
                logger.info(
                    "contact init parsed guid=%s round=%s usernames=%s contact_seq=%s->%s room_seq=%s->%s continue_flag=%s",
                    guid,
                    round_index,
                    len(usernames),
                    current_contact_seq,
                    new_contact_seq,
                    current_room_seq,
                    new_room_seq,
                    continue_flag,
                )
                self._process_batch_brief_info(guid, usernames)
            else:
                logger.warning(
                    "contact init returned no usernames guid=%s round=%s contact_seq=%s->%s room_seq=%s->%s raw_keys=%s",
                    guid,
                    round_index,
                    current_contact_seq,
                    new_contact_seq,
                    current_room_seq,
                    new_room_seq,
                    list((result.get('raw') or {}).keys()) if isinstance(result.get("raw"), dict) else type(result.get("raw")).__name__,
                )
                if new_contact_seq != current_contact_seq or new_room_seq != current_room_seq:
                    logger.warning(
                        "contact init advanced seq without parsed usernames; preserving previous seq to avoid data loss "
                        "guid=%s round=%s contact_seq=%s room_seq=%s",
                        guid,
                        round_index,
                        current_contact_seq,
                        current_room_seq,
                    )
                    new_contact_seq = current_contact_seq
                    new_room_seq = current_room_seq

            current_contact_seq = new_contact_seq
            current_room_seq = new_room_seq

            if not continue_flag:
                break
        else:
            logger.warning(
                "contact init exceeded max rounds guid=%s contact_seq=%s room_seq=%s",
                guid,
                current_contact_seq,
                current_room_seq,
            )

        self.save_sync_state(guid, current_contact_seq, current_room_seq, sync_kind=sync_kind)

    def handle_contact_change_event(self, guid: str, notify_type: int, payload: dict[str, Any]) -> None:
        if not guid:
            raise RuntimeError("guid is required for contact change sync")
        self._ensure_tables(SYNC_REQUIRED_TABLES)

        username = self._extract_changed_username(payload)
        if not username:
            logger.warning("No username found in contact change event for guid=%s notify_type=%s", guid, notify_type)
            self.mark_event_sync(guid)
            return

        if notify_type == 1201:
            self._soft_delete_contact_or_room(guid, username)
            self.mark_event_sync(guid)
            return

        if notify_type != 1200:
            self.mark_event_sync(guid)
            return

        if "@chatroom" in username:
            room = self._fetch_room_profile(guid, username)
            contacts = [room] if room else []
        else:
            result = self.wechat_client.get_contact(guid, username_list=[username], room_username="")
            contacts = result.get("contacts") or []

        for contact in contacts:
            self._save_single_contact(guid, contact)

        self.mark_event_sync(guid)

    def sync_single_room(self, guid: str, room_username: str) -> None:
        clean_guid = safe_str(guid)
        clean_room_username = safe_str(room_username)
        if not clean_guid or not clean_room_username:
            raise RuntimeError("guid and room_username are required for room sync")
        self._ensure_tables(SYNC_REQUIRED_TABLES)
        self.sync_chatroom_details_and_members(
            clean_guid,
            clean_room_username,
            current_info_version=1,
            old_info_version=0,
            current_version=1,
            old_version=0,
            old_member_version=0,
        )

    def get_sync_state(self, guid: str) -> dict[str, Any]:
        row = self.supabase.select_one(
            "wechat_raw.wechat_sync_state",
            filters={"guid": f"eq.{guid}"},
        )
        if row:
            return row
        return {
            "guid": guid,
            "contact_seq": 0,
            "room_seq": 0,
        }

    def save_sync_state(self, guid: str, contact_seq: int, room_seq: int, *, sync_kind: str) -> None:
        now_iso = utc_now_iso()
        payload: dict[str, Any] = {
            "guid": guid,
            "contact_seq": contact_seq,
            "room_seq": room_seq,
            "updated_at": now_iso,
        }
        if sync_kind == "full":
            payload["last_full_sync_at"] = now_iso
            payload["last_incremental_sync_at"] = now_iso
        elif sync_kind == "incremental":
            payload["last_incremental_sync_at"] = now_iso
        elif sync_kind == "event":
            payload["last_event_sync_at"] = now_iso
        self.supabase.upsert("wechat_raw.wechat_sync_state", payload, on_conflict="guid")

    def mark_event_sync(self, guid: str) -> None:
        state = self.get_sync_state(guid)
        self.save_sync_state(
            guid,
            safe_int(state.get("contact_seq")),
            safe_int(state.get("room_seq")),
            sync_kind="event",
        )

    def resolve_contact_display_name(self, guid: str, username: str | None, fallback: str | None = None) -> str | None:
        names = self.resolve_contact_names(guid, username, fallback)
        return names.get("display_name")

    def resolve_contact_names(self, guid: str, username: str | None, fallback: str | None = None) -> dict[str, str | None]:
        clean_username = safe_str(username)
        if not clean_username:
            return {
                "nickname": None,
                "remark": None,
                "alias": None,
                "display_name": fallback,
            }
        row = self.supabase.select_one(
            "wechat_raw.wechat_contacts",
            columns="nickname,remark,alias",
            filters={
                "guid": f"eq.{guid}",
                "username": f"eq.{clean_username}",
                "is_deleted": "is.false",
            },
            order="updated_at.desc",
        )
        if row:
            nickname = safe_str(row.get("nickname"))
            remark = safe_str(row.get("remark"))
            alias = safe_str(row.get("alias"))
            return {
                "nickname": nickname,
                "remark": remark,
                "alias": alias,
                "display_name": remark or nickname or alias or fallback,
            }
        return {
            "nickname": None,
            "remark": None,
            "alias": None,
            "display_name": fallback,
        }

    def resolve_room_names(self, guid: str, room_username: str | None, fallback: str | None = None) -> dict[str, str | None]:
        clean_room_username = safe_str(room_username)
        if not clean_room_username:
            return {
                "room_name": fallback,
                "room_remark_name": None,
                "display_name": fallback,
            }
        row = self.supabase.select_one(
            "wechat_raw.wechat_chatrooms",
            columns="room_name,room_remark_name",
            filters={
                "guid": f"eq.{guid}",
                "room_username": f"eq.{clean_room_username}",
                "is_deleted": "is.false",
            },
            order="updated_at.desc",
        )
        if row:
            room_name = safe_str(row.get("room_name")) or fallback
            room_remark_name = safe_str(row.get("room_remark_name")) or None
            return {
                "room_name": room_name,
                "room_remark_name": room_remark_name,
                "display_name": room_remark_name or room_name or fallback,
            }
        return {
            "room_name": fallback,
            "room_remark_name": None,
            "display_name": fallback,
        }

    def resolve_room_display_name(self, guid: str, room_username: str | None, fallback: str | None = None) -> str | None:
        return self.resolve_room_names(guid, room_username, fallback).get("display_name")

    def refresh_wechat_name_snapshot(self) -> None:
        try:
            self.supabase.rpc("refresh_wechat_name_snapshot")
        except Exception:
            logger.exception("refresh_wechat_name_snapshot rpc failed")

    def auto_match_wechat_bindings(self) -> None:
        try:
            self.supabase.rpc("auto_match_wechat_bindings")
        except Exception:
            logger.exception("auto_match_wechat_bindings rpc failed")

    def resolve_chatroom_member_display_name(
        self,
        guid: str,
        room_username: str | None,
        username: str | None,
        fallback: str | None = None,
    ) -> str | None:
        clean_room_username = safe_str(room_username)
        clean_username = safe_str(username)
        if not clean_room_username or not clean_username:
            return fallback
        row = self.supabase.select_one(
            "wechat_raw.wechat_chatroom_members",
            columns="display_name,nickname",
            filters={
                "guid": f"eq.{guid}",
                "room_username": f"eq.{clean_room_username}",
                "username": f"eq.{clean_username}",
                "is_deleted": "is.false",
            },
            order="updated_at.desc",
        )
        if row:
            return safe_str(row.get("display_name")) or safe_str(row.get("nickname")) or fallback
        return fallback

    def _enqueue_job(self, payload: dict[str, Any]) -> None:
        self._ensure_tables(SYNC_REQUIRED_TABLES)
        row = {
            **payload,
            "status": "pending",
            "attempt_count": 0,
            "next_retry_at": None,
            "last_error": None,
            "processing_started_at": None,
            "completed_at": None,
            "created_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        }
        self.supabase.insert(
            "wechat_raw.wechat_contact_sync_jobs",
            row,
            on_conflict="dedupe_key",
            ignore_duplicates=True,
        )

    def _complete_job(self, job: dict[str, Any]) -> None:
        self.supabase.update(
            "wechat_raw.wechat_contact_sync_jobs",
            {
                "status": "success",
                "next_retry_at": None,
                "last_error": None,
                "processing_started_at": None,
                "updated_at": utc_now_iso(),
                "completed_at": utc_now_iso(),
            },
            filters={"id": f"eq.{job['id']}"},
        )

    def _mark_retry_or_failed(self, job: dict[str, Any], exc: Exception) -> None:
        attempt_count = safe_int(job.get("attempt_count")) + 1
        status = "failed" if attempt_count >= self.settings.worker_max_attempts else "retrying"
        self.supabase.update(
            "wechat_raw.wechat_contact_sync_jobs",
            {
                "status": status,
                "attempt_count": attempt_count,
                "last_error": str(exc),
                "next_retry_at": None if status == "failed" else build_retry_at(attempt_count),
                "processing_started_at": None,
                "updated_at": utc_now_iso(),
            },
            filters={"id": f"eq.{job['id']}"},
        )

    def _process_batch_brief_info(self, guid: str, usernames: list[str]) -> None:
        clean_usernames = [safe_str(username) for username in usernames if safe_str(username)]
        room_usernames = [username for username in clean_usernames if "@chatroom" in username]
        contact_usernames = [username for username in clean_usernames if "@chatroom" not in username]

        for room_username in self._dedupe_preserve_order(room_usernames):
            self.sync_single_room(guid, room_username)

        clean_usernames = self._dedupe_preserve_order(contact_usernames)
        if not clean_usernames:
            return

        batch_size = 50
        for start in range(0, len(clean_usernames), batch_size):
            batch = clean_usernames[start:start + batch_size]
            result = self.wechat_client.batch_get_contact_brief_info(guid, batch)
            contacts = result.get("contacts") or []
            parsed_usernames: set[str] = set()
            detail_usernames: list[str] = []
            logger.info(
                "contact brief sync guid=%s batch=%s parsed_contacts=%s",
                guid,
                len(batch),
                len(contacts),
            )
            for contact in contacts:
                username = self._extract_contact_username(contact)
                if username:
                    parsed_usernames.add(username)
                    if self._needs_contact_detail_fetch(contact):
                        detail_usernames.append(username)
                self._save_single_contact(guid, contact)
            missing_usernames = [username for username in batch if username not in parsed_usernames]
            detail_targets = self._dedupe_preserve_order(detail_usernames + missing_usernames)
            if detail_targets:
                detail_result = self.wechat_client.get_contact(guid, username_list=detail_targets, room_username="")
                detail_contacts = detail_result.get("contacts") or []
                logger.info(
                    "contact detail sync guid=%s requested=%s parsed_contacts=%s",
                    guid,
                    len(detail_targets),
                    len(detail_contacts),
                )
                for detail_contact in detail_contacts:
                    self._save_single_contact(guid, detail_contact)

    @staticmethod
    def _normalize_key(value: Any) -> str:
        return str(value).replace("_", "").lower()

    @classmethod
    def _pick_contact_value(cls, value: Any, *keys: str) -> Any:
        normalized_keys = {cls._normalize_key(key) for key in keys}
        # 按照用户“一对一，不深度解析”的需求，仅在顶层（浅层）查找
        if isinstance(value, dict):
            for key, item in value.items():
                if cls._normalize_key(key) in normalized_keys and item not in (None, "", [], {}):
                    return cls._unwrap_scalar_wrapper(item)
        return None

    @classmethod
    def _pick_nested_value_excluding_keys(
        cls,
        value: Any,
        normalized_keys: set[str],
        excluded_container_keys: set[str],
    ) -> Any:
        if isinstance(value, dict):
            for key, item in value.items():
                if cls._normalize_key(key) in normalized_keys and item not in (None, "", [], {}):
                    return cls._unwrap_scalar_wrapper(item)
            for key, item in value.items():
                if cls._normalize_key(key) in excluded_container_keys:
                    continue
                nested = cls._pick_nested_value_excluding_keys(item, normalized_keys, excluded_container_keys)
                if nested not in (None, "", [], {}):
                    return nested
        elif isinstance(value, list):
            for item in value:
                nested = cls._pick_nested_value_excluding_keys(item, normalized_keys, excluded_container_keys)
                if nested not in (None, "", [], {}):
                    return nested
        return None



    @classmethod
    def _unwrap_scalar_wrapper(cls, value: Any) -> Any:
        if isinstance(value, dict):
            if "string" in value and len(value) == 1:
                return value.get("string")
            if "buffer" in value and len(value) <= 2:
                return value.get("buffer")
        return value

    @classmethod
    def _extract_contact_username(cls, contact: dict[str, Any]) -> str:
        return safe_str(
            cls._pick_contact_value(
                contact,
                "username",
                "userName",
                "UserName",
                "wxid",
                "Wxid",
                "WXID",
                "room_username",
                "roomUsername",
                "RoomUsername",
            )
        )

    @classmethod
    def _extract_contact_nickname(cls, contact: dict[str, Any]) -> str:
        return safe_str(cls._pick_contact_value(contact, "nickname", "nickName", "NickName", "nick_name"))

    @classmethod
    def _extract_contact_alias(cls, contact: dict[str, Any]) -> str:
        return safe_str(cls._pick_contact_value(contact, "alias", "Alias"))

    @classmethod
    def _extract_contact_remark(cls, contact: dict[str, Any]) -> str:
        return safe_str(cls._pick_contact_value(contact, "remark", "remarkName", "remark_name"))

    @classmethod
    def _extract_contact_avatar(cls, contact: dict[str, Any]) -> str:
        return safe_str(
            cls._pick_contact_value(
                contact,
                "avatar",
                "smallHeadImgUrl",
                "SmallHeadImgUrl",
                "bigHeadImgUrl",
                "BigHeadImgUrl",
                "headImgUrl",
                "head_img_url",
                "HeadImgUrl",
            )
        )

    @classmethod
    def _extract_contact_avatar_small(cls, contact: dict[str, Any]) -> str:
        return safe_str(cls._pick_contact_value(contact, "smallHeadImgUrl", "SmallHeadImgUrl"))

    @classmethod
    def _extract_contact_avatar_big(cls, contact: dict[str, Any]) -> str:
        return safe_str(cls._pick_contact_value(contact, "bigHeadImgUrl", "BigHeadImgUrl"))

    @classmethod
    def _extract_contact_int(cls, contact: dict[str, Any], *keys: str, default: int = 0) -> int:
        return safe_int(cls._pick_contact_value(contact, *keys), default=default)

    @classmethod
    def _extract_optional_contact_int(cls, contact: dict[str, Any], *keys: str) -> int | None:
        value = cls._pick_contact_value(contact, *keys)
        if value in (None, ""):
            return None
        try:
            return int(value)
        except Exception:
            return None

    @classmethod
    def _extract_contact_text(cls, contact: dict[str, Any], *keys: str) -> str:
        return safe_str(cls._pick_contact_value(contact, *keys))

    @classmethod
    def _pick_chatroom_value(cls, value: Any, *keys: str) -> Any:
        normalized_keys = {cls._normalize_key(key) for key in keys}
        excluded_container_keys = {
            "memberlist",
            "members",
            "member",
            "memberinfo",
            "memberinfolist",
            "contactlist",
            "contacts",
            "contact",
            "list",
            "items",
            "chatroommember",
            "allmemberusernamelist",
        }
        return cls._unwrap_scalar_wrapper(
            cls._pick_nested_value_excluding_keys(value, normalized_keys, excluded_container_keys)
        )

    @classmethod
    def _extract_chatroom_name(cls, chatroom: dict[str, Any]) -> str:
        return safe_str(
            cls._pick_chatroom_value(
                chatroom,
                "nickname",
                "nickName",
                "NickName",
                "nick_name",
                "chatRoomName",
                "chatroomName",
                "roomName",
                "room_name",
            )
        )

    @classmethod
    def _extract_chatroom_remark_name(cls, chatroom: dict[str, Any]) -> str:
        return safe_str(
            cls._pick_chatroom_value(
                chatroom,
                "remark",
                "remarkName",
                "remark_name",
            )
        )

    @classmethod
    def _extract_chatroom_avatar(cls, chatroom: dict[str, Any]) -> str:
        return safe_str(
            cls._pick_chatroom_value(
                chatroom,
                "avatar",
                "smallHeadImgUrl",
                "SmallHeadImgUrl",
                "bigHeadImgUrl",
                "BigHeadImgUrl",
                "headImgUrl",
                "head_img_url",
                "HeadImgUrl",
            )
        )

    @classmethod
    def _extract_chatroom_text(cls, chatroom: dict[str, Any], *keys: str) -> str:
        return safe_str(cls._pick_chatroom_value(chatroom, *keys))

    @classmethod
    def _extract_chatroom_optional_int(cls, chatroom: dict[str, Any], *keys: str) -> int | None:
        value = cls._pick_chatroom_value(chatroom, *keys)
        if value in (None, ""):
            return None
        try:
            return int(value)
        except Exception:
            return None

    @classmethod
    def _extract_contact_username_list(cls, payload: Any) -> list[str]:
        usernames: list[str] = []
        seen: set[str] = set()

        def add(value: Any) -> None:
            username = safe_str(value)
            if not username or username in seen:
                return
            seen.add(username)
            usernames.append(username)

        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    add(cls._pick_contact_value(item, "string", "username", "userName"))
                else:
                    add(item)
        return usernames

    @staticmethod
    def _dedupe_preserve_order(values: list[str]) -> list[str]:
        deduped: list[str] = []
        seen: set[str] = set()
        for value in values:
            clean_value = safe_str(value)
            if not clean_value or clean_value in seen:
                continue
            seen.add(clean_value)
            deduped.append(clean_value)
        return deduped

    @classmethod
    def _needs_contact_detail_fetch(cls, contact: dict[str, Any]) -> bool:
        username = cls._extract_contact_username(contact)
        if not username:
            return False
        return not any(
            (
                cls._extract_contact_nickname(contact),
                cls._extract_contact_remark(contact),
                cls._extract_contact_alias(contact),
                cls._extract_contact_avatar(contact),
                cls._pick_contact_value(contact, "verifyFlag", "VerifyFlag", "verify_flag"),
                cls._pick_contact_value(contact, "bitVal", "BitVal", "bit_val"),
            )
        )

    def _build_contact_upsert_payload(
        self,
        guid: str,
        username: str,
        contact: dict[str, Any],
        now_iso: str,
        *,
        contact_type: int,
        bit_val: int,
        verify_flag: int,
    ) -> dict[str, Any]:
        avatar_small = self._extract_contact_avatar_small(contact)
        avatar_big = self._extract_contact_avatar_big(contact)
        return {
            "guid": guid,
            "username": username,
            "nickname": self._extract_contact_nickname(contact) or None,
            "remark": self._extract_contact_remark(contact) or None,
            "alias": self._extract_contact_alias(contact) or None,
            "avatar": avatar_small or avatar_big or self._extract_contact_avatar(contact) or None,
            "avatar_small": avatar_small or None,
            "avatar_big": avatar_big or None,
            "py_initial": self._extract_contact_text(contact, "pyinitial", "pyInitial") or None,
            "quan_pin": self._extract_contact_text(contact, "quanPin", "quanpin") or None,
            "remark_py_initial": self._extract_contact_text(contact, "remarkPyinitial", "remark_pyinitial") or None,
            "remark_quan_pin": self._extract_contact_text(contact, "remarkQuanPin", "remark_quan_pin") or None,
            "country": self._extract_contact_text(contact, "country") or None,
            "province": self._extract_contact_text(contact, "province") or None,
            "city": self._extract_contact_text(contact, "city") or None,
            "signature": self._extract_contact_text(contact, "signature") or None,
            "encrypt_username": self._extract_contact_text(contact, "encryptUserName", "encrypt_username") or None,
            "type": contact_type,
            "wechat_contact_type": self._extract_optional_contact_int(contact, "contactType", "contact_type"),
            "gender": self._extract_contact_int(contact, "sex", "Sex", "gender", "Gender"),
            "personal_card": self._extract_optional_contact_int(contact, "personalCard", "personal_card"),
            "source": self._extract_optional_contact_int(contact, "source"),
            "text_status_flag": self._extract_optional_contact_int(contact, "textStatusFlag", "text_status_flag"),
            "friend_username": self._extract_contact_text(contact, "friendUserName", "friend_username") or None,
            "head_img_md5": self._extract_contact_text(contact, "headImgMd5", "head_img_md5") or None,
            "wechat_create_time": self._extract_optional_contact_int(contact, "createTime", "create_time"),
            "verify_flag": verify_flag,
            "bit_val": bit_val,
            "bit_mask": self._extract_optional_contact_int(contact, "bitMask", "bit_mask"),
            "bit_mask2": self._extract_optional_contact_int(contact, "bitMask2", "bit_mask2"),
            "bit_value2": self._extract_optional_contact_int(contact, "bitValue2", "bit_value2"),
            "is_deleted": False,
            "last_synced_at": now_iso,
            "raw_json": contact,
            "updated_at": now_iso,
        }

    def _mark_missing_chatroom_members_deleted(
        self,
        guid: str,
        room_username: str,
        current_usernames: list[str],
        now_iso: str,
    ) -> None:
        active_members = self.supabase.select(
            "wechat_raw.wechat_chatroom_members",
            columns="username",
            filters={
                "guid": f"eq.{guid}",
                "room_username": f"eq.{room_username}",
                "is_deleted": "is.false",
            },
            order="updated_at.desc",
        )
        current_username_set = set(self._dedupe_preserve_order(current_usernames))
        for member in active_members:
            member_username = safe_str(member.get("username"))
            if not member_username or member_username in current_username_set:
                continue
            self.supabase.update(
                "wechat_raw.wechat_chatroom_members",
                {
                    "is_deleted": True,
                    "updated_at": now_iso,
                    "last_synced_at": now_iso,
                },
                filters={
                    "guid": f"eq.{guid}",
                    "room_username": f"eq.{room_username}",
                    "username": f"eq.{member_username}",
                },
            )

    def _upsert_chatroom_member_placeholder(
        self,
        guid: str,
        room_username: str,
        room_name: str,
        room_remark_name: str | None,
        username: str,
        now_iso: str,
    ) -> None:
        self.supabase.upsert(
            "wechat_raw.wechat_chatroom_members",
            {
                "guid": guid,
                "room_username": room_username,
                "room_name": room_name,
                "room_remark_name": room_remark_name,
                "username": username,
                "is_deleted": False,
                "last_synced_at": now_iso,
                "updated_at": now_iso,
            },
            on_conflict="guid,room_username,username",
        )

    def _save_single_contact(self, guid: str, contact: dict[str, Any]) -> None:
        username = self._extract_contact_username(contact)
        if not username:
            return

        now_iso = utc_now_iso()
        bit_val = safe_int(
            self._pick_contact_value(contact, "bitVal", "BitVal", "bit_val")
        )
        verify_flag = safe_int(
            self._pick_contact_value(contact, "verifyFlag", "VerifyFlag", "verify_flag")
        )
        contact_type = get_contact_type(username, bit_val, verify_flag)

        if contact_type == ContactType.ChatRoom:
            existing = self.supabase.select_one(
                "wechat_raw.wechat_chatrooms",
                columns="chatroom_version,chatroom_info_version,member_version",
                filters={"guid": f"eq.{guid}", "room_username": f"eq.{username}"},
            ) or {}
            old_version = safe_int(existing.get("chatroom_version"))
            old_info_version = safe_int(existing.get("chatroom_info_version"))
            old_member_version = safe_int(existing.get("member_version"))
            current_version = safe_int(
                self._pick_contact_value(contact, "chatroomVersion", "ChatroomVersion", "chatroom_version")
            )
            current_info_version = safe_int(
                self._pick_contact_value(contact, "chatroomInfoVersion", "ChatroomInfoVersion", "chatroom_info_version")
            )

            self.supabase.upsert(
                "wechat_raw.wechat_chatrooms",
                self._build_chatroom_upsert_payload(
                    guid,
                    username,
                    now_iso,
                    contact,
                    chatroom_version=current_version,
                    chatroom_info_version=current_info_version,
                ),
                on_conflict="guid,room_username",
            )

            if current_info_version != old_info_version or current_version != old_version:
                self.sync_chatroom_details_and_members(
                    guid,
                    username,
                    current_info_version=current_info_version,
                    old_info_version=old_info_version,
                    current_version=current_version,
                    old_version=old_version,
                    old_member_version=old_member_version,
                )
            return

        self.supabase.upsert(
            "wechat_raw.wechat_contacts",
            self._build_contact_upsert_payload(
                guid,
                username,
                contact,
                now_iso,
                contact_type=contact_type,
                bit_val=bit_val,
                verify_flag=verify_flag,
            ),
            on_conflict="guid,username",
        )

    def sync_chatroom_details_and_members(
        self,
        guid: str,
        room_username: str,
        *,
        current_info_version: int,
        old_info_version: int,
        current_version: int,
        old_version: int,
        old_member_version: int,
    ) -> None:
        now_iso = utc_now_iso()
        room_names = self.resolve_room_names(guid, room_username, fallback=room_username)
        room_name = room_names.get("room_name") or room_username
        room_remark_name = room_names.get("room_remark_name")

        if current_info_version != old_info_version:
            room = self._fetch_room_profile(guid, room_username)
            if room:
                room_name = self._extract_chatroom_name(room) or room_name
                room_remark_name = self._extract_chatroom_remark_name(room) or room_remark_name
                self.supabase.upsert(
                    "wechat_raw.wechat_chatrooms",
                    self._build_chatroom_upsert_payload(
                        guid,
                        room_username,
                        now_iso,
                        room,
                        chatroom_info_version=current_info_version,
                    ),
                    on_conflict="guid,room_username",
                )

        if current_version != old_version:
            request_member_version = old_member_version if old_member_version > 0 else 0
            member_result = self.wechat_client.get_chatroom_member_detail(guid, room_username, request_member_version)
            members = member_result.get("members") or []
            all_member_usernames = self._dedupe_preserve_order(member_result.get("all_member_usernames") or [])
            all_member_count = safe_int(member_result.get("all_member_count"), default=len(all_member_usernames))
            member_count = safe_int(member_result.get("member_count"), default=len(members))
            resolved_member_version = safe_int(member_result.get("member_version"), default=old_member_version)
            detailed_usernames: set[str] = set()

            for member in members:
                member_username = self._extract_contact_username(member)
                if not member_username:
                    continue
                detailed_usernames.add(member_username)
                avatar_small = self._extract_contact_avatar_small(member)
                avatar_big = self._extract_contact_avatar_big(member)
                self.supabase.upsert(
                    "wechat_raw.wechat_chatroom_members",
                    {
                        "guid": guid,
                        "room_username": room_username,
                        "room_name": room_name,
                        "room_remark_name": room_remark_name,
                        "username": member_username,
                        "nickname": self._extract_contact_nickname(member) or None,
                        "display_name": safe_str(
                            self._pick_contact_value(member, "displayName", "DisplayName", "display_name")
                        ) or None,
                        "inviter_username": safe_str(
                            self._pick_contact_value(member, "inviterUserName", "InviterUserName", "inviter_username")
                        ) or None,
                        "avatar_small": avatar_small or None,
                        "avatar_big": avatar_big or None,
                        "member_flag": self._extract_optional_contact_int(
                            member,
                            "chatroomMemberFlag",
                            "chat_room_member_flag",
                        ),
                        "status": self._extract_optional_contact_int(member, "status"),
                        "join_scene_xml": self._extract_contact_text(
                            member,
                            "addChatRoomSceneNewXml",
                            "add_chat_room_scene_new_xml",
                        ) or None,
                        "is_deleted": False,
                        "last_synced_at": now_iso,
                        "raw_json": member,
                        "updated_at": now_iso,
                    },
                    on_conflict="guid,room_username,username",
                )

            for member_username in all_member_usernames:
                if not member_username or member_username in detailed_usernames:
                    continue
                self._upsert_chatroom_member_placeholder(
                    guid,
                    room_username,
                    room_name,
                    room_remark_name,
                    member_username,
                    now_iso,
                )

            if member_result.get("has_all_member_usernames"):
                if all_member_count > 0 and len(all_member_usernames) < all_member_count:
                    logger.warning(
                        "skip chatroom member deletion due to incomplete username list guid=%s room_username=%s username_count=%s all_member_count=%s member_count=%s parsed_members=%s",
                        guid,
                        room_username,
                        len(all_member_usernames),
                        all_member_count,
                        member_count,
                        len(members),
                    )
                else:
                    self._mark_missing_chatroom_members_deleted(
                        guid,
                        room_username,
                        all_member_usernames,
                        now_iso,
                    )

            chatroom_payload = self._build_chatroom_upsert_payload(
                guid,
                room_username,
                now_iso,
                member_result.get("raw") if isinstance(member_result.get("raw"), dict) else None,
                member_version=resolved_member_version,
                include_raw_json=False,
            )
            if member_result.get("has_all_member_usernames"):
                member_total = len(all_member_usernames)
                chatroom_payload["member_count"] = member_total
                chatroom_payload["all_member_count"] = member_total
            self.supabase.upsert(
                "wechat_raw.wechat_chatrooms",
                chatroom_payload,
                on_conflict="guid,room_username",
            )

    def _fetch_room_profile(self, guid: str, room_username: str) -> dict[str, Any]:
        room_contact_result = self.wechat_client.get_contact(guid, username_list=[room_username], room_username="")
        room_contacts = room_contact_result.get("contacts") or []
        for room_contact in room_contacts:
            if self._extract_contact_username(room_contact) == room_username:
                return room_contact
        if room_contacts:
            return room_contacts[0]

        room_result = self.wechat_client.get_chatroom_detail(guid, room_username)
        return room_result.get("room") or {}

    def _build_chatroom_upsert_payload(
        self,
        guid: str,
        room_username: str,
        now_iso: str,
        raw_source: dict[str, Any] | None = None,
        *,
        chatroom_version: int | None = None,
        chatroom_info_version: int | None = None,
        member_version: int | None = None,
        include_raw_json: bool = True,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "guid": guid,
            "room_username": room_username,
            "is_deleted": False,
            "last_synced_at": now_iso,
            "updated_at": now_iso,
        }
        if chatroom_version is not None:
            payload["chatroom_version"] = chatroom_version
        if chatroom_info_version is not None:
            payload["chatroom_info_version"] = chatroom_info_version
        if member_version is not None:
            payload["member_version"] = member_version
        if raw_source:
            if include_raw_json:
                payload["raw_json"] = raw_source

            room_name = self._extract_chatroom_name(raw_source)
            room_remark_name = self._extract_chatroom_remark_name(raw_source)
            avatar = self._extract_chatroom_avatar(raw_source)
            owner_username = self._extract_chatroom_text(raw_source, "chatRoomOwner", "chatroomOwner", "owner_username")
            if room_name:
                payload["room_name"] = room_name
            if room_remark_name:
                payload["room_remark_name"] = room_remark_name
            if avatar:
                payload["avatar"] = avatar
            if owner_username:
                payload["owner_username"] = owner_username
            member_count = self._extract_chatroom_optional_int(raw_source, "memberCount")
            all_member_count = self._extract_chatroom_optional_int(raw_source, "allMemberCount")
            admin_count = self._extract_chatroom_optional_int(raw_source, "adminCount")
            chatroom_status = self._extract_chatroom_optional_int(raw_source, "chatRoomStatus", "chatroomStatus")
            announcement_publish_time = self._extract_chatroom_optional_int(
                raw_source,
                "announcementPublishTime",
                "announcement_publish_time",
            )
            if member_count is not None:
                payload["member_count"] = member_count
            if all_member_count is not None:
                payload["all_member_count"] = all_member_count
            if admin_count is not None:
                payload["admin_count"] = admin_count
            if chatroom_status is not None:
                payload["chatroom_status"] = chatroom_status
            business_type = self._extract_chatroom_text(raw_source, "chatRoomBusinessType", "chatroomBusinessType")
            if business_type:
                payload["business_type"] = business_type

            announcement = self._extract_chatroom_text(raw_source, "announcement")
            if announcement:
                payload["announcement"] = announcement
                
            announcement_editor = self._extract_chatroom_text(raw_source, "announcementEditor", "announcement_editor")
            if announcement_editor:
                payload["announcement_editor"] = announcement_editor
                
            xml_announcement = self._extract_chatroom_text(raw_source, "xmlAnnouncement", "xml_announcement")
            if xml_announcement:
                payload["xml_announcement"] = xml_announcement

            if announcement_publish_time is not None:
                payload["announcement_publish_time"] = announcement_publish_time
        return payload

    def _soft_delete_contact_or_room(self, guid: str, username: str) -> None:
        now_iso = utc_now_iso()
        if "@chatroom" in username:
            self.supabase.update(
                "wechat_raw.wechat_chatrooms",
                {
                    "is_deleted": True,
                    "updated_at": now_iso,
                    "last_synced_at": now_iso,
                },
                filters={"guid": f"eq.{guid}", "room_username": f"eq.{username}"},
            )
            self.supabase.update(
                "wechat_raw.wechat_chatroom_members",
                {
                    "is_deleted": True,
                    "updated_at": now_iso,
                    "last_synced_at": now_iso,
                },
                filters={"guid": f"eq.{guid}", "room_username": f"eq.{username}"},
            )
            return

        self.supabase.update(
            "wechat_raw.wechat_contacts",
            {
                "is_deleted": True,
                "updated_at": now_iso,
                "last_synced_at": now_iso,
            },
            filters={"guid": f"eq.{guid}", "username": f"eq.{username}"},
        )

    @staticmethod
    def _extract_changed_username(payload: dict[str, Any]) -> str:
        data = payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}
        return safe_str(
            data.get("username")
            or data.get("userName")
            or data.get("room_username")
            or data.get("roomUsername")
            or data.get("from_wxid")
            or data.get("from_username")
        )

    def _ensure_tables(self, tables: tuple[str, ...]) -> None:
        if tables in self._validated_table_groups:
            return
        assert_tables_exist(self.supabase, tables)
        self._validated_table_groups.add(tables)
