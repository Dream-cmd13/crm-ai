import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from clients.cloud_api_client import CloudApiClient
from clients.guid_request_client import GuidRequestClient
from clients.supabase_client import SupabaseClient
from config import Settings
from parsers.xml_parser import parse_forwarded_chat_record_info
from services.cdn_state_service import CdnStateService
from services.contact_sync_service import ContactSyncService, safe_str
from services.schema_guard import assert_tables_exist


logger = logging.getLogger(__name__)

CRM_WX_PROJECTION_QUEUE_TABLES = ("crm_wx_projection_jobs",)
CRM_WX_PROJECTION_REQUIRED_TABLES = (
    "crm_wx_projection_jobs",
    "crm_wx_conversation",
    "crm_wx_message",
    "crm_wx_conversation_member",
    "wechat_raw.wechat_contacts",
    "wechat_raw.wechat_chatrooms",
    "wechat_raw.wechat_chatroom_members",
)

PRIVATE_EVENT_TABLE = "wechat_raw.wechat_private_message_events"
GROUP_EVENT_TABLE = "wechat_raw.wechat_group_message_events"
SUPPORTED_RAW_EVENT_TABLES = (PRIVATE_EVENT_TABLE, GROUP_EVENT_TABLE)


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


def safe_optional_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def build_message_preview(content: Any, msg_type: Any) -> str | None:
    text = safe_str(content)
    if text:
        return text[:120]
    msg_type_value = safe_int(msg_type, default=-1)
    placeholders = {
        3: "[image]",
        34: "[voice]",
        43: "[video]",
        47: "[emoji]",
        49: "[file]",
        62: "[short_video]",
    }
    return placeholders.get(msg_type_value)


def extract_file_name_from_message_content(content: Any) -> str | None:
    text = safe_str(content)
    if not text:
        return None
    match = re.match(r"^\[文件\]\s*(.+)$", text)
    if not match:
        return None
    file_name = safe_str(match.group(1))
    return file_name or None


