"""性能测试模块 - Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ==============================
# 场景管理
# ==============================


class SceneCreate(BaseModel):
    name: str
    description: str | None = None
    scenario_type: str = "httpx"
    config: dict | None = None


class SceneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    scenario_type: str | None = None
    config: dict | None = None
    status: str | None = None


class SceneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    scenario_type: str
    config: dict | None = None
    status: str
    created_by: int | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# JMX 文件管理
# ==============================


class JMXFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    file_path: str
    file_size: int
    created_by: int | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 执行管理
# ==============================


class ExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scene_id: int
    status: str
    config_snapshot: dict | None = None
    concurrent_users: int | None = None
    total_requests: int | None = None
    total_duration_ms: int | None = None
    avg_response_time_ms: float | None = None
    p50_response_time_ms: float | None = None
    p90_response_time_ms: float | None = None
    p95_response_time_ms: float | None = None
    p99_response_time_ms: float | None = None
    error_rate: float | None = None
    throughput: float | None = None
    error_message: str | None = None
    created_by: int | None = None
    started_at: str | None = None
    completed_at: str | None = None
    created_at: str | None = None

    @field_validator("started_at", "completed_at", "created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 报告管理
# ==============================


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    execution_id: int
    name: str
    summary: str | None = None
    content: dict | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value
