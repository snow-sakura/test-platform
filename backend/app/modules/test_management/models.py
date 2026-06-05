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
    __table_args__ = {"comment": "手工测试用例"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="用例 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID")
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="用例标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="用例描述")
    preconditions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="前置条件")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="HIGH/MEDIUM/LOW")
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="draft/pending_review/approved/rejected"
    )
    case_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="功能/性能/安全/兼容性/UI")
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

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
    __table_args__ = {"comment": "测试用例步骤"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="步骤 ID")
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
    __table_args__ = {"comment": "测试用例附件"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="附件 ID")
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False, comment="原始文件名")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, comment="存储路径")
    file_size: Mapped[int] = mapped_column(Integer, default=0, comment="文件大小（字节）")
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="上传时间")

    case = relationship("TestManagementCase", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class TestManagementCaseComment(Base):
    """测试用例评论"""
    __tablename__ = "test_management_case_comments"
    __table_args__ = {"comment": "测试用例评论"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="评论 ID")
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="评论内容")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    case = relationship("TestManagementCase", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


# ==============================
# 2. 测试套件管理
# ==============================


class TestManagementSuite(Base):
    """测试套件"""
    __tablename__ = "test_management_suites"
    __table_args__ = {"comment": "测试套件"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="套件 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="套件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="套件描述")
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

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
        {"comment": "套件-用例关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
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
    __table_args__ = {"comment": "版本"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="版本 ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="版本名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="版本描述")
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否基线版本")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    creator = relationship("User", foreign_keys=[created_by])
    project_links = relationship("TestManagementVersionProject", back_populates="version", cascade="all, delete-orphan")


class TestManagementVersionProject(Base):
    """版本-项目关联"""
    __tablename__ = "test_management_version_projects"
    __table_args__ = (
        UniqueConstraint("version_id", "project_id", name="uq_version_project"),
        {"comment": "版本-项目关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
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
    __table_args__ = {"comment": "测试用例评审"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="评审 ID")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="评审标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="评审描述")
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="draft/in_progress/completed",
    )
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW")
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

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
        {"comment": "评审-项目关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
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
        {"comment": "评审-用例关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
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
        {"comment": "评审分配"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="分配 ID")
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="pending/completed")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    checklist_results: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="检查清单逐项结果")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    review = relationship("TestManagementReview", back_populates="assignments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class TestManagementReviewComment(Base):
    """评审意见（逐用例）"""
    __tablename__ = "test_management_review_comments"
    __table_args__ = {"comment": "评审意见"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="意见 ID")
    review_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_reviews.id", ondelete="CASCADE"), nullable=False,
    )
    case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_cases.id", ondelete="CASCADE"), nullable=False,
    )
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="意见内容")
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已解决")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    review = relationship("TestManagementReview", back_populates="comments")
    case = relationship("TestManagementCase")
    author = relationship("User", foreign_keys=[author_id])


class TestManagementReviewTemplate(Base):
    """评审模板"""
    __tablename__ = "test_management_review_templates"
    __table_args__ = {"comment": "评审模板"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="模板 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模板名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="模板描述")
    checklist: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="检查清单项列表")
    default_reviewers: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="默认评审人 ID 列表")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")


# ==============================
# 5. 执行管理
# ==============================


class TestManagementPlan(Base):
    """测试计划"""
    __tablename__ = "test_management_plans"
    __table_args__ = {"comment": "测试计划"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="计划 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="计划名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="计划描述")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_management_versions.id", ondelete="CASCADE"), nullable=True,
    )
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否激活")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("Project")
    version = relationship("TestManagementVersion")
    creator = relationship("User", foreign_keys=[creator_id])
    runs = relationship("TestManagementRun", back_populates="plan", cascade="all, delete-orphan")


class TestManagementRun(Base):
    """测试执行"""
    __tablename__ = "test_management_runs"
    __table_args__ = {"comment": "测试执行"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="执行 ID")
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_plans.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="执行名称")
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/in_progress/completed",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

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
        {"comment": "执行用例关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
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
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True, comment="实际结果")
    comments: Mapped[str | None] = mapped_column(Text, nullable=True, comment="备注")
    defects: Mapped[str | None] = mapped_column(Text, nullable=True, comment="缺陷链接/编号")
    elapsed_time: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="耗时（秒）")
    executed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
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
    __table_args__ = {"comment": "执行状态变更历史"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="历史 ID")
    run_case_id: Mapped[int] = mapped_column(
        ForeignKey("test_management_run_cases.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="状态")
    actual_result: Mapped[str | None] = mapped_column(Text, nullable=True, comment="实际结果")
    executed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="执行时间")

    run_case = relationship("TestManagementRunCase", back_populates="histories")
    executor = relationship("User", foreign_keys=[executed_by])


# ==============================
# 6. 报告管理
# ==============================


class TestManagementReport(Base):
    """测试报告"""
    __tablename__ = "test_management_reports"
    __table_args__ = {"comment": "测试报告"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="报告 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="报告名称")
    report_type: Mapped[str] = mapped_column(String(50), default="custom", comment="daily/weekly/custom")
    run_id: Mapped[int | None] = mapped_column(
        ForeignKey("test_management_runs.id", ondelete="SET NULL"), nullable=True,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="报告摘要")
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="报告详细内容（JSON）")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    project = relationship("Project")
    run = relationship("TestManagementRun")
    creator = relationship("User", foreign_keys=[created_by])


class TestManagementReportTemplate(Base):
    """报告模板"""
    __tablename__ = "test_management_report_templates"
    __table_args__ = {"comment": "报告模板"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="模板 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    template_config: Mapped[dict] = mapped_column(JSON, nullable=False, comment="模板配置")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否默认")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
