import html
import json
import os
import re
import xml.etree.ElementTree as ET
from typing import Any


def safe_int(value):
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def safe_str(value):
    if value is None:
        return None
    return str(value)


def json_text(value):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def get_payload_data_dict(payload: dict) -> dict:
    if not isinstance(payload, dict):
        return {}
    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def normalize_text(text: str) -> str:
    if text is None:
        return ""
    text = html.unescape(str(text))
    text = text.replace("\u2005", " ")
    text = text.replace("\xa0", " ")
    text = text.replace("\u3000", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]*", "\n", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def safe_xml_fromstring(text: str):
    if not text:
        return None
    try:
        return ET.fromstring(text)
    except Exception:
        return None


def get_xml_text(node, path: str, default: str = "") -> str:
    if node is None:
        return default
    child = node.find(path)
    if child is None or child.text is None:
        return default
    return child.text


def looks_like_xml(text: str) -> bool:
    if text is None:
        return False
    stripped = str(text).strip()
    return bool(stripped) and stripped.startswith("<") and ">" in stripped


def sanitize_summary_text(text: str, fallback: str = "[未知消息]") -> str:
    value = normalize_text(text)
    if not value:
        return fallback
    if looks_like_xml(value):
        return fallback
    return value


def parse_sender_name_from_desc(desc: str, content: str | None = None) -> str | None:
    desc_norm = normalize_text(desc)
    content_norm = normalize_text(content)
    if not desc_norm:
        return None

    if " : " not in desc_norm:
        return None

    left, right = desc_norm.rsplit(" : ", 1)
    left = left.strip()
    right = right.strip()
    if not left:
        return None
    if content_norm and right == content_norm:
        return left
    if right == "[聊天记录]":
        return left
    return left


def parse_forwarded_chat_record_info(raw_content: str | None) -> dict[str, Any] | None:
    result = {
        "record_type": None,
        "my_wechat_name": None,
        "peer_wechat_name": None,
        "group_chat_name": None,
        "record_title": None,
        "record_desc": None,
        "record_lines": [],
        "record_messages": [],
    }
    raw_xml = normalize_text(raw_content)
    if not raw_xml or not looks_like_xml(raw_xml):
        return None

    xml_root = safe_xml_fromstring(raw_xml)
    if xml_root is None:
        return None
    appmsg = xml_root.find("appmsg")
    if appmsg is None:
        return None
    if safe_int(get_xml_text(appmsg, "type")) != 19:
        return None

    title = normalize_text(get_xml_text(appmsg, "title"))
    desc = normalize_text(get_xml_text(appmsg, "des"))
    content_text = normalize_text(get_xml_text(appmsg, "content"))
    record_title = title
    record_desc = desc or content_text
    recorditem_raw = get_xml_text(appmsg, "recorditem")
    recordinfo_root = safe_xml_fromstring(recorditem_raw)

    lines: list[str] = []
    record_messages: list[dict[str, Any]] = []
    if recordinfo_root is not None:
        title2 = normalize_text(get_xml_text(recordinfo_root, "title"))
        desc2 = normalize_text(get_xml_text(recordinfo_root, "desc"))
        record_title = title2 or record_title
        record_desc = desc2 or record_desc
        datalist = recordinfo_root.find("datalist")
        if datalist is not None:
            for item in datalist.findall("dataitem"):
                sourcename = normalize_text(get_xml_text(item, "sourcename"))
                datadesc = normalize_text(get_xml_text(item, "datadesc"))
                refermsgitem = item.find("refermsgitem")
                quote_line = None
                if refermsgitem is not None:
                    refer_content = extract_readable_text_from_inner_xml(get_xml_text(refermsgitem, "content"))
                    refer_desc = normalize_text(get_xml_text(refermsgitem, "referdesc"))
                    refer_displayname = normalize_text(get_xml_text(refermsgitem, "displayname"))
                    if refer_displayname and refer_content:
                        quote_line = f"{refer_displayname}: {refer_content}"
                    elif refer_content:
                        quote_line = refer_content
                    else:
                        quote_line = sanitize_summary_text(refer_desc, fallback="")
                message_content = sanitize_summary_text(datadesc, fallback="")
                if message_content:
                    message_content = merge_content_with_quote(message_content, quote_line)
                line = message_content
                if sourcename and line:
                    line = f"{sourcename}: {line}"
                elif sourcename:
                    line = sourcename
                line = sanitize_summary_text(line, fallback="")
                if line:
                    lines.append(line)
                if sourcename or message_content:
                    record_messages.append(
                        {
                            "sender_name": sourcename or None,
                            "content": message_content or line or None,
                        }
                    )

    signal_text = " | ".join(part for part in (record_title, record_desc, content_text) if part)
    signal_text = normalize_text(signal_text)
    result["record_title"] = record_title or None
    result["record_desc"] = record_desc or None
    result["record_lines"] = lines
    result["record_messages"] = record_messages

    if "群聊的聊天记录" in signal_text:
        result["record_type"] = "group"
        if record_title and record_title != "群聊的聊天记录":
            result["group_chat_name"] = record_title.removesuffix("的聊天记录") or None
        return result

    private_match = re.search(r"^\s*(.+?)和(.+?)的聊天记录\s*$", record_title or signal_text)
    if private_match:
        result["record_type"] = "private"
        result["my_wechat_name"] = normalize_text(private_match.group(1)) or None
        result["peer_wechat_name"] = normalize_text(private_match.group(2)) or None
        return result

    return result if result["record_title"] or result["record_lines"] else None


