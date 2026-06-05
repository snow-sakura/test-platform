"""AI 评测师 - Pydantic schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class DifyConfigCreate(BaseModel):
    name: str
    api_url: str
    api_key: str
    is_active: bool = False


class DifyConfigUpdate(BaseModel):
    name: str | None = None
    api_url: str | None = None
    api_key: str | None = None
    is_active: bool | None = None


class DifyConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    api_url: str
    api_key: str
    is_active: bool = False
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class SessionCreate(BaseModel):
    title: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    session_id: str
    conversation_id: str | None = None
    title: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    message_count: int = 0

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: str
    content: str
    conversation_id: str | None = None
    message_id: str | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class ChatRequest(BaseModel):
    """发送消息请求"""
    session_id: str
    query: str


class DifyTestResult(BaseModel):
    success: bool
    message: str = ""
