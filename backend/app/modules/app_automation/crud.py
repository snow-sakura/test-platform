"""APP 自动化测试模块 - CRUD 操作"""
from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import (
    AppComponentLibrary, AppConfig, AppElement, AppImageCategory,
    AppNotificationLog, AppPackage, AppProject, AppScheduledTask,
    AppScreenshot, AppTestCase, AppTestExecution, AppTestSuite,
    AppTestSuiteCase, Device,
)


# ==============================
# 仪表盘统计
# ==============================


async def get_app_dashboard_stats(db: AsyncSession) -> dict:
    """获取 APP 自动化仪表盘统计数据"""
    project_count = (await db.execute(select(func.count(AppProject.id)))).scalar() or 0
    device_count = (await db.execute(select(func.count(Device.id)))).scalar() or 0
    element_count = (await db.execute(select(func.count(AppElement.id)))).scalar() or 0
    case_count = (await db.execute(select(func.count(AppTestCase.id)))).scalar() or 0
    today_executions = await get_today_execution_count(db)
    pass_rate = await get_execution_pass_rate(db)
    available_devices = (await db.execute(
        select(func.count(Device.id)).where(Device.status == "available")
    )).scalar() or 0

    return {
        "project_count": project_count,
        "device_count": device_count,
        "element_count": element_count,
        "case_count": case_count,
        "today_executions": today_executions,
        "pass_rate": pass_rate,
        "available_devices": available_devices,
    }


# ==============================
# 项目 CRUD
# ==============================


async def create_project(db: AsyncSession, data: dict) -> AppProject:
    project = AppProject(**data)
    db.add(project)
    await db.flush()
    return project


async def get_project(db: AsyncSession, project_id: int) -> AppProject | None:
    """获取项目并携带元素和设备关联"""
    result = await db.execute(
        select(AppProject).where(AppProject.id == project_id)
        .options(
            selectinload(AppProject.elements),
            selectinload(AppProject.devices),
        )
    )
    return result.scalar_one_or_none()


