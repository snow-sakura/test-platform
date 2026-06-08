"""RBAC 权限系统 - API 集成测试"""
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User


class TestRBACAPI:
    """RBAC API 测试"""

    @pytest_asyncio.fixture(autouse=True)
    async def _setup(self, client: AsyncClient, db: AsyncSession):
        """注册用户并通过数据库提升为超级管理员"""
        resp = await client.post("/api/auth/register", json={
            "username": "rbacadmin",
            "email": "rbac@test.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        data = resp.json()
        self.token = data["access_token"]
        self._auth = {"Authorization": f"Bearer {self.token}"}

        # 通过数据库将用户设为 superuser（API 注册无此能力）
        from sqlalchemy import select
        user = (await db.execute(
            select(User).where(User.username == "rbacadmin")
        )).scalar_one()
        user.is_superuser = True
        await db.commit()

    async def test_get_my_permissions(self, client: AsyncClient):
        """获取当前用户权限"""
        resp = await client.get("/api/rbac/my-permissions", headers=self._auth)
        assert resp.status_code == 200
        data = resp.json()
        assert "permissions" in data
        assert data["username"] == "rbacadmin"

    async def test_list_permissions(self, client: AsyncClient):
        """获取所有权限列表"""
        resp = await client.get("/api/rbac/permissions", headers=self._auth)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert "codename" in data[0]
        assert "module" in data[0]

    async def test_list_roles(self, client: AsyncClient):
        """获取角色列表"""
        resp = await client.get("/api/rbac/roles", headers=self._auth)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert data[0]["name"] in ("超级管理员", "管理员", "普通用户")

    async def test_create_role(self, client: AsyncClient):
        """创建角色"""
        # 先获取权限列表
        perms_resp = await client.get("/api/rbac/permissions", headers=self._auth)
        perm_ids = [p["id"] for p in perms_resp.json()[:3]]

        resp = await client.post("/api/rbac/roles", headers=self._auth, json={
            "name": "自定义角色",
            "description": "通过 API 创建",
            "permission_ids": perm_ids,
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "自定义角色"
        assert set(resp.json()["permission_ids"]) == set(perm_ids)

    async def test_update_role(self, client: AsyncClient):
        """更新角色"""
        # 创建角色
        perms_resp = await client.get("/api/rbac/permissions", headers=self._auth)
        perm_ids = [p["id"] for p in perms_resp.json()[:2]]

        create_resp = await client.post("/api/rbac/roles", headers=self._auth, json={
            "name": "待更新",
            "permission_ids": perm_ids,
        })
        role_id = create_resp.json()["id"]

        # 更新
        resp = await client.put(f"/api/rbac/roles/{role_id}", headers=self._auth, json={
            "name": "已更新角色",
            "permission_ids": perm_ids,
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "已更新角色"

    async def test_delete_role(self, client: AsyncClient):
        """删除角色"""
        perms_resp = await client.get("/api/rbac/permissions", headers=self._auth)
        perm_ids = [p["id"] for p in perms_resp.json()[:1]]

        create_resp = await client.post("/api/rbac/roles", headers=self._auth, json={
            "name": "待删除",
            "permission_ids": perm_ids,
        })
        role_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/rbac/roles/{role_id}", headers=self._auth)
        assert resp.status_code == 200

    async def test_list_users_for_rbac(self, client: AsyncClient):
        """获取用户列表（含角色信息）"""
        resp = await client.get("/api/rbac/users", headers=self._auth)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        assert "role_ids" in data[0]
        assert "role_names" in data[0]

    async def test_assign_user_roles(self, client: AsyncClient):
        """为用户分配角色"""
        perms_resp = await client.get("/api/rbac/permissions", headers=self._auth)
        perm_ids = [p["id"] for p in perms_resp.json()[:1]]

        # 创建角色
        role_resp = await client.post("/api/rbac/roles", headers=self._auth, json={
            "name": "分配测试角色",
            "permission_ids": perm_ids,
        })
        role_id = role_resp.json()["id"]

        # 获取用户列表
        users_resp = await client.get("/api/rbac/users", headers=self._auth)
        user_id = users_resp.json()[0]["id"]

        # 分配角色
        resp = await client.put(f"/api/rbac/users/{user_id}/roles", headers=self._auth, json={
            "user_id": user_id,
            "role_ids": [role_id],
        })
        assert resp.status_code == 200

        # 验证
        users_resp2 = await client.get("/api/rbac/users", headers=self._auth)
        target = [u for u in users_resp2.json() if u["id"] == user_id][0]
        assert role_id in target["role_ids"]

    async def test_forbidden_no_auth(self, client: AsyncClient):
        """未认证用户无法访问 RBAC 接口"""
        resp = await client.get("/api/rbac/permissions")
        assert resp.status_code == 401
