"""预下载 ChromaDB ONNX 嵌入模型（国内网络使用 HF 镜像）

使用方法：
    source .venv/bin/activate
    python scripts/download_onnx_model.py
"""
import os
import shutil
from pathlib import Path

# 设置 HuggingFace 镜像（国内加速）
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

from huggingface_hub import snapshot_download


def main():
    model_dir = Path.home() / ".cache" / "chroma" / "onnx_models" / "all-MiniLM-L6-v2"
    extracted_dir = model_dir / "onnx"

    # 如果模型已存在且完整，跳过
    if extracted_dir.exists():
        required = [
            "config.json", "model.onnx", "special_tokens_map.json",
            "tokenizer_config.json", "tokenizer.json", "vocab.txt",
        ]
        if all((extracted_dir / f).exists() for f in required):
            print("模型已存在，跳过下载")
            return

    # 清理不完整缓存
    if model_dir.exists():
        shutil.rmtree(model_dir)
    model_dir.mkdir(parents=True)

    print("正在从 hf-mirror.com 下载 all-MiniLM-L6-v2 ONNX 模型...")
    snapshot_download(
        repo_id="sentence-transformers/all-MiniLM-L6-v2",
        local_dir=str(model_dir),
        allow_patterns=[
            "onnx/*",
            "tokenizer.json",
            "config.json",
            "vocab.txt",
            "special_tokens_map.json",
            "tokenizer_config.json",
        ],
        local_dir_use_symlinks=False,  # type: ignore[arg-type]
    )

    # 重组：将 onnx/ 子目录保留（ChromaDB 期望的结构）
    print(f"模型已下载到 {model_dir}")
    for f in os.listdir(extracted_dir):
        print(f"  {f}: {os.path.getsize(extracted_dir / f):,} bytes")


if __name__ == "__main__":
    main()
