"""用户认证模块 - CRUD 单元测试"""
import pytest
from jose import jwt

from app.config import settings
from app.modules.auth.crud import (
    blacklist_token,
    create_access_token,
    create_refresh_token,
    create_user,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
    get_users,
    hash_password,
    is_token_blacklisted,
    update_user,
    verify_password,
)


class TestPassword:
    """密码哈希与验证"""

    def test_hash_and_verify(self):
        """验证密码哈希后能被正确验证"""
        hashed = hash_password("Test123!")
        assert verify_password("Test123!", hashed) is True
        assert verify_password("wrong", hashed) is False

    def test_hash_is_different_each_time(self):
        """bcrypt 每次生成的哈希不同"""
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2


class TestJWT:
    """JWT 令牌生成与解码"""

    def test_create_and_decode_access_token(self):
        """创建并解码 access token"""
        token = create_access_token({"sub": "1", "role": "admin"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_create_and_decode_refresh_token(self):
        """创建并解码 refresh token"""
        token = create_refresh_token({"sub": "1"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "1"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self):
        """无效令牌返回 None"""
        assert decode_token("invalid.token.here") is None
        assert decode_token("") is None

    def test_token_expires_correctly(self):
        """过期的令牌应解码失败（python-jose 自动校验 exp）"""
        from datetime import datetime, timedelta, timezone

        expired_token = jwt.encode(
            {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )
        payload = decode_token(expired_token)
        assert payload is None


class TestUserCRUD:
    """用户 CRUD 操作"""

    async def test_create_user(self, db):
        """创建用户后返回完整的 User 对象"""
        user = await create_user(db, "testuser", "test@example.com", "Pass123!")
        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.hashed_password != "Pass123!"  # 密码被哈希存储
        assert user.is_active is True
        assert user.is_superuser is False

    async def test_get_user_by_id(self, db):
        """按 ID 查找用户"""
        user = await create_user(db, "find_by_id", "id@example.com", "Pass123!")
        found = await get_user_by_id(db, user.id)
        assert found is not None
        assert found.username == "find_by_id"

    async def test_get_user_by_id_not_found(self, db):
        """不存在的 ID 返回 None"""
        assert await get_user_by_id(db, 9999) is None

    async def test_get_user_by_username(self, db):
        """按用户名查找用户"""
        user = await create_user(db, "find_by_uname", "uname@example.com", "Pass123!")
        found = await get_user_by_username(db, "find_by_uname")
        assert found is not None
        assert found.email == "uname@example.com"

    async def test_get_user_by_username_not_found(self, db):
        """不存在的用户名返回 None"""
        assert await get_user_by_username(db, "nonexistent") is None

    async def test_get_user_by_email(self, db):
        """按邮箱查找用户"""
        user = await create_user(db, "find_by_email", "find@example.com", "Pass123!")
        found = await get_user_by_email(db, "find@example.com")
        assert found is not None
        assert found.username == "find_by_email"

    async def test_get_user_by_email_not_found(self, db):
        """不存在的邮箱返回 None"""
        assert await get_user_by_email(db, "nobody@example.com") is None

    async def test_update_user(self, db):
        """更新用户信息"""
        user = await create_user(db, "update_me", "update@example.com", "Pass123!")
        updated = await update_user(db, user, {"first_name": "张", "email": "new@example.com"})
        assert updated.first_name == "张"
        assert updated.email == "new@example.com"
        # 未更新的字段保持不变
        assert updated.username == "update_me"

    async def test_get_users_returns_active_only(self, db):
        """get_users 只返回活跃用户"""
        u1 = await create_user(db, "active1", "a1@example.com", "Pass123!")
        u2 = await create_user(db, "active2", "a2@example.com", "Pass123!")
        u2.is_active = False
        await db.flush()

        users = await get_users(db)
        usernames = [u.username for u in users]
        assert "active1" in usernames
        assert "active2" not in usernames


class TestTokenBlacklist:
    """令牌黑名单"""

    async def test_blacklist_and_check(self, db):
        """将令牌加入黑名单后被 is_token_blacklisted 检测到"""
        from datetime import datetime, timedelta, timezone

        token = "test-blacklist-token"
        expired_at = datetime.now(timezone.utc) + timedelta(days=1)

        assert await is_token_blacklisted(db, token) is False
        await blacklist_token(db, token, expired_at)
        assert await is_token_blacklisted(db, token) is True

    async def test_is_not_blacklisted(self, db):
        """从未被加入黑名单的令牌返回 False"""
        assert await is_token_blacklisted(db, "never-blacklisted") is False
