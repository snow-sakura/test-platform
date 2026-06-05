import enum
from datetime import date, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
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


class ProjectMemberRole(str, enum.Enum):
    """项目成员角色"""
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


MEMBER_ROLE_DISPLAY_MAP = {
    ProjectMemberRole.ADMIN: "管理员",
    ProjectMemberRole.MEMBER: "成员",
    ProjectMemberRole.VIEWER: "观察者",
}


class ProjectMember(Base):
    """项目成员关联表"""
    __tablename__ = "project_members"
    __table_args__ = {"comment": "项目成员"}

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, comment="ID")
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="项目 ID"
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, comment="用户 ID"
    )
    role: Mapped[ProjectMemberRole] = mapped_column(
        Enum(ProjectMemberRole, name="project_member_role"),
        default=ProjectMemberRole.MEMBER,
        nullable=False,
        comment="角色: admin/member/viewer",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False, comment="加入时间",
    )

    project: Mapped["Project"] = relationship("Project", back_populates="members", foreign_keys=[project_id])
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], lazy="selectin")


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"comment": "项目"}

    id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True, comment="项目 ID"
    )
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
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="创建者", index=True
    )
    # 关联关系
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="selectin")
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
    members: Mapped[list["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan",
        foreign_keys=[ProjectMember.project_id],
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
