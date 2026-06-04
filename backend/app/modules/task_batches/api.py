"""任务批次追踪 API 路由"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .crud import get_batch, get_batches, get_project_batches, update_batch_status
from .schemas import TaskBatchResponse

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["batches"])


@router.get("/batches", response_model=list[TaskBatchResponse])
async def list_batches(
    db: AsyncSession = Depends(get_db),
):
    """获取所有任务批次"""
    batches = await get_batches(db)
    return [TaskBatchResponse.model_validate(b) for b in batches]


@router.get("/batches/{batch_id}", response_model=TaskBatchResponse)
async def retrieve_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取批次详情"""
    batch = await get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return TaskBatchResponse.model_validate(batch)


@router.get("/batches/project/{project_id}", response_model=list[TaskBatchResponse])
async def list_project_batches(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取项目下的任务批次列表"""
    batches = await get_project_batches(db, project_id)
    return [TaskBatchResponse.model_validate(b) for b in batches]


@router.put("/batches/{batch_id}/cancel", response_model=TaskBatchResponse)
async def cancel_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db),
):
    """取消任务批次（仅 PENDING/RUNNING 状态可取消）"""
    batch = await get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    if batch.status not in ("PENDING", "RUNNING"):
        raise HTTPException(status_code=400, detail="只能取消待处理或运行中的任务")
    batch = await update_batch_status(db, batch, "FAILED", error_message="用户手动取消")
    return TaskBatchResponse.model_validate(batch)
