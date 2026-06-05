"""系统设置模型：支持运行时热更新的 key-value 配置"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemSettings(Base):
    """系统设置表，存储 LLM/飞书等可热更新的配置"""
    __tablename__ = "system_settings"
    __table_args__ = {"comment": "系统设置"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="设置 ID")
    key: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="配置键"
    )
    value: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置值")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置描述")
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=True, comment="更新时间"
    )

    def __repr__(self) -> str:
        return f"<SystemSettings(key='{self.key}')>"
