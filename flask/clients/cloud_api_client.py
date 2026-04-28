import logging
from typing import Any

from config import Settings, build_requests_session


logger = logging.getLogger(__name__)


class CloudApiClient:
    def __init__(self, settings: Settings, session=None):
        self.settings = settings
        self.session = session or build_requests_session()
        self.url = f"{settings.wechat_cloud_base_url}/cloud/download"

    def download_media(self, body: dict[str, Any]) -> dict[str, Any]:
        logger.info("cloud download request file_name=%s file_type=%s", body.get("file_name"), body.get("file_type"))
        response = self.session.post(
            self.url,
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=(5, 60),
        )
        if response.status_code >= 300:
            raise RuntimeError(
                f"Cloud download failed: status={response.status_code} body={response.text}"
            )

        try:
            payload = response.json()
        except Exception as exc:
            raise RuntimeError("Cloud download JSON decode failed") from exc

        if self._is_explicit_failure(payload):
            raise RuntimeError(f"Cloud download business failure: payload={payload}")
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
