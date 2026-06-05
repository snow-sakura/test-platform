"""性能测试模块 - 数据库 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    PerformanceExecution, PerformanceJMXFile, PerformanceReport,
    PerformanceScene,
)


# ==============================
# 场景 CRUD
# ==============================


async def create_scene(db: AsyncSession, project_id: int, created_by: int, data: dict) -> PerformanceScene:
    scene = PerformanceScene(project_id=project_id, created_by=created_by, **data)
    db.add(scene)
    await db.flush()
    return scene


async def get_scene(db: AsyncSession, scene_id: int) -> PerformanceScene | None:
    return await db.get(PerformanceScene, scene_id)


async def get_scenes(
    db: AsyncSession, project_id: int, status: str | None = None,
    skip: int = 0, limit: int = 20, search: str | None = None,
) -> tuple[list[PerformanceScene], int]:
    """获取场景列表（分页+筛选）"""
    query = select(PerformanceScene).where(PerformanceScene.project_id == project_id)
    if status:
        query = query.where(PerformanceScene.status == status)
    if search:
        query = query.where(PerformanceScene.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(PerformanceScene.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_scene(db: AsyncSession, scene: PerformanceScene, data: dict) -> PerformanceScene:
    for key, value in data.items():
        setattr(scene, key, value)
    await db.flush()
    return scene


async def delete_scene(db: AsyncSession, scene: PerformanceScene) -> None:
    await db.delete(scene)
    await db.flush()


# ==============================
# JMX 文件 CRUD
# ==============================


async def create_jmx_file(
    db: AsyncSession, project_id: int, created_by: int,
    name: str, file_path: str, file_size: int, description: str | None = None,
) -> PerformanceJMXFile:
    jmx = PerformanceJMXFile(
        project_id=project_id, created_by=created_by,
        name=name, file_path=file_path, file_size=file_size,
        description=description,
    )
    db.add(jmx)
    await db.flush()
    return jmx


async def get_jmx_files(db: AsyncSession, project_id: int) -> list[PerformanceJMXFile]:
    result = await db.execute(
        select(PerformanceJMXFile)
        .where(PerformanceJMXFile.project_id == project_id)
        .order_by(PerformanceJMXFile.created_at.desc())
    )
    return list(result.scalars().all())


async def get_jmx_file(db: AsyncSession, file_id: int) -> PerformanceJMXFile | None:
    return await db.get(PerformanceJMXFile, file_id)


async def delete_jmx_file(db: AsyncSession, jmx: PerformanceJMXFile) -> None:
    await db.delete(jmx)
    await db.flush()


# ==============================
# 执行 CRUD
# ==============================


async def create_execution(db: AsyncSession, scene_id: int, created_by: int, data: dict | None = None) -> PerformanceExecution:
    execution = PerformanceExecution(scene_id=scene_id, created_by=created_by, **(data or {}))
    db.add(execution)
    await db.flush()
    return execution


async def get_execution(db: AsyncSession, execution_id: int) -> PerformanceExecution | None:
    return await db.get(PerformanceExecution, execution_id)


async def get_executions(
    db: AsyncSession, scene_id: int | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[PerformanceExecution], int]:
    query = select(PerformanceExecution)
    if scene_id:
        query = query.where(PerformanceExecution.scene_id == scene_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(PerformanceExecution.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_execution(db: AsyncSession, execution: PerformanceExecution, data: dict) -> PerformanceExecution:
    for key, value in data.items():
        setattr(execution, key, value)
    await db.flush()
    return execution


# ==============================
# 报告 CRUD
# ==============================


async def get_reports(
    db: AsyncSession, execution_id: int | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[PerformanceReport], int]:
    query = select(PerformanceReport)
    if execution_id:
        query = query.where(PerformanceReport.execution_id == execution_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(PerformanceReport.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_report(db: AsyncSession, report_id: int) -> PerformanceReport | None:
    return await db.get(PerformanceReport, report_id)
