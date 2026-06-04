"""测试用例模型：AI 生成或手动创建的测试用例"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestCase(Base):
    """测试用例表，记录 AI 生成或手动创建的测试用例"""
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    test_point_id: Mapped[int] = mapped_column(
        ForeignKey("test_points.id"), nullable=False, comment="关联的测试点 ID"
    )
    case_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="用例编号: TC-{test_point_id}-{seq}"
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, comment="用例标题")
    precondition: Mapped[str | None] = mapped_column(Text, nullable=True, comment="前置条件")
    steps: Mapped[list | None] = mapped_column(
        JSON, nullable=True, comment="测试步骤: [{step, expected_result}]"
    )
    expected_result: Mapped[str | None] = mapped_column(Text, nullable=True, comment="总体预期结果")
    priority: Mapped[str] = mapped_column(
        String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW"
    )
    case_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="用例类型: 功能/性能/安全/兼容性/UI"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )

    # 关联关系
    project = relationship("Project", back_populates="test_cases")
    test_point = relationship("TestPoint", back_populates="test_cases")

    def __repr__(self) -> str:
        return f"<TestCase(id={self.id}, title='{self.title[:30]}')>"
