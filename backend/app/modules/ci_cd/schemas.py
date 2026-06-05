"""CI/CD 集成 - Pydantic schemas"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


# ==================== API Token ====================

class CiApiTokenCreate(BaseModel):
    """创建 API Token 请求"""
    name: str
    expires_in_days: int | None = None  # 过期天数，None 表示永不过期


class CiApiTokenCreateResponse(BaseModel):
    """创建 API Token 响应（仅创建时返回一次明文）"""
    id: int
    name: str
    token: str  # 明文 Token（创建后不再可获取）
    expires_at: str | None = None

    @field_validator("expires_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class CiApiTokenResponse(BaseModel):
    """API Token 列表响应（不返回 token 明文）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    last_used_at: str | None = None
    is_active: bool = True
    expires_at: str | None = None
    created_at: str | None = None

    @field_validator("last_used_at", "expires_at", "created_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


# ==================== Webhook ====================

class CiWebhookConfig(BaseModel):
    """Webhook 请求体（CI 系统发送过来的配置）"""
    event_type: str | None = "push"
    module_configs: list[dict[str, Any]] = []
    # module_config: {"module_type": "api_testing", "suite_id": 1, "environment_id": null}
    # module_config: {"module_type": "test_mgmt", "plan_id": 5}
    # module_config: {"module_type": "ui_auto", "suite_id": 2, "environment_id": 1}
    # module_config: {"module_type": "app_auto", "suite_id": 3}


class CiWebhookEventResponse(BaseModel):
    """Webhook 事件响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    ci_type: str
    event_type: str | None = None
    pipeline_id: int | None = None
    source_payload: dict[str, Any] | None = None
    headers: dict[str, Any] | None = None
    ip_address: str | None = None
    received_at: str | None = None

    @field_validator("received_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


# ==================== Pipeline ====================

class PipelineStepResponse(BaseModel):
    """管道步骤响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    pipeline_id: int
    step_order: int
    module_type: str
    module_config: dict[str, Any] | None = None
    status: str = "pending"
    result: dict[str, Any] | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    error_message: str | None = None
    created_at: str | None = None

    @field_validator("started_at", "completed_at", "created_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class CiPipelineResponse(BaseModel):
    """管道列表项响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    ci_type: str
    external_pipeline_id: str | None = None
    external_project: str | None = None
    external_ref: str | None = None
    status: str = "pending"
    trigger_event: str | None = None
    commit_sha: str | None = None
    commit_message: str | None = None
    author: str | None = None
    total_steps: int = 0
    passed_steps: int = 0
    failed_steps: int = 0
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    created_at: str | None = None

    @field_validator("started_at", "completed_at", "created_at", mode="before")
    @classmethod
    def datetime_to_str(cls, v: datetime | str | None) -> str | None:
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        return v


class CiPipelineDetailResponse(CiPipelineResponse):
    """管道详情响应（含步骤）"""
    steps: list[PipelineStepResponse] = []


# ==================== Config Template ====================

class CiConfigTemplateRequest(BaseModel):
    """生成 CI 配置模板请求"""
    ci_type: str  # gitlab / github / jenkins
    platform_url: str = "http://localhost:8000"
    token_name: str = "TESTPLATE_TOKEN"
    branch: str = "main"
    module_configs: list[dict[str, Any]] = []


class CiConfigTemplateResponse(BaseModel):
    """CI 配置模板响应"""
    ci_type: str
    filename: str
    content: str
