"""AI 智能模式 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON, LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AICase(Base):
    """AI 智能测试用例"""
    __tablename__ = "ai_smart_cases"
    __table_args__ = {"comment": "AI 智能测试用例"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="用例 ID")
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, comment="关联项目"
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="用例名称")
    task_description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="自然语言任务描述")
    target_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="目标 URL")
    execution_mode: Mapped[str] = mapped_column(
        String(20), default="text", comment="执行模式: text/vision"
    )
    enable_gif: Mapped[bool] = mapped_column(default=False, comment="是否录制 GIF")
    planned_tasks: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="AI 规划的任务步骤")
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="状态: draft/ready/running/completed/failed"
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=True, comment="更新时间"
    )

    records: Mapped[list["AIExecutionRecord"]] = relationship(
        "AIExecutionRecord", back_populates="ai_case", lazy="selectin"
    )


class AIExecutionRecord(Base):
    """AI 执行记录"""
    __tablename__ = "ai_smart_execution_records"
    __table_args__ = {"comment": "AI 执行记录"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="记录 ID")
    ai_case_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ai_smart_cases.id", ondelete="SET NULL"), nullable=True, comment="关联 AI 用例"
    )
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, comment="关联项目"
    )
    task_description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="执行的任务描述")
    execution_mode: Mapped[str] = mapped_column(
        String(20), default="text", comment="执行模式: text/vision"
    )
    enable_gif: Mapped[bool] = mapped_column(default=False, comment="是否录制 GIF")
    steps_completed: Mapped[int] = mapped_column(Integer, default=0, comment="已完成步骤数")
    planned_tasks: Mapped[list | None] = mapped_column(JSON, nullable=True, comment="规划的任务步骤")
    execution_log: Mapped[str | None] = mapped_column(
        LONGTEXT, nullable=True, comment="执行日志（JSON 数组）"
    )
    gif_recording: Mapped[str | None] = mapped_column(
        String(500), nullable=True, comment="GIF 录制文件路径"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="状态: pending/running/completed/failed/cancelled"
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="执行总结")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )

    ai_case: Mapped[AICase | None] = relationship("AICase", back_populates="records", lazy="selectin")