def merge_content_with_quote(content: str, quote_content: str) -> str:
    content = normalize_text(content)
    quote_content = normalize_text(quote_content)
    if not quote_content:
        return content
    quoted = f"(被引用的消息: {quote_content})"
    if not content:
        return quoted
    if quoted in content:
        return content
    return f"{content}{quoted}"


def _extract_xml_fragment(text: str) -> tuple[str, str]:
    raw = normalize_text(text)
    if not raw:
        return "", ""

    for marker in ("<?xml", "<msg", "<appmsg", "<img", "<voicemsg", "<videomsg", "<emoji", "<location", "<op"):
        idx = raw.find(marker)
        if idx >= 0:
            prefix = normalize_text(raw[:idx]).rstrip(" :")
            xml_part = raw[idx:].strip()
            return prefix, xml_part
    return "", ""


def summarize_embedded_quote_xml(text: str) -> str:
    content = normalize_text(text)
    if not content or ("被引用的内容" not in content and "被引用的消息" not in content):
        return content

    pattern = re.compile(r"\(\s*被引用的(?:内容|消息)\s*:\s*(.*?)\)", flags=re.S)

    def _replace(match: re.Match) -> str:
        inner = normalize_text(match.group(1))
        if not inner:
            return "(被引用的消息: [引用消息])"

        prefix = ""
        xml_part = ""
        if looks_like_xml(inner):
            xml_part = inner
        else:
            prefix, xml_part = _extract_xml_fragment(inner)

        if not xml_part:
            return match.group(0)

        readable = extract_readable_text_from_inner_xml(xml_part)
        readable = sanitize_summary_text(readable, fallback="[引用消息]")
        if prefix:
            readable = f"{prefix}: {readable}"
        return f"(被引用的消息: {readable})"

    return pattern.sub(_replace, content)


def extract_readable_text_from_inner_xml(text: str, depth: int = 0) -> str:
    if depth > 4:
        return "[引用消息]"
    raw = html.unescape(str(text or "")).strip()
    if not raw:
        return ""
    if looks_like_xml(raw):
        summary = summarize_wechat_xml_payload(raw)
        content = sanitize_summary_text(summary.get("content"), fallback="[引用消息]")
        if content:
            return content
        root = safe_xml_fromstring(raw)
        if root is not None:
            appmsg = root.find("appmsg")
            if appmsg is not None:
                refermsg = appmsg.find("refermsg")
                if refermsg is not None:
                    nested = get_xml_text(refermsg, "content")
                    nested_text = extract_readable_text_from_inner_xml(nested, depth + 1)
                    if nested_text:
                        return nested_text
        return "[引用消息]"
    prefix, xml_part = _extract_xml_fragment(raw)
    if xml_part:
        nested_text = extract_readable_text_from_inner_xml(xml_part, depth + 1)
        nested_text = sanitize_summary_text(nested_text, fallback="[引用消息]")
        if prefix:
            return f"{prefix}: {nested_text}"
        return nested_text
    return sanitize_summary_text(raw, fallback="[引用消息]")


