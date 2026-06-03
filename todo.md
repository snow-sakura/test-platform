# TestHub 测试管理平台

## 项目概述

TestHub 是一个 AI 驱动的全栈测试管理平台，基于 `ai_doc/` 需求文档开发。

- **后端**：FastAPI 0.111+ + SQLAlchemy 2.0 (async) + Alembic + asyncmy
- **前端**：Next.js (App Router) + Ant Design + Zustand + next-intl
- **数据库**：MySQL 8.0+（本地 `testhub`，utf8mb4）
- **版本管理**：[迭代计划](./ai_doc/03_迭代版本需求文档/)

---

## 版本迭代计划

| 版本 | 内容 | 状态 |
|------|------|------|
| V1.0 | 基础平台（用户认证 + 首页门户 + 项目管理） | ✅ 已完成 |
| V1.5 | 测试用例与评审体系 | 📋 待开发 |
| V2.0 | 接口测试模块 | 📋 待开发 |
| V2.5 | UI 自动化测试模块 | 📋 待开发 |
| V3.0 | AI 能力（用例生成 + AI 评测师 + 数据工厂） | 📋 待开发 |
| V3.5 | APP 自动化测试模块 | 📋 待开发 |
| V4.0 | 智能增强（AI 智能模式 + 配置中心 + 通知） | 📋 待开发 |

> 详细需求文档见 `ai_doc/03_迭代版本需求文档/`
> 详细提示词文档见 `ai_doc/04_迭代提示词文档/`

---

## 当前版本：V1.0 基础平台

### 范围
- 用户认证模块（JWT 登录/注册/Token 刷新/个人资料）
- 首页门户（8 张导航卡片 + Layout 布局）
- 项目管理（Project CRUD）

### 后端任务（FastAPI）
- [x] FastAPI 项目初始化（app/config/database/main）
- [x] Project 模型（SQLAlchemy ORM）
- [x] Project CRUD API（异步路由 + Pydantic schemas）
- [x] 分页/筛选/排序（DRF 兼容格式）
- [x] Alembic 数据库迁移 + MySQL 对接
- [x] Swagger 自动文档（`/docs`）
- [x] 用户认证 API（login/register/logout/refresh/profile/users CRUD）
- [x] JWT Token 签发与验证（HS256, access 60min + refresh 7d rotation）
- [x] JWT 鉴权依赖注入（Depends(get_current_user)）
- [x] bcrypt 密码哈希存储
- [x] Refresh Token 黑名单机制

### 前端任务
- [x] Next.js 项目初始化（App Router）
- [x] Ant Design + Zustand + next-intl 集成
- [x] Layout 布局（侧边栏 + 顶栏 + 内容区）
- [x] 首页 8 张导航卡片
- [x] 项目列表页（搜索/筛选/CRUD 弹窗）
- [x] 项目详情页
- [x] 404 / ComingSoon 占位页面
- [x] 国际化中英文配置
- [x] 用户登录页 + 注册页 + 个人资料页
- [x] Axios 请求拦截器（自动注入 Bearer Token + 401 自动刷新）
- [x] Zustand auth-store（用户状态持久化）
- [x] 中英文 locale 路由中间件（next-intl middleware）

---

## 开发日志

### 2026-06-03 V1.0 初版 + FastAPI 迁移完成
- **后端迁移**：Django 4.2 + DRF → FastAPI 0.136 + SQLAlchemy 2.0（async）
- **数据库切换**：SQLite → MySQL 9.6.0（`testhub` 数据库，utf8mb4）
- **API 兼容**：保持 DRF 兼容的响应格式（分页、日期格式、status_display），前端零改动
- **异步架构**：asyncmy 异步 MySQL 驱动 + uvicorn ASGI 服务器
- **迁移工具**：Alembic 自动迁移管理

### 2026-06-03 V1.0 用户认证模块 + 登录问题修复
- **用户认证 API**：基于 python-jose + passlib 的 JWT 认证系统（8 个端点）
- **前端认证**：登录/注册/个人资料页面 + Zustand auth-store + Axios 拦截器
- **国际化路由**：next-intl middleware 实现 `/zh-cn/*` / `/en/*` 自动语言检测与跳转
- **问题修复**：
  - 修复缺失 `User` 类型定义导致的 TypeScript 编译错误
  - 修复根路径 `/` 返回 404（添加 middleware 自动重定向到 locale 前缀路径）
  - 修复 i18n JSON 中重复 `home` 键导致的翻译丢失问题
  - 修复登录失败无任何提示的静默错误（catch 块补全错误消息展示）

