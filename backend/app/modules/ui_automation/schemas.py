"""UI 自动化测试模块 - Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ==============================
# 1. 项目管理
# ==============================


class UiProjectCreate(BaseModel):
    name: str
    description: str | None = None
    url: str | None = None
    browser_type: str = "chromium"


class UiProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    url: str | None = None
    browser_type: str | None = None
    status: str | None = None


class UiProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    url: str | None = None
    browser_type: str = "chromium"
    status: str = "active"
    element_count: int = 0
    page_object_count: int = 0
    script_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 2. 元素管理
# ==============================


class UiElementGroupCreate(BaseModel):
    project_id: int
    name: str
    parent_id: int | None = None
    sort_order: int = 0


class UiElementGroupUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None


class UiElementGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    parent_id: int | None = None
    sort_order: int = 0
    children: list[UiElementGroupResponse] = []
    element_count: int = 0


class UiBackupLocator(BaseModel):
    type: str
    value: str


class UiElementCreate(BaseModel):
    project_id: int
    name: str
    locator_type: str
    locator_value: str
    backup_locators: list[UiBackupLocator] | None = None
    group_id: int | None = None
    page_url: str | None = None
    description: str | None = None


class UiElementUpdate(BaseModel):
    name: str | None = None
    locator_type: str | None = None
    locator_value: str | None = None
    backup_locators: list[UiBackupLocator] | None = None
    group_id: int | None = None
    page_url: str | None = None
    description: str | None = None


class UiElementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    locator_type: str
    locator_value: str
    backup_locators: list | None = None
    group_id: int | None = None
    page_url: str | None = None
    description: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class UiElementValidateResult(BaseModel):
    """元素定位验证结果"""
    locator_type: str
    locator_value: str
    found: bool
    error: str | None = None


class UiElementUsageResponse(BaseModel):
    """元素使用情况响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    script_id: int
    element_id: int
    usage_count: int = 0
    context: str | None = None


# ==============================
# 3. 页面对象
# ==============================


class UiPageObjectCreate(BaseModel):
    project_id: int
    name: str
    url: str | None = None
    element_ids: list[int] = []


class UiPageObjectUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    generated_code: str | None = None
    element_ids: list[int] | None = None


class UiPageObjectElementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    page_object_id: int
    element_id: int
    alias: str | None = None
    order: int = 0


class UiPageObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    url: str | None = None
    generated_code: str | None = None
    element_count: int = 0
    element_links: list[UiPageObjectElementResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 4. 脚本管理
# ==============================


class UiScriptStepCreate(BaseModel):
    step_number: int
    action_type: str
    element_id: int | None = None
    input_value: str | None = None
    expected_result: str | None = None
    wait_seconds: float | None = None


class UiScriptStepUpdate(BaseModel):
    step_number: int | None = None
    action_type: str | None = None
    element_id: int | None = None
    input_value: str | None = None
    expected_result: str | None = None
    wait_seconds: float | None = None


class UiScriptStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    script_id: int
    step_number: int
    action_type: str
    element_id: int | None = None
    input_value: str | None = None
    expected_result: str | None = None
    wait_seconds: float | None = None


class UiTestScriptCreate(BaseModel):
    project_id: int
    name: str
    page_object_id: int | None = None
    description: str | None = None
    steps: list[UiScriptStepCreate] = []


class UiTestScriptUpdate(BaseModel):
    name: str | None = None
    page_object_id: int | None = None
    description: str | None = None
    steps: list[UiScriptStepCreate] | None = None


class UiTestScriptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    page_object_id: int | None = None
    description: str | None = None
    step_count: int = 0
    steps: list[UiScriptStepResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 5. 用例与套件
# ==============================


class UiTestCaseCreate(BaseModel):
    project_id: int
    name: str
    script_id: int | None = None
    priority: str = "MEDIUM"
    status: str = "draft"
    test_data: dict | None = None


class UiTestCaseUpdate(BaseModel):
    name: str | None = None
    script_id: int | None = None
    priority: str | None = None
    status: str | None = None
    test_data: dict | None = None


class UiTestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    script_id: int | None = None
    priority: str = "MEDIUM"
    status: str = "draft"
    test_data: dict | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class UiTestSuiteCreate(BaseModel):
    project_id: int
    name: str
    description: str | None = None
    case_ids: list[int] = []


class UiTestSuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    case_ids: list[int] | None = None


class UiTestSuiteResponse(BaseModel):
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


class UiTestSuiteDetailResponse(UiTestSuiteResponse):
    """套件详情（含用例列表）"""
    cases: list[UiTestCaseResponse] = []


# ==============================
# 6. 执行管理
# ==============================


class UiTestExecutionCreate(BaseModel):
    suite_id: int | None = None
    test_case_id: int | None = None


class UiTestExecutionUpdate(BaseModel):
    status: str | None = None
    result: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    error_message: str | None = None


class UiScreenshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    execution_id: int
    step_id: int | None = None
    image_path: str
    captured_at: str | None = None

    @field_validator("captured_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class UiOperationRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    execution_id: int
    step_id: int | None = None
    action_type: str
    detail: str | None = None
    success: bool = True
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class UiTestExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    suite_id: int | None = None
    test_case_id: int | None = None
    status: str = "pending"
    result: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: float | None = None
    error_message: str | None = None
    created_at: str | None = None
    screenshots: list[UiScreenshotResponse] = []
    operation_records: list[UiOperationRecordResponse] = []

    @field_validator("started_at", "completed_at", "created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class UiExecuteScriptResult(BaseModel):
    """单脚本执行结果"""
    script_id: int
    script_name: str
    passed: bool
    duration_ms: float
    error: str | None = None
    screenshots: list[str] = []
    steps: list[dict] = []


class UiExecuteSuiteResult(BaseModel):
    """套件执行汇总结果"""
    suite_id: int
    suite_name: str
    total: int
    passed: int
    failed: int
    duration_ms: float
    results: list[UiExecuteScriptResult] = []


# ==============================
# 7. 定时任务
# ==============================


class UiScheduledTaskCreate(BaseModel):
    name: str
    suite_id: int | None = None
    cron_expression: str = "0 9 * * 1-5"
    trigger_type: str = "cron"
    interval_seconds: int | None = None


class UiScheduledTaskUpdate(BaseModel):
    name: str | None = None
    suite_id: int | None = None
    cron_expression: str | None = None
    trigger_type: str | None = None
    interval_seconds: int | None = None
    status: str | None = None


class UiScheduledTaskResponse(BaseModel):
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


# ==============================
# 8. 通知管理
# ==============================


class UiNotificationConfigCreate(BaseModel):
    name: str
    notify_type: str
    webhook_url: str
    secret: str | None = None


class UiNotificationConfigUpdate(BaseModel):
    name: str | None = None
    notify_type: str | None = None
    webhook_url: str | None = None
    secret: str | None = None
    is_active: bool | None = None


class UiNotificationConfigResponse(BaseModel):
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


class UiNotificationLogResponse(BaseModel):
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
# 9. 环境配置
# ==============================


class UiEnvironmentCreate(BaseModel):
    project_id: int | None = None
    name: str
    browser_type: str = "chromium"
    window_width: int = 1280
    window_height: int = 720
    timeout_ms: int = 30000
    headless: bool = True
    screenshot_on_failure: bool = True
    record_video: bool = False


class UiEnvironmentUpdate(BaseModel):
    name: str | None = None
    browser_type: str | None = None
    window_width: int | None = None
    window_height: int | None = None
    timeout_ms: int | None = None
    headless: bool | None = None
    screenshot_on_failure: bool | None = None
    record_video: bool | None = None


class UiEnvironmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    name: str
    browser_type: str = "chromium"
    window_width: int = 1280
    window_height: int = 720
    timeout_ms: int = 30000
    headless: bool = True
    screenshot_on_failure: bool = True
    record_video: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 10. 仪表盘统计
# ==============================


class UiDashboardStats(BaseModel):
    """UI 自动化仪表盘统计"""
    project_count: int = 0
    element_count: int = 0
    script_count: int = 0
    today_executions: int = 0
    pass_rate: float = 0.0
