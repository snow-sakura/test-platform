"""数据工厂 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DataFactoryRecord(Base):
    """数据工厂执行记录"""
    __tablename__ = "data_factory_records"
    __table_args__ = {"comment": "数据工厂执行记录"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="记录 ID")
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="用户 ID")
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="工具名称")
    tool_category: Mapped[str] = mapped_column(String(50), nullable=False, comment="工具分类")
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="输入参数")
    output_data: Mapped[str | None] = mapped_column(Text, nullable=True, comment="输出结果")
    tags: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="标签（逗号分隔）")
    tool_scenario: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="使用场景标签")
    is_saved: Mapped[bool] = mapped_column(default=False, comment="是否已保存")
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )
