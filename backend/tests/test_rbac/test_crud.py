"""RBAC 权限系统 - CRUD + Service 单元测试"""
import pytest

from app.modules.auth.crud import create_user
from app.modules.rbac.models import Permission, Role, RolePermission, UserRole
from app.modules.rbac.service import (
    ALL_PERMISSIONS, SYSTEM_ROLES,
    get_user_permissions, require_permission, seed_permissions, seed_roles,
)
from app.modules.rbac import crud


class TestSeedData:
    """种子数据初始化"""

    async def test_seed_permissions(self, db):
        """初始化权限定义"""
        await seed_permissions(db)
        result = await db.execute(Permission.__table__.select())
        perms = result.all()
        assert len(perms) == len(ALL_PERMISSIONS)
        # 幂等
        await seed_permissions(db)
        result2 = await db.execute(Permission.__table__.select())
        assert len(result2.all()) == len(ALL_PERMISSIONS)

    async def test_seed_roles(self, db):
        """初始化系统角色并关联权限"""
        await seed_permissions(db)
        await seed_roles(db)

        result = await db.execute(Role.__table__.select())
        roles = result.all()
        assert len(roles) == 3  # 超级管理员/管理员/普通用户

        # 检查角色权限关联
        role_perm_count = await db.execute(RolePermission.__table__.select())
        assert len(role_perm_count.all()) > 0

        # 幂等
        await seed_roles(db)
        result2 = await db.execute(Role.__table__.select())
        assert len(result2.all()) == 3

    async def test_seed_roles_update_permissions(self, db):
        """种子角色更新时刷新权限"""
        await seed_permissions(db)
        await seed_roles(db)

        # 删除一个权限后重新 seed，应恢复
        from sqlalchemy import delete
        admin_role = (await db.execute(
            Role.__table__.select().where(Role.name == "管理员")
        )).first()
        if admin_role:
            await db.execute(
                RolePermission.__table__.delete().where(RolePermission.role_id == admin_role.id)
            )
            await db.commit()

        # 重新 seed 应恢复权限关联
        await seed_roles(db)
        admin_role = (await db.execute(
            Role.__table__.select().where(Role.name == "管理员")
        )).first()
        count = (await db.execute(
            RolePermission.__table__.select().where(RolePermission.role_id == admin_role.id)
        )).all()
        assert len(count) > 0


class TestGetUserPermissions:
    """用户权限查询"""

    async def test_superuser_has_all_permissions(self, db):
        """超级用户拥有所有权限"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "super", "super@test.com", "Pass123!")
        user.is_superuser = True

        perms = await get_user_permissions(db, user)
        assert len(perms) == len(ALL_PERMISSIONS)
        assert "project.create" in perms

    async def test_user_with_role_has_permissions(self, db):
        """分配角色的用户拥有对应权限"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "normal", "normal@test.com", "Pass123!")

        # 查出"普通用户"角色
        role = (await db.execute(
            Role.__table__.select().where(Role.name == "普通用户")
        )).first()
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()

        perms = await get_user_permissions(db, user)
        assert "project.create" in perms
        assert "project.view" in perms
        assert "project.delete" not in perms  # 普通用户没有删除权限

    async def test_user_without_role_has_no_permissions(self, db):
        """无角色的用户没有任何权限"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "norole", "norole@test.com", "Pass123!")
        perms = await get_user_permissions(db, user)
        assert len(perms) == 0

    async def test_user_role_changes_reflect(self, db):
        """用户角色变更后权限随之变化"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "changeme", "change@test.com", "Pass123!")

        # 分配普通用户角色
        normal_role = (await db.execute(
            Role.__table__.select().where(Role.name == "普通用户")
        )).first()
        db.add(UserRole(user_id=user.id, role_id=normal_role.id))
        await db.commit()

        perms = await get_user_permissions(db, user)
        assert "project.create" in perms

        # 清空角色
        await db.execute(UserRole.__table__.delete().where(UserRole.user_id == user.id))
        await db.commit()

        perms2 = await get_user_permissions(db, user)
        assert len(perms2) == 0


class TestRoleCRUD:
    """角色 CRUD 操作"""

    async def _setup(self, db):
        await seed_permissions(db)
        await seed_roles(db)

    async def test_create_role_with_permissions(self, db):
        """创建角色并关联权限"""
        await self._setup(db)

        perms = await crud.get_all_permissions(db)
        perm_ids = [p.id for p in perms[:5]]

        role = await crud.create_role(db, {
            "name": "测试角色",
            "description": "用于测试",
            "permission_ids": perm_ids,
        })
        assert role.id is not None
        assert role.name == "测试角色"

        role_perm_ids = await crud.get_role_permission_ids(db, role.id)
        assert set(role_perm_ids) == set(perm_ids)

    async def test_get_roles(self, db):
        """获取角色列表"""
        await self._setup(db)
        roles = await crud.get_roles(db)
        assert len(roles) >= 3

    async def test_update_role(self, db):
        """更新角色"""
        await self._setup(db)
        role = await crud.create_role(db, {
            "name": "待更新角色",
            "permission_ids": [],
        })

        # 获取一个权限 ID
        perms = await crud.get_all_permissions(db)
        perm_id = perms[0].id

        updated = await crud.update_role(db, role.id, {
            "name": "已更新",
            "permission_ids": [perm_id],
        })
        assert updated.name == "已更新"

        role_perm_ids = await crud.get_role_permission_ids(db, role.id)
        assert perm_id in role_perm_ids

    async def test_delete_role(self, db):
        """删除角色"""
        await self._setup(db)
        role = await crud.create_role(db, {
            "name": "待删除角色",
            "permission_ids": [],
        })
        role_id = role.id

        result = await crud.delete_role(db, role_id)
        assert result is True

        deleted = await crud.get_role(db, role_id)
        assert deleted is None

    async def test_delete_nonexistent_role(self, db):
        """删除不存在的角色返回 False"""
        result = await crud.delete_role(db, 9999)
        assert result is False

    async def test_get_role_user_count(self, db):
        """获取角色用户数"""
        await self._setup(db)
        user = await create_user(db, "countuser", "count@test.com", "Pass123!")

        role = await crud.create_role(db, {"name": "计数角色", "permission_ids": []})
        count = await crud.get_role_user_count(db, role.id)
        assert count == 0

        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()

        count2 = await crud.get_role_user_count(db, role.id)
        assert count2 == 1


class TestUserRoleAssignment:
    """用户-角色分配"""

    async def test_assign_roles(self, db):
        """为用户分配角色"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "assignee", "assign@test.com", "Pass123!")
        roles = await crud.get_roles(db)
        role_ids = [r.id for r in roles[:2]]

        await crud.set_user_roles(db, user.id, role_ids)

        user_roles = await crud.get_user_roles(db, user.id)
        assert len(user_roles) == 2

    async def test_replace_roles(self, db):
        """替换用户角色（旧角色被移除）"""
        await seed_permissions(db)
        await seed_roles(db)

        user = await create_user(db, "replacer", "replace@test.com", "Pass123!")
        roles = await crud.get_roles(db)

        # 先分配前 2 个角色
        await crud.set_user_roles(db, user.id, [roles[0].id, roles[1].id])
        assert len(await crud.get_user_roles(db, user.id)) == 2

        # 替换为第 3 个角色
        await crud.set_user_roles(db, user.id, [roles[2].id])
        user_roles = await crud.get_user_roles(db, user.id)
        assert len(user_roles) == 1
        assert user_roles[0].id == roles[2].id