def get_readable_quote_content(refermsg_node) -> str:
    if refermsg_node is None:
        return ""
    refer_content_raw = get_xml_text(refermsg_node, "content")
    refer_content = normalize_text(refer_content_raw)
    refer_desc = normalize_text(get_xml_text(refermsg_node, "referdesc"))
    readable_from_content = extract_readable_text_from_inner_xml(refer_content_raw)
    if readable_from_content:
        return readable_from_content
    if refer_desc:
        return refer_desc
    return refer_content


def extract_file_extension(filename: str) -> str:
    name = normalize_text(filename)
    if not name:
        return ""
    _, ext = os.path.splitext(name)
    return ext.lstrip(".").strip().lower()


def resolve_file_extension(*candidates: str) -> str:
    for candidate in candidates:
        ext = extract_file_extension(candidate)
        if ext:
            return ext
        normalized = normalize_text(candidate).lstrip(".").lower()
        if normalized and re.fullmatch(r"[a-z0-9]{1,16}", normalized):
            return normalized
    return ""


def build_file_message_content(filename: str, file_ext: str = "") -> str:
    display_name = normalize_text(filename)
    resolved_ext = resolve_file_extension(file_ext, display_name)
    label = f"[{resolved_ext} 文件]" if resolved_ext else "[文件]"
    if display_name:
        return f"{label} {display_name}"
    return label


def extract_appmsg_file_info(appmsg) -> dict[str, Any]:
    appattach = appmsg.find("appattach") if appmsg is not None else None
    title = normalize_text(get_xml_text(appmsg, "title"))
    desc = normalize_text(get_xml_text(appmsg, "des"))
    content_text = normalize_text(get_xml_text(appmsg, "content"))
    file_ext = normalize_text(get_xml_text(appattach, "fileext")).lower()
    filename = title or desc or content_text
    if not filename and file_ext:
        filename = f"unknown.{file_ext}"
    return {
        "filename": filename,
        "file_ext": resolve_file_extension(file_ext, filename),
        "totallen": safe_int(get_xml_text(appattach, "totallen")),
        "md5": normalize_text(get_xml_text(appmsg, "md5")) or None,
        "overwrite_newmsgid": normalize_text(get_xml_text(appattach, "overwrite_newmsgid")) or None,
    }


def extract_wechat_appmsg_metadata(raw_content: str) -> dict[str, Any]:
    result = {
        "app_type": None,
        "file_info": None,
    }
    xml_root = safe_xml_fromstring(raw_content)
    if xml_root is None:
        return result
    appmsg = xml_root.find("appmsg")
    if appmsg is None:
        return result
    result["app_type"] = safe_int(get_xml_text(appmsg, "type"))
    result["file_info"] = extract_appmsg_file_info(appmsg)
    return result


def get_wechat_canonical_msg_id(data: dict) -> str | None:
    raw_msg_id = safe_str(
        data.get("msg_id")
        or data.get("msgid")
        or data.get("newmsgid")
        or data.get("id")
        or data.get("client_msg_id")
    )
    if safe_int(data.get("msg_type")) != 49:
        return raw_msg_id
    raw_content = data.get("content")
    if not isinstance(raw_content, str) or not raw_content.strip():
        return raw_msg_id
    metadata = extract_wechat_appmsg_metadata(raw_content)
    file_info = metadata.get("file_info") or {}
    overwrite_newmsgid = safe_str(file_info.get("overwrite_newmsgid"))
    return overwrite_newmsgid or raw_msg_id


