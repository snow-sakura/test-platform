"""RBAC 权限系统 - 核心服务"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

from . import models

# ──────────────────────────────────────────────
# 预定义所有权限（按模块分组）
# ──────────────────────────────────────────────

ALL_PERMISSIONS: list[dict] = [
    # 项目管理
    {"codename": "project.create", "name": "创建项目", "module": "projects"},
    {"codename": "project.edit", "name": "编辑项目", "module": "projects"},
    {"codename": "project.delete", "name": "删除项目", "module": "projects"},
    {"codename": "project.view", "name": "查看项目", "module": "projects"},
    {"codename": "project.manage_members", "name": "管理项目成员", "module": "projects"},
    # 用户管理
    {"codename": "user.create", "name": "创建用户", "module": "auth"},
    {"codename": "user.edit", "name": "编辑用户", "module": "auth"},
    {"codename": "user.delete", "name": "删除用户", "module": "auth"},
    {"codename": "user.view", "name": "查看用户", "module": "auth"},
    # 角色管理（RBAC 自身）
    {"codename": "role.view", "name": "查看角色与权限", "module": "rbac"},
    {"codename": "role.create", "name": "创建角色", "module": "rbac"},
    {"codename": "role.edit", "name": "编辑角色", "module": "rbac"},
    {"codename": "role.delete", "name": "删除角色", "module": "rbac"},
    {"codename": "role.assign", "name": "分配角色给用户", "module": "rbac"},
    # 系统设置
    {"codename": "settings.edit", "name": "修改系统设置", "module": "settings"},
    {"codename": "settings.view", "name": "查看系统设置", "module": "settings"},
    # 文档管理
    {"codename": "document.view", "name": "查看文档", "module": "documents"},
    {"codename": "document.upload", "name": "上传文档", "module": "documents"},
    {"codename": "document.delete", "name": "删除文档", "module": "documents"},
    # 知识库
    {"codename": "knowledgebase.view", "name": "查看知识库", "module": "knowledge_base"},
    {"codename": "knowledgebase.create", "name": "创建知识库", "module": "knowledge_base"},
    {"codename": "knowledgebase.edit", "name": "编辑知识库", "module": "knowledge_base"},
    {"codename": "knowledgebase.delete", "name": "删除知识库", "module": "knowledge_base"},
    # 通知配置
    {"codename": "notification.edit", "name": "管理通知配置", "module": "notifications"},
    # AI 配置
    {"codename": "ai_config.edit", "name": "管理 AI 模型配置", "module": "ai_config"},
    # 测试点
    {"codename": "testpoint.view", "name": "查看测试点", "module": "test_points"},
    {"codename": "testpoint.create", "name": "创建测试点", "module": "test_points"},
    {"codename": "testpoint.edit", "name": "编辑测试点", "module": "test_points"},
    {"codename": "testpoint.delete", "name": "删除测试点", "module": "test_points"},
    # 测试用例
    {"codename": "testcase.view", "name": "查看测试用例", "module": "test_cases"},
    {"codename": "testcase.create", "name": "创建测试用例", "module": "test_cases"},
    {"codename": "testcase.edit", "name": "编辑测试用例", "module": "test_cases"},
    {"codename": "testcase.delete", "name": "删除测试用例", "module": "test_cases"},
    # 任务批次
    {"codename": "taskbatch.view", "name": "查看任务批次", "module": "task_batches"},
    {"codename": "taskbatch.delete", "name": "删除任务批次", "module": "task_batches"},
    # 接口测试
    {"codename": "api_testing.view", "name": "查看接口测试", "module": "api_testing"},
    {"codename": "api_testing.create", "name": "创建接口测试", "module": "api_testing"},
    {"codename": "api_testing.edit", "name": "编辑接口测试", "module": "api_testing"},
    {"codename": "api_testing.delete", "name": "删除接口测试", "module": "api_testing"},
    {"codename": "api_testing.execute", "name": "执行接口测试", "module": "api_testing"},
    # 测试管理（评审/计划/执行/报告）
    {"codename": "test_mgmt.view", "name": "查看测试管理", "module": "test_management"},
    {"codename": "test_mgmt.create", "name": "创建测试管理", "module": "test_management"},
    {"codename": "test_mgmt.edit", "name": "编辑测试管理", "module": "test_management"},
    {"codename": "test_mgmt.delete", "name": "删除测试管理", "module": "test_management"},
    {"codename": "test_mgmt.review", "name": "评审测试用例", "module": "test_management"},
    {"codename": "test_mgmt.execute", "name": "执行测试计划", "module": "test_management"},
    # UI 自动化
    {"codename": "ui_auto.view", "name": "查看 UI 自动化", "module": "ui_automation"},
    {"codename": "ui_auto.create", "name": "创建 UI 自动化", "module": "ui_automation"},
    {"codename": "ui_auto.edit", "name": "编辑 UI 自动化", "module": "ui_automation"},
    {"codename": "ui_auto.delete", "name": "删除 UI 自动化", "module": "ui_automation"},
    {"codename": "ui_auto.execute", "name": "执行 UI 自动化", "module": "ui_automation"},
    # APP 自动化
    {"codename": "app_auto.view", "name": "查看 APP 自动化", "module": "app_automation"},
    {"codename": "app_auto.create", "name": "创建 APP 自动化", "module": "app_automation"},
    {"codename": "app_auto.edit", "name": "编辑 APP 自动化", "module": "app_automation"},
    {"codename": "app_auto.delete", "name": "删除 APP 自动化", "module": "app_automation"},
    {"codename": "app_auto.execute", "name": "执行 APP 自动化", "module": "app_automation"},
    # AI 智能模式
    {"codename": "ai_smart.view", "name": "查看 AI 智能模式", "module": "ai_smart"},
    {"codename": "ai_smart.create", "name": "创建 AI 智能用例", "module": "ai_smart"},
    {"codename": "ai_smart.edit", "name": "编辑 AI 智能用例", "module": "ai_smart"},
    {"codename": "ai_smart.delete", "name": "删除 AI 智能用例", "module": "ai_smart"},
    {"codename": "ai_smart.generate", "name": "AI 生成用例", "module": "ai_smart"},
    # 数据工厂
    {"codename": "data_factory.view", "name": "查看数据工厂", "module": "data_factory"},
    {"codename": "data_factory.create", "name": "创建数据工厂记录", "module": "data_factory"},
    {"codename": "data_factory.delete", "name": "删除数据工厂记录", "module": "data_factory"},
    # AI 评测师
    {"codename": "ai_eval.view", "name": "查看 AI 评测", "module": "ai_evaluator"},
    {"codename": "ai_eval.create", "name": "创建 AI 评测会话", "module": "ai_evaluator"},
    {"codename": "ai_eval.edit", "name": "编辑 AI 评测配置", "module": "ai_evaluator"},
    {"codename": "ai_eval.delete", "name": "删除 AI 评测配置", "module": "ai_evaluator"},
    # 性能测试
    {"codename": "performance.view", "name": "查看性能测试", "module": "performance"},
    {"codename": "performance.create", "name": "创建性能场景", "module": "performance"},
    {"codename": "performance.edit", "name": "编辑性能场景", "module": "performance"},
    {"codename": "performance.delete", "name": "删除性能场景", "module": "performance"},
    {"codename": "performance.execute", "name": "执行性能测试", "module": "performance"},
    # AI 用例生成
    {"codename": "requirement_analysis.view", "name": "查看 AI 用例生成", "module": "requirement_analysis"},
    {"codename": "requirement_analysis.create", "name": "创建 AI 用例生成", "module": "requirement_analysis"},
    {"codename": "requirement_analysis.edit", "name": "编辑 AI 用例生成", "module": "requirement_analysis"},
    {"codename": "requirement_analysis.delete", "name": "删除 AI 用例生成", "module": "requirement_analysis"},
    # 仪表盘
    {"codename": "dashboard.view", "name": "查看仪表盘", "module": "dashboard"},
    # CI/CD 集成
    {"codename": "ci_cd.view", "name": "查看 CI/CD", "module": "ci_cd"},
    {"codename": "ci_cd.create", "name": "创建 CI/CD 管道", "module": "ci_cd"},
    {"codename": "ci_cd.edit", "name": "管理 CI/CD 配置", "module": "ci_cd"},
    {"codename": "ci_cd.delete", "name": "删除 CI/CD 配置", "module": "ci_cd"},
]

# 系统角色定义
SYSTEM_ROLES: list[dict] = [
    {
        "name": "超级管理员",
        "description": "拥有所有权限",
        "permissions": [p["codename"] for p in ALL_PERMISSIONS],
    },
    {
        "name": "管理员",
        "description": "项目管理 + 用户管理 + 各模块查看与基本操作",
        "permissions": [
            "project.create", "project.edit", "project.delete", "project.view", "project.manage_members",
            "user.view", "user.create",
            "settings.view", "settings.edit",
            "document.view", "document.upload", "document.delete",
            "knowledgebase.view", "knowledgebase.create", "knowledgebase.edit",
            "notification.edit", "ai_config.edit",
            "testpoint.view", "testpoint.create", "testpoint.edit",
            "testcase.view", "testcase.create", "testcase.edit",
            "taskbatch.view", "taskbatch.delete",
            "api_testing.view", "api_testing.create", "api_testing.edit", "api_testing.execute", "api_testing.delete",
            "test_mgmt.view", "test_mgmt.create", "test_mgmt.edit", "test_mgmt.delete", "test_mgmt.review", "test_mgmt.execute",
            "ui_auto.view", "ui_auto.create", "ui_auto.edit", "ui_auto.execute",
            "app_auto.view", "app_auto.create", "app_auto.edit", "app_auto.execute", "app_auto.delete",
            "ai_smart.view", "ai_smart.create", "ai_smart.edit", "ai_smart.generate",
            "data_factory.view", "data_factory.create",
            "ai_eval.view", "ai_eval.create", "ai_eval.edit",
            "performance.view", "performance.create", "performance.execute",
            "role.view",
            "requirement_analysis.view", "requirement_analysis.create", "requirement_analysis.edit",
            "dashboard.view",
            "ci_cd.view", "ci_cd.edit", "ci_cd.create",
        ],
    },
    {
        "name": "普通用户",
        "description": "基础操作权限",
        "permissions": [
            "project.create", "project.edit", "project.view",
            "user.view",
            "document.view", "document.upload",
            "knowledgebase.view",
            "settings.view",
            "testpoint.view", "testpoint.create",
            "testcase.view", "testcase.create",
            "taskbatch.view",
            "api_testing.view", "api_testing.create", "api_testing.execute",
            "test_mgmt.view",
            "ui_auto.view",
            "app_auto.view",
            "ai_smart.view",
            "data_factory.view",
            "ai_eval.view",
            "performance.view",
            "role.view",
            "requirement_analysis.view",
            "dashboard.view",
        ],
    },
]


async def seed_permissions(db: AsyncSession):
    """初始化/同步权限定义（幂等）"""
    for perm_data in ALL_PERMISSIONS:
        existing = (await db.execute(
            select(models.Permission).where(models.Permission.codename == perm_data["codename"])
        )).scalar_one_or_none()
        if not existing:
            db.add(models.Permission(**perm_data))
    await db.commit()


async def seed_roles(db: AsyncSession):
    """同步系统角色（幂等：不存在则创建，已存在则刷新权限）"""
    for role_data in SYSTEM_ROLES:
        perm_codenames = role_data["permissions"]
        perms = (await db.execute(
            select(models.Permission).where(models.Permission.codename.in_(perm_codenames))
        )).scalars().all()

        existing = (await db.execute(
            select(models.Role).where(models.Role.name == role_data["name"])
        )).scalar_one_or_none()

        if existing:
            # 已存在：刷新权限关联（删旧加新）
            role = existing
            await db.execute(
                models.RolePermission.__table__.delete().where(
                    models.RolePermission.role_id == role.id
                )
            )
        else:
            # 新建角色
            role = models.Role(name=role_data["name"], description=role_data["description"], is_system=True)
            db.add(role)
            await db.flush()

        # 关联权限
        for perm in perms:
            db.add(models.RolePermission(role_id=role.id, permission_id=perm.id))

    await db.commit()


async def get_user_permissions(db: AsyncSession, user: User) -> list[str]:
    """获取用户拥有的所有权限 codename 列表"""
    if user.is_superuser:
        # 超级用户拥有所有权限
        result = await db.execute(select(models.Permission.codename))
        return list(result.scalars().all())

    result = await db.execute(
        select(models.Permission.codename)
        .join(models.RolePermission, models.RolePermission.permission_id == models.Permission.id)
        .join(models.UserRole, models.UserRole.role_id == models.RolePermission.role_id)
        .where(models.UserRole.user_id == user.id)
    )
    return list(set(result.scalars().all()))


async def seed_default_roles_for_existing_users(db: AsyncSession):
    """为所有无角色的存量用户自动分配"普通用户"角色（幂等）"""
    from app.modules.auth.models import User
    default_role = (await db.execute(
        select(models.Role).where(models.Role.name == "普通用户")
    )).scalar_one_or_none()
    if not default_role:
        return

    # 查出所有无角色的用户
    users_with_role = (await db.execute(
        select(models.UserRole.user_id).distinct()
    )).scalars().all()
    stmt = select(User.id)
    if users_with_role:
        stmt = stmt.where(User.id.notin_(users_with_role))
    users_without_role = (await db.execute(stmt)).scalars().all()

    for uid in users_without_role:
        db.add(models.UserRole(user_id=uid, role_id=default_role.id))
    if users_without_role:
        await db.flush()


def require_permission(codename: str):
    """FastAPI 依赖：检查当前用户是否具有指定权限

    用法：
        @router.get("/projects")
        async def list_projects(
            db=Depends(get_db),
            user=Depends(get_current_user),
            _=Depends(require_permission("project.view")),
        ):
    """
    async def _check(
        db: AsyncSession = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        if current_user.is_superuser:
            return True
        permissions = await get_user_permissions(db, current_user)
        if codename not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要 {codename}",
            )
        return True

    return _check
