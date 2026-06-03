"""AI 提供商抽象层"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator


class AIProvider(ABC):
    """AI 提供商抽象基类"""

    @abstractmethod
    async def chat(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ) -> str:
        """非流式对话"""
        ...

    @abstractmethod
    async def chat_stream(
        self, messages: list[dict], temperature: float = 0.7, max_tokens: int = 2048
    ) -> AsyncGenerator[str, None]:
        """流式对话"""
        ...

    @abstractmethod
    async def test_connection(self) -> bool:
        """测试连接是否可用"""
        ...


class AIProviderFactory:
    """AI 提供商工厂"""

    _providers: dict[str, type[AIProvider]] = {}

    @classmethod
    def register(cls, name: str, provider_cls: type[AIProvider]):
        cls._providers[name] = provider_cls

    @classmethod
    def create(cls, provider_type: str, **kwargs) -> AIProvider:
        provider_cls = cls._providers.get(provider_type)
        if not provider_cls:
            raise ValueError(f"不支持的 AI 提供商类型: {provider_type}")
        return provider_cls(**kwargs)