def summarize_wechat_xml_payload(raw_xml: str) -> dict[str, Any]:
    result = {
        "content": "",
        "quote_content": None,
        "quote_appinfo": None,
        "app_type": None,
    }
    raw_xml = html.unescape(str(raw_xml or "")).strip()
    root = safe_xml_fromstring(raw_xml)
    if root is None:
        result["content"] = sanitize_summary_text(raw_xml, fallback="[未知消息]")
        return result

    appmsg = root.find("appmsg")
    if appmsg is not None:
        parsed = parse_appmsg_xml(raw_xml)
        parsed["content"] = sanitize_summary_text(parsed.get("content"), fallback="[应用消息]")
        if parsed.get("quote_content") is not None:
            parsed["quote_content"] = sanitize_summary_text(parsed.get("quote_content"), fallback="[引用消息]")
        return parsed

    op = root.find("op")
    if op is not None:
        op_id = normalize_text(op.attrib.get("id"))
        username = normalize_text(get_xml_text(op, "username"))
        name = normalize_text(get_xml_text(op, "name"))
        arg_raw = get_xml_text(op, "arg")
        arg_text = normalize_text(arg_raw)
        arg_summary = arg_text
        arg_json = None
        try:
            arg_json = json.loads(arg_raw) if arg_raw else None
        except Exception:
            arg_json = None
        if isinstance(arg_json, dict):
            arg_summary = " ".join(
                f"{key}={normalize_text(value)}"
                for key, value in arg_json.items()
                if normalize_text(value)
            )
        pieces = ["[会话切换]"]
        if name:
            pieces.append(name)
        if arg_summary:
            pieces.append(arg_summary)
        if username:
            pieces.append(f"user={username}")
        result["content"] = sanitize_summary_text(" ".join(pieces), fallback="[会话切换]")
        result["quote_appinfo"] = {
            "message_kind": "op",
            "op_id": op_id or None,
            "username": username or None,
            "name": name or None,
            "arg": arg_json if isinstance(arg_json, dict) else (arg_text or None),
        }
        return result

    img_node = root.find("img")
    if img_node is not None:
        thumb_w = normalize_text(img_node.attrib.get("cdnthumbwidth"))
        thumb_h = normalize_text(img_node.attrib.get("cdnthumbheight"))
        length = normalize_text(img_node.attrib.get("length"))
        hdlength = normalize_text(img_node.attrib.get("hdlength"))
        md5 = normalize_text(img_node.attrib.get("md5"))
        parts = ["[图片]"]
        if thumb_w and thumb_h:
            parts[0] = f"[图片 {thumb_w}x{thumb_h}]"
        if md5:
            parts.append(f"md5={md5}")
        if length:
            parts.append(f"size={length}")
        if hdlength and hdlength != length:
            parts.append(f"hdsize={hdlength}")
        result["content"] = sanitize_summary_text(" ".join(parts), fallback="[图片]")
        result["quote_appinfo"] = {
            "message_kind": "image",
            "md5": md5 or None,
            "thumb_width": safe_int(thumb_w),
            "thumb_height": safe_int(thumb_h),
            "length": safe_int(length),
            "hdlength": safe_int(hdlength),
        }
        return result

    voice_node = root.find("voicemsg")
    if voice_node is not None:
        voice_length = normalize_text(voice_node.attrib.get("voicelength") or voice_node.attrib.get("length"))
        content = f"[语音]{(' 时长=' + voice_length + 'ms') if voice_length else ''}"
        result["content"] = sanitize_summary_text(content, fallback="[语音]")
        result["quote_appinfo"] = {
            "message_kind": "voice",
            "voicelength": safe_int(voice_length),
        }
        return result

    video_node = root.find("videomsg")
    if video_node is not None:
        play_length = normalize_text(video_node.attrib.get("playlength"))
        md5 = normalize_text(video_node.attrib.get("md5"))
        parts = ["[视频]"]
        if play_length:
            parts.append(f"时长={play_length}ms")
        if md5:
            parts.append(f"md5={md5}")
        result["content"] = sanitize_summary_text(" ".join(parts), fallback="[视频]")
        result["quote_appinfo"] = {
            "message_kind": "video",
            "playlength": safe_int(play_length),
            "md5": md5 or None,
        }
        return result

    emoji_node = root.find("emoji")
    if emoji_node is not None:
        md5 = normalize_text(emoji_node.attrib.get("md5"))
        content = f"[表情]{(' md5=' + md5) if md5 else ''}"
        result["content"] = sanitize_summary_text(content, fallback="[表情]")
        result["quote_appinfo"] = {
            "message_kind": "emoji",
            "md5": md5 or None,
        }
        return result

    location_node = root.find("location")
    if location_node is not None:
        label = normalize_text(location_node.attrib.get("label"))
        x = normalize_text(location_node.attrib.get("x"))
        y = normalize_text(location_node.attrib.get("y"))
        poiname = normalize_text(location_node.attrib.get("poiname"))
        parts = ["[位置]"]
        if label:
            parts.append(label)
        elif poiname:
            parts.append(poiname)
        if x and y:
            parts.append(f"({x},{y})")
        result["content"] = sanitize_summary_text(" ".join(parts), fallback="[位置]")
        result["quote_appinfo"] = {
            "message_kind": "location",
            "label": label or None,
            "poiname": poiname or None,
            "x": x or None,
            "y": y or None,
        }
        return result

    result["content"] = "[XML消息]"
    result["quote_appinfo"] = {"message_kind": "xml_unknown"}
    return result


