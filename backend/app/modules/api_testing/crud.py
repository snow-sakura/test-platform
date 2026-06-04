"""接口测试模块 CRUD 操作"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    ApiCollection, ApiEnvironment, ApiNotificationConfig, ApiNotificationLog,
    ApiProject, ApiRequest, ApiRequestHistory, ApiScheduledTask, ApiTestSuite,
)


# ====== API 项目 ======

async def get_api_projects(
    db: AsyncSession, search: str | None = None, status: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[ApiProject], int]:
    """获取 API 项目分页列表"""
    query = select(ApiProject)
    count_query = select(func.count(ApiProject.id))

    if search:
        query = query.where(ApiProject.name.ilike(f"%{search}%"))
        count_query = count_query.where(ApiProject.name.ilike(f"%{search}%"))
    if status:
        query = query.where(ApiProject.status == status)
        count_query = count_query.where(ApiProject.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ApiProject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    projects = list(result.scalars().all())

    return projects, total


async def get_api_project(db: AsyncSession, project_id: int) -> ApiProject | None:
    """获取单个 API 项目"""
    result = await db.execute(select(ApiProject).where(ApiProject.id == project_id))
    return result.scalar_one_or_none()


async def create_api_project(db: AsyncSession, data: dict) -> ApiProject:
    """创建 API 项目"""
    project = ApiProject(**data)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


async def update_api_project(db: AsyncSession, project: ApiProject, data: dict) -> ApiProject:
    """更新 API 项目"""
    for field, value in data.items():
        if value is not None:
            setattr(project, field, value)
    await db.flush()
    await db.refresh(project)
    return project


async def delete_api_project(db: AsyncSession, project: ApiProject) -> None:
    """删除 API 项目"""
    await db.delete(project)
    await db.flush()


async def get_project_collections_all(db: AsyncSession, project_id: int) -> list[ApiCollection]:
    """获取项目的所有集合（用于构建树）"""
    result = await db.execute(
        select(ApiCollection)
        .where(ApiCollection.project_id == project_id)
        .order_by(ApiCollection.sort_order, ApiCollection.id)
    )
    return list(result.scalars().all())


# ====== 集合 ======

async def create_collection(db: AsyncSession, data: dict) -> ApiCollection:
    """创建集合"""
    col = ApiCollection(**data)
    db.add(col)
    await db.flush()
    await db.refresh(col)
    return col


async def get_collection(db: AsyncSession, col_id: int) -> ApiCollection | None:
    """获取单个集合"""
    result = await db.execute(select(ApiCollection).where(ApiCollection.id == col_id))
    return result.scalar_one_or_none()


async def update_collection(db: AsyncSession, col: ApiCollection, data: dict) -> ApiCollection:
    """更新集合"""
    for field, value in data.items():
        if value is not None:
            setattr(col, field, value)
    await db.flush()
    await db.refresh(col)
    return col


async def delete_collection(db: AsyncSession, col: ApiCollection) -> None:
    """删除集合（级联删除子集和请求）"""
    await db.delete(col)
    await db.flush()


# ====== 请求 ======

async def get_requests_by_collection(
    db: AsyncSession, collection_id: int, search: str | None = None,
    is_favorite: bool | None = None,
) -> list[ApiRequest]:
    """获取集合下的请求列表"""
    query = select(ApiRequest).where(ApiRequest.collection_id == collection_id)

    if search:
        query = query.where(ApiRequest.name.ilike(f"%{search}%"))
    if is_favorite is not None:
        query = query.where(ApiRequest.is_favorite == is_favorite)

    query = query.order_by(ApiRequest.sort_order, ApiRequest.id)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_request(db: AsyncSession, request_id: int) -> ApiRequest | None:
    """获取单个请求"""
    result = await db.execute(select(ApiRequest).where(ApiRequest.id == request_id))
    return result.scalar_one_or_none()


async def create_request(db: AsyncSession, data: dict) -> ApiRequest:
    """创建请求"""
    req = ApiRequest(**data)
    db.add(req)
    await db.flush()
    await db.refresh(req)
    return req


async def update_request(db: AsyncSession, req: ApiRequest, data: dict) -> ApiRequest:
    """更新请求"""
    for field, value in data.items():
        if value is not None:
            setattr(req, field, value)
    await db.flush()
    await db.refresh(req)
    return req


async def delete_request(db: AsyncSession, req: ApiRequest) -> None:
    """删除请求"""
    await db.delete(req)
    await db.flush()


async def get_requests_by_ids(db: AsyncSession, request_ids: list[int]) -> list[ApiRequest]:
    """批量获取请求"""
    result = await db.execute(
        select(ApiRequest).where(ApiRequest.id.in_(request_ids))
    )
    return list(result.scalars().all())


async def get_project_request_count(db: AsyncSession, project_id: int) -> int:
    """获取项目的请求总数"""
    result = await db.execute(
        select(func.count(ApiRequest.id))
        .join(ApiCollection)
        .where(ApiCollection.project_id == project_id)
    )
    return result.scalar() or 0


# ====== 测试套件 ======

async def get_test_suites(
    db: AsyncSession, project_id: int | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[ApiTestSuite], int]:
    """获取测试套件列表"""
    query = select(ApiTestSuite)
    count_query = select(func.count(ApiTestSuite.id))

    if project_id is not None:
        query = query.where(ApiTestSuite.project_id == project_id)
        count_query = count_query.where(ApiTestSuite.project_id == project_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ApiTestSuite.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    suites = list(result.scalars().all())

    return suites, total


async def get_test_suite(db: AsyncSession, suite_id: int) -> ApiTestSuite | None:
    """获取单个套件"""
    result = await db.execute(select(ApiTestSuite).where(ApiTestSuite.id == suite_id))
    return result.scalar_one_or_none()


async def create_test_suite(db: AsyncSession, data: dict) -> ApiTestSuite:
    """创建套件"""
    suite = ApiTestSuite(**data)
    db.add(suite)
    await db.flush()
    await db.refresh(suite)
    return suite


async def update_test_suite(db: AsyncSession, suite: ApiTestSuite, data: dict) -> ApiTestSuite:
    """更新套件"""
    for field, value in data.items():
        if value is not None:
            setattr(suite, field, value)
    await db.flush()
    await db.refresh(suite)
    return suite


async def delete_test_suite(db: AsyncSession, suite: ApiTestSuite) -> None:
    """删除套件"""
    await db.delete(suite)
    await db.flush()


# ====== 环境 ======

async def get_environments(
    db: AsyncSession, project_id: int | None = None,
    env_type: str | None = None,
) -> list[ApiEnvironment]:
    """获取环境列表"""
    query = select(ApiEnvironment)

    if project_id is not None:
        query = query.where(ApiEnvironment.project_id == project_id)
    if env_type:
        query = query.where(ApiEnvironment.env_type == env_type)

    query = query.order_by(ApiEnvironment.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_environment(db: AsyncSession, env_id: int) -> ApiEnvironment | None:
    """获取单个环境"""
    result = await db.execute(select(ApiEnvironment).where(ApiEnvironment.id == env_id))
    return result.scalar_one_or_none()


async def create_environment(db: AsyncSession, data: dict) -> ApiEnvironment:
    """创建环境"""
    env = ApiEnvironment(**data)
    db.add(env)
    await db.flush()
    await db.refresh(env)
    return env


async def update_environment(db: AsyncSession, env: ApiEnvironment, data: dict) -> ApiEnvironment:
    """更新环境"""
    for field, value in data.items():
        if value is not None:
            setattr(env, field, value)
    await db.flush()
    await db.refresh(env)
    return env


async def delete_environment(db: AsyncSession, env: ApiEnvironment) -> None:
    """删除环境"""
    await db.delete(env)
    await db.flush()


async def deactivate_other_environments(
    db: AsyncSession, env_id: int, project_id: int | None, env_type: str,
) -> None:
    """将同一项目的同类型其他环境设为非激活"""
    query = (
        select(ApiEnvironment)
        .where(ApiEnvironment.id != env_id)
        .where(ApiEnvironment.env_type == env_type)
    )
    if project_id is not None:
        query = query.where(ApiEnvironment.project_id == project_id)
    else:
        query = query.where(ApiEnvironment.project_id.is_(None))

    result = await db.execute(query)
    others = list(result.scalars().all())
    for env in others:
        env.is_active = False


# ====== 请求历史 ======

async def get_request_histories(
    db: AsyncSession, project_id: int | None = None,
    request_id: int | None = None, method: str | None = None,
    status_code: int | None = None, search: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[ApiRequestHistory], int]:
    """获取请求历史分页列表"""
    query = select(ApiRequestHistory)
    count_query = select(func.count(ApiRequestHistory.id))

    if project_id is not None:
        query = query.where(ApiRequestHistory.project_id == project_id)
        count_query = count_query.where(ApiRequestHistory.project_id == project_id)
    if request_id is not None:
        query = query.where(ApiRequestHistory.request_id == request_id)
        count_query = count_query.where(ApiRequestHistory.request_id == request_id)
    if method:
        query = query.where(ApiRequestHistory.method == method.upper())
        count_query = count_query.where(ApiRequestHistory.method == method.upper())
    if status_code is not None:
        query = query.where(ApiRequestHistory.response_status == status_code)
        count_query = count_query.where(ApiRequestHistory.response_status == status_code)
    if search:
        query = query.where(ApiRequestHistory.url.ilike(f"%{search}%"))
        count_query = count_query.where(ApiRequestHistory.url.ilike(f"%{search}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ApiRequestHistory.executed_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    histories = list(result.scalars().all())

    return histories, total


async def get_request_history(db: AsyncSession, history_id: int) -> ApiRequestHistory | None:
    """获取单个历史记录"""
    result = await db.execute(
        select(ApiRequestHistory).where(ApiRequestHistory.id == history_id)
    )
    return result.scalar_one_or_none()


async def create_request_history(db: AsyncSession, data: dict) -> ApiRequestHistory:
    """创建历史记录"""
    history = ApiRequestHistory(**data)
    db.add(history)
    await db.flush()
    await db.refresh(history)
    return history


async def delete_histories(db: AsyncSession, ids: list[int]) -> None:
    """批量删除历史记录"""
    await db.execute(
        delete(ApiRequestHistory).where(ApiRequestHistory.id.in_(ids))
    )
    await db.flush()


async def clear_project_histories(db: AsyncSession, project_id: int | None = None) -> None:
    """清空项目所有历史记录（project_id 为 None 或 0 时清空全部）"""
    query = delete(ApiRequestHistory)
    if project_id is not None and project_id > 0:
        query = query.where(ApiRequestHistory.project_id == project_id)
    await db.execute(query)
    await db.flush()


async def get_today_executions(db: AsyncSession, project_id: int | None = None) -> int:
    """获取今日执行次数"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    query = select(func.count(ApiRequestHistory.id)).where(
        ApiRequestHistory.executed_at >= today_start
    )
    if project_id is not None:
        query = query.where(ApiRequestHistory.project_id == project_id)

    result = await db.execute(query)
    return result.scalar() or 0


