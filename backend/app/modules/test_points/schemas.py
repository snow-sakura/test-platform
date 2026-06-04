"""测试点相关的 Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class TestPointCreate(BaseModel):
    """创建测试点请求"""
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    category: Optional[str] = None


class TestPointUpdate(BaseModel):
    """更新测试点请求（所有字段可选）"""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    is_verified: Optional[bool] = None


class TestPointResponse(BaseModel):
    """测试点响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    document_id: int | None = None
    title: str
    description: str | None = None
    priority: str
    category: str | None = None
    is_verified: bool = False
    verified_by: str | None = None
    verified_at: datetime | None = None
    created_at: datetime | None = None

    @field_serializer("verified_at", "created_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None
