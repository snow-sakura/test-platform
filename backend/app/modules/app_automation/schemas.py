"""APP 自动化测试模块 - Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ==============================
# 项目
# ==============================


class AppProjectCreate(BaseModel):
    name: str
    description: str | None = None
    platform: str = "android"


class AppProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    platform: str | None = None
    status: str | None = None


class AppProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    platform: str = "android"
    status: str = "active"
    device_count: int = 0
    element_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 配置
# ==============================


class AppConfigCreate(BaseModel):
    name: str
    adb_path: str = "adb"
    device_timeout: int = 30
    screenshot_dir: str = "screenshots"


class AppConfigUpdate(BaseModel):
    name: str | None = None
    adb_path: str | None = None
    device_timeout: int | None = None
    screenshot_dir: str | None = None


class AppConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    adb_path: str = "adb"
    device_timeout: int = 30
    screenshot_dir: str = "screenshots"
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 设备
# ==============================


class DeviceCreate(BaseModel):
    project_id: int | None = None
    device_id: str
    name: str
    platform: str = "android"
    platform_version: str | None = None
    device_type: str = "real"
    resolution: str | None = None
    ip_address: str | None = None


class DeviceUpdate(BaseModel):
    name: str | None = None
    project_id: int | None = None
    platform_version: str | None = None
    status: str | None = None
    resolution: str | None = None
    ip_address: str | None = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    device_id: str
    name: str
    platform: str = "android"
    platform_version: str | None = None
    device_type: str = "real"
    status: str = "disconnected"
    resolution: str | None = None
    ip_address: str | None = None
    connected_at: str | None = None
    last_seen: str | None = None
    created_at: str | None = None

    @field_validator("connected_at", "last_seen", "created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 应用包
# ==============================


class AppPackageCreate(BaseModel):
    project_id: int
    package_name: str
    app_name: str
    main_activity: str | None = None
    version: str | None = None
    description: str | None = None


class AppPackageUpdate(BaseModel):
    """更新应用包（所有字段可选）"""
    package_name: str | None = None
    app_name: str | None = None
    main_activity: str | None = None
    version: str | None = None
    description: str | None = None


class AppPackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    package_name: str
    app_name: str
    main_activity: str | None = None
    version: str | None = None
    description: str | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 元素分类 & 元素
# ==============================


class AppImageCategoryCreate(BaseModel):
    project_id: int
    name: str
    description: str | None = None


class AppImageCategoryUpdate(BaseModel):
    """更新图片分类（所有字段可选）"""
    name: str | None = None
    description: str | None = None


class AppImageCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    element_count: int = 0
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class AppElementCreate(BaseModel):
    project_id: int
    name: str
    element_type: str = "image"
    image_path: str | None = None
    coordinates: dict | None = None
    threshold: float | None = None
    image_category_id: int | None = None
    description: str | None = None


class AppElementUpdate(BaseModel):
    name: str | None = None
    element_type: str | None = None
    image_path: str | None = None
    coordinates: dict | None = None
    threshold: float | None = None
    image_category_id: int | None = None
    description: str | None = None


class AppElementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    element_type: str
    image_path: str | None = None
    coordinates: dict | None = None
    threshold: float | None = None
    image_category_id: int | None = None
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 测试用例（场景编排）
# ==============================


class SceneStep(BaseModel):
    """场景编排中的一个步骤"""
    action: str  # click/swipe/input/wait/assert/screenshot
    element_id: int | None = None
    params: dict | None = None  # 如 {text, x, y, direction, duration, timeout}


class AppTestCaseCreate(BaseModel):
    project_id: int
    name: str
    package_id: int | None = None
    device_id: int | None = None
    scene_data: list[SceneStep] | None = None
    description: str | None = None
    priority: str = "MEDIUM"
    status: str = "draft"


class AppTestCaseUpdate(BaseModel):
    name: str | None = None
    package_id: int | None = None
    device_id: int | None = None
    scene_data: list[SceneStep] | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None


class AppTestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    package_id: int | None = None
    device_id: int | None = None
    scene_data: list | None = None
    description: str | None = None
    priority: str = "MEDIUM"
    status: str = "draft"
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 套件
# ==============================


class AppTestSuiteCreate(BaseModel):
    project_id: int
    name: str
    description: str | None = None
    case_ids: list[int] = []


class AppTestSuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    case_ids: list[int] | None = None


class AppTestSuiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    case_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class AppTestSuiteDetailResponse(AppTestSuiteResponse):
    cases: list[AppTestCaseResponse] = []


# ==============================
# 执行
# ==============================


class AppTestExecutionCreate(BaseModel):
    test_case_id: int | None = None
    suite_id: int | None = None
    device_id: int | None = None


class AppTestExecutionUpdate(BaseModel):
    status: str | None = None
    result: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    error_message: str | None = None


class AppScreenshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    execution_id: int
    step_index: int | None = None
    image_path: str
    captured_at: str | None = None

    @field_validator("captured_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class AppTestExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_case_id: int | None = None
    suite_id: int | None = None
    device_id: int | None = None
    status: str = "pending"
    result: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    error_message: str | None = None
    screenshots: list[AppScreenshotResponse] = []
    created_at: str | None = None

    @field_validator("started_at", "completed_at", "created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 组件库
# ==============================


class AppComponentCreate(BaseModel):
    project_id: int
    name: str
    component_type: str = "basic"
    config: dict | None = None
    description: str | None = None
    is_public: bool = False


class AppComponentUpdate(BaseModel):
    name: str | None = None
    component_type: str | None = None
    config: dict | None = None
    description: str | None = None
    is_public: bool | None = None


class AppComponentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    component_type: str = "basic"
    config: dict | None = None
    icon: str | None = None
    description: str | None = None
    is_public: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 定时任务 & 通知
# ==============================


class AppScheduledTaskCreate(BaseModel):
    name: str
    suite_id: int | None = None
    cron_expression: str = "0 9 * * 1-5"
    trigger_type: str = "cron"
    interval_seconds: int | None = None


class AppScheduledTaskUpdate(BaseModel):
    name: str | None = None
    suite_id: int | None = None
    cron_expression: str | None = None
    trigger_type: str | None = None
    interval_seconds: int | None = None
    status: str | None = None


class AppScheduledTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    suite_id: int | None = None
    cron_expression: str = "0 9 * * 1-5"
    trigger_type: str = "cron"
    interval_seconds: int | None = None
    status: str = "active"
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class AppNotificationLogResponse(BaseModel):
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


# ==============================
# 仪表盘
# ==============================


class AppDashboardStats(BaseModel):
    """APP 自动化仪表盘统计"""
    project_count: int = 0
    device_count: int = 0
    element_count: int = 0
    case_count: int = 0
    today_executions: int = 0
    pass_rate: float = 0.0
    available_devices: int = 0
