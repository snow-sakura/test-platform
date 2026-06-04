"""系统配置热更新：写入 SystemSettings 后同步到运行时配置"""
from app.config import settings


def update_runtime_config(key: str, value: str) -> None:
    """将数据库配置热更新到运行时 settings 对象

    支持热更新的 key：
        - LLM_API_KEY / LLM_MODEL / LLM_BASE_URL
        - FEISHU_WEBHOOK_URL
    """
    if key == "LLM_API_KEY":
        settings.LLM_API_KEY = value
    elif key == "LLM_MODEL":
        settings.LLM_MODEL = value
    elif key == "LLM_BASE_URL":
        settings.LLM_BASE_URL = value
    elif key == "FEISHU_WEBHOOK_URL":
        settings.FEISHU_WEBHOOK_URL = value
