"""知识库 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import KnowledgeBase, KnowledgeDocument


# ---- KnowledgeBase CRUD ----

async def get_knowledge_bases(db: AsyncSession) -> list[KnowledgeBase]:
    """获取所有知识库"""
    result = await db.execute(
        select(KnowledgeBase).order_by(KnowledgeBase.created_at.desc())
    )
    return list(result.scalars().all())


async def get_knowledge_base(db: AsyncSession, kb_id: int) -> KnowledgeBase | None:
    """获取单个知识库"""
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == kb_id)
    )
    return result.scalar_one_or_none()


async def create_knowledge_base(
    db: AsyncSession,
    name: str,
    description: str | None = None,
    chroma_collection_name: str = "",
) -> KnowledgeBase:
    """创建知识库"""
    kb = KnowledgeBase(
        name=name,
        description=description,
        chroma_collection_name=chroma_collection_name,
    )
    db.add(kb)
    await db.flush()
    await db.refresh(kb)
    return kb


async def update_knowledge_base(
    db: AsyncSession, kb: KnowledgeBase, data: dict
) -> KnowledgeBase:
    """更新知识库"""
    for field, value in data.items():
        if value is not None:
            setattr(kb, field, value)
    await db.flush()
    await db.refresh(kb)
    return kb


async def delete_knowledge_base(db: AsyncSession, kb: KnowledgeBase) -> None:
    """删除知识库"""
    await db.delete(kb)
    await db.flush()


# ---- KnowledgeDocument CRUD ----

async def get_knowledge_documents(
    db: AsyncSession, kb_id: int
) -> list[KnowledgeDocument]:
    """获取知识库的文档列表"""
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.knowledge_base_id == kb_id)
        .order_by(KnowledgeDocument.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def create_knowledge_document(
    db: AsyncSession,
    knowledge_base_id: int,
    filename: str,
    file_path: str,
    file_type: str,
    chunk_count: int = 0,
) -> KnowledgeDocument:
    """创建知识库文档"""
    kd = KnowledgeDocument(
        knowledge_base_id=knowledge_base_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        chunk_count=chunk_count,
    )
    db.add(kd)
    await db.flush()
    await db.refresh(kd)
    return kd
