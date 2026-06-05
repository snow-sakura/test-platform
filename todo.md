# TestPlate 测试管理平台

## 项目概述

TestPlate 是一个 AI 驱动的全栈测试管理平台，基于 `ai_doc/` 需求文档开发。

- **后端**：FastAPI 0.111+ + SQLAlchemy 2.0 (async) + Alembic + asyncmy
- **前端**：Next.js (App Router) + Ant Design + Zustand + next-intl
- **数据库**：MySQL 8.0+（本地 `testplate`，utf8mb4）
- **版本管理**：[迭代计划](./ai_doc/03_迭代版本需求文档/)

---

## 版本迭代计划

| 版本 | 内容 | 状态 |
|------|------|------|
| V1.0 | 基础平台（用户认证 + 首页门户 + 项目管理） | ✅ 已完成 |
| V1.5 | 文档管理模块（多格式上传/解析/OCR） | ✅ 已完成 |
| V2.0 | AI 测试管理（测试点/测试用例/异步任务/Excel导出） | ✅ 已完成 |
| V3.0 | 知识库 & 系统设置（ChromaDB RAG/LLM热更新/飞书通知） | ✅ 已完成 |
| V3.5 | 接口测试模块（API项目/集合树/请求执行/环境变量/定时任务） | ✅ 已完成 |
| V4.0 | UI 自动化测试模块（页面对象/元素/脚本/套件/执行） | ✅ 已完成 |
| V4.5 | APP 自动化测试模块（设备管理/元素捕获/场景编排） | ✅ 已完成 |
| V5.0 | AI 智能模式 + 数据工厂 + AI 评测师 + AI 用例生成 | ✅ 已完成 |
| V5.5 | 性能优化 & 模块补齐（CI/CD + 性能测试 + 全量代码审查） | ✅ 已完成 |
| **V6.0** | **平台增强与运维能力** | **📋 规划中** |

---

## 当前版本：V5.5 性能优化 & 模块补齐

### V5.5 范围
- 全量代码审查与性能优化（P0 错误修复 + P1 数据库性能 + P2 前端渲染）
- CI/CD 模块（GitLab/GitHub/Jenkins 管道管理 + 管道步骤可视化）
- 性能测试模块（JMeter 集成、压测场景编排、报告可视化）

### V5.5 已完成内容
- [x] P0 错误修复 — Ant Table `rawData.some` 崩溃、异常泄露/静默吞没
- [x] P1 数据库性能 — 132 个索引补充、N+1 查询修复、并行化、批量提交
- [x] P2 前端渲染 — ECharts useMemo、CI/CD reduce、30+ catch 块修复、rowKey 稳定
- [x] 前端/后端构建验证 — `npm run build` + 后端导入零错误
- [x] 文档同步更新 — README.md / todo.md / CLAUDE.md

### V6.0 规划方向

| 方向 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| RBAC 细粒度权限系统 | 全局角色 + 权限点 + 资源级授权 | P0 | ✅ 已实现基础版 |
| CI/CD 集成 | GitLab/GitHub/Jenkins 管道管理 + Webhook | P1 | 🚧 部分完成 |
| 性能测试模块 | JMeter 集成 + 压测场景编排 + 报告可视化 | P2 | 🚧 部分完成 |
| 国际化全面覆盖 | 消除硬编码中文标签，统一走 next-intl | P0 | 📋 待完善 |
| Docker 部署 | Docker Compose + 一键启动脚本 | P1 | 📋 规划中 |
| 移动端适配 | 响应式布局、触摸优化 | P3 | 📋 规划中 |

---

## 开发日志

