"""UI 自动化测试模块 - API 路由"""
from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    add_element_to_page_object, add_suite_cases, batch_create_steps,
    copy_test_case, create_element, create_element_group, create_environment,
    create_execution, create_notification_config, create_notification_log,
    create_page_object, create_project, create_scheduled_task, create_script,
    create_test_case, create_test_suite, delete_element,
    delete_element_group, delete_environment,
    delete_notification_config, delete_page_object, delete_project,
    delete_scheduled_task, delete_script, delete_test_case, delete_test_suite,
    get_element,
    get_element_group_tree, get_element_usages, get_elements,
    get_environment, get_environments,
    get_execution, get_executions, get_notification_config,
    get_notification_configs, get_notification_log, get_notification_logs,
    get_operation_records_by_execution, get_page_object,
    get_page_objects, get_project,
    get_projects, get_scheduled_task, get_scheduled_tasks,
    get_screenshots_by_execution, get_script,
    get_scripts, get_test_case, get_test_cases,
    get_test_suite, get_test_suites, get_ui_dashboard_stats,
    remove_suite_cases, update_element, update_element_group, update_environment,
    update_execution, update_notification_config, update_page_object,
    update_project, update_scheduled_task, update_script, update_test_case,
    update_test_suite,
)
from .models import UiElementGroup
from .schemas import (
    UiDashboardStats, UiElementCreate, UiElementGroupCreate,
    UiElementGroupResponse, UiElementGroupUpdate, UiElementResponse,
    UiElementUpdate, UiElementUsageResponse, UiElementValidateResult,
    UiEnvironmentCreate,
    UiEnvironmentResponse, UiEnvironmentUpdate, UiExecuteScriptResult,
    UiExecuteSuiteResult, UiNotificationConfigCreate,
    UiNotificationConfigResponse, UiNotificationConfigUpdate,
    UiNotificationLogResponse, UiOperationRecordResponse,
    UiPageObjectCreate, UiPageObjectResponse,
    UiPageObjectUpdate, UiProjectCreate, UiProjectResponse,
    UiProjectUpdate, UiScheduledTaskCreate, UiScheduledTaskResponse,
    UiScheduledTaskUpdate, UiScreenshotResponse,
    UiTestCaseCreate, UiTestCaseResponse,
    UiTestCaseUpdate, UiTestExecutionResponse,
    UiTestScriptCreate, UiTestScriptResponse, UiTestScriptUpdate,
    UiTestSuiteCreate, UiTestSuiteDetailResponse, UiTestSuiteResponse,
    UiTestSuiteUpdate,
)

# 内联请求模型
class AddBackupLocatorRequest(BaseModel):
    """添加备用定位器请求"""
    strategy: str
    value: str


class SuiteCasesRequest(BaseModel):
    """套件用例批量操作请求"""
    case_ids: list[int]


class BatchCreateStepsRequest(BaseModel):
    """批量创建步骤请求"""
    steps: list[dict]


class BatchRunCasesRequest(BaseModel):
    """批量运行用例请求"""
    case_ids: list[int]


class PageObjectAddElementRequest(BaseModel):
    """页面对象添加元素请求"""
    element_id: int


from app.utils.notification import send_notification

from .services import execute_script, validate_locator

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ui-automation",
    dependencies=[Depends(get_current_user)],
    tags=["ui-automation"],
)


# ==============================
# 仪表盘
# ==============================


