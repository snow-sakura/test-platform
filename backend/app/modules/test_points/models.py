"""测试点模型：AI 提取或手动创建的测试点"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestPoint(Base):
    """测试点表，记录从文档提取或手动创建的测试点"""
    __tablename__ = "test_points"
    __table_args__ = {"comment": "测试点"}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, comment="测试点 ID"
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, comment="所属项目 ID"
    )
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, comment="来源文档（AI 提取时关联）"
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="测试点标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="测试点描述")
    priority: Mapped[str] = mapped_column(
        String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW"
    )
    category: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="分类: 功能/UI/性能/安全/兼容性"
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否已人工校验确认"
    )
    verified_by: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="校验人")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="校验时间")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )

    # 关联关系
    project = relationship("Project", back_populates="test_points")
    document = relationship("Document", back_populates="test_points")
    test_cases = relationship("TestCase", back_populates="test_point", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<TestPoint(id={self.id}, title='{self.title[:30]}')>"
