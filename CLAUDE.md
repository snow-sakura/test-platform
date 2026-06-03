# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

TestHub 是一个 AI 驱动的全栈测试管理平台。当前版本 V1.0（基础平台），已完成首页门户 + 项目管理 CRUD。

- **后端**：FastAPI + SQLAlchemy 2.0 (async) + Alembic + asyncmy + MySQL
- **前端**：Next.js 14 (App Router) + Ant Design 5 + Zustand 4 + next-intl 3 + Axios + TypeScript

## 常用命令

### 后端（backend/）

```bash
source .venv/bin/activate   # 必须：激活虚拟环境
python run.py               # 启动服务器（8000 端口，热重载）
alembic revision --autogenerate -m "信息"  # 生成迁移
alembic upgrade head        # 应用迁移
alembic downgrade -1        # 回滚一步
```

### 前端（frontend/）

```bash
npm run dev    # 开发服务器（3000 端口）
npm run build  # 构建
```

### 同时开发

两个终端并行：
- `cd backend && source .venv/bin/activate && python run.py`
- `cd frontend && npm run dev`

前端通过 Next.js rewrites（next.config.mjs）将 `/api/*` 代理到 `http://127.0.0.1:8000/api/*`，无需配置 CORS。

## 项目结构

```
test-platform/
├── backend/               # FastAPI 后端
│   ├── app/main.py        # 入口（lifespan + CORS + 路由注册）
│   ├── app/config.py      # pydantic-settings（从 .env 读取）
│   ├── app/database.py    # async engine + session + get_db 依赖
│   ├── app/pagination.py  # DRF 兼容分页工具（PaginatedResponse）
│   ├── app/modules/       # 业务模块
│   │   └── projects/      # ── 项目管理（models/crud/schemas/api/filters）
│   ├── alembic/           # 数据库迁移
│   ├── .env               # DATABASE_URL（MySQL 连接）
│   └── run.py             # uvicorn 启动入口
├── frontend/              # Next.js 前端
│   └── src/
│       ├── app/[locale]/  # 国际化路由页面
│       ├── lib/           # Axios 实例 + API 封装
│       ├── stores/        # Zustand 状态
│       └── components/    # Layout + 业务组件
├── ai_doc/                # 需求文档（18 功能模块 × 7 迭代版本）
├── todo.md                # 版本路线 + 开发日志
└── CLAUDE.md
```

## 后端核心模式

### 新增业务模块步骤

在 `backend/app/modules/` 下创建 `<module>/`，包含：
```
models.py    # SQLAlchemy ORM（继承 app.database.Base）
schemas.py   # Pydantic 模型（创建/更新/响应三个类）
crud.py      # 异步数据库操作（接收 AsyncSession 参数）
api.py       # FastAPI APIRouter（使用 Depends(get_db)）
filters.py   # 查询条件组装（返回 Select 语句）
```

然后在 `app/main.py` 中注册路由并在 `alembic/env.py` 导入模型即可。

**⚠️ 路由尾斜杠约定**：FastAPI 路由定义**不能使用尾斜杠**（如 `/projects` 而非 `/projects/`），因为 Next.js rewrites 代理到后端时会自动去掉尾斜杠，导致 404。

### 异步数据流

```
API 请求 → FastAPI Route (async) → CRUD (async) → SQLAlchemy Select → asyncmy → MySQL
                                                    ↑
                                              Depends(get_db) 注入 AsyncSession
```

所有数据库操作使用 `await db.execute()` 和 `await db.commit()`，会话由 `get_db` 依赖自动管理（yield/finally 确保关闭）。

### 响应格式（DRF 兼容）

```json
{
  "count": 42,
  "next": "/api/projects/?page=2&page_size=20",
  "previous": null,
  "results": [...]
}
```

`app/pagination.py` 的 `paginate()` 函数封装了计数、排序、偏移、next/previous URL 构造。

### 枚举字段的显示值映射

SQLAlchemy 用 `Enum` 存数据库（如 `"active"`），Pydantic Response 通过 `model_post_init` 自动填充 `status_display`：

```python
def model_post_init(self, __context) -> None:
    self.status_display = STATUS_DISPLAY_MAP.get(self.status, self.status.value)
```

日期通过 `@field_serializer` 格式化为 `YYYY-MM-DD` 和 `YYYY-MM-DD HH:MM:SS`。

## 前端核心模式

- **路由**：所有页面在 `[locale]` 下，middleware.ts 处理语言前缀（`/zh-cn/*`、`/en/*`）
- **API**：Axios 实例（`src/lib/request.ts`）baseURL 为空，通过 Next.js proxy 请求
- **API 封装**：`src/lib/api/` 下每模块一文件，TypeScript 类型与请求函数放在一起
- **状态**：Zustand + persist（localStorage key: `app-store`），管理 `sidebarCollapsed`、`language`
- **i18n**：next-intl v3，JSON 在 `messages/`，命名空间组织（`nav`/`home`/`common`/`project`）
- **UI**：Ant Design 组件，避用原生 HTML，Layout 在 `components/layout/`
- **'use client'**：交互/状态/路由跳转的页面级组件需要；纯展示组件不需要

## 数据库 & 迁移

- **数据库**：MySQL 8.0+，`testhub`，utf8mb4，连接信息在 `.env` 的 `DATABASE_URL` 中
- **Alembic**：同步驱动用 `pymysql`，异步驱动用 `asyncmy`
- **迁移流程**：改模型 → `alembic revision --autogenerate -m "xx"` → 检查生成的脚本 → `alembic upgrade head`
- **新模型注册**：在 `alembic/env.py` 顶部 `import` 模型类即可被 autogenerate 检测到

## 迭代路线

完整计划见 `ai_doc/03_迭代版本需求文档/` 和 `todo.md`。
