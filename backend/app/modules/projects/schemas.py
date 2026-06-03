from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_serializer

from .models import ProjectStatus, STATUS_DISPLAY_MAP


class ProjectBase(BaseModel):
    """项目基础字段"""
    name: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: date | None = None
    end_date: date | None = None


class ProjectCreate(ProjectBase):
    """创建项目请求"""
    pass


class ProjectUpdate(BaseModel):
    """更新项目请求（所有字段可选，支持 PATCH）"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date | None] = None
    end_date: Optional[date | None] = None


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
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def model_post_init(self, __context) -> None:
        """自动填充 status_display（与 DRF 的 source='get_status_display' 行为一致）"""
        self.status_display = STATUS_DISPLAY_MAP.get(self.status, self.status.value)

    @field_serializer("created_at", "updated_at")
    def serialize_datetime(self, value: datetime | None) -> str | None:
        """日期时间格式化为 YYYY-MM-DD HH:MM:SS（与 DRF 的 DATETIME_FORMAT 一致）"""
        return value.strftime("%Y-%m-%d %H:%M:%S") if value else None

    @field_serializer("start_date", "end_date")
    def serialize_date(self, value: date | None) -> str | None:
        """日期格式化为 YYYY-MM-DD（与 DRF 的 DATE_FORMAT 一致）"""
        return value.isoformat() if value else None
