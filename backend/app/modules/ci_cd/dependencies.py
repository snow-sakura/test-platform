"""CI/CD 集成 - 认证依赖"""
from __future__ import annotations

import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

from .crud import get_api_token_by_token, update_api_token_last_used


def hash_token(token: str) -> str:
    """对 Token 进行 SHA-256 哈希"""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token() -> str:
    """生成 API Token"""
    import secrets
    return f"tp_{secrets.token_urlsafe(40)}"


async def get_ci_api_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
):
    """验证 CI API Token（Webhook 入口专用认证）

    支持两种认证方式：
    1. JWT（用户登录态）— 用于管理端点
    2. API Token（CI 系统）— 用于 Webhook 接收
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证凭据",
        )

    token_str = credentials.credentials
    token_hash = hash_token(token_str)
    api_token = await get_api_token_by_token(db, token_hash)

    if api_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 API Token",
        )

    if not api_token.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Token 已被禁用",
        )

    if api_token.expires_at and api_token.expires_at < __import__("datetime").datetime.now():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Token 已过期",
        )

    # 更新最后使用时间
    await update_api_token_last_used(db, api_token.id)

    return api_token
