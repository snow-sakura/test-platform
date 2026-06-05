from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer

from .models import (
    MEMBER_ROLE_DISPLAY_MAP,
    ProjectMemberRole,
    ProjectStatus,
    STATUS_DISPLAY_MAP,
)


class ProjectBase(BaseModel):
    """项目基础字段"""
    name: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: date | None = None
    end_date: date | None = None


class ProjectCreate(ProjectBase):
    """创建项目请求"""
    member_ids: list[int] = []


class ProjectUpdate(BaseModel):
    """更新项目请求（所有字段可选，支持 PATCH）"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date | None] = None
    end_date: Optional[date | None] = None


class ProjectMemberResponse(BaseModel):
    """项目成员响应"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    role: ProjectMemberRole
    role_display: str = ""
    username: str = ""
    created_at: str | None = None

    def model_post_init(self, __context) -> None:
        self.role_display = MEMBER_ROLE_DISPLAY_MAP.get(self.role, self.role.value)
        if __context and hasattr(__context, "user") and __context.user:
            self.username = getattr(__context.user, "username", "")

    @field_serializer("created_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None


class ProjectResponse(BaseModel):
    """项目响应（包含 status_display 显示值）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    status: ProjectStatus
    status_display: str = ""
    start_date: date | None = None
    end_date: date | None = None
    created_by: int | None = None
    creator_name: str = ""
    member_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def model_post_init(self, __context) -> None:
        """自动填充显示值和关联数据"""
        self.status_display = STATUS_DISPLAY_MAP.get(self.status, self.status.value)
        if __context:
            # 从加载的 members 关系计算成员数
            if hasattr(__context, "members") and __context.members is not None:
                self.member_count = len(__context.members)
            # 从 creator 关系获取创建者信息
            if hasattr(__context, "creator") and __context.creator:
                self.creator_name = __context.creator.username or ""
                self.created_by = __context.created_by

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None

    @field_serializer("start_date", "end_date")
    def serialize_date(self, value: date | None) -> str | None:
        return value.isoformat() if value else None


class ProjectMemberCreate(BaseModel):
    """添加成员请求"""
    user_id: int
    role: ProjectMemberRole = ProjectMemberRole.MEMBER


class ProjectMemberUpdate(BaseModel):
    """更新成员角色"""
    role: ProjectMemberRole
