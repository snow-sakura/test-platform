"""RBAC 权限系统 - CRUD 操作"""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.auth.models import User

from . import models


# ====== 权限查询 ======


async def get_all_permissions(db: AsyncSession) -> list[models.Permission]:
    result = await db.execute(select(models.Permission).order_by(models.Permission.module, models.Permission.id))
    return list(result.scalars().all())


# ====== 角色 CRUD ======


async def create_role(db: AsyncSession, data: dict) -> models.Role:
    permission_ids = data.pop("permission_ids", [])
    role = models.Role(**data)
    db.add(role)
    await db.flush()

    for pid in permission_ids:
        db.add(models.RolePermission(role_id=role.id, permission_id=pid))
    await db.commit()
    await db.refresh(role)
    return role


async def get_role(db: AsyncSession, role_id: int) -> models.Role | None:
    return (await db.execute(
        select(models.Role).where(models.Role.id == role_id)
    )).scalar_one_or_none()


async def get_roles(db: AsyncSession) -> list[models.Role]:
    result = await db.execute(select(models.Role).order_by(models.Role.id))
    return list(result.scalars().all())


async def update_role(db: AsyncSession, role_id: int, data: dict) -> models.Role | None:
    role = await get_role(db, role_id)
    if not role:
        return None

    permission_ids = data.pop("permission_ids", None)
    for key, value in data.items():
        setattr(role, key, value)

    if permission_ids is not None:
        # 清除旧权限关联
        from sqlalchemy import delete as sa_delete
        await db.execute(
            sa_delete(models.RolePermission).where(models.RolePermission.role_id == role_id)
        )
        for pid in permission_ids:
            db.add(models.RolePermission(role_id=role.id, permission_id=pid))

    await db.commit()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: int) -> bool:
    role = await get_role(db, role_id)
    if not role:
        return False
    # 级联删除 RolePermission + UserRole
    await db.delete(role)
    await db.commit()
    return True


async def get_role_permission_ids(db: AsyncSession, role_id: int) -> list[int]:
    result = await db.execute(
        select(models.RolePermission.permission_id).where(models.RolePermission.role_id == role_id)
    )
    return list(result.scalars().all())


async def get_role_user_count(db: AsyncSession, role_id: int) -> int:
    result = await db.execute(
        select(func.count(models.UserRole.id)).where(models.UserRole.role_id == role_id)
    )
    return result.scalar() or 0


# ====== 用户-角色分配 ======


async def get_user_roles(db: AsyncSession, user_id: int) -> list[models.Role]:
    result = await db.execute(
        select(models.Role)
        .join(models.UserRole, models.UserRole.role_id == models.Role.id)
        .where(models.UserRole.user_id == user_id)
    )
    return list(result.scalars().all())


async def set_user_roles(db: AsyncSession, user_id: int, role_ids: list[int]):
    """设置用户的角色（全量替换）"""
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(models.UserRole).where(models.UserRole.user_id == user_id)
    )
    for rid in role_ids:
        db.add(models.UserRole(user_id=user_id, role_id=rid))
    await db.commit()


async def get_all_users(db: AsyncSession) -> list[dict]:
    """获取所有用户（用于角色分配选择）"""
    result = await db.execute(
        select(User.id, User.username, User.email, User.is_superuser)
        .order_by(User.id)
    )
    return [
        {"id": row.id, "username": row.username, "email": row.email, "is_superuser": row.is_superuser}
        for row in result.all()
    ]
