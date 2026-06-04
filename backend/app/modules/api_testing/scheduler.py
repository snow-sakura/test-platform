"""接口测试定时任务调度器

在应用启动时从数据库加载所有 active 定时任务，
注册到 APScheduler 中执行。
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.scheduler import add_cron_job, add_interval_job, remove_job
from app.database import async_session

from .models import ApiScheduledTask

logger = logging.getLogger(__name__)


def _make_job_id(task_id: int) -> str:
    """生成 APScheduler 作业 ID"""
    return f"api_scheduled_task_{task_id}"


async def execute_scheduled_task(task_id: int) -> None:
    """执行定时任务（被 APScheduler 回调）"""
    from .crud import get_scheduled_task, update_scheduled_task
    from .services import run_suite_execution

    try:
        async with async_session() as db:
            task = await get_scheduled_task(db, task_id)
            if not task or task.status != "active":
                return

            if task.task_type == "suite" and task.suite_id:
                from .crud import get_test_suite
                suite = await get_test_suite(db, task.suite_id)
                if suite:
                    await run_suite_execution(async_session, suite)

            from datetime import datetime, timezone
            task.last_executed_at = datetime.now(timezone.utc)
            await db.flush()

    except Exception as e:
        logger.error(f"定时任务 {task_id} 执行失败: {e}")


async def load_scheduled_tasks() -> list[ApiScheduledTask]:
    """应用启动时从 DB 加载所有 active 定时任务并注册到 APScheduler"""
    from .crud import get_all_active_tasks

    try:
        async with async_session() as db:
            tasks = await get_all_active_tasks(db)
    except Exception as e:
        logger.warning(f"加载定时任务失败（数据库可能尚未迁移）: {e}")
        return []

    registered = 0
    for task in tasks:
        try:
            if task.trigger_type == "cron":
                add_cron_job(
                    func=execute_scheduled_task,
                    cron_expr=task.cron_expression,
                    job_id=_make_job_id(task.id),
                    args=[task.id],
                )
            elif task.trigger_type == "interval" and task.interval_seconds:
                add_interval_job(
                    func=execute_scheduled_task,
                    seconds=task.interval_seconds,
                    job_id=_make_job_id(task.id),
                    args=[task.id],
                )
            registered += 1
        except Exception as e:
            logger.error(f"注册定时任务 {task.id} 失败: {e}")

    logger.info(f"已加载 {registered}/{len(tasks)} 个定时任务")
    return tasks


async def register_scheduled_task(task_id: int) -> bool:
    """注册单个定时任务（创建或恢复时调用）"""
    from .crud import get_scheduled_task

    try:
        async with async_session() as db:
            task = await get_scheduled_task(db, task_id)
            if not task or task.status != "active":
                return False

            if task.trigger_type == "cron":
                add_cron_job(
                    func=execute_scheduled_task,
                    cron_expr=task.cron_expression,
                    job_id=_make_job_id(task.id),
                    args=[task.id],
                )
            elif task.trigger_type == "interval" and task.interval_seconds:
                add_interval_job(
                    func=execute_scheduled_task,
                    seconds=task.interval_seconds,
                    job_id=_make_job_id(task.id),
                    args=[task.id],
                )
            return True
    except Exception as e:
        logger.error(f"注册定时任务 {task_id} 失败: {e}")
        return False


def unregister_scheduled_task(task_id: int) -> None:
    """取消注册定时任务（暂停或删除时调用）"""
    remove_job(_make_job_id(task_id))
