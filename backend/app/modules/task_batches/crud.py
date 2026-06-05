"""任务批次 CRUD 操作"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.pagination import PageParams, PaginatedResponse, paginate

from .models import TaskBatch
from .schemas import TaskBatchResponse


async def get_batches(
    db: AsyncSession, page_params: PageParams
) -> PaginatedResponse[TaskBatchResponse]:
    """获取所有任务批次（分页）"""
    query = select(TaskBatch).order_by(TaskBatch.created_at.desc())
    return await paginate(db, query, page_params, TaskBatchResponse, base_url="/api/batches")


async def get_batch(db: AsyncSession, batch_id: int) -> TaskBatch | None:
    """获取单个任务批次"""
    result = await db.execute(select(TaskBatch).where(TaskBatch.id == batch_id))
    return result.scalar_one_or_none()


async def get_project_batches(
    db: AsyncSession, project_id: int, page_params: PageParams
) -> PaginatedResponse[TaskBatchResponse]:
    """获取项目的所有任务批次（分页）"""
    query = select(TaskBatch).where(TaskBatch.project_id == project_id).order_by(TaskBatch.created_at.desc())
    return await paginate(db, query, page_params, TaskBatchResponse, base_url=f"/api/batches/project/{project_id}")


async def create_batch(
    db: AsyncSession,
    project_id: int,
    task_type: str,
    total_count: int = 0,
) -> TaskBatch:
    """创建任务批次"""
    batch = TaskBatch(
        project_id=project_id,
        task_type=task_type,
        status="PENDING",
        total_count=total_count,
    )
    db.add(batch)
    await db.flush()
    await db.refresh(batch)
    return batch


async def update_batch_status(
    db: AsyncSession, batch: TaskBatch, status: str, **kwargs
) -> TaskBatch:
    """更新批次状态"""
    batch.status = status
    now = datetime.utcnow()
    if status == "RUNNING" and not batch.started_at:
        batch.started_at = now
    if status in ("COMPLETED", "FAILED"):
        batch.completed_at = now
    if status == "FAILED" and "error_message" in kwargs:
        batch.error_message = kwargs["error_message"]
    await db.flush()
    await db.refresh(batch)
    return batch


async def update_batch_progress(
    db: AsyncSession, batch_id: int, completed_count: int, total_count: int
) -> None:
    """更新批次进度"""
    from sqlalchemy import update
    progress = int((completed_count / total_count) * 100) if total_count > 0 else 0
    stmt = (
        update(TaskBatch)
        .where(TaskBatch.id == batch_id)
        .values(completed_count=completed_count, progress=progress)
    )
    await db.execute(stmt)
    await db.flush()
