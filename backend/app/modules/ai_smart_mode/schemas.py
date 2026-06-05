"""AI 智能模式 - Pydantic schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


# ====== AI 用例 ======

class AICaseCreate(BaseModel):
    project_id: int | None = None
    name: str
    task_description: str | None = None
    target_url: str | None = None
    execution_mode: str = "text"
    enable_gif: bool = False


class AICaseUpdate(BaseModel):
    name: str | None = None
    task_description: str | None = None
    target_url: str | None = None
    execution_mode: str | None = None
    enable_gif: bool | None = None
    planned_tasks: list[dict[str, Any]] | None = None
    status: str | None = None


class AICaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    name: str
    task_description: str | None = None
    target_url: str | None = None
    execution_mode: str = "text"
    enable_gif: bool = False
    planned_tasks: list[dict[str, Any]] | None = None
    status: str = "draft"
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


# ====== 执行记录 ======

class AIExecutionRecordCreate(BaseModel):
    ai_case_id: int | None = None
    project_id: int | None = None
    task_description: str | None = None
    execution_mode: str = "text"
    enable_gif: bool = False


class AIExecutionRecordResponse(BaseModel):
    id: int
    ai_case_id: int | None = None
    project_id: int | None = None
    task_description: str | None = None
    execution_mode: str = "text"
    enable_gif: bool = False
    steps_completed: int = 0
    planned_tasks: list[dict[str, Any]] | None = None
    execution_log: list[dict[str, Any]] | None = None
    gif_recording: str | None = None
    status: str = "pending"
    summary: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    created_at: str | None = None

    @field_validator("created_at", "started_at", "completed_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v

    @field_validator("execution_log", mode="before")
    @classmethod
    def parse_execution_log(cls, v: str | list | None) -> list | None:
        """将 LONGTEXT 的 JSON 字符串解析为列表"""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return [{"raw": v}]
        return v


# ====== 仪表盘 ======

class AISmartStats(BaseModel):
    case_count: int = 0
    execution_count: int = 0
    today_executions: int = 0
    pass_rate: float = 0.0
    running_count: int = 0


# ====== Ad-hoc 执行 ======

class AdhocExecuteRequest(BaseModel):
    task_description: str
    target_url: str | None = None
    execution_mode: str = "text"
    enable_gif: bool = False


# ====== 报告 ======

class ExecutionReport(BaseModel):
    record_id: int
    case_name: str = ""
    task_description: str = ""
    status: str = ""
    summary: str | None = None
    steps_completed: int = 0
    planned_tasks: list[dict[str, Any]] | None = None
    execution_log: list[dict[str, Any]] | None = None
    gif_recording: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_seconds: float = 0.0
