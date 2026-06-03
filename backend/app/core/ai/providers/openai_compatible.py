"""OpenAI 兼容 API 提供商"""
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.core.ai import AIProvider


class OpenAICompatibleProvider(AIProvider):
    """OpenAI 兼容 API 封装（支持 DeepSeek、Qwen、SiliconFlow 等）"""

    def __init__(
        self,
        api_base: str,
        api_key: str,
        model_name: str = "gpt-4o",
    ):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=api_base,
        )
        self.model_name = model_name

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        return response.choices[0].message.content or ""

    async def chat_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content

    async def test_connection(self) -> bool:
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
            )
            return bool(response.choices)
        except Exception:
            return False
