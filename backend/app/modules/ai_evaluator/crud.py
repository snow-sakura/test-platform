"""AI 评测师 - CRUD 操作"""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import AssistantSession, ChatMessage, DifyConfig


# ====== Dify 配置 ======

async def create_dify_config(db: AsyncSession, data: dict) -> DifyConfig:
    config = DifyConfig(**data)
    if data.get("is_active"):
        await deactivate_all_configs(db)
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return config


async def get_dify_config(db: AsyncSession, config_id: int) -> DifyConfig | None:
    return await db.get(DifyConfig, config_id)


async def get_dify_configs(db: AsyncSession) -> list[DifyConfig]:
    result = await db.execute(
        select(DifyConfig).order_by(DifyConfig.created_at.desc())
    )
    return list(result.scalars().all())


async def get_active_dify_config(db: AsyncSession) -> DifyConfig | None:
    result = await db.execute(
        select(DifyConfig).where(DifyConfig.is_active == True).limit(1)
    )
    return result.scalar_one_or_none()


async def update_dify_config(db: AsyncSession, config: DifyConfig, data: dict) -> DifyConfig:
    if data.get("is_active"):
        await deactivate_all_configs(db)
    for key, value in data.items():
        setattr(config, key, value)
    await db.flush()
    await db.refresh(config)
    return config


async def delete_dify_config(db: AsyncSession, config: DifyConfig) -> None:
    await db.delete(config)
    await db.flush()


async def deactivate_all_configs(db: AsyncSession) -> None:
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(DifyConfig).values(is_active=False)
    )


# ====== 会话 ======

async def create_session(db: AsyncSession, user_id: int, title: str | None = None) -> AssistantSession:
    session = AssistantSession(
        user_id=user_id,
        session_id=str(uuid.uuid4()),
        title=title or "新对话",
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: str) -> AssistantSession | None:
    result = await db.execute(
        select(AssistantSession).where(AssistantSession.session_id == session_id)
        .options(selectinload(AssistantSession.messages))
    )
    return result.scalar_one_or_none()


async def get_user_sessions(db: AsyncSession, user_id: int) -> list[AssistantSession]:
    result = await db.execute(
        select(AssistantSession).where(AssistantSession.user_id == user_id)
        .order_by(AssistantSession.updated_at.desc())
    )
    return list(result.scalars().all())


async def update_session(
    db: AsyncSession, session: AssistantSession, data: dict,
) -> AssistantSession:
    for key, value in data.items():
        setattr(session, key, value)
    await db.flush()
    await db.refresh(session)
    return session


async def delete_session(db: AsyncSession, session: AssistantSession) -> None:
    await db.delete(session)
    await db.flush()


async def update_session_conversation(
    db: AsyncSession, session: AssistantSession, conversation_id: str,
) -> AssistantSession:
    session.conversation_id = conversation_id
    await db.flush()
    return session


# ====== 消息 ======

async def create_message(
    db: AsyncSession, session_id: int, role: str, content: str,
    conversation_id: str | None = None, message_id: str | None = None,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        conversation_id=conversation_id,
        message_id=message_id,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)
    return msg


async def get_session_messages(
    db: AsyncSession, session_id: int,
) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars().all())
