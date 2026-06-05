"""UI 自动化测试模块 - 数据模型

涵盖：项目 → 元素 → 页面对象 → 脚本 → 用例 → 套件 → 执行
共 18 个 ORM 模型。
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UiProject(Base):
    """UI 自动化项目"""
    __tablename__ = "ui_automation_projects"
    __table_args__ = {"comment": "UI 自动化项目"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="项目 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="项目名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="项目描述")
    url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="目标 URL")
    browser_type: Mapped[str] = mapped_column(String(50), default="chromium", comment="chromium/firefox/webkit")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="状态: active/archived")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    elements = relationship("UiElement", back_populates="project", cascade="all, delete-orphan")
    page_objects = relationship("UiPageObject", back_populates="project", cascade="all, delete-orphan")
    scripts = relationship("UiTestScript", back_populates="project", cascade="all, delete-orphan")


class LocatorStrategy(Base):
    """定位策略字典表"""
    __tablename__ = "ui_automation_locator_strategies"
    __table_args__ = {"comment": "定位策略字典表"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="策略 ID")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="策略名称")
    strategy_type: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="id/name/css/xpath/class/text/link_text/partial_link_text/tag_name",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="策略描述")
    priority: Mapped[int] = mapped_column(Integer, default=0, comment="优先级")


class UiElementGroup(Base):
    """元素分组（树形）"""
    __tablename__ = "ui_automation_element_groups"
    __table_args__ = {"comment": "元素分组"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="分组 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="分组名称")
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("ui_automation_element_groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")

    project = relationship("UiProject")
    children = relationship("UiElementGroup", backref="parent", remote_side=[id], cascade="all")
    elements = relationship("UiElement", back_populates="group")


class UiElement(Base):
    """UI 元素"""
    __tablename__ = "ui_automation_elements"
    __table_args__ = {"comment": "UI 元素"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="元素 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="元素名称")
    locator_type: Mapped[str] = mapped_column(
        String(30), nullable=False, comment="id/name/css/xpath/class/text",
    )
    locator_value: Mapped[str] = mapped_column(String(500), nullable=False, comment="定位器值")
    backup_locators: Mapped[list | None] = mapped_column(
        JSON, nullable=True, comment="备用定位器列表: [{type, value}]",
    )
    group_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_element_groups.id", ondelete="SET NULL"), nullable=True, index=True)
    page_url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="所在页面 URL")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="元素描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("UiProject", back_populates="elements")
    group = relationship("UiElementGroup", back_populates="elements")
    page_object_links = relationship("UiPageObjectElement", back_populates="element", cascade="all, delete-orphan")


class UiPageObject(Base):
    """页面对象（Page Object）"""
    __tablename__ = "ui_automation_page_objects"
    __table_args__ = {"comment": "页面对象"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="页面对象 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="页面名称")
    url: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="页面 URL")
    generated_code: Mapped[str | None] = mapped_column(Text, nullable=True, comment="自动生成的 Page Object 代码")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("UiProject", back_populates="page_objects")
    element_links = relationship("UiPageObjectElement", back_populates="page_object", cascade="all, delete-orphan")


class UiPageObjectElement(Base):
    """页面对象-元素关联"""
    __tablename__ = "ui_automation_page_object_elements"
    __table_args__ = (
        UniqueConstraint("page_object_id", "element_id", name="uq_po_element"),
        {"comment": "页面对象-元素关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
    page_object_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_page_objects.id", ondelete="CASCADE"), nullable=False, comment="页面对象 ID", index=True
    )
    element_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_elements.id", ondelete="CASCADE"), nullable=False, comment="元素 ID", index=True
    )
    alias: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="元素别名")
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序序号")

    page_object = relationship("UiPageObject", back_populates="element_links")
    element = relationship("UiElement", back_populates="page_object_links")


class UiTestScript(Base):
    """测试脚本"""
    __tablename__ = "ui_automation_test_scripts"
    __table_args__ = {"comment": "测试脚本"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="脚本 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="脚本名称")
    page_object_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_page_objects.id", ondelete="SET NULL"), nullable=True, comment="页面对象 ID", index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="脚本描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("UiProject", back_populates="scripts")
    page_object = relationship("UiPageObject")
    steps = relationship("UiScriptStep", back_populates="script", cascade="all, delete-orphan",
                         order_by="UiScriptStep.step_number")


class UiScriptStep(Base):
    """脚本步骤"""
    __tablename__ = "ui_automation_script_steps"
    __table_args__ = {"comment": "脚本步骤"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="步骤 ID")
    script_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_scripts.id", ondelete="CASCADE"), nullable=False, comment="脚本 ID", index=True
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False, comment="步骤序号")
    action_type: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="click/input/select/wait/assert/scroll/hover/navigate/screenshot",
    )
    element_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_elements.id", ondelete="SET NULL"), nullable=True, comment="元素 ID", index=True)
    input_value: Mapped[str | None] = mapped_column(Text, nullable=True, comment="输入值")
    expected_result: Mapped[str | None] = mapped_column(Text, nullable=True, comment="预期结果/断言值")
    wait_seconds: Mapped[float | None] = mapped_column(Float, nullable=True, comment="等待时间(秒)")

    script = relationship("UiTestScript", back_populates="steps")
    element = relationship("UiElement")


class UiScriptElementUsage(Base):
    """脚本元素使用分析"""
    __tablename__ = "ui_automation_script_element_usages"
    __table_args__ = {"comment": "脚本元素使用分析"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="使用 ID")
    script_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_scripts.id", ondelete="CASCADE"), nullable=False, comment="脚本 ID", index=True
    )
    element_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_elements.id", ondelete="CASCADE"), nullable=False, comment="元素 ID", index=True
    )
    usage_count: Mapped[int] = mapped_column(Integer, default=0, comment="使用次数")
    context: Mapped[str | None] = mapped_column(Text, nullable=True, comment="使用场景描述")


class UiTestCase(Base):
    """UI 测试用例"""
    __tablename__ = "ui_automation_test_cases"
    __table_args__ = {"comment": "UI 测试用例"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="用例 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="用例名称")
    script_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_test_scripts.id", ondelete="SET NULL"), nullable=True, comment="脚本 ID", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", comment="优先级: HIGH/MEDIUM/LOW")
    status: Mapped[str] = mapped_column(String(20), default="draft", comment="状态: draft/ready")
    test_data: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="测试数据（JSON）")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("UiProject")
    script = relationship("UiTestScript")


class UiTestSuite(Base):
    """UI 测试套件"""
    __tablename__ = "ui_automation_test_suites"
    __table_args__ = {"comment": "UI 测试套件"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="套件 ID")
    project_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=False, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="套件名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="套件描述")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")

    project = relationship("UiProject")
    case_links = relationship("UiTestSuiteCase", back_populates="suite", cascade="all, delete-orphan",
                              order_by="UiTestSuiteCase.order")


class UiTestSuiteCase(Base):
    """套件-用例关联（有序 M2M）"""
    __tablename__ = "ui_automation_suite_cases"
    __table_args__ = (
        UniqueConstraint("suite_id", "test_case_id", name="uq_suite_ui_case"),
        {"comment": "套件-用例关联"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="关联 ID")
    suite_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_suites.id", ondelete="CASCADE"), nullable=False, comment="套件 ID", index=True
    )
    test_case_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_cases.id", ondelete="CASCADE"), nullable=False, comment="用例 ID", index=True
    )
    order: Mapped[int] = mapped_column(Integer, default=0, comment="排序")

    suite = relationship("UiTestSuite", back_populates="case_links")
    test_case = relationship("UiTestCase")


class UiTestExecution(Base):
    """测试执行"""
    __tablename__ = "ui_automation_test_executions"
    __table_args__ = {"comment": "测试执行"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="执行 ID")
    suite_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_test_suites.id", ondelete="SET NULL"), nullable=True, comment="套件 ID", index=True)
    test_case_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_test_cases.id", ondelete="SET NULL"), nullable=True, comment="用例 ID", index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", comment="pending/running/completed/failed/aborted",
    )
    result: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="passed/failed")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="开始时间")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="完成时间")
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True, comment="耗时(ms)")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="错误信息")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    suite = relationship("UiTestSuite")
    test_case = relationship("UiTestCase")
    screenshots = relationship("UiScreenshot", back_populates="execution", cascade="all, delete-orphan")
    operation_records = relationship("UiOperationRecord", back_populates="execution", cascade="all, delete-orphan")


class UiScreenshot(Base):
    """执行截图"""
    __tablename__ = "ui_automation_screenshots"
    __table_args__ = {"comment": "执行截图"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="截图 ID")
    execution_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_executions.id", ondelete="CASCADE"), nullable=False, comment="执行 ID", index=True
    )
    step_id: Mapped[int | None] = mapped_column(
        ForeignKey("ui_automation_script_steps.id", ondelete="CASCADE"), nullable=True, comment="步骤 ID", index=True
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False, comment="截图存储路径")
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="截图时间")

    execution = relationship("UiTestExecution", back_populates="screenshots")


class UiOperationRecord(Base):
    """操作记录"""
    __tablename__ = "ui_automation_operation_records"
    __table_args__ = {"comment": "操作记录"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="记录 ID")
    execution_id: Mapped[int] = mapped_column(
        ForeignKey("ui_automation_test_executions.id", ondelete="CASCADE"), nullable=False, comment="执行 ID", index=True
    )
    step_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_script_steps.id", ondelete="CASCADE"), nullable=True, comment="步骤 ID", index=True)
    action_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="操作类型")
    detail: Mapped[str | None] = mapped_column(Text, nullable=True, comment="操作详情")
    success: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否成功")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    execution = relationship("UiTestExecution", back_populates="operation_records")


class UiScheduledTask(Base):
    """定时任务"""
    __tablename__ = "ui_automation_scheduled_tasks"
    __table_args__ = {"comment": "定时任务"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="任务 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="任务名称")
    suite_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_test_suites.id", ondelete="SET NULL"), nullable=True, comment="套件 ID", index=True)
    cron_expression: Mapped[str] = mapped_column(String(100), default="0 9 * * 1-5", comment="Cron 表达式")
    trigger_type: Mapped[str] = mapped_column(String(20), default="cron", comment="cron/interval")
    interval_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="间隔秒数")
    status: Mapped[str] = mapped_column(String(20), default="active", comment="active/paused")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment="更新时间")


class UiNotificationConfig(Base):
    """通知配置"""
    __tablename__ = "ui_automation_notification_configs"
    __table_args__ = {"comment": "通知配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="配置 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="配置名称")
    notify_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="feishu/wechat/dingtalk")
    webhook_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="Webhook 地址")
    secret: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="签名密钥")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")


class UiNotificationLog(Base):
    """通知日志"""
    __tablename__ = "ui_automation_notification_logs"
    __table_args__ = {"comment": "通知日志"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="日志 ID")
    config_id: Mapped[int] = mapped_column(ForeignKey("ui_automation_notification_configs.id", ondelete="CASCADE"), nullable=False, comment="通知配置 ID", index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="事件类型")
    status: Mapped[str] = mapped_column(String(20), nullable=False, comment="success/failed")
    message: Mapped[str | None] = mapped_column(Text, nullable=True, comment="消息内容")
    response: Mapped[str | None] = mapped_column(Text, nullable=True, comment="响应内容")
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="发送时间")


class UiEnvironment(Base):
    """环境配置"""
    __tablename__ = "ui_automation_environments"
    __table_args__ = {"comment": "环境配置"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="环境 ID")
    project_id: Mapped[int | None] = mapped_column(ForeignKey("ui_automation_projects.id", ondelete="CASCADE"), nullable=True, comment="项目 ID", index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="环境名称")
    browser_type: Mapped[str] = mapped_column(String(50), default="chromium", comment="浏览器类型")
    window_width: Mapped[int] = mapped_column(Integer, default=1280, comment="窗口宽度")
    window_height: Mapped[int] = mapped_column(Integer, default=720, comment="窗口高度")
    timeout_ms: Mapped[int] = mapped_column(Integer, default=30000, comment="超时时间(毫秒)")
    headless: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否无头模式")
    screenshot_on_failure: Mapped[bool] = mapped_column(Boolean, default=True, comment="失败时截图")
    record_video: Mapped[bool] = mapped_column(Boolean, default=False, comment="录制视频")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False, comment="创建时间")
