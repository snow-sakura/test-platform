"""文档管理 API 路由：上传、列表、详情、删除"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.upload import delete_file as delete_physical_file
from app.core.upload import upload_file
from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.projects.crud import get_project
from app.modules.rbac.service import require_permission
from app.pagination import PageParams, PaginatedResponse
from app.services.document_parser import parse_document

from .crud import create_document, delete_document, get_document, get_documents
from .schemas import DocumentDetailResponse, DocumentResponse

router = APIRouter(dependencies=[Depends(get_current_user)], tags=["documents"])

# 允许上传的文件类型
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".markdown", ".yaml", ".yml", ".csv"}


@router.post(
    "/projects/{project_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_project_document(
    project_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("document.upload")),
):
    """上传项目文档（支持 PDF/DOCX/MD/YAML/CSV），自动解析内容"""
    # 验证项目存在
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 验证文件类型
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，支持: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 文件类型映射（.md / .markdown 都视为 md）
    file_type_map = {
        ".pdf": "pdf",
        ".docx": "docx",
        ".md": "md",
        ".markdown": "md",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".csv": "csv",
    }
    file_type = file_type_map[ext]

    # 检查文件大小
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"文件过大，最大允许 {settings.MAX_UPLOAD_SIZE // 1024 // 1024}MB")

    # 保存文件到 uploads/ 目录
    file_path = await upload_file(file_content, file.filename or "unnamed", "uploads")

    # 解析文档内容
    content = None
    try:
        content = parse_document(file_content, file.filename or "", file_type)
    except Exception as e:
        # 解析失败不阻断上传，仅记录错误（content 留空）
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("文档解析失败: %s", e)

    # 创建数据库记录
    doc = await create_document(
        db=db,
        project_id=project_id,
        filename=file.filename or "unnamed",
        file_path=file_path,
        file_type=file_type,
        content=content,
    )
    return DocumentResponse.model_validate(doc)


@router.get("/projects/{project_id}/documents", response_model=PaginatedResponse[DocumentResponse])
async def list_project_documents(
    project_id: int,
    page_params: PageParams = Depends(),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("document.view")),
):
    """获取项目下的文档列表"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    return await get_documents(db, project_id, page_params)


@router.get("/projects/{project_id}/documents/{doc_id}", response_model=DocumentDetailResponse)
async def retrieve_document(
    project_id: int,
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("document.view")),
):
    """获取文档详情（含解析后的文本内容）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    doc = await get_document(db, doc_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="文档不存在")
    return DocumentDetailResponse.model_validate(doc)


@router.delete(
    "/projects/{project_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project_document(
    project_id: int,
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_permission("document.delete")),
):
    """删除文档（同时删除物理文件）"""
    project = await get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    doc = await get_document(db, doc_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 删除物理文件
    await delete_physical_file(doc.file_path)

    # 删除数据库记录
    await delete_document(db, doc)
