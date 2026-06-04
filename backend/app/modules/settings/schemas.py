"""系统设置相关的 Pydantic 模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class SystemSettingsCreate(BaseModel):
    """创建/更新设置请求（upsert）"""
    key: str
    value: str
    description: Optional[str] = None


class SystemSettingsUpdate(BaseModel):
    """更新配置值请求"""
    value: str


class SystemSettingsResponse(BaseModel):
    """系统设置响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    value: str | None = None
    description: str | None = None
    updated_at: datetime | None = None

    @field_serializer("updated_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None
