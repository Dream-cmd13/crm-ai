import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


DEFAULT_DOTENV_PATH = "/opt/wework-callback/.env"
MAX_PAYLOAD_BYTES = 10 * 1024 * 1024
GENERIC_INSERT_ERROR = {
    "code": 1,
    "message": "insert failed",
    "error": "internal_server_error",
}
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")

ROUTE_CONFIG = {
    "wework": {
        "raw_table": "wechat_raw.wework_callback_raw",
        "group_table": "wechat_raw.wework_group_message_events",
        "private_table": "wechat_raw.wework_private_message_events",
        "other_table": "wechat_raw.wework_other_events",
        "message_notify_type": 11010,
    },
    "wechat": {
        "raw_table": "wechat_raw.wechat_callback_raw",
        "group_table": "wechat_raw.wechat_group_message_events",
        "private_table": "wechat_raw.wechat_private_message_events",
        "other_table": "wechat_raw.wechat_other_events",
        "message_notify_type": 1010,
    },
}


def load_environment() -> None:
    load_dotenv()
    if os.path.exists(DEFAULT_DOTENV_PATH):
        load_dotenv(DEFAULT_DOTENV_PATH, override=False)


def build_requests_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.5,
        status_forcelist=[408, 429, 500, 502, 503, 504],
        allowed_methods=frozenset(["GET", "POST", "PATCH"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=20, pool_maxsize=50)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def configure_logging(log_level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    port: int
    log_level: str
    wechat_cloud_base_url: str
    juhe_api_url: str
    juhe_app_key: str
    juhe_app_secret: str
    juhe_guid: str
    media_download_dir: str
    worker_idle_sleep_seconds: int
    worker_task_sleep_seconds: int
    worker_max_attempts: int
    worker_stale_processing_seconds: int

    @property
    def supabase_rest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_environment()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not supabase_service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    settings = Settings(
        supabase_url=supabase_url,
        supabase_service_role_key=supabase_service_role_key,
        port=int(os.getenv("PORT", "5001")),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        wechat_cloud_base_url=os.getenv("WECHAT_CLOUD_BASE_URL", "http://43.139.21.228:35789").rstrip("/"),
        juhe_api_url=os.getenv("JUHE_API_URL", "https://chat-api.juhebot.com/open/GuidRequest").strip(),
        juhe_app_key=os.getenv("JUHE_APP_KEY", "").strip(),
        juhe_app_secret=os.getenv("JUHE_APP_SECRET", "").strip(),
        juhe_guid=os.getenv("JUHE_GUID", "").strip(),
        media_download_dir=os.getenv("MEDIA_DOWNLOAD_DIR", "./downloads").strip(),
        worker_idle_sleep_seconds=int(os.getenv("WORKER_IDLE_SLEEP_SECONDS", "5")),
        worker_task_sleep_seconds=int(os.getenv("WORKER_TASK_SLEEP_SECONDS", "2")),
        worker_max_attempts=int(os.getenv("WORKER_MAX_ATTEMPTS", "15")),
        worker_stale_processing_seconds=int(os.getenv("WORKER_STALE_PROCESSING_SECONDS", "300")),
    )
    configure_logging(settings.log_level)
    return settings
