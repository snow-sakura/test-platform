"""RBAC 权限系统 - 数据模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Permission(Base):
    """权限定义"""
    __tablename__ = "rbac_permissions"
    __table_args__ = {"comment": "权限定义"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="权限 ID")
    codename: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="权限代码: project.create")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="权限名称")
    module: Mapped[str] = mapped_column(String(50), nullable=False, comment="所属模块")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")


class Role(Base):
    """角色"""
    __tablename__ = "rbac_roles"
    __table_args__ = {"comment": "角色"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="角色 ID")
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="角色名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, comment="系统角色（不可删除）")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")


class RolePermission(Base):
    """角色-权限 关联"""
    __tablename__ = "rbac_role_permissions"
    __table_args__ = {"comment": "角色-权限关联"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
    role_id: Mapped[int] = mapped_column(ForeignKey("rbac_roles.id", ondelete="CASCADE"), nullable=False, comment="角色 ID")
    permission_id: Mapped[int] = mapped_column(ForeignKey("rbac_permissions.id", ondelete="CASCADE"), nullable=False, comment="权限 ID")


class UserRole(Base):
    """用户-角色 关联"""
    __tablename__ = "rbac_user_roles"
    __table_args__ = {"comment": "用户-角色关联"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="用户 ID")
    role_id: Mapped[int] = mapped_column(ForeignKey("rbac_roles.id", ondelete="CASCADE"), nullable=False, comment="角色 ID")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
