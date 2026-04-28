import logging
import time
from datetime import datetime
from typing import Any

from clients.cloud_api_client import CloudApiClient
from clients.guid_request_client import GuidRequestClient
from clients.supabase_client import SupabaseClient
from clients.wechat_api_client import WechatApiClient
from config import get_settings
from parsers.xml_parser import (
    extract_voice_length_from_xml,
    get_payload_data_dict,
    get_raw_xml_from_payload,
    normalize_text,
    parse_media_download_info,
    safe_int,
)
from services.cdn_state_service import CdnStateService
from services.contact_sync_service import ContactSyncService
from services.crm_wx_projection_service import CrmWxProjectionService
from services.job_service import JobService


logger = logging.getLogger("media-worker")


def _unwrap_data(payload: Any) -> Any:
    return GuidRequestClient.unwrap_data(payload)


def _pick_value(container: Any, *keys: str):
    if isinstance(container, list):
        for item in container:
            value = _pick_value(item, *keys)
            if value not in (None, ""):
                return value
        return None
    if not isinstance(container, dict):
        return None
    for key in keys:
        value = container.get(key)
        if value not in (None, ""):
            return value
    for value in container.values():
        nested = _pick_value(value, *keys)
        if nested not in (None, ""):
            return nested
    return None


def _is_ready_response(payload: Any) -> bool:
    data = _unwrap_data(payload)
    status = _pick_value(data, "status", "state")
    if isinstance(status, str) and status.lower() in {"done", "success", "ready", "finished"}:
        return True
    if status in (1, 2, True):
        return True
    return bool(_pick_value(data, "ready", "finished", "completed"))


def _extract_query_interval_seconds(payload: Any, default: int = 2) -> int:
    data = _unwrap_data(payload)
    interval = _pick_value(data, "interval")
    try:
        if interval in (None, ""):
            return default
        return max(1, int(interval))
    except Exception:
        return default


def _extract_voice_id(payload: Any) -> str:
    data = _unwrap_data(payload)
    voice_id = _pick_value(data, "voice_id", "voiceId", "id")
    if not voice_id:
        raise RuntimeError(f"voice_id missing: {payload}")
    return str(voice_id)


def _extract_voice_text(payload: Any) -> str | None:
    data = _unwrap_data(payload)
    text = _pick_value(data, "text", "voice_text", "voiceText", "trans_text", "content", "result")
    if not text:
        return None
    return normalize_text(text)


def _is_voice_trans_pending(payload: Any) -> bool:
    data = _unwrap_data(payload)
    end_flag = _pick_value(data, "endFlag", "end_flag")
    if end_flag not in (None, ""):
        try:
            return int(end_flag) != 1
        except Exception:
            return str(end_flag).strip().lower() not in {"1", "true", "done", "finished"}
    return _extract_query_interval_seconds(payload, default=0) > 0 and _extract_voice_text(payload) is None


def _extract_remote_media_url(payload: Any) -> str | None:
    data = _unwrap_data(payload)
    value = _pick_value(
        data,
        "url",
        "download_url",
        "remote_media_url",
        "remote_url",
        "cos_url",
        "file_url",
    )
    if value:
        return str(value)
    return None