### 2026-06-05 P0-P2 全量性能优化 & 错误修复
- **P0 错误修复**：修复 Ant Table `rawData.some is not a function` 崩溃（4 处 `results ?? data` 模式 + 3 处嵌套 `|| []` fallback）
- **P0 异常处理**：修复后端知识库/数据工厂/测试管理/文档模块的异常泄露和静默吞没问题
- **P1 数据库性能**：补充 132 个外键索引（跨 20+ models.py）、修复 RBAC N+1 查询（list_roles/list_users 批量化）、`execution_summary` 4 次独立 COUNT → GROUP BY 单次查询、Dashboard 6 串行查询 → `asyncio.gather` 并行、Excel 导入逐行 flush → `db.add_all()` 批量提交
- **P2 前端渲染**：`reports/page.tsx` 8 个 ECharts 选项 → `useMemo` 包裹、`ci-cd/page.tsx` 3 次 filter → 单次 reduce、30+ 处静默 `.catch(() => {})` → `console.warn`、3 处 AI Smart 表格索引 rowKey → 稳定字段 key
- **构建验证**：`npm run build` + 后端导入零错误

### 2026-06-05 V5.0 全功能补齐完成
- **项目管理补齐**：ProjectMember 数据模型、成员 CRUD API、角色权限控制、前端成员管理 Tab
- **AI 用例生成补齐**：业务需求全局列表/编辑/删除、生成用例 CRUD + 批量状态更新、从需求直接创建生成任务
- **AI 评测师补齐**：会话详情 GET 端点、会话更新 PUT 端点
- **全量审计**：15/18 个后端模块完成覆盖，仅 AI 用例生成和 AI 评测师有少量端点缺口，已全部补齐
- **构建验证**：`npm run build` 零错误

### 2026-06-05 V5.0 AI用例生成 + 配置中心
- **AI 用例生成模块**：全新 8 个 ORM 模型（ra_documents/ra_analyses/ra_business_requirements/ra_generated_test_cases/ra_ai_model_configs/ra_prompt_configs/ra_generation_configs/ra_tasks）
- **后端**：services.py（AIModelService + 后台生成工作流 + SSE 流式推送 + final_test_cases 解析）
- **前端**：5 个标签页（需求分析/生成用例/任务列表+详情/AI模型配置/提示词配置/生成行为配置）
- **配置中心扩展**：/settings 页面新增 AI 模型配置、提示词配置、生成行为配置 3 个 Tab
- **统一通知管理**：UnifiedNotificationConfig 数据模型 + 7 个 API 端点

### 2026-06-05 V5.0 Phase 4 已有模块缺口补齐
- **UI 自动化**：新增 ~13 个端点（截图/操作记录/套件加减用例/元素管理/脚本步骤/用例复制批量执行）
- **APP 自动化**：新增 ~5 个端点（执行停止 WebSocket/包管理/图片分类更新）
- **test-management**：新增 ~3 个端点（计划执行/分配评审人/报告模板更新）
- **前端页面**：UI自动化报告页、APP自动化包管理页
- **数据工厂**：场景视图模式（8 张场景卡片）+ 变量函数助手 Drawer

### 2026-06-04 V4.5 APP 自动化测试模块
- **数据模型**：6 个表 — AppPackage/AppDevice/AppElement/AppImageCategory/AppScript/AppTestCase
- **后端**：CRUD + API（设备管理/元素捕获/脚本编排/截图上传/执行记录）
- **前端**：仪表盘/设备管理/元素捕获/脚本管理/执行记录/测试用例/包管理
- **迁移**：Alembic 自动迁移

### 2026-06-04 V4.0 UI 自动化测试模块
- **数据模型**：9 个表 — UIProject/UIPageObject/UIElement/UIScript/UIScriptStep/UITestCase/UITestSuite/UIExecution/UIExecutionRecord
- **后端**：CRUD + API（页面对象/元素管理/脚本编辑/用例组织/套件执行/Pytest 集成）
- **前端**：仪表盘/项目管理/页面对象/元素管理/脚本编辑/用例管理/测试套件/执行记录/环境/定时任务/通知管理
- **迁移**：Alembic 自动迁移

