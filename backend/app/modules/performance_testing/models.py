"""性能测试模块 - 数据模型（场景/执行/报告/JMeter）"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PerformanceScene(Base):
    """压测场景"""
    __tablename__ = "performance_scenes"
    __table_args__ = {"comment": "压测场景"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="场景 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="场景名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    scenario_type: Mapped[str] = mapped_column(
        String(20), default="httpx", comment="httpx / jmeter",
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="场景配置（URL/并发/持续时间等）")
    status: Mapped[str] = mapped_column(String(20), default="draft", comment="draft/ready/archived")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by])
    executions = relationship("PerformanceExecution", back_populates="scene", cascade="all, delete-orphan")


class PerformanceJMXFile(Base):
    """上传的 JMeter JMX 文件"""
    __tablename__ = "performance_jmx_files"
    __table_args__ = {"comment": "JMeter JMX 文件"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="文件 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="文件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    file_path: Mapped[str] = mapped_column(String(500), nullable=False, comment="存储路径")
    file_size: Mapped[int] = mapped_column(Integer, default=0, comment="文件大小（字节）")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    creator = relationship("User", foreign_keys=[created_by])


class PerformanceExecution(Base):
    """压测执行记录"""
    __tablename__ = "performance_executions"
    __table_args__ = {"comment": "压测执行记录"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="执行 ID")
    scene_id: Mapped[int] = mapped_column(ForeignKey("performance_scenes.id", ondelete="CASCADE"), nullable=False, comment="关联场景", index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/running/completed/failed",
    )
    config_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="执行时的配置快照")
    # 聚合统计
    concurrent_users: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="并发用户数")
    total_requests: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="总请求数")
    total_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="总耗时(ms)")
    avg_response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="平均响应时间(ms)")
    p50_response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="P50 响应时间(ms)")
    p90_response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="P90 响应时间(ms)")
    p95_response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="P95 响应时间(ms)")
    p99_response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="P99 响应时间(ms)")
    error_rate: Mapped[float | None] = mapped_column(Float, nullable=True, comment="错误率(0-1)")
    throughput: Mapped[float | None] = mapped_column(Float, nullable=True, comment="吞吐量(req/s)")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    scene = relationship("PerformanceScene", back_populates="executions")
    creator = relationship("User", foreign_keys=[created_by])
    reports = relationship("PerformanceReport", back_populates="execution", cascade="all, delete-orphan")


class PerformanceReport(Base):
    """压测报告"""
    __tablename__ = "performance_reports"
    __table_args__ = {"comment": "压测报告"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="报告 ID")
    execution_id: Mapped[int] = mapped_column(
        ForeignKey("performance_executions.id", ondelete="CASCADE"), nullable=False, comment="关联执行", index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="报告名称")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="报告摘要")
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="详细报告内容（时间序列/分位值等）")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    execution = relationship("PerformanceExecution", back_populates="reports")
