"""测试用例 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import TestCase


async def get_test_cases(db: AsyncSession, project_id: int) -> list[TestCase]:
    """获取项目的所有测试用例"""
    result = await db.execute(
        select(TestCase)
        .where(TestCase.project_id == project_id)
        .order_by(TestCase.created_at.desc())
    )
    return list(result.scalars().all())


async def get_test_case(db: AsyncSession, case_id: int) -> TestCase | None:
    """获取单个测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == case_id))
    return result.scalar_one_or_none()


async def create_test_case(
    db: AsyncSession,
    project_id: int,
    test_point_id: int,
    title: str,
    precondition: str | None = None,
    steps: list | None = None,
    expected_result: str | None = None,
    priority: str = "MEDIUM",
    case_type: str | None = None,
    case_number: str | None = None,
) -> TestCase:
    """创建测试用例"""
    tc = TestCase(
        project_id=project_id,
        test_point_id=test_point_id,
        case_number=case_number,
        title=title,
        precondition=precondition,
        steps=steps or [],
        expected_result=expected_result,
        priority=priority,
        case_type=case_type,
    )
    db.add(tc)
    await db.flush()
    await db.refresh(tc)
    return tc


async def update_test_case(db: AsyncSession, tc: TestCase, data: dict) -> TestCase:
    """更新测试用例"""
    for field, value in data.items():
        if value is not None:
            setattr(tc, field, value)
    await db.flush()
    await db.refresh(tc)
    return tc


async def delete_test_case(db: AsyncSession, tc: TestCase) -> None:
    """删除测试用例"""
    await db.delete(tc)
    await db.flush()


async def batch_create_test_cases(
    db: AsyncSession, cases_data: list[dict]
) -> list[TestCase]:
    """批量创建测试用例"""
    test_cases = [TestCase(**data) for data in cases_data]
    db.add_all(test_cases)
    await db.flush()
    for tc in test_cases:
        await db.refresh(tc)
    return test_cases
