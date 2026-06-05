from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.pagination import PageParams, PaginatedResponse
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.rbac.service import require_permission

from .crud import (
    add_project_member,
    create_project,
    delete_project,
    get_project,
    get_project_members,
    get_projects,
    remove_project_member,
    update_project,
    update_project_member_role,
)
from .models import Project, ProjectMember, ProjectMemberRole
from .schemas import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["projects"])


# ──────────────────────────────────────────────
# 项目 CRUD
# ──────────────────────────────────────────────


@router.get("/projects", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    page_params: PageParams = Depends(),
    search: str = Query("", description="按名称搜索"),
    status: str = Query("", description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.view")),
):
    """获取项目列表（按成员权限过滤，仅返回用户参与或无成员的历史项目）"""
    return await get_projects(db, page_params, user_id=current_user.id, search=search, status=status)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.create")),
):
    """创建新项目（自动添加创建者为管理员）"""
    project = await create_project(db, data, user_id=current_user.id)
    # 重新查询以加载关联数据
    project = await get_project(db, project.id)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def retrieve_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.view")),
):
    """获取项目详情（需为项目成员或创建者）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return project


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def full_update_project(
    project_id: int,
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.edit")),
):
    """全量更新项目（仅创建者或管理员可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    # 权限检查：仅创建者或项目管理员可更新
    if not _can_manage_project(project, current_user.id):
        raise HTTPException(status_code=403, detail="无权操作")
    return await update_project(db, project, ProjectUpdate(**data.model_dump()))


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def partial_update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.edit")),
):
    """部分更新项目（仅创建者或管理员可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if not _can_manage_project(project, current_user.id):
        raise HTTPException(status_code=403, detail="无权操作")
    return await update_project(db, project, data)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.delete")),
):
    """删除项目（仅创建者可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if project.created_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="仅项目创建者可删除")
    await delete_project(db, project)


# ──────────────────────────────────────────────
# 项目成员管理
# ──────────────────────────────────────────────


@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
async def list_project_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("project.view")),
):
    """获取项目成员列表"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    members = await get_project_members(db, project_id)
    return [ProjectMemberResponse(
        id=m.id,
        project_id=m.project_id,
        user_id=m.user_id,
        role=m.role,
        username=m.user.username if m.user else "",
        created_at=m.created_at,
    ) for m in members]


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_project_member_endpoint(
    project_id: int,
    data: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.manage_members")),
):
    """添加项目成员（仅创建者或管理员可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if not _can_manage_project(project, current_user.id):
        raise HTTPException(status_code=403, detail="无权操作")

    member = await add_project_member(db, project_id, data.user_id, data.role)
    return ProjectMemberResponse(
        id=member.id, project_id=member.project_id,
        user_id=member.user_id, role=member.role,
        username=member.user.username if member.user else "",
        created_at=member.created_at,
    )


@router.delete("/projects/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member_endpoint(
    project_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.manage_members")),
):
    """移除项目成员（仅创建者或管理员可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if not _can_manage_project(project, current_user.id):
        raise HTTPException(status_code=403, detail="无权操作")
    if not await remove_project_member(db, project_id, user_id):
        raise HTTPException(status_code=404, detail="成员不存在")


@router.put("/projects/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
async def update_member_role(
    project_id: int,
    user_id: int,
    data: ProjectMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("project.manage_members")),
):
    """更新成员角色（仅创建者或管理员可操作）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    if not _can_manage_project(project, current_user.id):
        raise HTTPException(status_code=403, detail="无权操作")
    member = await update_project_member_role(db, project_id, user_id, data.role)
    if not member:
        raise HTTPException(status_code=404, detail="成员不存在")
    return ProjectMemberResponse(
        id=member.id, project_id=member.project_id,
        user_id=member.user_id, role=member.role,
        username=member.user.username if member.user else "",
        created_at=member.created_at,
    )


def _can_manage_project(project: Project, user_id: int) -> bool:
    """检查用户是否有项目管理权限（创建者或管理员）"""
    if project.created_by == user_id:
        return True
    if project.members:
        for m in project.members:
            if m.user_id == user_id and m.role == ProjectMemberRole.ADMIN:
                return True
    return False
