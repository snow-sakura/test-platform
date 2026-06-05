"""共享通知发送工具

支持飞书、企业微信、钉钉的 Webhook 消息发送。
为 ui_automation、app_automation、api_testing 等模块提供统一的通知能力。
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# 飞书卡片颜色映射
FEISHU_COLOR_MAP = {"passed": "green", "failed": "red", "completed": "blue", "": "default"}


async def send_feishu(
    webhook_url: str,
    secret: str | None = None,
    title: str = "",
    content: str = "",
    status: str = "",
) -> dict[str, Any]:
    """发送飞书机器人消息（卡片格式）"""
    import hashlib
    import hmac
    import base64
    import time

    card_title = title or "测试通知"
    payload: dict[str, Any] = {
        "msg_type": "interactive",
        "card": {
            "header": {
                "title": {"tag": "plain_text", "content": card_title},
                "template": FEISHU_COLOR_MAP.get(status, "default"),
            },
            "elements": [{"tag": "markdown", "content": content or "测试执行完成"}],
        },
    }
    if secret:
        timestamp = str(round(time.time()))
        sign_str = f"{timestamp}\n{secret}"
        signature = base64.b64encode(
            hmac.new(secret.encode(), sign_str.encode(), hashlib.sha256).digest()
        ).decode()
        payload["timestamp"] = timestamp
        payload["sign"] = signature

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return {"success": resp.is_success, "status_code": resp.status_code, "response": resp.text}
    except Exception as e:
        logger.error(f"飞书通知发送失败: {e}")
        return {"success": False, "error": str(e)}


async def send_wechat(
    webhook_url: str,
    title: str = "",
    content: str = "",
) -> dict[str, Any]:
    """发送企业微信机器人消息"""
    payload = {
        "msgtype": "markdown",
        "markdown": {"content": f"## {title or '测试通知'}\n{content}"},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return {"success": resp.is_success, "status_code": resp.status_code, "response": resp.text}
    except Exception as e:
        logger.error(f"企业微信通知发送失败: {e}")
        return {"success": False, "error": str(e)}


async def send_dingtalk(
    webhook_url: str,
    secret: str | None = None,
    title: str = "",
    content: str = "",
) -> dict[str, Any]:
    """发送钉钉机器人消息"""
    import hashlib
    import hmac
    import base64
    import time

    dt_title = title or "测试通知"
    payload = {
        "msgtype": "markdown",
        "markdown": {"title": dt_title, "text": f"## {dt_title}\n{content}"},
    }
    url = webhook_url
    if secret:
        timestamp = str(round(time.time() * 1000))
        sign_str = f"{timestamp}\n{secret}"
        signature = base64.b64encode(
            hmac.new(secret.encode(), sign_str.encode(), hashlib.sha256).digest()
        ).decode()
        sep = "&" if "?" in webhook_url else "?"
        url = f"{webhook_url}{sep}timestamp={timestamp}&sign={signature}"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            return {"success": resp.is_success, "status_code": resp.status_code, "response": resp.text}
    except Exception as e:
        logger.error(f"钉钉通知发送失败: {e}")
        return {"success": False, "error": str(e)}


async def send_notification(
    notify_type: str,
    webhook_url: str,
    secret: str | None = None,
    title: str = "",
    content: str = "",
    status: str = "",
) -> dict[str, Any]:
    """通用通知发送入口

    Args:
        notify_type: 通知类型 (feishu / wechat / dingtalk)
        webhook_url: Webhook 地址
        secret: 签名密钥（飞书/钉钉需要）
        title: 消息标题
        content: 消息内容
        status: 执行状态（用于飞书卡片颜色，passed/failed/completed）

    Returns:
        {"success": bool, ...} 字典
    """
    sender_map = {
        "feishu": send_feishu,
        "wechat": send_wechat,
        "dingtalk": send_dingtalk,
    }
    sender = sender_map.get(notify_type)
    if not sender:
        return {"success": False, "error": f"不支持的通知类型: {notify_type}"}
    return await sender(webhook_url=webhook_url, secret=secret, title=title, content=content, status=status)
