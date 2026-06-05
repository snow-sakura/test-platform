"""APP 自动化测试模块 - API 路由"""
from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    create_component, create_config, create_device, create_element,
    create_execution, create_image_category, create_package, create_project,
    create_scheduled_task, create_test_case, create_test_suite,
    delete_component, delete_config, delete_device, delete_element,
    delete_image_category, delete_package, delete_project,
    delete_scheduled_task, delete_test_case, delete_test_suite,
    get_app_dashboard_stats, get_component, get_components, get_config,
    get_configs, get_device, get_devices, get_execution, get_executions,
    get_image_categories, get_image_category, get_notification_log,
    get_notification_logs, get_package, get_packages, get_project,
    get_projects, get_scheduled_task, get_scheduled_tasks, get_test_case,
    get_test_cases, get_test_suite, get_test_suites, stop_execution,
    update_component, update_config, update_device, update_element,
    update_image_category, update_notification_log, update_package,
    update_project, update_scheduled_task, update_test_case,
    update_test_suite,
)
from .schemas import (
    AppComponentCreate, AppComponentResponse, AppComponentUpdate,
    AppConfigCreate, AppConfigResponse, AppConfigUpdate,
    AppDashboardStats, AppElementCreate, AppElementResponse,
    AppElementUpdate, AppImageCategoryCreate, AppImageCategoryResponse,
    AppImageCategoryUpdate, AppNotificationLogResponse, AppPackageCreate,
    AppPackageResponse, AppPackageUpdate,
    AppProjectCreate, AppProjectResponse, AppProjectUpdate,
    AppScheduledTaskCreate, AppScheduledTaskResponse,
    AppScheduledTaskUpdate, AppTestCaseCreate, AppTestCaseResponse,
    AppTestCaseUpdate, AppTestExecutionResponse,
    AppTestSuiteCreate, AppTestSuiteDetailResponse,
    AppTestSuiteResponse, AppTestSuiteUpdate, DeviceCreate,
    DeviceResponse, DeviceUpdate,
)

from .services import (
    connect_device, disconnect_device, discover_devices, execute_scene,
    lock_device, take_screenshot, unlock_device,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/app-automation",
    dependencies=[Depends(get_current_user)],
    tags=["app-automation"],
)


# ==============================
# 仪表盘
# ==============================


