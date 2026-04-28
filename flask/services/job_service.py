import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from clients.supabase_client import SupabaseClient
from config import ROUTE_CONFIG, Settings
from parsers.xml_parser import (
    get_payload_data_dict,
    get_raw_xml_from_payload,
    get_wechat_canonical_msg_id,
    parse_media_download_info,
    safe_int,
    safe_str,
)
from services.schema_guard import assert_tables_exist


logger = logging.getLogger(__name__)

JOB_QUEUE_TABLES = ("wechat_raw.message_media_jobs",)
WORKER_REQUIRED_TABLES = ("wechat_raw.message_media_jobs", "wechat_raw.message_media_results")


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


def get_message_id(data: dict) -> str | None:
    return get_wechat_canonical_msg_id(data)


def get_room_username(data: dict) -> str:
    return safe_str(data.get("chatroom") or data.get("room_username") or data.get("roomid") or "") or ""


def get_sender_username(data: dict) -> str:
    is_chatroom_msg = safe_int(data.get("is_chatroom_msg"))
    if is_chatroom_msg == 1 and data.get("chatroom_sender"):
        return safe_str(data.get("chatroom_sender")) or ""
    return safe_str(data.get("from_username") or data.get("sender") or data.get("from_user") or "") or ""


class JobService:
    def __init__(self, supabase: SupabaseClient, settings: Settings):
        self.supabase = supabase
        self.settings = settings
        self._validated_table_groups: set[tuple[str, ...]] = set()

    def enqueue_jobs_for_payload(self, payload: dict, dedupe_key: str, source: str, target_table: str | None) -> list[str]:
        if source != "wechat":
            return []
        data = get_payload_data_dict(payload)
        notify_type = safe_int(payload.get("notify_type"))
        if notify_type != ROUTE_CONFIG["wechat"]["message_notify_type"]:
            return []

        msg_type = safe_int(data.get("msg_type"))
        raw_xml = get_raw_xml_from_payload(payload)
        job_types = []
        if msg_type == 34:
            job_types.append("transcribe_voice")
        if msg_type in (3, 6, 43, 62):
            job_types.append("download_media")
        elif msg_type == 49:
            download_info = parse_media_download_info(raw_xml, msg_type)
            if download_info.get("supported"):
                job_types.append("download_media")

        if job_types:
            self._ensure_tables(JOB_QUEUE_TABLES)

        created = []
        for job_type in job_types:
            row = {
                "dedupe_key": dedupe_key,
                "job_type": job_type,
                "source": source,
                "guid": safe_str(payload.get("guid")) or "",
                "msg_id": get_message_id(data),
                "msg_type": msg_type,
                "target_table": target_table,
                "username": get_sender_username(data),
                "room_username": get_room_username(data),
                "status": "pending",
                "attempt_count": 0,
                "next_retry_at": None,
                "last_error": None,
                "raw_payload": payload,
                "raw_xml": raw_xml,
                "result_json": None,
                "created_at": utc_now_iso(),
                "updated_at": utc_now_iso(),
            }
            self.supabase.insert(
                "wechat_raw.message_media_jobs",
                row,
                on_conflict="dedupe_key,job_type",
                ignore_duplicates=True,
            )
            created.append(job_type)
        return created

    def claim_next_job(self) -> dict[str, Any] | None:
        self._ensure_tables(WORKER_REQUIRED_TABLES)
        now_iso = utc_now_iso()
        candidate_filter = f"(status.eq.pending,and(status.eq.retrying,next_retry_at.lte.{now_iso}))"
        rows = self.supabase.select(
            "wechat_raw.message_media_jobs",
            filters={"or": candidate_filter},
            order="created_at.asc",
            limit=1,
        )
        if not rows:
            return None

        job = rows[0]
        claimed_rows = self.supabase.update(
            "wechat_raw.message_media_jobs",
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

        refreshed_rows = self.supabase.select(
            "wechat_raw.message_media_jobs",
            filters={"id": f"eq.{job['id']}", "status": "eq.processing"},
            limit=1,
        )
        if not refreshed_rows:
            return None
        return refreshed_rows[0]

    def recover_stale_processing_jobs(self) -> int:
        self._ensure_tables(WORKER_REQUIRED_TABLES)
        rows = self.supabase.select(
            "wechat_raw.message_media_jobs",
            filters={"status": "eq.processing"},
            order="processing_started_at.asc",
            limit=200,
        )
        if not rows:
            return 0

        now = datetime.now(timezone.utc)
        recovered = 0
        for row in rows:
            started_at = parse_iso_datetime(row.get("processing_started_at"))
            if started_at is not None:
                age_seconds = (now - started_at).total_seconds()
                if age_seconds < self.settings.worker_stale_processing_seconds:
                    continue
            self.supabase.update(
                "wechat_raw.message_media_jobs",
                {
                    "status": "retrying",
                    "next_retry_at": utc_now_iso(),
                    "last_error": "auto-recovered from stale processing",
                    "updated_at": utc_now_iso(),
                },
                filters={"id": f"eq.{row['id']}", "status": "eq.processing"},
            )
            recovered += 1
        return recovered

    def complete_job(
        self,
        job: dict[str, Any],
        *,
        result_json: dict[str, Any] | list[Any] | str | None,
        local_media_path: str | None = None,
        remote_media_url: str | None = None,
        voice_trans_text: str | None = None,
        media_task_status: str = "success",
    ) -> None:
        now_iso = utc_now_iso()
        self._update_message_row(
            job,
            {
                "media_task_status": media_task_status,
                "media_task_updated_at": now_iso,
                "local_media_path": local_media_path,
                "remote_media_url": remote_media_url,
                "voice_trans_text": voice_trans_text,
            },
        )
        self.supabase.upsert(
            "wechat_raw.message_media_results",
            {
                "dedupe_key": job.get("dedupe_key"),
                "job_type": job.get("job_type"),
                "job_id": job.get("id"),
                "guid": job.get("guid"),
                "msg_id": job.get("msg_id"),
                "target_table": job.get("target_table"),
                "local_media_path": local_media_path,
                "remote_media_url": remote_media_url,
                "voice_trans_text": voice_trans_text,
                "result_json": result_json,
                "created_at": now_iso,
                "updated_at": now_iso,
            },
            on_conflict="dedupe_key,job_type",
        )
        self.supabase.update(
            "wechat_raw.message_media_jobs",
            {
                "status": "success",
                "result_json": result_json,
                "next_retry_at": None,
                "processing_started_at": None,
                "updated_at": now_iso,
                "completed_at": now_iso,
                "last_error": None,
            },
            filters={"id": f"eq.{job['id']}"},
        )

    def mark_retry_or_failed(self, job: dict[str, Any], exc: Exception) -> None:
        attempt_count = safe_int(job.get("attempt_count")) or 0
        attempt_count += 1
        error_text = str(exc)
        now_iso = utc_now_iso()
        status = "failed" if attempt_count >= self.settings.worker_max_attempts else "retrying"
        next_retry_at = None if status == "failed" else build_retry_at(attempt_count)

        self.supabase.update(
            "wechat_raw.message_media_jobs",
            {
                "status": status,
                "attempt_count": attempt_count,
                "last_error": error_text,
                "next_retry_at": next_retry_at,
                "processing_started_at": None,
                "updated_at": now_iso,
            },
            filters={"id": f"eq.{job['id']}"},
        )
        self._update_message_row(
            job,
            {
                "media_task_status": status,
                "media_task_updated_at": now_iso,
            },
        )

    def update_job_progress(self, job: dict[str, Any], stage: str) -> None:
        self.supabase.update(
            "wechat_raw.message_media_jobs",
            {
                "last_error": f"processing:{stage}",
                "updated_at": utc_now_iso(),
            },
            filters={"id": f"eq.{job['id']}", "status": "eq.processing"},
        )

    def _update_message_row(self, job: dict[str, Any], values: dict[str, Any]) -> None:
        target_table = job.get("target_table")
        dedupe_key = job.get("dedupe_key")
        if not target_table or not dedupe_key:
            return
        sanitized = {key: value for key, value in values.items() if value is not None}
        if not sanitized:
            return
        self.supabase.update(
            target_table,
            sanitized,
            filters={"dedupe_key": f"eq.{dedupe_key}"},
        )

    def _ensure_tables(self, tables: tuple[str, ...]) -> None:
        if tables in self._validated_table_groups:
            return
        assert_tables_exist(self.supabase, tables)
        self._validated_table_groups.add(tables)
