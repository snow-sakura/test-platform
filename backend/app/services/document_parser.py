"""多格式文档解析服务：支持 PDF/DOCX/MD/YAML/CSV

PDF 解析支持乱码检测与 OCR 降级（macOS Quartz PDF 生成的 PDF 缺少 ToUnicode CMap 时自动降级 Tesseract OCR）
"""
from __future__ import annotations

import io
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    import yaml
except ImportError:
    yaml = None

try:
    import pandas as pd
except ImportError:
    pd = None


def _has_valid_chinese(text: str, min_ratio: float = 0.15) -> bool:
    """检测文本是否包含足够的有效中文字符

    如果 CJK 统一汉字（一-鿿）在非空白字符中的比例低于 min_ratio 且文本长度 >= 50，
    判定为乱码或非中文文本。
    """
    if not text or len(text) < 10:
        return True  # 短文本不做判定
    non_space_chars = [c for c in text if not c.isspace()]
    if not non_space_chars:
        return True
    cjk_count = sum(1 for c in non_space_chars if '一' <= c <= '鿿')
    ratio = cjk_count / len(non_space_chars)
    if ratio < min_ratio and len(non_space_chars) >= 50:
        return False
    return True


def _parse_pdf(content: bytes, filename: str = "") -> str:
    """解析 PDF 文档，检测到乱码时降级 OCR（需系统安装 tesseract）"""
    if fitz is None:
        raise ImportError("PyMuPDF (fitz) 未安装，请执行: pip install PyMuPDF")

    doc = fitz.open(stream=content, filetype="pdf")
    text_parts = []
    needs_ocr = False

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_text = page.get_text()

        # 检测当前页是否乱码
        if page_text and not _has_valid_chinese(page_text):
            needs_ocr = True
            break  # 有一页乱码则全部降级 OCR
        text_parts.append(page_text)

    doc.close()

    if needs_ocr:
        return _ocr_pdf(content)
    return "\n\n".join(text_parts)


def _ocr_pdf(content: bytes) -> str:
    """使用 Tesseract OCR 识别 PDF（通过 pdf2image 转为图片）"""
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError:
        raise ImportError(
            "OCR 降级需要安装: pip install pdf2image pytesseract\n"
            "以及系统依赖: brew install tesseract tesseract-lang poppler"
        )

    images = convert_from_bytes(content, dpi=200)
    text_parts = []
    for img in images:
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        text_parts.append(text)
    return "\n\n".join(text_parts)


def _parse_docx(content: bytes, filename: str = "") -> str:
    """解析 DOCX 文档"""
    if DocxDocument is None:
        raise ImportError("python-docx 未安装，请执行: pip install python-docx")

    doc = DocxDocument(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _parse_markdown(content: bytes, filename: str = "") -> str:
    """解析 Markdown 文档（直接返回文本）"""
    return content.decode("utf-8")


def _parse_yaml(content: bytes, filename: str = "") -> str:
    """解析 YAML 文档"""
    if yaml is None:
        raise ImportError("PyYAML 未安装，请执行: pip install pyyaml")

    data = yaml.safe_load(content)
    if isinstance(data, dict):
        return yaml.dump(data, allow_unicode=True, default_flow_style=False)
    return str(data)


def _parse_csv(content: bytes, filename: str = "") -> str:
    """解析 CSV 文档"""
    if pd is None:
        raise ImportError("pandas 未安装，请执行: pip install pandas")

    df = pd.read_csv(io.BytesIO(content))
    return df.to_string(index=False)


# 解析器映射表
PARSERS = {
    "pdf": _parse_pdf,
    "docx": _parse_docx,
    "md": _parse_markdown,
    "yaml": _parse_yaml,
    "csv": _parse_csv,
}


def parse_document(file_content: bytes, filename: str = "", file_type: str = "") -> str:
    """解析文档内容为纯文本

    Args:
        file_content: 文件二进制内容
        filename: 原始文件名（用于日志）
        file_type: 文件类型（pdf/docx/md/yaml/csv）

    Returns:
        解析后的纯文本内容

    Raises:
        ValueError: 不支持的文档类型
    """
    parser = PARSERS.get(file_type)
    if not parser:
        raise ValueError(f"不支持的文档类型: {file_type}")

    return parser(file_content, filename)
