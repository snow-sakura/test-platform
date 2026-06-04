from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 创建异步引擎
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)

# 创建异步会话工厂
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
# 后台任务独立会话工厂（task_processor.py 中使用）
AsyncSessionLocal = async_session


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基类"""
    pass


async def get_db():
    """FastAPI 依赖：获取数据库会话，请求成功后自动提交，异常时回滚"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
