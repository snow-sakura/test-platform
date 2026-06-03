from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置，从环境变量或 .env 文件读取"""

    # 数据库
    DATABASE_URL: str = "mysql+asyncmy://snow:Wxh123456!@localhost:3306/testhub?charset=utf8mb4"
    DEBUG: bool = True
    APP_NAME: str = "TestHub"
    API_PREFIX: str = "/api"

    # JWT 认证
    JWT_SECRET: str = "testhub-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 文件上传
    MEDIA_ROOT: str = "media"
    MEDIA_URL: str = "/media"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
