"""AI 评测师 - API 路由"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission

from .crud import (
    create_dify_config, create_message, create_session, delete_dify_config,
    delete_session, get_active_dify_config, get_dify_config,
    get_dify_configs, get_session, get_session_messages, get_user_sessions,
    update_dify_config, update_session, update_session_conversation,
)
from .schemas import (
    ChatRequest, DifyConfigCreate, DifyConfigResponse, DifyConfigUpdate,
    DifyTestResult, MessageResponse, SessionCreate, SessionResponse,
    SessionUpdate,
)
from .services import DifyClient

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-evaluator",
    dependencies=[Depends(get_current_user)],
    tags=["ai-evaluator"],
)


def _get_dify_client(config):
    """创建 Dify 客户端"""
    return DifyClient(api_url=config.api_url, api_key=config.api_key)


# ====== Dify 配置 ======

@router.get("/configs", response_model=list[DifyConfigResponse])
async def list_configs(db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_eval.view"))):
    """获取 Dify 配置列表"""
    configs = await get_dify_configs(db)
    return [DifyConfigResponse.model_validate(c) for c in configs]


@router.post("/configs", response_model=DifyConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_config(data: DifyConfigCreate, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_eval.create"))):
    """创建 Dify 配置"""
    config = await create_dify_config(db, data.model_dump())
    return DifyConfigResponse.model_validate(config)


@router.put("/configs/{config_id}", response_model=DifyConfigResponse)
async def update_config(
    config_id: int, data: DifyConfigUpdate, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_eval.edit")),
):
    """更新 Dify 配置"""
    config = await get_dify_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    config = await update_dify_config(db, config, data.model_dump(exclude_unset=True))
    return DifyConfigResponse.model_validate(config)


@router.delete("/configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_eval.delete"))):
    """删除 Dify 配置"""
    config = await get_dify_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    await delete_dify_config(db, config)


@router.post("/configs/{config_id}/test", response_model=DifyTestResult)
async def test_config(config_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_permission("ai_eval.edit"))):
    """测试 Dify 连接"""
    config = await get_dify_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    client = _get_dify_client(config)
    success, message = await client.test_connection()
    return DifyTestResult(success=success, message=message)


# ====== 会话 ======

@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    _=Depends(require_permission("ai_eval.view")),
):
    """获取用户会话列表"""
    sessions = await get_user_sessions(db, current_user.id)
    result = []
    for s in sessions:
        resp = SessionResponse.model_validate(s)
        resp.message_count = len(s.messages) if s.messages else 0
        result.append(resp)
    return result


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    _=Depends(require_permission("ai_eval.create")),
):
    """创建新会话"""
    session = await create_session(db, current_user.id, data.title)
    return SessionResponse.model_validate(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_eval.delete")),
):
    """删除会话"""
    session = await get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    await delete_session(db, session)


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def retrieve_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_eval.view")),
):
    """获取会话详情"""
    session = await get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    resp = SessionResponse.model_validate(session)
    resp.message_count = len(session.messages) if session.messages else 0
    return resp


@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_existing_session(
    session_id: str,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_eval.edit")),
):
    """更新会话（修改标题等）"""
    session = await get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    session = await update_session(db, session, data.model_dump(exclude_unset=True))
    return SessionResponse.model_validate(session)


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    session_id: str, db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("ai_eval.view")),
):
    """获取会话消息列表"""
    session = await get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = await get_session_messages(db, session.id)
    return [MessageResponse.model_validate(m) for m in messages]


# ====== 对话 ======

@router.post("/chat")
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    _=Depends(require_permission("ai_eval.create")),
):
    """发送消息（非流式）"""
    session = await get_session(db, data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    # 获取启用的 Dify 配置
    config = await get_active_dify_config(db)
    if not config:
        raise HTTPException(status_code=400, detail="未配置 Dify 或未启用任何配置")

    # 保存用户消息
    await create_message(db, session.id, "user", data.query, session.conversation_id)

    # 发送到 Dify
    client = _get_dify_client(config)
    result = await client.chat_message(
        query=data.query,
        user=f"user-{current_user.id}",
        conversation_id=session.conversation_id,
    )

    # 保存 assistant 回复
    answer = result.get("answer", "") or result.get("error", "服务暂时不可用")
    conv_id = result.get("conversation_id")
    msg_id = result.get("message_id")

    await create_message(db, session.id, "assistant", answer, conv_id, msg_id)

    # 更新会话的 conversation_id
    if conv_id and not session.conversation_id:
        await update_session_conversation(db, session, conv_id)

    return {"answer": answer, "conversation_id": conv_id, "message_id": msg_id}


@router.post("/chat/stream")
async def chat_stream(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    _=Depends(require_permission("ai_eval.create")),
):
    """发送消息（SSE 流式返回）"""
    session = await get_session(db, data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    config = await get_active_dify_config(db)
    if not config:
        raise HTTPException(status_code=400, detail="未配置 Dify 或未启用任何配置")

    # 保存用户消息
    await create_message(db, session.id, "user", data.query, session.conversation_id)

    client = _get_dify_client(config)

    async def generate():
        full_answer = ""
        conv_id = None
        msg_id = None

        async for chunk in client.chat_message_stream(
            query=data.query,
            user=f"user-{current_user.id}",
            conversation_id=session.conversation_id,
        ):
            event = chunk.get("event", "")
            if event == "message":
                full_answer += chunk.get("answer", "")
                conv_id = chunk.get("conversation_id", conv_id)
                msg_id = chunk.get("message_id", msg_id)
                yield f"data: {json.dumps({'answer': chunk.get('answer', '')}, ensure_ascii=False)}\n\n"
            elif event == "message_end":
                conv_id = chunk.get("conversation_id", conv_id)
                msg_id = chunk.get("message_id", msg_id)
                yield f"data: {json.dumps({'event': 'done'})}\n\n"
            elif event == "error" or "error" in chunk:
                yield f"data: {json.dumps({'event': 'error', 'error': chunk.get('error', '')})}\n\n"
                return

        # 保存完整回复
        if full_answer:
            try:
                async with async_session() as db_session:
                    await create_message(db_session, session.id, "assistant", full_answer, conv_id, msg_id)
                    if conv_id and not session.conversation_id:
                        await update_session_conversation(db, session, conv_id)
            except Exception as e:
                logger.warning(f"保存消息失败: {e}")

    return StreamingResponse(generate(), media_type="text/event-stream")
