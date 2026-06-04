"""接口测试模块 API 路由

提供接口测试全部功能的后端 API 端点
"""
from __future__ import annotations

import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.modules.auth.dependencies import get_current_user

from .crud import (
    clear_project_histories, create_collection, create_environment,
    create_notification, create_notification_log, create_request,
    create_request_history, create_api_project, create_scheduled_task,
    create_test_suite, deactivate_other_environments, delete_collection,
    delete_environment, delete_histories, delete_notification,
    delete_api_project, delete_request, delete_scheduled_task,
    delete_test_suite, get_all_active_tasks, get_collection,
    get_collections_request_counts, get_dashboard_stats,
    get_environment, get_environments, get_notification,
    get_notification_logs, get_notifications, get_api_project,
    get_api_projects, get_project_collections_all,
    get_project_request_count, get_projects_collection_counts,
    get_projects_request_counts, get_request, get_request_histories,
    get_request_history, get_requests_by_collection, get_requests_by_ids,
    get_scheduled_task, get_scheduled_tasks, get_test_suite,
    get_test_suites, get_today_executions, update_collection,
    update_environment, update_notification, update_api_project,
    update_request, update_scheduled_task, update_test_suite,
)
from .schemas import (
    ApiCollectionCreate, ApiCollectionResponse, ApiCollectionTreeNode,
    ApiCollectionUpdate, ApiEnvironmentCreate, ApiEnvironmentResponse,
    ApiEnvironmentUpdate, ApiNotificationConfigCreate,
    ApiNotificationConfigResponse, ApiNotificationConfigUpdate,
    ApiNotificationLogResponse, ApiProjectCreate, ApiProjectResponse,
    ApiProjectUpdate, ApiRequestCreate, ApiRequestResponse,
    ApiRequestHistoryResponse, ApiRequestUpdate, ApiScheduledTaskCreate,
    ApiScheduledTaskResponse, ApiScheduledTaskUpdate, ApiTestSuiteCreate,
    ApiTestSuiteResponse, ApiTestSuiteUpdate, BatchExecuteRequest,
    DashboardStats, HistoryBatchDelete, HistoryClearRequest,
    RequestExecuteRequest, RequestExecuteResponse,
)
from .services import (
    NotificationSender, RequestExecutor, VariableResolver,
    run_suite_execution,
)

router = APIRouter(
    dependencies=[Depends(get_current_user)],
    tags=["api_testing"],
)


# ====== 仪表盘 ======