def parse_appmsg_xml(raw_content: str) -> dict[str, Any]:
    result = {
        "app_type": None,
        "content": "",
        "quote_content": None,
        "quote_appinfo": None,
    }
    xml_root = safe_xml_fromstring(raw_content)
    if xml_root is None:
        result["content"] = sanitize_summary_text(raw_content, fallback="[应用消息]")
        return result
    appmsg = xml_root.find("appmsg")
    if appmsg is None:
        result["content"] = sanitize_summary_text(raw_content, fallback="[应用消息]")
        return result

    app_type = safe_int(get_xml_text(appmsg, "type"))
    result["app_type"] = app_type

    title = normalize_text(get_xml_text(appmsg, "title"))
    desc = normalize_text(get_xml_text(appmsg, "des"))
    content_text = normalize_text(get_xml_text(appmsg, "content"))

    if app_type == 57:
        refermsg = appmsg.find("refermsg")
        refer_content_raw = get_xml_text(refermsg, "content")
        refer_content = extract_readable_text_from_inner_xml(refer_content_raw)
        result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[引用回复]")
        result["quote_content"] = sanitize_summary_text(refer_content, fallback="[引用消息]") if refer_content else None
        result["quote_appinfo"] = {
            "app_type": 57,
            "refer_displayname": normalize_text(get_xml_text(refermsg, "displayname")) or None,
            "refer_fromusr": normalize_text(get_xml_text(refermsg, "fromusr")) or None,
            "refer_svrid": normalize_text(get_xml_text(refermsg, "svrid")) or None,
            "refer_type": safe_int(get_xml_text(refermsg, "type")),
            "refer_chatusr": normalize_text(get_xml_text(refermsg, "chatusr")) or None,
            "refer_createtime": safe_int(get_xml_text(refermsg, "createtime")),
        }
        return result

    if app_type == 19:
        recorditem_raw = get_xml_text(appmsg, "recorditem")
        recordinfo_root = safe_xml_fromstring(recorditem_raw)
        snippets = []
        refer_snippets = []
        records = []
        if recordinfo_root is not None:
            title2 = normalize_text(get_xml_text(recordinfo_root, "title"))
            desc2 = normalize_text(get_xml_text(recordinfo_root, "desc"))
            datalist = recordinfo_root.find("datalist")
            if datalist is not None:
                for item in datalist.findall("dataitem"):
                    sourcename = normalize_text(get_xml_text(item, "sourcename"))
                    sourcetime = normalize_text(get_xml_text(item, "sourcetime"))
                    datadesc = normalize_text(get_xml_text(item, "datadesc"))
                    fromnewmsgid = normalize_text(get_xml_text(item, "fromnewmsgid"))
                    src_msg_create_time = safe_int(get_xml_text(item, "srcMsgCreateTime"))
                    datatype = safe_int(item.attrib.get("datatype"))
                    refermsgitem = item.find("refermsgitem")
                    refer_content = None
                    refer_desc = None
                    refer_displayname = None
                    refer_type = None
                    refer_svrid = None
                    quote_line = None
                    if refermsgitem is not None:
                        refer_content = extract_readable_text_from_inner_xml(get_xml_text(refermsgitem, "content"))
                        refer_desc = normalize_text(get_xml_text(refermsgitem, "referdesc"))
                        refer_displayname = normalize_text(get_xml_text(refermsgitem, "displayname"))
                        refer_type = safe_int(get_xml_text(refermsgitem, "type"))
                        refer_svrid = normalize_text(get_xml_text(refermsgitem, "svrid"))
                        if refer_displayname and refer_content:
                            quote_line = f"{refer_displayname}: {refer_content}"
                        elif refer_content:
                            quote_line = refer_content
                        else:
                            quote_line = sanitize_summary_text(refer_desc, fallback="")
                        if quote_line:
                            refer_snippets.append(quote_line)
                    line = datadesc
                    if sourcename and datadesc:
                        line = f"{sourcename}: {datadesc}"
                    elif sourcename:
                        line = sourcename
                    line = sanitize_summary_text(line, fallback="")
                    if line:
                        line = merge_content_with_quote(line, quote_line)
                        snippets.append(line)
                    records.append(
                        {
                            "datatype": datatype,
                            "sourcename": sourcename,
                            "sourcetime": sourcetime,
                            "datadesc": datadesc,
                            "fromnewmsgid": fromnewmsgid,
                            "src_msg_create_time": src_msg_create_time,
                            "refermsgitem": (
                                {
                                    "content": refer_content,
                                    "referdesc": refer_desc,
                                    "displayname": refer_displayname,
                                    "type": refer_type,
                                    "svrid": refer_svrid,
                                }
                                if refermsgitem is not None
                                else None
                            ),
                        }
                    )
            summary_parts = []
            if title2:
                summary_parts.append(title2)
            elif title:
                summary_parts.append(title)
            if snippets:
                summary_parts.extend(snippets[:8])
            elif desc2:
                summary_parts.append(desc2)
            elif desc:
                summary_parts.append(desc)
            result["content"] = sanitize_summary_text(" | ".join(summary_parts), fallback="[聊天记录]")
            result["quote_content"] = "\n".join(refer_snippets[:15]) if refer_snippets else None
            result["quote_appinfo"] = {
                "app_type": 19,
                "records": records,
                "has_nested_quote": bool(refer_snippets),
            }
            return result
        result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[聊天记录]")
        result["quote_appinfo"] = {"app_type": 19}
        return result

    if app_type == 5:
        result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[链接]")
        result["quote_appinfo"] = {"app_type": 5}
        return result

    if app_type in (6, 74):
        file_info = extract_appmsg_file_info(appmsg)
        result["content"] = sanitize_summary_text(
            build_file_message_content(file_info.get("filename"), file_info.get("file_ext")),
            fallback="[文件]",
        )
        result["quote_appinfo"] = {
            "app_type": app_type,
            "file_name": file_info.get("filename") or None,
            "file_ext": file_info.get("file_ext") or None,
            "totallen": file_info.get("totallen"),
            "md5": file_info.get("md5"),
            "overwrite_newmsgid": file_info.get("overwrite_newmsgid"),
        }
        return result

    if app_type == 33:
        result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[小程序]")
        result["quote_appinfo"] = {"app_type": 33}
        return result

    if app_type == 51:
        result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[视频号]")
        result["quote_appinfo"] = {"app_type": 51}
        return result

    result["content"] = sanitize_summary_text(title or desc or content_text, fallback="[应用消息]")
    result["quote_appinfo"] = {"app_type": app_type}
    return result


