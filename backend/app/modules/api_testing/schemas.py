"""接口测试模块 Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ====== API 项目 ======

class ApiProjectCreate(BaseModel):
    """创建 API 项目请求"""
    name: str
    description: str = ""
    type: str = "HTTP"
    status: str = "active"


class ApiProjectUpdate(BaseModel):
    """更新 API 项目请求"""
    name: str | None = None
    description: str | None = None
    type: str | None = None
    status: str | None = None


class ApiProjectResponse(BaseModel):
    """API 项目响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    type: str | None = None
    status: str = "active"
    collection_count: int = 0
    request_count: int = 0
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== API 集合 ======

class ApiCollectionCreate(BaseModel):
    """创建集合请求"""
    project_id: int
    name: str
    parent_id: int | None = None
    sort_order: int = 0


class ApiCollectionUpdate(BaseModel):
    """更新集合请求"""
    name: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None


class ApiCollectionTreeNode(BaseModel):
    """集合树节点"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    parent_id: int | None = None
    sort_order: int = 0
    children: list[ApiCollectionTreeNode] = []
    request_count: int = 0


class ApiCollectionResponse(BaseModel):
    """集合响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    parent_id: int | None = None
    sort_order: int = 0
    request_count: int = 0
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== API 请求 ======

class ApiRequestCreate(BaseModel):
    """创建请求"""
    collection_id: int
    name: str
    method: str = "GET"
    url: str = ""
    headers: dict = {}
    query_params: dict = {}
    body: dict | None = None
    body_type: str = "none"
    expected_response: dict = {}
    is_favorite: bool = False
    sort_order: int = 0


class ApiRequestUpdate(BaseModel):
    """更新请求"""
    name: str | None = None
    method: str | None = None
    url: str | None = None
    headers: dict | None = None
    query_params: dict | None = None
    body: dict | None = None
    body_type: str | None = None
    expected_response: dict | None = None
    is_favorite: bool | None = None
    sort_order: int | None = None


class ApiRequestResponse(BaseModel):
    """请求响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    collection_id: int
    name: str
    method: str
    url: str
    headers: dict = {}
    query_params: dict = {}
    body: dict | None = None
    body_type: str | None = None
    expected_response: dict = {}
    is_favorite: bool = False
    sort_order: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== 请求执行 ======

class RequestExecuteRequest(BaseModel):
    """执行请求的传入参数（覆盖请求定义）"""
    method: str | None = None
    url: str | None = None
    headers: dict | None = None
    query_params: dict | None = None
    body: dict | None = None
    body_type: str | None = None
    environment_id: int | None = None
    project_id: int | None = None


class RequestExecuteResponse(BaseModel):
    """执行请求的响应"""
    status_code: int
    headers: dict = {}
    body: str = ""
    elapsed_ms: float = 0
    history_id: int | None = None


class BatchExecuteRequest(BaseModel):
    """批量执行请求"""
    request_ids: list[int]
    environment_id: int | None = None
    project_id: int | None = None


class SingleRequestResult(BaseModel):
    """单个请求执行结果"""
    request_id: int
    request_name: str = ""
    method: str = ""
    url: str = ""
    status_code: int | None = None
    elapsed_ms: float = 0
    passed: bool = False
    error: str | None = None


class BatchExecuteResponse(BaseModel):
    """批量执行响应"""
    total: int = 0
    passed: int = 0
    failed: int = 0
    results: list[SingleRequestResult] = []
    duration_ms: float = 0
    started_at: str = ""
    finished_at: str = ""


# ====== 测试套件 ======

class ApiTestSuiteCreate(BaseModel):
    """创建套件"""
    project_id: int
    name: str
    description: str = ""
    request_ids: list[int] = []


class ApiTestSuiteUpdate(BaseModel):
    """更新套件"""
    name: str | None = None
    description: str | None = None
    request_ids: list[int] | None = None


class ApiTestSuiteResponse(BaseModel):
    """套件响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    request_ids: list = []
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== 环境 ======

class ApiEnvironmentCreate(BaseModel):
    """创建环境"""
    project_id: int | None = None
    name: str
    env_type: str = "local"
    variables: dict = {}
    is_active: bool = False


class ApiEnvironmentUpdate(BaseModel):
    """更新环境"""
    name: str | None = None
    variables: dict | None = None
    is_active: bool | None = None


class ApiEnvironmentResponse(BaseModel):
    """环境响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    name: str
    env_type: str
    variables: dict = {}
    is_active: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== 请求历史 ======

class ApiRequestHistoryResponse(BaseModel):
    """历史记录响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int | None = None
    project_id: int
    method: str
    url: str
    headers: dict | None = None
    query_params: dict | None = None
    body: dict | None = None
    response_status: int | None = None
    response_body: str | None = None
    response_headers: dict | None = None
    elapsed_time: float | None = None
    executed_at: str | None = None

    @field_validator("executed_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class HistoryBatchDelete(BaseModel):
    """批量删除历史请求"""
    ids: list[int]


class HistoryClearRequest(BaseModel):
    """清空项目历史"""
    project_id: int


# ====== 定时任务 ======

class ApiScheduledTaskCreate(BaseModel):
    """创建定时任务"""
    name: str
    task_type: str = "suite"
    suite_id: int | None = None
    request_id: int | None = None
    cron_expression: str = "0 9 * * 1-5"
    trigger_type: str = "cron"
    interval_seconds: int | None = None


class ApiScheduledTaskUpdate(BaseModel):
    """更新定时任务"""
    name: str | None = None
    cron_expression: str | None = None
    trigger_type: str | None = None
    interval_seconds: int | None = None
    status: str | None = None


class ApiScheduledTaskResponse(BaseModel):
    """定时任务响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    task_type: str
    suite_id: int | None = None
    request_id: int | None = None
    cron_expression: str
    trigger_type: str
    interval_seconds: int | None = None
    status: str
    last_executed_at: str | None = None
    created_at: str | None = None

    @field_validator("last_executed_at", "created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== 通知配置 ======

class ApiNotificationConfigCreate(BaseModel):
    """创建通知配置"""
    name: str
    notify_type: str
    webhook_url: str
    secret: str | None = None
    is_active: bool = True


class ApiNotificationConfigUpdate(BaseModel):
    """更新通知配置"""
    name: str | None = None
    notify_type: str | None = None
    webhook_url: str | None = None
    secret: str | None = None
    is_active: bool | None = None


class ApiNotificationConfigResponse(BaseModel):
    """通知配置响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    notify_type: str
    webhook_url: str
    secret: str | None = None
    is_active: bool = True
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ApiNotificationLogResponse(BaseModel):
    """通知日志响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    config_id: int
    event_type: str
    status: str
    message: str | None = None
    response: str | None = None
    sent_at: str | None = None

    @field_validator("sent_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ====== 仪表盘 ======

class DashboardStats(BaseModel):
    """仪表盘统计"""
    project_count: int = 0
    request_count: int = 0
    suite_count: int = 0
    today_executions: int = 0