async def get_projects(
    db: AsyncSession, search: str | None = None, status: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[AppProject], int]:
    query = select(AppProject)
    if status:
        query = query.where(AppProject.status == status)
    if search:
        query = query.where(AppProject.name.like(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppProject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_project(db: AsyncSession, project: AppProject, data: dict) -> AppProject:
    for key, value in data.items():
        setattr(project, key, value)
    await db.flush()
    return project


async def delete_project(db: AsyncSession, project: AppProject) -> None:
    await db.delete(project)
    await db.flush()


async def get_element_count_by_project(db: AsyncSession, project_id: int) -> int:
    """获取项目下的元素数量"""
    result = await db.execute(
        select(func.count(AppElement.id)).where(AppElement.project_id == project_id)
    )
    return result.scalar() or 0


async def get_device_count_by_project(db: AsyncSession, project_id: int) -> int:
    """获取项目下的设备数量"""
    result = await db.execute(
        select(func.count(Device.id)).where(Device.project_id == project_id)
    )
    return result.scalar() or 0


# ==============================
# 配置 CRUD
# ==============================


async def create_config(db: AsyncSession, data: dict) -> AppConfig:
    config = AppConfig(**data)
    db.add(config)
    await db.flush()
    return config


async def get_config(db: AsyncSession, config_id: int) -> AppConfig | None:
    return await db.get(AppConfig, config_id)


async def get_configs(db: AsyncSession) -> list[AppConfig]:
    result = await db.execute(select(AppConfig).order_by(AppConfig.created_at.desc()))
    return list(result.scalars().all())


async def update_config(db: AsyncSession, config: AppConfig, data: dict) -> AppConfig:
    for key, value in data.items():
        setattr(config, key, value)
    await db.flush()
    return config


async def delete_config(db: AsyncSession, config: AppConfig) -> None:
    await db.delete(config)
    await db.flush()


# ==============================
# 设备 CRUD
# ==============================


async def create_device(db: AsyncSession, data: dict) -> Device:
    device = Device(**data)
    db.add(device)
    await db.flush()
    return device


async def get_device(db: AsyncSession, device_id: int) -> Device | None:
    return await db.get(Device, device_id)


async def get_devices(
    db: AsyncSession, project_id: int | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[Device], int]:
    query = select(Device)
    if project_id is not None:
        query = query.where(Device.project_id == project_id)
    if status:
        query = query.where(Device.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(Device.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_devices_by_project(db: AsyncSession, project_id: int) -> list[Device]:
    """获取项目下的所有设备"""
    result = await db.execute(
        select(Device).where(Device.project_id == project_id)
        .order_by(Device.created_at.desc())
    )
    return list(result.scalars().all())


async def update_device(db: AsyncSession, device: Device, data: dict) -> Device:
    for key, value in data.items():
        setattr(device, key, value)
    await db.flush()
    return device


async def delete_device(db: AsyncSession, device: Device) -> None:
    await db.delete(device)
    await db.flush()


# ==============================
# 应用包 CRUD
# ==============================


async def create_package(db: AsyncSession, data: dict) -> AppPackage:
    package = AppPackage(**data)
    db.add(package)
    await db.flush()
    return package


async def get_package(db: AsyncSession, package_id: int) -> AppPackage | None:
    return await db.get(AppPackage, package_id)


async def get_packages(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[AppPackage], int]:
    query = select(AppPackage).where(AppPackage.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppPackage.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_packages_by_project(db: AsyncSession, project_id: int) -> list[AppPackage]:
    """获取项目下的所有应用包"""
    result = await db.execute(
        select(AppPackage).where(AppPackage.project_id == project_id)
        .order_by(AppPackage.created_at.desc())
    )
    return list(result.scalars().all())


async def update_package(db: AsyncSession, package: AppPackage, data: dict) -> AppPackage:
    for key, value in data.items():
        setattr(package, key, value)
    await db.flush()
    return package


async def delete_package(db: AsyncSession, package: AppPackage) -> None:
    await db.delete(package)
    await db.flush()


# ==============================
# 图片分类 CRUD
# ==============================


async def create_image_category(db: AsyncSession, data: dict) -> AppImageCategory:
    category = AppImageCategory(**data)
    db.add(category)
    await db.flush()
    return category


async def get_image_category(db: AsyncSession, category_id: int) -> AppImageCategory | None:
    result = await db.execute(
        select(AppImageCategory).where(AppImageCategory.id == category_id)
        .options(selectinload(AppImageCategory.elements))
    )
    return result.scalar_one_or_none()


async def get_image_categories(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[AppImageCategory], int]:
    """获取项目下的图片分类（分页+含元素关联）"""
    base_query = select(AppImageCategory).where(AppImageCategory.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(base_query.subquery()))).scalar() or 0
    query = base_query.options(selectinload(AppImageCategory.elements)).order_by(AppImageCategory.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_categories_by_project(db: AsyncSession, project_id: int) -> list[AppImageCategory]:
    """获取项目下的所有图片分类（平铺列表）"""
    result = await db.execute(
        select(AppImageCategory).where(AppImageCategory.project_id == project_id)
        .order_by(AppImageCategory.created_at.desc())
    )
    return list(result.scalars().all())


async def update_image_category(db: AsyncSession, category: AppImageCategory, data: dict) -> AppImageCategory:
    for key, value in data.items():
        setattr(category, key, value)
    await db.flush()
    return category


async def delete_image_category(db: AsyncSession, category: AppImageCategory) -> None:
    await db.delete(category)
    await db.flush()


async def get_element_count_by_category(db: AsyncSession, category_id: int) -> int:
    """获取分类下的元素数量"""
    result = await db.execute(
        select(func.count(AppElement.id)).where(AppElement.image_category_id == category_id)
    )
    return result.scalar() or 0


# ==============================
# 元素 CRUD
# ==============================


async def create_element(db: AsyncSession, data: dict) -> AppElement:
    element = AppElement(**data)
    db.add(element)
    await db.flush()
    return element


async def get_element(db: AsyncSession, element_id: int) -> AppElement | None:
    return await db.get(AppElement, element_id)


async def get_elements(
    db: AsyncSession, project_id: int, category_id: int | None = None,
    search: str | None = None, element_type: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[AppElement], int]:
    query = select(AppElement).where(AppElement.project_id == project_id)
    if category_id is not None:
        query = query.where(AppElement.image_category_id == category_id)
    if element_type:
        query = query.where(AppElement.element_type == element_type)
    if search:
        query = query.where(AppElement.name.like(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppElement.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_elements_by_project(db: AsyncSession, project_id: int) -> list[AppElement]:
    """获取项目下的所有元素"""
    result = await db.execute(
        select(AppElement).where(AppElement.project_id == project_id)
        .order_by(AppElement.created_at.desc())
    )
    return list(result.scalars().all())


async def get_elements_by_category(db: AsyncSession, category_id: int) -> list[AppElement]:
    """获取分类下的所有元素"""
    result = await db.execute(
        select(AppElement).where(AppElement.image_category_id == category_id)
        .order_by(AppElement.created_at.desc())
    )
    return list(result.scalars().all())


async def update_element(db: AsyncSession, element: AppElement, data: dict) -> AppElement:
    for key, value in data.items():
        setattr(element, key, value)
    await db.flush()
    return element


async def delete_element(db: AsyncSession, element: AppElement) -> None:
    await db.delete(element)
    await db.flush()


# ==============================
# 用例 CRUD
# ==============================


async def create_test_case(db: AsyncSession, data: dict) -> AppTestCase:
    """创建测试用例，scene_data 以 JSON 形式存储"""
    case = AppTestCase(**data)
    db.add(case)
    await db.flush()
    return case


async def get_test_case(db: AsyncSession, case_id: int) -> AppTestCase | None:
    return await db.get(AppTestCase, case_id)


async def get_test_cases(
    db: AsyncSession, project_id: int, priority: str | None = None,
    status: str | None = None, package_id: int | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[AppTestCase], int]:
    query = select(AppTestCase).where(AppTestCase.project_id == project_id)
    if priority:
        query = query.where(AppTestCase.priority == priority)
    if status:
        query = query.where(AppTestCase.status == status)
    if package_id is not None:
        query = query.where(AppTestCase.package_id == package_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppTestCase.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_test_case(db: AsyncSession, case: AppTestCase, data: dict) -> AppTestCase:
    for key, value in data.items():
        setattr(case, key, value)
    await db.flush()
    return case


async def delete_test_case(db: AsyncSession, case: AppTestCase) -> None:
    await db.delete(case)
    await db.flush()


# ==============================
# 套件 CRUD
# ==============================


async def create_test_suite(db: AsyncSession, data: dict) -> AppTestSuite:
    case_ids = data.pop("case_ids", [])
    suite = AppTestSuite(**data)
    db.add(suite)
    await db.flush()
    for idx, cid in enumerate(case_ids):
        db.add(AppTestSuiteCase(suite_id=suite.id, test_case_id=cid, order=idx))
    await db.flush()
    return suite


async def get_test_suite(db: AsyncSession, suite_id: int) -> AppTestSuite | None:
    result = await db.execute(
        select(AppTestSuite).where(AppTestSuite.id == suite_id)
        .options(selectinload(AppTestSuite.case_links))
    )
    return result.scalar_one_or_none()


async def get_test_suites(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[AppTestSuite], int]:
    query = select(AppTestSuite).where(AppTestSuite.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppTestSuite.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_test_suite(db: AsyncSession, suite: AppTestSuite, data: dict) -> AppTestSuite:
    case_ids = data.pop("case_ids", None)
    for key, value in data.items():
        setattr(suite, key, value)
    if case_ids is not None:
        await db.execute(
            delete(AppTestSuiteCase).where(AppTestSuiteCase.suite_id == suite.id)
        )
        for idx, cid in enumerate(case_ids):
            db.add(AppTestSuiteCase(suite_id=suite.id, test_case_id=cid, order=idx))
    await db.flush()
    return suite


async def delete_test_suite(db: AsyncSession, suite: AppTestSuite) -> None:
    await db.delete(suite)
    await db.flush()


# ==============================
# 执行 CRUD
# ==============================


async def create_execution(db: AsyncSession, data: dict) -> AppTestExecution:
    execution = AppTestExecution(**data)
    db.add(execution)
    await db.flush()
    return execution


async def get_execution(db: AsyncSession, execution_id: int) -> AppTestExecution | None:
    result = await db.execute(
        select(AppTestExecution).where(AppTestExecution.id == execution_id)
        .options(selectinload(AppTestExecution.screenshots))
    )
    return result.scalar_one_or_none()


async def get_executions(
    db: AsyncSession, suite_id: int | None = None, project_id: int | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[AppTestExecution], int]:
    query = select(AppTestExecution)
    if suite_id:
        query = query.where(AppTestExecution.suite_id == suite_id)
    if status:
        query = query.where(AppTestExecution.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppTestExecution.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_execution(db: AsyncSession, execution: AppTestExecution, data: dict) -> AppTestExecution:
    for key, value in data.items():
        setattr(execution, key, value)
    await db.flush()
    return execution


async def delete_execution(db: AsyncSession, execution: AppTestExecution) -> None:
    await db.delete(execution)
    await db.flush()


async def stop_execution(db: AsyncSession, execution: AppTestExecution) -> AppTestExecution:
    """停止执行：将状态标记为 stopped，记录完成时间"""
    from datetime import datetime
    execution.status = "stopped"
    execution.completed_at = datetime.now()
    await db.flush()
    return execution


async def get_today_execution_count(db: AsyncSession) -> int:
    """获取今日执行次数"""
    from datetime import date
    today = date.today()
    result = await db.execute(
        select(func.count(AppTestExecution.id))
        .where(func.date(AppTestExecution.created_at) == today)
    )
    return result.scalar() or 0


async def get_execution_pass_rate(db: AsyncSession) -> float:
    """获取总体通过率"""
    total = await db.execute(select(func.count(AppTestExecution.id)))
    total = total.scalar() or 0
    if total == 0:
        return 0.0
    passed = await db.execute(
        select(func.count(AppTestExecution.id))
        .where(AppTestExecution.result == "passed")
    )
    passed = passed.scalar() or 0
    return round(passed / total * 100, 2)


# ==============================
# 截图 CRUD
# ==============================


async def create_screenshot(db: AsyncSession, data: dict) -> AppScreenshot:
    shot = AppScreenshot(**data)
    db.add(shot)
    await db.flush()
    return shot


# ==============================
# 组件库 CRUD
# ==============================


async def create_component(db: AsyncSession, data: dict) -> AppComponentLibrary:
    component = AppComponentLibrary(**data)
    db.add(component)
    await db.flush()
    return component


async def get_component(db: AsyncSession, component_id: int) -> AppComponentLibrary | None:
    return await db.get(AppComponentLibrary, component_id)


async def get_components(
    db: AsyncSession, project_id: int, component_type: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[AppComponentLibrary], int]:
    query = select(AppComponentLibrary).where(AppComponentLibrary.project_id == project_id)
    if component_type:
        query = query.where(AppComponentLibrary.component_type == component_type)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppComponentLibrary.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_components_by_project(db: AsyncSession, project_id: int) -> list[AppComponentLibrary]:
    """获取项目下的所有组件"""
    result = await db.execute(
        select(AppComponentLibrary).where(AppComponentLibrary.project_id == project_id)
        .order_by(AppComponentLibrary.created_at.desc())
    )
    return list(result.scalars().all())


async def update_component(db: AsyncSession, component: AppComponentLibrary, data: dict) -> AppComponentLibrary:
    for key, value in data.items():
        setattr(component, key, value)
    await db.flush()
    return component


async def delete_component(db: AsyncSession, component: AppComponentLibrary) -> None:
    await db.delete(component)
    await db.flush()


# ==============================
# 定时任务 CRUD
# ==============================


async def create_scheduled_task(db: AsyncSession, data: dict) -> AppScheduledTask:
    task = AppScheduledTask(**data)
    db.add(task)
    await db.flush()
    return task


async def get_scheduled_task(db: AsyncSession, task_id: int) -> AppScheduledTask | None:
    return await db.get(AppScheduledTask, task_id)


async def get_scheduled_tasks(
    db: AsyncSession, status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[AppScheduledTask], int]:
    query = select(AppScheduledTask)
    if status:
        query = query.where(AppScheduledTask.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AppScheduledTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_scheduled_task(db: AsyncSession, task: AppScheduledTask, data: dict) -> AppScheduledTask:
    for key, value in data.items():
        setattr(task, key, value)
    await db.flush()
    return task


async def delete_scheduled_task(db: AsyncSession, task: AppScheduledTask) -> None:
    await db.delete(task)
    await db.flush()


# ==============================
# 通知日志 CRUD
# ==============================


async def create_notification_log(db: AsyncSession, data: dict) -> AppNotificationLog:
    log = AppNotificationLog(**data)
    db.add(log)
    await db.flush()
    return log


async def get_notification_log(db: AsyncSession, log_id: int) -> AppNotificationLog | None:
    result = await db.execute(select(AppNotificationLog).where(AppNotificationLog.id == log_id))
    return result.scalar_one_or_none()


async def update_notification_log(db: AsyncSession, log: AppNotificationLog, data: dict) -> AppNotificationLog:
    for key, value in data.items():
        setattr(log, key, value)
    await db.flush()
    return log


async def get_notification_logs(
    db: AsyncSession, skip: int = 0, limit: int = 20,
) -> tuple[list[AppNotificationLog], int]:
    total = (await db.execute(select(func.count(AppNotificationLog.id)))).scalar() or 0
    query = select(AppNotificationLog).order_by(AppNotificationLog.sent_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total
