"""CI/CD 集成 - 内部测试执行调用

直接调用各模块的执行逻辑，避免 HTTP 回环请求。
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def execute_api_testing_suite(
    suite_id: int,
    environment_id: int | None,
    db: AsyncSession,
) -> dict:
    """内部执行 API 测试套件

    复用 app/modules/api_testing 的服务层逻辑。
    """
    try:
        from app.modules.api_testing.services import run_suite_execution

        result = await run_suite_execution(db, suite_id, environment_id)
        return _summarize_api_results(result)
    except ImportError as e:
        raise RuntimeError(f"api_testing 模块不可用: {e}")
    except Exception as e:
        logger.exception("API testing suite %s 执行失败", suite_id)
        raise RuntimeError(f"API 测试执行失败: {e}")


async def execute_ui_auto_suite(
    suite_id: int,
    environment_id: int | None,
    db: AsyncSession,
) -> dict:
    """内部执行 UI 自动化测试套件"""
    try:
        from app.modules.ui_automation.services import execute_suite

        result = await execute_suite(db, suite_id, environment_id)
        return _summarize_ui_results(result)
    except ImportError as e:
        raise RuntimeError(f"ui_automation 模块不可用: {e}")
    except Exception as e:
        logger.exception("UI automation suite %s 执行失败", suite_id)
        raise RuntimeError(f"UI 自动化执行失败: {e}")


async def execute_app_auto_suite(
    suite_id: int,
    db: AsyncSession,
) -> dict:
    """内部执行 APP 自动化测试套件"""
    try:
        from app.modules.app_automation.services import execute_suite

        result = await execute_suite(db, suite_id)
        return _summarize_app_results(result)
    except ImportError as e:
        raise RuntimeError(f"app_automation 模块不可用: {e}")
    except Exception as e:
        logger.exception("APP automation suite %s 执行失败", suite_id)
        raise RuntimeError(f"APP 自动化执行失败: {e}")


async def execute_test_plan(plan_id: int, db: AsyncSession) -> int:
    """内部执行测试计划，返回 run_id"""
    try:
        from app.modules.test_management.crud import create_run, get_plan

        plan = await get_plan(db, plan_id)
        if not plan:
            raise ValueError(f"测试计划 {plan_id} 不存在")

        # 获取计划关联的用例 ID
        from app.modules.test_management.models import TestManagementPlanCase
        result = await db.execute(
            select(TestManagementPlanCase.case_id)
            .where(TestManagementPlanCase.plan_id == plan_id),
        )
        case_ids = list(result.scalars().all())

        if not case_ids:
            raise ValueError(f"测试计划 {plan_id} 没有关联用例")

        run = await create_run(db, {
            "plan_id": plan_id,
            "name": f"CI 触发执行 - {plan.name}",
            "status": "pending",
            "case_ids": case_ids,
        })
        return run.id
    except ImportError as e:
        raise RuntimeError(f"test_management 模块不可用: {e}")


# ==================== 结果汇总 ====================

def _summarize_api_results(result: Any) -> dict:
    """汇总 API 测试结果"""
    if isinstance(result, dict):
        return {
            "total": result.get("total", 0),
            "passed": result.get("passed", 0),
            "failed": result.get("failed", 0),
            "duration_ms": result.get("duration_ms", 0),
        }
    return {"total": 0, "passed": 0, "failed": 0}


def _summarize_ui_results(result: Any) -> dict:
    """汇总 UI 测试结果"""
    if isinstance(result, dict):
        return {
            "total": result.get("total", 0),
            "passed": result.get("passed", 0),
            "failed": result.get("failed", 0),
            "duration_ms": result.get("duration_ms", 0),
        }
    return {"total": 0, "passed": 0, "failed": 0}


def _summarize_app_results(result: Any) -> dict:
    """汇总 APP 测试结果"""
    if isinstance(result, dict):
        return {
            "total": result.get("total", 0),
            "passed": result.get("passed", 0),
            "failed": result.get("failed", 0),
            "duration_ms": result.get("duration_ms", 0),
        }
    return {"total": 0, "passed": 0, "failed": 0}
