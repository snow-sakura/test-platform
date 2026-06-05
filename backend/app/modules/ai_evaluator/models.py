"""AI 评测师 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DifyConfig(Base):
    """Dify 配置"""
    __tablename__ = "ai_evaluator_dify_configs"
    __table_args__ = {"comment": "Dify 配置"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="配置名称")
    api_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="Dify API URL")
    api_key: Mapped[str] = mapped_column(String(200), nullable=False, comment="Dify API Key")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否启用")
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=True, comment="更新时间"
    )


class AssistantSession(Base):
    """AI 评测师对话会话"""
    __tablename__ = "ai_evaluator_sessions"
    __table_args__ = {"comment": "AI 评测师会话"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="会话 ID")
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="用户 ID"
    )
    session_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="对外会话 ID"
    )
    conversation_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Dify Conversation ID"
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="会话标题")
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=True, comment="更新时间"
    )

    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", lazy="selectin",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    """对话消息"""
    __tablename__ = "ai_evaluator_messages"
    __table_args__ = {"comment": "对话消息"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="消息 ID")
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ai_evaluator_sessions.id", ondelete="CASCADE"),
        nullable=False, comment="会话 ID",
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="角色: user/assistant"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="消息内容")
    conversation_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Dify Conversation ID"
    )
    message_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Dify Message ID"
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, default=func.now(), nullable=True, comment="创建时间"
    )

    session: Mapped[AssistantSession] = relationship(
        "AssistantSession", back_populates="messages", lazy="selectin"
    )
