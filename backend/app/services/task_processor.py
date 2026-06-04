"""异步任务处理器：在后台执行 AI 提取/生成任务

所有后台任务使用独立数据库会话，避免与请求级会话冲突
单个文档/测试点处理失败不阻断整体流程
"""
from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def extract_test_points_task(
    batch_id: int,
    document_ids: list[int],
    knowledge_base_ids: list[int] | None = None,
) -> None:
    """后台任务：AI 提取测试点"""
    from app.database import AsyncSessionLocal
    from app.modules.documents.crud import get_document as get_doc
    from app.modules.task_batches.crud import (
        get_batch, update_batch_progress,
        update_batch_status,
    )
    from app.modules.test_points.crud import create_test_point as create_tp
    from app.services.llm_service import extract_test_points as llm_extract

    async with AsyncSessionLocal() as db:
        try:
            batch = await get_batch(db, batch_id)
            if not batch:
                logger.error("批次 %s 不存在", batch_id)
                return

            await update_batch_status(db, batch, "RUNNING")
            await db.commit()

            # 查询 RAG 上下文（如果关联了知识库）
            rag_context = None
            if knowledge_base_ids:
                rag_context = await _query_rag_context(
                    db, knowledge_base_ids, "测试点提取"
                )

            total = len(document_ids)
            completed = 0

            for doc_id in document_ids:
                try:
                    doc = await get_doc(db, doc_id)
                    if not doc or not doc.content:
                        logger.warning("文档 %s 不存在或内容为空", doc_id)
                        completed += 1
                        continue

                    # 调用 LLM 提取测试点
                    points = await llm_extract(doc.content, rag_context)

                    # 写入数据库
                    for point in points:
                        await create_tp(
                            db,
                            project_id=batch.project_id,
                            document_id=doc_id,
                            title=point.get("title", ""),
                            description=point.get("description"),
                            priority=point.get("priority", "MEDIUM"),
                            category=point.get("category"),
                        )

                    completed += 1
                    await update_batch_progress(db, batch_id, completed, total)
                    await db.commit()  # 立即提交，让 API 端能看到进度更新

                except Exception as e:
                    logger.error("文档 %s 提取测试点失败: %s", doc_id, e)
                    completed += 1
                    await update_batch_progress(db, batch_id, completed, total)
                    await db.commit()  # 失败也提交，更新进度

            # 标记完成
            batch = await get_batch(db, batch_id)
            await update_batch_status(db, batch, "COMPLETED")
            await db.commit()
            logger.info("测试点提取任务完成: batch_id=%s", batch_id)

        except Exception as e:
            logger.error("测试点提取任务失败: batch_id=%s, error=%s", batch_id, e)
            try:
                batch = await get_batch(db, batch_id)
                if batch:
                    await update_batch_status(db, batch, "FAILED", error_message=str(e))
                    await db.commit()
            except Exception:
                pass


async def generate_test_cases_task(
    batch_id: int,
    test_point_ids: list[int],
    knowledge_base_ids: list[int] | None = None,
) -> None:
    """后台任务：AI 生成测试用例"""
    from app.database import AsyncSessionLocal
    from app.modules.task_batches.crud import (
        get_batch, update_batch_progress,
        update_batch_status,
    )
    from app.modules.test_cases.crud import create_test_case as create_tc
    from app.modules.test_points.crud import get_test_point
    from app.services.llm_service import generate_test_cases as llm_generate

    async with AsyncSessionLocal() as db:
        try:
            batch = await get_batch(db, batch_id)
            if not batch:
                return

            await update_batch_status(db, batch, "RUNNING")
            await db.commit()

            # 查询 RAG 上下文
            rag_context = None
            if knowledge_base_ids:
                rag_context = await _query_rag_context(
                    db, knowledge_base_ids, "测试用例 测试点 功能测试 质量保证"
                )

            total = len(test_point_ids)
            completed = 0

            for tp_id in test_point_ids:
                try:
                    tp = await get_test_point(db, tp_id)
                    if not tp:
                        logger.warning("测试点 %s 不存在", tp_id)
                        completed += 1
                        continue

                    # 构建测试点数据
                    tp_data = {
                        "title": tp.title,
                        "description": tp.description or "",
                        "priority": tp.priority,
                        "category": tp.category or "",
                    }

                    # 查询该测试点的精确 RAG 上下文（回退策略）
                    tp_rag_context = rag_context
                    if not tp_rag_context and knowledge_base_ids:
                        tp_rag_context = await _query_rag_context(
                            db, knowledge_base_ids, f"{tp.title} {tp.description or ''}"
                        )

                    # 调用 LLM 生成用例
                    cases = await llm_generate(tp_data, tp_rag_context)

                    # 写入数据库
                    for idx, case in enumerate(cases):
                        await create_tc(
                            db,
                            project_id=batch.project_id,
                            test_point_id=tp_id,
                            title=case.get("title", ""),
                            precondition=case.get("precondition"),
                            steps=case.get("steps", []),
                            expected_result=case.get("expected_result"),
                            priority=case.get("priority", "MEDIUM"),
                            case_type=case.get("case_type"),
                            case_number=f"TC-{tp_id}-{idx + 1}",
                        )

                    completed += 1
                    await update_batch_progress(db, batch_id, completed, total)
                    await db.commit()

                except Exception as e:
                    logger.error("测试点 %s 生成用例失败: %s", tp_id, e)
                    completed += 1
                    await update_batch_progress(db, batch_id, completed, total)
                    await db.commit()

            batch = await get_batch(db, batch_id)
            await update_batch_status(db, batch, "COMPLETED")
            await db.commit()
            logger.info("测试用例生成任务完成: batch_id=%s", batch_id)

        except Exception as e:
            logger.error("测试用例生成任务失败: batch_id=%s, error=%s", batch_id, e)
            try:
                batch = await get_batch(db, batch_id)
                if batch:
                    await update_batch_status(db, batch, "FAILED", error_message=str(e))
                    await db.commit()
            except Exception:
                pass


async def _query_rag_context(
    db, knowledge_base_ids: list[int], query_text: str
) -> str | None:
    """查询 RAG 知识库获取相关上下文"""
    try:
        from app.modules.knowledge_bases.crud import get_knowledge_base
        from app.services.rag_service import get_rag_service

        rag = get_rag_service()
        context_parts = []

        for kb_id in knowledge_base_ids:
            kb = await get_knowledge_base(db, kb_id)
            if not kb:
                continue
            results = await asyncio.to_thread(rag.query_documents, kb.chroma_collection_name, query_text, 3)
            context_parts.extend(results)

        return "\n\n".join(context_parts) if context_parts else None
    except Exception as e:
        logger.warning("RAG 知识库查询失败: %s", e)
        return None
