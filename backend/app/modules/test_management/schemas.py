"""手工测试全生命周期管理 - Pydantic 请求/响应模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


# ==============================
# 1. 测试用例管理
# ==============================


class TestCaseStepCreate(BaseModel):
    """创建步骤"""
    step_number: int
    action: str
    expected_result: str


class TestCaseStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    step_number: int
    action: str
    expected_result: str


class TestCaseAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    filename: str
    file_path: str
    file_size: int
    uploaded_by: int | None = None
    uploaded_at: str | None = None

    @field_validator("uploaded_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class TestCaseCommentCreate(BaseModel):
    content: str


class TestCaseCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    author_id: int | None = None
    content: str
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class TestCaseCreate(BaseModel):
    """创建测试用例"""
    title: str
    description: str | None = None
    preconditions: str | None = None
    priority: str = "MEDIUM"
    status: str = "draft"
    case_type: str | None = None
    steps: list[TestCaseStepCreate] = []


class TestCaseUpdate(BaseModel):
    """更新测试用例"""
    title: str | None = None
    description: str | None = None
    preconditions: str | None = None
    priority: str | None = None
    status: str | None = None
    case_type: str | None = None
    steps: list[TestCaseStepCreate] | None = None


class TestCaseListResponse(BaseModel):
    """测试用例列表响应（不含嵌套步骤/附件/评论）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None = None
    preconditions: str | None = None
    priority: str
    status: str
    case_type: str | None = None
    author_id: int | None = None
    step_count: int = 0
    comment_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class TestCaseDetailResponse(BaseModel):
    """测试用例详情（含完整嵌套）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str | None = None
    preconditions: str | None = None
    priority: str
    status: str
    case_type: str | None = None
    author_id: int | None = None
    steps: list[TestCaseStepResponse] = []
    comments: list[TestCaseCommentResponse] = []
    attachments: list[TestCaseAttachmentResponse] = []
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 2. 测试套件管理
# ==============================


class SuiteCaseCreate(BaseModel):
    case_id: int
    order: int = 0


class TestSuiteCreate(BaseModel):
    name: str
    description: str | None = None
    case_ids: list[int] = []


class TestSuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    case_ids: list[int] | None = None


class TestSuiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    description: str | None = None
    author_id: int | None = None
    case_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class TestSuiteDetailResponse(TestSuiteResponse):
    """套件详情（含用例列表）"""
    cases: list[TestCaseListResponse] = []


# ==============================
# 3. 版本管理
# ==============================


class VersionCreate(BaseModel):
    name: str
    description: str | None = None
    is_baseline: bool = False
    project_ids: list[int] = []


class VersionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_baseline: bool | None = None
    project_ids: list[int] | None = None


class VersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    is_baseline: bool = False
    created_by: int
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 4. 评审管理
# ==============================


class ReviewAssignmentCreate(BaseModel):
    reviewer_id: int


class ReviewCommentCreate(BaseModel):
    case_id: int
    content: str


class ReviewCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str = "MEDIUM"
    deadline: str | None = None
    project_ids: list[int] = []
    case_ids: list[int] = []
    reviewer_ids: list[int] = []
    template_id: int | None = None


class ReviewUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    deadline: str | None = None


class ReviewAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    reviewer_id: int | None = None
    status: str
    comment: str | None = None
    checklist_results: dict | None = None
    completed_at: str | None = None

    @field_validator("completed_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ReviewCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    case_id: int
    author_id: int | None = None
    content: str
    is_resolved: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    creator_id: int | None = None
    status: str
    priority: str
    deadline: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", "deadline", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ReviewDetailResponse(ReviewResponse):
    """评审详情（含分配/意见/用例）"""
    assignments: list[ReviewAssignmentResponse] = []
    comments: list[ReviewCommentResponse] = []
    cases: list[TestCaseListResponse] = []
    case_count: int = 0
    progress: dict = {}  # {"total": n, "completed": n, "pending": n}


class ReviewTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    checklist: list = []
    default_reviewers: list[int] = []


class ReviewTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    checklist: list = []
    default_reviewers: list = []
    is_active: bool = True
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 5. 执行管理
# ==============================


class PlanCreate(BaseModel):
    name: str
    description: str | None = None
    project_id: int
    version_id: int | None = None
    case_ids: list[int] = []
    assignee_ids: list[int] = []


class PlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    project_id: int
    version_id: int | None = None
    creator_id: int | None = None
    is_active: bool = True
    run_count: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class RunCaseUpdate(BaseModel):
    """更新执行用例状态"""
    status: str  # untested/passed/failed/blocked
    actual_result: str | None = None
    comments: str | None = None
    defects: str | None = None
    elapsed_time: int | None = None


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_id: int
    name: str
    assignee_id: int | None = None
    status: str
    total_cases: int = 0
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    untested: int = 0
    created_at: str | None = None
    updated_at: str | None = None

    @field_validator("created_at", "updated_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class RunCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    case_id: int
    status: str
    actual_result: str | None = None
    comments: str | None = None
    defects: str | None = None
    elapsed_time: int | None = None
    executed_by: int | None = None
    executed_at: str | None = None

    @field_validator("executed_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


# ==============================
# 6. 报告管理
# ==============================


class ReportCreate(BaseModel):
    name: str
    report_type: str = "custom"
    run_id: int | None = None
    summary: str | None = None
    content: dict | None = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    report_type: str
    run_id: int | None = None
    summary: str | None = None
    content: dict | None = None
    created_by: int | None = None
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ReportTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    template_config: dict
    is_default: bool = False
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class ReportTemplateUpdate(BaseModel):
    """更新报告模板"""
    name: str | None = None
    template_config: dict | None = None
    is_default: bool | None = None


class ReviewAssignersCreate(BaseModel):
    """为评审分配评审人"""
    reviewer_ids: list[int]


# ==============================
# 仪表盘统计
# ==============================


class TestManagementDashboardStats(BaseModel):
    """测试管理仪表盘统计"""
    total_cases: int = 0
    total_suites: int = 0
    total_plans: int = 0
    total_runs: int = 0
    total_reviews: int = 0
    my_pending_reviews: int = 0
    pass_rate: float = 0.0
    today_executions: int = 0


class DefectDistribution(BaseModel):
    """缺陷分布统计（按优先级）"""
    high: int = 0
    medium: int = 0
    low: int = 0


class AiEfficiencyItem(BaseModel):
    """AI 效能对比数据项"""
    period: str
    ai_generated: int = 0
    manual: int = 0


class TeamWorkloadItem(BaseModel):
    """团队工作量数据项"""
    user_id: int
    username: str
    case_count: int = 0
