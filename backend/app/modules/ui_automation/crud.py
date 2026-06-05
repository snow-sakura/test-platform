"""UI 自动化测试模块 - CRUD 操作"""
from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import (
    UiElement, UiElementGroup, UiEnvironment, UiNotificationConfig,
    UiNotificationLog, UiOperationRecord, UiPageObject,
    UiPageObjectElement, UiProject, UiScheduledTask, UiScreenshot,
    UiScriptElementUsage, UiScriptStep, UiTestCase, UiTestExecution,
    UiTestScript, UiTestSuite, UiTestSuiteCase,
)


# ==============================
# 项目 CRUD
# ==============================


async def create_project(db: AsyncSession, data: dict) -> UiProject:
    project = UiProject(**data)
    db.add(project)
    await db.flush()
    return project


async def get_project(db: AsyncSession, project_id: int) -> UiProject | None:
    result = await db.execute(
        select(UiProject).where(UiProject.id == project_id)
        .options(
            selectinload(UiProject.elements),
            selectinload(UiProject.page_objects),
            selectinload(UiProject.scripts),
        )
    )
    return result.scalar_one_or_none()


async def get_projects(
    db: AsyncSession, search: str | None = None, status: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[UiProject], int]:
    query = select(UiProject)
    if status:
        query = query.where(UiProject.status == status)
    if search:
        query = query.where(UiProject.name.like(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiProject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_project(db: AsyncSession, project: UiProject, data: dict) -> UiProject:
    for key, value in data.items():
        setattr(project, key, value)
    await db.flush()
    return project


async def delete_project(db: AsyncSession, project: UiProject) -> None:
    await db.delete(project)
    await db.flush()


# ==============================
# 元素分组 CRUD
# ==============================


async def create_element_group(db: AsyncSession, data: dict) -> UiElementGroup:
    group = UiElementGroup(**data)
    db.add(group)
    await db.flush()
    return group


async def get_element_group_tree(db: AsyncSession, project_id: int) -> list[UiElementGroup]:
    """获取项目的元素分组树（平铺列表，前端构建树）"""
    result = await db.execute(
        select(UiElementGroup)
        .where(UiElementGroup.project_id == project_id)
        .options(selectinload(UiElementGroup.elements))
        .order_by(UiElementGroup.sort_order)
    )
    return list(result.scalars().all())


async def update_element_group(db: AsyncSession, group: UiElementGroup, data: dict) -> UiElementGroup:
    for key, value in data.items():
        setattr(group, key, value)
    await db.flush()
    return group


async def delete_element_group(db: AsyncSession, group: UiElementGroup) -> None:
    await db.delete(group)
    await db.flush()


# ==============================
# 元素 CRUD
# ==============================


async def create_element(db: AsyncSession, data: dict) -> UiElement:
    element = UiElement(**data)
    db.add(element)
    await db.flush()
    return element


async def get_element(db: AsyncSession, element_id: int) -> UiElement | None:
    return await db.get(UiElement, element_id)


async def get_elements(
    db: AsyncSession, project_id: int, group_id: int | None = None,
    search: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[UiElement], int]:
    query = select(UiElement).where(UiElement.project_id == project_id)
    if group_id is not None:
        query = query.where(UiElement.group_id == group_id)
    if search:
        query = query.where(UiElement.name.like(f"%{search}%"))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiElement.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_element(db: AsyncSession, element: UiElement, data: dict) -> UiElement:
    for key, value in data.items():
        setattr(element, key, value)
    await db.flush()
    return element


async def delete_element(db: AsyncSession, element: UiElement) -> None:
    await db.delete(element)
    await db.flush()


async def get_element_count_by_project(db: AsyncSession, project_id: int) -> int:
    result = await db.execute(
        select(func.count(UiElement.id)).where(UiElement.project_id == project_id)
    )
    return result.scalar() or 0


async def get_element_count_by_group(db: AsyncSession, group_id: int) -> int:
    result = await db.execute(
        select(func.count(UiElement.id)).where(UiElement.group_id == group_id)
    )
    return result.scalar() or 0


async def get_element_usages(db: AsyncSession, element_id: int) -> list[UiScriptElementUsage]:
    """获取元素在脚本中的使用情况"""
    result = await db.execute(
        select(UiScriptElementUsage).where(UiScriptElementUsage.element_id == element_id)
    )
    return list(result.scalars().all())


# ==============================
# 页面对象 CRUD
# ==============================


async def create_page_object(db: AsyncSession, data: dict) -> UiPageObject:
    element_ids = data.pop("element_ids", [])
    po = UiPageObject(**data)
    db.add(po)
    await db.flush()
    for idx, eid in enumerate(element_ids):
        db.add(UiPageObjectElement(page_object_id=po.id, element_id=eid, order=idx))
    await db.flush()
    return po


async def get_page_object(db: AsyncSession, po_id: int) -> UiPageObject | None:
    result = await db.execute(
        select(UiPageObject).where(UiPageObject.id == po_id)
        .options(selectinload(UiPageObject.element_links))
    )
    return result.scalar_one_or_none()


async def get_page_objects(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[UiPageObject], int]:
    query = select(UiPageObject).where(UiPageObject.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiPageObject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_page_object(db: AsyncSession, po: UiPageObject, data: dict) -> UiPageObject:
    element_ids = data.pop("element_ids", None)
    for key, value in data.items():
        setattr(po, key, value)
    if element_ids is not None:
        await db.execute(
            delete(UiPageObjectElement).where(UiPageObjectElement.page_object_id == po.id)
        )
        for idx, eid in enumerate(element_ids):
            db.add(UiPageObjectElement(page_object_id=po.id, element_id=eid, order=idx))
    await db.flush()
    return po


async def delete_page_object(db: AsyncSession, po: UiPageObject) -> None:
    await db.delete(po)
    await db.flush()


async def get_page_object_count_by_project(db: AsyncSession, project_id: int) -> int:
    result = await db.execute(
        select(func.count(UiPageObject.id)).where(UiPageObject.project_id == project_id)
    )
    return result.scalar() or 0


async def add_element_to_page_object(db: AsyncSession, po_id: int, element_id: int) -> UiPageObjectElement:
    """添加元素引用到页面对象"""
    existing = await db.execute(
        select(UiPageObjectElement).where(
            UiPageObjectElement.page_object_id == po_id,
            UiPageObjectElement.element_id == element_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("元素已存在于该页面对象中")

    result = await db.execute(
        select(UiPageObjectElement).where(UiPageObjectElement.page_object_id == po_id)
        .order_by(UiPageObjectElement.order.desc())
    )
    existing_records = list(result.scalars().all())
    max_order = existing_records[0].order if existing_records else 0

    link = UiPageObjectElement(page_object_id=po_id, element_id=element_id, order=max_order + 1)
    db.add(link)
    await db.flush()
    return link


# ==============================
# 脚本 CRUD
# ==============================


async def create_script(db: AsyncSession, data: dict) -> UiTestScript:
    steps_data = data.pop("steps", [])
    script = UiTestScript(**data)
    db.add(script)
    await db.flush()
    for step_data in steps_data:
        step = UiScriptStep(script_id=script.id, **step_data)
        db.add(step)
    await db.flush()
    return script


async def get_script(db: AsyncSession, script_id: int) -> UiTestScript | None:
    result = await db.execute(
        select(UiTestScript).where(UiTestScript.id == script_id)
        .options(selectinload(UiTestScript.steps))
    )
    return result.scalar_one_or_none()


async def get_scripts(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[UiTestScript], int]:
    query = select(UiTestScript).where(UiTestScript.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiTestScript.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    scripts = list(result.scalars().all())
    return scripts, total


async def update_script(db: AsyncSession, script: UiTestScript, data: dict) -> UiTestScript:
    steps_data = data.pop("steps", None)
    for key, value in data.items():
        setattr(script, key, value)
    if steps_data is not None:
        await db.execute(
            delete(UiScriptStep).where(UiScriptStep.script_id == script.id)
        )
        for step_data in steps_data:
            step = UiScriptStep(script_id=script.id, **step_data)
            db.add(step)
    await db.flush()
    return script


async def delete_script(db: AsyncSession, script: UiTestScript) -> None:
    await db.delete(script)
    await db.flush()


async def get_script_count_by_project(db: AsyncSession, project_id: int) -> int:
    result = await db.execute(
        select(func.count(UiTestScript.id)).where(UiTestScript.project_id == project_id)
    )
    return result.scalar() or 0


async def batch_create_steps(db: AsyncSession, script_id: int, steps: list[dict]) -> list[UiScriptStep]:
    """批量创建脚本步骤"""
    created = []
    for step_data in steps:
        step = UiScriptStep(script_id=script_id, **step_data)
        db.add(step)
        created.append(step)
    await db.flush()
    return created


# ==============================
# 用例 CRUD
# ==============================


async def create_test_case(db: AsyncSession, data: dict) -> UiTestCase:
    case = UiTestCase(**data)
    db.add(case)
    await db.flush()
    return case


async def get_test_case(db: AsyncSession, case_id: int) -> UiTestCase | None:
    return await db.get(UiTestCase, case_id)


async def get_test_cases(
    db: AsyncSession, project_id: int, priority: str | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[UiTestCase], int]:
    query = select(UiTestCase).where(UiTestCase.project_id == project_id)
    if priority:
        query = query.where(UiTestCase.priority == priority)
    if status:
        query = query.where(UiTestCase.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiTestCase.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_test_case(db: AsyncSession, case: UiTestCase, data: dict) -> UiTestCase:
    for key, value in data.items():
        setattr(case, key, value)
    await db.flush()
    return case


async def delete_test_case(db: AsyncSession, case: UiTestCase) -> None:
    await db.delete(case)
    await db.flush()


async def copy_test_case(db: AsyncSession, case_id: int) -> UiTestCase | None:
    """复制测试用例"""
    case = await db.get(UiTestCase, case_id)
    if not case:
        return None
    new_case = UiTestCase(
        project_id=case.project_id,
        name=f"{case.name} (副本)",
        script_id=case.script_id,
        priority=case.priority,
        status="draft",
        test_data=case.test_data,
    )
    db.add(new_case)
    await db.flush()
    return new_case


# ==============================
# 套件 CRUD
# ==============================


async def create_test_suite(db: AsyncSession, data: dict) -> UiTestSuite:
    case_ids = data.pop("case_ids", [])
    suite = UiTestSuite(**data)
    db.add(suite)
    await db.flush()
    for idx, cid in enumerate(case_ids):
        db.add(UiTestSuiteCase(suite_id=suite.id, test_case_id=cid, order=idx))
    await db.flush()
    return suite


async def get_test_suite(db: AsyncSession, suite_id: int) -> UiTestSuite | None:
    result = await db.execute(
        select(UiTestSuite).where(UiTestSuite.id == suite_id)
        .options(selectinload(UiTestSuite.case_links))
    )
    return result.scalar_one_or_none()


async def get_test_suites(
    db: AsyncSession, project_id: int, skip: int = 0, limit: int = 20,
) -> tuple[list[UiTestSuite], int]:
    query = select(UiTestSuite).where(UiTestSuite.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiTestSuite.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_test_suite(db: AsyncSession, suite: UiTestSuite, data: dict) -> UiTestSuite:
    case_ids = data.pop("case_ids", None)
    for key, value in data.items():
        setattr(suite, key, value)
    if case_ids is not None:
        await db.execute(
            delete(UiTestSuiteCase).where(UiTestSuiteCase.suite_id == suite.id)
        )
        for idx, cid in enumerate(case_ids):
            db.add(UiTestSuiteCase(suite_id=suite.id, test_case_id=cid, order=idx))
    await db.flush()
    return suite


async def delete_test_suite(db: AsyncSession, suite: UiTestSuite) -> None:
    await db.delete(suite)
    await db.flush()


async def add_suite_cases(db: AsyncSession, suite_id: int, case_ids: list[int]) -> None:
    """批量添加用例到套件"""
    result = await db.execute(
        select(UiTestSuiteCase).where(UiTestSuiteCase.suite_id == suite_id)
        .order_by(UiTestSuiteCase.order.desc())
    )
    existing_records = list(result.scalars().all())
    max_order = existing_records[0].order if existing_records else 0

    for idx, case_id in enumerate(case_ids):
        dup = await db.execute(
            select(UiTestSuiteCase).where(
                UiTestSuiteCase.suite_id == suite_id,
                UiTestSuiteCase.test_case_id == case_id,
            )
        )
        if dup.scalar_one_or_none():
            continue
        db.add(UiTestSuiteCase(suite_id=suite_id, test_case_id=case_id, order=max_order + idx + 1))
    await db.flush()


async def remove_suite_cases(db: AsyncSession, suite_id: int, case_ids: list[int]) -> None:
    """批量从套件移除用例"""
    await db.execute(
        delete(UiTestSuiteCase).where(
            UiTestSuiteCase.suite_id == suite_id,
            UiTestSuiteCase.test_case_id.in_(case_ids),
        )
    )
    await db.flush()


# ==============================
# 执行 CRUD
# ==============================


async def create_execution(db: AsyncSession, data: dict) -> UiTestExecution:
    execution = UiTestExecution(**data)
    db.add(execution)
    await db.flush()
    return execution


async def get_execution(db: AsyncSession, execution_id: int) -> UiTestExecution | None:
    result = await db.execute(
        select(UiTestExecution).where(UiTestExecution.id == execution_id)
        .options(
            selectinload(UiTestExecution.screenshots),
            selectinload(UiTestExecution.operation_records),
        )
    )
    return result.scalar_one_or_none()


async def get_executions(
    db: AsyncSession, suite_id: int | None = None, project_id: int | None = None,
    status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[UiTestExecution], int]:
    query = select(UiTestExecution)
    if suite_id:
        query = query.where(UiTestExecution.suite_id == suite_id)
    if status:
        query = query.where(UiTestExecution.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiTestExecution.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_execution(db: AsyncSession, execution: UiTestExecution, data: dict) -> UiTestExecution:
    for key, value in data.items():
        setattr(execution, key, value)
    await db.flush()
    return execution


async def delete_execution(db: AsyncSession, execution: UiTestExecution) -> None:
    await db.delete(execution)
    await db.flush()


async def get_today_execution_count(db: AsyncSession) -> int:
    """获取今日执行次数"""
    from datetime import date
    today = date.today()
    result = await db.execute(
        select(func.count(UiTestExecution.id))
        .where(func.date(UiTestExecution.created_at) == today)
    )
    return result.scalar() or 0


async def get_execution_pass_rate(db: AsyncSession) -> float:
    """获取总体通过率"""
    total = await db.execute(select(func.count(UiTestExecution.id)))
    total = total.scalar() or 0
    if total == 0:
        return 0.0
    passed = await db.execute(
        select(func.count(UiTestExecution.id))
        .where(UiTestExecution.result == "passed")
    )
    passed = passed.scalar() or 0
    return round(passed / total * 100, 2)


# ==============================
# 截图 CRUD
# ==============================


async def create_screenshot(db: AsyncSession, data: dict) -> UiScreenshot:
    shot = UiScreenshot(**data)
    db.add(shot)
    await db.flush()
    return shot


# ==============================
# 操作记录 CRUD
# ==============================


async def create_operation_record(db: AsyncSession, data: dict) -> UiOperationRecord:
    record = UiOperationRecord(**data)
    db.add(record)
    await db.flush()
    return record


async def get_screenshots_by_execution(db: AsyncSession, execution_id: int) -> list[UiScreenshot]:
    """获取执行记录的截图列表"""
    result = await db.execute(
        select(UiScreenshot).where(UiScreenshot.execution_id == execution_id)
        .order_by(UiScreenshot.captured_at)
    )
    return list(result.scalars().all())


async def get_operation_records_by_execution(db: AsyncSession, execution_id: int) -> list[UiOperationRecord]:
    """获取执行记录的操作记录列表"""
    result = await db.execute(
        select(UiOperationRecord).where(UiOperationRecord.execution_id == execution_id)
        .order_by(UiOperationRecord.created_at)
    )
    return list(result.scalars().all())


# ==============================
# 定时任务 CRUD
# ==============================


async def create_scheduled_task(db: AsyncSession, data: dict) -> UiScheduledTask:
    task = UiScheduledTask(**data)
    db.add(task)
    await db.flush()
    return task


async def get_scheduled_task(db: AsyncSession, task_id: int) -> UiScheduledTask | None:
    return await db.get(UiScheduledTask, task_id)


async def get_scheduled_tasks(
    db: AsyncSession, status: str | None = None, skip: int = 0, limit: int = 20,
) -> tuple[list[UiScheduledTask], int]:
    query = select(UiScheduledTask)
    if status:
        query = query.where(UiScheduledTask.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(UiScheduledTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_scheduled_task(db: AsyncSession, task: UiScheduledTask, data: dict) -> UiScheduledTask:
    for key, value in data.items():
        setattr(task, key, value)
    await db.flush()
    return task


async def delete_scheduled_task(db: AsyncSession, task: UiScheduledTask) -> None:
    await db.delete(task)
    await db.flush()


# ==============================
# 通知 CRUD
# ==============================


async def create_notification_config(db: AsyncSession, data: dict) -> UiNotificationConfig:
    config = UiNotificationConfig(**data)
    db.add(config)
    await db.flush()
    return config


async def get_notification_config(db: AsyncSession, config_id: int) -> UiNotificationConfig | None:
    return await db.get(UiNotificationConfig, config_id)


async def get_notification_configs(db: AsyncSession) -> list[UiNotificationConfig]:
    result = await db.execute(select(UiNotificationConfig))
    return list(result.scalars().all())


async def update_notification_config(db: AsyncSession, config: UiNotificationConfig, data: dict) -> UiNotificationConfig:
    for key, value in data.items():
        setattr(config, key, value)
    await db.flush()
    return config


async def delete_notification_config(db: AsyncSession, config: UiNotificationConfig) -> None:
    await db.delete(config)
    await db.flush()


async def create_notification_log(db: AsyncSession, data: dict) -> UiNotificationLog:
    log = UiNotificationLog(**data)
    db.add(log)
    await db.flush()
    return log


async def get_notification_log(db: AsyncSession, log_id: int) -> UiNotificationLog | None:
    return await db.get(UiNotificationLog, log_id)


async def get_notification_logs(
    db: AsyncSession, skip: int = 0, limit: int = 20,
) -> tuple[list[UiNotificationLog], int]:
    total = (await db.execute(select(func.count(UiNotificationLog.id)))).scalar() or 0
    query = select(UiNotificationLog).order_by(UiNotificationLog.sent_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all()), total


# ==============================
# 环境 CRUD
# ==============================


async def create_environment(db: AsyncSession, data: dict) -> UiEnvironment:
    env = UiEnvironment(**data)
    db.add(env)
    await db.flush()
    return env


async def get_environment(db: AsyncSession, env_id: int) -> UiEnvironment | None:
    return await db.get(UiEnvironment, env_id)


async def get_environments(
    db: AsyncSession, project_id: int | None = None,
) -> list[UiEnvironment]:
    query = select(UiEnvironment)
    if project_id:
        query = query.where(UiEnvironment.project_id == project_id)
    query = query.order_by(UiEnvironment.name)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_environment(db: AsyncSession, env: UiEnvironment, data: dict) -> UiEnvironment:
    for key, value in data.items():
        setattr(env, key, value)
    await db.flush()
    return env


async def delete_environment(db: AsyncSession, env: UiEnvironment) -> None:
    await db.delete(env)
    await db.flush()


# ==============================
# 仪表盘统计
# ==============================


async def get_ui_dashboard_stats(db: AsyncSession) -> dict:
    """获取 UI 自动化仪表盘统计数据"""
    project_count = (await db.execute(select(func.count(UiProject.id)))).scalar() or 0
    element_count = (await db.execute(select(func.count(UiElement.id)))).scalar() or 0
    script_count = (await db.execute(select(func.count(UiTestScript.id)))).scalar() or 0
    today_executions = await get_today_execution_count(db)
    pass_rate = await get_execution_pass_rate(db)

    return {
        "project_count": project_count,
        "element_count": element_count,
        "script_count": script_count,
        "today_executions": today_executions,
        "pass_rate": pass_rate,
    }
