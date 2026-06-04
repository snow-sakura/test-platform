from __future__ import annotations

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.pagination import PageParams, PaginatedResponse, paginate

from .filters import apply_project_filters
from .models import Project
from .schemas import ProjectCreate, ProjectResponse, ProjectUpdate


async def get_projects(
    db: AsyncSession,
    page_params: PageParams,
    search: str = "",
    status: str = "",
) -> PaginatedResponse[ProjectResponse]:
    """获取项目列表（分页 + 筛选 + 排序）"""
    query: Select = select(Project)
    query = apply_project_filters(query, search=search, status=status)
    return await paginate(db, query, page_params, ProjectResponse, base_url="/api/projects")


async def get_project(db: AsyncSession, project_id: int) -> Project | None:
    """获取单个项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, data: ProjectCreate) -> Project:
    """创建项目"""
    project = Project(**data.model_dump())
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    """更新项目"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    """删除项目"""
    await db.delete(project)
    await db.flush()
