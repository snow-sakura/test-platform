"""文档 CRUD 操作"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.pagination import PageParams, PaginatedResponse, paginate

from .models import Document
from .schemas import DocumentResponse


async def get_documents(
    db: AsyncSession, project_id: int, page_params: PageParams
) -> PaginatedResponse[DocumentResponse]:
    """获取项目的文档列表（分页）"""
    query = select(Document).where(Document.project_id == project_id).order_by(Document.uploaded_at.desc())
    return await paginate(db, query, page_params, DocumentResponse, base_url=f"/api/projects/{project_id}/documents")


async def get_document(db: AsyncSession, doc_id: int) -> Document | None:
    """获取单个文档"""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    return result.scalar_one_or_none()


async def create_document(
    db: AsyncSession,
    project_id: int,
    filename: str,
    file_path: str,
    file_type: str,
    content: str | None = None,
) -> Document:
    """创建文档记录"""
    doc = Document(
        project_id=project_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        content=content,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def delete_document(db: AsyncSession, document: Document) -> None:
    """删除文档记录"""
    await db.delete(document)
    await db.flush()
