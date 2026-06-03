"""用户认证数据库操作"""
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.auth.models import RefreshTokenBlacklist, User

# 密码上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """哈希密码"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """创建访问令牌（默认 60 分钟过期）"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """创建刷新令牌（默认 7 天过期）"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    """解码 JWT 令牌，失败返回 None"""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except Exception:
        return None


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """按 ID 查找用户"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """按用户名查找用户"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """按邮箱查找用户"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, username: str, email: str, password: str,
                      **extra) -> User:
    """创建用户"""
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        **extra,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, data: dict) -> User:
    """更新用户信息"""
    for key, value in data.items():
        if value is not None:
            setattr(user, key, value)
    await db.commit()
    await db.refresh(user)
    return user


async def get_users(db: AsyncSession) -> list[User]:
    """获取所有活跃用户"""
    result = await db.execute(
        select(User).where(User.is_active.is_(True)).order_by(User.id)
    )
    return list(result.scalars().all())


async def is_token_blacklisted(db: AsyncSession, token: str) -> bool:
    """检查令牌是否在黑名单中"""
    result = await db.execute(
        select(RefreshTokenBlacklist).where(RefreshTokenBlacklist.token == token)
    )
    return result.scalar_one_or_none() is not None


async def blacklist_token(db: AsyncSession, token: str, expired_at: datetime):
    """将令牌加入黑名单"""
    entry = RefreshTokenBlacklist(token=token, expired_at=expired_at)
    db.add(entry)
    await db.commit()
