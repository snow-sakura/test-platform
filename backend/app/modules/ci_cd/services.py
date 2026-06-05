"""CI/CD 集成 - 核心服务

Webhook 解析 / 管道执行 / 结果通知
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import async_session

from . import crud
from .internal_api import (
    execute_api_testing_suite,
    execute_app_auto_suite,
    execute_test_plan,
    execute_ui_auto_suite,
)

logger = logging.getLogger(__name__)


# ==================== Webhook 解析 ====================

def parse_gitlab_webhook(payload: dict) -> dict:
    """解析 GitLab Webhook 事件，提取管道元信息"""
    event_type = payload.get("object_kind") or payload.get("event_type", "push")
    result = {
        "event_type": event_type,
        "external_pipeline_id": str(payload.get("project_id", "")) if payload.get("object_kind") == "push" else None,
        "external_project": payload.get("project", {}).get("path_with_namespace"),
        "external_ref": None,
        "commit_sha": None,
        "commit_message": None,
        "author": None,
    }

    if "ref" in payload:
        result["external_ref"] = payload["ref"].replace("refs/heads/", "")
    if "checkout_sha" in payload:
        result["commit_sha"] = payload["checkout_sha"]
    if "commits" in payload and payload["commits"]:
        result["commit_sha"] = result["commit_sha"] or payload["commits"][0].get("id")
        result["commit_message"] = payload["commits"][0].get("message", "").split("\n")[0]
        result["author"] = payload["commits"][0].get("author", {}).get("name")
    if "user_username" in payload:
        result["author"] = result["author"] or payload["user_username"]

    return result


def parse_github_webhook(headers: dict, payload: dict) -> dict:
    """解析 GitHub Webhook 事件，提取管道元信息"""
    event_type = (headers or {}).get("x-github-event", "push")
    result = {
        "event_type": event_type,
        "external_pipeline_id": payload.get("installation", {}).get("id"),
        "external_project": None,
        "external_ref": None,
        "commit_sha": None,
        "commit_message": None,
        "author": None,
    }

    if "repository" in payload:
        repo = payload["repository"]
        result["external_project"] = repo.get("full_name")

    if event_type == "push":
        if "ref" in payload:
            result["external_ref"] = payload["ref"].replace("refs/heads/", "")
        head_commit = payload.get("head_commit") or {}
        result["commit_sha"] = head_commit.get("id") or payload.get("after")
        result["commit_message"] = (head_commit.get("message") or "").split("\n")[0]
        result["author"] = head_commit.get("author", {}).get("name")
    elif event_type in ("pull_request", "pull_request_target"):
        pr = payload.get("pull_request", {})
        head = pr.get("head", {})
        result["external_ref"] = head.get("ref")
        result["commit_sha"] = head.get("sha")
        result["commit_message"] = pr.get("title")
        result["author"] = pr.get("user", {}).get("login")

    return result


def parse_jenkins_webhook(payload: dict) -> dict:
    """解析 Jenkins Webhook 事件

    Jenkins 通用 webhook 插件会发送 JSON 格式的构建信息。
    """
    event_type = payload.get("event_type", "build")
    result = {
        "event_type": event_type,
        "external_pipeline_id": str(payload.get("build_number", "")),
        "external_project": payload.get("job_name") or payload.get("name"),
        "external_ref": payload.get("branch") or payload.get("ref"),
        "commit_sha": payload.get("sha") or payload.get("commit"),
        "commit_message": (payload.get("commit_message") or "").split("\n")[0],
        "author": payload.get("author") or payload.get("user"),
    }

    return result


# ==================== 管道执行引擎 ====================

async def execute_pipeline(
    pipeline_id: int,
    db_session_factory: async_sessionmaker[AsyncSession] | None = None,
):
    """后台执行管道：按 step_order 依次执行每个步骤

    使用独立的异步会话，避免与请求会话冲突。
    """
    factory = db_session_factory or async_session

    async with factory() as db:
        try:
            pipeline = await crud.get_pipeline(db, pipeline_id)
            if not pipeline:
                logger.error("Pipeline %s 不存在", pipeline_id)
                return

            # 更新管道状态为 running
            await crud.update_pipeline(db, pipeline_id, {
                "status": "running",
                "started_at": datetime.now(timezone.utc),
            })

            steps = await crud.get_pipeline_steps(db, pipeline_id)
            passed = 0
            failed = 0

            for step in steps:
                step_start = datetime.now(timezone.utc)
                await crud.update_pipeline_step(db, step.id, {
                    "status": "running",
                    "started_at": step_start,
                })

                try:
                    result = await _execute_step(db, step.module_type, step.module_config or {})
                    elapsed = int((datetime.now(timezone.utc) - step_start).total_seconds() * 1000)

                    await crud.update_pipeline_step(db, step.id, {
                        "status": "completed",
                        "result": result,
                        "duration_ms": elapsed,
                        "completed_at": datetime.now(timezone.utc),
                    })
                    passed += 1
                except Exception as e:
                    elapsed = int((datetime.now(timezone.utc) - step_start).total_seconds() * 1000)
                    logger.exception("Pipeline step %s 执行失败: %s", step.id, e)

                    await crud.update_pipeline_step(db, step.id, {
                        "status": "failed",
                        "error_message": str(e)[:500],
                        "duration_ms": elapsed,
                        "completed_at": datetime.now(timezone.utc),
                    })
                    failed += 1

            # 更新管道汇总
            now = datetime.now(timezone.utc)
            total_duration = int((now - pipeline.started_at.replace(tzinfo=timezone.utc)).total_seconds() * 1000) if pipeline.started_at else 0
            pipeline_status = "completed" if failed == 0 else "failed"

            await crud.update_pipeline(db, pipeline_id, {
                "status": pipeline_status,
                "passed_steps": passed,
                "failed_steps": failed,
                "completed_at": now,
                "duration_ms": total_duration,
            })

            # 发送结果通知
            pipeline = await crud.get_pipeline(db, pipeline_id)
            if pipeline:
                await notify_ci_result(db, pipeline, steps)

        except Exception as e:
            logger.exception("Pipeline %s 执行异常: %s", pipeline_id, e)
            await crud.update_pipeline(db, pipeline_id, {
                "status": "failed",
                "error_message": str(e)[:500],
                "completed_at": datetime.now(timezone.utc),
            })


async def _execute_step(db: AsyncSession, module_type: str, config: dict) -> dict:
    """执行单个步骤，根据 module_type 路由到对应的内部执行函数"""
    if module_type == "api_testing":
        return await execute_api_testing_suite(
            suite_id=config.get("suite_id"),
            environment_id=config.get("environment_id"),
            db=db,
        )
    elif module_type == "ui_auto":
        return await execute_ui_auto_suite(
            suite_id=config.get("suite_id"),
            environment_id=config.get("environment_id"),
            db=db,
        )
    elif module_type == "app_auto":
        return await execute_app_auto_suite(
            suite_id=config.get("suite_id"),
            db=db,
        )
    elif module_type == "test_mgmt":
        run_id = await execute_test_plan(
            plan_id=config.get("plan_id"),
            db=db,
        )
        return {"run_id": run_id, "status": "created"}
    else:
        raise ValueError(f"不支持的模块类型: {module_type}")


# ==================== 结果通知 ====================

async def notify_ci_result(
    db: AsyncSession,
    pipeline: Any,
    steps: list[Any],
):
    """通知 CI 系统测试结果

    当前通过日志记录，未来可扩展为通过 commit status API 回写。
    """
    summary = {
        "pipeline_id": pipeline.id,
        "ci_type": pipeline.ci_type,
        "status": pipeline.status,
        "total_steps": pipeline.total_steps,
        "passed_steps": pipeline.passed_steps,
        "failed_steps": pipeline.failed_steps,
    }

    logger.info("CI pipeline %s completed: %s", pipeline.id, json.dumps(summary))

    # 未来可扩展：
    # if pipeline.ci_type == "gitlab":
    #     await _notify_gitlab_commit_status(pipeline)
    # elif pipeline.ci_type == "github":
    #     await _notify_github_commit_status(pipeline)
