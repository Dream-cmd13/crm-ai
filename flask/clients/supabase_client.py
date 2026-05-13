import logging
from json import JSONDecodeError
from typing import Any

from config import Settings, build_requests_session


logger = logging.getLogger(__name__)


class MissingSupabaseTableError(RuntimeError):
    def __init__(self, table: str | None, *, method: str, path: str, status_code: int, body: str):
        self.table = table
        self.method = method
        self.path = path
        self.status_code = status_code
        self.body = body
        message = (
            f"Supabase table missing: table={table or path} method={method} "
            f"path={path} status={status_code} body={body}"
        )
        super().__init__(message)


class SupabaseClient:
    def __init__(self, settings: Settings, session=None):
        self.settings = settings
        self.session = session or build_requests_session()
        self.base_url = settings.supabase_rest_url
        self.base_headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _normalize_rows(row_or_rows: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        if isinstance(row_or_rows, list):
            return row_or_rows
        return [row_or_rows]

    def _request(self, method: str, path: str, *, params=None, json_body=None, headers=None, timeout=(5, 20)):
        schema = "public"
        if "." in path:
            schema, path = path.split(".", 1)

        url = f"{self.base_url}/{path.lstrip('/')}"
        request_headers = dict(self.base_headers)
        
        if method in ("GET", "HEAD"):
            request_headers["Accept-Profile"] = schema
        else:
            request_headers["Content-Profile"] = schema

        if headers:
            request_headers.update(headers)

        logger.debug("supabase %s %s params=%s schema=%s", method, url, params, schema)
        response = self.session.request(
            method=method,
            url=url,
            params=params,
            json=json_body,
            headers=request_headers,
            timeout=timeout,
        )
        if response.status_code >= 300:
            missing_table = self._extract_missing_table(response)
            if missing_table is not None:
                raise MissingSupabaseTableError(
                    missing_table,
                    method=method,
                    path=path,
                    status_code=response.status_code,
                    body=response.text,
                )
            raise RuntimeError(
                f"Supabase request failed: method={method} path={path} "
                f"status={response.status_code} body={response.text}"
            )
        return response

    @staticmethod
    def _extract_missing_table(response) -> str | None:
        if response.status_code != 404:
            return None
        try:
            payload = response.json()
        except (JSONDecodeError, ValueError):
            return None
        if payload.get("code") != "PGRST205":
            return None
        message = str(payload.get("message") or "")
        marker = "Could not find the table '"
        start = message.find(marker)
        if start == -1:
            return None
        start += len(marker)
        end = message.find("'", start)
        if end == -1:
            return None
        table_name = message[start:end]
        if table_name.startswith("public."):
            table_name = table_name.split(".", 1)[1]
        return table_name or None

    def select(self, table: str, *, columns: str = "*", filters=None, order: str | None = None, limit: int | None = None):
        params = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)

        response = self._request("GET", table, params=params)
        try:
            return response.json()
        except Exception as exc:
            raise RuntimeError(f"Supabase select JSON decode failed: table={table}") from exc

    def select_one(
        self,
        table: str,
        *,
        columns: str = "*",
        filters=None,
        order: str | None = None,
    ) -> dict[str, Any] | None:
        rows = self.select(table, columns=columns, filters=filters, order=order, limit=1)
        if not rows:
            return None
        return rows[0]

    def insert(
        self,
        table: str,
        row: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str | None = None,
        ignore_duplicates: bool = False,
        returning: str = "minimal",
    ):
        prefer_resolution = "ignore-duplicates" if ignore_duplicates else "merge-duplicates"
        headers = {"Prefer": f"resolution={prefer_resolution},return={returning}"}
        params = {"on_conflict": on_conflict} if on_conflict else None
        response = self._request(
            "POST",
            table,
            params=params,
            json_body=self._normalize_rows(row),
            headers=headers,
        )
        if returning == "representation":
            return response.json()
        return None

    def upsert(
        self,
        table: str,
        row: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str,
        returning: str = "minimal",
    ):
        headers = {"Prefer": f"resolution=merge-duplicates,return={returning}"}
        params = {"on_conflict": on_conflict}
        response = self._request(
            "POST",
            table,
            params=params,
            json_body=self._normalize_rows(row),
            headers=headers,
        )
        if returning == "representation":
            return response.json()
        return None

    def update(self, table: str, values: dict[str, Any], *, filters=None, returning: str = "minimal"):
        headers = {"Prefer": f"return={returning}"}
        response = self._request("PATCH", table, params=filters, json_body=values, headers=headers)
        if returning == "representation":
            return response.json()
        return None

    def rpc(self, function_name: str, *, params: dict[str, Any] | None = None):
        """Call a Postgres function via Supabase RPC (POST /rpc/<name>)."""
        response = self._request("POST", f"rpc/{function_name}", json_body=params or {})
        try:
            return response.json()
        except Exception:
            return None

    def delete(self, table: str, *, filters=None, returning: str = "minimal"):
        headers = {"Prefer": f"return={returning}"}
        response = self._request("DELETE", table, params=filters, headers=headers)
        if returning == "representation":
            return response.json()
        return None