def extract_message_fields(source: str, data: dict) -> dict[str, Any]:
    msg_type = safe_int(data.get("msg_type"))
    raw_content = data.get("content")
    raw_desc = data.get("desc")
    content = ""
    quote_content = None
    quote_appinfo = None
    appinfo = data.get("appinfo") or data.get("source")

    if source == "wechat":
        if isinstance(raw_content, str) and raw_content.strip():
            if msg_type == 49:
                parsed = parse_appmsg_xml(raw_content)
                content = parsed.get("content") or normalize_text(raw_desc) or "[应用消息]"
                quote_content = parsed.get("quote_content")
                quote_appinfo = parsed.get("quote_appinfo")
                if parsed.get("app_type") != 19 and quote_content:
                    content = merge_content_with_quote(content, quote_content)
            elif msg_type in (3, 34, 43, 47, 48, 51, 62, 6):
                parsed = summarize_wechat_xml_payload(raw_content)
                content = parsed.get("content") or normalize_text(raw_desc) or "[媒体消息]"
                quote_content = parsed.get("quote_content")
                quote_appinfo = parsed.get("quote_appinfo")
            elif msg_type == 1:
                normalized_raw = normalize_text(raw_content)
                if looks_like_xml(normalized_raw):
                    parsed = summarize_wechat_xml_payload(normalized_raw)
                    content = parsed.get("content") or normalize_text(raw_desc) or "[文本消息]"
                    quote_content = parsed.get("quote_content")
                    quote_appinfo = parsed.get("quote_appinfo")
                else:
                    content = summarize_embedded_quote_xml(normalized_raw) or normalize_text(raw_desc)
            else:
                parsed = summarize_wechat_xml_payload(raw_content)
                parsed_content = parsed.get("content")
                if parsed_content:
                    content = parsed_content
                    quote_content = parsed.get("quote_content")
                    quote_appinfo = parsed.get("quote_appinfo")
                else:
                    content = normalize_text(raw_content) or normalize_text(raw_desc)
        else:
            content = normalize_text(raw_desc)
    else:
        content = normalize_text(raw_content) or normalize_text(raw_desc)

    content = sanitize_summary_text(content, fallback="[空消息]")
    if quote_content is not None:
        quote_content = sanitize_summary_text(quote_content, fallback="[引用消息]")
    return {
        "content": content,
        "quote_content": quote_content,
        "quote_appinfo": quote_appinfo,
        "appinfo": appinfo,
    }


