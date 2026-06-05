"""仪表盘 - 模块状态与全局概览"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission
from app.modules.auth.models import User
from app.modules.projects.models import Project
from app.modules.test_cases.models import TestCase
from app.modules.api_testing.models import ApiProject
from app.modules.ui_automation.models import UiProject as UIProject
from app.modules.requirement_analysis.models import AIModelConfig
from app.modules.ai_evaluator.models import DifyConfig

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["dashboard"])


@router.get("/dashboard/module-status")
async def get_module_status(db: AsyncSession = Depends(get_db), _=Depends(require_permission("dashboard.view"))):
    """获取各模块配置状态（用于首页卡片状态指示）"""
    # 并行查询各模块是否有数据
    import asyncio
    async def _count(stmt):
        return (await db.execute(stmt)).scalar() or 0

    project_count, api_project_count, ui_project_count, test_case_count, ai_model_active, dify_active = await asyncio.gather(
        _count(select(func.count(Project.id))),
        _count(select(func.count(ApiProject.id))),
        _count(select(func.count(UIProject.id))),
        _count(select(func.count(TestCase.id))),
        _count(
            select(func.count(AIModelConfig.id))
            .where(AIModelConfig.is_active == True)
            .where(AIModelConfig.role == "testcase_writer")
        ),
        _count(
            select(func.count(DifyConfig.id))
            .where(DifyConfig.is_active == True)
        ),
    )

    return {
        "projects": {
            "configured": project_count > 0,
            "count": project_count,
            "label": "项目管理",
        },
        "testManagement": {
            "configured": test_case_count > 0,
            "count": test_case_count,
            "label": "测试管理",
        },
        "apiTesting": {
            "configured": api_project_count > 0,
            "count": api_project_count,
            "label": "接口测试",
        },
        "uiAutomation": {
            "configured": ui_project_count > 0,
            "count": ui_project_count,
            "label": "UI 自动化",
        },
        "appAutomation": {
            "configured": False,
            "count": 0,
            "label": "APP 自动化",
        },
        "aiGeneration": {
            "configured": ai_model_active > 0,
            "count": ai_model_active,
            "label": "AI 用例生成",
        },
        "aiIntelligent": {
            "configured": False,
            "count": 0,
            "label": "AI 智能模式",
        },
        "aiReviewer": {
            "configured": dify_active > 0,
            "count": dify_active,
            "label": "AI 评测师",
        },
        "dataFactory": {
            "configured": True,
            "count": 0,
            "label": "数据工厂",
        },
        "configuration": {
            "configured": True,
            "count": 0,
            "label": "配置中心",
        },
    }
