from __future__ import annotations

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.pagination import PageParams, PaginatedResponse, paginate

from .filters import apply_project_filters
from .models import Project, ProjectMember, ProjectMemberRole, ProjectStatus
from .schemas import ProjectCreate, ProjectMemberResponse, ProjectResponse, ProjectUpdate

# ──────────────────────────────────────────────
# 项目 CRUD
# ──────────────────────────────────────────────


async def get_projects(
    db: AsyncSession,
    page_params: PageParams,
    user_id: int | None = None,
    search: str = "",
    status: str = "",
) -> PaginatedResponse[ProjectResponse]:
    """获取项目列表（分页 + 筛选 + 排序）

    权限：只返回用户是成员的项目，或尚未分配成员的历史项目（向后兼容）。
    """
    query: Select = (
        select(Project)
        .options(selectinload(Project.creator), selectinload(Project.members))
    )

    if user_id:
        # 子查询：当前用户是否为项目成员
        is_member_sub = (
            select(func.count(ProjectMember.id))
            .where(
                ProjectMember.project_id == Project.id,
                ProjectMember.user_id == user_id,
            )
            .correlate(Project)
            .scalar_subquery()
        )
        # 总成员数
        total_members_sub = (
            select(func.count(ProjectMember.id))
            .where(ProjectMember.project_id == Project.id)
            .correlate(Project)
            .scalar_subquery()
        )
        # 用户是成员 OR 项目无成员（向后兼容）
        query = query.where(
            (is_member_sub > 0) | (total_members_sub == 0)
        )

    query = apply_project_filters(query, search=search, status=status)
    return await paginate(db, query, page_params, ProjectResponse, base_url="/api/projects")


async def get_project(db: AsyncSession, project_id: int) -> Project | None:
    """获取单个项目（包含关联数据）"""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.creator), selectinload(Project.members))
        .where(Project.id == project_id)
    )
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, data: ProjectCreate, user_id: int | None = None) -> Project:
    """创建项目——自动添加创建者为管理员"""
    project = Project(**data.model_dump(exclude={"member_ids"}))
    if user_id:
        project.created_by = user_id
    db.add(project)
    await db.flush()
    await db.refresh(project)

    # 自动添加创建者为管理员
    owner = ProjectMember(
        project_id=project.id,
        user_id=user_id or 0,
        role=ProjectMemberRole.ADMIN,
    )
    db.add(owner)

    # 添加其他成员
    for mid in (data.member_ids or []):
        if mid != user_id:
            db.add(ProjectMember(
                project_id=project.id,
                user_id=mid,
                role=ProjectMemberRole.MEMBER,
            ))

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


# ──────────────────────────────────────────────
# 项目成员 CRUD
# ──────────────────────────────────────────────


async def get_project_members(db: AsyncSession, project_id: int) -> list[ProjectMember]:
    """获取项目成员列表"""
    result = await db.execute(
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at.asc())
    )
    return list(result.scalars().all())


async def add_project_member(
    db: AsyncSession, project_id: int, user_id: int,
    role: ProjectMemberRole = ProjectMemberRole.MEMBER,
) -> ProjectMember:
    """添加项目成员（重复添加返回现有记录）"""
    # 检查是否已是成员
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    member = ProjectMember(project_id=project_id, user_id=user_id, role=role)
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


async def remove_project_member(db: AsyncSession, project_id: int, user_id: int) -> bool:
    """移除项目成员"""
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return False
    await db.delete(member)
    await db.flush()
    return True


async def update_project_member_role(
    db: AsyncSession, project_id: int, user_id: int, role: ProjectMemberRole,
) -> ProjectMember | None:
    """更新成员角色"""
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        return None
    member.role = role
    await db.flush()
    await db.refresh(member)
    return member
