"""手工测试全生命周期管理 - 数据模型

涵盖：测试用例 → 套件 → 版本 → 评审 → 执行 → 报告
共 18 个 ORM 模型，全部在同一个迁移中创建。
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ==============================
# 1. 测试用例管理
# ==============================


class TestManagementCase(Base):
    """手工测试用例"""
    __tablename__ = "test_management_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="用例标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="用例描述")
    preconditions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="前置条件")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="HIGH/MEDIUM/LOW")
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="draft/pending_review/approved/rejected"
    )
    case_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="功能/性能/安全/兼容性/UI")
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # 关联
    project = relationship("Project", backref="test_management_cases")
    author = relationship("User", foreign_keys=[author_id])
    steps = relationship(
        "TestManagementCaseStep", back_populates="case",
        cascade="all, delete-orphan", order_by="TestManagementCaseStep.step_number",
    )
    comments = relationship(
        "TestManagementCaseComment", back_populates="case",
        cascade="all, delete-orphan", order_by="TestManagementCaseComment.created_at",
    )
    attachments = relationship(
        "TestManagementCaseAttachment", back_populates="case",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<TestManagementCase(id={self.id}, title='{self.title[:30]}')>"


class TestManagementCaseStep(Base):
    """测试用例步骤"""
    __tablename__ = "test_management_case_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False, comment="步骤序号")
    action: Mapped[str] = mapped_column(Text, nullable=False, comment="操作描述")
    expected_result: Mapped[str] = mapped_column(Text, nullable=False, comment="预期结果")

    case = relationship("TestManagementCase", back_populates="steps")

    def __repr__(self) -> str:
        return f"<Step {self.step_number}: {self.action[:30]}>"


class TestManagementCaseAttachment(Base):
    """测试用例附件"""
    __tablename__ = "test_management_case_attachments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False, comment="原始文件名")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, comment="存储路径")
    file_size: Mapped[int] = mapped_column(Integer, default=0, comment="文件大小（字节）")
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    case = relationship("TestManagementCase", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class TestManagementCaseComment(Base):
    """测试用例评论"""
    __tablename__ = "test_management_case_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="评论内容")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    case = relationship("TestManagementCase", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


# ==============================
# 2. 测试套件管理
# ==============================


class TestManagementSuite(Base):
    """测试套件"""
    __tablename__ = "test_management_suites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="套件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project")
    author = relationship("User", foreign_keys=[author_id])
    case_links = relationship(
        "TestManagementSuiteCase", back_populates="suite",
        cascade="all, delete-orphan", order_by="TestManagementSuiteCase.order",
    )


class TestManagementSuiteCase(Base):
    """套件-用例关联（有序 M2M）"""
    __tablename__ = "test_management_suite_cases"
    __table_args__ = (
        UniqueConstraint("suite_id", "case_id", name="uq_suite_case"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    suite_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_suites.id", ondelete="CASCADE"), nullable=False,
    )
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")

    suite = relationship("TestManagementSuite", back_populates="case_links")
    case = relationship("TestManagementCase")


# ==============================
# 3. 版本管理
# ==============================


class TestManagementVersion(Base):
    """版本"""
    __tablename__ = "test_management_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="版本名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否基线版本")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    project_links = relationship("TestManagementVersionProject", back_populates="version", cascade="all, delete-orphan")


class TestManagementVersionProject(Base):
    """版本-项目关联"""
    __tablename__ = "test_management_version_projects"
    __table_args__ = (
        UniqueConstraint("version_id", "project_id", name="uq_version_project"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_versions.id", ondelete="CASCADE"), nullable=False,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False,
    )

    version = relationship("TestManagementVersion", back_populates="project_links")
    project = relationship("Project")


# ==============================
# 4. 评审管理
# ==============================


class TestManagementReview(Base):
    """测试用例评审"""
    __tablename__ = "test_management_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="评审标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="draft/in_progress/completed",
    )
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    creator = relationship("User", foreign_keys=[creator_id])
    assignments = relationship(
        "TestManagementReviewAssignment", back_populates="review",
        cascade="all, delete-orphan",
    )
    comments = relationship(
        "TestManagementReviewComment", back_populates="review",
        cascade="all, delete-orphan",
    )
    project_links = relationship("TestManagementReviewProject", back_populates="review", cascade="all, delete-orphan")
    case_links = relationship("TestManagementReviewCase", back_populates="review", cascade="all, delete-orphan")


class TestManagementReviewProject(Base):
    """评审-项目关联"""
    __tablename__ = "test_management_review_projects"
    __table_args__ = (
        UniqueConstraint("review_id", "project_id", name="uq_review_project"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False,
    )

    review = relationship("TestManagementReview", back_populates="project_links")
    project = relationship("Project")


class TestManagementReviewCase(Base):
    """评审-用例关联"""
    __tablename__ = "test_management_review_cases"
    __table_args__ = (
        UniqueConstraint("review_id", "case_id", name="uq_review_case"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )

    review = relationship("TestManagementReview", back_populates="case_links")
    case = relationship("TestManagementCase")


class TestManagementReviewAssignment(Base):
    """评审分配"""
    __tablename__ = "test_management_review_assignments"
    __table_args__ = (
        UniqueConstraint("review_id", "reviewer_id", name="uq_review_reviewer"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="pending/completed")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    checklist_results: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="检查清单逐项结果")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    review = relationship("TestManagementReview", back_populates="assignments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class TestManagementReviewComment(Base):
    """评审意见（逐用例）"""
    __tablename__ = "test_management_review_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    review = relationship("TestManagementReview", back_populates="comments")
    case = relationship("TestManagementCase")
    author = relationship("User", foreign_keys=[author_id])


class TestManagementReviewTemplate(Base):
    """评审模板"""
    __tablename__ = "test_management_review_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模板名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    checklist: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="检查清单项列表")
    default_reviewers: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="默认评审人 ID 列表")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


# ==============================
# 5. 执行管理
# ==============================


class TestManagementPlan(Base):
    """测试计划"""
    __tablename__ = "test_management_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    version_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_management_versions.id"), nullable=True,
    )
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("Project")
    version = relationship("TestManagementVersion")
    creator = relationship("User", foreign_keys=[creator_id])
    runs = relationship("TestManagementRun", back_populates="plan", cascade="all, delete-orphan")


class TestManagementRun(Base):
    """测试执行"""
    __tablename__ = "test_management_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_plans.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/in_progress/completed",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    plan = relationship("TestManagementPlan", back_populates="runs")
    assignee = relationship("User", foreign_keys=[assignee_id])
    run_cases = relationship(
        "TestManagementRunCase", back_populates="run",
        cascade="all, delete-orphan",
    )


class TestManagementRunCase(Base):
    """执行-用例关联"""
    __tablename__ = "test_management_run_cases"
    __table_args__ = (
        UniqueConstraint("run_id", "case_id", name="uq_run_case"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_runs.id", ondelete="CASCADE"), nullable=False,
    )
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="untested",
        comment="untested/passed/failed/blocked",
    )
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    defects: Mapped[str | None] = mapped_column(Text, nullable=True, comment="缺陷链接/编号")
    elapsed_time: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="耗时（秒）")
    executed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    run = relationship("TestManagementRun", back_populates="run_cases")
    case = relationship("TestManagementCase")
    executor = relationship("User", foreign_keys=[executed_by])
    histories = relationship(
        "TestManagementRunCaseHistory", back_populates="run_case",
        cascade="all, delete-orphan", order_by="TestManagementRunCaseHistory.executed_at",
    )


class TestManagementRunCaseHistory(Base):
    """执行状态变更历史"""
    __tablename__ = "test_management_run_case_histories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_run_cases.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    run_case = relationship("TestManagementRunCase", back_populates="histories")
    executor = relationship("User", foreign_keys=[executed_by])


# ==============================
# 6. 报告管理
# ==============================


class TestManagementReport(Base):
    """测试报告"""
    __tablename__ = "test_management_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), default="custom", comment="daily/weekly/custom")
    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_management_runs.id"), nullable=True,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="报告详细内容（JSON）")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    project = relationship("Project")
    run = relationship("TestManagementRun")
    creator = relationship("User", foreign_keys=[created_by])


class TestManagementReportTemplate(Base):
    """报告模板"""
    __tablename__ = "test_management_report_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    template_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
