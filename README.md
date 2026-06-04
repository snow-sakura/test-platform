# TestPlate — AI 驱动的全栈测试管理平台

![Tech Stack](https://img.shields.io/badge/Backend-FastAPI%200.136+-009688?logo=fastapi)
![Tech Stack](https://img.shields.io/badge/Frontend-Next.js%2014-000000?logo=nextdotjs)
![Tech Stack](https://img.shields.io/badge/Database-MySQL%208.0+-4479A1?logo=mysql)
![Tech Stack](https://img.shields.io/badge/AI-OpenAI%20Compatible-412991?logo=openai)

## 项目简介

**TestPlate** 是一个 AI 驱动的全栈测试管理平台，覆盖从测试用例管理、接口测试、UI 自动化到 AI 智能测试的全流程。项目基于 `ai_doc/` 需求文档迭代开发，采用现代化异步架构。

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **后端** | FastAPI + SQLAlchemy 2.0 (async) + Alembic + asyncmy | 异步高并发 API，自动生成 Swagger 文档 |
| **前端** | Next.js 14 (App Router) + Ant Design 5 + Zustand 4 + next-intl 3 | 国际化 SPA，TypeScript 全栈类型安全 |
| **数据库** | MySQL 8.0+ (utf8mb4) | 关系型数据库 |
| **任务调度** | APScheduler (AsyncIOScheduler) | 无需 Redis 的轻量异步调度 |
| **AI** | OpenAI 兼容 API + LangChain | 需求分析、用例生成、智能评测 |

---

## 功能概览

### ✅ 已实现 (V1.0)

- **用户认证系统** — JWT 登录/注册/登出/Token 刷新、个人资料管理、用户管理
- **首页门户** — 8 张功能导航卡片，清晰指引各模块入口
- **项目管理** — 完整的项目 CRUD，支持分页/搜索/筛选/排序
- **国际化** — 中英文双语切换 (zh-cn / en)
- **响应式布局** — 侧边栏 + 顶栏 + 内容区，支持折叠

### 📋 规划中

| 版本 | 核心内容 | 状态 |
|------|---------|------|
| **V1.5** | 测试用例管理、测试套件、评审管理、执行管理、报告与仪表盘 | 待开发 |
| **V2.0** | HTTP/WebSocket 接口测试，含环境变量与定时任务 | 待开发 |
| **V2.5** | Selenium/Playwright UI 自动化测试 | 待开发 |
| **V3.0** | AI 需求分析 → 测试用例生成、AI 评测师对话、80+ 数据工厂工具 | 待开发 |
| **V3.5** | Android APP 自动化测试 (Airtest) | 待开发 |
| **V4.0** | Browser-Use AI 智能模式、统一配置中心、通知系统 | 待开发 |

---

## 快速开始

### 前置条件

- Python 3.11+
- Node.js 20+
- MySQL 8.0+

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# 编辑 .env 配置 DATABASE_URL
python run.py
# → http://127.0.0.1:8000/docs (Swagger 文档)
# → http://127.0.0.1:8000/api/... (API 端点)
```

### 前端

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000 (默认跳转 zh-cn/home)
# → http://localhost:3000/en/home (英文版)
```

前端通过 Next.js rewrites 将 `/api/*` 代理到后端 `http://127.0.0.1:8000/api/*`，**无需配置 CORS**。

---

## 项目结构

```
test-platform/
├── backend/                    # FastAPI 异步后端
│   ├── app/
│   │   ├── main.py             # 应用入口（lifespan, CORS, 路由注册）
│   │   ├── config.py           # pydantic-settings 配置（JWT/数据库/文件上传）
│   │   ├── database.py         # 异步引擎 + Session 依赖
│   │   ├── pagination.py       # DRF 兼容分页工具
│   │   ├── core/               # 通用基础设施
│   │   │   ├── ai/             # AI 提供者抽象层（OpenAI 兼容等）
│   │   │   ├── excel.py        # Excel 导入/导出
│   │   │   ├── scheduler.py    # APScheduler 异步调度
│   │   │   ├── upload.py       # 文件上传工具
│   │   │   └── websocket_manager.py
│   │   └── modules/            # 业务模块
│   │       ├── auth/           # 用户认证（JWT + bcrypt）
│   │       └── projects/       # 项目管理（CRUD + 筛选）
│   ├── alembic/                # 数据库迁移
│   ├── .env                    # 环境变量
│   └── run.py                  # uvicorn 启动入口
├── frontend/                   # Next.js 前端
│   └── src/
│       ├── app/[locale]/       # 国际化路由页面
│       ├── components/layout/  # Layout / Sidebar / Topbar
│       ├── lib/                # Axios 实例 + API 封装
│       ├── stores/             # Zustand 状态管理
│       └── middleware.ts       # 国际化路由中间件
├── ai_doc/                     # 需求文档（18 功能模块 × 7 迭代版本）
├── todo.md                     # 版本路线 + 开发日志
├── CLAUDE.md                   # Claude Code 项目指令
└── README.md                   # 本文档
```

---

## 开发指南

### 数据库迁移

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "变更说明"
alembic upgrade head
```

### 新增业务模块

在 `backend/app/modules/<module>/` 下创建标准 5 文件结构：
- `models.py` — SQLAlchemy ORM 模型
- `schemas.py` — Pydantic 请求/响应模型
- `crud.py` — 异步数据库操作
- `api.py` — FastAPI 路由
- `filters.py` — 查询条件组装

然后在 `main.py` 注册路由，`alembic/env.py` 导入模型即可。

### 国际化

- 中英文消息在 `frontend/messages/zh-cn.json` 和 `frontend/messages/en.json`
- 按命名空间组织（`auth`/`nav`/`home`/`common`/`project` 等）

---

## 版本迭代

| 版本 | 内容 | 状态 |
|------|------|------|
| V1.0 | 基础平台（用户认证 + 首页门户 + 项目管理） | ✅ 已完成 |
| V1.5 | 测试用例与评审体系 | 📋 待开发 |
| V2.0 | 接口测试模块 | 📋 待开发 |
| V2.5 | UI 自动化测试模块 | 📋 待开发 |
| V3.0 | AI 能力（用例生成 + 评测师 + 数据工厂） | 📋 待开发 |
| V3.5 | APP 自动化测试模块 | 📋 待开发 |
| V4.0 | 智能增强（AI 模式 + 配置中心 + 通知） | 📋 待开发 |

---

## 许可证

本项目仅供学习和研究使用。
