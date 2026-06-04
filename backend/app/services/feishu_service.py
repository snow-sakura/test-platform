"""飞书机器人通知服务：异步任务完成时发送富文本消息"""
from __future__ import annotations

import json

import httpx

from app.config import settings


async def send_feishu_notification(
    title: str,
    content_lines: list[str],
    webhook_url: str | None = None,
) -> None:
    """发送飞书富文本消息

    Args:
        title: 消息标题
        content_lines: 消息内容行（每行一个字符串）
        webhook_url: 飞书 Webhook 地址，默认从 settings 读取
    """
    url = webhook_url or settings.FEISHU_WEBHOOK_URL
    if not url:
        return

    # 构建飞书 post 富文本消息
    content = [
        [{"tag": "text", "text": f"{title}\n"}],
    ]
    for line in content_lines:
        content.append([{"tag": "text", "text": f"{line}\n"}])

    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": content,
                }
            }
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
    except Exception:
        pass  # 飞书通知失败不阻断业务