@router.get("/api-testing/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats_api(db: AsyncSession = Depends(get_db)):
    """获取仪表盘统计数据"""
    return await get_dashboard_stats(db)


# ====== API 项目 ======

@router.get("/api-testing/projects")
async def list_api_projects(
    search: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取 API 项目分页列表"""
    skip = (page - 1) * page_size
    projects, total = await get_api_projects(db, search, status, skip, page_size)

    # 批量查询集合数和请求数（避免 N+1）
    project_ids = [p.id for p in projects]
    col_counts = await get_projects_collection_counts(db, project_ids) if project_ids else {}
    req_counts = await get_projects_request_counts(db, project_ids) if project_ids else {}
    items = []
    for p in projects:
        item = ApiProjectResponse.model_validate(p)
        item.collection_count = col_counts.get(p.id, 0)
        item.request_count = req_counts.get(p.id, 0)
        items.append(item)

    return {
        "count": total,
        "results": items,
        "next": None,
        "previous": None,
    }


@router.get("/api-testing/projects/{project_id}", response_model=ApiProjectResponse)
async def retrieve_api_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取 API 项目详情"""
    project = await get_api_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="API 项目不存在")

    resp = ApiProjectResponse.model_validate(project)
    cols = await get_project_collections_all(db, project_id)
    resp.collection_count = len(cols)
    resp.request_count = await get_project_request_count(db, project_id)
    return resp


@router.post("/api-testing/projects", response_model=ApiProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_api_project(
    data: ApiProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建 API 项目"""
    project = await create_api_project(db, data.model_dump())
    return ApiProjectResponse.model_validate(project)


@router.put("/api-testing/projects/{project_id}", response_model=ApiProjectResponse)
async def update_existing_api_project(
    project_id: int,
    data: ApiProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新 API 项目"""
    project = await get_api_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="API 项目不存在")

    update_data = data.model_dump(exclude_unset=True)
    project = await update_api_project(db, project, update_data)
    return ApiProjectResponse.model_validate(project)


@router.delete("/api-testing/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_api_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除 API 项目"""
    project = await get_api_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="API 项目不存在")
    await delete_api_project(db, project)


# ====== 集合（树形） ======

@router.get("/api-testing/collections", response_model=list[ApiCollectionTreeNode])
async def list_collections_tree(
    project_id: int = Query(..., description="项目 ID"),
    db: AsyncSession = Depends(get_db),
):
    """获取项目集合树（嵌套结构）"""
    collections = await get_project_collections_all(db, project_id)

    # 批量查询每个集合的请求数（避免 N+1）
    col_ids = [col.id for col in collections]
    col_request_counts = await get_collections_request_counts(db, col_ids) if col_ids else {}

    # 构建树
    def build_tree(parent_id: int | None = None) -> list[dict]:
        nodes = []
        for col in collections:
            if col.parent_id == parent_id:
                node = {
                    "id": col.id,
                    "project_id": col.project_id,
                    "name": col.name,
                    "parent_id": col.parent_id,
                    "sort_order": col.sort_order,
                    "request_count": col_request_counts.get(col.id, 0),
                    "children": build_tree(col.id),
                }
                nodes.append(node)
        return nodes

    return build_tree(None)


@router.post("/api-testing/collections", response_model=ApiCollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_collection(
    data: ApiCollectionCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建集合"""
    col = await create_collection(db, data.model_dump())
    return ApiCollectionResponse.model_validate(col)


@router.put("/api-testing/collections/{collection_id}", response_model=ApiCollectionResponse)
async def update_existing_collection(
    collection_id: int,
    data: ApiCollectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新集合"""
    col = await get_collection(db, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="集合不存在")

    update_data = data.model_dump(exclude_unset=True)
    col = await update_collection(db, col, update_data)
    return ApiCollectionResponse.model_validate(col)


@router.delete("/api-testing/collections/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除集合"""
    col = await get_collection(db, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="集合不存在")
    await delete_collection(db, col)


# ====== 请求管理 ======

@router.get("/api-testing/requests", response_model=list[ApiRequestResponse])
async def list_requests(
    collection_id: int = Query(..., description="集合 ID"),
    search: str | None = None,
    is_favorite: bool | None = None,
    db: AsyncSession = Depends(get_db),
):
    """获取集合下的请求列表"""
    requests = await get_requests_by_collection(db, collection_id, search, is_favorite)
    return [ApiRequestResponse.model_validate(r) for r in requests]


@router.get("/api-testing/requests/{request_id}", response_model=ApiRequestResponse)
async def retrieve_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取请求详情"""
    req = await get_request(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="请求不存在")
    return ApiRequestResponse.model_validate(req)


@router.post("/api-testing/requests", response_model=ApiRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_new_request(
    data: ApiRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建请求"""
    req = await create_request(db, data.model_dump())
    return ApiRequestResponse.model_validate(req)


@router.put("/api-testing/requests/{request_id}", response_model=ApiRequestResponse)
async def update_existing_request(
    request_id: int,
    data: ApiRequestUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新请求"""
    req = await get_request(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="请求不存在")

    update_data = data.model_dump(exclude_unset=True)
    req = await update_request(db, req, update_data)
    return ApiRequestResponse.model_validate(req)


@router.delete("/api-testing/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除请求"""
    req = await get_request(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="请求不存在")
    await delete_request(db, req)


@router.post("/api-testing/requests/{request_id}/execute", response_model=RequestExecuteResponse)
async def execute_single_request(
    request_id: int,
    data: RequestExecuteRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """执行单个请求（核心功能）"""
    req = await get_request(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="请求不存在")

    # 合并请求定义与运行时覆盖
    method = data.method if data and data.method else req.method
    url = data.url if data and data.url else req.url
    headers = data.headers if data and data.headers else (req.headers or {})
    query_params = data.query_params if data and data.query_params else (req.query_params or {})
    body = data.body if data and data.body is not None else (req.body or {})
    body_type = data.body_type if data and data.body_type else (req.body_type or "none")

    # 变量解析
    resolver = None
    if data and data.environment_id:
        env = await get_environment(db, data.environment_id)
        if env and env.variables:
            resolver = VariableResolver(env.variables)

    if resolver:
        url = resolver.resolve(url)
        headers = resolver.resolve_dict(headers)
        query_params = resolver.resolve_dict(query_params)
        body = resolver.resolve_dict(body)

    # 执行
    executor = RequestExecutor()
    status_code, resp_headers, resp_body, elapsed_ms = await executor.execute(
        method=method,
        url=url,
        headers=headers,
        query_params=query_params,
        body=body or None,
        body_type=body_type,
    )

    # 记录历史
    project_id = data.project_id if data and data.project_id else req.collection.project_id if req.collection else 0
    history = await create_request_history(db, {
        "request_id": req.id,
        "project_id": project_id or req.collection.project_id,
        "method": method,
        "url": url,
        "headers": headers,
        "query_params": query_params,
        "body": body,
        "response_status": status_code,
        "response_body": resp_body[:50000] if resp_body else None,
        "response_headers": dict(resp_headers),
        "elapsed_time": elapsed_ms,
    })

    return RequestExecuteResponse(
        status_code=status_code,
        headers=dict(resp_headers),
        body=resp_body,
        elapsed_ms=elapsed_ms,
        history_id=history.id,
    )


@router.post("/api-testing/requests/batch-execute")
async def batch_execute_requests(
    data: BatchExecuteRequest,
    db: AsyncSession = Depends(get_db),
):
    """批量执行请求"""
    started_at = time.time()

    # 获取请求定义
    requests_map = {}
    for rid in data.request_ids:
        req = await get_request(db, rid)
        if req:
            requests_map[rid] = req

    # 准备变量解析器
    resolver = None
    if data.environment_id:
        env = await get_environment(db, data.environment_id)
        if env and env.variables:
            resolver = VariableResolver(env.variables)

    executor = RequestExecutor()
    results = []
    project_id = data.project_id

    for req_id in data.request_ids:
        req = requests_map.get(req_id)
        if not req:
            results.append({
                "request_id": req_id,
                "request_name": "未知请求",
                "method": "?",
                "url": "?",
                "status_code": None,
                "elapsed_ms": 0,
                "passed": False,
                "error": "请求不存在",
            })
            continue

        # 变量解析
        resolved_url = resolver.resolve(req.url) if resolver else req.url
        resolved_headers = resolver.resolve_dict(req.headers or {}) if resolver else (req.headers or {})
        resolved_body = resolver.resolve_dict(req.body or {}) if resolver else (req.body or {})
        resolved_params = resolver.resolve_dict(req.query_params or {}) if resolver else (req.query_params or {})

        if not project_id:
            project_id = req.collection.project_id

        # 执行
        status_code, resp_headers, resp_body, elapsed_ms = await executor.execute(
            method=req.method,
            url=resolved_url,
            headers=resolved_headers,
            query_params=resolved_params,
            body=resolved_body or None,
            body_type=req.body_type or "none",
        )

        # 断言
        expected = req.expected_response or {}
        passed = True
        error_msg = None
        if expected.get("status_code") and status_code != expected["status_code"]:
            passed = False
            error_msg = f"预期状态码 {expected['status_code']}，实际 {status_code}"
        elif expected.get("body_contains") and expected["body_contains"] not in (resp_body or ""):
            passed = False
            error_msg = f"响应体未包含: {expected['body_contains']}"

        results.append({
            "request_id": req.id,
            "request_name": req.name,
            "method": req.method,
            "url": resolved_url,
            "status_code": status_code,
            "elapsed_ms": elapsed_ms,
            "passed": passed,
            "error": error_msg,
        })

        # 记录历史
        await create_request_history(db, {
            "request_id": req.id,
            "project_id": project_id or 0,
            "method": req.method,
            "url": resolved_url,
            "headers": resolved_headers,
            "query_params": resolved_params,
            "body": resolved_body,
            "response_status": status_code,
            "response_body": resp_body[:50000] if resp_body else None,
            "response_headers": dict(resp_headers),
            "elapsed_time": elapsed_ms,
        })

    duration_ms = round((time.time() - started_at) * 1000, 2)
    total = len(results)
    passed_count = sum(1 for r in results if r["passed"])
    failed_count = total - passed_count

    return {
        "total": total,
        "passed": passed_count,
        "failed": failed_count,
        "results": results,
        "duration_ms": duration_ms,
        "started_at": datetime.fromtimestamp(started_at).strftime("%Y-%m-%d %H:%M:%S"),
        "finished_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ====== 测试套件 ======

@router.get("/api-testing/test-suites")
async def list_test_suites(
    project_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取测试套件列表"""
    skip = (page - 1) * page_size
    suites, total = await get_test_suites(db, project_id, skip, page_size)

    return {
        "count": total,
        "results": [ApiTestSuiteResponse.model_validate(s) for s in suites],
        "next": None,
        "previous": None,
    }


@router.get("/api-testing/test-suites/{suite_id}", response_model=ApiTestSuiteResponse)
async def retrieve_test_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取套件详情"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    return ApiTestSuiteResponse.model_validate(suite)


@router.post("/api-testing/test-suites", response_model=ApiTestSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_suite(
    data: ApiTestSuiteCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建测试套件"""
    suite = await create_test_suite(db, data.model_dump())
    return ApiTestSuiteResponse.model_validate(suite)


@router.put("/api-testing/test-suites/{suite_id}", response_model=ApiTestSuiteResponse)
async def update_existing_test_suite(
    suite_id: int,
    data: ApiTestSuiteUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")

    update_data = data.model_dump(exclude_unset=True)
    suite = await update_test_suite(db, suite, update_data)
    return ApiTestSuiteResponse.model_validate(suite)


@router.delete("/api-testing/test-suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await delete_test_suite(db, suite)


@router.post("/api-testing/test-suites/{suite_id}/execute")
async def execute_test_suite_api(
    suite_id: int,
    environment_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """执行测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")

    result = await run_suite_execution(
        async_session, suite, environment_id,
    )
    return result


# ====== 环境管理 ======

@router.get("/api-testing/environments", response_model=list[ApiEnvironmentResponse])
async def list_environments(
    project_id: int | None = None,
    env_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """获取环境列表"""
    envs = await get_environments(db, project_id, env_type)
    return [ApiEnvironmentResponse.model_validate(e) for e in envs]


@router.post("/api-testing/environments", response_model=ApiEnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_environment(
    data: ApiEnvironmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建环境"""
    env = await create_environment(db, data.model_dump())
    return ApiEnvironmentResponse.model_validate(env)


@router.put("/api-testing/environments/{env_id}", response_model=ApiEnvironmentResponse)
async def update_existing_environment(
    env_id: int,
    data: ApiEnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新环境"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")

    update_data = data.model_dump(exclude_unset=True)
    env = await update_environment(db, env, update_data)
    return ApiEnvironmentResponse.model_validate(env)


@router.delete("/api-testing/environments/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除环境"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")
    await delete_environment(db, env)


@router.post("/api-testing/environments/{env_id}/activate", response_model=ApiEnvironmentResponse)
async def activate_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
):
    """激活环境（自动取消同类型其他环境的激活状态）"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")

    # 取消其他同类型的激活
    await deactivate_other_environments(db, env_id, env.project_id, env.env_type)

    # 激活当前
    env.is_active = True
    await db.flush()
    await db.refresh(env)

    return ApiEnvironmentResponse.model_validate(env)


# ====== 请求历史 ======

@router.get("/api-testing/request-history")
async def list_request_histories(
    project_id: int | None = None,
    request_id: int | None = None,
    method: str | None = None,
    status_code: int | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取请求历史分页列表"""
    skip = (page - 1) * page_size
    histories, total = await get_request_histories(
        db, project_id, request_id, method, status_code, search, skip, page_size,
    )

    return {
        "count": total,
        "results": [ApiRequestHistoryResponse.model_validate(h) for h in histories],
        "next": None,
        "previous": None,
    }


@router.get("/api-testing/request-history/{history_id}", response_model=ApiRequestHistoryResponse)
async def retrieve_request_history(
    history_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取历史详情"""
    history = await get_request_history(db, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    return ApiRequestHistoryResponse.model_validate(history)


@router.delete("/api-testing/request-history", status_code=status.HTTP_204_NO_CONTENT)
async def batch_delete_histories(
    data: HistoryBatchDelete,
    db: AsyncSession = Depends(get_db),
):
    """批量删除历史记录"""
    await delete_histories(db, data.ids)


@router.delete("/api-testing/request-history/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_histories(
    data: HistoryClearRequest,
    db: AsyncSession = Depends(get_db),
):
    """清空项目所有历史"""
    await clear_project_histories(db, data.project_id)


# ====== 定时任务 ======

@router.get("/api-testing/scheduled-tasks")
async def list_scheduled_tasks(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取定时任务列表"""
    skip = (page - 1) * page_size
    tasks, total = await get_scheduled_tasks(db, status_filter, skip, page_size)

    return {
        "count": total,
        "results": [ApiScheduledTaskResponse.model_validate(t) for t in tasks],
        "next": None,
        "previous": None,
    }


@router.get("/api-testing/scheduled-tasks/{task_id}", response_model=ApiScheduledTaskResponse)
async def retrieve_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取定时任务详情"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return ApiScheduledTaskResponse.model_validate(task)


@router.post("/api-testing/scheduled-tasks", response_model=ApiScheduledTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_scheduled_task(
    data: ApiScheduledTaskCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建定时任务"""
    task = await create_scheduled_task(db, data.model_dump())
    return ApiScheduledTaskResponse.model_validate(task)


@router.put("/api-testing/scheduled-tasks/{task_id}", response_model=ApiScheduledTaskResponse)
async def update_existing_scheduled_task(
    task_id: int,
    data: ApiScheduledTaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")

    update_data = data.model_dump(exclude_unset=True)
    task = await update_scheduled_task(db, task, update_data)
    return ApiScheduledTaskResponse.model_validate(task)


@router.delete("/api-testing/scheduled-tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await delete_scheduled_task(db, task)


@router.post("/api-testing/scheduled-tasks/{task_id}/pause", response_model=ApiScheduledTaskResponse)
async def pause_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """暂停定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")

    task.status = "paused"
    await db.flush()
    await db.refresh(task)
    return ApiScheduledTaskResponse.model_validate(task)


@router.post("/api-testing/scheduled-tasks/{task_id}/resume", response_model=ApiScheduledTaskResponse)
async def resume_scheduled_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """恢复定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")

    task.status = "active"
    await db.flush()
    await db.refresh(task)
    return ApiScheduledTaskResponse.model_validate(task)


# ====== 通知管理 ======

@router.get("/api-testing/notifications", response_model=list[ApiNotificationConfigResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
):
    """获取通知配置列表"""
    notifies = await get_notifications(db)
    return [ApiNotificationConfigResponse.model_validate(n) for n in notifies]


@router.post("/api-testing/notifications", response_model=ApiNotificationConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_new_notification(
    data: ApiNotificationConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建通知配置"""
    notify = await create_notification(db, data.model_dump())
    return ApiNotificationConfigResponse.model_validate(notify)


@router.put("/api-testing/notifications/{notify_id}", response_model=ApiNotificationConfigResponse)
async def update_existing_notification(
    notify_id: int,
    data: ApiNotificationConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新通知配置"""
    notify = await get_notification(db, notify_id)
    if not notify:
        raise HTTPException(status_code=404, detail="通知配置不存在")

    update_data = data.model_dump(exclude_unset=True)
    notify = await update_notification(db, notify, update_data)
    return ApiNotificationConfigResponse.model_validate(notify)


@router.delete("/api-testing/notifications/{notify_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_notification(
    notify_id: int,
    db: AsyncSession = Depends(get_db),
):
    """删除通知配置"""
    notify = await get_notification(db, notify_id)
    if not notify:
        raise HTTPException(status_code=404, detail="通知配置不存在")
    await delete_notification(db, notify)


@router.post("/api-testing/notifications/{notify_id}/test")
async def test_notification_send(
    notify_id: int,
    db: AsyncSession = Depends(get_db),
):
    """测试发送通知"""
    notify = await get_notification(db, notify_id)
    if not notify:
        raise HTTPException(status_code=404, detail="通知配置不存在")

    success, response_text = await NotificationSender.send(
        notify, "TestPlate 通知测试", "这是一条测试消息，来自 TestPlate 接口测试模块",
    )

    # 记录日志
    await create_notification_log(db, {
        "config_id": notify.id,
        "event_type": "test",
        "status": "success" if success else "failed",
        "message": "测试发送" if success else response_text,
        "response": response_text if success else None,
    })

    return {"success": success, "message": "发送成功" if success else response_text}


@router.get("/api-testing/notification-logs")
async def list_notification_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取通知日志列表"""
    skip = (page - 1) * page_size
    logs, total = await get_notification_logs(db, skip, page_size)

    return {
        "count": total,
        "results": [ApiNotificationLogResponse.model_validate(l) for l in logs],
        "next": None,
        "previous": None,
    }
