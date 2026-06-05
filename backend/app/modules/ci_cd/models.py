"""CI/CD 集成 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CiApiToken(Base):
    """CI/CD API Token（长期 Bearer Token，替代 JWT）"""
    __tablename__ = "ci_api_tokens"
    __table_args__ = {"comment": "CI/CD API Token"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="Token ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Token 名称")
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, comment="Token 哈希值")
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="创建用户 ID", index=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最后使用时间")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="过期时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )


class CiWebhookEvent(Base):
    """Webhook 事件记录（保留原始 payload 用于审计）"""
    __tablename__ = "ci_webhook_events"
    __table_args__ = {"comment": "CI Webhook 事件记录"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="事件 ID")
    ci_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="CI 类型: gitlab/github/jenkins")
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="事件类型（如 push/merge_request）")
    pipeline_id: Mapped[int | None] = mapped_column(
        ForeignKey("ci_pipelines.id", ondelete="SET NULL"), nullable=True, comment="关联管道 ID", index=True
    )
    source_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="原始请求 body")
    headers: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="请求头")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="来源 IP")
    received_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="接收时间",
    )


class CiPipeline(Base):
    """CI 管道 — 一次 CI 触发的测试执行全生命周期"""
    __tablename__ = "ci_pipelines"
    __table_args__ = {"comment": "CI 管道记录"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="管道 ID")
    ci_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="CI 类型: gitlab/github/jenkins")
    external_pipeline_id: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="外部 CI 管道 ID")
    external_project: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="外部项目全称")
    external_ref: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="外部分支/Tag 引用")
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="状态: pending/running/completed/failed/aborted",
    )
    trigger_event: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="触发事件类型")
    commit_sha: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="提交 SHA")
    commit_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="提交消息")
    author: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="提交作者")
    total_steps: Mapped[int] = mapped_column(Integer, default=0, comment="总步骤数")
    passed_steps: Mapped[int] = mapped_column(Integer, default=0, comment="通过步骤数")
    failed_steps: Mapped[int] = mapped_column(Integer, default=0, comment="失败步骤数")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    duration_ms: Mapped[float | None] = mapped_column(Integer, nullable=True, comment="总耗时(ms)")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )


class CiPipelineStep(Base):
    """管道步骤 — 一个具体的测试执行单元"""
    __tablename__ = "ci_pipeline_steps"
    __table_args__ = {"comment": "CI 管道步骤"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="步骤 ID")
    pipeline_id: Mapped[int] = mapped_column(
        ForeignKey("ci_pipelines.id", ondelete="CASCADE"), nullable=False, comment="所属管道 ID", index=True
    )
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, comment="执行顺序")
    module_type: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="模块类型: test_mgmt/api_testing/ui_auto/app_auto",
    )
    module_config: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="模块配置: {suite_id, plan_id, environment_id, ...}",
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="状态: pending/running/completed/failed/skipped",
    )
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="执行结果摘要")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    duration_ms: Mapped[float | None] = mapped_column(Integer, nullable=True, comment="耗时(ms)")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
