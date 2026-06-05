"""统一通知管理 - CRUD"""
from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from . import models


async def get_configs(db: AsyncSession) -> list[models.UnifiedNotificationConfig]:
    return (await db.execute(
        select(models.UnifiedNotificationConfig).order_by(models.UnifiedNotificationConfig.id.desc()),
    )).scalars().all()


async def get_config(db: AsyncSession, config_id: int) -> models.UnifiedNotificationConfig | None:
    return (await db.execute(
        select(models.UnifiedNotificationConfig).where(models.UnifiedNotificationConfig.id == config_id),
    )).scalar_one_or_none()


async def create_config(db: AsyncSession, data: dict) -> models.UnifiedNotificationConfig:
    if data.get("is_default"):
        await db.execute(update(models.UnifiedNotificationConfig).values(is_default=False))
    obj = models.UnifiedNotificationConfig(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_config(db: AsyncSession, config_id: int, data: dict) -> models.UnifiedNotificationConfig | None:
    obj = await get_config(db, config_id)
    if not obj:
        return None
    if data.get("is_default"):
        await db.execute(update(models.UnifiedNotificationConfig).values(is_default=False))
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_config(db: AsyncSession, config_id: int) -> bool:
    obj = await get_config(db, config_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


async def set_default_config(db: AsyncSession, config_id: int) -> models.UnifiedNotificationConfig | None:
    obj = await get_config(db, config_id)
    if not obj:
        return None
    await db.execute(update(models.UnifiedNotificationConfig).values(is_default=False))
    obj.is_default = True
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_active_configs(db: AsyncSession) -> list[models.UnifiedNotificationConfig]:
    return (await db.execute(
        select(models.UnifiedNotificationConfig)
        .where(models.UnifiedNotificationConfig.is_active == True)
        .order_by(models.UnifiedNotificationConfig.id.desc()),
    )).scalars().all()
