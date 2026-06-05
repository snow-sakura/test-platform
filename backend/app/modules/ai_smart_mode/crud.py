"""AI 智能模式 - CRUD 操作"""
from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AICase, AIExecutionRecord


# ====== AI 用例 ======

async def create_ai_case(db: AsyncSession, data: dict) -> AICase:
    case = AICase(**data)
    db.add(case)
    await db.flush()
    await db.refresh(case)
    return case


async def get_ai_case(db: AsyncSession, case_id: int) -> AICase | None:
    return await db.get(AICase, case_id)


async def get_ai_cases(
    db: AsyncSession, project_id: int | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[AICase], int]:
    query = select(AICase)
    if project_id is not None:
        query = query.where(AICase.project_id == project_id)
    if status:
        query = query.where(AICase.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AICase.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_ai_case(db: AsyncSession, case: AICase, data: dict) -> AICase:
    for key, value in data.items():
        setattr(case, key, value)
    await db.flush()
    await db.refresh(case)
    return case


async def delete_ai_case(db: AsyncSession, case: AICase) -> None:
    await db.delete(case)
    await db.flush()


# ====== 执行记录 ======

async def create_execution_record(db: AsyncSession, data: dict) -> AIExecutionRecord:
    if "execution_log" in data and isinstance(data["execution_log"], list):
        data["execution_log"] = json.dumps(data["execution_log"], ensure_ascii=False)
    record = AIExecutionRecord(**data)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def get_execution_record(db: AsyncSession, record_id: int) -> AIExecutionRecord | None:
    return await db.get(AIExecutionRecord, record_id)


async def get_execution_records(
    db: AsyncSession, ai_case_id: int | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[AIExecutionRecord], int]:
    query = select(AIExecutionRecord)
    if ai_case_id is not None:
        query = query.where(AIExecutionRecord.ai_case_id == ai_case_id)
    if status:
        query = query.where(AIExecutionRecord.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AIExecutionRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_execution_record(
    db: AsyncSession, record: AIExecutionRecord, data: dict,
) -> AIExecutionRecord:
    for key, value in data.items():
        if key == "execution_log" and isinstance(value, list):
            value = json.dumps(value, ensure_ascii=False)
        setattr(record, key, value)
    await db.flush()
    await db.refresh(record)
    return record


async def delete_execution_record(db: AsyncSession, record: AIExecutionRecord) -> None:
    await db.delete(record)
    await db.flush()


async def delete_execution_records_batch(
    db: AsyncSession, ids: list[int],
) -> None:
    """批量删除执行记录"""
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(AIExecutionRecord).where(AIExecutionRecord.id.in_(ids)))
    await db.flush()


# ====== 统计 ======

async def get_today_execution_count(db: AsyncSession) -> int:
    today = date.today()
    result = await db.execute(
        select(func.count(AIExecutionRecord.id))
        .where(func.date(AIExecutionRecord.created_at) == today)
    )
    return result.scalar() or 0


async def get_execution_pass_rate(db: AsyncSession) -> float:
    total = (await db.execute(select(func.count(AIExecutionRecord.id)))).scalar() or 0
    if total == 0:
        return 0.0
    passed = (await db.execute(
        select(func.count(AIExecutionRecord.id))
        .where(AIExecutionRecord.status == "completed")
    )).scalar() or 0
    return round(passed / total * 100, 2)
