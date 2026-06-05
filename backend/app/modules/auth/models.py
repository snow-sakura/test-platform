"""用户认证模型"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """用户模型"""

    __tablename__ = "users"
    __table_args__ = {"comment": "用户"}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, comment="用户 ID"
    )
    username: Mapped[str] = mapped_column(
        String(150), unique=True, nullable=False, comment="用户名"
    )
    email: Mapped[str] = mapped_column(
        String(254), unique=True, nullable=False, comment="邮箱"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="密码哈希"
    )
    first_name: Mapped[str | None] = mapped_column(
        String(150), nullable=True, default="", comment="名"
    )
    last_name: Mapped[str | None] = mapped_column(
        String(150), nullable=True, default="", comment="姓"
    )
    department: Mapped[str | None] = mapped_column(
        String(200), nullable=True, default="", comment="部门"
    )
    position: Mapped[str | None] = mapped_column(
        String(200), nullable=True, default="", comment="职位"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, comment="是否激活"
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, comment="是否超级用户"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, comment="创建时间"
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
        comment="更新时间",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}')>"


class TokenType(str, enum.Enum):
    """令牌类型"""
    ACCESS = "access"
    REFRESH = "refresh"


class RefreshTokenBlacklist(Base):
    """刷新令牌黑名单（登出/更换令牌时加入）"""

    __tablename__ = "refresh_token_blacklist"
    __table_args__ = {"comment": "刷新令牌黑名单"}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, comment="ID"
    )
    token: Mapped[str] = mapped_column(
        String(500), unique=True, nullable=False, comment="令牌"
    )
    expired_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, comment="过期时间"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, comment="创建时间"
    )
