"""任务批次相关的 Pydantic 模型"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer


class TaskBatchResponse(BaseModel):
    """任务批次响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    task_type: str
    status: str
    progress: int
    total_count: int
    completed_count: int
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None

    @field_serializer("started_at", "completed_at", "created_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None
