"""性能测试模块 - API 路由"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    create_execution, create_jmx_file, create_scene, delete_jmx_file,
    delete_scene, get_execution, get_executions, get_jmx_file, get_jmx_files,
    get_report, get_reports, get_scene, get_scenes, update_execution,
    update_scene,
)
from .schemas import (
    ExecutionResponse, JMXFileResponse, ReportResponse,
    SceneCreate, SceneResponse, SceneUpdate,
)
from .services import PERFORMANCE_UPLOAD_DIR, run_httpx_load_test, run_jmeter_test

router = APIRouter(
    prefix="/performance",
    dependencies=[Depends(get_current_user)],
    tags=["performance"],
)


# ==============================
# 场景 CRUD
# ==============================


@router.get("/scenes", response_model=dict)
async def list_scenes(
    project_id: int = Query(...),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取压测场景列表"""
    skip = (page - 1) * page_size
    scenes, total = await get_scenes(db, project_id, status, skip, page_size, search)
    return {
        "count": total,
        "results": [SceneResponse.model_validate(s) for s in scenes],
    }


@router.get("/scenes/{scene_id}", response_model=SceneResponse)
async def retrieve_scene(
    scene_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取压测场景详情"""
    scene = await get_scene(db, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")
    return SceneResponse.model_validate(scene)


@router.post("/scenes", response_model=SceneResponse, status_code=status.HTTP_201_CREATED)
async def create_new_scene(
    project_id: int = Query(...),
    data: SceneCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("test_mgmt.create")),
):
    """创建压测场景"""
    scene = await create_scene(db, project_id, current_user.id, data.model_dump())
    return SceneResponse.model_validate(scene)


@router.put("/scenes/{scene_id}", response_model=SceneResponse)
async def update_existing_scene(
    scene_id: int,
    data: SceneUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.edit")),
):
    """更新压测场景"""
    scene = await get_scene(db, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")
    scene = await update_scene(db, scene, data.model_dump(exclude_unset=True, mode="json"))
    return SceneResponse.model_validate(scene)


@router.delete("/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_scene(
    scene_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.delete")),
):
    """删除压测场景"""
    scene = await get_scene(db, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")
    await delete_scene(db, scene)


# ==============================
# JMX 文件管理
# ==============================


@router.post("/jmx-files/upload", response_model=JMXFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_jmx_file(
    project_id: int = Query(...),
    file: UploadFile = File(...),
    description: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("test_mgmt.create")),
):
    """上传 JMeter JMX 文件"""
    if not file.filename or not file.filename.endswith(".jmx"):
        raise HTTPException(status_code=400, detail="仅支持 .jmx 文件")

    upload_dir = PERFORMANCE_UPLOAD_DIR / "jmx"
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix
    saved_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / saved_name

    content = await file.read()
    file_path.write_bytes(content)

    jmx = await create_jmx_file(
        db, project_id, current_user.id,
        name=file.filename, file_path=str(file_path),
        file_size=len(content), description=description,
    )
    return JMXFileResponse.model_validate(jmx)


@router.get("/jmx-files", response_model=dict)
async def list_jmx_files(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取 JMX 文件列表"""
    files = await get_jmx_files(db, project_id)
    return {"results": [JMXFileResponse.model_validate(f) for f in files]}


@router.delete("/jmx-files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jmx_file_endpoint(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.delete")),
):
    """删除 JMX 文件"""
    jmx = await get_jmx_file(db, file_id)
    if not jmx:
        raise HTTPException(status_code=404, detail="文件不存在")
    # 删除物理文件
    f_path = Path(jmx.file_path)
    if f_path.exists():
        f_path.unlink()
    await delete_jmx_file(db, jmx)


# ==============================
# 执行管理
# ==============================


@router.post("/scenes/{scene_id}/execute")
async def execute_scene(
    scene_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("test_mgmt.execute")),
):
    """执行压测场景（返回执行 ID，SSE 推送进度）"""
    scene = await get_scene(db, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")

    config = scene.config or {}
    execution = await create_execution(
        db, scene_id, current_user.id,
        {"config_snapshot": config},
    )
    await db.commit()

    return {
        "execution_id": execution.id,
        "status": execution.status,
        "scene_type": scene.scenario_type,
    }


@router.get("/executions/{execution_id}/stream")
async def execution_stream(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(require_permission("test_mgmt.view")),
):
    """SSE 推送执行进度"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行不存在")

    scene = await get_scene(db, execution.scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="场景不存在")

    import asyncio

    sse_queue: asyncio.Queue = asyncio.Queue()

    async def _run_and_stream():
        try:
            if scene.scenario_type == "jmeter":
                jmx_path = (scene.config or {}).get("jmx_file_path", "")
                await run_jmeter_test(execution_id, jmx_path, scene.config or {}, sse_queue)
            else:
                await run_httpx_load_test(execution_id, scene.config or {}, sse_queue)
        except Exception as e:
            await _sse_put(sse_queue, {"type": "error", "data": str(e)})

    async def event_generator():
        # 启动后台任务
        task = asyncio.create_task(_run_and_stream())

        # 先发初始事件
        yield f"data: {json.dumps({'type': 'start', 'data': {'execution_id': execution_id}})}\n\n"

        while True:
            try:
                data = await asyncio.wait_for(sse_queue.get(), timeout=2)
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("type") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # 检查任务是否结束
                if task.done() and sse_queue.empty():
                    break
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"

        await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/executions", response_model=dict)
async def list_executions(
    scene_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取执行记录列表"""
    skip = (page - 1) * page_size
    executions, total = await get_executions(db, scene_id, skip, page_size)
    return {
        "count": total,
        "results": [ExecutionResponse.model_validate(e) for e in executions],
    }


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def retrieve_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取执行详情"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行不存在")
    return ExecutionResponse.model_validate(execution)


# ==============================
# 报告管理
# ==============================


@router.get("/reports", response_model=dict)
async def list_reports(
    execution_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取压测报告列表"""
    skip = (page - 1) * page_size
    reports, total = await get_reports(db, execution_id, skip, page_size)
    return {
        "count": total,
        "results": [ReportResponse.model_validate(r) for r in reports],
    }


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def retrieve_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("test_mgmt.view")),
):
    """获取压测报告详情"""
    report = await get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return ReportResponse.model_validate(report)


# ==============================
# 工具函数
# ==============================


async def _sse_put(queue: asyncio.Queue, data: dict):
    await queue.put(data)
