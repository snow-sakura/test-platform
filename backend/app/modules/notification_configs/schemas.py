"""统一通知管理 - Pydantic 模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class NotificationConfigCreate(BaseModel):
    name: str
    config_type: str = "webhook"
    webhook_bots: list[dict] | None = None
    is_default: bool = False
    is_active: bool = True


class NotificationConfigUpdate(BaseModel):
    name: str | None = None
    config_type: str | None = None
    webhook_bots: list[dict] | None = None
    is_default: bool | None = None
    is_active: bool | None = None


class NotificationConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    config_type: str
    webhook_bots: list[dict] | None = None
    is_default: bool
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value
