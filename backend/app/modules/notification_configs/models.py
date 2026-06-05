"""统一通知管理 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UnifiedNotificationConfig(Base):
    """统一通知配置（支持 Webhook 机器人）"""
    __tablename__ = "notification_configs"
    __table_args__ = {"comment": "统一通知配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    config_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="webhook", comment="feishu / dingtalk / wework / webhook / custom",
    )
    webhook_bots: Mapped[list | None] = mapped_column(
        JSON, nullable=True, comment="Webhook 机器人列表 [{\"name\":\"\",\"url\":\"\",\"enabled\":true}]",
    )
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否默认配置")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间",
    )
