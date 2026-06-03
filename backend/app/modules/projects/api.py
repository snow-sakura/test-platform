from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.pagination import PageParams, PaginatedResponse

from .crud import (
    create_project,
    delete_project,
    get_project,
    get_projects,
    update_project,
)
from .schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    page_params: PageParams = Depends(),
    search: str = Query("", description="按名称搜索"),
    status: str = Query("", description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
):
    """获取项目列表（支持分页、搜索、筛选、排序）"""
    return await get_projects(db, page_params, search=search, status=status)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建新项目"""
    project = await create_project(db, data)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def retrieve_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取项目详情"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def full_update_project(
    project_id: int,
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """全量更新项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return await update_project(db, project, ProjectUpdate(**data.model_dump()))


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def partial_update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """部分更新项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return await update_project(db, project, data)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await delete_project(db, project)
