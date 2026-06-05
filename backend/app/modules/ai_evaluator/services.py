"""AI 评测师 - Dify API 集成服务"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class DifyClient:
    """Dify API 客户端"""

    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def chat_message(
        self,
        query: str,
        user: str = "testplate-user",
        conversation_id: str | None = None,
        timeout: float = 60.0,
    ) -> dict[str, Any]:
        """发送对话消息（非流式）"""
        url = f"{self.api_url}/chat-messages"
        payload = {
            "query": query,
            "user": user,
            "response_mode": "blocking",
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload, headers=self.headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.TimeoutException:
            return {"error": "请求超时，请检查 Dify 服务状态"}
        except httpx.HTTPStatusError as e:
            return {"error": f"Dify API 错误: {e.response.status_code} {e.response.text[:200]}"}
        except Exception as e:
            return {"error": f"连接失败: {e}"}

    async def chat_message_stream(
        self,
        query: str,
        user: str = "testplate-user",
        conversation_id: str | None = None,
        timeout: float = 120.0,
    ):
        """发送对话消息（流式），返回异步生成器"""
        url = f"{self.api_url}/chat-messages"
        payload = {
            "query": query,
            "user": user,
            "response_mode": "streaming",
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", url, json=payload, headers=self.headers) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                yield data
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield {"error": str(e), "event": "error"}

    async def test_connection(self) -> tuple[bool, str]:
        """测试 Dify API 连接"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.api_url}/info",
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    return True, "连接成功"
                return False, f"API 返回状态码: {resp.status_code}"
        except httpx.TimeoutException:
            return False, "连接超时"
        except Exception as e:
            return False, f"连接失败: {e}"
