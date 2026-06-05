"""AI 用例生成模块 - 异步 CRUD 操作"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.pagination import PageParams, paginate

from . import models


# ==============================
# 文档 CRUD
# ==============================


async def create_document(db: AsyncSession, data: dict) -> models.RequirementDocument:
    obj = models.RequirementDocument(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_document(db: AsyncSession, doc_id: int) -> models.RequirementDocument | None:
    return (await db.execute(
        select(models.RequirementDocument).where(models.RequirementDocument.id == doc_id),
    )).scalar_one_or_none()


async def get_documents(db: AsyncSession, page: PageParams) -> tuple[list[models.RequirementDocument], int]:
    return await paginate(db, select(models.RequirementDocument).order_by(models.RequirementDocument.id.desc()), page)


async def delete_document(db: AsyncSession, doc_id: int) -> bool:
    obj = await get_document(db, doc_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


# ==============================
# 分析 CRUD
# ==============================


async def create_analysis(db: AsyncSession, data: dict) -> models.RequirementAnalysis:
    obj = models.RequirementAnalysis(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_analysis(db: AsyncSession, analysis_id: int) -> models.RequirementAnalysis | None:
    return (await db.execute(
        select(models.RequirementAnalysis).where(models.RequirementAnalysis.id == analysis_id),
    )).scalar_one_or_none()


async def get_analyses(db: AsyncSession, page: PageParams) -> tuple[list[models.RequirementAnalysis], int]:
    return await paginate(db, select(models.RequirementAnalysis).order_by(models.RequirementAnalysis.id.desc()), page)


async def update_analysis_status(db: AsyncSession, analysis_id: int, status: str, result: list | None = None):
    values = {"status": status, "updated_at": func.now()}
    if result is not None:
        values["result"] = result
    await db.execute(update(models.RequirementAnalysis).where(models.RequirementAnalysis.id == analysis_id).values(**values))
    await db.commit()


# ==============================
# 业务需求 CRUD
# ==============================


async def create_business_requirement(db: AsyncSession, data: dict) -> models.BusinessRequirement:
    obj = models.BusinessRequirement(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_business_requirements_by_analysis(
    db: AsyncSession, analysis_id: int,
) -> list[models.BusinessRequirement]:
    return (await db.execute(
        select(models.BusinessRequirement)
        .where(models.BusinessRequirement.analysis_id == analysis_id)
        .order_by(models.BusinessRequirement.id),
    )).scalars().all()


async def get_business_requirement(
    db: AsyncSession, req_id: int,
) -> models.BusinessRequirement | None:
    return (await db.execute(
        select(models.BusinessRequirement).where(models.BusinessRequirement.id == req_id),
    )).scalar_one_or_none()


async def get_business_requirements(
    db: AsyncSession, page: PageParams, analysis_id: int | None = None,
) -> tuple[list[models.BusinessRequirement], int]:
    """分页获取业务需求列表，可按 analysis_id 筛选"""
    stmt = select(models.BusinessRequirement).order_by(models.BusinessRequirement.id.desc())
    if analysis_id:
        stmt = stmt.where(models.BusinessRequirement.analysis_id == analysis_id)
    return await paginate(db, stmt, page)


async def update_business_requirement(db: AsyncSession, req_id: int, data: dict) -> models.BusinessRequirement | None:
    obj = await get_business_requirement(db, req_id)
    if not obj:
        return None
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_business_requirement(db: AsyncSession, req_id: int) -> bool:
    obj = await get_business_requirement(db, req_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


# ==============================
# AI 模型配置 CRUD
# ==============================


async def create_ai_model_config(db: AsyncSession, data: dict) -> models.AIModelConfig:
    obj = models.AIModelConfig(**data)
    if data.get("is_active"):
        await deactivate_all_ai_model_configs(db)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_ai_model_config(db: AsyncSession, config_id: int) -> models.AIModelConfig | None:
    return (await db.execute(
        select(models.AIModelConfig).where(models.AIModelConfig.id == config_id),
    )).scalar_one_or_none()


async def get_ai_model_configs(db: AsyncSession) -> list[models.AIModelConfig]:
    return (await db.execute(
        select(models.AIModelConfig).order_by(models.AIModelConfig.id.desc()),
    )).scalars().all()


async def update_ai_model_config(db: AsyncSession, config_id: int, data: dict) -> models.AIModelConfig | None:
    obj = await get_ai_model_config(db, config_id)
    if not obj:
        return None
    if data.get("is_active"):
        await deactivate_all_ai_model_configs(db)
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_ai_model_config(db: AsyncSession, config_id: int) -> bool:
    obj = await get_ai_model_config(db, config_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


async def deactivate_all_ai_model_configs(db: AsyncSession):
    await db.execute(
        update(models.AIModelConfig).values(is_active=False),
    )
    await db.commit()


async def get_active_writer_config(db: AsyncSession) -> models.AIModelConfig | None:
    return (await db.execute(
        select(models.AIModelConfig)
        .where(models.AIModelConfig.is_active == True)
        .where(models.AIModelConfig.role == "testcase_writer"),
    )).scalar_one_or_none()


async def get_active_reviewer_config(db: AsyncSession) -> models.AIModelConfig | None:
    return (await db.execute(
        select(models.AIModelConfig)
        .where(models.AIModelConfig.is_active == True)
        .where(models.AIModelConfig.role == "testcase_reviewer"),
    )).scalar_one_or_none()


# ==============================
# 提示词配置 CRUD
# ==============================


async def create_prompt_config(db: AsyncSession, data: dict) -> models.PromptConfig:
    obj = models.PromptConfig(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_prompt_config(db: AsyncSession, config_id: int) -> models.PromptConfig | None:
    return (await db.execute(
        select(models.PromptConfig).where(models.PromptConfig.id == config_id),
    )).scalar_one_or_none()


async def get_prompt_configs(db: AsyncSession) -> list[models.PromptConfig]:
    return (await db.execute(
        select(models.PromptConfig).order_by(models.PromptConfig.id.desc()),
    )).scalars().all()


async def update_prompt_config(db: AsyncSession, config_id: int, data: dict) -> models.PromptConfig | None:
    obj = await get_prompt_config(db, config_id)
    if not obj:
        return None
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_prompt_config(db: AsyncSession, config_id: int) -> bool:
    obj = await get_prompt_config(db, config_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


async def get_active_writer_prompt(db: AsyncSession) -> models.PromptConfig | None:
    return (await db.execute(
        select(models.PromptConfig)
        .where(models.PromptConfig.is_active == True)
        .where(models.PromptConfig.prompt_type == "testcase_writer"),
    )).scalar_one_or_none()


async def get_active_reviewer_prompt(db: AsyncSession) -> models.PromptConfig | None:
    return (await db.execute(
        select(models.PromptConfig)
        .where(models.PromptConfig.is_active == True)
        .where(models.PromptConfig.prompt_type == "testcase_reviewer"),
    )).scalar_one_or_none()


# ==============================
# 生成行为配置 CRUD
# ==============================


async def create_generation_config(db: AsyncSession, data: dict) -> models.GenerationConfig:
    obj = models.GenerationConfig(**data)
    if data.get("is_active"):
        await deactivate_all_generation_configs(db)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_generation_config(db: AsyncSession, config_id: int) -> models.GenerationConfig | None:
    return (await db.execute(
        select(models.GenerationConfig).where(models.GenerationConfig.id == config_id),
    )).scalar_one_or_none()


async def get_generation_configs(db: AsyncSession) -> list[models.GenerationConfig]:
    return (await db.execute(
        select(models.GenerationConfig).order_by(models.GenerationConfig.id.desc()),
    )).scalars().all()


async def update_generation_config(db: AsyncSession, config_id: int, data: dict) -> models.GenerationConfig | None:
    obj = await get_generation_config(db, config_id)
    if not obj:
        return None
    if data.get("is_active"):
        await deactivate_all_generation_configs(db)
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_generation_config(db: AsyncSession, config_id: int) -> bool:
    obj = await get_generation_config(db, config_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


async def deactivate_all_generation_configs(db: AsyncSession):
    await db.execute(
        update(models.GenerationConfig).values(is_active=False),
    )
    await db.commit()


async def get_active_generation_config(db: AsyncSession) -> models.GenerationConfig | None:
    return (await db.execute(
        select(models.GenerationConfig).where(models.GenerationConfig.is_active == True),
    )).scalar_one_or_none()


# ==============================
# 生成任务 CRUD
# ==============================


async def create_task(db: AsyncSession, data: dict) -> models.TestCaseGenerationTask:
    if "task_id" not in data:
        data["task_id"] = f"TASK-{uuid.uuid4().hex[:12].upper()}"
    obj = models.TestCaseGenerationTask(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_task(db: AsyncSession, task_id: int | str) -> models.TestCaseGenerationTask | None:
    stmt = select(models.TestCaseGenerationTask)
    if isinstance(task_id, int) or task_id.isdigit():
        stmt = stmt.where(models.TestCaseGenerationTask.id == int(task_id))
    else:
        stmt = stmt.where(models.TestCaseGenerationTask.task_id == task_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_tasks(
    db: AsyncSession, page: PageParams, status: str | None = None,
) -> tuple[list[models.TestCaseGenerationTask], int]:
    stmt = select(models.TestCaseGenerationTask).order_by(models.TestCaseGenerationTask.id.desc())
    if status:
        stmt = stmt.where(models.TestCaseGenerationTask.status == status)
    return await paginate(db, stmt, page)


async def update_task(db: AsyncSession, task_id: int, data: dict) -> models.TestCaseGenerationTask | None:
    obj = await get_task(db, str(task_id))
    if not obj:
        return None
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_task_progress(db: AsyncSession, task_id: int, **kwargs):
    values = {"updated_at": func.now()}
    values.update(kwargs)
    await db.execute(
        update(models.TestCaseGenerationTask)
        .where(models.TestCaseGenerationTask.id == task_id)
        .values(**values),
    )
    await db.commit()


async def delete_task(db: AsyncSession, task_id: int) -> bool:
    obj = await get_task(db, str(task_id))
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


# ==============================
# 生成用例 CRUD
# ==============================


async def create_generated_test_case(db: AsyncSession, data: dict) -> models.GeneratedTestCase:
    obj = models.GeneratedTestCase(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_generated_test_case(db: AsyncSession, case_id: int) -> models.GeneratedTestCase | None:
    return (await db.execute(
        select(models.GeneratedTestCase).where(models.GeneratedTestCase.id == case_id),
    )).scalar_one_or_none()


async def get_generated_test_cases(
    db: AsyncSession, page: PageParams,
    requirement_id: int | None = None,
    task_id: int | None = None,
    status: str | None = None,
) -> tuple[list[models.GeneratedTestCase], int]:
    """分页获取生成用例，可按需求/任务/状态筛选"""
    stmt = select(models.GeneratedTestCase).order_by(models.GeneratedTestCase.id.desc())
    if requirement_id:
        stmt = stmt.where(models.GeneratedTestCase.requirement_id == requirement_id)
    if task_id:
        stmt = stmt.where(models.GeneratedTestCase.task_id == task_id)
    if status:
        stmt = stmt.where(models.GeneratedTestCase.status == status)
    return await paginate(db, stmt, page)


async def update_generated_test_case(db: AsyncSession, case_id: int, data: dict) -> models.GeneratedTestCase | None:
    obj = await get_generated_test_case(db, case_id)
    if not obj:
        return None
    for key, value in data.items():
        setattr(obj, key, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_generated_test_case(db: AsyncSession, case_id: int) -> bool:
    obj = await get_generated_test_case(db, case_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


async def batch_update_generated_test_case_status(
    db: AsyncSession, ids: list[int], status: str,
) -> int:
    """批量更新生成用例状态，返回更新的记录数"""
    result = await db.execute(
        update(models.GeneratedTestCase)
        .where(models.GeneratedTestCase.id.in_(ids))
        .values(status=status),
    )
    await db.commit()
    return result.rowcount or 0
