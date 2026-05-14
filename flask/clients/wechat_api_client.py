import logging
from typing import Any

from clients.guid_request_client import GuidRequestClient
from config import Settings


logger = logging.getLogger(__name__)


class WechatApiClient:
    def __init__(self, settings: Settings, guid_client: GuidRequestClient):
        self.settings = settings
        self.guid_client = guid_client

    def init_contact(self, guid: str, contact_seq: int = 0, room_seq: int = 0) -> dict[str, Any]:
        payload = self.guid_client.call(
            "/contact/init_contact",
            {
                "guid": guid,
                "contact_seq": contact_seq,
                "room_seq": room_seq,
            },
        )
        data = self._unwrap(payload)
        usernames = self._extract_usernames(data)
        if not usernames:
            usernames = self._extract_usernames(
                self._extract_records(
                    data,
                    (
                        "contact_list",
                        "contactList",
                        "contacts",
                        "list",
                        "items",
                        "room_list",
                        "roomList",
                    ),
                )
            )
        return {
            "contact_seq": self._as_int(
                self._pick_value(
                    data,
                    "contact_seq",
                    "contactSeq",
                    "seq",
                    "currentWxcontactSeq",
                ),
                default=contact_seq,
            ),
            "room_seq": self._as_int(
                self._pick_value(
                    data,
                    "room_seq",
                    "roomSeq",
                    "currentChatRoomContactSeq",
                ),
                default=room_seq,
            ),
            "continue_flag": self._as_int(self._pick_value(data, "continueFlag"), default=0),
            "usernames": usernames,
            "raw": data,
        }

    def batch_get_contact_brief_info(self, guid: str, username_list: list[str]) -> dict[str, Any]:
        payload = self.guid_client.call(
            "/contact/batch_get_contact_brief_info",
            {
                "guid": guid,
                "username_list": username_list,
            },
        )
        data = self._unwrap(payload)
        contacts = self._extract_records(
            data,
            ("contact_list", "contactList", "contacts", "list", "items"),
        )
        return {
            "contacts": [self._unwrap_contact_record(contact) for contact in contacts],
            "raw": data,
        }

    def get_contact(self, guid: str, username_list: list[str], room_username: str = "") -> dict[str, Any]:
        payload = self.guid_client.call(
            "/contact/get_contact",
            {
                "guid": guid,
                "username_list": username_list,
                "room_username": room_username,
            },
        )
        data = self._unwrap(payload)
        contacts = self._extract_records(
            data,
            ("contact_list", "contactList", "contacts", "list", "items", "member_list", "memberList", "members"),
        )
        return {
            "contacts": [self._unwrap_contact_record(contact) for contact in contacts],
            "raw": data,
        }

    def get_chatroom_detail(self, guid: str, room_username: str) -> dict[str, Any]:
        payload = self.guid_client.call(
            "/room/get_chatroom_detail",
            {
                "guid": guid,
                "room_username": room_username,
            },
        )
        data = self._unwrap(payload)
        room = self._extract_single_record(data, ("chatroom", "room", "detail", "info"))
        return {
            "room": room,
            "raw": data,
        }

    def get_chatroom_member_detail(self, guid: str, room_username: str, version: int = 0) -> dict[str, Any]:
        payload = self.guid_client.call(
            "/room/get_chatroom_member_detail",
            {
                "guid": guid,
                "room_username": room_username,
                "version": version,
            },
        )
        data = self._unwrap(payload)
        members = self._extract_chatroom_member_records(data)
        member_version = self._as_int(
            self._pick_value(
                data,
                "serverVersion",
                "version",
                "memberVersion",
                "member_version",
            ),
            default=version,
        )
        all_member_usernames = self._extract_string_list(
            self._pick_value(data, "allMemberUserNameList", "all_member_user_name_list")
        )
        member_count = self._as_int(self._pick_value(data, "memberCount"), default=len(members))
        all_member_count = self._as_int(self._pick_value(data, "allMemberCount"), default=len(all_member_usernames))

        if max(member_count, all_member_count, len(all_member_usernames)) > max(len(members), 1):
            logger.warning(
                "chatroom member detail parsed fewer members than expected guid=%s room_username=%s version=%s parsed_members=%s member_count=%s all_member_count=%s username_count=%s",
                guid,
                room_username,
                version,
                len(members),
                member_count,
                all_member_count,
                len(all_member_usernames),
            )

        return {
            "version": member_version,
            "member_version": member_version,
            "members": [self._normalize_chatroom_member_record(member) for member in members],
            "owner_username": self._as_str(self._pick_value(data, "chatRoomOwner", "chatroomOwner", "owner_username")),
            "member_count": member_count,
            "all_member_count": all_member_count,
            "admin_count": self._as_int(self._pick_value(data, "adminCount"), default=0),
            "all_member_usernames": all_member_usernames,
            "has_all_member_usernames": self._pick_value(data, "allMemberUserNameList", "all_member_user_name_list") is not None,
            "raw": data,
        }

    @staticmethod
    def _unwrap_contact_record(record: Any) -> Any:
        if isinstance(record, dict) and isinstance(record.get("contact"), dict):
            # Preserve top-level fields such as displayName while reusing nested contact info.
            return {
                **record["contact"],
                **{key: value for key, value in record.items() if key != "contact"},
            }
        return record

    @staticmethod
    def _normalize_chatroom_member_record(record: Any) -> Any:
        if isinstance(record, dict) and isinstance(record.get("contact"), dict):
            # Preserve top-level chatroom fields such as displayName while reusing nested contact info.
            return {
                **record["contact"],
                **{key: value for key, value in record.items() if key != "contact"},
            }
        return record

    @staticmethod
    def _unwrap(payload: Any) -> Any:
        return GuidRequestClient.unwrap_data(payload)

    @staticmethod
    def _as_int(value: Any, *, default: int = 0) -> int:
        try:
            if value in (None, ""):
                return default
            return int(value)
        except Exception:
            return default

    @staticmethod
    def _as_str(value: Any) -> str:
        if value in (None, ""):
            return ""
        return str(value).strip()

    @classmethod
    def _pick_value(cls, container: Any, *keys: str) -> Any:
        if isinstance(container, list):
            for item in container:
                value = cls._pick_value(item, *keys)
                if value not in (None, "", [], {}):
                    return value
            return None
        if not isinstance(container, dict):
            return None
        for key in keys:
            value = container.get(key)
            if value not in (None, "", [], {}):
                return value
        for value in container.values():
            nested = cls._pick_value(value, *keys)
            if nested not in (None, "", [], {}):
                return nested
        return None

    @classmethod
    def _extract_records(cls, data: Any, preferred_keys: tuple[str, ...]) -> list[dict[str, Any]]:
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        if isinstance(data, dict):
            for key in preferred_keys:
                value = data.get(key)
                if isinstance(value, list):
                    return [item for item in value if isinstance(item, dict)]
                if isinstance(value, dict):
                    nested = cls._extract_records(value, preferred_keys)
                    if nested:
                        return nested
            if cls._looks_like_record(data):
                return [data]
            for value in data.values():
                nested = cls._extract_records(value, preferred_keys)
                if nested:
                    return nested
        return []

    @classmethod
    def _extract_single_record(cls, data: Any, preferred_keys: tuple[str, ...]) -> dict[str, Any]:
        if isinstance(data, dict):
            for key in preferred_keys:
                value = data.get(key)
                if isinstance(value, dict):
                    return value
            if cls._looks_like_record(data):
                return data
            for value in data.values():
                if isinstance(value, dict):
                    nested = cls._extract_single_record(value, preferred_keys)
                    if nested:
                        return nested
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            nested = cls._extract_single_record(item, preferred_keys)
                            if nested:
                                return nested
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    nested = cls._extract_single_record(item, preferred_keys)
                    if nested:
                        return nested
        return {}

    @classmethod
    def _extract_usernames(cls, data: Any) -> list[str]:
        usernames: list[str] = []
        seen: set[str] = set()

        def add(username: Any) -> None:
            if username in (None, ""):
                return
            text = str(username).strip()
            if not text or text in seen:
                return
            seen.add(text)
            usernames.append(text)

        username_like_keys = {
            "username",
            "usernamelist",
            "wxid",
            "wxidlist",
            "roomusername",
            "roomusernamelist",
            "contactusername",
            "contactusernamelist",
            "chatroomusername",
            "chatroomusernamelist",
            "friendusername",
            "friendusernamelist",
            "mpusername",
            "mpusernamelist",
        }

        def walk(value: Any, parent_key: str | None = None) -> None:
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, (str, int)) and parent_key in username_like_keys:
                        add(item)
                    else:
                        walk(item, parent_key)
                return
            if isinstance(value, dict):
                for key, item in value.items():
                    normalized_key = str(key).replace("_", "").lower()
                    if normalized_key in username_like_keys:
                        if isinstance(item, list):
                            for nested_item in item:
                                add(nested_item)
                        else:
                            add(item)
                    elif key in {
                        "username",
                        "userName",
                        "UserName",
                        "wxid",
                        "Wxid",
                        "WXID",
                        "room_username",
                        "roomUsername",
                        "RoomUsername",
                    }:
                        add(item)
                    else:
                        walk(item, normalized_key)

        walk(data)
        return usernames

    @classmethod
    def _extract_string_list(cls, data: Any) -> list[str]:
        values: list[str] = []
        seen: set[str] = set()

        def add(item: Any) -> None:
            text = cls._as_str(item)
            if not text or text in seen:
                return
            seen.add(text)
            values.append(text)

        def walk(item: Any) -> None:
            if isinstance(item, list):
                for nested_item in item:
                    walk(nested_item)
                return
            if isinstance(item, dict):
                if "string" in item and len(item) == 1:
                    add(item.get("string"))
                    return
                for nested_item in item.values():
                    walk(nested_item)
                return
            add(item)

        walk(data)
        return values

    @classmethod
    def _extract_chatroom_member_records(cls, data: Any) -> list[dict[str, Any]]:
        candidate_paths = (
            ("newChatroomData", "chatRoomMember"),
            ("newChatroomData", "chatroomMember"),
            ("new_chatroom_data", "chat_room_member"),
            ("chatRoomMember",),
            ("memberList",),
            ("member_list",),
            ("members",),
        )

        for path in candidate_paths:
            value = cls._get_nested_value_by_path(data, *path)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
        return []

    @staticmethod
    def _get_nested_value_by_path(container: Any, *path: str) -> Any:
        current = container
        for key in path:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
        return current

    @staticmethod
    def _looks_like_record(value: dict[str, Any]) -> bool:
        keys = {
            "username",
            "userName",
            "wxid",
            "nickname",
            "alias",
            "room_username",
            "roomUsername",
            "chatroomVersion",
            "chatroomInfoVersion",
            "chatRoomInfoVersion",
            "chatRoomOwner",
            "chatroomUserName",
        }
        return any(key in value for key in keys)
