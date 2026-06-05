"""CI/CD 集成 - API 路由

Webhook 接收 / API Token 管理 / 管道追踪 / 配置模板生成
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.rbac.service import require_permission

from . import crud
from .dependencies import generate_token, get_ci_api_token, hash_token
from .schemas import (
    CiApiTokenCreate,
    CiApiTokenCreateResponse,
    CiApiTokenResponse,
    CiConfigTemplateRequest,
    CiConfigTemplateResponse,
    CiPipelineDetailResponse,
    CiPipelineResponse,
    CiWebhookConfig,
    CiWebhookEventResponse,
    PipelineStepResponse,
)
from .services import execute_pipeline, parse_github_webhook, parse_gitlab_webhook, parse_jenkins_webhook

UTC8 = timezone(timedelta(hours=8))

router = APIRouter(tags=["ci_cd"])


# ==================== Webhook 接收（API Token 认证） ====================


async def _handle_webhook(
    ci_type: str,
    request: Request,
    body: dict[str, Any],
    db: AsyncSession,
) -> dict:
    """通用的 Webhook 处理逻辑

    1. 解析 Webhook 事件 → 提取管道元信息
    2. 创建 CiPipeline + CiPipelineSteps
    3. 记录 CiWebhookEvent
    4. 启动后台任务 execute_pipeline
    """
    # 解析事件
    headers = dict(request.headers)
    if ci_type == "gitlab":
        meta = parse_gitlab_webhook(body)
    elif ci_type == "github":
        meta = parse_github_webhook(headers, body)
    elif ci_type == "jenkins":
        meta = parse_jenkins_webhook(body)
    else:
        raise HTTPException(status_code=400, detail=f"不支持的 CI 类型: {ci_type}")

    # 从请求 body 获取模块配置
    webhook_config = CiWebhookConfig(**body)
    module_configs = webhook_config.module_configs

    # 如果没有指定模块配置，无法执行
    if not module_configs:
        raise HTTPException(status_code=400, detail="未指定测试模块配置 (module_configs)")

    # 创建管道
    pipeline_data = {
        "ci_type": ci_type,
        "external_pipeline_id": meta.get("external_pipeline_id"),
        "external_project": meta.get("external_project"),
        "external_ref": meta.get("external_ref"),
        "status": "pending",
        "trigger_event": meta.get("event_type", "webhook"),
        "commit_sha": meta.get("commit_sha"),
        "commit_message": meta.get("commit_message"),
        "author": meta.get("author"),
        "total_steps": len(module_configs),
    }
    pipeline = await crud.create_pipeline(db, pipeline_data)
    pipeline_id = pipeline.id

    # 创建管道步骤
    for i, config in enumerate(module_configs):
        step_data = {
            "pipeline_id": pipeline_id,
            "step_order": i + 1,
            "module_type": config.get("module_type", "api_testing"),
            "module_config": config,
            "status": "pending",
        }
        await crud.create_pipeline_step(db, step_data)

    # 记录 Webhook 事件
    event_data = {
        "ci_type": ci_type,
        "event_type": meta.get("event_type"),
        "pipeline_id": pipeline_id,
        "source_payload": body,
        "headers": {k: v for k, v in headers.items() if k.startswith("x-") or k in ("user-agent",)},
        "ip_address": request.client.host if request.client else None,
    }
    await crud.create_webhook_event(db, event_data)
    await db.commit()

    # 后台执行管道
    import asyncio
    asyncio.create_task(execute_pipeline(pipeline_id))

    return {
        "success": True,
        "pipeline_id": pipeline_id,
        "message": f"管道已创建，共 {len(module_configs)} 个步骤",
        "status": "pending",
    }


@router.post("/ci/webhook/gitlab")
async def gitlab_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_ci_api_token),
):
    """GitLab Webhook 接收端点

    支持 GitLab Push / Merge Request 等事件。
    CI 配置参考：
      curl -X POST https://host/api/ci/webhook/gitlab \\
        -H "Authorization: Bearer <token>" \\
        -H "Content-Type: application/json" \\
        -d '{"module_configs": [{"module_type": "api_testing", "suite_id": 1}]}'
    """
    body = await request.json()
    return await _handle_webhook("gitlab", request, body, db)


@router.post("/ci/webhook/github")
async def github_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_ci_api_token),
):
    """GitHub Webhook 接收端点

    支持 Push / Pull Request 等事件。
    """
    body = await request.json()
    return await _handle_webhook("github", request, body, db)


@router.post("/ci/webhook/jenkins")
async def jenkins_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_ci_api_token),
):
    """Jenkins Webhook 接收端点"""
    body = await request.json()
    return await _handle_webhook("jenkins", request, body, db)


# ==================== API Token 管理（JWT + RBAC） ====================


@router.post("/ci/api-tokens", response_model=CiApiTokenCreateResponse)
async def create_api_token(
    data: CiApiTokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _=Depends(require_permission("ci_cd.edit")),
):
    """创建 CI API Token（仅创建时返回明文）"""
    raw_token = generate_token()
    token_hash = hash_token(raw_token)

    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.now(UTC8) + timedelta(days=data.expires_in_days)

    token = await crud.create_api_token(db, {
        "name": data.name,
        "token": token_hash,
        "user_id": current_user.id,
        "expires_at": expires_at,
    })
    await db.commit()

    return CiApiTokenCreateResponse(
        id=token.id,
        name=token.name,
        token=raw_token,
        expires_at=token.expires_at,
    )


@router.get("/ci/api-tokens", response_model=list[CiApiTokenResponse])
async def list_api_tokens(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.view")),
):
    """获取 API Token 列表"""
    tokens = await crud.get_api_tokens(db)
    return [CiApiTokenResponse.model_validate(t) for t in tokens]


@router.delete("/ci/api-tokens/{token_id}")
async def delete_api_token(
    token_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.edit")),
):
    """删除 API Token"""
    token = await crud.get_api_token_by_id(db, token_id)
    if not token:
        raise HTTPException(status_code=404, detail="Token 不存在")
    await crud.delete_api_token(db, token)
    await db.commit()
    return {"success": True}


# ==================== 管道追踪 ====================


@router.get("/ci/pipelines", response_model=dict)
async def list_pipelines(
    ci_type: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.view")),
):
    """获取管道列表（分页）"""
    skip = (page - 1) * page_size
    return await crud.get_pipelines(db, ci_type, status, skip, page_size)


@router.get("/ci/pipelines/{pipeline_id}", response_model=CiPipelineDetailResponse)
async def get_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.view")),
):
    """获取管道详情（含步骤）"""
    pipeline = await crud.get_pipeline(db, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="管道不存在")

    steps = await crud.get_pipeline_steps(db, pipeline_id)
    result = CiPipelineDetailResponse.model_validate(pipeline)
    result.steps = [PipelineStepResponse.model_validate(s) for s in steps]
    return result


@router.post("/ci/pipelines/{pipeline_id}/rerun")
async def rerun_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.create")),
):
    """重新执行管道"""
    pipeline = await crud.get_pipeline(db, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="管道不存在")

    # 重置管道状态
    now = datetime.now(UTC8)
    await crud.update_pipeline(db, pipeline_id, {
        "status": "pending",
        "passed_steps": 0,
        "failed_steps": 0,
        "started_at": None,
        "completed_at": None,
        "duration_ms": None,
    })

    # 重置所有步骤状态
    steps = await crud.get_pipeline_steps(db, pipeline_id)
    for step in steps:
        await crud.update_pipeline_step(db, step.id, {
            "status": "pending",
            "result": None,
            "started_at": None,
            "completed_at": None,
            "duration_ms": None,
            "error_message": None,
        })

    await db.commit()

    # 后台执行
    import asyncio
    asyncio.create_task(execute_pipeline(pipeline_id))

    return {"success": True, "pipeline_id": pipeline_id, "message": "管道已重新执行"}


# ==================== Webhook 事件记录 ====================


@router.get("/ci/webhook-events", response_model=dict)
async def list_webhook_events(
    ci_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.view")),
):
    """获取 Webhook 事件列表"""
    skip = (page - 1) * page_size
    events, total = await crud.get_webhook_events(db, ci_type, skip, page_size)
    return {
        "count": total,
        "results": [CiWebhookEventResponse.model_validate(e) for e in events],
    }


# ==================== CI 配置模板生成 ====================


@router.post("/ci/config-template", response_model=CiConfigTemplateResponse)
async def generate_config_template(
    data: CiConfigTemplateRequest,
    _=Depends(get_current_user),
    __=Depends(require_permission("ci_cd.view")),
):
    """生成 CI 配置文件模板"""
    steps_json = json.dumps(data.module_configs, indent=4) if data.module_configs else json.dumps([
        {"module_type": "api_testing", "suite_id": 1},
        {"module_type": "ui_auto", "suite_id": 1},
    ], indent=4)

    if data.ci_type == "gitlab":
        content = _generate_gitlab_template(data.platform_url, data.token_name, data.branch, steps_json)
        filename = ".gitlab-ci.yml"
    elif data.ci_type == "github":
        content = _generate_github_template(data.platform_url, data.token_name, data.branch, steps_json)
        filename = "testplate-ci.yml"
    elif data.ci_type == "jenkins":
        content = _generate_jenkins_template(data.platform_url, data.token_name, steps_json)
        filename = "Jenkinsfile"
    else:
        raise HTTPException(status_code=400, detail=f"不支持的 CI 类型: {data.ci_type}")

    return CiConfigTemplateResponse(ci_type=data.ci_type, filename=filename, content=content)


def _generate_gitlab_template(url: str, token_var: str, branch: str, steps_json: str) -> str:
    """生成 .gitlab-ci.yml 模板"""
    return f"""# TestPlate CI/CD 配置
