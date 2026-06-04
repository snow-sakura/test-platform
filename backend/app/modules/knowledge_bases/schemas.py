"""知识库相关的 Pydantic 模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class KnowledgeBaseCreate(BaseModel):
    """创建知识库请求"""
    name: str
    description: Optional[str] = None


class KnowledgeBaseUpdate(BaseModel):
    """更新知识库请求"""
    name: Optional[str] = None
    description: Optional[str] = None


class KnowledgeBaseResponse(BaseModel):
    """知识库响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    chroma_collection_name: str | None = None
    created_at: datetime | None = None

    @field_serializer("created_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


class KnowledgeDocumentResponse(BaseModel):
    """知识库文档响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    knowledge_base_id: int
    filename: str
    file_type: str
    chunk_count: int
    uploaded_at: datetime | None = None

    @field_serializer("uploaded_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None
