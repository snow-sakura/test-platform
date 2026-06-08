"""用户认证模块 - API 集成测试"""
import pytest_asyncio
from httpx import AsyncClient


class TestRegister:
    """用户注册 API"""

    async def test_register_success(self, client: AsyncClient):
        """注册成功返回令牌和用户信息"""
        resp = await client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["username"] == "newuser"

    async def test_register_duplicate_username(self, client: AsyncClient):
        """重复用户名返回 400"""
        await client.post("/api/auth/register", json={
            "username": "dupuser",
            "email": "first@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        resp = await client.post("/api/auth/register", json={
            "username": "dupuser",
            "email": "second@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        assert resp.status_code == 400
        assert "已存在" in resp.json()["detail"]

    async def test_register_duplicate_email(self, client: AsyncClient):
        """重复邮箱返回 400"""
        await client.post("/api/auth/register", json={
            "username": "user1",
            "email": "dup@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        resp = await client.post("/api/auth/register", json={
            "username": "user2",
            "email": "dup@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        assert resp.status_code == 400
        assert "已注册" in resp.json()["detail"]

    async def test_register_password_mismatch(self, client: AsyncClient):
        """密码不一致返回 422"""
        resp = await client.post("/api/auth/register", json={
            "username": "pwdmismatch",
            "email": "pwd@example.com",
            "password": "Pass123!",
            "confirm_password": "Different123!",
        })
        assert resp.status_code == 422


class TestLogin:
    """用户登录 API"""

    @pytest_asyncio.fixture(autouse=True)
    async def _setup_user(self, client: AsyncClient):
        """每个测试函数前注册一个用户"""
        await client.post("/api/auth/register", json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })

    async def test_login_success(self, client: AsyncClient):
        """用户名正确登录"""
        resp = await client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "Pass123!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["username"] == "loginuser"

    async def test_login_wrong_password(self, client: AsyncClient):
        """密码错误返回 401"""
        resp = await client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "WrongPass!",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """不存在的用户返回 401"""
        resp = await client.post("/api/auth/login", json={
            "username": "nobody",
            "password": "Pass123!",
        })
        assert resp.status_code == 401


class TestProfile:
    """个人资料 API"""

    @pytest_asyncio.fixture(autouse=True)
    async def _setup_and_login(self, client: AsyncClient):
        """注册并登录，设置 token"""
        await client.post("/api/auth/register", json={
            "username": "profileuser",
            "email": "profile@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        resp = await client.post("/api/auth/login", json={
            "username": "profileuser",
            "password": "Pass123!",
        })
        self.token = resp.json()["access_token"]

    def _auth_header(self):
        return {"Authorization": f"Bearer {self.token}"}

    async def test_get_profile(self, client: AsyncClient):
        """获取当前用户信息"""
        resp = await client.get("/api/auth/profile", headers=self._auth_header())
        assert resp.status_code == 200
        assert resp.json()["username"] == "profileuser"

    async def test_get_profile_unauthorized(self, client: AsyncClient):
        """未登录返回 401"""
        resp = await client.get("/api/auth/profile")
        assert resp.status_code == 401

    async def test_update_profile(self, client: AsyncClient):
        """更新个人资料"""
        resp = await client.put("/api/auth/profile", headers=self._auth_header(), json={
            "first_name": "测试",
            "email": "newprofile@example.com",
        })
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "测试"
        assert resp.json()["email"] == "newprofile@example.com"

    async def test_change_password(self, client: AsyncClient):
        """修改密码"""
        resp = await client.put("/api/auth/profile/password", headers=self._auth_header(), json={
            "old_password": "Pass123!",
            "new_password": "NewPass456!",
            "confirm_password": "NewPass456!",
        })
        assert resp.status_code == 200

        # 用新密码登录
        login_resp = await client.post("/api/auth/login", json={
            "username": "profileuser",
            "password": "NewPass456!",
        })
        assert login_resp.status_code == 200

    async def test_change_password_wrong_old(self, client: AsyncClient):
        """原密码错误返回 400"""
        resp = await client.put("/api/auth/profile/password", headers=self._auth_header(), json={
            "old_password": "WrongOld!",
            "new_password": "NewPass456!",
            "confirm_password": "NewPass456!",
        })
        assert resp.status_code == 400


class TestTokenRefresh:
    """令牌刷新 API"""

    @pytest_asyncio.fixture(autouse=True)
    async def _setup_and_login(self, client: AsyncClient):
        await client.post("/api/auth/register", json={
            "username": "refreshuser",
            "email": "refresh@example.com",
            "password": "Pass123!",
            "confirm_password": "Pass123!",
        })
        resp = await client.post("/api/auth/login", json={
            "username": "refreshuser",
            "password": "Pass123!",
        })
        data = resp.json()
        self.refresh_token = data["refresh_token"]
        self.access_token = data["access_token"]

    async def test_refresh_success(self, client: AsyncClient):
        """刷新令牌成功返回新的访问令牌"""
        resp = await client.post("/api/auth/token/refresh", json={
            "refresh_token": self.refresh_token,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        # 轮换后旧令牌应失效
        old_resp = await client.post("/api/auth/token/refresh", json={
            "refresh_token": self.refresh_token,
        })
        assert old_resp.status_code == 401

    async def test_refresh_invalid_token(self, client: AsyncClient):
        """无效刷新令牌返回 401"""
        resp = await client.post("/api/auth/token/refresh", json={
            "refresh_token": "invalid-token-here",
        })
        assert resp.status_code == 401

    async def test_logout(self, client: AsyncClient):
        """登出后将刷新令牌加入黑名单"""
        # 登出
        resp = await client.post("/api/auth/logout", headers={
            "Authorization": f"Bearer {self.access_token}",
        }, json={
            "refresh_token": self.refresh_token,
        })
        assert resp.status_code == 200

        # 使用已登出的刷新令牌应失败
        refresh_resp = await client.post("/api/auth/token/refresh", json={
            "refresh_token": self.refresh_token,
        })
        assert refresh_resp.status_code == 401
