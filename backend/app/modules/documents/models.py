"""文档模型：项目文档的元信息与解析后的纯文本内容"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Document(Base):
    """项目文档表，存储上传文件的元信息和解析后的纯文本内容"""
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False, comment="原始文件名")
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False, comment="服务端存储路径")
    file_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="文件类型: pdf/docx/md/yaml/csv")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="解析后的纯文本内容")
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False, comment="上传时间"
    )

    # 关联关系
    project = relationship("Project", back_populates="documents")
    test_points = relationship("TestPoint", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, filename='{self.filename}', project_id={self.project_id})>"