# 由 TestPlate 平台自动生成

stages:
  - test

testplate-run:
  stage: test
  image: alpine/curl:latest
  only:
    - {branch}
  script:
    - apk add --no-cache curl
    - >
      curl -X POST "{url}/api/ci/webhook/gitlab"
      -H "Authorization: Bearer ${{{token_var}}}"
      -H "Content-Type: application/json"
      -d '{steps_json}'
"""


def _generate_github_template(url: str, token_var: str, branch: str, steps_json: str) -> str:
    """生成 GitHub Actions 模板"""
    return f"""# TestPlate CI/CD 配置
# 由 TestPlate 平台自动生成

name: TestPlate CI

on:
  push:
    branches: [{branch}]
  pull_request:
    branches: [{branch}]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger TestPlate
        run: |
          curl -X POST "{url}/api/ci/webhook/github" \\
            -H "Authorization: Bearer ${{{{ secrets.{token_var} }}}}" \\
            -H "Content-Type: application/json" \\
            -d '{steps_json}'
"""


def _generate_jenkins_template(url: str, token_var: str, steps_json: str) -> str:
    """生成 Jenkinsfile 模板"""
    return f"""// TestPlate CI/CD 配置
// 由 TestPlate 平台自动生成

pipeline {{
    agent any

    environment {{
        TESTPLATE_URL = '{url}'
        TESTPLATE_TOKEN = credentials('{token_var}')
    }}

    stages {{
        stage('TestPlate Execution') {{
            steps {{
                sh '''
                    curl -X POST "${{TESTPLATE_URL}}/api/ci/webhook/jenkins" \\
                        -H "Authorization: Bearer ${{TESTPLATE_TOKEN}}" \\
                        -H "Content-Type: application/json" \\
                        -d '{steps_json}'
                '''
            }}
        }}
    }}

    post {{
        success {{
            echo 'TestPlate 测试全部通过'
        }}
        failure {{
            echo 'TestPlate 测试存在失败'
        }}
    }}
}}
"""