# ====== 定时任务 ======

async def get_scheduled_tasks(
    db: AsyncSession, status: str | None = None,
    skip: int = 0, limit: int = 20,
) -> tuple[list[ApiScheduledTask], int]:
    """获取定时任务列表"""
    query = select(ApiScheduledTask)
    count_query = select(func.count(ApiScheduledTask.id))

    if status:
        query = query.where(ApiScheduledTask.status == status)
        count_query = count_query.where(ApiScheduledTask.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ApiScheduledTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    tasks = list(result.scalars().all())

    return tasks, total


async def get_scheduled_task(db: AsyncSession, task_id: int) -> ApiScheduledTask | None:
    """获取单个定时任务"""
    result = await db.execute(select(ApiScheduledTask).where(ApiScheduledTask.id == task_id))
    return result.scalar_one_or_none()


async def create_scheduled_task(db: AsyncSession, data: dict) -> ApiScheduledTask:
    """创建定时任务"""
    task = ApiScheduledTask(**data)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_scheduled_task(
    db: AsyncSession, task: ApiScheduledTask, data: dict,
) -> ApiScheduledTask:
    """更新定时任务"""
    for field, value in data.items():
        if value is not None:
            setattr(task, field, value)
    await db.flush()
    await db.refresh(task)
    return task


async def delete_scheduled_task(db: AsyncSession, task: ApiScheduledTask) -> None:
    """删除定时任务"""
    await db.delete(task)
    await db.flush()


async def get_all_active_tasks(db: AsyncSession) -> list[ApiScheduledTask]:
    """获取所有 active 状态的定时任务（用于启动时恢复）"""
    result = await db.execute(
        select(ApiScheduledTask).where(ApiScheduledTask.status == "active")
    )
    return list(result.scalars().all())


# ====== 通知配置 ======

async def get_notifications(db: AsyncSession) -> list[ApiNotificationConfig]:
    """获取通知配置列表"""
    result = await db.execute(
        select(ApiNotificationConfig).order_by(ApiNotificationConfig.created_at.desc())
    )
    return list(result.scalars().all())


async def get_notification(db: AsyncSession, notify_id: int) -> ApiNotificationConfig | None:
    """获取单个通知配置"""
    result = await db.execute(
        select(ApiNotificationConfig).where(ApiNotificationConfig.id == notify_id)
    )
    return result.scalar_one_or_none()


async def create_notification(db: AsyncSession, data: dict) -> ApiNotificationConfig:
    """创建通知配置"""
    notify = ApiNotificationConfig(**data)
    db.add(notify)
    await db.flush()
    await db.refresh(notify)
    return notify


async def update_notification(
    db: AsyncSession, notify: ApiNotificationConfig, data: dict,
) -> ApiNotificationConfig:
    """更新通知配置"""
    for field, value in data.items():
        if value is not None:
            setattr(notify, field, value)
    await db.flush()
    await db.refresh(notify)
    return notify


async def delete_notification(db: AsyncSession, notify: ApiNotificationConfig) -> None:
    """删除通知配置"""
    await db.delete(notify)
    await db.flush()


async def get_notification_logs(
    db: AsyncSession, skip: int = 0, limit: int = 20,
) -> tuple[list[ApiNotificationLog], int]:
    """获取通知日志列表"""
    total_result = await db.execute(select(func.count(ApiNotificationLog.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(ApiNotificationLog)
        .order_by(ApiNotificationLog.sent_at.desc())
        .offset(skip).limit(limit)
    )
    logs = list(result.scalars().all())

    return logs, total


async def create_notification_log(db: AsyncSession, data: dict) -> ApiNotificationLog:
    """创建通知日志"""
    log = ApiNotificationLog(**data)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


# ====== 仪表盘统计 ======

async def get_projects_collection_counts(db: AsyncSession, project_ids: list[int]) -> dict[int, int]:
    """批量获取多个项目的集合数"""
    if not project_ids:
        return {}
    result = await db.execute(
        select(ApiCollection.project_id, func.count(ApiCollection.id))
        .where(ApiCollection.project_id.in_(project_ids))
        .group_by(ApiCollection.project_id)
    )
    return dict(result.all())


async def get_projects_request_counts(db: AsyncSession, project_ids: list[int]) -> dict[int, int]:
    """批量获取多个项目的请求数"""
    if not project_ids:
        return {}
    result = await db.execute(
        select(ApiCollection.project_id, func.count(ApiRequest.id))
        .join(ApiRequest, ApiRequest.collection_id == ApiCollection.id)
        .where(ApiCollection.project_id.in_(project_ids))
        .group_by(ApiCollection.project_id)
    )
    return dict(result.all())


async def get_collections_request_counts(db: AsyncSession, collection_ids: list[int]) -> dict[int, int]:
    """批量获取多个集合的请求数"""
    if not collection_ids:
        return {}
    result = await db.execute(
        select(ApiRequest.collection_id, func.count(ApiRequest.id))
        .where(ApiRequest.collection_id.in_(collection_ids))
        .group_by(ApiRequest.collection_id)
    )
    return dict(result.all())


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """获取仪表盘统计数据"""
    # 项目数
    proj_result = await db.execute(select(func.count(ApiProject.id)))
    project_count = proj_result.scalar() or 0

    # 接口数
    req_result = await db.execute(select(func.count(ApiRequest.id)))
    request_count = req_result.scalar() or 0

    # 套件数
    suite_result = await db.execute(select(func.count(ApiTestSuite.id)))
    suite_count = suite_result.scalar() or 0

    # 今日执行数
    today_executions = await get_today_executions(db)

    return {
        "project_count": project_count,
        "request_count": request_count,
        "suite_count": suite_count,
        "today_executions": today_executions,
    }
