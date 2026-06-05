"""知识库管理 API 路由"""
import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.upload import delete_file as delete_physical, upload_file
from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.service import require_permission
from app.pagination import PageParams, PaginatedResponse
from app.services.document_parser import parse_document
from app.services.rag_service import get_rag_service

from .crud import (
    create_knowledge_base, create_knowledge_document, delete_knowledge_base,
    get_knowledge_base, get_knowledge_bases, get_knowledge_documents,
    update_knowledge_base,
)
from .schemas import (
    KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeBaseUpdate,
    KnowledgeDocumentResponse,
)

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["knowledge_bases"])

ALLOWED_KB_EXTENSIONS = {".pdf", ".docx", ".md", ".markdown", ".yaml", ".yml", ".csv"}


@router.get("/knowledge-bases", response_model=PaginatedResponse[KnowledgeBaseResponse])
async def list_knowledge_bases(
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.view")),
):
    """获取所有知识库"""
    return await get_knowledge_bases(db, page_params)


@router.post("/knowledge-bases", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_knowledge_base(
    data: KnowledgeBaseCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.create")),
):
    """创建知识库（同时创建 ChromaDB 集合）"""
    rag = get_rag_service()
    collection_name = str(uuid.uuid4())
    # ChromaDB 同步调用放到线程池执行，避免阻塞事件循环
    await asyncio.to_thread(rag.create_collection, collection_name)

    kb = await create_knowledge_base(
        db,
        name=data.name,
        description=data.description,
        chroma_collection_name=collection_name,
    )
    return KnowledgeBaseResponse.model_validate(kb)


@router.put("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_existing_knowledge_base(
    kb_id: int,
    data: KnowledgeBaseUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.edit")),
):
    """更新知识库"""
    kb = await get_knowledge_base(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    kb = await update_knowledge_base(db, kb, data.model_dump(exclude_unset=True))
    return KnowledgeBaseResponse.model_validate(kb)


@router.delete("/knowledge-bases/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_knowledge_base(
    kb_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.delete")),
):
    """删除知识库（同时删除 ChromaDB 集合）"""
    kb = await get_knowledge_base(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    rag = get_rag_service()
    try:
        await asyncio.to_thread(rag.delete_collection, kb.chroma_collection_name)
    except Exception:
        pass

    await delete_knowledge_base(db, kb)


@router.post(
    "/knowledge-bases/{kb_id}/documents/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_knowledge_document(
    kb_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.create")),
):
    """上传知识库文档（自动解析、分块、向量化）"""
    kb = await get_knowledge_base(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_KB_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")

    file_type_map = {
        ".pdf": "pdf", ".docx": "docx", ".md": "md", ".markdown": "md",
        ".yaml": "yaml", ".yml": "yaml", ".csv": "csv",
    }
    file_type = file_type_map.get(ext, "unknown")

    # 检查文件大小
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"文件过大，最大允许 {settings.MAX_UPLOAD_SIZE // 1024 // 1024}MB")

    # 解析文档内容
    content = parse_document(file_content, file.filename or "", file_type)

    # 保存物理文件
    file_path = await upload_file(file_content, file.filename or "unnamed", "knowledge_base")

    # 分块并向量化到 ChromaDB
    rag = get_rag_service()
    chunks = rag.chunk_text(content, chunk_size=500, overlap=50)
    await asyncio.to_thread(rag.add_documents, kb.chroma_collection_name, chunks)

    # 创建数据库记录
    kd = await create_knowledge_document(
        db,
        knowledge_base_id=kb_id,
        filename=file.filename or "unnamed",
        file_path=file_path,
        file_type=file_type,
        chunk_count=len(chunks),
    )

    return {
        "message": "文档上传成功",
        "chunk_count": len(chunks),
        "document": KnowledgeDocumentResponse.model_validate(kd),
    }


@router.get(
    "/knowledge-bases/{kb_id}/documents",
    response_model=PaginatedResponse[KnowledgeDocumentResponse],
)
async def list_kb_documents(
    kb_id: int,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("knowledgebase.view")),
):
    """获取知识库的文档列表"""
    kb = await get_knowledge_base(db, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    return await get_knowledge_documents(db, kb_id, page_params)