### 2026-06-04 V3.5 接口测试模块（完整实现）
- **数据模型**：9 个表 — ApiProject/ApiCollection/ApiRequest/ApiTestSuite/ApiEnvironment/ApiRequestHistory/ApiScheduledTask/ApiNotificationConfig/ApiNotificationLog
- **后端**：CRUD + API（项目/集合树/请求执行/套件/环境/历史/定时任务/通知/仪表盘） + VariableResolver + RequestExecutor + NotificationSender + APScheduler
- **前端**：9 个页面（仪表盘/API项目/接口管理（核心编辑器）/自动化/环境/历史/定时任务/通知管理/通知日志）
- **迁移**：Alembic 自动迁移

### 2026-06-04 Phase 3：知识库 & 系统设置
- **知识库模块**：KnowledgeBase/KnowledgeDocument 模型 + CRUD + ChromaDB 向量化
- **RAGService**：ChromaDB PersistentClient 封装（分块/chunk_size=500/overlap=50/检索）
- **系统设置**：SystemSettings 模型 + upsert API + config_sync 运行时热更新
- **飞书通知**：异步任务完成时 feishu_service.send_feishu_notification
- **配置扩展**：config.py 新增 LLM_API_KEY/LLM_MODEL/LLM_BASE_URL/FEISHU_WEBHOOK_URL
- **前端**：KnowledgeBases 组件（卡片列表/上传文档/展开文档表）、Settings 页面（LLM + 飞书 Tab）
- **迁移**：Alembic 自动迁移 1e60fb8d6987，三张新表已应用

### 2026-06-04 Phase 2：AI 测试管理
- **数据模型**：TestPoint/TestCase/TaskBatch 三张 ORM 表 + Project 关系绑定
- **LLMService**：基于 LiteLLM 的统一大模型接口（extract_test_points / generate_test_cases）
- **TaskProcessor**：独立 AsyncSession 异步后台任务，逐文档/逐测试点 try-catch
- **ExcelExporter**：openpyxl 导出，蓝色表头/自动列宽/冻结首行
- **前端**：TestPoints/TestCases/BatchTracker 三个组件 + 项目 Tabs 集成
- **迁移**：Alembic 自动迁移 653c7d19dbec 已应用

### 2026-06-04 Phase 1：文档管理模块
- **Document 模型**：SQLAlchemy ORM（project_id/file_path/content/uploaded_at）
- **DocumentParser**：PyMuPDF/pdf2image+Tesseract OCR/python-docx/pyyaml/pandas
- **CJK 乱码检测**：CJK 字符比例 < 15% 且长度 ≥ 50 时自动降级 Tesseract OCR
- **前端 Documents 组件**：Upload Dragger + Table 列表 + Modal 预览
- **项目详情页**：重构为 Ant Design Tabs 布局（基本信息 + 文档管理）
- **迁移**：Alembic 自动迁移 237e90162b2f 已应用

### 2026-06-03 V1.0 初版 + FastAPI 迁移完成
- **后端迁移**：Django 4.2 + DRF → FastAPI 0.136 + SQLAlchemy 2.0（async）
- **数据库切换**：SQLite → MySQL 9.6.0（`testplate` 数据库，utf8mb4）
- **API 兼容**：保持 DRF 兼容的响应格式（分页、日期格式、status_display），前端零改动
- **异步架构**：asyncmy 异步 MySQL 驱动 + uvicorn ASGI 服务器
- **迁移工具**：Alembic 自动迁移管理

### 2026-06-03 V1.0 用户认证模块 + 登录问题修复
- **用户认证 API**：基于 python-jose + passlib 的 JWT 认证系统（8 个端点）
- **前端认证**：登录/注册/个人资料页面 + Zustand auth-store + Axios 拦截器
- **国际化路由**：next-intl middleware 实现 `/zh-cn/*` / `/en/*` 自动语言检测与跳转

### 2026-06-04 全量代码审查与修复（多个问题修复详见 git log）
- llm_service.py Prompt 模板修复、main.py CORS 修复
- auth/api.py 鉴权修复、knowledge_bases ChromaDB 异步修复
- task_processor.py 进度提交修复、多个前端组件错误处理补充
- Topbar.tsx 语言切换修复
