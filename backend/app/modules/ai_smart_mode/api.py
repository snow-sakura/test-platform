"""AI 智能模式 - API 路由"""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    create_ai_case, create_execution_record, delete_ai_case,
    delete_execution_record, delete_execution_records_batch,
    get_ai_case, get_ai_cases, get_execution_pass_rate,
    get_execution_record, get_execution_records, get_today_execution_count,
    update_ai_case, update_execution_record,
)
from .models import AICase, AIExecutionRecord
from .schemas import (
    AdhocExecuteRequest, AICaseCreate, AICaseResponse, AICaseUpdate,
    AIExecutionRecordCreate, AIExecutionRecordResponse, AISmartStats,
    ExecutionReport,
)
from .services import (
    STOP_SIGNALS, run_full_process_sync, should_stop,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-smart",
    dependencies=[Depends(get_current_user)],
    tags=["ai-smart"],
)

# 后台执行线程映射
_execution_threads: dict[int, threading.Thread] = {}


def _update_execution_callback(execution_id: int, data: dict):
    """执行状态回调：更新 DB 中的执行记录"""
    try:
        import asyncio
        from app.database import async_session

        async def _update():
            async with async_session() as db:
                record = await get_execution_record(db, execution_id)
                if record:
                    await update_execution_record(db, record, data)

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_update())
        finally:
            loop.close()
    except Exception as e:
        logger.warning(f"回调更新执行记录失败: {e}")


# ====== 仪表盘 ======

