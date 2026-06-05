"""RBAC 权限系统 - Pydantic 模型"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class PermissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codename: str
    name: str
    module: str
    description: str | None = None


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permission_ids: list[int] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permission_ids: list[int] | None = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    is_system: bool
    created_at: str | None = None

    @field_validator("created_at", mode="before")
    def dt_to_str(cls, value):
        if isinstance(value, datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return value


class RoleDetailResponse(RoleResponse):
    permission_ids: list[int] = []
    user_count: int = 0


class UserRoleAssignment(BaseModel):
    user_id: int
    role_ids: list[int] = []


class UserRoleResponse(BaseModel):
    user_id: int
    role_ids: list[int] = []
    role_names: list[str] = []


class CurrentUserPermissions(BaseModel):
    """当前用户的权限列表"""
    user_id: int
    username: str
    is_superuser: bool
    permissions: list[str]  # codename 列表
