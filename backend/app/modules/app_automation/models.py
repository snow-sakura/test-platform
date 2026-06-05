"""APP 自动化测试模块 - 数据模型

涵盖：项目 → 设备 → 元素 → 用例 → 套件 → 执行
共 13 个 ORM 模型（基于 Airtest 图像识别 + ADB 设备管理）。
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppProject(Base):
    """APP 自动化测试项目"""
    __tablename__ = "app_automation_projects"
    __table_args__ = {"comment": "APP 自动化项目"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="项目 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="项目名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="项目描述")
    platform: Mapped[str] = mapped_column(String(20), default="android", comment="android/ios")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="状态: active/archived")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    devices = relationship("Device", back_populates="project", cascade="all, delete-orphan")
    elements = relationship("AppElement", back_populates="project", cascade="all, delete-orphan")


class AppConfig(Base):
    """环境配置（ADB 路径等全局设置）"""
    __tablename__ = "app_automation_configs"
    __table_args__ = {"comment": "环境配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    adb_path: Mapped[str] = mapped_column(String(500), default="adb")
    device_timeout: Mapped[int] = mapped_column(Integer, default=30, comment="设备超时(秒)")
    screenshot_dir: Mapped[str] = mapped_column(String(500), default="screenshots")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)


class Device(Base):
    """设备管理（ADB 连接的移动设备）"""
    __tablename__ = "app_automation_devices"
    __table_args__ = {"comment": "设备"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="设备 ID")
    project_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id: Mapped[str] = mapped_column(String(200), nullable=False, comment="ADB 序列号/UDID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="设备名称")
    platform: Mapped[str] = mapped_column(String(20), default="android", comment="android/ios")
    platform_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_type: Mapped[str] = mapped_column(String(20), default="real", comment="real/emulator")
    status: Mapped[str] = mapped_column(
        String(20), default="disconnected",
        comment="available/occupied/disconnected",
    )
    resolution: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="分辨率 1080x1920")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="设备 IP")
    connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="连接时间")
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="最后在线时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    project = relationship("AppProject", back_populates="devices")
    executions = relationship("AppTestExecution", back_populates="device")


class AppPackage(Base):
    """应用包名管理"""
    __tablename__ = "app_automation_packages"
    __table_args__ = {"comment": "应用包"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="包 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(300), nullable=False, comment="Android package/ iOS bundle")
    app_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="应用名称")
    main_activity: Mapped[str | None] = mapped_column(String(300), nullable=True, comment="启动 Activity")
    version: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="版本号")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    project = relationship("AppProject")


class AppImageCategory(Base):
    """图片分类（元素分组）"""
    __tablename__ = "app_automation_image_categories"
    __table_args__ = {"comment": "图片分类"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="分类 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="分类名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="分类描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    elements = relationship("AppElement", back_populates="image_category")


class AppElement(Base):
    """APP 界面元素（Airtest 图像识别）

    支持四种定位方式：
    - image: 模板图片匹配
    - coordinate: 绝对坐标点击 (x, y)
    - region: 区域点击 (x, y, w, h)
    - text: 文本匹配
    """
    __tablename__ = "app_automation_elements"
    __table_args__ = {"comment": "APP 元素"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="元素 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="元素名称")
    element_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="image/coordinate/region/text",
    )
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="模板图片路径")
    coordinates: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, comment="坐标数据: {x,y} 或 {x,y,w,h}",
    )
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True, comment="图像匹配阈值 0-1")
    image_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("app_automation_image_categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="元素描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("AppProject", back_populates="elements")
    image_category = relationship("AppImageCategory", back_populates="elements")


class AppTestCase(Base):
    """APP 测试用例（含场景编排数据）"""
    __tablename__ = "app_automation_test_cases"
    __table_args__ = {"comment": "APP 测试用例"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="用例 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="用例名称")
    package_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_packages.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_devices.id", ondelete="SET NULL"), nullable=True, index=True)
    scene_data: Mapped[list | None] = mapped_column(
        JSON, nullable=True, comment="场景编排步骤: [{action, element_id, params}]",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="用例描述")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW")
    status: Mapped[str] = mapped_column(String(20), default="draft", comment="状态: draft/ready")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("AppProject")
    package = relationship("AppPackage")
    device = relationship("Device")
    suite_links = relationship("AppTestSuiteCase", back_populates="test_case", cascade="all, delete-orphan")


class AppTestSuite(Base):
    """APP 测试套件"""
    __tablename__ = "app_automation_test_suites"
    __table_args__ = {"comment": "APP 测试套件"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="套件 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="套件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="套件描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    case_links = relationship("AppTestSuiteCase", back_populates="suite", cascade="all, delete-orphan")


class AppTestSuiteCase(Base):
    """套件-用例关联（有序 M2M）"""
    __tablename__ = "app_automation_suite_cases"
    __table_args__ = (
        UniqueConstraint("suite_id", "test_case_id", name="uq_app_suite_case"),
        {"comment": "套件-用例关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
    suite_id: Mapped[int] = mapped_column(ForeignKey("app_automation_test_suites.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id: Mapped[int] = mapped_column(ForeignKey("app_automation_test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")

    suite = relationship("AppTestSuite", back_populates="case_links")
    test_case = relationship("AppTestCase", back_populates="suite_links")


class AppTestExecution(Base):
    """APP 测试执行记录"""
    __tablename__ = "app_automation_test_executions"
    __table_args__ = {"comment": "测试执行"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="执行 ID")
    test_case_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_test_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    suite_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_test_suites.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_devices.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="pending/running/completed/failed")
    result: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="passed/failed")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="耗时(ms)")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    device = relationship("Device", back_populates="executions")
    screenshots = relationship("AppScreenshot", back_populates="execution", cascade="all, delete-orphan")


class AppScreenshot(Base):
    """执行截图"""
    __tablename__ = "app_automation_screenshots"
    __table_args__ = {"comment": "执行截图"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="截图 ID")
    execution_id: Mapped[int] = mapped_column(ForeignKey("app_automation_test_executions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_index: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="步骤索引")
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="截图时间")

    execution = relationship("AppTestExecution", back_populates="screenshots")


class AppComponentLibrary(Base):
    """组件库（可复用的测试组件）"""
    __tablename__ = "app_automation_component_libraries"
    __table_args__ = {"comment": "组件库"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="组件 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("app_automation_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="组件名称")
    component_type: Mapped[str] = mapped_column(String(20), default="basic", comment="basic/custom")
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="组件配置")
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="图标")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="组件描述")
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否公开")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")


class AppScheduledTask(Base):
    """定时任务"""
    __tablename__ = "app_automation_scheduled_tasks"
    __table_args__ = {"comment": "定时任务"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="任务 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="任务名称")
    suite_id: Mapped[int | None] = mapped_column(ForeignKey("app_automation_test_suites.id", ondelete="CASCADE"), nullable=True, index=True)
    cron_expression: Mapped[str] = mapped_column(String(100), default="0 9 * * 1-5", comment="Cron 表达式")
    trigger_type: Mapped[str] = mapped_column(String(20), default="cron", comment="cron/interval")
    interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="间隔秒数")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="active/paused")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")


class AppNotificationLog(Base):
    """通知日志"""
    __tablename__ = "app_automation_notification_logs"
    __table_args__ = {"comment": "通知日志"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="日志 ID")
    config_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="关联通知配置 ID（预留，通知配置管理待实现）")
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="事件类型")
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="success/failed")
    message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="消息内容")
    response: Mapped[str | None] = mapped_column(Text, nullable=True, comment="响应内容")
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="发送时间")