class CrmWxProjectionService:
    def __init__(self, supabase: SupabaseClient, contact_sync_service: ContactSyncService, settings: Settings):
        self.supabase = supabase
        self.contact_sync_service = contact_sync_service
        self.settings = settings
        self.guid_client = GuidRequestClient(settings)
        self.cloud_client = CloudApiClient(settings)
        self.cdn_state_service = CdnStateService(supabase, self.guid_client)
        self._validated_table_groups: set[tuple[str, ...]] = set()

    def enqueue_message_projection(
        self,
        guid: str,
        raw_event_table: str,
        raw_event_dedupe_key: str,
        *,
        reason: str = "route",
    ) -> None:
        if not guid or not raw_event_table or not raw_event_dedupe_key:
            return
        if raw_event_table not in SUPPORTED_RAW_EVENT_TABLES:
            return
        self._ensure_tables(CRM_WX_PROJECTION_QUEUE_TABLES)
        now_iso = utc_now_iso()
        self.supabase.upsert(
            "crm_wx_projection_jobs",
            {
                "dedupe_key": self._build_job_dedupe_key(raw_event_table, raw_event_dedupe_key, reason),
                "source_guid": guid,
                "raw_event_table": raw_event_table,
                "raw_event_dedupe_key": raw_event_dedupe_key,
                "job_type": "project_message",
                "status": "pending",
                "attempt_count": 0,
                "next_retry_at": None,
                "last_error": None,
                "processing_started_at": None,
                "completed_at": None,
                "created_at": now_iso,
                "updated_at": now_iso,
            },
            on_conflict="dedupe_key",
        )

    def claim_next_job(self) -> dict[str, Any] | None:
        self._ensure_tables(CRM_WX_PROJECTION_REQUIRED_TABLES)
        now_iso = utc_now_iso()
        candidate_filter = f"(status.eq.pending,and(status.eq.retrying,next_retry_at.lte.{now_iso}))"
        rows = self.supabase.select(
            "crm_wx_projection_jobs",
            filters={"or": candidate_filter},
            order="created_at.asc",
            limit=1,
        )
        if not rows:
            return None

        job = rows[0]
        claimed_rows = self.supabase.update(
            "crm_wx_projection_jobs",
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
            "crm_wx_projection_jobs",
            filters={"id": f"eq.{job['id']}", "status": "eq.processing"},
        )

    def recover_stale_jobs(self) -> int:
        self._ensure_tables(CRM_WX_PROJECTION_REQUIRED_TABLES)
        rows = self.supabase.select(
            "crm_wx_projection_jobs",
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
                "crm_wx_projection_jobs",
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
            if job.get("job_type") != "project_message":
                raise RuntimeError(f"unsupported crm wx projection job_type={job.get('job_type')}")
            self.project_message(
                str(job.get("source_guid") or ""),
                str(job.get("raw_event_table") or ""),
                str(job.get("raw_event_dedupe_key") or ""),
            )
            self._complete_job(job)
        except Exception as exc:
            logger.exception("crm wx projection job failed id=%s", job.get("id"))
            self._mark_retry_or_failed(job, exc)

    def project_message(self, guid: str, raw_event_table: str, raw_event_dedupe_key: str) -> None:
        self._ensure_tables(CRM_WX_PROJECTION_REQUIRED_TABLES)
        if raw_event_table not in SUPPORTED_RAW_EVENT_TABLES:
            raise RuntimeError(f"unsupported raw_event_table={raw_event_table}")

        raw_message = self.supabase.select_one(
            raw_event_table,
            filters={"dedupe_key": f"eq.{raw_event_dedupe_key}"},
        )
        if not raw_message:
            raise RuntimeError(
                f"raw message not found table={raw_event_table} dedupe_key={raw_event_dedupe_key}"
            )

        source_guid = safe_str(raw_message.get("guid")) or guid
        if not source_guid:
            raise RuntimeError("guid missing for crm wx projection")

        is_group = raw_event_table == GROUP_EVENT_TABLE
        message_context = self._build_message_context(
            source_guid,
            raw_message,
            raw_event_table=raw_event_table,
            raw_event_dedupe_key=raw_event_dedupe_key,
            is_group=is_group,
        )
        conversation = self._upsert_conversation(message_context)
        projected_messages = self._build_projected_messages(raw_event_dedupe_key, message_context)
        existing_messages = self._list_existing_projected_messages(
            raw_event_table,
            raw_event_dedupe_key,
            include_expanded=(
                message_context.get("conversation_type") == "private"
                and message_context.get("message_origin_type") in {"group_forward", "private_forward"}
            ),
        )
        existing_message_keys = {
            safe_str(row.get("raw_event_dedupe_key")): row
            for row in existing_messages
            if safe_str(row.get("raw_event_dedupe_key"))
        }
        active_message_keys = {item["raw_event_dedupe_key"] for item in projected_messages}
        stale_message_ids = [
            row["id"]
            for row in existing_messages
            if safe_int(row.get("id")) and safe_str(row.get("raw_event_dedupe_key")) not in active_message_keys
        ]
        if stale_message_ids:
            self.supabase.delete(
                "crm_wx_message",
                filters={"id": self._build_in_filter(stale_message_ids)},
            )

        last_projected_message = None
        new_message_count_delta = 0
        for item in projected_messages:
            if item["raw_event_dedupe_key"] not in existing_message_keys:
                new_message_count_delta += 1
            last_projected_message = self._upsert_message(
                conversation["id"],
                raw_event_table,
                item["raw_event_dedupe_key"],
                item["message_context"],
            )

        if last_projected_message is None:
            raise RuntimeError(
                f"failed to build projected crm_wx_message rows dedupe_key={raw_event_dedupe_key}"
            )
        self._update_conversation_summary(
            conversation["id"],
            last_projected_message["id"],
            projected_messages[-1]["message_context"],
            new_message_count_delta=new_message_count_delta - len(stale_message_ids),
        )

        if message_context["conversation_type"] == "group":
            self._sync_group_members(
                conversation,
                source_guid,
                message_context["room_username"],
                message_context["my_wechat_id"],
                message_context["sender_wechat_id"],
                message_context["sender_display_name"],
            )
        else:
            self._sync_private_members(
                conversation["id"],
                source_guid,
                message_context["my_wechat_id"],
                message_context["peer_wechat_id"],
                message_context["peer_display_name"],
            )

    def _build_message_context(
        self,
        guid: str,
        raw_message: dict[str, Any],
        *,
        raw_event_table: str,
        raw_event_dedupe_key: str,
        is_group: bool,
    ) -> dict[str, Any]:
        payload = raw_message.get("payload") if isinstance(raw_message.get("payload"), dict) else {}
        payload_data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        forwarded_record = parse_forwarded_chat_record_info(payload_data.get("content"))
        sender_wechat_id = safe_str(raw_message.get("sender")) or None
        receiver_wechat_id = safe_str(raw_message.get("receiver")) or None
        room_username = safe_str(raw_message.get("roomid")) if is_group else None
        if room_username in ("", "0"):
            room_username = None

        send_flag = safe_int(raw_message.get("send_flag"), default=-1)
        forwarded_record_type = safe_str((forwarded_record or {}).get("record_type")) or None
        is_group_forward = (not is_group) and forwarded_record_type == "group"
        is_private_forward = (not is_group) and forwarded_record_type == "private"
        conversation_type = "group" if is_group else "private"
        message_origin_type = (
            "group_live"
            if is_group
            else "group_forward"
            if is_group_forward
            else "private_forward"
            if is_private_forward
            else "unknown"
        )

        my_wechat_name = None
        peer_wechat_name = None
        peer_name_tokens: list[str] = []
        forward_batch_key = None
        is_internal_chat = False
        conversation_identity_type = "group" if conversation_type == "group" else "private_direct"
        if conversation_type == "group":
            my_wechat_id = receiver_wechat_id
            peer_wechat_id = None
            room_names = self.contact_sync_service.resolve_room_names(
                guid,
                room_username,
                fallback=room_username,
            )
            room_name = safe_str(raw_message.get("room_name")) or room_names.get("room_name") or room_username
            room_remark_name = safe_str(raw_message.get("room_remark_name")) or room_names.get("room_remark_name")
            if not room_name:
                room_name = safe_str((forwarded_record or {}).get("group_chat_name")) or None
            conversation_name = room_remark_name or room_name or room_username
        else:
            room_name = None
            room_remark_name = None
            sender_contact_names = self.contact_sync_service.resolve_contact_names(
                guid,
                sender_wechat_id,
                fallback=None,
            )
            receiver_contact_names = self.contact_sync_service.resolve_contact_names(
                guid,
                receiver_wechat_id,
                fallback=None,
            )
            sender_contact_exists = self._has_contact_identity(sender_contact_names)
            receiver_contact_exists = self._has_contact_identity(receiver_contact_names)
            sender_contact_display = self._build_my_wechat_display_name(
                sender_contact_names,
                fallback=safe_str(raw_message.get("sender_display_name")) or sender_wechat_id,
            )
            receiver_contact_display = self._build_my_wechat_display_name(
                receiver_contact_names,
                fallback=safe_str(raw_message.get("receiver_display_name")) or receiver_wechat_id,
            )
            if is_private_forward or is_group_forward:
                my_wechat_id = sender_wechat_id if sender_contact_exists else None
                peer_wechat_id = None
                my_wechat_name = sender_contact_display
                my_name_candidates = {
                    safe_str(sender_contact_names.get("nickname")),
                    safe_str(sender_contact_names.get("remark")),
                    safe_str(sender_contact_names.get("alias")),
                    safe_str(raw_message.get("sender_display_name")),
                    safe_str(my_wechat_name),
                }
                my_name_candidates.update(
                    self._extract_forwarded_self_candidates(
                        forwarded_record,
                        my_name_candidates=my_name_candidates,
                    )
                )
                peer_name_tokens = self._extract_forwarded_customer_tokens(
                    forwarded_record,
                    my_name_candidates=my_name_candidates,
                )
                peer_wechat_name = self._join_name_tokens(peer_name_tokens)
                forward_batch_key = self._build_forward_batch_key(raw_event_dedupe_key)
                if peer_name_tokens:
                    conversation_identity_type = "private_forward_batch"
                    conversation_name = peer_wechat_name or my_wechat_name or "未命名会话"
                else:
                    conversation_identity_type = "private_internal"
                    is_internal_chat = True
                    peer_wechat_name = None
                    conversation_name = my_wechat_name or "内部会话"
            else:
                default_my_wechat_id = sender_wechat_id if send_flag == 1 else receiver_wechat_id
                default_peer_wechat_id = receiver_wechat_id if send_flag == 1 else sender_wechat_id
                default_my_contact_exists = sender_contact_exists if default_my_wechat_id == sender_wechat_id else receiver_contact_exists
                default_peer_contact_exists = receiver_contact_exists if default_peer_wechat_id == receiver_wechat_id else sender_contact_exists
                default_peer_display_name = receiver_contact_display if default_peer_wechat_id == receiver_wechat_id else sender_contact_display

                # If the default "my side" is not a known internal contact but the opposite side is,
                # treat this as an internal business-side chat instead of showing the bot as "my wechat".
                if (not default_my_contact_exists) and default_peer_contact_exists:
                    conversation_identity_type = "private_internal"
                    is_internal_chat = True
                    my_wechat_id = default_peer_wechat_id
                    peer_wechat_id = None
                    my_wechat_name = default_peer_display_name
                    peer_wechat_name = None
                    conversation_name = my_wechat_name or "内部会话"
                else:
                    my_wechat_id = default_my_wechat_id
                    peer_wechat_id = default_peer_wechat_id
                    conversation_name = safe_str(raw_message.get("peer_display_name")) or self.contact_sync_service.resolve_contact_display_name(
                        guid,
                        peer_wechat_id,
                        fallback=peer_wechat_id,
                    )
                    my_wechat_name = (
                        self.contact_sync_service.resolve_contact_display_name(
                            guid,
                            my_wechat_id,
                            fallback=my_wechat_id,
                        )
                        if my_wechat_id
                        else None
                    )
                    peer_wechat_name = safe_str(raw_message.get("peer_display_name")) or self.contact_sync_service.resolve_contact_display_name(
                        guid,
                        peer_wechat_id,
                        fallback=peer_wechat_id,
                    )
                    peer_name_tokens = self._clean_name_tokens([peer_wechat_name])
                    if not (my_wechat_id or peer_wechat_id):
                        conversation_identity_type = "private_name"

        sender_display_name = safe_str(raw_message.get("sender_display_name")) or (
            self.contact_sync_service.resolve_chatroom_member_display_name(
                guid,
                room_username,
                sender_wechat_id,
                fallback=None,
            )
            if is_group
            else self.contact_sync_service.resolve_contact_display_name(
                guid,
                sender_wechat_id,
                fallback=None,
            )
        )
        if is_private_forward or is_group_forward:
            sender_display_name = my_wechat_name or sender_display_name
        receiver_display_name = safe_str(raw_message.get("receiver_display_name")) or self.contact_sync_service.resolve_contact_display_name(
            guid,
            receiver_wechat_id,
            fallback=None,
        )
        if is_group or is_internal_chat:
            peer_display_name = None
        else:
            peer_display_name = (
                peer_wechat_name
                or safe_str(raw_message.get("peer_display_name"))
                or self.contact_sync_service.resolve_contact_display_name(
                    guid,
                    peer_wechat_id,
                    fallback=None,
                )
            )
        send_time = raw_message.get("sendtime") or raw_message.get("event_time")

        sender_alias = safe_str(raw_message.get("sender_alias")) or None
        quote_fields = self._resolve_quote_fields(raw_event_table, raw_message)

        return {
            "guid": guid,
            "conversation_type": conversation_type,
            "message_origin_type": message_origin_type,
            "my_wechat_id": my_wechat_id,
            "my_wechat_name": my_wechat_name,
            "peer_wechat_id": peer_wechat_id,
            "peer_wechat_name": peer_wechat_name,
            "peer_name_tokens": peer_name_tokens,
            "room_username": room_username,
            "conversation_name": conversation_name,
            "conversation_identity_type": conversation_identity_type,
            "forward_batch_key": forward_batch_key,
            "is_internal_chat": is_internal_chat,
            "sender_wechat_id": sender_wechat_id,
            "sender_display_name": sender_display_name,
            "sender_alias": sender_alias,
            "receiver_wechat_id": receiver_wechat_id,
            "receiver_display_name": receiver_display_name,
            "peer_display_name": peer_display_name,
            "room_name": room_name,
            "room_remark_name": room_remark_name,
            "msg_type": safe_int(raw_message.get("msg_type"), default=safe_int(raw_message.get("content_type"))),
            "content": raw_message.get("content"),
            "send_time": send_time,
            "raw_msg_id": safe_str(raw_message.get("msg_id")) or None,
            "remote_media_url": safe_str(raw_message.get("remote_media_url")) or None,
            "local_media_path": safe_str(raw_message.get("local_media_path")) or None,
            "voice_trans_text": safe_str(raw_message.get("voice_trans_text")) or None,
            "quote_content": quote_fields["quote_content"],
            "quote_msg_type": quote_fields["quote_msg_type"],
            "quote_remote_media_url": quote_fields["quote_remote_media_url"],
            "quote_file_name": quote_fields["quote_file_name"],
            "forwarded_record": forwarded_record,
        }

    def _resolve_quote_fields(
        self,
        raw_event_table: str,
        raw_message: dict[str, Any],
    ) -> dict[str, Any]:
        quote_content = safe_str(raw_message.get("quote_content")) or None
        quote_appinfo = self._parse_json_object(raw_message.get("quote_appinfo"))
        quote_msg_type = self._resolve_quote_msg_type_from_metadata(quote_appinfo)
        quote_remote_media_url = None
        quote_file_name = safe_str(quote_appinfo.get("file_name")) or extract_file_name_from_message_content(
            quote_content
        )

        referenced_raw_message = self._find_quote_referenced_raw_message(raw_event_table, quote_appinfo)
        if referenced_raw_message:
            quote_content = quote_content or safe_str(referenced_raw_message.get("content")) or None
            quote_msg_type = safe_optional_int(referenced_raw_message.get("msg_type")) or safe_optional_int(
                referenced_raw_message.get("content_type")
            ) or quote_msg_type
            quote_remote_media_url = safe_str(referenced_raw_message.get("remote_media_url")) or None
            quote_file_name = quote_file_name or extract_file_name_from_message_content(
                referenced_raw_message.get("content")
            )

        return {
            "quote_content": quote_content,
            "quote_msg_type": quote_msg_type,
            "quote_remote_media_url": quote_remote_media_url,
            "quote_file_name": quote_file_name,
        }

    def _find_quote_referenced_raw_message(
        self,
        raw_event_table: str,
        quote_appinfo: dict[str, Any],
    ) -> dict[str, Any] | None:
        if raw_event_table not in SUPPORTED_RAW_EVENT_TABLES:
            return None
        for raw_msg_id in self._extract_quote_reference_msg_ids(quote_appinfo):
            row = self.supabase.select_one(
                raw_event_table,
                columns="msg_id,msg_type,content_type,content,remote_media_url",
                filters={"msg_id": f"eq.{raw_msg_id}"},
            )
            if row:
                return row
        return None

    @staticmethod
    def _parse_json_object(value: Any) -> dict[str, Any]:
        if isinstance(value, dict):
            return value
        text = safe_str(value)
        if not text:
            return {}
        try:
            parsed = json.loads(text)
        except Exception:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @classmethod
    def _extract_quote_reference_msg_ids(cls, quote_appinfo: dict[str, Any]) -> list[str]:
        ids: list[str] = []
        refer_svrid = safe_str(quote_appinfo.get("refer_svrid"))
        if refer_svrid:
            ids.append(refer_svrid)
        records = quote_appinfo.get("records")
        if isinstance(records, list):
            for item in records:
                if not isinstance(item, dict):
                    continue
                refer_msg_item = item.get("refermsgitem")
                if not isinstance(refer_msg_item, dict):
                    continue
                nested_svrid = safe_str(refer_msg_item.get("svrid"))
                if nested_svrid:
                    ids.append(nested_svrid)
        seen: set[str] = set()
        deduped: list[str] = []
        for value in ids:
            if value in seen:
                continue
            seen.add(value)
            deduped.append(value)
        return deduped

    @staticmethod
    def _resolve_quote_msg_type_from_metadata(quote_appinfo: dict[str, Any]) -> int | None:
        refer_type = safe_optional_int(quote_appinfo.get("refer_type"))
        if refer_type is not None:
            return refer_type

        message_kind = safe_str(quote_appinfo.get("message_kind"))
        if message_kind == "image":
            return 3
        if message_kind == "voice":
            return 34
        if message_kind == "video":
            return 43
        if message_kind == "emoji":
            return 47

        app_type = safe_optional_int(quote_appinfo.get("app_type"))
        if app_type in (6, 74):
            return 49
        return None

    def _build_projected_messages(
        self,
        raw_event_dedupe_key: str,
        message_context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        forwarded_record = message_context.get("forwarded_record")
        if not isinstance(forwarded_record, dict):
            return [{"raw_event_dedupe_key": raw_event_dedupe_key, "message_context": message_context}]
        if message_context.get("conversation_type") != "private":
            return [{"raw_event_dedupe_key": raw_event_dedupe_key, "message_context": message_context}]
        if message_context.get("message_origin_type") not in {"group_forward", "private_forward"}:
            return [{"raw_event_dedupe_key": raw_event_dedupe_key, "message_context": message_context}]

        forwarded_messages = forwarded_record.get("record_messages")
        if not isinstance(forwarded_messages, list):
            return [{"raw_event_dedupe_key": raw_event_dedupe_key, "message_context": message_context}]

        projected_messages: list[dict[str, Any]] = []
        for index, item in enumerate(forwarded_messages):
            if not isinstance(item, dict):
                continue
            sender_name = safe_str(item.get("sender_name")) or None
            content = safe_str(item.get("content")) or None
            if not content:
                continue
            datatype = safe_optional_int(item.get("datatype"))
            projected_context = dict(message_context)
            projected_context["content"] = content
            projected_context["sender_wechat_id"] = None
            projected_context["sender_display_name"] = sender_name or message_context.get("sender_display_name")
            projected_context["sender_alias"] = None
            if datatype == 2:
                projected_context["msg_type"] = 3
                projected_context["remote_media_url"] = self._try_download_forwarded_image_url(
                    guid=safe_str(message_context.get("guid")),
                    username=safe_str(message_context.get("sender_wechat_id")),
                    room_username=safe_str(message_context.get("room_username")),
                    media_meta=item.get("media_meta"),
                ) or None
            projected_messages.append(
                {
                    "raw_event_dedupe_key": self._build_projected_message_dedupe_key(raw_event_dedupe_key, index),
                    "message_context": projected_context,
                }
            )
        if projected_messages:
            return projected_messages
        return [{"raw_event_dedupe_key": raw_event_dedupe_key, "message_context": message_context}]

    def _try_download_forwarded_image_url(
        self,
        *,
        guid: str,
        username: str,
        room_username: str,
        media_meta: Any,
    ) -> str | None:
        if not guid or not isinstance(media_meta, dict):
            return None

        cdn_data_url = safe_str(media_meta.get("cdn_data_url"))
        cdn_data_key = safe_str(media_meta.get("cdn_data_key"))
        cdn_thumb_url = safe_str(media_meta.get("cdn_thumb_url"))
        cdn_thumb_key = safe_str(media_meta.get("cdn_thumb_key"))
        if not ((cdn_data_url and cdn_data_key) or (cdn_thumb_url and cdn_thumb_key)):
            return None

        try:
            cdn_state = self.cdn_state_service.get_or_refresh_cdn_state(
                guid=guid,
                username=username,
                room_username=room_username,
            )
            result = self.cloud_client.download_wx_image(
                {
                    "base_request": {
                        "cdn_info": cdn_state.get("cdn_info"),
                        "client_version": cdn_state.get("client_version"),
                        "device_type": cdn_state.get("device_type"),
                        "username": cdn_state.get("username") or username,
                    },
                    "cdn_data_url": cdn_data_url or None,
                    "cdn_data_key": cdn_data_key or None,
                    "cdn_thumb_url": cdn_thumb_url or None,
                    "cdn_thumb_key": cdn_thumb_key or None,
                }
            )
            return safe_str(
                result.get("url")
                or result.get("download_url")
                or result.get("remote_media_url")
            ) or None
        except Exception:
            logger.exception("forwarded image download failed guid=%s username=%s", guid, username)
            return None

    def _list_existing_projected_messages(
        self,
        raw_event_table: str,
        raw_event_dedupe_key: str,
        *,
        include_expanded: bool,
    ) -> list[dict[str, Any]]:
        filters: dict[str, str] = {"raw_event_table": f"eq.{raw_event_table}"}
        if include_expanded:
            filters["or"] = (
                f"(raw_event_dedupe_key.eq.{raw_event_dedupe_key},"
                f"raw_event_dedupe_key.like.{raw_event_dedupe_key}__forward_line__*)"
            )
        else:
            filters["raw_event_dedupe_key"] = f"eq.{raw_event_dedupe_key}"
        return self.supabase.select(
            "crm_wx_message",
            columns="id,raw_event_dedupe_key",
            filters=filters,
        )

    def _upsert_conversation(self, message_context: dict[str, Any]) -> dict[str, Any]:
        now_iso = utc_now_iso()
        matched_conversation = self._find_existing_private_conversation(message_context)
        if matched_conversation:
            merged_peer_name_tokens = self._merge_name_tokens(
                matched_conversation.get("peer_name_tokens"),
                message_context.get("peer_name_tokens"),
            )
            merged_peer_wechat_name = self._join_name_tokens(merged_peer_name_tokens)
            message_context["peer_name_tokens"] = merged_peer_name_tokens
            message_context["peer_wechat_name"] = merged_peer_wechat_name
            if merged_peer_wechat_name:
                message_context["conversation_name"] = merged_peer_wechat_name
                message_context["peer_display_name"] = merged_peer_wechat_name

        conversation_key = safe_str(matched_conversation.get("conversation_key")) if matched_conversation else ""
        if not conversation_key:
            conversation_key = self._build_conversation_key(
                guid=message_context["guid"],
                conversation_type=message_context["conversation_type"],
                conversation_identity_type=message_context.get("conversation_identity_type"),
                my_wechat_id=message_context["my_wechat_id"],
                my_wechat_name=message_context.get("my_wechat_name"),
                peer_wechat_id=message_context["peer_wechat_id"],
                peer_wechat_name=message_context.get("peer_wechat_name"),
                peer_name_tokens=message_context.get("peer_name_tokens"),
                room_username=message_context["room_username"],
                room_name=message_context.get("room_name"),
                forward_batch_key=message_context.get("forward_batch_key"),
                is_internal_chat=bool(message_context.get("is_internal_chat")),
            )
        rows = self.supabase.upsert(
            "crm_wx_conversation",
            {
                "conversation_key": conversation_key,
                "source_guid": message_context["guid"],
                "conversation_type": message_context["conversation_type"],
                "my_wechat_id": message_context["my_wechat_id"],
                "my_wechat_name": message_context.get("my_wechat_name"),
                "peer_wechat_id": message_context["peer_wechat_id"],
                "peer_wechat_name": message_context.get("peer_wechat_name"),
                "peer_name_tokens": self._clean_name_tokens(message_context.get("peer_name_tokens")),
                "room_username": message_context["room_username"],
                "conversation_name": message_context["conversation_name"],
                "conversation_identity_type": message_context.get("conversation_identity_type") or "private_direct",
                "forward_batch_key": message_context.get("forward_batch_key"),
                "is_internal_chat": bool(message_context.get("is_internal_chat")),
                "room_name": message_context["room_name"],
                "room_remark_name": message_context["room_remark_name"],
                "status": "active",
                "updated_at": now_iso,
            },
            on_conflict="conversation_key",
            returning="representation",
        )
        if not rows:
            raise RuntimeError(f"failed to upsert crm_wx_conversation key={conversation_key}")
        return rows[0]

    def _upsert_message(
        self,
        conversation_id: int,
        raw_event_table: str,
        raw_event_dedupe_key: str,
        message_context: dict[str, Any],
    ) -> dict[str, Any]:
        now_iso = utc_now_iso()
        rows = self.supabase.upsert(
            "crm_wx_message",
            {
                "conversation_id": conversation_id,
                "source_guid": message_context["guid"],
                "message_scope": message_context["conversation_type"],
                "message_origin_type": message_context.get("message_origin_type") or "unknown",
                "raw_event_table": raw_event_table,
                "raw_event_dedupe_key": raw_event_dedupe_key,
                "raw_msg_id": message_context["raw_msg_id"],
                "sender_wechat_id": message_context["sender_wechat_id"],
                "sender_display_name": message_context["sender_display_name"],
                "sender_alias": message_context["sender_alias"],
                "receiver_wechat_id": message_context["receiver_wechat_id"],
                "receiver_display_name": message_context["receiver_display_name"],
                "peer_display_name": message_context["peer_display_name"],
                "forward_batch_key": message_context.get("forward_batch_key"),
                "room_username": message_context["room_username"],
                "room_name": message_context["room_name"],
                "room_remark_name": message_context["room_remark_name"],
                "msg_type": message_context["msg_type"],
                "content": message_context["content"],
                "quote_content": message_context["quote_content"],
                "quote_msg_type": message_context["quote_msg_type"],
                "quote_remote_media_url": message_context["quote_remote_media_url"],
                "quote_file_name": message_context["quote_file_name"],
                "send_time": message_context["send_time"],
                "remote_media_url": message_context["remote_media_url"],
                "local_media_path": message_context["local_media_path"],
                "voice_trans_text": message_context["voice_trans_text"],
                "updated_at": now_iso,
            },
            on_conflict="raw_event_table,raw_event_dedupe_key",
            returning="representation",
        )
        if not rows:
            raise RuntimeError(
                "failed to upsert crm_wx_message "
                f"table={raw_event_table} dedupe_key={raw_event_dedupe_key}"
            )
        return rows[0]

    def _update_conversation_summary(
        self,
        conversation_id: int,
        last_message_id: int,
        message_context: dict[str, Any],
        *,
        new_message_count_delta: int,
    ) -> None:
        conversation = self.supabase.select_one(
            "crm_wx_conversation",
            columns="id,last_message_at,message_count",
            filters={"id": f"eq.{conversation_id}"},
        ) or {}
        current_last_message_at = parse_iso_datetime(conversation.get("last_message_at"))
        candidate_last_message_at = parse_iso_datetime(message_context.get("send_time"))
        should_replace_last = current_last_message_at is None
        if candidate_last_message_at is not None and current_last_message_at is not None:
            should_replace_last = candidate_last_message_at >= current_last_message_at
        if candidate_last_message_at is not None and current_last_message_at is None:
            should_replace_last = True

        values: dict[str, Any] = {
            "conversation_name": message_context["conversation_name"],
            "room_name": message_context["room_name"],
            "room_remark_name": message_context["room_remark_name"],
            "my_wechat_name": message_context.get("my_wechat_name"),
            "peer_wechat_name": message_context.get("peer_wechat_name"),
            "peer_name_tokens": self._clean_name_tokens(message_context.get("peer_name_tokens")),
            "conversation_identity_type": message_context.get("conversation_identity_type") or "private_direct",
            "forward_batch_key": message_context.get("forward_batch_key"),
            "is_internal_chat": bool(message_context.get("is_internal_chat")),
            "updated_at": utc_now_iso(),
        }
        if new_message_count_delta:
            values["message_count"] = max(0, safe_int(conversation.get("message_count")) + new_message_count_delta)
        if should_replace_last:
            values["last_message_id"] = last_message_id
            values["last_message_at"] = message_context.get("send_time")
            values["last_message_preview"] = build_message_preview(
                message_context.get("content"),
                message_context.get("msg_type"),
            )
        self.supabase.update(
            "crm_wx_conversation",
            values,
            filters={"id": f"eq.{conversation_id}"},
        )

    def _sync_private_members(
        self,
        conversation_id: int,
        guid: str,
        my_wechat_id: str | None,
        peer_wechat_id: str | None,
        peer_display_name: str | None,
    ) -> None:
        now_iso = utc_now_iso()
        rows: list[dict[str, Any]] = []
        clean_my_wechat_id = safe_str(my_wechat_id)
        clean_peer_wechat_id = safe_str(peer_wechat_id)
        if clean_my_wechat_id:
            rows.append(
                {
                    "conversation_id": conversation_id,
                    "wechat_id": clean_my_wechat_id,
                    "display_name": self.contact_sync_service.resolve_contact_display_name(
                        guid,
                        clean_my_wechat_id,
                        fallback=clean_my_wechat_id,
                    ),
                    "member_type": "employee",
                    "contact_id": None,
                    "employee_id": None,
                    "is_internal": True,
                    "updated_at": now_iso,
                }
            )
        if clean_peer_wechat_id:
            rows.append(
                {
                    "conversation_id": conversation_id,
                    "wechat_id": clean_peer_wechat_id,
                    "display_name": peer_display_name
                    or self.contact_sync_service.resolve_contact_display_name(
                        guid,
                        clean_peer_wechat_id,
                        fallback=clean_peer_wechat_id,
                    ),
                    "member_type": "external_unknown",
                    "contact_id": None,
                    "employee_id": None,
                    "is_internal": False,
                    "updated_at": now_iso,
                }
            )
        if rows:
            self.supabase.upsert(
                "crm_wx_conversation_member",
                rows,
                on_conflict="conversation_id,wechat_id",
            )

    def _sync_group_members(
        self,
        conversation: dict[str, Any],
        guid: str,
        room_username: str | None,
        my_wechat_id: str | None,
        sender_wechat_id: str | None,
        sender_display_name: str | None,
    ) -> None:
        conversation_id = safe_int(conversation.get("id"))
        if not conversation_id:
            return
        clean_room_username = safe_str(room_username)
        if not clean_room_username:
            return

        conversation_state = self.supabase.select_one(
            "crm_wx_conversation",
            columns="id,last_member_sync_version,last_member_synced_at",
            filters={"id": f"eq.{conversation_id}"},
        ) or {}
        chatroom_state = self.supabase.select_one(
            "wechat_raw.wechat_chatrooms",
            columns="member_version",
            filters={
                "guid": f"eq.{guid}",
                "room_username": f"eq.{clean_room_username}",
                "is_deleted": "is.false",
            },
        ) or {}

        current_version = safe_int(chatroom_state.get("member_version"))
        last_member_sync_version = safe_int(conversation_state.get("last_member_sync_version"))
        last_member_synced_at = conversation_state.get("last_member_synced_at")
        needs_full_sync = not last_member_synced_at or current_version != last_member_sync_version

        if needs_full_sync:
            full_sync_member_ids = self._sync_all_group_members(
                conversation_id,
                guid,
                clean_room_username,
                my_wechat_id,
            )
            if full_sync_member_ids is not None:
                now_iso = utc_now_iso()
                self.supabase.update(
                    "crm_wx_conversation",
                    {
                        "last_member_sync_version": current_version,
                        "last_member_synced_at": now_iso,
                        "updated_at": now_iso,
                    },
                    filters={"id": f"eq.{conversation_id}"},
                )
                self._upsert_group_participant_members(
                    conversation_id,
                    guid,
                    clean_room_username,
                    my_wechat_id,
                    sender_wechat_id,
                    sender_display_name,
                    known_member_ids=full_sync_member_ids,
                )
                return

        self._upsert_group_participant_members(
            conversation_id,
            guid,
            clean_room_username,
            my_wechat_id,
            sender_wechat_id,
            sender_display_name,
        )

    def _sync_all_group_members(
        self,
        conversation_id: int,
        guid: str,
        room_username: str,
        my_wechat_id: str | None,
    ) -> set[str] | None:
        members = self.supabase.select(
            "wechat_raw.wechat_chatroom_members",
            columns="username,nickname,display_name",
            filters={
                "guid": f"eq.{guid}",
                "room_username": f"eq.{room_username}",
                "is_deleted": "is.false",
            },
            order="updated_at.desc",
        )
        if not members:
            return None

        now_iso = utc_now_iso()
        rows: list[dict[str, Any]] = []
        seen_wechat_ids: set[str] = set()
        clean_my_wechat_id = safe_str(my_wechat_id)
        for member in members:
            wechat_id = safe_str(member.get("username"))
            if not wechat_id or wechat_id in seen_wechat_ids:
                continue
            seen_wechat_ids.add(wechat_id)
            display_name = safe_str(member.get("display_name")) or safe_str(member.get("nickname")) or self.contact_sync_service.resolve_contact_display_name(
                guid,
                wechat_id,
                fallback=wechat_id,
            )
            rows.append(
                {
                    "conversation_id": conversation_id,
                    "wechat_id": wechat_id,
                    "display_name": display_name,
                    "member_type": "employee" if clean_my_wechat_id and wechat_id == clean_my_wechat_id else "external_unknown",
                    "contact_id": None,
                    "employee_id": None,
                    "is_internal": bool(clean_my_wechat_id and wechat_id == clean_my_wechat_id),
                    "updated_at": now_iso,
                }
            )

        if not rows:
            return None

        self.supabase.upsert(
            "crm_wx_conversation_member",
            rows,
            on_conflict="conversation_id,wechat_id",
        )
        return seen_wechat_ids

    def _upsert_group_participant_members(
        self,
        conversation_id: int,
        guid: str,
        room_username: str,
        my_wechat_id: str | None,
        sender_wechat_id: str | None,
        sender_display_name: str | None,
        *,
        known_member_ids: set[str] | None = None,
    ) -> None:
        now_iso = utc_now_iso()
        rows: list[dict[str, Any]] = []
        known_ids = set(known_member_ids or set())
        clean_sender_wechat_id = safe_str(sender_wechat_id)
        clean_my_wechat_id = safe_str(my_wechat_id)

        if clean_sender_wechat_id and clean_sender_wechat_id not in known_ids:
            sender_is_internal = bool(clean_my_wechat_id and clean_sender_wechat_id == clean_my_wechat_id)
            rows.append(
                {
                    "conversation_id": conversation_id,
                    "wechat_id": clean_sender_wechat_id,
                    "display_name": safe_str(sender_display_name)
                    or self.contact_sync_service.resolve_chatroom_member_display_name(
                        guid,
                        room_username,
                        clean_sender_wechat_id,
                        fallback=clean_sender_wechat_id,
                    ),
                    "member_type": "employee" if sender_is_internal else "external_unknown",
                    "contact_id": None,
                    "employee_id": None,
                    "is_internal": sender_is_internal,
                    "updated_at": now_iso,
                }
            )

        if clean_my_wechat_id and clean_my_wechat_id not in known_ids and clean_my_wechat_id != clean_sender_wechat_id:
            rows.append(
                {
                    "conversation_id": conversation_id,
                    "wechat_id": clean_my_wechat_id,
                    "display_name": self.contact_sync_service.resolve_contact_display_name(
                        guid,
                        clean_my_wechat_id,
                        fallback=clean_my_wechat_id,
                    ),
                    "member_type": "employee",
                    "contact_id": None,
                    "employee_id": None,
                    "is_internal": True,
                    "updated_at": now_iso,
                }
            )

        if rows:
            self.supabase.upsert(
                "crm_wx_conversation_member",
                rows,
                on_conflict="conversation_id,wechat_id",
            )

    def _complete_job(self, job: dict[str, Any]) -> None:
        self.supabase.update(
            "crm_wx_projection_jobs",
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
            "crm_wx_projection_jobs",
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

    def _ensure_tables(self, tables: tuple[str, ...]) -> None:
        if tables in self._validated_table_groups:
            return
        assert_tables_exist(self.supabase, tables)
        self._validated_table_groups.add(tables)

    @staticmethod
    def _build_conversation_key(
        *,
        guid: str,
        conversation_type: str,
        conversation_identity_type: str | None,
        my_wechat_id: str | None,
        my_wechat_name: str | None,
        peer_wechat_id: str | None,
        peer_wechat_name: str | None,
        peer_name_tokens: list[str] | None,
        room_username: str | None,
        room_name: str | None,
        forward_batch_key: str | None,
        is_internal_chat: bool,
    ) -> str:
        if conversation_type == "group":
            group_fragment = CrmWxProjectionService._normalize_key_fragment(room_username) or CrmWxProjectionService._normalize_key_fragment(room_name) or "_"
            return f"group:{guid}:{group_fragment}"
        owner_fragment = (
            CrmWxProjectionService._normalize_key_fragment(my_wechat_id)
            or CrmWxProjectionService._normalize_key_fragment(my_wechat_name)
            or "_"
        )
        if is_internal_chat or safe_str(conversation_identity_type) == "private_internal":
            return f"private_internal:{guid}:{owner_fragment}"
        if safe_str(conversation_identity_type) == "private_forward_batch":
            batch_fragment = CrmWxProjectionService._normalize_key_fragment(forward_batch_key) or "_"
            return f"private_forward_batch:{guid}:{owner_fragment}:{batch_fragment}"
        my_fragment = CrmWxProjectionService._normalize_key_fragment(my_wechat_id)
        peer_fragment = CrmWxProjectionService._normalize_key_fragment(peer_wechat_id)
        if my_fragment or peer_fragment:
            return f"private:{guid}:{my_fragment}:{peer_fragment}"
        return (
            f"private_name:{guid}:"
            f"{CrmWxProjectionService._normalize_key_fragment(my_wechat_name)}:"
            f"{CrmWxProjectionService._normalize_key_fragment(peer_wechat_name)}"
        )

    @staticmethod
    def _normalize_key_fragment(value: str | None) -> str:
        clean_value = safe_str(value).lower()
        if not clean_value:
            return ""
        clean_value = re.sub(r"\s+", "", clean_value)
        return clean_value

    @staticmethod
    def _build_job_dedupe_key(raw_event_table: str, raw_event_dedupe_key: str, reason: str) -> str:
        return f"project_message:{reason}:{raw_event_table}:{raw_event_dedupe_key}"

    @staticmethod
    def _build_projected_message_dedupe_key(raw_event_dedupe_key: str, index: int) -> str:
        if index <= 0:
            return raw_event_dedupe_key
        return f"{raw_event_dedupe_key}__forward_line__{index + 1}"

    @staticmethod
    def _build_forward_batch_key(raw_event_dedupe_key: str) -> str | None:
        return safe_str(raw_event_dedupe_key) or None

    @staticmethod
    def _normalize_person_name_key(value: str | None) -> str:
        return re.sub(r"\s+", "", safe_str(value)).lower()

    @classmethod
    def _clean_name_tokens(cls, values: Any) -> list[str]:
        raw_items: list[Any]
        if isinstance(values, list):
            raw_items = values
        elif isinstance(values, tuple):
            raw_items = list(values)
        elif isinstance(values, str):
            raw_items = values.split("/")
        else:
            raw_items = []
        items: list[str] = []
        seen: set[str] = set()
        for raw_item in raw_items:
            clean_name = safe_str(raw_item)
            normalized_name = cls._normalize_person_name_key(clean_name)
            if not normalized_name or normalized_name in seen:
                continue
            seen.add(normalized_name)
            items.append(clean_name)
        return items

    @classmethod
    def _merge_name_tokens(cls, left: Any, right: Any) -> list[str]:
        return cls._clean_name_tokens([*cls._clean_name_tokens(left), *cls._clean_name_tokens(right)])

    @classmethod
    def _join_name_tokens(cls, values: Any) -> str | None:
        items = cls._clean_name_tokens(values)
        if not items:
            return None
        return "/".join(items)

    @staticmethod
    def _has_contact_identity(contact_names: dict[str, str | None]) -> bool:
        return any(
            safe_str(contact_names.get(field))
            for field in ("nickname", "remark", "alias")
        )

    @classmethod
    def _build_my_wechat_display_name(
        cls,
        contact_names: dict[str, str | None],
        *,
        fallback: str | None,
    ) -> str | None:
        nickname = safe_str(contact_names.get("nickname"))
        remark = safe_str(contact_names.get("remark"))
        alias = safe_str(contact_names.get("alias"))
        if nickname and remark:
            return f"{nickname}({remark})"
        return nickname or remark or alias or safe_str(fallback) or None

    @classmethod
    def _collect_forwarded_sender_names(cls, forwarded_record: Any) -> list[str]:
        if not isinstance(forwarded_record, dict):
            return []
        messages = forwarded_record.get("record_messages")
        if not isinstance(messages, list):
            return []
        names: list[str] = []
        seen: set[str] = set()
        for item in messages:
            if not isinstance(item, dict):
                continue
            sender_name = safe_str(item.get("sender_name"))
            if not sender_name:
                continue
            normalized_name = cls._normalize_person_name_key(sender_name)
            if not normalized_name or normalized_name in seen:
                continue
            seen.add(normalized_name)
            names.append(sender_name)
        return names

    @classmethod
    def _collect_forwarded_private_participant_names(cls, forwarded_record: Any) -> list[str]:
        if not isinstance(forwarded_record, dict):
            return []
        names: list[str] = []
        seen: set[str] = set()
        for key in ("my_wechat_name", "peer_wechat_name"):
            candidate = safe_str(forwarded_record.get(key))
            normalized_name = cls._normalize_person_name_key(candidate)
            if not normalized_name or normalized_name in seen:
                continue
            seen.add(normalized_name)
            names.append(candidate)
        return names

    @classmethod
    def _extract_forwarded_self_candidates(
        cls,
        forwarded_record: Any,
        *,
        my_name_candidates: set[str],
    ) -> set[str]:
        base_keys = {
            cls._normalize_person_name_key(name)
            for name in my_name_candidates
            if safe_str(name)
        }
        matched_names: set[str] = set()
        if not isinstance(forwarded_record, dict) or not base_keys:
            return matched_names
        for candidate in cls._collect_forwarded_private_participant_names(forwarded_record):
            normalized_name = cls._normalize_person_name_key(candidate)
            if normalized_name and normalized_name in base_keys:
                matched_names.add(candidate)
        return matched_names

    @classmethod
    def _extract_forwarded_customer_tokens(
        cls,
        forwarded_record: Any,
        *,
        my_name_candidates: set[str],
    ) -> list[str]:
        my_name_keys = {
            cls._normalize_person_name_key(name)
            for name in my_name_candidates
            if safe_str(name)
        }
        candidates = [
            *cls._collect_forwarded_sender_names(forwarded_record),
            *cls._collect_forwarded_private_participant_names(forwarded_record),
        ]
        customer_names: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            clean_name = safe_str(candidate)
            normalized_name = cls._normalize_person_name_key(clean_name)
            if not normalized_name or normalized_name in my_name_keys or normalized_name in seen:
                continue
            seen.add(normalized_name)
            customer_names.append(clean_name)
        return customer_names

    @classmethod
    def _is_same_private_owner(
        cls,
        *,
        current_my_wechat_id: str | None,
        current_my_wechat_name: str | None,
        candidate_my_wechat_id: Any,
        candidate_my_wechat_name: Any,
    ) -> bool:
        current_id_key = cls._normalize_key_fragment(current_my_wechat_id)
        candidate_id_key = cls._normalize_key_fragment(candidate_my_wechat_id)
        if current_id_key and candidate_id_key:
            return current_id_key == candidate_id_key
        current_name_key = cls._normalize_person_name_key(current_my_wechat_name)
        candidate_name_key = cls._normalize_person_name_key(candidate_my_wechat_name)
        return bool(current_name_key and candidate_name_key and current_name_key == candidate_name_key)

    def _find_existing_private_conversation(self, message_context: dict[str, Any]) -> dict[str, Any] | None:
        if message_context.get("conversation_type") != "private":
            return None
        if safe_str(message_context.get("conversation_identity_type")) != "private_forward_batch":
            return None
        incoming_tokens = self._clean_name_tokens(message_context.get("peer_name_tokens"))
        if not incoming_tokens:
            return None

        rows = self.supabase.select(
            "crm_wx_conversation",
            columns=(
                "id,conversation_key,my_wechat_id,my_wechat_name,peer_name_tokens,"
                "conversation_identity_type,forward_batch_key,is_internal_chat,last_message_at"
            ),
            filters={
                "source_guid": f"eq.{message_context['guid']}",
                "conversation_type": "eq.private",
                "is_internal_chat": "eq.false",
            },
            order="last_message_at.desc",
        )
        incoming_keys = {
            self._normalize_person_name_key(name)
            for name in incoming_tokens
            if safe_str(name)
        }
        for row in rows:
            if not self._is_same_private_owner(
                current_my_wechat_id=message_context.get("my_wechat_id"),
                current_my_wechat_name=message_context.get("my_wechat_name"),
                candidate_my_wechat_id=row.get("my_wechat_id"),
                candidate_my_wechat_name=row.get("my_wechat_name"),
            ):
                continue
            candidate_tokens = self._clean_name_tokens(row.get("peer_name_tokens"))
            candidate_keys = {
                self._normalize_person_name_key(name)
                for name in candidate_tokens
                if safe_str(name)
            }
            # 严格按“客户集合完全一致”匹配会话：
            # 1 客户只匹配 1 客户；2 客户只匹配 2 客户；3 客户只匹配 3 客户。
            if incoming_keys == candidate_keys:
                return row
        return None

    @classmethod
    def _build_forwarded_customer_names(
        cls,
        sender_names: list[str],
        *,
        my_name_candidates: set[str],
        fallback: str | None,
    ) -> str | None:
        my_name_keys = {
            cls._normalize_person_name_key(name)
            for name in my_name_candidates
            if safe_str(name)
        }
        customer_names: list[str] = []
        seen: set[str] = set()
        for sender_name in sender_names:
            clean_name = safe_str(sender_name)
            normalized_name = cls._normalize_person_name_key(clean_name)
            if not normalized_name or normalized_name in my_name_keys or normalized_name in seen:
                continue
            seen.add(normalized_name)
            customer_names.append(clean_name)
        if customer_names:
            return "/".join(customer_names)
        return safe_str(fallback) or None

    @classmethod
    def _build_forwarded_counterparty_fallback(
        cls,
        forwarded_record: Any,
        *,
        my_name_candidates: set[str],
        fallback: str | None,
    ) -> str | None:
        names: list[str] = []
        seen: set[str] = set()
        my_name_keys = {
            cls._normalize_person_name_key(name)
            for name in my_name_candidates
            if safe_str(name)
        }
        if isinstance(forwarded_record, dict):
            for key in ("my_wechat_name", "peer_wechat_name"):
                candidate = safe_str(forwarded_record.get(key))
                normalized_candidate = cls._normalize_person_name_key(candidate)
                if not normalized_candidate or normalized_candidate in my_name_keys or normalized_candidate in seen:
                    continue
                seen.add(normalized_candidate)
                names.append(candidate)
        clean_fallback = safe_str(fallback)
        normalized_fallback = cls._normalize_person_name_key(clean_fallback)
        if clean_fallback and normalized_fallback and normalized_fallback not in my_name_keys and normalized_fallback not in seen:
            names.append(clean_fallback)
        if names:
            return "/".join(names)
        return None

    @staticmethod
    def _build_in_filter(values: list[int]) -> str:
        return f"in.({','.join(str(value) for value in values)})"
