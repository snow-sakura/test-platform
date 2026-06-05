"""知识库与知识库文档模型"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KnowledgeBase(Base):
    """RAG 知识库表，关联 ChromaDB 集合"""
    __tablename__ = "knowledge_bases"
    __table_args__ = {"comment": "知识库"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="知识库 ID")
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="知识库名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="知识库描述")
    chroma_collection_name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False, comment="ChromaDB 集合名（UUID 格式）"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )

    # 关联关系
    documents = relationship("KnowledgeDocument", back_populates="knowledge_base",
                             cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<KnowledgeBase(id={self.id}, name='{self.name}')>"


class KnowledgeDocument(Base):
    """知识库文档表"""
    __tablename__ = "knowledge_documents"
    __table_args__ = {"comment": "知识库文档"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, comment="文档 ID")
    knowledge_base_id: Mapped[int] = mapped_column(
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, comment="所属知识库 ID"
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False, comment="文件名")
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False, comment="存储路径")
    file_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="文件类型")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, comment="文本分块数")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="上传时间"
    )

    # 关联关系
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")

    def __repr__(self) -> str:
        return f"<KnowledgeDocument(id={self.id}, filename='{self.filename}')>"
