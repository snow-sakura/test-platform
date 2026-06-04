"""测试点 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import TestPoint


async def get_test_points(db: AsyncSession, project_id: int) -> list[TestPoint]:
    """获取项目的所有测试点"""
    result = await db.execute(
        select(TestPoint)
        .where(TestPoint.project_id == project_id)
        .order_by(TestPoint.created_at.desc())
    )
    return list(result.scalars().all())


async def get_test_point(db: AsyncSession, tp_id: int) -> TestPoint | None:
    """获取单个测试点"""
    result = await db.execute(select(TestPoint).where(TestPoint.id == tp_id))
    return result.scalar_one_or_none()


async def create_test_point(
    db: AsyncSession,
    project_id: int,
    title: str,
    description: str | None = None,
    priority: str = "MEDIUM",
    category: str | None = None,
    document_id: int | None = None,
) -> TestPoint:
    """创建测试点"""
    tp = TestPoint(
        project_id=project_id,
        document_id=document_id,
        title=title,
        description=description,
        priority=priority,
        category=category,
    )
    db.add(tp)
    await db.flush()
    await db.refresh(tp)
    return tp


async def update_test_point(db: AsyncSession, tp: TestPoint, data: dict) -> TestPoint:
    """更新测试点"""
    for field, value in data.items():
        if value is not None:
            setattr(tp, field, value)
    await db.flush()
    await db.refresh(tp)
    return tp


async def delete_test_point(db: AsyncSession, tp: TestPoint) -> None:
    """删除测试点"""
    await db.delete(tp)
    await db.flush()


async def batch_create_test_points(
    db: AsyncSession, points_data: list[dict]
) -> list[TestPoint]:
    """批量创建测试点"""
    test_points = [TestPoint(**data) for data in points_data]
    db.add_all(test_points)
    await db.flush()
    for tp in test_points:
        await db.refresh(tp)
    return test_points
