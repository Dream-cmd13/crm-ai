import hashlib
import json
import logging
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from clients.guid_request_client import GuidRequestClient
from clients.supabase_client import SupabaseClient
from clients.wechat_api_client import WechatApiClient
from config import GENERIC_INSERT_ERROR, MAX_PAYLOAD_BYTES, ROUTE_CONFIG, SHANGHAI_TZ, get_settings
from parsers.xml_parser import (
    extract_message_fields,
    get_wechat_canonical_msg_id,
    get_payload_data_dict,
    json_text,
    parse_sender_name_from_desc,
    safe_int,
    safe_str,
)
from services.contact_sync_service import ContactSyncService
from services.crm_wx_projection_service import CrmWxProjectionService
from services.job_service import JobService


settings = get_settings()
logger = logging.getLogger("callback-app")
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_PAYLOAD_BYTES

OPTIONAL_MESSAGE_EVENT_FIELDS = {
    "wechat_raw.wechat_group_message_events": ("sender_display_name", "sender_alias", "room_name", "room_remark_name"),
    "wechat_raw.wechat_private_message_events": ("sender_display_name", "sender_alias", "receiver_display_name", "peer_display_name"),
}

MESSAGE_EVENT_FIELDS_BY_TABLE = {
    "wechat_raw.wechat_group_message_events": {
        "dedupe_key",
        "guid",
        "notify_type",
        "event_time",
        "seq",
        "msg_id",
        "appinfo",
        "sender",
        "sender_name",
        "sender_display_name",
        "sender_alias",
        "receiver",
        "roomid",
        "room_name",
        "room_remark_name",
        "sendtime",
        "content_type",
        "msg_type",
        "referid",
        "flag",
        "content",
        "at_list",
        "quote_content",
        "quote_appinfo",
        "send_flag",
        "payload",
    },
    "wechat_raw.wechat_private_message_events": {
        "dedupe_key",
        "guid",
        "notify_type",
        "event_time",
        "seq",
        "msg_id",
        "appinfo",
        "sender",
        "sender_name",
        "sender_display_name",
        "sender_alias",
        "receiver",
        "receiver_display_name",
        "peer_display_name",
        "roomid",
        "sendtime",
        "content_type",
        "msg_type",
        "referid",
        "flag",
        "content",
        "at_list",
        "quote_content",
        "quote_appinfo",
        "send_flag",
        "payload",
    },
}

supabase = SupabaseClient(settings)
job_service = JobService(supabase, settings)
guid_client = GuidRequestClient(settings)
wechat_api_client = WechatApiClient(settings, guid_client)
contact_sync_service = ContactSyncService(supabase, wechat_api_client, settings)
crm_wx_projection_service = CrmWxProjectionService(supabase, contact_sync_service, settings)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ts_to_utc_iso(ts):
    try:
        if ts is None or ts == "":
            return None
        return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except Exception:
        return None


def ts_to_bj_iso(ts):
    try:
        if ts is None or ts == "":
            return None
        return datetime.fromtimestamp(int(ts), tz=SHANGHAI_TZ).isoformat()
    except Exception:
        return None


def extract_raw_ts(payload: dict):
    if not isinstance(payload, dict):
        return None
    data = get_payload_data_dict(payload)
    ts = payload.get("timestamp")
    if ts is None:
        ts = data.get("timestamp")
    if ts is None:
        ts = data.get("sendtime")
    if ts is None:
        ts = data.get("create_time")
    return safe_int(ts)


def parse_event_time_raw(payload: dict):
    return ts_to_utc_iso(extract_raw_ts(payload))


def parse_event_time_bj(payload: dict):
    return ts_to_bj_iso(extract_raw_ts(payload))


def is_group_room(roomid) -> bool:
    if roomid is None:
        return False
    roomid_str = str(roomid).strip().lower()
    return roomid_str not in ("", "0", "none", "null", "undefined")


def get_source_ip():
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.headers.get("X-Real-IP") or request.remote_addr


def get_request_meta() -> dict:
    return {
        "source_ip": get_source_ip(),
        "user_agent": request.headers.get("User-Agent"),
    }


def get_message_id(source: str, data: dict):
    if source == "wework":
        return safe_str(data.get("id"))
    return get_wechat_canonical_msg_id(data)


def get_message_seq(source: str, data: dict):
    if source == "wework":
        return safe_int(data.get("seq"))
    return safe_int(
        data.get("seq")
        or data.get("msg_id")
        or data.get("msgid")
        or data.get("newmsgid")
    )


