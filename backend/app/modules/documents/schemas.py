"""文档相关的 Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class DocumentResponse(BaseModel):
    """文档列表/详情响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    filename: str
    file_type: str
    uploaded_at: datetime | None = None

    @field_serializer("uploaded_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        """日期时间格式化为 YYYY-MM-DD HH:MM:SS"""
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


class DocumentDetailResponse(DocumentResponse):
    """文档详情（含解析后的内容）"""
    content: str | None = None
