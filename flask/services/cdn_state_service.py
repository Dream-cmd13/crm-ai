import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from clients.guid_request_client import GuidRequestClient
from clients.supabase_client import SupabaseClient
from services.schema_guard import assert_tables_exist


logger = logging.getLogger(__name__)

CDN_STATE_TABLES = ("wechat_raw.cdn_runtime_state",)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CdnStateService:
    def __init__(self, supabase: SupabaseClient, guid_client: GuidRequestClient):
        self.supabase = supabase
        self.guid_client = guid_client
        self._tables_validated = False

    def get_or_refresh_cdn_state(self, guid: str, username: str, room_username: str) -> dict[str, Any]:
        self._ensure_tables()
        cached = self._get_cached_state(guid)
        now = utc_now()
        if cached and cached.get("cdn_info") and self._parse_datetime(cached.get("expires_at")) > now:
            return self._normalize_state(cached)
        return self.refresh_cdn_state(guid=guid, username=username, room_username=room_username)

    def refresh_cdn_state(self, guid: str, username: str, room_username: str) -> dict[str, Any]:
        payload = self.guid_client.call(
            "/cdn/get_cdn_info",
            {
                "guid": guid,
                "username_list": [username] if username else [],
                "room_username": room_username or "",
            },
            timeout=(5, 30),
        )
        data = self.guid_client.unwrap_data(payload)
        state = self._extract_state(data, username)
        if not state.get("cdn_info"):
            raise RuntimeError(f"cdn_info missing in response: {payload}")

        fetched_at = utc_now()
        row = {
            "guid": guid,
            "username": state.get("username") or username or "",
            "cdn_info": state.get("cdn_info"),
            "device_type": state.get("device_type"),
            "client_version": state.get("client_version"),
            "fetched_at": fetched_at.isoformat(),
            "expires_at": (fetched_at + timedelta(hours=3)).isoformat(),
            "updated_at": fetched_at.isoformat(),
        }
        self.supabase.upsert("wechat_raw.cdn_runtime_state", row, on_conflict="guid")
        return self._normalize_state(row)

    def _get_cached_state(self, guid: str) -> dict[str, Any] | None:
        rows = self.supabase.select(
            "wechat_raw.cdn_runtime_state",
            filters={"guid": f"eq.{guid}"},
            order="fetched_at.desc",
            limit=1,
        )
        return rows[0] if rows else None

    @staticmethod
    def _extract_state(data: Any, fallback_username: str) -> dict[str, Any]:
        if isinstance(data, list) and data:
            data = data[0]
        if not isinstance(data, dict):
            return {}
        return {
            "username": data.get("username") or fallback_username,
            "cdn_info": data.get("cdn_info") or data.get("cdnInfo"),
            "device_type": data.get("device_type") or data.get("deviceType"),
            "client_version": CdnStateService._coerce_int(data.get("client_version") or data.get("clientVersion")),
        }

    @staticmethod
    def _normalize_state(state: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(state)
        normalized["client_version"] = CdnStateService._coerce_int(normalized.get("client_version"))
        return normalized

    @staticmethod
    def _coerce_int(value: Any) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(str(value).strip())
        except Exception:
            return None

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime:
        if not value:
            return datetime.fromtimestamp(0, tz=timezone.utc)
        try:
            parsed = datetime.fromisoformat(value)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except Exception:
            return datetime.fromtimestamp(0, tz=timezone.utc)

    def _ensure_tables(self) -> None:
        if self._tables_validated:
            return
        assert_tables_exist(self.supabase, CDN_STATE_TABLES)
        self._tables_validated = True
