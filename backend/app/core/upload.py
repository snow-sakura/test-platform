"""文件上传工具"""
import os
import uuid
from pathlib import Path

import aiofiles

from app.config import settings


async def upload_file(file_content: bytes, filename: str, sub_dir: str) -> str:
    """保存文件到 media/<sub_dir>/ 目录，返回相对路径"""
    upload_dir = Path(settings.MEDIA_ROOT) / sub_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = os.path.splitext(filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)

    return str(file_path)


async def delete_file(file_path: str) -> None:
    """删除文件"""
    path = Path(file_path)
    if path.exists():
        path.unlink()


def get_file_url(file_path: str) -> str:
    """获取文件的可访问 URL"""
    if not file_path:
        return ""
    # file_path 是 media/xxx/yyy.jpg 格式
    return f"/{file_path}"
