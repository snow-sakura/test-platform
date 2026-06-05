"""RBAC 权限系统 - API 路由"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

from . import crud, models, schemas
from .service import require_permission, seed_permissions, seed_roles

router = APIRouter(
    prefix="/rbac",
    dependencies=[Depends(get_current_user)],
    tags=["rbac"],
)


# ====== 权限 ======


@router.get("/permissions", response_model=list[schemas.PermissionResponse])
async def list_permissions(db: AsyncSession = Depends(get_db), _=Depends(require_permission("role.view"))):
    """获取所有权限定义"""
    return await crud.get_all_permissions(db)


# ====== 角色 CRUD ======


@router.get("/roles", response_model=list[schemas.RoleDetailResponse])
async def list_roles(db: AsyncSession = Depends(get_db), _=Depends(require_permission("role.view"))):
    """获取所有角色（批量查询角色权限和用户数，避免 N+1）"""
    roles = await crud.get_roles(db)
    if not roles:
        return []

    role_ids = [r.id for r in roles]

    # 批量查询权限 ID（一次性查出所有角色的权限关联）
    from sqlalchemy import select as sa_select
    perm_rows = (await db.execute(
        sa_select(models.RolePermission.role_id, models.RolePermission.permission_id)
        .where(models.RolePermission.role_id.in_(role_ids))
    )).all()
    role_perm_map: dict[int, list[int]] = {rid: [] for rid in role_ids}
    for row in perm_rows:
        role_perm_map[row.role_id].append(row.permission_id)

    # 批量查询用户数（GROUP BY role_id）
    user_count_rows = (await db.execute(
        sa_select(models.UserRole.role_id, func.count(models.UserRole.id))
        .where(models.UserRole.role_id.in_(role_ids))
        .group_by(models.UserRole.role_id)
    )).all()
    role_user_count: dict[int, int] = {rid: 0 for rid in role_ids}
    for row in user_count_rows:
        role_user_count[row.role_id] = row[1]

    result = []
    for r in roles:
        result.append(schemas.RoleDetailResponse(
            id=r.id, name=r.name, description=r.description,
            is_system=r.is_system, created_at=str(r.created_at) if r.created_at else None,
            permission_ids=role_perm_map.get(r.id, []),
            user_count=role_user_count.get(r.id, 0),
        ))
    return result


@router.post("/roles", response_model=schemas.RoleDetailResponse, status_code=201)
async def create_role(
    data: schemas.RoleCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("role.create")),
):
    """创建角色"""
    role = await crud.create_role(db, data.model_dump())
    perm_ids = await crud.get_role_permission_ids(db, role.id)
    return schemas.RoleDetailResponse(
        id=role.id, name=role.name, description=role.description,
        is_system=role.is_system, created_at=str(role.created_at) if role.created_at else None,
        permission_ids=perm_ids, user_count=0,
    )


@router.put("/roles/{role_id}", response_model=schemas.RoleDetailResponse)
async def update_role(
    role_id: int,
    data: schemas.RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("role.edit")),
):
    """更新角色"""
    role = await crud.get_role(db, role_id)
    if not role:
        raise HTTPException(404, "角色不存在")
    role = await crud.update_role(db, role_id, data.model_dump(exclude_unset=True))
    perm_ids = await crud.get_role_permission_ids(db, role_id)
    user_count = await crud.get_role_user_count(db, role_id)
    return schemas.RoleDetailResponse(
        id=role.id, name=role.name, description=role.description,
        is_system=role.is_system, created_at=str(role.created_at) if role.created_at else None,
        permission_ids=perm_ids, user_count=user_count,
    )


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("role.delete")),
):
    """删除角色（系统角色不可删除）"""
    role = await crud.get_role(db, role_id)
    if not role:
        raise HTTPException(404, "角色不存在")
    if role.is_system:
        raise HTTPException(400, "系统角色不可删除")
    await crud.delete_role(db, role_id)
    return {"message": "已删除"}


# ====== 用户-角色分配 ======


@router.get("/users", response_model=list[dict])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("role.assign")),
):
    """获取用户列表（含角色信息，批量查询避免 N+1）"""
    users = await crud.get_all_users(db)
    if not users:
        return []

    user_ids = [u["id"] for u in users]

    # 一次性查出所有用户的角色关联
    from sqlalchemy import select as sa_select
    user_role_rows = (await db.execute(
        sa_select(models.UserRole.user_id, models.Role.id, models.Role.name)
        .join(models.Role, models.Role.id == models.UserRole.role_id)
        .where(models.UserRole.user_id.in_(user_ids))
    )).all()
    user_role_map: dict[int, dict] = {uid: {"role_ids": [], "role_names": []} for uid in user_ids}
    for row in user_role_rows:
        user_role_map[row.user_id]["role_ids"].append(row.id)
        user_role_map[row.user_id]["role_names"].append(row.name)

    result = []
    for u in users:
        roles = user_role_map.get(u["id"], {"role_ids": [], "role_names": []})
        result.append({**u, **roles})
    return result


@router.put("/users/{user_id}/roles")
async def assign_user_roles(
    user_id: int,
    data: schemas.UserRoleAssignment,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("role.assign")),
):
    """分配用户角色"""
    await crud.set_user_roles(db, user_id, data.role_ids)
    return {"message": "已更新"}


# ====== 当前用户权限查询 ======


@router.get("/my-permissions", response_model=schemas.CurrentUserPermissions)
async def get_my_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的权限列表"""
    from .service import get_user_permissions
    permissions = await get_user_permissions(db, current_user)
    return schemas.CurrentUserPermissions(
        user_id=current_user.id,
        username=current_user.username,
        is_superuser=current_user.is_superuser,
        permissions=permissions,
    )


# ====== 种子数据 ======


@router.post("/seed")
async def seed_rbac_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """初始化/同步 RBAC 种子数据（权限定义 + 系统角色，仅超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(403, "仅超级管理员可执行")
    await seed_permissions(db)
    await seed_roles(db)
    return {"message": "种子数据已同步"}
