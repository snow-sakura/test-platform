"""系统设置 API 路由：支持运行时热更新"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import get_all_settings, get_setting, upsert_setting
from .schemas import (
    SystemSettingsCreate, SystemSettingsResponse, SystemSettingsUpdate,
)

from app.services.config_sync import update_runtime_config

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["settings"])


@router.get("/settings/status")
async def get_config_status(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("settings.view")),
):
    """获取各模块配置状态"""
    from app.modules.ai_evaluator.crud import get_dify_config

    settings = await get_all_settings(db)
    settings_map = {s.key: s.value for s in settings}

    # LLM 配置检查
    llm_configured = bool(settings_map.get("LLM_API_KEY"))

    # Dify 配置检查
    dify = await get_dify_config(db)
    dify_configured = dify is not None and bool(dify.api_key)

    # 飞书通知检查
    feishu_configured = bool(settings_map.get("FEISHU_WEBHOOK_URL"))

    return {
        "llm": {"configured": llm_configured, "key": "LLM_API_KEY", "label": "AI 模型"},
        "dify": {"configured": dify_configured, "key": "dify", "label": "AI 评测师"},
        "feishu": {"configured": feishu_configured, "key": "FEISHU_WEBHOOK_URL", "label": "飞书通知"},
    }


@router.get("/settings", response_model=list[SystemSettingsResponse])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("settings.view")),
):
    """获取所有系统设置"""
    settings = await get_all_settings(db)
    return [SystemSettingsResponse.model_validate(s) for s in settings]


@router.post("/settings", response_model=SystemSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_setting(
    data: SystemSettingsCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("settings.edit")),
):
    """创建或更新系统设置（upsert），写入后同步到运行时配置"""
    setting = await upsert_setting(db, key=data.key, value=data.value, description=data.description)
    # 热更新到运行时配置
    update_runtime_config(data.key, data.value)
    return SystemSettingsResponse.model_validate(setting)


@router.get("/settings/{key}", response_model=SystemSettingsResponse)
async def retrieve_setting(
    key: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("settings.view")),
):
    """获取单个配置"""
    setting = await get_setting(db, key)
    if not setting:
        raise HTTPException(status_code=404, detail="配置不存在")
    return SystemSettingsResponse.model_validate(setting)


@router.put("/settings/{key}", response_model=SystemSettingsResponse)
async def update_setting_value(
    key: str,
    data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("settings.edit")),
):
    """更新配置值（写入后同步到运行时）"""
    setting = await get_setting(db, key)
    if not setting:
        raise HTTPException(status_code=404, detail="配置不存在")
    setting.value = data.value
    await db.flush()
    await db.refresh(setting)
    # 热更新到运行时配置
    update_runtime_config(key, data.value)
    return SystemSettingsResponse.model_validate(setting)