def get_message_sender(source: str, data: dict):
    if source == "wework":
        return safe_str(data.get("sender"))
    is_chatroom_msg = safe_int(data.get("is_chatroom_msg"))
    if is_chatroom_msg == 1 and data.get("chatroom_sender"):
        return safe_str(data.get("chatroom_sender"))
    return safe_str(
        data.get("from_username")
        or data.get("sender")
        or data.get("from_user")
        or data.get("from_wxid")
    )


def get_message_sender_name(source: str, data: dict):
    if source == "wework":
        return data.get("sender_name")
    explicit_name = (
        data.get("chatroom_sender_name")
        or data.get("from_nickname")
        or data.get("sender_name")
        or data.get("nickname")
    )
    if explicit_name:
        return explicit_name
    return parse_sender_name_from_desc(data.get("desc"), data.get("content"))


def get_message_receiver(source: str, data: dict):
    if source == "wework":
        return safe_str(data.get("receiver"))
    return safe_str(
        data.get("to_username")
        or data.get("receiver")
        or data.get("to_user")
        or data.get("to_wxid")
    )


def get_message_roomid(source: str, data: dict):
    if source == "wework":
        return safe_str(data.get("roomid"))
    return safe_str(
        data.get("chatroom")
        or data.get("room_username")
        or data.get("roomid")
        or data.get("chatroom_id")
    )


def get_message_sendtime(source: str, data: dict):
    if source == "wework":
        return ts_to_bj_iso(data.get("sendtime"))
    return ts_to_bj_iso(data.get("create_time") or data.get("timestamp") or data.get("sendtime"))


def get_message_content_type(source: str, data: dict):
    if source == "wework":
        return safe_int(data.get("content_type"))
    return safe_int(data.get("content_type") or data.get("msg_type"))


def resolve_is_group_message(source: str, data: dict) -> bool:
    if source == "wechat":
        is_group_flag = safe_int(data.get("is_chatroom_msg"))
        if is_group_flag == 1:
            return True
        if is_group_flag == 0:
            return False
    return is_group_room(get_message_roomid(source, data))


def build_dedupe_key(payload: dict, source: str) -> str:
    guid = str(payload.get("guid") or "")
    notify_type = safe_int(payload.get("notify_type"))
    data = get_payload_data_dict(payload)

    if notify_type == ROUTE_CONFIG[source]["message_notify_type"]:
        msg_id = get_message_id(source, data)
        if source == "wechat" and msg_id:
            return f"{source}:msg:{guid}:{notify_type}:{msg_id}"
        seq = get_message_seq(source, data)
        if seq is not None:
            return f"{source}:msg:{guid}:{notify_type}:{seq}"
        if msg_id:
            return f"{source}:msg:{guid}:{notify_type}:{msg_id}"

    raw_text = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    raw_hash = sha256_text(raw_text)
    return f"{source}:raw:{guid}:{notify_type}:{raw_hash}"


def build_raw_row(payload: dict, dedupe_key: str, request_meta: dict) -> dict:
    return {
        "dedupe_key": dedupe_key,
        "guid": safe_str(payload.get("guid")) or "",
        "notify_type": safe_int(payload.get("notify_type")),
        "event_time": parse_event_time_raw(payload),
        "source_ip": request_meta.get("source_ip"),
        "user_agent": request_meta.get("user_agent"),
        "payload": payload,
        "route_status": "received",
    }


def insert_raw(payload: dict, dedupe_key: str, source: str, request_meta: dict):
    supabase.upsert(
        ROUTE_CONFIG[source]["raw_table"],
        build_raw_row(payload, dedupe_key, request_meta),
        on_conflict="dedupe_key",
    )