class MediaWorker:
    def __init__(self):
        self.settings = get_settings()
        self.supabase = SupabaseClient(self.settings)
        self.guid_client = GuidRequestClient(self.settings)
        self.cloud_client = CloudApiClient(self.settings)
        self.wechat_api_client = WechatApiClient(self.settings, self.guid_client)
        self.job_service = JobService(self.supabase, self.settings)
        self.contact_sync_service = ContactSyncService(self.supabase, self.wechat_api_client, self.settings)
        self.crm_wx_projection_service = CrmWxProjectionService(self.supabase, self.contact_sync_service, self.settings)
        self.cdn_state_service = CdnStateService(self.supabase, self.guid_client)

    def run(self) -> None:
        logger.info("worker started")
        while True:
            try:
                recovered = self.job_service.recover_stale_processing_jobs()
                if recovered:
                    logger.warning("recovered stale processing jobs count=%s", recovered)
                recovered_contact_jobs = self.contact_sync_service.recover_stale_jobs()
                if recovered_contact_jobs:
                    logger.warning("recovered stale contact sync jobs count=%s", recovered_contact_jobs)
                recovered_projection_jobs = self.crm_wx_projection_service.recover_stale_jobs()
                if recovered_projection_jobs:
                    logger.warning("recovered stale crm wx projection jobs count=%s", recovered_projection_jobs)
                job = self.job_service.claim_next_job()
                if job:
                    logger.info(
                        "claimed media job id=%s job_type=%s msg_id=%s attempt_count=%s",
                        job.get("id"),
                        job.get("job_type"),
                        job.get("msg_id"),
                        job.get("attempt_count"),
                    )
                    self.process_job(job)
                    logger.info(
                        "processed media job id=%s job_type=%s msg_id=%s",
                        job.get("id"),
                        job.get("job_type"),
                        job.get("msg_id"),
                    )
                    time.sleep(self.settings.worker_task_sleep_seconds)
                    continue

                contact_job = self.contact_sync_service.claim_next_job()
                if contact_job:
                    logger.info(
                        "claimed contact sync job id=%s job_type=%s guid=%s attempt_count=%s",
                        contact_job.get("id"),
                        contact_job.get("job_type"),
                        contact_job.get("guid"),
                        contact_job.get("attempt_count"),
                    )
                    self.contact_sync_service.process_job(contact_job)
                    logger.info(
                        "processed contact sync job id=%s job_type=%s guid=%s",
                        contact_job.get("id"),
                        contact_job.get("job_type"),
                        contact_job.get("guid"),
                    )
                    time.sleep(self.settings.worker_task_sleep_seconds)
                    continue

                projection_job = self.crm_wx_projection_service.claim_next_job()
                if projection_job:
                    logger.info(
                        "claimed crm wx projection job id=%s raw_event_table=%s dedupe_key=%s attempt_count=%s",
                        projection_job.get("id"),
                        projection_job.get("raw_event_table"),
                        projection_job.get("raw_event_dedupe_key"),
                        projection_job.get("attempt_count"),
                    )
                    self.crm_wx_projection_service.process_job(projection_job)
                    logger.info(
                        "processed crm wx projection job id=%s raw_event_table=%s dedupe_key=%s",
                        projection_job.get("id"),
                        projection_job.get("raw_event_table"),
                        projection_job.get("raw_event_dedupe_key"),
                    )
                    time.sleep(self.settings.worker_task_sleep_seconds)
                    continue

                time.sleep(self.settings.worker_idle_sleep_seconds)
            except Exception:
                logger.exception("worker loop error")
                time.sleep(self.settings.worker_idle_sleep_seconds)

    def process_job(self, job: dict[str, Any]) -> None:
        try:
            job_type = job.get("job_type")
            if job_type == "download_media":
                self._handle_download_media(job)
            elif job_type == "transcribe_voice":
                self._handle_transcribe_voice(job)
            else:
                raise RuntimeError(f"unsupported job_type={job_type}")
        except Exception as exc:
            logger.exception("job failed id=%s job_type=%s", job.get("id"), job.get("job_type"))
            self.job_service.mark_retry_or_failed(job, exc)

    def _handle_download_media(self, job: dict[str, Any]) -> None:
        logger.info(
            "download job start id=%s msg_id=%s guid=%s",
            job.get("id"),
            job.get("msg_id"),
            job.get("guid"),
        )
        self.job_service.update_job_progress(job, "download_media:start")
        payload = job.get("raw_payload") or {}
        raw_xml = job.get("raw_xml") or get_raw_xml_from_payload(payload)
        msg_type = safe_int(job.get("msg_type"))
        parsed = parse_media_download_info(raw_xml, msg_type)
        logger.info(
            "download job parsed id=%s supported=%s file_id=%s file_ext=%s",
            job.get("id"),
            parsed.get("supported"),
            parsed.get("file_id"),
            parsed.get("file_ext"),
        )
        self.job_service.update_job_progress(job, "download_media:parsed")
        if not parsed.get("supported"):
            self.job_service.complete_job(
                job,
                result_json={"skipped": True, "reason": parsed.get("reason"), "raw_xml": raw_xml},
                media_task_status="success",
            )
            return

        guid = str(job.get("guid") or self.settings.juhe_guid or "")
        if not guid:
            raise RuntimeError("guid is missing for download job")

        cdn_state = self.cdn_state_service.get_or_refresh_cdn_state(
            guid=guid,
            username=str(job.get("username") or ""),
            room_username=str(job.get("room_username") or ""),
        )
        self.job_service.update_job_progress(job, "download_media:cdn_state_ready")
        logger.info(
            "cdn state ready job id=%s username=%s device_type=%s",
            job.get("id"),
            cdn_state.get("username"),
            cdn_state.get("device_type"),
        )
        extension = parsed.get("file_ext") or "bin"
        file_name = f"{guid}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{extension}"
        download_body = {
            "aes_key": parsed["aes_key"],
            "base_request": {
                "cdn_info": cdn_state.get("cdn_info"),
                "client_version": cdn_state.get("client_version"),
                "device_type": cdn_state.get("device_type"),
                "username": cdn_state.get("username") or job.get("username"),
            },
            "file_id": parsed["file_id"],
            "file_name": file_name,
            "file_type": parsed["file_type"],
        }
        logger.info(
            "cloud download start job id=%s file_name=%s file_type=%s",
            job.get("id"),
            file_name,
            parsed["file_type"],
        )
        self.job_service.update_job_progress(job, "download_media:cloud_download_start")
        result = self.cloud_client.download_media(download_body)
        self.job_service.update_job_progress(job, "download_media:cloud_download_done")
        logger.info("cloud download done job id=%s", job.get("id"))
        remote_media_url = _extract_remote_media_url(result)
        if not remote_media_url:
            raise RuntimeError(f"remote media url missing in download response: {result}")
        self.job_service.complete_job(
            job,
            result_json=result,
            remote_media_url=remote_media_url,
        )
        self.crm_wx_projection_service.enqueue_message_projection(
            str(job.get("guid") or ""),
            str(job.get("target_table") or ""),
            str(job.get("dedupe_key") or ""),
            reason="media_refresh",
        )

    def _handle_transcribe_voice(self, job: dict[str, Any]) -> None:
        logger.info(
            "voice job start id=%s msg_id=%s guid=%s",
            job.get("id"),
            job.get("msg_id"),
            job.get("guid"),
        )
        self.job_service.update_job_progress(job, "transcribe_voice:start")
        payload = job.get("raw_payload") or {}
        raw_xml = job.get("raw_xml") or get_raw_xml_from_payload(payload)
        length = extract_voice_length_from_xml(raw_xml)
        if length is None:
            raise RuntimeError("voice length not found in xml")
        self.job_service.update_job_progress(job, "transcribe_voice:length_ready")

        data = get_payload_data_dict(payload)
        msg_id = str(job.get("msg_id") or data.get("msg_id") or "")
        if not msg_id:
            raise RuntimeError("msg_id missing for voice transcription")

        guid = str(job.get("guid") or self.settings.juhe_guid or "")
        if not guid:
            raise RuntimeError("guid is missing for voice transcription")

        voice_id_resp = self.guid_client.call("/msg/new_trans_voice_id", {"guid": guid}, timeout=(5, 30))
        voice_id = _extract_voice_id(voice_id_resp)
        self.job_service.update_job_progress(job, "transcribe_voice:voice_id_ready")

        upload_resp = self.guid_client.call(
            "/msg/upload_voice_trans",
            {
                "guid": guid,
                "voice_id": voice_id,
                "msg_id": msg_id,
                "length": str(length),
            },
            timeout=(5, 30),
        )
        logger.info("voice upload accepted voice_id=%s resp=%s", voice_id, upload_resp)
        self.job_service.update_job_progress(job, "transcribe_voice:uploaded")

        last_check_response = None
        last_get_response = None
        for _ in range(10):
            last_check_response = self.guid_client.call(
                "/msg/check_voice_trans",
                {
                    "guid": guid,
                    "voice_id": voice_id,
                    "msg_id": msg_id,
                    "length": str(length),
                },
                timeout=(5, 30),
            )
            interval_seconds = _extract_query_interval_seconds(last_check_response, default=2)
            if not _is_ready_response(last_check_response):
                time.sleep(interval_seconds)
                continue

            self.job_service.update_job_progress(job, "transcribe_voice:ready")
            last_get_response = self.guid_client.call(
                "/msg/get_voice_trans",
                {
                    "guid": guid,
                    "voice_id": voice_id,
                },
                timeout=(5, 30),
            )
            voice_text = _extract_voice_text(last_get_response)
            if voice_text:
                break
            if _is_voice_trans_pending(last_get_response):
                time.sleep(_extract_query_interval_seconds(last_get_response, default=interval_seconds))
                continue
            raise RuntimeError(
                "voice text missing from completed response: "
                f"check={last_check_response} result={last_get_response}"
            )
        else:
            raise RuntimeError(
                "voice transcription not ready after polling: "
                f"check={last_check_response} result={last_get_response}"
            )

        self.job_service.update_job_progress(job, "transcribe_voice:fetched")
        self.job_service.complete_job(
            job,
            result_json=last_get_response,
            voice_trans_text=voice_text,
        )
        self.crm_wx_projection_service.enqueue_message_projection(
            str(job.get("guid") or ""),
            str(job.get("target_table") or ""),
            str(job.get("dedupe_key") or ""),
            reason="media_refresh",
        )


if __name__ == "__main__":
    MediaWorker().run()
