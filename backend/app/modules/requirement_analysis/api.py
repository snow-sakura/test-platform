"""AI 用例生成模块 - API 路由（约 24 个端点）"""
from __future__ import annotations

import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission
from app.pagination import PageParams
from app.services.document_parser import parse_document

from . import crud, schemas, services

router = APIRouter(prefix="/requirement-analysis", dependencies=[Depends(get_current_user)], tags=["AI 用例生成"])


# ==============================
# 辅助函数
# ==============================


def _paginated_response(items, total, page, page_size):
    return {
        "count": total,
        "results": items,
        "next": f"?page={page + 1}&page_size={page_size}" if page * page_size < total else None,
        "previous": f"?page={page - 1}&page_size={page_size}" if page > 1 else None,
    }


# ==============================
# 配置状态检查
# ==============================


@router.get("/config/status", response_model=schemas.ConfigStatusResponse)
async def get_config_status(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """检查 AI 用例生成所需的配置状态"""
    writer_model = await crud.get_active_writer_config(db)
    reviewer_model = await crud.get_active_reviewer_config(db)
    writer_prompt = await crud.get_active_writer_prompt(db)
    reviewer_prompt = await crud.get_active_reviewer_prompt(db)
    gen_config = await crud.get_active_generation_config(db)

    return {
        "writer_model": {"configured": writer_model is not None, "active": writer_model is not None if writer_model else False, "label": "Writer 模型"},
        "reviewer_model": {"configured": reviewer_model is not None, "active": reviewer_model is not None if reviewer_model else False, "label": "Reviewer 模型"},
        "writer_prompt": {"configured": writer_prompt is not None, "active": writer_prompt is not None if writer_prompt else False, "label": "Writer 提示词"},
        "reviewer_prompt": {"configured": reviewer_prompt is not None, "active": reviewer_prompt is not None if reviewer_prompt else False, "label": "Reviewer 提示词"},
        "generation_config": {"configured": gen_config is not None, "active": gen_config is not None if gen_config else False, "label": "生成配置"},
    }


# ==============================
# AI 模型配置 CRUD
# ==============================


@router.get("/model-configs", response_model=list[schemas.AIModelConfigResponse])
async def list_model_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """列出所有 AI 模型配置"""
    return await crud.get_ai_model_configs(db)


@router.post("/model-configs", response_model=schemas.AIModelConfigResponse)
async def create_model_config(data: schemas.AIModelConfigCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """创建 AI 模型配置"""
    return await crud.create_ai_model_config(db, data.model_dump())


@router.put("/model-configs/{config_id}", response_model=schemas.AIModelConfigResponse)
async def update_model_config(config_id: int, data: schemas.AIModelConfigUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """更新 AI 模型配置"""
    result = await crud.update_ai_model_config(db, config_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "配置不存在")
    return result


@router.delete("/model-configs/{config_id}")
async def delete_model_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除 AI 模型配置"""
    if not await crud.delete_ai_model_config(db, config_id):
        raise HTTPException(404, "配置不存在")
    return {"message": "已删除"}


@router.post("/model-configs/{config_id}/test-connection", response_model=schemas.AIModelTestResult)
async def test_model_connection(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """测试 AI 模型连接"""
    config = await crud.get_ai_model_config(db, config_id)
    if not config:
        raise HTTPException(404, "配置不存在")
    service = services.AIModelService(config)
    success, message = await service.test_connection()
    return {"success": success, "message": message}


# ==============================
# 提示词配置 CRUD
# ==============================


@router.get("/prompt-configs", response_model=list[schemas.PromptConfigResponse])
async def list_prompt_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """列出所有提示词配置"""
    return await crud.get_prompt_configs(db)


@router.post("/prompt-configs", response_model=schemas.PromptConfigResponse)
async def create_prompt_config(data: schemas.PromptConfigCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """创建提示词配置"""
    return await crud.create_prompt_config(db, data.model_dump())


@router.put("/prompt-configs/{config_id}", response_model=schemas.PromptConfigResponse)
async def update_prompt_config(config_id: int, data: schemas.PromptConfigUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """更新提示词配置"""
    result = await crud.update_prompt_config(db, config_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "配置不存在")
    return result


@router.delete("/prompt-configs/{config_id}")
async def delete_prompt_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除提示词配置"""
    if not await crud.delete_prompt_config(db, config_id):
        raise HTTPException(404, "配置不存在")
    return {"message": "已删除"}


@router.get("/prompt-configs/{config_id}/load-defaults", response_model=schemas.PromptConfigResponse)
async def load_default_prompt(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """加载默认提示词（从 docs/tester.md 或 docs/tester_pro.md）"""
    config_obj = await crud.get_prompt_config(db, config_id)
    if not config_obj:
        raise HTTPException(404, "配置不存在")

    # 确定默认文件路径
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    if config_obj.prompt_type == "testcase_writer":
        file_path = os.path.join(project_root, "docs", "tester.md")
    else:
        file_path = os.path.join(project_root, "docs", "tester_pro.md")

    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        config_obj.content = content
        await db.commit()
        await db.refresh(config_obj)

    return config_obj


# ==============================
# 生成行为配置 CRUD
# ==============================


@router.get("/generation-configs", response_model=list[schemas.GenerationConfigResponse])
async def list_generation_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """列出所有生成行为配置"""
    return await crud.get_generation_configs(db)


@router.post("/generation-configs", response_model=schemas.GenerationConfigResponse)
async def create_generation_config(data: schemas.GenerationConfigCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """创建生成行为配置"""
    return await crud.create_generation_config(db, data.model_dump())


@router.put("/generation-configs/{config_id}", response_model=schemas.GenerationConfigResponse)
async def update_generation_config(config_id: int, data: schemas.GenerationConfigUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """更新生成行为配置"""
    result = await crud.update_generation_config(db, config_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "配置不存在")
    return result


@router.delete("/generation-configs/{config_id}")
async def delete_generation_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除生成行为配置"""
    if not await crud.delete_generation_config(db, config_id):
        raise HTTPException(404, "配置不存在")
    return {"message": "已删除"}


# ==============================
# 文档管理
# ==============================


@router.post("/documents/upload", response_model=schemas.RequirementDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """上传需求文档，解析文本内容并保存"""
    # 验证文件类型
    allowed_types = {".pdf", ".docx", ".md", ".txt", ".csv", ".yaml", ".yml"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_types:
        raise HTTPException(400, f"不支持的文件类型: {ext}，支持: {', '.join(allowed_types)}")

    # 保存文件
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "requirement_docs")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    content_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(content_bytes)

    # 解析文本
    file_type = ext.lstrip(".")
    parsed_text = parse_document(file_path, file_type)

    # 创建文档记录
    doc = await crud.create_document(db, {
        "title": file.filename or "未命名文档",
        "file": file_path,
        "content": parsed_text or "",
        "file_type": file_type,
    })
    return doc


@router.get("/documents", response_model=dict)
async def list_documents(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """列出需求文档"""
    page_params = PageParams(page=page, page_size=page_size)
    items, total = await crud.get_documents(db, page_params)
    return {
        "count": total,
        "results": [schemas.RequirementDocumentResponse.model_validate(d) for d in items],
    }


@router.get("/documents/{doc_id}", response_model=schemas.RequirementDocumentResponse)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """获取文档详情"""
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "文档不存在")
    return doc


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除文档"""
    if not await crud.delete_document(db, doc_id):
        raise HTTPException(404, "文档不存在")
    return {"message": "已删除"}


# ==============================
# 分析管理
# ==============================


@router.post("/documents/{doc_id}/analyze", response_model=schemas.RequirementAnalysisResponse)
async def analyze_document(doc_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """分析文档，提取业务需求

    注意：此端点使用本地规则提取需求段落，不调用 LLM。
    LLM 分析将在生成阶段使用配置的模型进行。
    """
    doc = await crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "文档不存在")
    if not doc.content:
        raise HTTPException(400, "文档无文本内容")

    # 简单的段落分割作为需求提取
    content = doc.content
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

    # 生成需求列表
    requirements = []
    for i, para in enumerate(paragraphs[:50]):  # 最多 50 段
        title = para.split("\n")[0][:100]
        if len(title) < 5:
            continue
        requirements.append({
            "title": title,
            "description": para[:500],
            "priority": "MEDIUM",
            "category": "功能",
        })

    # 创建分析记录
    analysis = await crud.create_analysis(db, {
        "document_id": doc_id,
        "status": "completed",
        "result": requirements,
    })

    # 创建业务需求记录
    for req in requirements:
        await crud.create_business_requirement(db, {
            "analysis_id": analysis.id,
            "title": req["title"],
            "description": req["description"],
            "priority": req["priority"],
            "category": req["category"],
        })

    return analysis


@router.post("/analyze-text", response_model=schemas.RequirementAnalysisResponse)
async def analyze_text(data: schemas.AnalyzeTextRequest, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """分析纯文本需求

    将文本分割为段落作为需求列表，不调用 LLM。
    """
    if not data.text.strip():
        raise HTTPException(400, "文本内容不能为空")

    paragraphs = [p.strip() for p in data.text.split("\n\n") if p.strip()]
    requirements = []
    for i, para in enumerate(paragraphs[:50]):
        title = para.split("\n")[0][:100]
        if len(title) < 5:
            continue
        requirements.append({
            "title": title,
            "description": para[:500],
            "priority": "MEDIUM",
            "category": "功能",
        })

    analysis = await crud.create_analysis(db, {
        "document_id": None,
        "analysis_text": data.text,
        "status": "completed",
        "result": requirements,
    })

    for req in requirements:
        await crud.create_business_requirement(db, {
            "analysis_id": analysis.id,
            "title": req["title"],
            "description": req["description"],
            "priority": req["priority"],
            "category": req["category"],
        })

    return analysis


@router.get("/analyses", response_model=dict)
async def list_analyses(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """列出需求分析记录"""
    page_params = PageParams(page=page, page_size=page_size)
    items, total = await crud.get_analyses(db, page_params)
    return {
        "count": total,
        "results": [schemas.RequirementAnalysisResponse.model_validate(a) for a in items],
    }


# ==============================
# 需求管理
# ==============================


@router.get("/analyses/{analysis_id}/requirements", response_model=list[schemas.BusinessRequirementResponse])
async def get_analysis_requirements(analysis_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """获取分析下的业务需求列表"""
    analysis = await crud.get_analysis(db, analysis_id)
    if not analysis:
        raise HTTPException(404, "分析记录不存在")
    return await crud.get_business_requirements_by_analysis(db, analysis_id)


@router.get("/requirements", response_model=dict)
async def list_business_requirements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    analysis_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """分页获取业务需求列表"""
    page_params = PageParams(page=page, page_size=page_size)
    items, total = await crud.get_business_requirements(db, page_params, analysis_id)
    return _paginated_response(
        [schemas.BusinessRequirementResponse.model_validate(r) for r in items],
        total, page, page_size,
    )


@router.put("/requirements/{req_id}", response_model=schemas.BusinessRequirementResponse)
async def update_business_requirement(
    req_id: int, data: schemas.BusinessRequirementUpdate, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """更新业务需求"""
    result = await crud.update_business_requirement(db, req_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "需求不存在")
    return result


@router.delete("/requirements/{req_id}")
async def delete_business_requirement(req_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除业务需求"""
    if not await crud.delete_business_requirement(db, req_id):
        raise HTTPException(404, "需求不存在")
    return {"message": "已删除"}


@router.post("/requirements/{req_id}/generate-test-cases")
async def generate_cases_from_requirement(
    req_id: int, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """从指定业务需求生成测试用例（创建任务并使用需求文本作为来源）"""
    req = await crud.get_business_requirement(db, req_id)
    if not req:
        raise HTTPException(404, "需求不存在")

    # 用需求标题+描述作为生成输入
    input_text = f"需求：{req.title}\n\n{req.description or ''}"

    # 创建分析记录
    analysis = await crud.create_analysis(db, {
        "document_id": None,
        "analysis_text": input_text,
        "status": "completed",
        "result": [{"title": req.title, "description": req.description, "priority": req.priority, "category": req.category}],
    })

    # 创建生成任务
    task = await crud.create_task(db, {
        "source_type": "text",
        "source_id": analysis.id,
        "mode": "stream",
    })

    return {"analysis_id": analysis.id, "task_id": task.task_id}


# ==============================
# 任务管理（核心）
# ==============================


@router.post("/tasks", response_model=schemas.TaskResponse)
async def create_task(data: schemas.TaskCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """创建 AI 用例生成任务"""
    task_data = data.model_dump()
    task_data.pop("requirement_ids", None)
    task = await crud.create_task(db, task_data)
    return task


@router.get("/tasks", response_model=dict)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """任务列表（分页+状态筛选）"""
    page_params = PageParams(page=page, page_size=page_size)
    items, total = await crud.get_tasks(db, page_params, status)
    return {
        "count": total,
        "results": [schemas.TaskResponse.model_validate(t) for t in items],
    }


@router.get("/tasks/{task_id}", response_model=schemas.TaskDetailResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """获取任务详情"""
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "任务不存在")
    return task


@router.post("/tasks/{task_id}/generate")
async def start_task_generation(
    task_id: str,
    data: schemas.TaskGenerateRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """启动异步 AI 用例生成

    在后台线程中执行完整的生成工作流。
    """
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "任务不存在")

    # 更新任务配置
    update_data = data.model_dump()
    await crud.update_task(db, task.id, update_data)

    # 启动后台生成
    import asyncio
    asyncio.create_task(services.generate_task_async(task_id))

    return {"message": "任务已启动", "task_id": task_id}


@router.get("/tasks/{task_id}/stream-progress")
async def stream_task_progress(task_id: str, _=Depends(require_permission("ai_config.edit"))):
    """SSE 流式推送任务进度"""
    return StreamingResponse(
        services.stream_task_progress(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """取消生成任务"""
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "任务不存在")

    if task.status in ("completed", "failed", "cancelled"):
        return {"message": f"任务已处于 {task.status} 状态"}

    services.STOP_SIGNALS[task_id] = True
    await crud.update_task(db, task.id, {"status": "cancelled", "completed_at": datetime.now()})
    return {"message": "任务已取消"}


@router.post("/tasks/{task_id}/save-to-library")
async def save_task_to_library(task_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """将任务的最终用例保存到测试用例库"""
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "任务不存在")
    if task.status != "completed":
        raise HTTPException(400, f"任务状态为 {task.status}，无法保存")
    if task.is_saved_to_records:
        return {"message": "用例已保存过", "saved_count": 0}

    saved_count = await services.save_task_to_library(db, task)
    return {"message": f"已保存 {saved_count} 个用例到用例库", "saved_count": saved_count}


@router.get("/tasks/{task_id}/statistics")
async def get_task_statistics(task_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """获取任务统计"""
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(404, "任务不存在")

    parsed = services.parse_final_test_cases(task.final_test_cases)
    priority_count = {}
    for item in parsed:
        p = item.get("priority", "MEDIUM").upper()
        priority_count[p] = priority_count.get(p, 0) + 1

    return {
        "task_id": task.task_id,
        "status": task.status,
        "progress": task.progress,
        "total_cases": len(parsed),
        "priority_distribution": priority_count,
        "is_saved": task.is_saved_to_records,
        "generated_length": len(task.generated_content or ""),
    }


# ==============================
# 生成用例管理
# ==============================


@router.get("/generated-cases", response_model=dict)
async def list_generated_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    requirement_id: int | None = Query(None),
    task_id: int | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """分页列出生成的测试用例，可按需求/任务/状态筛选"""
    page_params = PageParams(page=page, page_size=page_size)
    items, total = await crud.get_generated_test_cases(db, page_params, requirement_id, task_id, status)
    return _paginated_response(
        [schemas.GeneratedTestCaseResponse.model_validate(c) for c in items],
        total, page, page_size,
    )


@router.get("/generated-cases/{case_id}", response_model=schemas.GeneratedTestCaseResponse)
async def get_generated_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """获取单个生成用例详情"""
    case = await crud.get_generated_test_case(db, case_id)
    if not case:
        raise HTTPException(404, "用例不存在")
    return case


@router.put("/generated-cases/{case_id}", response_model=schemas.GeneratedTestCaseResponse)
async def update_generated_case(
    case_id: int, data: schemas.GeneratedTestCaseUpdate, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """更新生成用例（编辑字段或变更状态）"""
    result = await crud.update_generated_test_case(db, case_id, data.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(404, "用例不存在")
    return result


@router.delete("/generated-cases/{case_id}")
async def delete_generated_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_config.edit"))):
    """删除生成用例"""
    if not await crud.delete_generated_test_case(db, case_id):
        raise HTTPException(404, "用例不存在")
    return {"message": "已删除"}


@router.post("/generated-cases/batch-status")
async def batch_update_cases_status(
    data: schemas.BatchStatusUpdateRequest, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_config.edit")),
):
    """批量更新生成用例状态（如批量采纳/废弃）"""
    count = await crud.batch_update_generated_test_case_status(db, data.ids, data.status)
    return {"message": f"已更新 {count} 个用例状态为 {data.status}", "updated_count": count}
