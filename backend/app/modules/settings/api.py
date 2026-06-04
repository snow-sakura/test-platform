"""系统设置 API 路由：支持运行时热更新"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .crud import get_all_settings, get_setting, upsert_setting
from .schemas import (
    SystemSettingsCreate, SystemSettingsResponse, SystemSettingsUpdate,
)

from app.services.config_sync import update_runtime_config

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["settings"])


@router.get("/settings", response_model=list[SystemSettingsResponse])
async def list_settings(db: AsyncSession = Depends(get_db)):
    """获取所有系统设置"""
    settings = await get_all_settings(db)
    return [SystemSettingsResponse.model_validate(s) for s in settings]


@router.post("/settings", response_model=SystemSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_setting(
    data: SystemSettingsCreate,
    db: AsyncSession = Depends(get_db),
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
