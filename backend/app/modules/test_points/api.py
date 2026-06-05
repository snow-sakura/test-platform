"""测试点管理 API 路由"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.projects.crud import get_project
from app.modules.rbac.service import require_permission
from app.pagination import PageParams, PaginatedResponse

from .crud import (
    create_test_point, delete_test_point, get_test_point,
    get_test_points, update_test_point,
)
from .schemas import TestPointCreate, TestPointResponse, TestPointUpdate

from app.services.task_processor import extract_test_points_task

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["test_points"])


@router.post("/test-points/extract", status_code=status.HTTP_202_ACCEPTED)
async def extract_test_points(
    data: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("testpoint.create")),
):
    """AI 提取测试点（异步），传入 {document_ids, knowledge_base_ids?}"""
    from app.modules.documents.crud import get_document
    from app.modules.task_batches.crud import create_batch

    project_id = data.get("project_id")
    document_ids = data.get("document_ids", [])
    knowledge_base_ids = data.get("knowledge_base_ids", [])

    if not project_id or not document_ids:
        raise HTTPException(status_code=400, detail="缺少 project_id 或 document_ids")

    # 验证项目存在
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 验证文档属于该项目
    for doc_id in document_ids:
        doc = await get_document(db, doc_id)
        if not doc or doc.project_id != project_id:
            raise HTTPException(status_code=404, detail=f"文档 {doc_id} 不存在或不属于该项目")

    # 创建任务批次
    batch = await create_batch(
        db, project_id=project_id,
        task_type="extract_test_points",
        total_count=len(document_ids),
    )

    # 启动后台任务
    background_tasks.add_task(
        extract_test_points_task, batch.id, document_ids, knowledge_base_ids
    )

    return {"batch_id": batch.id, "message": "测试点提取任务已提交"}


@router.get("/test-points/project/{project_id}", response_model=PaginatedResponse[TestPointResponse])
async def list_test_points(
    project_id: int,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("testpoint.view")),
):
    """获取项目下的测试点列表"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return await get_test_points(db, project_id, page_params)


@router.post("/test-points", response_model=TestPointResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_point(
    project_id: int = Query(..., description="所属项目 ID"),
    data: TestPointCreate = ...,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("testpoint.create")),
):
    """手动创建测试点"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    tp = await create_test_point(
        db, project_id=project_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        category=data.category,
    )
    return TestPointResponse.model_validate(tp)


@router.put("/test-points/{tp_id}", response_model=TestPointResponse)
async def update_existing_test_point(
    tp_id: int,
    data: TestPointUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("testpoint.edit")),
):
    """更新测试点"""
    tp = await get_test_point(db, tp_id)
    if not tp:
        raise HTTPException(status_code=404, detail="测试点不存在")
    tp = await update_test_point(db, tp, data.model_dump(exclude_unset=True))
    return TestPointResponse.model_validate(tp)


@router.delete("/test-points/{tp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_point(
    tp_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("testpoint.delete")),
):
    """删除测试点"""
    tp = await get_test_point(db, tp_id)
    if not tp:
        raise HTTPException(status_code=404, detail="测试点不存在")
    await delete_test_point(db, tp)
