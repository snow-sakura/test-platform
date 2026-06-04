"""系统设置 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import SystemSettings


async def get_all_settings(db: AsyncSession) -> list[SystemSettings]:
    """获取所有系统设置"""
    result = await db.execute(select(SystemSettings))
    return list(result.scalars().all())


async def get_setting(db: AsyncSession, key: str) -> SystemSettings | None:
    """获取单个配置"""
    result = await db.execute(
        select(SystemSettings).where(SystemSettings.key == key)
    )
    return result.scalar_one_or_none()


async def upsert_setting(
    db: AsyncSession,
    key: str,
    value: str,
    description: str | None = None,
) -> SystemSettings:
    """创建或更新配置（upsert）"""
    existing = await get_setting(db, key)
    if existing:
        existing.value = value
        if description is not None:
            existing.description = description
        await db.flush()
        await db.refresh(existing)
        return existing
    else:
        setting = SystemSettings(key=key, value=value, description=description)
        db.add(setting)
        await db.flush()
        await db.refresh(setting)
        return setting
