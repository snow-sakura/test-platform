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
| **后端** | FastAPI 0.136+ + SQLAlchemy 2.0 (async) + Alembic + asyncmy | 异步高并发 API，自动生成 Swagger 文档 |
| **前端** | Next.js 14 (App Router) + Ant Design 5 + Zustand 4 + next-intl 3 | 国际化 SPA，TypeScript 全栈类型安全 |
| **数据库** | MySQL 8.0+ (utf8mb4) | 关系型数据库 |
| **任务调度** | APScheduler (AsyncIOScheduler) | 无需 Redis 的轻量异步调度 |
| **AI** | OpenAI 兼容 API + LiteLLM | 需求分析、用例生成、Browser-Use 智能代理 |
| **向量检索** | ChromaDB (PersistentClient) | 知识库文档向量化与语义检索 |

---

## 功能概览

### ✅ 已实现

| 版本 | 核心内容 | 状态 |
|------|---------|------|
| **V1.0** | 用户认证系统（JWT 登录/注册/登出/Token 刷新）、首页门户（8 张导航卡片）、项目管理（CRUD/分页/搜索/筛选/排序）、国际化（zh-cn/en）、响应式布局 | ✅ |
| **V1.5** | 文档管理模块（多格式上传/解析/PDF+OCR/DOCX/YAML/CSV/MD） | ✅ |
| **V2.0** | AI 测试管理（测试点提取/测试用例生成/异步任务/Excel 导出） | ✅ |
| **V3.0** | 知识库（ChromaDB RAG 向量检索）、系统设置（LLM 热更新/飞书通知） | ✅ |
| **V3.5** | 接口测试模块（API 项目/集合树/请求执行/环境变量/定时任务/通知） | ✅ |
| **V4.0** | UI 自动化测试模块（页面对象/元素/脚本/用例/套件/Pytest 集成） | ✅ |
| **V4.5** | APP 自动化测试模块（设备管理/元素捕获/场景编排/截图上传） | ✅ |
| **V5.0** | AI 智能模式（Browser-Use 代理/报告/PDF）、数据工厂、AI 评测师（Dify/SSE）、AI 用例生成（LLM 全流程/SSE 进度）、项目成员管理 | ✅ |
| **V5.5** | CI/CD 集成（GitLab/GitHub/Jenkins Webhook + 管道管理）、性能测试（JMeter 集成 + 报告可视化）、全量性能优化 & 错误修复 | ✅ |

### 📋 进行中 / 规划中

| 版本 | 核心内容 | 状态 |
|------|---------|------|
| **V6.0** | RBAC 细粒度权限系统（已完成）、国际化全覆盖、Docker 部署 | 🚧 进行中 |

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
│   │   ├── core/               # 通用基础设施（AI 抽象层/Excel/调度/上传/WS）
│   │   └── modules/            # 业务模块（22 个）
│   │       ├── auth/           # 用户认证（JWT + bcrypt）
│   │       ├── projects/       # 项目管理
│   │       ├── rbac/           # RBAC 角色权限
│   │       ├── dashboard/      # 全局仪表盘
│   │       ├── documents/      # 文档管理（上传/解析/OCR）
│   │       ├── test_points/    # 测试点管理
│   │       ├── test_cases/     # 测试用例管理
│   │       ├── test_management/# 测试管理（套件/版本/评审/执行/报告）
│   │       ├── task_batches/   # 异步任务批次
│   │       ├── knowledge_bases/# 知识库（ChromaDB RAG）
│   │       ├── settings/       # 系统设置（LLM/飞书热更新）
│   │       ├── api_testing/    # 接口测试（HTTP/WS/环境/定时任务）
│   │       ├── ui_automation/  # UI 自动化（PO/元素/脚本/套件）
│   │       ├── app_automation/ # APP 自动化（设备/元素/场景）
│   │       ├── ai_smart_mode/  # AI 智能模式（Browser-Use）
│   │       ├── ai_evaluator/   # AI 评测师（Dify 集成）
│   │       ├── data_factory/   # 数据工厂（场景生成/变量函数）
│   │       ├── requirement_analysis/ # AI 用例生成
│   │       ├── notification_configs/ # 通知配置
│   │       ├── ci_cd/          # CI/CD 集成
│   │       └── performance_testing/  # 性能测试
│   ├── alembic/                # 数据库迁移
│   ├── .env                    # 环境变量
│   └── run.py                  # uvicorn 启动入口
├── frontend/                   # Next.js 前端
│   └── src/
│       ├── app/[locale]/       # 国际化路由页面（18+ 个页面目录）
│       ├── components/         # Layout / 项目组件 / AI 组件
│       ├── lib/                # Axios 实例 + API 封装（按模块分文件）
│       ├── stores/             # Zustand 状态管理
│       └── middleware.ts       # 国际化路由中间件
├── ai_doc/                     # 需求文档（18 功能模块 × 7 迭代版本）
├── docs/                       # 研发详细文档/需求说明
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
| V1.5 | 文档管理模块（多格式上传/解析/OCR） | ✅ 已完成 |
| V2.0 | AI 测试管理（测试点提取/用例生成/异步任务/Excel导出） | ✅ 已完成 |
| V3.0 | 知识库 & 系统设置（ChromaDB RAG/LLM热更新/飞书通知） | ✅ 已完成 |
| V3.5 | 接口测试模块（API项目/集合树/请求执行/环境变量/定时任务） | ✅ 已完成 |
| V4.0 | UI 自动化测试模块（页面对象/元素/脚本/套件/执行） | ✅ 已完成 |
| V4.5 | APP 自动化测试模块（设备管理/元素捕获/场景编排） | ✅ 已完成 |
| V5.0 | AI 智能模式 + 数据工厂 + AI 评测师 + AI 用例生成 | ✅ 已完成 |
| V5.5 | CI/CD 集成 + 性能测试模块 | ✅ 已完成 |
| V6.0 | 平台增强与运维能力（RBAC ✅ / 国际化全覆盖 / Docker / 部署） | 🚧 进行中 |

---

## 许可证

本项目仅供学习和研究使用。
