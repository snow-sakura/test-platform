"""数据工厂 - CRUD 操作"""
from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import DataFactoryRecord


async def create_record(db: AsyncSession, data: dict) -> DataFactoryRecord:
    record = DataFactoryRecord(**data)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def get_records(
    db: AsyncSession, tag: str | None = None,
    tool_name: str | None = None, tool_category: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[DataFactoryRecord], int]:
    query = select(DataFactoryRecord)
    if tag:
        query = query.where(DataFactoryRecord.tags.like(f"%{tag}%"))
    if tool_name:
        query = query.where(DataFactoryRecord.tool_name == tool_name)
    if tool_category:
        query = query.where(DataFactoryRecord.tool_category == tool_category)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(DataFactoryRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def delete_record(db: AsyncSession, record: DataFactoryRecord) -> None:
    await db.delete(record)
    await db.flush()


async def get_today_executions(db: AsyncSession) -> int:
    today = date.today()
    result = await db.execute(
        select(func.count(DataFactoryRecord.id))
        .where(func.date(DataFactoryRecord.created_at) == today)
    )
    return result.scalar() or 0


async def get_top_tools(db: AsyncSession, limit: int = 10) -> list[dict]:
    """获取使用最多的工具"""
    result = await db.execute(
        select(DataFactoryRecord.tool_name, func.count(DataFactoryRecord.id).label("count"))
        .group_by(DataFactoryRecord.tool_name)
        .order_by(func.count(DataFactoryRecord.id).desc())
        .limit(limit)
    )
    return [{"tool_name": row[0], "count": row[1]} for row in result.all()]
