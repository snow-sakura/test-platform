"""ChromaDB 向量数据库服务：文档分块、向量化存储与相似性检索"""
from __future__ import annotations

import re
import uuid
from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings as app_settings

CHROMA_DIR = Path(app_settings.MEDIA_ROOT).parent / "chroma_db"

# ONNX 模型缓存路径（用于检查模型是否已下载）
_ONNX_MODEL_DIR = Path.home() / ".cache" / "chroma" / "onnx_models" / "all-MiniLM-L6-v2"


def _check_onnx_model() -> None:
    """检查 ONNX 嵌入模型是否就绪，未就绪时给出下载指引"""
    required = [
        "onnx/model.onnx", "onnx/tokenizer.json", "onnx/config.json",
        "onnx/vocab.txt", "onnx/special_tokens_map.json", "onnx/tokenizer_config.json",
    ]
    missing = [f for f in required if not (_ONNX_MODEL_DIR / f).exists()]
    if not missing:
        return

    msg = (
        "ChromaDB 嵌入模型未下载。由于网络限制（国内无法访问 HuggingFace S3），"
        "请运行以下命令手动下载：\n\n"
        "    cd backend && source .venv/bin/activate\n"
        "    python scripts/download_onnx_model.py\n\n"
        f"缺失文件：{', '.join(missing)}"
    )
    raise RuntimeError(msg)


class RAGService:
    """ChromaDB 向量数据库服务封装"""

    def __init__(self) -> None:
        # 首次初始化时检查 ONNX 模型是否就绪
        _check_onnx_model()

        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    # ---- 集合管理 ----

    def create_collection(self, name: str) -> None:
        """创建 Chroma 集合"""
        self._client.create_collection(name=name)

    def delete_collection(self, name: str) -> None:
        """删除 Chroma 集合"""
        try:
            self._client.delete_collection(name)
        except ValueError:
            pass

    def get_collection(self, name: str):
        """获取集合对象"""
        return self._client.get_collection(name)

    # ---- 文档写入 ----

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """将文本按句边界分割为固定大小的块

        Args:
            chunk_size: 每块最大字符数
            overlap: 相邻块重叠字符数

        Returns:
            文本块列表
        """
        if not text:
            return []

        sentences = re.split(r"(?<=[.!?\n])\s*", text)
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks: list[str] = []
        current = ""

        for sentence in sentences:
            if len(current) + len(sentence) <= chunk_size:
                current += sentence + " "
            else:
                if current:
                    chunks.append(current.strip())
                if len(sentence) > chunk_size:
                    for i in range(0, len(sentence), chunk_size - overlap):
                        chunks.append(sentence[i : i + chunk_size])
                    current = ""
                else:
                    current = sentence + " "

        if current:
            chunks.append(current.strip())

        if overlap > 0 and len(chunks) > 1:
            overlapped = [chunks[0]]
            for i in range(1, len(chunks)):
                prev = overlapped[-1]
                if len(prev) > overlap:
                    chunks[i] = prev[-overlap:] + chunks[i]
                overlapped.append(chunks[i])
            chunks = overlapped

        return chunks

    def add_documents(
        self,
        collection_name: str,
        texts: list[str],
        metadata_list: list[dict] | None = None,
    ) -> list[str]:
        """将文本块写入向量集合"""
        collection = self._client.get_collection(collection_name)
        ids = [str(uuid.uuid4()) for _ in texts]
        collection.add(documents=texts, ids=ids, metadatas=metadata_list)
        return ids

    # ---- 检索 ----

    def query_documents(
        self,
        collection_name: str,
        query: str,
        n_results: int = 5,
    ) -> list[str]:
        """检索最相关的文档片段"""
        try:
            collection = self._client.get_collection(collection_name)
            results = collection.query(query_texts=[query], n_results=n_results)
            if results["documents"]:
                return results["documents"][0]
            return []
        except ValueError:
            return []

    def get_document_count(self, collection_name: str) -> int:
        """获取集合中的文档数"""
        try:
            collection = self._client.get_collection(collection_name)
            return collection.count()
        except ValueError:
            return 0


_instance: RAGService | None = None


def get_rag_service() -> RAGService:
    """获取 RAGService 单例"""
    global _instance
    if _instance is None:
        _instance = RAGService()
    return _instance