@router.get("/dashboard/stats", response_model=AISmartStats)
async def dashboard_stats(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.view"))):
    """获取 AI 智能模式统计"""
    cases, _ = await get_ai_cases(db)
    records, _ = await get_execution_records(db)
    today_count = await get_today_execution_count(db)
    pass_rate = await get_execution_pass_rate(db)

    running_count = sum(1 for eid in _execution_threads if _execution_threads[eid].is_alive())

    return AISmartStats(
        case_count=len(cases),
        execution_count=len(records),
        today_executions=today_count,
        pass_rate=pass_rate,
        running_count=running_count,
    )


# ====== AI 用例 ======

@router.get("/cases", response_model=dict)
async def list_cases(
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_smart.view")),
):
    """获取 AI 用例列表"""
    skip = (page - 1) * page_size
    cases, total = await get_ai_cases(db, project_id, status, skip, page_size)
    return {
        "count": total,
        "results": [AICaseResponse.model_validate(c) for c in cases],
    }


@router.get("/cases/{case_id}", response_model=AICaseResponse)
async def retrieve_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.view"))):
    """获取 AI 用例详情"""
    case = await get_ai_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    return AICaseResponse.model_validate(case)


@router.post("/cases", response_model=AICaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(data: AICaseCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.create"))):
    """创建 AI 用例"""
    case = await create_ai_case(db, data.model_dump())
    return AICaseResponse.model_validate(case)


@router.put("/cases/{case_id}", response_model=AICaseResponse)
async def update_case(
    case_id: int, data: AICaseUpdate, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_smart.edit")),
):
    """更新 AI 用例"""
    case = await get_ai_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    case = await update_ai_case(db, case, data.model_dump(exclude_unset=True))
    return AICaseResponse.model_validate(case)


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.delete"))):
    """删除 AI 用例"""
    case = await get_ai_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")
    await delete_ai_case(db, case)


# ====== 执行记录 ======

@router.get("/executions", response_model=dict)
async def list_executions(
    ai_case_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_smart.view")),
):
    """获取执行记录列表"""
    skip = (page - 1) * page_size
    records, total = await get_execution_records(db, ai_case_id, status, skip, page_size)
    return {
        "count": total,
        "results": [AIExecutionRecordResponse.model_validate(r) for r in records],
    }


@router.get("/executions/{record_id}", response_model=AIExecutionRecordResponse)
async def retrieve_execution(record_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.view"))):
    """获取执行记录详情"""
    record = await get_execution_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return AIExecutionRecordResponse.model_validate(record)


@router.delete("/executions/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_execution(record_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.delete"))):
    """删除执行记录"""
    record = await get_execution_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    await delete_execution_record(db, record)


@router.post("/executions/batch-delete", status_code=status.HTTP_204_NO_CONTENT)
async def batch_delete_executions(
    ids: list[int], db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_smart.delete")),
):
    """批量删除执行记录"""
    await delete_execution_records_batch(db, ids)


# ====== 执行 AI 用例 ======

@router.post("/cases/{case_id}/run")
async def run_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.generate"))):
    """执行 AI 用例（后台线程）"""
    case = await get_ai_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="用例不存在")

    # 创建执行记录
    record_data = {
        "ai_case_id": case_id,
        "project_id": case.project_id,
        "task_description": case.task_description,
        "execution_mode": case.execution_mode,
        "enable_gif": case.enable_gif,
        "status": "pending",
    }
    record = await create_execution_record(db, record_data)

    # 更新用例状态
    await update_ai_case(db, case, {"status": "running"})
    # 更新执行记录状态
    record = await update_execution_record(db, record, {
        "status": "running",
        "started_at": datetime.now(),
    })

    # 启动后台线程
    exec_id = record.id
    thread = threading.Thread(
        target=_run_execution_thread,
        args=(exec_id, case.task_description or "", case.target_url or None,
              case.execution_mode, case.enable_gif),
        daemon=True,
    )
    _execution_threads[exec_id] = thread
    thread.start()

    return {"execution_id": exec_id, "status": "running"}


@router.post("/executions/run-adhoc")
async def run_adhoc(data: AdhocExecuteRequest, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.generate"))):
    """临时执行（不绑定用例）"""
    record_data = {
        "task_description": data.task_description,
        "execution_mode": data.execution_mode,
        "enable_gif": data.enable_gif,
        "status": "pending",
    }
    record = await create_execution_record(db, record_data)
    record = await update_execution_record(db, record, {
        "status": "running",
        "started_at": datetime.now(),
    })

    exec_id = record.id
    thread = threading.Thread(
        target=_run_execution_thread,
        args=(exec_id, data.task_description, data.target_url,
              data.execution_mode, data.enable_gif),
        daemon=True,
    )
    _execution_threads[exec_id] = thread
    thread.start()

    return {"execution_id": exec_id, "status": "running"}


@router.post("/executions/{record_id}/stop")
async def stop_execution(record_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.generate"))):
    """停止执行中的任务"""
    record = await get_execution_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    # 设置停止信号
    STOP_SIGNALS[record_id] = True

    # 更新状态
    await update_execution_record(db, record, {
        "status": "cancelled",
        "completed_at": datetime.now(),
    })

    # 如果有关联的 AI 用例，更新其状态
    if record.ai_case_id:
        case = await get_ai_case(db, record.ai_case_id)
        if case:
            await update_ai_case(db, case, {"status": "draft"})

    return {"message": "任务已停止"}


@router.get("/executions/{record_id}/report", response_model=ExecutionReport)
async def get_execution_report(record_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_smart.view"))):
    """获取执行报告"""
    record = await get_execution_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    # 计算耗时
    duration = 0.0
    if record.started_at and record.completed_at:
        duration = (record.completed_at - record.started_at).total_seconds()

    # 解析执行日志
    log_data = []
    if record.execution_log:
        try:
            log_data = json.loads(record.execution_log) if isinstance(record.execution_log, str) else record.execution_log
        except (json.JSONDecodeError, TypeError):
            log_data = []

    # 获取用例名称
    case_name = ""
    if record.ai_case:
        case_name = record.ai_case.name

    return ExecutionReport(
        record_id=record.id,
        case_name=case_name,
        task_description=record.task_description or "",
        status=record.status,
        summary=record.summary,
        steps_completed=record.steps_completed,
        planned_tasks=record.planned_tasks,
        execution_log=log_data,
        gif_recording=record.gif_recording,
        started_at=record.started_at.strftime("%Y-%m-%d %H:%M:%S") if record.started_at else None,
        completed_at=record.completed_at.strftime("%Y-%m-%d %H:%M:%S") if record.completed_at else None,
        duration_seconds=round(duration, 1),
    )


@router.get("/executions/{record_id}/export-pdf")
async def export_execution_pdf(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_smart.view")),
):
    """导出 AI 执行记录为 PDF 报告"""
    from .services import generate_pdf_report

    record = await get_execution_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    # 组装数据
    record_data = {
        "name": record.ai_case.name if record.ai_case else "AI 执行",
        "status": record.status,
        "started_at": str(record.started_at or ""),
        "completed_at": str(record.completed_at or ""),
        "task_description": record.task_description or "",
        "summary": record.summary or "",
        "planned_tasks": record.planned_tasks or [],
        "execution_log": record.execution_log or "",
    }

    from fastapi.responses import Response
    try:
        pdf_bytes = generate_pdf_report(record_data)
    except ImportError:
        # fallback: plain text report
        text = f"AI Execution Report #{record_id}\n\n"
        for k, v in record_data.items():
            text += f"{k}: {v}\n\n"
        pdf_bytes = text.encode("utf-8")
        return Response(
            content=pdf_bytes, media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=execution_{record_id}.txt"},
        )

    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=execution_{record_id}.pdf"},
    )


def _run_execution_thread(
    execution_id: int,
    task_description: str,
    target_url: str | None,
    execution_mode: str,
    enable_gif: bool,
):
    """后台线程：执行 AI 任务并更新执行记录"""
    try:
        import asyncio
        from app.database import async_session

        def update_db(data: dict):
            async def _up():
                async with async_session() as db:
                    record = await get_execution_record(db, execution_id)
                    if record:
                        await update_execution_record(db, record, data)
            try:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(_up())
                loop.close()
            except Exception:
                pass

        # 执行 AI 任务
        result = run_full_process_sync(
            execution_id=execution_id,
            task_description=task_description,
            target_url=target_url,
            execution_mode=execution_mode,
            enable_gif=enable_gif,
            update_callback=lambda eid, data: update_db(data),
        )

        # 更新最终结果
        update_data = {
            "status": result.get("status", "failed"),
            "summary": result.get("summary", ""),
            "steps_completed": result.get("steps_completed", 0),
            "planned_tasks": result.get("planned_tasks", []),
            "execution_log": result.get("execution_log", []),
            "gif_recording": result.get("gif_recording"),
            "completed_at": datetime.now(),
        }
        update_db(update_data)

        # 更新关联用例状态
        async def _update_case():
            async with async_session() as db:
                record = await get_execution_record(db, execution_id)
                if record and record.ai_case_id:
                    case = await get_ai_case(db, record.ai_case_id)
                    if case:
                        new_status = "completed" if result.get("status") == "completed" else "draft"
                        await update_ai_case(db, case, {"status": new_status})
        try:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(_update_case())
            loop.close()
        except Exception:
            pass

    except Exception as e:
        logger.exception(f"后台执行线程异常: {e}")
        async def _on_error():
            async with async_session() as db:
                record = await get_execution_record(db, execution_id)
                if record:
                    await update_execution_record(db, record, {
                        "status": "failed",
                        "summary": f"执行异常: {e}",
                        "completed_at": datetime.now(),
                    })
        try:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(_on_error())
            loop.close()
        except Exception:
            pass
    finally:
        _execution_threads.pop(execution_id, None)
        STOP_SIGNALS.pop(execution_id, None)
