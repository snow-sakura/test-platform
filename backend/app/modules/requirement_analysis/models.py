"""AI 用例生成模块 - 数据模型（8个表）

表前缀 ra_ = requirement_analysis
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RequirementDocument(Base):
    """需求文档"""
    __tablename__ = "ra_documents"
    __table_args__ = {"comment": "需求文档（上传的原始文件 + 提取文本）"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="文档 ID")
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="文档标题")
    file: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="文件存储路径")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="提取的文本内容")
    file_type: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="文件类型: pdf/docx/md/txt")
    uploader_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="上传者",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )

    uploader = relationship("User", foreign_keys=[uploader_id])
    analyses = relationship("RequirementAnalysis", back_populates="document", cascade="all, delete-orphan")


class RequirementAnalysis(Base):
    """需求分析记录"""
    __tablename__ = "ra_analyses"
    __table_args__ = {"comment": "需求分析记录"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="分析 ID")
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_documents.id", ondelete="SET NULL"), nullable=True, comment="关联文档",
    )
    analysis_text: Mapped[str | None] = mapped_column(Text, nullable=True, comment="直接输入的文本（非文档）")
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/processing/completed/failed",
    )
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="分析结果（提取的需求列表）")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )

    document = relationship("RequirementDocument", back_populates="analyses")
    business_requirements = relationship(
        "BusinessRequirement", back_populates="analysis", cascade="all, delete-orphan",
    )


class BusinessRequirement(Base):
    """业务需求（从文档分析提取）"""
    __tablename__ = "ra_business_requirements"
    __table_args__ = {"comment": "业务需求"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="需求 ID")
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("ra_analyses.id", ondelete="CASCADE"), nullable=False, comment="关联分析",
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="需求标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="需求描述")
    priority: Mapped[str] = mapped_column(
        String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW",
    )
    category: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="分类: 功能/性能/安全/兼容性/UI",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )

    analysis = relationship("RequirementAnalysis", back_populates="business_requirements")


class GeneratedTestCase(Base):
    """AI 生成的测试用例"""
    __tablename__ = "ra_generated_test_cases"
    __table_args__ = {"comment": "AI 生成的测试用例"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="用例 ID")
    requirement_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_business_requirements.id", ondelete="SET NULL"), nullable=True, comment="关联需求",
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_tasks.id", ondelete="SET NULL"), nullable=True, comment="关联生成任务",
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="用例标题")
    scenario: Mapped[str | None] = mapped_column(Text, nullable=True, comment="测试场景")
    preconditions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="前置条件")
    steps: Mapped[str | None] = mapped_column(Text, nullable=True, comment="测试步骤")
    expected_result: Mapped[str | None] = mapped_column(Text, nullable=True, comment="预期结果")
    priority: Mapped[str] = mapped_column(
        String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW",
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="draft/reviewed/approved/rejected",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )


class AIModelConfig(Base):
    """AI 模型配置"""
    __tablename__ = "ra_ai_model_configs"
    __table_args__ = {"comment": "AI 模型配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    model_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="deepseek/qwen/siliconflow/openai",
    )
    role: Mapped[str] = mapped_column(
        String(30), default="testcase_writer",
        comment="testcase_writer/testcase_reviewer/browser_use_text/browser_use_vision",
    )
    api_base: Mapped[str] = mapped_column(String(500), nullable=False, comment="API 地址")
    api_key: Mapped[str] = mapped_column(String(500), nullable=False, comment="API 密钥")
    model_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模型名称")
    temperature: Mapped[float] = mapped_column(Float, default=0.7, comment="温度参数")
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096, comment="最大 Token 数")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )


class PromptConfig(Base):
    """提示词配置"""
    __tablename__ = "ra_prompt_configs"
    __table_args__ = {"comment": "提示词配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    prompt_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="testcase_writer/testcase_reviewer",
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="提示词内容")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )


class GenerationConfig(Base):
    """生成行为配置"""
    __tablename__ = "ra_generation_configs"
    __table_args__ = {"comment": "生成行为配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    test_level: Mapped[str] = mapped_column(String(50), default="functional", comment="测试级别")
    test_priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="优先级")
    test_case_count: Mapped[int] = mapped_column(Integer, default=10, comment="生成用例数量")
    auto_review: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否自动评审")
    review_timeout: Mapped[int] = mapped_column(Integer, default=300, comment="评审超时（秒）")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否启用（单例模式）")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )


class TestCaseGenerationTask(Base):
    """AI 用例生成任务（核心模型）"""
    __tablename__ = "ra_tasks"
    __table_args__ = {"comment": "AI 用例生成任务"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="自增 ID")
    task_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True, comment="任务唯一 ID",
    )
    source_type: Mapped[str] = mapped_column(
        String(20), default="text", comment="来源类型: document/text",
    )
    source_id: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="来源 ID（analysis_id 或 null）")
    status: Mapped[str] = mapped_column(
        String(20), default="pending",
        comment="pending/generating/reviewing/revising/completed/failed/cancelled",
    )
    mode: Mapped[str] = mapped_column(String(20), default="stream", comment="stream/complete")
    writer_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_ai_model_configs.id", ondelete="SET NULL"), nullable=True,
    )
    reviewer_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_ai_model_configs.id", ondelete="SET NULL"), nullable=True,
    )
    writer_prompt_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_prompt_configs.id", ondelete="SET NULL"), nullable=True,
    )
    reviewer_prompt_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_prompt_configs.id", ondelete="SET NULL"), nullable=True,
    )
    generation_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("ra_generation_configs.id", ondelete="SET NULL"), nullable=True,
    )
    generated_content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="LLM 生成的原始内容")
    review_feedback: Mapped[str | None] = mapped_column(Text, nullable=True, comment="AI 评审反馈")
    final_test_cases: Mapped[str | None] = mapped_column(Text, nullable=True, comment="最终用例（Markdown）")
    stream_buffer: Mapped[str | None] = mapped_column(Text, nullable=True, comment="流式缓冲（每500字符保存）")
    progress: Mapped[int] = mapped_column(Integer, default=0, comment="进度 0-100")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    is_saved_to_records: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否已保存到用例库")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )

    writer_config = relationship("AIModelConfig", foreign_keys=[writer_config_id])
    reviewer_config = relationship("AIModelConfig", foreign_keys=[reviewer_config_id])
    writer_prompt = relationship("PromptConfig", foreign_keys=[writer_prompt_id])
    reviewer_prompt = relationship("PromptConfig", foreign_keys=[reviewer_prompt_id])
    generation_config = relationship("GenerationConfig", foreign_keys=[generation_config_id])