@router.get("/dashboard/stats", response_model=AppDashboardStats)
async def dashboard_stats(db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取 APP 自动化仪表盘统计"""
    stats = await get_app_dashboard_stats(db)
    return AppDashboardStats(**stats)


# ==============================
# 项目 CRUD
# ==============================


@router.get("/projects", response_model=dict)
async def list_projects(
    search: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取 APP 自动化项目列表"""
    skip = (page - 1) * page_size
    projects, total = await get_projects(db, search, status, skip, page_size)

    # 批量统计设备数和元素数
    items = []
    for p in projects:
        item = AppProjectResponse.model_validate(p)
        item.device_count = len(p.devices) if p.devices else 0
        item.element_count = len(p.elements) if p.elements else 0
        items.append(item)

    return {"count": total, "results": items}


@router.get("/projects/{project_id}", response_model=AppProjectResponse)
async def retrieve_project(project_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取 APP 自动化项目详情"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    resp = AppProjectResponse.model_validate(project)
    resp.device_count = len(project.devices) if project.devices else 0
    resp.element_count = len(project.elements) if project.elements else 0
    return resp


@router.post("/projects", response_model=AppProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    data: AppProjectCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建 APP 自动化项目"""
    project = await create_project(db, data.model_dump())
    return AppProjectResponse.model_validate(project)


@router.put("/projects/{project_id}", response_model=AppProjectResponse)
async def update_existing_project(
    project_id: int,
    data: AppProjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新 APP 自动化项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await update_project(db, project, data.model_dump(exclude_unset=True, mode="json"))
    resp = AppProjectResponse.model_validate(project)
    resp.device_count = len(project.devices) if project.devices else 0
    resp.element_count = len(project.elements) if project.elements else 0
    return resp


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(project_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除 APP 自动化项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await delete_project(db, project)


# ==============================
# 环境配置
# ==============================


@router.get("/configs", response_model=list[AppConfigResponse])
async def list_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取环境配置列表"""
    configs = await get_configs(db)
    return [AppConfigResponse.model_validate(c) for c in configs]


@router.post("/configs", response_model=AppConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_new_config(
    data: AppConfigCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建环境配置"""
    config = await create_config(db, data.model_dump())
    return AppConfigResponse.model_validate(config)


@router.put("/configs/{config_id}", response_model=AppConfigResponse)
async def update_existing_config(
    config_id: int,
    data: AppConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新环境配置"""
    config = await get_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    await update_config(db, config, data.model_dump(exclude_unset=True, mode="json"))
    return AppConfigResponse.model_validate(config)


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除环境配置"""
    config = await get_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    await delete_config(db, config)


# ==============================
# 设备管理
# ==============================


@router.get("/devices", response_model=dict)
async def list_devices(
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取设备列表"""
    skip = (page - 1) * page_size
    devices, total = await get_devices(db, project_id=project_id, status=status, skip=skip, limit=page_size)
    return {"count": total, "results": [DeviceResponse.model_validate(d) for d in devices]}


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def retrieve_device(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取设备详情"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return DeviceResponse.model_validate(device)


@router.post("/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_new_device(
    data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建设备"""
    device = await create_device(db, data.model_dump())
    return DeviceResponse.model_validate(device)


@router.put("/devices/{device_id}", response_model=DeviceResponse)
async def update_existing_device(
    device_id: int,
    data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新设备"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    await update_device(db, device, data.model_dump(exclude_unset=True, mode="json"))
    return DeviceResponse.model_validate(device)


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_device(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除设备"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    await delete_device(db, device)


@router.post("/devices/discover", response_model=list[DeviceResponse])
async def discover_devices_endpoint(db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.create"))):
    """发现 ADB 设备"""
    discovered = await discover_devices()
    return [DeviceResponse.model_validate(d) for d in discovered]


@router.post("/devices/{device_id}/screenshot")
async def screenshot_device(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """对设备截图并保存"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")

    import tempfile, os
    from datetime import datetime

    save_dir = "/tmp/app_automation_screenshots"
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"{device.device_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")

    result = await take_screenshot(device.device_id, save_path)
    if not result:
        raise HTTPException(status_code=500, detail="截图失败")
    return {"success": True, "file_path": result, "device_id": device.device_id}


@router.post("/devices/{device_id}/lock")
async def lock_device_endpoint(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """锁定设备屏幕"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await lock_device(device.device_id)
    return result


@router.post("/devices/{device_id}/unlock")
async def unlock_device_endpoint(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """解锁设备屏幕"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await unlock_device(device.device_id)
    return result


@router.post("/devices/{device_id}/connect")
async def connect_device_endpoint(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """连接 ADB 设备"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await connect_device(device.device_id)
    return result


@router.post("/devices/{device_id}/disconnect")
async def disconnect_device_endpoint(device_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """断开 ADB 设备"""
    device = await get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    result = await disconnect_device(device.device_id)
    return result


# ==============================
# 应用包管理
# ==============================


@router.get("/packages", response_model=dict)
async def list_packages(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取应用包列表"""
    skip = (page - 1) * page_size
    packages, total = await get_packages(db, project_id, skip=skip, limit=page_size)
    return {"count": total, "results": [AppPackageResponse.model_validate(p) for p in packages]}


@router.post("/packages", response_model=AppPackageResponse, status_code=status.HTTP_201_CREATED)
async def create_new_package(
    data: AppPackageCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建应用包"""
    pkg = await create_package(db, data.model_dump())
    return AppPackageResponse.model_validate(pkg)


@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_package(package_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除应用包"""
    pkg = await get_package(db, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="应用包不存在")
    await delete_package(db, pkg)


@router.put("/packages/{package_id}", response_model=AppPackageResponse)
async def update_existing_package(
    package_id: int,
    data: AppPackageUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新应用包"""
    pkg = await get_package(db, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="应用包不存在")
    await update_package(db, pkg, data.model_dump(exclude_unset=True, mode="json"))
    return AppPackageResponse.model_validate(pkg)


# ==============================
# 图片分类
# ==============================


@router.get("/image-categories", response_model=dict)
async def list_image_categories(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取图片分类列表"""
    skip = (page - 1) * page_size
    categories, total = await get_image_categories(db, project_id, skip=skip, limit=page_size)
    items = []
    for c in categories:
        item = AppImageCategoryResponse.model_validate(c)
        item.element_count = len(c.elements) if c.elements else 0
        items.append(item)
    return {"count": total, "results": items}


@router.post("/image-categories", response_model=AppImageCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_new_image_category(
    data: AppImageCategoryCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建图片分类"""
    category = await create_image_category(db, data.model_dump())
    return AppImageCategoryResponse.model_validate(category)


@router.delete("/image-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_image_category(category_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除图片分类"""
    category = await get_image_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    await delete_image_category(db, category)


@router.put("/image-categories/{category_id}", response_model=AppImageCategoryResponse)
async def update_existing_image_category(
    category_id: int,
    data: AppImageCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新图片分类"""
    category = await get_image_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    await update_image_category(db, category, data.model_dump(exclude_unset=True, mode="json"))
    resp = AppImageCategoryResponse.model_validate(category)
    resp.element_count = len(category.elements) if category.elements else 0
    return resp


# ==============================
# 元素 CRUD
# ==============================


@router.get("/elements", response_model=dict)
async def list_elements(
    project_id: int = Query(...),
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取元素列表"""
    skip = (page - 1) * page_size
    elements, total = await get_elements(db, project_id, category_id, search, skip, page_size)
    return {
        "count": total,
        "results": [AppElementResponse.model_validate(e) for e in elements],
    }


@router.get("/elements/{element_id}", response_model=AppElementResponse)
async def retrieve_element(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取元素详情"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    return AppElementResponse.model_validate(element)


@router.post("/elements", response_model=AppElementResponse, status_code=status.HTTP_201_CREATED)
async def create_new_element(
    data: AppElementCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建元素"""
    element = await create_element(db, data.model_dump(mode="json"))
    return AppElementResponse.model_validate(element)


@router.put("/elements/{element_id}", response_model=AppElementResponse)
async def update_existing_element(
    element_id: int,
    data: AppElementUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新元素"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    await update_element(db, element, data.model_dump(exclude_unset=True, mode="json"))
    return AppElementResponse.model_validate(element)


@router.delete("/elements/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_element(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除元素"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    await delete_element(db, element)


@router.post("/elements/{element_id}/upload-image")
async def upload_element_image(
    element_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """上传元素的模板图片"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")

    import os, aiofiles
    from app.config import settings

    upload_dir = os.path.join(settings.UPLOAD_DIR, "app_elements")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
    image_path = os.path.join(upload_dir, f"element_{element_id}_{int(time.time())}{ext}")

    content = await file.read()
    async with aiofiles.open(image_path, "wb") as f:
        await f.write(content)

    await update_element(db, element, {"image_path": image_path})
    return {"success": True, "image_path": image_path}


# ==============================
# 测试用例 CRUD（场景编排）
# ==============================


@router.get("/test-cases", response_model=dict)
async def list_test_cases(
    project_id: int = Query(...),
    priority: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取 APP 测试用例列表"""
    skip = (page - 1) * page_size
    cases, total = await get_test_cases(db, project_id, priority, status, skip, page_size)
    return {
        "count": total,
        "results": [AppTestCaseResponse.model_validate(c) for c in cases],
    }


@router.get("/test-cases/{case_id}", response_model=AppTestCaseResponse)
async def retrieve_test_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取 APP 测试用例详情"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return AppTestCaseResponse.model_validate(case)


@router.post("/test-cases", response_model=AppTestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_case(
    data: AppTestCaseCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建 APP 测试用例（场景编排）"""
    case = await create_test_case(db, data.model_dump(mode="json"))
    return AppTestCaseResponse.model_validate(case)


@router.put("/test-cases/{case_id}", response_model=AppTestCaseResponse)
async def update_existing_test_case(
    case_id: int,
    data: AppTestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新 APP 测试用例"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await update_test_case(db, case, data.model_dump(exclude_unset=True, mode="json"))
    return AppTestCaseResponse.model_validate(case)


@router.delete("/test-cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除 APP 测试用例"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await delete_test_case(db, case)


@router.post("/test-cases/{case_id}/execute")
async def execute_test_case(
    case_id: int,
    device_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.execute")),
):
    """执行 APP 测试用例场景"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    scene_data = case.scene_data or []
    result = await execute_scene(
        scene_data=scene_data,
        device_id=device_id,
    )

    # 创建执行记录
    execution_data = {
        "test_case_id": case_id,
        "device_id": device_id,
        "status": "completed",
        "result": "passed" if result.get("passed") else "failed",
        "started_at": result.get("started_at"),
        "completed_at": result.get("completed_at"),
        "duration_ms": result.get("duration_ms"),
        "error_message": result.get("error"),
    }
    await create_execution(db, execution_data)

    return result


# ==============================
# 测试套件 CRUD
# ==============================


@router.get("/test-suites", response_model=dict)
async def list_test_suites(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取 APP 测试套件列表"""
    skip = (page - 1) * page_size
    suites, total = await get_test_suites(db, project_id, skip, page_size)
    items = []
    for s in suites:
        item = AppTestSuiteResponse.model_validate(s)
        item.case_count = len(s.case_links) if s.case_links else 0
        items.append(item)
    return {"count": total, "results": items}


@router.get("/test-suites/{suite_id}", response_model=AppTestSuiteDetailResponse)
async def retrieve_test_suite(suite_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取 APP 测试套件详情"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    resp = AppTestSuiteDetailResponse.model_validate(suite)
    resp.case_count = len(suite.case_links) if suite.case_links else 0
    # 填充关联的测试用例列表
    if suite.case_links:
        resp.cases = [
            AppTestCaseResponse.model_validate(link.test_case)
            for link in sorted(suite.case_links, key=lambda x: x.order)
            if link.test_case
        ]
    return resp


@router.post("/test-suites", response_model=AppTestSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_suite(
    data: AppTestSuiteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建 APP 测试套件"""
    suite = await create_test_suite(db, data.model_dump())
    resp = AppTestSuiteResponse.model_validate(suite)
    resp.case_count = len(suite.case_links) if suite.case_links else 0
    return resp


@router.put("/test-suites/{suite_id}", response_model=AppTestSuiteResponse)
async def update_existing_test_suite(
    suite_id: int,
    data: AppTestSuiteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新 APP 测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    suite = await update_test_suite(db, suite, data.model_dump(exclude_unset=True, mode="json"))
    resp = AppTestSuiteResponse.model_validate(suite)
    resp.case_count = len(suite.case_links) if suite.case_links else 0
    return resp


@router.delete("/test-suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_suite(suite_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除 APP 测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await delete_test_suite(db, suite)


@router.post("/test-suites/{suite_id}/execute")
async def execute_test_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.execute")),
):
    """执行 APP 测试套件（依次执行每个用例）"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")

    results = []
    total_passed = 0
    total_duration = 0.0

    for link in suite.case_links or []:
        case = link.test_case
        if not case:
            continue

        scene_data = case.scene_data or []
        exec_result = await execute_scene(
            scene_data=scene_data,
            device_id=case.device_id,
        )

        # 创建执行记录
        await create_execution(db, {
            "test_case_id": case.id,
            "suite_id": suite_id,
            "device_id": case.device_id,
            "status": "completed",
            "result": "passed" if exec_result.get("passed") else "failed",
            "started_at": exec_result.get("started_at"),
            "completed_at": exec_result.get("completed_at"),
            "duration_ms": exec_result.get("duration_ms"),
            "error_message": exec_result.get("error"),
        })

        results.append({
            "case_id": case.id,
            "case_name": case.name,
            "passed": exec_result.get("passed"),
            "duration_ms": exec_result.get("duration_ms"),
            "error": exec_result.get("error"),
            "steps": exec_result.get("steps", []),
        })

        if exec_result.get("passed"):
            total_passed += 1
        total_duration += exec_result.get("duration_ms", 0)

    return {
        "suite_id": suite_id,
        "suite_name": suite.name,
        "total": len(results),
        "passed": total_passed,
        "failed": len(results) - total_passed,
        "duration_ms": total_duration,
        "results": results,
    }


# ==============================
# 执行记录
# ==============================


@router.get("/executions", response_model=dict)
async def list_executions(
    suite_id: int | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取执行记录列表"""
    skip = (page - 1) * page_size
    executions, total = await get_executions(db, suite_id=suite_id, status=status, skip=skip, limit=page_size)
    return {
        "count": total,
        "results": [AppTestExecutionResponse.model_validate(e) for e in executions],
    }


@router.get("/executions/{execution_id}", response_model=AppTestExecutionResponse)
async def retrieve_execution(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """获取执行记录详情"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return AppTestExecutionResponse.model_validate(execution)


@router.post("/executions/{execution_id}/stop")
async def stop_existing_execution(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """停止执行记录"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    if execution.status in ("completed", "failed", "stopped"):
        raise HTTPException(status_code=400, detail="执行已结束，无法停止")
    await stop_execution(db, execution)
    return {"message": "执行已停止", "execution_id": execution_id}


# ==============================
# 组件库
# ==============================


@router.get("/components", response_model=dict)
async def list_components(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取组件库列表"""
    skip = (page - 1) * page_size
    components, total = await get_components(db, project_id, skip=skip, limit=page_size)
    return {"count": total, "results": [AppComponentResponse.model_validate(c) for c in components]}


@router.post("/components", response_model=AppComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_component(
    data: AppComponentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建组件"""
    component = await create_component(db, data.model_dump())
    return AppComponentResponse.model_validate(component)


@router.put("/components/{component_id}", response_model=AppComponentResponse)
async def update_existing_component(
    component_id: int,
    data: AppComponentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新组件"""
    component = await get_component(db, component_id)
    if not component:
        raise HTTPException(status_code=404, detail="组件不存在")
    await update_component(db, component, data.model_dump(exclude_unset=True, mode="json"))
    return AppComponentResponse.model_validate(component)


@router.delete("/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_component(component_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除组件"""
    component = await get_component(db, component_id)
    if not component:
        raise HTTPException(status_code=404, detail="组件不存在")
    await delete_component(db, component)


@router.get("/components/{component_id}/export")
async def export_component(component_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.view"))):
    """导出组件配置为 JSON"""
    component = await get_component(db, component_id)
    if not component:
        raise HTTPException(status_code=404, detail="组件不存在")
    return {
        "name": component.name,
        "component_type": component.component_type,
        "config": component.config,
        "description": component.description,
    }


@router.post("/components/import", response_model=AppComponentResponse, status_code=status.HTTP_201_CREATED)
async def import_component(
    data: AppComponentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """导入组件配置"""
    component = await create_component(db, data.model_dump())
    return AppComponentResponse.model_validate(component)


# ==============================
# 定时任务
# ==============================


@router.get("/scheduled-tasks", response_model=dict)
async def list_scheduled_tasks(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取定时任务列表"""
    skip = (page - 1) * page_size
    tasks, total = await get_scheduled_tasks(db, status, skip, page_size)
    return {
        "count": total,
        "results": [AppScheduledTaskResponse.model_validate(t) for t in tasks],
    }


@router.post("/scheduled-tasks", response_model=AppScheduledTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_scheduled_task(
    data: AppScheduledTaskCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.create")),
):
    """创建定时任务"""
    task = await create_scheduled_task(db, data.model_dump())
    return AppScheduledTaskResponse.model_validate(task)


@router.put("/scheduled-tasks/{task_id}", response_model=AppScheduledTaskResponse)
async def update_existing_scheduled_task(
    task_id: int,
    data: AppScheduledTaskUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.edit")),
):
    """更新定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, data.model_dump(exclude_unset=True, mode="json"))
    return AppScheduledTaskResponse.model_validate(task)


@router.delete("/scheduled-tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.delete"))):
    """删除定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await delete_scheduled_task(db, task)


@router.post("/scheduled-tasks/{task_id}/pause")
async def pause_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.edit"))):
    """暂停定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, {"status": "paused"})
    return {"message": "任务已暂停"}


@router.post("/scheduled-tasks/{task_id}/resume")
async def resume_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.edit"))):
    """恢复定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, {"status": "active"})
    return {"message": "任务已恢复"}


@router.post("/scheduled-tasks/{task_id}/run-now")
async def run_scheduled_task_now(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """立即执行定时任务（只记录执行标记，实际执行由调度器触发）"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    # 记录执行标记：更新 last_executed_at 触发调度
    from datetime import datetime
    await update_scheduled_task(db, task, {"last_executed_at": datetime.now()})
    return {"message": "任务已标记为立即执行", "task_id": task_id}


# ==============================
# 通知日志
# ==============================


@router.get("/notification-logs", response_model=dict)
async def list_notification_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("app_auto.view")),
):
    """获取通知日志列表"""
    skip = (page - 1) * page_size
    logs, total = await get_notification_logs(db, skip, page_size)
    return {
        "count": total,
        "results": [AppNotificationLogResponse.model_validate(l) for l in logs],
    }


@router.post("/notification-logs/{log_id}/retry")
async def retry_notification_log(log_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("app_auto.execute"))):
    """重试发送失败的通知"""
    from app.utils.notification import send_notification

    log = await get_notification_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="通知日志不存在")

    # 仅重试失败的通知
    if log.status == "success":
        raise HTTPException(status_code=400, detail="通知已发送成功，无需重试")

    try:
        await send_notification(log.config_id, log.event_type)
        await update_notification_log(db, log, {"status": "success", "response": "重试发送成功"})
        return {"success": True, "message": "通知重试发送成功"}
    except Exception as e:
        await update_notification_log(db, log, {"status": "failed", "response": f"重试失败: {str(e)}"})
        return {"success": False, "message": f"重试发送失败: {e}"}
