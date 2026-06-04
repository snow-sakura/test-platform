"""接口测试模块数据模型

包含 API 测试相关的 9 个数据模型：项目、集合(树形)、请求、套件、环境、历史、定时任务、通知配置、通知日志
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ApiProject(Base):
    """API 测试项目"""
    __tablename__ = "api_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="项目名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, default="", comment="项目描述")
    type: Mapped[str | None] = mapped_column(String(50), nullable=True, default="HTTP", comment="项目类型: HTTP/WebSocket/gRPC")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", comment="状态: active/archived")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    # 关联关系
    collections: Mapped[list[ApiCollection]] = relationship(
        "ApiCollection", back_populates="project", cascade="all, delete-orphan"
    )
    test_suites: Mapped[list[ApiTestSuite]] = relationship(
        "ApiTestSuite", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ApiProject(id={self.id}, name='{self.name}')>"


class ApiCollection(Base):
    """API 集合/文件夹（树形结构，支持无限级嵌套）"""
    __tablename__ = "api_collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("api_projects.id"), nullable=False, comment="所属项目")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="集合名称")
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("api_collections.id"), nullable=True, comment="父集合 ID（自引用实现树形）"
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    # 关联关系
    project: Mapped[ApiProject] = relationship("ApiProject", back_populates="collections")
    parent: Mapped[ApiCollection | None] = relationship(
        "ApiCollection", remote_side="ApiCollection.id", backref="children"
    )
    requests: Mapped[list[ApiRequest]] = relationship(
        "ApiRequest", back_populates="collection", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ApiCollection(id={self.id}, name='{self.name}')>"


class ApiRequest(Base):
    """API 请求定义（核心模型）"""
    __tablename__ = "api_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("api_collections.id"), nullable=False, comment="所属集合")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="请求名称")
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="GET", comment="HTTP 方法")
    url: Mapped[str] = mapped_column(String(2048), nullable=False, default="", comment="请求 URL")
    headers: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="请求头")
    query_params: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="URL 查询参数")
    body: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="请求体")
    body_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="none", comment="请求体类型: none/json/form-data/x-www-form-urlencoded/binary"
    )
    expected_response: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict, comment="预期响应（用于断言）")
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否收藏")
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now(), nullable=True, comment="更新时间"
    )

    # 关联关系
    collection: Mapped[ApiCollection] = relationship("ApiCollection", back_populates="requests")
    histories: Mapped[list[ApiRequestHistory]] = relationship(
        "ApiRequestHistory", back_populates="request_ref", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ApiRequest(id={self.id}, name='{self.name}', method='{self.method}')>"


class ApiTestSuite(Base):
    """API 测试套件"""
    __tablename__ = "api_test_suites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("api_projects.id"), nullable=False, comment="所属项目")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="套件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="套件描述")
    request_ids: Mapped[list | None] = mapped_column(
        JSON, nullable=True, default=list, comment="有序的请求 ID 列表"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    # 关联关系
    project: Mapped[ApiProject] = relationship("ApiProject", back_populates="test_suites")

    def __repr__(self) -> str:
        return f"<ApiTestSuite(id={self.id}, name='{self.name}')>"


class ApiEnvironment(Base):
    """API 环境变量配置"""
    __tablename__ = "api_environments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("api_projects.id"), nullable=True,
        comment="关联项目 ID（null 表示全局环境）"
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="环境名称")
    env_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="local", comment="类型: global/local"
    )
    variables: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, default=dict, comment="环境变量键值对"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否激活")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    def __repr__(self) -> str:
        return f"<ApiEnvironment(id={self.id}, name='{self.name}')>"


class ApiRequestHistory(Base):
    """API 请求执行历史"""
    __tablename__ = "api_request_histories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[int | None] = mapped_column(
        ForeignKey("api_requests.id", ondelete="SET NULL"), nullable=True, comment="关联请求 ID"
    )
    project_id: Mapped[int] = mapped_column(ForeignKey("api_projects.id"), nullable=False, comment="所属项目")
    method: Mapped[str] = mapped_column(String(10), nullable=False, comment="HTTP 方法")
    url: Mapped[str] = mapped_column(String(2048), nullable=False, comment="请求 URL（执行时的实际值）")
    headers: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="请求头")
    query_params: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="URL 查询参数")
    body: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="请求体")
    response_status: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="响应状态码")
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True, comment="响应体文本")
    response_headers: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="响应头")
    elapsed_time: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="响应时间(ms)"
    )
    executed_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="执行时间"
    )

    # 关联关系
    request_ref: Mapped[ApiRequest | None] = relationship(
        "ApiRequest", back_populates="histories"
    )

    def __repr__(self) -> str:
        return f"<ApiRequestHistory(id={self.id}, method='{self.method}', status={self.response_status})>"


class ApiScheduledTask(Base):
    """API 定时任务"""
    __tablename__ = "api_scheduled_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="任务名称")
    task_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="suite", comment="任务类型: suite/request"
    )
    suite_id: Mapped[int | None] = mapped_column(
        ForeignKey("api_test_suites.id", ondelete="SET NULL"), nullable=True, comment="关联套件 ID"
    )
    request_id: Mapped[int | None] = mapped_column(
        ForeignKey("api_requests.id", ondelete="SET NULL"), nullable=True, comment="关联请求 ID"
    )
    cron_expression: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Cron 表达式: '0 9 * * 1-5'"
    )
    trigger_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="cron", comment="触发类型: cron/interval"
    )
    interval_seconds: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="间隔秒数（trigger_type=interval 时使用）"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", comment="状态: active/paused"
    )
    last_executed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="上次执行时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    def __repr__(self) -> str:
        return f"<ApiScheduledTask(id={self.id}, name='{self.name}')>"


class ApiNotificationConfig(Base):
    """通知配置（Webhook 机器人）"""
    __tablename__ = "api_notification_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    notify_type: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="通知类型: feishu/wechat/dingtalk"
    )
    webhook_url: Mapped[str] = mapped_column(String(1024), nullable=False, comment="Webhook 地址")
    secret: Mapped[str | None] = mapped_column(String(256), nullable=True, comment="签名密钥")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    def __repr__(self) -> str:
        return f"<ApiNotificationConfig(id={self.id}, name='{self.name}')>"


class ApiNotificationLog(Base):
    """通知发送日志"""
    __tablename__ = "api_notification_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config_id: Mapped[int] = mapped_column(
        ForeignKey("api_notification_configs.id", ondelete="CASCADE"), nullable=False, comment="通知配置 ID"
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="事件类型")
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="状态: success/failed")
    message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="消息内容")
    response: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Webhook 响应")
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="发送时间")

    def __repr__(self) -> str:
        return f"<ApiNotificationLog(id={self.id}, status='{self.status}')>"