def build_message_event_row(payload: dict, dedupe_key: str, source: str, is_group: bool) -> dict:
    data = get_payload_data_dict(payload)
    extracted = extract_message_fields(source, data)
    guid = safe_str(payload.get("guid")) or ""
    sender = get_message_sender(source, data)
    receiver = get_message_receiver(source, data)
    roomid = get_message_roomid(source, data) if is_group else "0"
    send_flag = safe_int(data.get("send_flag"))
    raw_sender_name = get_message_sender_name(source, data)

    sender_name = None
    sender_display_name = None
    sender_alias = None
    receiver_display_name = None
    peer_display_name = None
    room_name = None
    room_remark_name = None

    if source == "wechat" and guid:
        if is_group:
            room_names = contact_sync_service.resolve_room_names(guid, roomid, fallback=roomid)
            room_name = room_names.get("room_name") or roomid
            room_remark_name = room_names.get("room_remark_name")
            sender_display_name = contact_sync_service.resolve_chatroom_member_display_name(
                guid,
                roomid,
                sender,
                fallback=None,
            )
        else:
            sender_names = contact_sync_service.resolve_contact_names(
                guid,
                sender,
                fallback=None,
            )
            sender_name = sender_names.get("nickname")
            sender_display_name = sender_names.get("remark")
            sender_alias = sender_names.get("alias")

            receiver_names = contact_sync_service.resolve_contact_names(
                guid,
                receiver,
                fallback=None,
            )
            receiver_display_name = receiver_names.get("display_name")

            peer_username = receiver if send_flag == 1 else sender
            peer_names = contact_sync_service.resolve_contact_names(
                guid,
                peer_username,
                fallback=None,
            )
            peer_display_name = peer_names.get("display_name")

    return {
        "dedupe_key": dedupe_key,
        "guid": guid,
        "notify_type": safe_int(payload.get("notify_type")),
        "event_time": parse_event_time_bj(payload),
        "seq": get_message_seq(source, data),
        "msg_id": get_message_id(source, data),
        "appinfo": json_text(extracted["appinfo"]),
        "sender": sender,
        "sender_name": sender_name,
        "sender_display_name": sender_display_name,
        "sender_alias": sender_alias,
        "receiver": receiver,
        "receiver_display_name": receiver_display_name,
        "peer_display_name": peer_display_name,
        "roomid": roomid,
        "room_name": room_name,
        "room_remark_name": room_remark_name,
        "sendtime": get_message_sendtime(source, data),
        "content_type": get_message_content_type(source, data),
        "msg_type": safe_int(data.get("msg_type")),
        "referid": safe_str(data.get("referid")),
        "flag": safe_int(data.get("flag")),
        "content": extracted["content"],
        "at_list": data.get("at_list"),
        "quote_content": extracted["quote_content"],
        "quote_appinfo": json_text(extracted["quote_appinfo"]),
        "send_flag": send_flag,
        "payload": payload,
    }


def insert_message_event(payload: dict, dedupe_key: str, source: str, is_group: bool) -> str:
    row = build_message_event_row(payload, dedupe_key, source, is_group)
    table = ROUTE_CONFIG[source]["group_table"] if is_group else ROUTE_CONFIG[source]["private_table"]
    allowed_fields = MESSAGE_EVENT_FIELDS_BY_TABLE.get(table)
    if allowed_fields is not None:
        row = {key: value for key, value in row.items() if key in allowed_fields}
    try:
        supabase.upsert(table, row, on_conflict="dedupe_key")
    except RuntimeError:
        fallback_row = dict(row)
        for field in OPTIONAL_MESSAGE_EVENT_FIELDS.get(table, ()):
            fallback_row.pop(field, None)
        if fallback_row == row:
            raise
        logger.exception("message event upsert failed with optional fields, retrying without snapshot columns table=%s", table)
        supabase.upsert(table, fallback_row, on_conflict="dedupe_key")
    return table


def build_other_event_row(payload: dict, dedupe_key: str) -> dict:
    data = get_payload_data_dict(payload)
    return {
        "dedupe_key": dedupe_key,
        "guid": safe_str(payload.get("guid")) or "",
        "notify_type": safe_int(payload.get("notify_type")),
        "event_time": parse_event_time_bj(payload),
        "status": safe_int(data.get("status")),
        "vid": safe_int(data.get("vid")),
        "nickname": data.get("nickname"),
        "avatar": data.get("avatar"),
        "logo": data.get("logo"),
        "corp_id": safe_str(data.get("corp_id")),
        "user_id": safe_str(data.get("user_id")),
        "name": data.get("name"),
        "real_name": data.get("real_name"),
        "gender": safe_int(data.get("gender")),
        "party_id": safe_str(data.get("party_id")),
        "corp_short_name": data.get("corp_short_name"),
        "corp_full_name": data.get("corp_full_name"),
        "error_code": safe_int(data.get("error_code")),
        "error_message": data.get("error_message"),
        "call_type": safe_int(data.get("type")),
        "msgid": safe_str(data.get("msg_id") or data.get("msgid") or data.get("newmsgid") or data.get("id")),
        "timestamp_raw": safe_int(data.get("create_time") or data.get("timestamp") or data.get("sendtime")),
        "invite_msg": data.get("inviteMsg") or data.get("invite_msg") or data.get("msg"),
        "payload": payload,
    }


def insert_other_event(payload: dict, dedupe_key: str, source: str):
    supabase.upsert(
        ROUTE_CONFIG[source]["other_table"],
        build_other_event_row(payload, dedupe_key),
        on_conflict="dedupe_key",
    )


