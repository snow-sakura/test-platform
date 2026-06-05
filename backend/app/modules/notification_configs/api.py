"""统一通知管理 - API 路由"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from . import crud, schemas

router = APIRouter(prefix="/notification-configs", dependencies=[Depends(get_current_user)], tags=["统一通知管理"])


@router.get("/configs", response_model=list[schemas.NotificationConfigResponse])
async def list_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """获取所有通知配置"""
    return await crud.get_configs(db)


@router.post("/configs", response_model=schemas.NotificationConfigResponse)
async def create_config(data: schemas.NotificationConfigCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """创建通知配置"""
    return await crud.create_config(db, data.model_dump())


@router.get("/configs/{config_id}", response_model=schemas.NotificationConfigResponse)
async def get_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """获取通知配置详情"""
    obj = await crud.get_config(db, config_id)
    if not obj:
        raise HTTPException(404, "配置不存在")
    return obj


@router.put("/configs/{config_id}", response_model=schemas.NotificationConfigResponse)
async def update_config(config_id: int, data: schemas.NotificationConfigUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """更新通知配置"""
    obj = await crud.update_config(db, config_id, data.model_dump(exclude_unset=True))
    if not obj:
        raise HTTPException(404, "配置不存在")
    return obj


@router.delete("/configs/{config_id}")
async def delete_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """删除通知配置"""
    if not await crud.delete_config(db, config_id):
        raise HTTPException(404, "配置不存在")
    return {"message": "已删除"}


@router.post("/configs/{config_id}/set-default", response_model=schemas.NotificationConfigResponse)
async def set_default_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """设为默认配置"""
    obj = await crud.set_default_config(db, config_id)
    if not obj:
        raise HTTPException(404, "配置不存在")
    return obj


@router.get("/configs/active", response_model=list[schemas.NotificationConfigResponse])
async def get_active_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("notification.edit"))):
    """获取已启用的通知配置"""
    return await crud.get_active_configs(db)