def get_raw_xml_from_payload(payload: dict) -> str:
    data = get_payload_data_dict(payload)
    raw_content = data.get("content")
    if isinstance(raw_content, str) and raw_content.strip():
        return raw_content
    raw_desc = data.get("desc")
    if isinstance(raw_desc, str) and looks_like_xml(raw_desc):
        return raw_desc
    return ""


def extract_voice_length_from_xml(raw_xml: str) -> int | None:
    try:
        root = safe_xml_fromstring(raw_xml)
        if root is None:
            return None
        voice_node = root.find("voicemsg")
        if voice_node is None:
            return None
        return safe_int(voice_node.attrib.get("length") or voice_node.attrib.get("voicelength"))
    except Exception:
        return None


def _collect_xml_text_candidates(root) -> list[str]:
    candidates = []
    if root is None:
        return candidates
    for elem in root.iter():
        if elem.text:
            candidates.append(str(elem.text))
        for attr_value in elem.attrib.values():
            if attr_value:
                candidates.append(str(attr_value))
    return candidates


def _find_file_id_candidate(values: list[str]) -> str:
    pattern = re.compile(r"(30[0-9A-Za-z_-]{8,})")
    for value in values:
        match = pattern.search(str(value))
        if match:
            return match.group(1)
    return ""


