import logging
from typing import Any

from config import Settings, build_requests_session


logger = logging.getLogger(__name__)


class GuidRequestClient:
    def __init__(self, settings: Settings, session=None):
        self.settings = settings
        self.session = session or build_requests_session()
        self.url = settings.juhe_api_url

    def call(self, path: str, data: dict[str, Any], *, timeout=(5, 30)) -> dict[str, Any]:
        body = {
            "app_key": self.settings.juhe_app_key,
            "app_secret": self.settings.juhe_app_secret,
            "path": path,
            "data": data,
        }
        logger.info("guid request path=%s", path)
        response = self.session.post(
            self.url,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
        )
        if response.status_code >= 300:
            raise RuntimeError(
                f"GuidRequest failed: path={path} status={response.status_code} body={response.text}"
            )

        try:
            payload = response.json()
        except Exception as exc:
            raise RuntimeError(f"GuidRequest JSON decode failed: path={path}") from exc

        if self._is_explicit_failure(payload):
            raise RuntimeError(f"GuidRequest business failure: path={path} payload={payload}")
        return payload

    @staticmethod
    def _is_explicit_failure(payload: Any) -> bool:
        if not isinstance(payload, dict):
            return False
        if payload.get("success") is False:
            return True
        for key in ("code", "errcode", "error_code"):
            value = payload.get(key)
            if value is None:
                continue
            if str(value) not in {"0", "200"}:
                return True
        status = payload.get("status")
        if isinstance(status, str) and status.lower() in {"fail", "failed", "error"}:
            return True
        return False

    @staticmethod
    def unwrap_data(payload: Any) -> Any:
        if not isinstance(payload, dict):
            return payload
        for key in ("data", "result", "info"):
            value = payload.get(key)
            if value is not None:
                return value
        return payload