@router.get("/dashboard/stats", response_model=UiDashboardStats)
async def dashboard_stats(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取 UI 自动化仪表盘统计"""
    stats = await get_ui_dashboard_stats(db)
    return UiDashboardStats(**stats)


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
    _=Depends(require_permission("ui_auto.view")),
):
    """获取 UI 自动化项目列表"""
    skip = (page - 1) * page_size
    projects, total = await get_projects(db, search, status, skip, page_size)

    # 批量统计
    items = []
    for p in projects:
        item = UiProjectResponse.model_validate(p)
        item.element_count = len(p.elements) if p.elements else 0
        item.page_object_count = len(p.page_objects) if p.page_objects else 0
        item.script_count = len(p.scripts) if p.scripts else 0
        items.append(item)

    return {"count": total, "results": items}


@router.get("/projects/{project_id}", response_model=UiProjectResponse)
async def retrieve_project(project_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取 UI 自动化项目详情"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    resp = UiProjectResponse.model_validate(project)
    resp.element_count = len(project.elements) if project.elements else 0
    resp.page_object_count = len(project.page_objects) if project.page_objects else 0
    resp.script_count = len(project.scripts) if project.scripts else 0
    return resp


@router.post("/projects", response_model=UiProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_project(
    data: UiProjectCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建 UI 自动化项目"""
    project = await create_project(db, data.model_dump())
    return UiProjectResponse.model_validate(project)


@router.put("/projects/{project_id}", response_model=UiProjectResponse)
async def update_existing_project(
    project_id: int,
    data: UiProjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新 UI 自动化项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await update_project(db, project, data.model_dump(exclude_unset=True, mode="json"))
    return UiProjectResponse.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_project(project_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除 UI 自动化项目"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    await delete_project(db, project)


# ==============================
# 元素分组
# ==============================


@router.get("/element-groups", response_model=list[UiElementGroupResponse])
async def list_element_groups(
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取元素分组树"""
    groups = await get_element_group_tree(db, project_id)

    # 构建树结构
    group_map = {g.id: g for g in groups}
    roots: list[UiElementGroupResponse] = []

    child_map: dict[int, list[UiElementGroupResponse]] = {}
    for g in groups:
        resp = UiElementGroupResponse.model_validate(g)
        resp.element_count = len(g.elements) if g.elements else 0
        child_map.setdefault(g.parent_id or 0, []).append(resp)

    def build_tree(parent_id: int = 0) -> list[UiElementGroupResponse]:
        nodes = child_map.get(parent_id, [])
        for node in nodes:
            node.children = build_tree(node.id)
        return nodes

    return build_tree(0)


@router.post("/element-groups", response_model=UiElementGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_new_element_group(
    data: UiElementGroupCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建元素分组"""
    group = await create_element_group(db, data.model_dump())
    return UiElementGroupResponse.model_validate(group)


@router.put("/element-groups/{group_id}", response_model=UiElementGroupResponse)
async def update_existing_element_group(
    group_id: int,
    data: UiElementGroupUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新元素分组"""
    group = await db.get(UiElementGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="分组不存在")
    await update_element_group(db, group, data.model_dump(exclude_unset=True, mode="json"))
    return UiElementGroupResponse.model_validate(group)


@router.delete("/element-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_element_group(group_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除元素分组"""
    group = await db.get(UiElementGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="分组不存在")
    await delete_element_group(db, group)


# ==============================
# 元素 CRUD
# ==============================


@router.get("/elements", response_model=dict)
async def list_elements(
    project_id: int = Query(...),
    group_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取元素列表"""
    skip = (page - 1) * page_size
    elements, total = await get_elements(db, project_id, group_id, search, skip, page_size)
    return {
        "count": total,
        "results": [UiElementResponse.model_validate(e) for e in elements],
    }


@router.get("/elements/{element_id}", response_model=UiElementResponse)
async def retrieve_element(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取元素详情"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    return UiElementResponse.model_validate(element)


@router.post("/elements", response_model=UiElementResponse, status_code=status.HTTP_201_CREATED)
async def create_new_element(
    data: UiElementCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建元素"""
    element = await create_element(db, data.model_dump(mode="json"))
    return UiElementResponse.model_validate(element)


@router.put("/elements/{element_id}", response_model=UiElementResponse)
async def update_existing_element(
    element_id: int,
    data: UiElementUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新元素"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    await update_element(db, element, data.model_dump(exclude_unset=True, mode="json"))
    return UiElementResponse.model_validate(element)


@router.delete("/elements/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_element(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除元素"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    await delete_element(db, element)


@router.post("/elements/{element_id}/validate", response_model=UiElementValidateResult)
async def validate_element_locator(
    element_id: int,
    url: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """验证元素定位器"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")

    target_url = url or element.page_url
    if not target_url:
        raise HTTPException(status_code=400, detail="请提供页面 URL")

    result = await validate_locator(target_url, element.locator_type, element.locator_value)
    return UiElementValidateResult(**result)


@router.post("/elements/{element_id}/add-backup-locator")
async def add_element_backup_locator(
    element_id: int,
    data: AddBackupLocatorRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """添加备用定位器"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    backup = list(element.backup_locators or [])
    backup.append({"type": data.strategy, "value": data.value})
    await update_element(db, element, {"backup_locators": backup})
    return {"message": "备用定位器已添加", "backup_locators": backup}


@router.post("/elements/{element_id}/generate-suggestions")
async def generate_element_suggestions(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.edit"))):
    """生成定位器建议（占位接口）"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    return {
        "message": "定位器建议生成完成",
        "suggestions": [
            {"strategy": "id", "value": element.locator_value},
            {"strategy": "css", "value": element.locator_value},
        ],
    }


@router.get("/elements/{element_id}/usages")
async def get_element_usages_endpoint(element_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取元素使用情况（引用该元素的脚本和页面对象）"""
    element = await get_element(db, element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    script_usages = await get_element_usages(db, element_id)
    return {
        "element_id": element_id,
        "script_usages": [
            {"script_id": u.script_id, "usage_count": u.usage_count, "context": u.context}
            for u in script_usages
        ],
        "page_object_ids": [link.page_object_id for link in (element.page_object_links or [])],
    }


# ==============================
# 页面对象 CRUD
# ==============================


@router.get("/page-objects", response_model=dict)
async def list_page_objects(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取页面对象列表"""
    skip = (page - 1) * page_size
    objects, total = await get_page_objects(db, project_id, skip, page_size)
    items = []
    for po in objects:
        item = UiPageObjectResponse.model_validate(po)
        item.element_count = len(po.element_links) if po.element_links else 0
        items.append(item)
    return {"count": total, "results": items}


@router.get("/page-objects/{po_id}", response_model=UiPageObjectResponse)
async def retrieve_page_object(po_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取页面对象详情"""
    po = await get_page_object(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="页面对象不存在")
    resp = UiPageObjectResponse.model_validate(po)
    resp.element_count = len(po.element_links) if po.element_links else 0
    return resp


@router.post("/page-objects", response_model=UiPageObjectResponse, status_code=status.HTTP_201_CREATED)
async def create_new_page_object(
    data: UiPageObjectCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建页面对象"""
    po = await create_page_object(db, data.model_dump())
    return UiPageObjectResponse.model_validate(po)


@router.put("/page-objects/{po_id}", response_model=UiPageObjectResponse)
async def update_existing_page_object(
    po_id: int,
    data: UiPageObjectUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新页面对象"""
    po = await get_page_object(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="页面对象不存在")
    po = await update_page_object(db, po, data.model_dump(exclude_unset=True, mode="json"))
    resp = UiPageObjectResponse.model_validate(po)
    resp.element_count = len(po.element_links) if po.element_links else 0
    return resp


@router.delete("/page-objects/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_page_object(po_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除页面对象"""
    po = await get_page_object(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="页面对象不存在")
    await delete_page_object(db, po)


@router.post("/page-objects/{po_id}/generate-code")
async def generate_page_object_code(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """自动生成 Page Object 代码"""
    po = await get_page_object(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="页面对象不存在")

    # 构建代码
    lines = [f"class {po.name.title().replace(' ', '')}Page:"]
    lines.append(f'    """{po.name} 页面对象"""')
    if po.url:
        lines.append(f'    URL = "{po.url}"')
    lines.append("")
    lines.append("    def __init__(self, page):")
    lines.append("        self.page = page")
    lines.append("")

    for link in po.element_links or []:
        element = link.element
        alias = link.alias or element.name
        var_name = alias.lower().replace(" ", "_").replace("-", "_")
        locator_str = {
            "id": f'#id="{element.locator_value}"',
            "css": f'"{element.locator_value}"',
            "xpath": f'xpath="{element.locator_value}"',
            "text": f'text="{element.locator_value}"',
            "class": f'"{element.locator_value}"',
            "name": f'[name="{element.locator_value}"]',
        }.get(element.locator_type, f'"{element.locator_value}"')
        lines.append(f"    @property")
        lines.append(f"    def {var_name}(self):")
        lines.append(f'        """{element.description or alias}"""')
        lines.append(f"        return self.page.locator({locator_str})")
        lines.append("")

    generated = "\n".join(lines)
    po.generated_code = generated
    await db.flush()

    return {"code": generated}


@router.post("/page-objects/{po_id}/add-element")
async def add_element_to_page_object_endpoint(
    po_id: int,
    data: PageObjectAddElementRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """添加已有元素引用到页面对象"""
    po = await get_page_object(db, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="页面对象不存在")
    element = await get_element(db, data.element_id)
    if not element:
        raise HTTPException(status_code=404, detail="元素不存在")
    try:
        link = await add_element_to_page_object(db, po_id, data.element_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "元素已添加到页面对象", "link_id": link.id}


# ==============================
# 脚本 CRUD
# ==============================


@router.get("/scripts", response_model=dict)
async def list_scripts(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取脚本列表"""
    skip = (page - 1) * page_size
    scripts, total = await get_scripts(db, project_id, skip, page_size)
    items = []
    for s in scripts:
        item = UiTestScriptResponse.model_validate(s)
        item.step_count = len(s.steps) if s.steps else 0
        items.append(item)
    return {"count": total, "results": items}


@router.post("/scripts/analyze")
async def analyze_script(
    script_id: int = Query(..., description="脚本 ID"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """分析脚本（占位接口）"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")
    return {
        "script_id": script.id,
        "script_name": script.name,
        "step_count": len(script.steps or []),
        "analysis": "脚本分析完成（占位结果）",
        "suggestions": [],
    }


@router.get("/scripts/{script_id}", response_model=UiTestScriptResponse)
async def retrieve_script(script_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取脚本详情"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")
    resp = UiTestScriptResponse.model_validate(script)
    resp.step_count = len(script.steps) if script.steps else 0
    return resp


@router.post("/scripts", response_model=UiTestScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_new_script(
    data: UiTestScriptCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建脚本"""
    script = await create_script(db, data.model_dump(mode="json"))
    script = await get_script(db, script.id)
    resp = UiTestScriptResponse.model_validate(script)
    resp.step_count = len(script.steps) if script.steps else 0
    return resp


@router.put("/scripts/{script_id}", response_model=UiTestScriptResponse)
async def update_existing_script(
    script_id: int,
    data: UiTestScriptUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新脚本"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")
    script = await update_script(db, script, data.model_dump(exclude_unset=True, mode="json"))
    script = await get_script(db, script_id)
    resp = UiTestScriptResponse.model_validate(script)
    resp.step_count = len(script.steps) if script.steps else 0
    return resp


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_script(script_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除脚本"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")
    await delete_script(db, script)


@router.post("/scripts/{script_id}/execute", response_model=UiExecuteScriptResult)
async def execute_script_endpoint(
    script_id: int,
    environment_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.execute")),
):
    """执行脚本"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")

    # 获取环境配置
    env = None
    if environment_id:
        env = await get_environment(db, environment_id)

    # 构建设置
    url = None
    headless = True
    timeout_ms = 30000
    browser_type = "chromium"
    if env:
        url = env.url
        headless = env.headless
        timeout_ms = env.timeout_ms
        browser_type = env.browser_type

    # 解析步骤
    steps_data = []
    for step in script.steps or []:
        step_data = {
            "step_number": step.step_number,
            "action_type": step.action_type,
            "element_id": step.element_id,
            "input_value": step.input_value,
            "expected_result": step.expected_result,
            "wait_seconds": step.wait_seconds,
        }
        # 解析定位器
        if step.element_id:
            el = await get_element(db, step.element_id)
            if el:
                step_data["locator"] = (
                    {"id": f"#{el.locator_value}", "css": el.locator_value, "xpath": el.locator_value}
                    .get(el.locator_type, el.locator_value)
                )
        steps_data.append(step_data)

    # 创建执行记录
    execution = await create_execution(db, {
        "test_case_id": None,
        "status": "running",
        "started_at": datetime.now(),
    })

    # 执行
    result = await execute_script(
        steps=steps_data,
        url=url,
        browser_type=browser_type,
        headless=headless,
        timeout_ms=timeout_ms,
    )

    # 更新执行记录
    await update_execution(db, execution, {
        "status": "completed",
        "result": "passed" if result["passed"] else "failed",
        "completed_at": datetime.now(),
        "duration_ms": result["duration_ms"],
        "error_message": result.get("error"),
    })

    return UiExecuteScriptResult(
        script_id=script_id,
        script_name=script.name,
        passed=result["passed"],
        duration_ms=result["duration_ms"],
        error=result.get("error"),
        screenshots=result.get("screenshots", []),
        steps=result.get("steps", []),
    )


@router.post("/scripts/{script_id}/batch-create-steps")
async def batch_create_script_steps(
    script_id: int,
    data: BatchCreateStepsRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """批量创建脚本步骤"""
    script = await get_script(db, script_id)
    if not script:
        raise HTTPException(status_code=404, detail="脚本不存在")
    created = await batch_create_steps(db, script_id, data.steps)
    return {"message": f"已创建 {len(created)} 个步骤", "count": len(created)}


# ==============================
# 用例 CRUD
# ==============================


@router.get("/test-cases", response_model=dict)
async def list_test_cases(
    project_id: int = Query(...),
    priority: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取 UI 测试用例列表"""
    skip = (page - 1) * page_size
    cases, total = await get_test_cases(db, project_id, priority, status, skip, page_size)
    return {
        "count": total,
        "results": [UiTestCaseResponse.model_validate(c) for c in cases],
    }


@router.get("/test-cases/{case_id}", response_model=UiTestCaseResponse)
async def retrieve_test_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取 UI 测试用例详情"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    return UiTestCaseResponse.model_validate(case)


@router.post("/test-cases", response_model=UiTestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_case(
    data: UiTestCaseCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建 UI 测试用例"""
    case = await create_test_case(db, data.model_dump())
    return UiTestCaseResponse.model_validate(case)


@router.put("/test-cases/{case_id}", response_model=UiTestCaseResponse)
async def update_existing_test_case(
    case_id: int,
    data: UiTestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新 UI 测试用例"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await update_test_case(db, case, data.model_dump(exclude_unset=True, mode="json"))
    return UiTestCaseResponse.model_validate(case)


@router.delete("/test-cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除 UI 测试用例"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    await delete_test_case(db, case)


@router.post("/test-cases/{case_id}/copy", response_model=UiTestCaseResponse)
async def copy_existing_test_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.create"))):
    """复制测试用例"""
    case = await get_test_case(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="测试用例不存在")
    new_case = await copy_test_case(db, case_id)
    return UiTestCaseResponse.model_validate(new_case)


@router.post("/test-cases/batch-run")
async def batch_run_test_cases(
    data: BatchRunCasesRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.execute")),
):
    """批量运行测试用例（占位接口）"""
    results = []
    for case_id in data.case_ids:
        case = await get_test_case(db, case_id)
        if not case:
            continue
        results.append({"case_id": case_id, "case_name": case.name, "status": "queued"})
    return {"message": f"已提交 {len(results)} 个用例执行", "total": len(results), "results": results}


# ==============================
# 套件 CRUD
# ==============================


@router.get("/test-suites", response_model=dict)
async def list_test_suites(
    project_id: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取 UI 测试套件列表"""
    skip = (page - 1) * page_size
    suites, total = await get_test_suites(db, project_id, skip, page_size)
    items = []
    for s in suites:
        item = UiTestSuiteResponse.model_validate(s)
        item.case_count = len(s.case_links) if s.case_links else 0
        items.append(item)
    return {"count": total, "results": items}


@router.get("/test-suites/{suite_id}", response_model=UiTestSuiteDetailResponse)
async def retrieve_test_suite(suite_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取 UI 测试套件详情"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    resp = UiTestSuiteDetailResponse.model_validate(suite)
    resp.case_count = len(suite.case_links) if suite.case_links else 0
    return resp


@router.post("/test-suites", response_model=UiTestSuiteResponse, status_code=status.HTTP_201_CREATED)
async def create_new_test_suite(
    data: UiTestSuiteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建 UI 测试套件"""
    suite = await create_test_suite(db, data.model_dump())
    return UiTestSuiteResponse.model_validate(suite)


@router.put("/test-suites/{suite_id}", response_model=UiTestSuiteResponse)
async def update_existing_test_suite(
    suite_id: int,
    data: UiTestSuiteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新 UI 测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    suite = await update_test_suite(db, suite, data.model_dump(exclude_unset=True, mode="json"))
    return UiTestSuiteResponse.model_validate(suite)


@router.delete("/test-suites/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_test_suite(suite_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除 UI 测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await delete_test_suite(db, suite)


@router.post("/test-suites/{suite_id}/add-cases")
async def add_cases_to_suite(
    suite_id: int,
    data: SuiteCasesRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """添加用例到套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await add_suite_cases(db, suite_id, data.case_ids)
    return {"message": f"已添加 {len(data.case_ids)} 个用例", "count": len(data.case_ids)}


@router.post("/test-suites/{suite_id}/remove-cases")
async def remove_cases_from_suite(
    suite_id: int,
    data: SuiteCasesRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """从套件移除用例"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")
    await remove_suite_cases(db, suite_id, data.case_ids)
    return {"message": f"已移除 {len(data.case_ids)} 个用例", "count": len(data.case_ids)}


@router.post("/test-suites/{suite_id}/execute", response_model=UiExecuteSuiteResult)
async def execute_test_suite_endpoint(
    suite_id: int,
    environment_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.execute")),
):
    """执行 UI 测试套件"""
    suite = await get_test_suite(db, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="套件不存在")

    results = []
    total_passed = 0
    total_duration = 0.0

    for link in suite.case_links or []:
        case = link.test_case
        if not case or not case.script_id:
            continue

        script = await get_script(db, case.script_id)
        if not script:
            continue

        # 执行单个脚本
        env = None
        if environment_id:
            env = await get_environment(db, environment_id)

        steps_data = []
        for step in script.steps or []:
            step_data = {
                "step_number": step.step_number,
                "action_type": step.action_type,
                "element_id": step.element_id,
                "input_value": step.input_value,
                "wait_seconds": step.wait_seconds,
            }
            if step.element_id:
                el = await get_element(db, step.element_id)
                if el:
                    step_data["locator"] = (
                        {"id": f"#{el.locator_value}", "css": el.locator_value, "xpath": el.locator_value}
                        .get(el.locator_type, el.locator_value)
                    )
            steps_data.append(step_data)

        exec_result = await execute_script(
            steps=steps_data,
            url=None,
            browser_type=env.browser_type if env else "chromium",
            headless=env.headless if env else True,
            timeout_ms=env.timeout_ms if env else 30000,
        )

        results.append(UiExecuteScriptResult(
            script_id=script.id,
            script_name=script.name,
            passed=exec_result["passed"],
            duration_ms=exec_result["duration_ms"],
            error=exec_result.get("error"),
            steps=exec_result.get("steps", []),
        ))

        if exec_result["passed"]:
            total_passed += 1
        total_duration += exec_result["duration_ms"]

    return UiExecuteSuiteResult(
        suite_id=suite_id,
        suite_name=suite.name,
        total=len(results),
        passed=total_passed,
        failed=len(results) - total_passed,
        duration_ms=total_duration,
        results=results,
    )


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
    _=Depends(require_permission("ui_auto.view")),
):
    """获取执行记录列表"""
    skip = (page - 1) * page_size
    executions, total = await get_executions(db, suite_id, None, status, skip, page_size)
    return {
        "count": total,
        "results": [UiTestExecutionResponse.model_validate(e) for e in executions],
    }


@router.get("/executions/{execution_id}", response_model=UiTestExecutionResponse)
async def retrieve_execution(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取执行记录详情"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return UiTestExecutionResponse.model_validate(execution)


@router.get("/executions/{execution_id}/screenshots", response_model=list[UiScreenshotResponse])
async def list_execution_screenshots(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取执行记录的截图列表"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    screenshots = await get_screenshots_by_execution(db, execution_id)
    return [UiScreenshotResponse.model_validate(s) for s in screenshots]


@router.get("/executions/{execution_id}/operation-records", response_model=list[UiOperationRecordResponse])
async def list_execution_operation_records(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取执行记录的操作记录列表"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    records = await get_operation_records_by_execution(db, execution_id)
    return [UiOperationRecordResponse.model_validate(r) for r in records]


# ==============================
# 环境配置
# ==============================


@router.get("/environments", response_model=list[UiEnvironmentResponse])
async def list_environments(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取环境配置列表"""
    envs = await get_environments(db, project_id)
    return [UiEnvironmentResponse.model_validate(e) for e in envs]


@router.get("/environments/{env_id}", response_model=UiEnvironmentResponse)
async def retrieve_environment(env_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取环境配置详情"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境配置不存在")
    return UiEnvironmentResponse.model_validate(env)


@router.post("/environments", response_model=UiEnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_environment(
    data: UiEnvironmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建环境配置"""
    env = await create_environment(db, data.model_dump())
    return UiEnvironmentResponse.model_validate(env)


@router.put("/environments/{env_id}", response_model=UiEnvironmentResponse)
async def update_existing_environment(
    env_id: int,
    data: UiEnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新环境配置"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境配置不存在")
    await update_environment(db, env, data.model_dump(exclude_unset=True, mode="json"))
    return UiEnvironmentResponse.model_validate(env)


@router.delete("/environments/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_environment(env_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除环境配置"""
    env = await get_environment(db, env_id)
    if not env:
        raise HTTPException(status_code=404, detail="环境配置不存在")
    await delete_environment(db, env)


# ==============================
# 定时任务
# ==============================


@router.get("/scheduled-tasks", response_model=dict)
async def list_scheduled_tasks(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取定时任务列表"""
    skip = (page - 1) * page_size
    tasks, total = await get_scheduled_tasks(db, status, skip, page_size)
    return {
        "count": total,
        "results": [UiScheduledTaskResponse.model_validate(t) for t in tasks],
    }


@router.get("/scheduled-tasks/{task_id}", response_model=UiScheduledTaskResponse)
async def retrieve_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取定时任务详情"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return UiScheduledTaskResponse.model_validate(task)


@router.post("/scheduled-tasks", response_model=UiScheduledTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_new_scheduled_task(
    data: UiScheduledTaskCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建定时任务"""
    task = await create_scheduled_task(db, data.model_dump())
    return UiScheduledTaskResponse.model_validate(task)


@router.put("/scheduled-tasks/{task_id}", response_model=UiScheduledTaskResponse)
async def update_existing_scheduled_task(
    task_id: int,
    data: UiScheduledTaskUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, data.model_dump(exclude_unset=True, mode="json"))
    return UiScheduledTaskResponse.model_validate(task)


@router.delete("/scheduled-tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await delete_scheduled_task(db, task)


@router.post("/scheduled-tasks/{task_id}/pause")
async def pause_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.edit"))):
    """暂停定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, {"status": "paused"})
    return {"message": "任务已暂停"}


@router.post("/scheduled-tasks/{task_id}/resume")
async def resume_scheduled_task(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.edit"))):
    """恢复定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    await update_scheduled_task(db, task, {"status": "active"})
    return {"message": "任务已恢复"}


# ==============================
# 通知管理
# ==============================


@router.get("/notifications", response_model=list[UiNotificationConfigResponse])
async def list_notifications(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.view"))):
    """获取通知配置列表"""
    configs = await get_notification_configs(db)
    return [UiNotificationConfigResponse.model_validate(c) for c in configs]


@router.post("/notifications", response_model=UiNotificationConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_new_notification(
    data: UiNotificationConfigCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.create")),
):
    """创建通知配置"""
    config = await create_notification_config(db, data.model_dump())
    return UiNotificationConfigResponse.model_validate(config)


@router.put("/notifications/{config_id}", response_model=UiNotificationConfigResponse)
async def update_existing_notification(
    config_id: int,
    data: UiNotificationConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.edit")),
):
    """更新通知配置"""
    config = await get_notification_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="通知配置不存在")
    await update_notification_config(db, config, data.model_dump(exclude_unset=True, mode="json"))
    return UiNotificationConfigResponse.model_validate(config)


@router.delete("/notifications/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_notification(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.delete"))):
    """删除通知配置"""
    config = await get_notification_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="通知配置不存在")
    await delete_notification_config(db, config)


@router.post("/notifications/{config_id}/test")
async def test_notification(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.execute"))):
    """测试通知发送"""
    config = await get_notification_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="通知配置不存在")

    result = await send_notification(
        notify_type=config.notify_type,
        webhook_url=config.webhook_url,
        secret=config.secret,
        title="UI自动化测试 - 测试通知",
        content="这是一条测试消息\n\n如果收到此消息，说明通知配置正确。",
        status="completed",
    )

    # 记录日志
    await create_notification_log(db, {
        "config_id": config_id,
        "event_type": "test",
        "status": "success" if result["success"] else "failed",
        "message": None if result["success"] else result.get("error"),
        "response": result.get("response"),
    })

    return result


# ==============================
# 通知日志
# ==============================


@router.get("/notification-logs", response_model=dict)
async def list_notification_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ui_auto.view")),
):
    """获取通知日志列表"""
    skip = (page - 1) * page_size
    logs, total = await get_notification_logs(db, skip, page_size)
    return {
        "count": total,
        "results": [UiNotificationLogResponse.model_validate(l) for l in logs],
    }


# ==============================
# 定时任务执行
# ==============================


@router.post("/scheduled-tasks/{task_id}/run-now")
async def run_scheduled_task_now(task_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.execute"))):
    """立即执行定时任务"""
    task = await get_scheduled_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    # 创建执行记录
    execution = await create_execution(db, {
        "status": "running",
        "started_at": datetime.now(),
    })
    await update_execution(db, execution, {
        "status": "completed",
        "completed_at": datetime.now(),
    })
    return {"message": "任务已开始执行", "execution_id": execution.id}


# ==============================
# 通知日志重试
# ==============================


@router.post("/notification-logs/{log_id}/retry")
async def retry_notification_log(log_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.execute"))):
    """重试发送失败的通知"""
    log = await get_notification_log(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="通知日志不存在")

    config = await get_notification_config(db, log.config_id)
    if not config:
        raise HTTPException(status_code=404, detail="通知配置不存在")

    result = await send_notification(
        notify_type=config.notify_type,
        webhook_url=config.webhook_url,
        secret=config.secret,
        title="UI自动化测试 - 重试通知",
        content=log.message or "",
        status="completed",
    )

    new_log = await create_notification_log(db, {
        "config_id": config.id,
        "event_type": log.event_type,
        "status": "success" if result["success"] else "failed",
        "message": log.message,
        "response": result.get("response"),
    })

    return {
        "message": "重试成功" if result["success"] else "重试失败",
        "success": result["success"],
        "new_log_id": new_log.id,
    }


# ==============================
# 执行中止
# ==============================


@router.post("/executions/{execution_id}/abort")
async def abort_execution(execution_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ui_auto.execute"))):
    """中止正在执行的测试"""
    execution = await get_execution(db, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    if execution.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="只能中止待执行或正在运行的执行")

    await update_execution(db, execution, {
        "status": "aborted",
        "completed_at": datetime.now(),
    })
    return {"message": "执行已中止"}