def _normalize_media_file_id(value: str) -> str:
    raw = normalize_text(value)
    if not raw:
        return ""
    if raw.startswith("@cdn_"):
        raw = raw[len("@cdn_") :]
    direct_match = re.fullmatch(r"(30[0-9A-Za-z]+)", raw)
    if direct_match:
        return direct_match.group(1)
    attach_match = re.fullmatch(r"(30[0-9A-Za-z]+)_[0-9A-Za-z]{16,128}_\d+", raw)
    if attach_match:
        return attach_match.group(1)
    generic_match = re.search(r"(30[0-9A-Za-z]+)", raw)
    if generic_match:
        return generic_match.group(1)
    return ""


def _extract_explicit_media_file_id(root, appattach, msg_type: int | None) -> str:
    if msg_type == 49:
        explicit = (
            normalize_text(get_xml_text(appattach, "cdnattachurl"))
            or normalize_text(get_xml_text(appattach, "attachid"))
        )
        return _normalize_media_file_id(explicit)

    if root is None:
        return ""

    if msg_type == 3:
        img_node = root.find("img")
        if img_node is not None:
            for key in ("cdnbigimgurl", "cdnmidimgurl", "cdnthumburl"):
                normalized = _normalize_media_file_id(img_node.attrib.get(key) or "")
                if normalized:
                    return normalized

    if msg_type in (43, 62):
        video_node = root.find("videomsg")
        if video_node is not None:
            for key in ("cdnvideourl", "cdnthumburl"):
                normalized = _normalize_media_file_id(video_node.attrib.get(key) or "")
                if normalized:
                    return normalized

    return ""


def _find_first_named_value(root, names: set[str]) -> str:
    if root is None:
        return ""
    for elem in root.iter():
        for key, value in elem.attrib.items():
            if key.lower() in names and value:
                return str(value)
    return ""


def _guess_media_extension(msg_type: int | None, explicit_ext: str) -> str:
    if explicit_ext:
        return explicit_ext
    if msg_type == 3:
        return "jpg"
    if msg_type in (43, 62):
        return "mp4"
    if msg_type == 34:
        return "amr"
    return "bin"


def parse_media_download_info(raw_xml: str, msg_type: int | None) -> dict[str, Any]:
    try:
        root = safe_xml_fromstring(raw_xml)
        if root is None:
            raise ValueError("raw xml is empty or invalid")

        appmsg = root.find("appmsg")
        app_type = safe_int(get_xml_text(appmsg, "type")) if appmsg is not None else None
        if msg_type == 49 and app_type != 6:
            return {
                "supported": False,
                "reason": f"appmsg type {app_type} is not a file",
                "app_type": app_type,
            }

        candidates = _collect_xml_text_candidates(root)
        appattach = appmsg.find("appattach") if appmsg is not None else None
        aes_key = (
            _find_first_named_value(root, {"aeskey", "aes_key"})
            or normalize_text(get_xml_text(appattach, "aeskey"))
        )
        file_id = _extract_explicit_media_file_id(root, appattach, msg_type) or _find_file_id_candidate(candidates)

        file_name = ""
        file_ext = ""
        if appmsg is not None:
            file_info = extract_appmsg_file_info(appmsg)
            file_name = file_info.get("filename") or ""
            file_ext = file_info.get("file_ext") or ""

        file_ext = _guess_media_extension(msg_type, file_ext)
        if not file_name:
            file_name = f"media.{file_ext}"

        if not aes_key:
            raise ValueError("aeskey not found in xml")
        if not file_id:
            raise ValueError("file_id starting with 30 not found in xml")

        if msg_type == 3:
            file_type = 2
        elif msg_type in (43, 62):
            file_type = 4
        else:
            file_type = 5

        return {
            "supported": True,
            "app_type": app_type,
            "aes_key": aes_key,
            "file_id": file_id,
            "file_name": file_name,
            "file_ext": file_ext,
            "file_type": file_type,
        }
    except Exception as exc:
        return {
            "supported": False,
            "reason": str(exc),
            "app_type": None,
        }
