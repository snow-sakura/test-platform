"""任务批次模型：异步任务的状态追踪"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskBatch(Base):
    """异步任务批次表，记录 AI 提取/生成任务的进度与状态"""
    __tablename__ = "task_batches"
    __table_args__ = {"comment": "异步任务批次"}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, comment="批次 ID"
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, comment="所属项目 ID"
    )
    task_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="任务类型: extract_test_points / generate_test_cases"
    )
    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", comment="状态: PENDING/RUNNING/COMPLETED/FAILED"
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, comment="进度百分比 0-100")
    total_count: Mapped[int] = mapped_column(Integer, default=0, comment="总处理数量")
    completed_count: Mapped[int] = mapped_column(Integer, default=0, comment="已完成数量")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )

    # 关联关系
    project = relationship("Project", back_populates="batches")

    def __repr__(self) -> str:
        return f"<TaskBatch(id={self.id}, type='{self.task_type}', status='{self.status}')>"
