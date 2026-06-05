"""CI/CD 集成 - CRUD 操作"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.pagination import PaginatedResponse, paginate

from .models import CiApiToken, CiPipeline, CiPipelineStep, CiWebhookEvent

UTC8 = timezone(timedelta(hours=8))


# ==================== API Token ====================

async def create_api_token(db: AsyncSession, data: dict) -> CiApiToken:
    """创建 API Token"""
    token = CiApiToken(**data)
    db.add(token)
    await db.flush()
    await db.refresh(token)
    return token


async def get_api_tokens(db: AsyncSession) -> list[CiApiToken]:
    """获取所有 API Token"""
    result = await db.execute(
        select(CiApiToken).order_by(CiApiToken.created_at.desc()),
    )
    return list(result.scalars().all())


async def get_api_token_by_token(db: AsyncSession, token_hash: str) -> CiApiToken | None:
    """通过哈希值查找 Token"""
    result = await db.execute(
        select(CiApiToken).where(CiApiToken.token == token_hash),
    )
    return result.scalar_one_or_none()


async def get_api_token_by_id(db: AsyncSession, token_id: int) -> CiApiToken | None:
    """通过 ID 查找 Token"""
    result = await db.execute(
        select(CiApiToken).where(CiApiToken.id == token_id),
    )
    return result.scalar_one_or_none()


async def update_api_token_last_used(db: AsyncSession, token_id: int) -> None:
    """更新 Token 最后使用时间"""
    await db.execute(
        update(CiApiToken)
        .where(CiApiToken.id == token_id)
        .values(last_used_at=func.now()),
    )
    await db.flush()


async def delete_api_token(db: AsyncSession, token: CiApiToken) -> None:
    """删除 API Token"""
    await db.delete(token)
    await db.flush()


# ==================== Webhook Event ====================

async def create_webhook_event(db: AsyncSession, data: dict) -> CiWebhookEvent:
    """创建 Webhook 事件记录"""
    event = CiWebhookEvent(**data)
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def get_webhook_events(
    db: AsyncSession, ci_type: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[CiWebhookEvent], int]:
    """获取 Webhook 事件列表（分页）"""
    query = select(CiWebhookEvent)
    if ci_type:
        query = query.where(CiWebhookEvent.ci_type == ci_type)
    return await paginate(db, query, CiWebhookEvent, skip, limit)


# ==================== Pipeline ====================

async def create_pipeline(db: AsyncSession, data: dict) -> CiPipeline:
    """创建管道"""
    pipeline = CiPipeline(**data)
    db.add(pipeline)
    await db.flush()
    await db.refresh(pipeline)
    return pipeline


async def get_pipelines(
    db: AsyncSession,
    ci_type: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> PaginatedResponse:
    """获取管道列表（分页 + 过滤）"""
    query = select(CiPipeline).order_by(CiPipeline.created_at.desc())
    if ci_type:
        query = query.where(CiPipeline.ci_type == ci_type)
    if status:
        query = query.where(CiPipeline.status == status)
    return await paginate(db, query, CiPipeline, skip, limit)


async def get_pipeline(db: AsyncSession, pipeline_id: int) -> CiPipeline | None:
    """获取管道详情"""
    result = await db.execute(select(CiPipeline).where(CiPipeline.id == pipeline_id))
    return result.scalar_one_or_none()


async def update_pipeline(db: AsyncSession, pipeline_id: int, data: dict[str, Any]) -> CiPipeline | None:
    """更新管道"""
    await db.execute(
        update(CiPipeline).where(CiPipeline.id == pipeline_id).values(**data),
    )
    await db.flush()
    return await get_pipeline(db, pipeline_id)


# ==================== Pipeline Step ====================

async def create_pipeline_step(db: AsyncSession, data: dict) -> CiPipelineStep:
    """创建管道步骤"""
    step = CiPipelineStep(**data)
    db.add(step)
    await db.flush()
    await db.refresh(step)
    return step


async def get_pipeline_steps(db: AsyncSession, pipeline_id: int) -> list[CiPipelineStep]:
    """获取管道的所有步骤（按顺序）"""
    result = await db.execute(
        select(CiPipelineStep)
        .where(CiPipelineStep.pipeline_id == pipeline_id)
        .order_by(CiPipelineStep.step_order),
    )
    return list(result.scalars().all())


async def get_pipeline_step(db: AsyncSession, step_id: int) -> CiPipelineStep | None:
    """获取步骤详情"""
    result = await db.execute(select(CiPipelineStep).where(CiPipelineStep.id == step_id))
    return result.scalar_one_or_none()


async def update_pipeline_step(db: AsyncSession, step_id: int, data: dict[str, Any]) -> CiPipelineStep | None:
    """更新步骤"""
    await db.execute(
        update(CiPipelineStep).where(CiPipelineStep.id == step_id).values(**data),
    )
    await db.flush()
    return await get_pipeline_step(db, step_id)
