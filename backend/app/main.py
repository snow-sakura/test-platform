from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.modules.auth.api import router as auth_router
from app.modules.documents.api import router as documents_router
from app.modules.projects.api import router as projects_router
from app.modules.test_points.api import router as test_points_router
from app.modules.test_cases.api import router as test_cases_router
from app.modules.task_batches.api import router as batches_router
from app.modules.knowledge_bases.api import router as knowledge_bases_router
from app.modules.settings.api import router as settings_router
from app.modules.api_testing.api import router as api_testing_router


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

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
app.include_router(documents_router, prefix=settings.API_PREFIX)
app.include_router(test_points_router, prefix=settings.API_PREFIX)
app.include_router(test_cases_router, prefix=settings.API_PREFIX)
app.include_router(batches_router, prefix=settings.API_PREFIX)
app.include_router(knowledge_bases_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(api_testing_router, prefix=settings.API_PREFIX)
