import enum
from datetime import date, datetime

from sqlalchemy import DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectStatus(str, enum.Enum):
    """项目状态枚举，与 Django 的 TextChoices 保持一致"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    COMPLETED = "completed"


# 状态对应的中文显示值映射
STATUS_DISPLAY_MAP = {
    ProjectStatus.ACTIVE: "进行中",
    ProjectStatus.ARCHIVED: "已归档",
    ProjectStatus.COMPLETED: "已完成",
}


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, comment="项目名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default="", comment="项目描述")
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="project_status"),
        default=ProjectStatus.ACTIVE,
        nullable=False,
        comment="项目状态",
    )
    start_date: Mapped[date | None] = mapped_column(nullable=True, comment="开始日期")
    end_date: Mapped[date | None] = mapped_column(nullable=True, comment="结束日期")
    # 关联关系
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="project", cascade="all, delete-orphan"
    )
    test_points: Mapped[list["TestPoint"]] = relationship(
        "TestPoint", back_populates="project", cascade="all, delete-orphan"
    )
    test_cases: Mapped[list["TestCase"]] = relationship(
        "TestCase", back_populates="project", cascade="all, delete-orphan"
    )
    batches: Mapped[list["TaskBatch"]] = relationship(
        "TaskBatch", back_populates="project", cascade="all, delete-orphan"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="创建时间",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
        comment="更新时间",
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status.value}')>"