def mark_raw_status(dedupe_key: str, status: str, source: str):
    try:
        supabase.update(
            ROUTE_CONFIG[source]["raw_table"],
            {"route_status": status},
            filters={"dedupe_key": f"eq.{dedupe_key}"},
        )
    except Exception:
        logger.exception("failed to mark raw status, dedupe_key=%s source=%s", dedupe_key, source)


def route_payload(payload: dict, dedupe_key: str, source: str):
    cfg = ROUTE_CONFIG[source]
    notify_type = safe_int(payload.get("notify_type"))
    data = get_payload_data_dict(payload)

    if notify_type == cfg["message_notify_type"]:
        is_group = resolve_is_group_message(source, data)
        target_table = insert_message_event(payload, dedupe_key, source, is_group=is_group)
        status = "routed_group_message" if is_group else "routed_private_message"
        mark_raw_status(dedupe_key, status, source)
        try:
            job_service.enqueue_jobs_for_payload(payload, dedupe_key, source, target_table)
        except Exception:
            logger.exception("failed to enqueue media jobs dedupe_key=%s source=%s", dedupe_key, source)
        if source == "wechat":
            guid = safe_str(payload.get("guid")) or ""
            roomid = get_message_roomid(source, data) if is_group else ""
            if is_group and guid and roomid not in ("", "0"):
                try:
                    contact_sync_service.enqueue_room_sync(guid, roomid)
                except Exception:
                    logger.exception("failed to enqueue room sync guid=%s roomid=%s", guid, roomid)
            try:
                crm_wx_projection_service.enqueue_message_projection(
                    guid,
                    target_table,
                    dedupe_key,
                    reason="route",
                )
            except Exception:
                logger.exception(
                    "failed to enqueue crm projection guid=%s target_table=%s dedupe_key=%s",
                    guid,
                    target_table,
                    dedupe_key,
                )
        return status

    insert_other_event(payload, dedupe_key, source)
    mark_raw_status(dedupe_key, "routed_other_event", source)

    if source == "wechat" and notify_type in (1200, 1201):
        guid = str(payload.get("guid") or "")
        if guid:
            contact_sync_service.enqueue_contact_change_event(guid, notify_type, payload, dedupe_key)

    return "routed_other_event"


def process_payload(payload: dict, source: str, request_meta: dict):
    if source not in ROUTE_CONFIG:
        raise ValueError(f"unsupported source: {source}")
    dedupe_key = build_dedupe_key(payload, source)
    insert_raw(payload, dedupe_key, source, request_meta)
    route_payload(payload, dedupe_key, source)
    return dedupe_key


@app.errorhandler(413)
def handle_too_large(_):
    return jsonify({"code": 1, "message": "payload too large"}), 413


@app.errorhandler(HTTPException)
def handle_http_exception(exc):
    return jsonify({"code": 1, "message": str(exc)}), exc.code

@app.errorhandler(Exception)
def handle_uncaught_exception(exc):
    logger.exception("uncaught exception: %s", exc)
    return jsonify({"code": 1, "message": "internal server error"}), 500


def parse_json_payload():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return None, (jsonify({"code": 1, "message": "invalid json"}), 400)
    return payload, None


def handle_callback_failure(payload: dict, source: str, exc: Exception):
    logger.exception("%s callback failed: %s", source, exc)
    try:
        mark_raw_status(build_dedupe_key(payload, source), "route_failed", source)
    except Exception:
        logger.exception("failed to mark %s route_failed", source)
    return jsonify(GENERIC_INSERT_ERROR), 500


def handle_callback_post(source: str):
    payload, error_response = parse_json_payload()
    if error_response is not None:
        return error_response

    try:
        process_payload(payload, source, get_request_meta())
        return jsonify({"code": 0, "message": "success"}), 200
    except Exception as exc:
        return handle_callback_failure(payload, source, exc)


@app.route("/", methods=["GET"])
def home():
    return "callback server is running", 200


@app.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"ok": True}), 200


@app.route("/callback-health", methods=["GET"])
def callback_health():
    return jsonify(
        {
            "ok": True,
            "service": "callback",
            "routes": ["/callback/wecom", "/callback/wechat"],
        }
    ), 200


@app.route("/callback/wecom", methods=["POST"])
def callback_wecom():
    return handle_callback_post("wework")


@app.route("/callback/wechat", methods=["GET", "POST"])
def callback_wechat():
    if request.method == "GET":
        return jsonify({"code": 0, "message": "wechat callback endpoint is ready"}), 200
    return handle_callback_post("wechat")


@app.route("/api/sync/contacts/<guid>", methods=["POST"])
def trigger_contact_sync(guid: str):
    contact_sync_service.enqueue_incremental_sync(guid)
    return jsonify({"code": 0, "message": f"Sync queued for guid {guid}"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=settings.port)
