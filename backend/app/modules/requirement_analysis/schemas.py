"""AI 用例生成模块 - Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ==============================
# 1. 需求文档
# ==============================


class RequirementDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    file: str | None = None
    content: str | None = None
    file_type: str | None = None
    uploader_id: int | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 2. 需求分析
# ==============================


class AnalyzeTextRequest(BaseModel):
    """分析纯文本请求"""
    text: str


class RequirementAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int | None = None
    analysis_text: str | None = None
    status: str
    result: list | dict | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 3. 业务需求
# ==============================


class BusinessRequirementUpdate(BaseModel):
    """更新业务需求"""
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    category: str | None = None


class BusinessRequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_id: int
    title: str
    description: str | None = None
    priority: str
    category: str | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 4. AI 生成用例
# ==============================


class GeneratedTestCaseCreate(BaseModel):
    """创建生成用例"""
    requirement_id: int | None = None
    task_id: int | None = None
    title: str
    scenario: str | None = None
    preconditions: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    priority: str = "MEDIUM"
    status: str = "draft"


class GeneratedTestCaseUpdate(BaseModel):
    """更新生成用例"""
    title: str | None = None
    scenario: str | None = None
    preconditions: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    priority: str | None = None
    status: str | None = None


class GeneratedTestCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requirement_id: int | None = None
    task_id: int | None = None
    title: str
    scenario: str | None = None
    preconditions: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    priority: str
    status: str
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class BatchStatusUpdateRequest(BaseModel):
    """批量状态更新请求"""
    ids: list[int]
    status: str


# ==============================
# 5. AI 模型配置
# ==============================


class AIModelConfigCreate(BaseModel):
    name: str
    model_type: str
    role: str = "testcase_writer"
    api_base: str
    api_key: str
    model_name: str
    temperature: float = 0.7
    max_tokens: int = 4096
    is_active: bool = False


class AIModelConfigUpdate(BaseModel):
    name: str | None = None
    model_type: str | None = None
    role: str | None = None
    api_base: str | None = None
    api_key: str | None = None
    model_name: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    is_active: bool | None = None


class AIModelConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    model_type: str
    role: str
    api_base: str
    api_key: str
    model_name: str
    temperature: float
    max_tokens: int
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class AIModelTestResult(BaseModel):
    success: bool
    message: str = ""


# ==============================
# 6. 提示词配置
# ==============================


class PromptConfigCreate(BaseModel):
    name: str
    prompt_type: str
    content: str
    is_active: bool = False


class PromptConfigUpdate(BaseModel):
    name: str | None = None
    prompt_type: str | None = None
    content: str | None = None
    is_active: bool | None = None


class PromptConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    prompt_type: str
    content: str
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 7. 生成行为配置
# ==============================


class GenerationConfigCreate(BaseModel):
    name: str
    test_level: str = "functional"
    test_priority: str = "MEDIUM"
    test_case_count: int = 10
    auto_review: bool = True
    review_timeout: int = 300
    is_active: bool = False


class GenerationConfigUpdate(BaseModel):
    name: str | None = None
    test_level: str | None = None
    test_priority: str | None = None
    test_case_count: int | None = None
    auto_review: bool | None = None
    review_timeout: int | None = None
    is_active: bool | None = None


class GenerationConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    test_level: str
    test_priority: str
    test_case_count: int
    auto_review: bool
    review_timeout: int
    is_active: bool
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 8. 生成任务
# ==============================


class TaskCreate(BaseModel):
    """创建生成任务"""
    source_type: str = "text"
    source_id: int | None = None
    mode: str = "stream"
    requirement_ids: list[int] = []  # 选中的业务需求 ID 列表


class TaskGenerateRequest(BaseModel):
    """启动生成请求"""
    writer_config_id: int
    writer_prompt_id: int | None = None
    generation_config_id: int | None = None
    reviewer_config_id: int | None = None
    reviewer_prompt_id: int | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: str
    source_type: str
    source_id: int | None = None
    status: str
    mode: str
    progress: int
    error_message: str | None = None
    is_saved_to_records: bool
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None

    @field_validator("created_at", "started_at", "completed_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class TaskDetailResponse(TaskResponse):
    """任务详情（含完整内容）"""
    generated_content: str | None = None
    review_feedback: str | None = None
    final_test_cases: str | None = None
    stream_buffer: str | None = None


# ==============================
# 9. 配置状态
# ==============================


class ConfigStatusItem(BaseModel):
    configured: bool
    active: bool = False
    label: str = ""


class ConfigStatusResponse(BaseModel):
    writer_model: ConfigStatusItem
    reviewer_model: ConfigStatusItem
    writer_prompt: ConfigStatusItem
    reviewer_prompt: ConfigStatusItem
    generation_config: ConfigStatusItem
