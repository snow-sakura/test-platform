"""测试共享 fixture 和配置"""
import asyncio
import os
import tempfile
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool
from sqlalchemy.dialects.mysql import LONGTEXT, MEDIUMTEXT, TINYTEXT, DOUBLE
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles

from app.database import Base, get_db
from app.main import app
from app.modules.rbac.service import seed_permissions, seed_roles

# ── MySQL 特有类型 → SQLite 兼容映射 ──────────────────────────────────────


@compiles(LONGTEXT, "sqlite")
def _compile_longtext(element, compiler, **kw):
    return "TEXT"


@compiles(MEDIUMTEXT, "sqlite")
def _compile_mediumtext(element, compiler, **kw):
    return "TEXT"


@compiles(TINYTEXT, "sqlite")
def _compile_tinytext(element, compiler, **kw):
    return "TEXT"


@compiles(DOUBLE, "sqlite")
def _compile_double(element, compiler, **kw):
    return "FLOAT"


# ── 基于文件的测试数据库 ────────────────────────────────────────────────────
TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "testplate_test.sqlite")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """会话级引擎，所有测试共享同一个文件数据库"""
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    eng = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest_asyncio.fixture(autouse=True)
async def setup_database(engine):
    """每个测试函数后删除数据库表（保证隔离），测试前重建"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    # Seed RBAC 权限和角色，使权限校验依赖正常工作
    from sqlalchemy.orm import Session as SyncSession
    async with engine.connect() as conn:
        session = AsyncSession(bind=conn, expire_on_commit=False)
        await seed_permissions(session)
        await seed_roles(session)
        await session.close()
    yield


def make_get_db(engine):
    """创建 get_db 覆盖函数，绑定到指定引擎"""
    async def _get_db() -> AsyncGenerator[AsyncSession, None]:
        async with engine.connect() as conn:
            session = AsyncSession(bind=conn, expire_on_commit=False)
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    return _get_db


@pytest_asyncio.fixture(autouse=True)
async def _setup_dependency_override(engine):
    """每个测试前注入依赖覆盖"""
    app.dependency_overrides[get_db] = make_get_db(engine)
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    """提供测试用的数据库会话"""
    async with engine.connect() as conn:
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await session.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """提供测试用的 HTTP 客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
