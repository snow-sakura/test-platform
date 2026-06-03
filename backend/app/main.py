from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.modules.auth.api import router as auth_router
from app.modules.projects.api import router as projects_router


@asynccontextmanager
async def lifespan(application: FastAPI):
    """管理应用生命周期：启动/关闭数据库连接、调度器"""
    # 启动调度器
    start_scheduler()
    yield
    # 关闭调度器
    shutdown_scheduler()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    # 关闭尾斜杠重定向，避免 Next.js 代理请求时被 307 到后端直连地址
    redirect_slashes=False,
)

# CORS 配置（与 Django corsheaders allow_all_origins 兼容）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 媒体文件静态服务
media_path = Path(settings.MEDIA_ROOT)
media_path.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_path)), name="media")

# 注册路由
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(projects_router, prefix=settings.API_PREFIX)
