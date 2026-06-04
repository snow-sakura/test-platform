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
| V3.0 | 知识库 & 系统设置（ChromaDB/RAG/飞书通知/热更新） | ✅ 已完成 |
| V3.5 | 接口测试模块 | 📋 待开发 |
| V4.0 | UI 自动化测试模块 | 📋 待开发 |
| V4.5 | APP 自动化测试模块 | 📋 待开发 |
| V5.0 | AI 智能模式 + 数据工厂 + AI 评测师 | 📋 待开发 |

> 详细需求文档见 `ai_doc/03_迭代版本需求文档/`
> 详细提示词文档见 `ai_doc/04_迭代提示词文档/`

---

## 当前版本：V3.0 知识库 & 系统设置

### 范围
- 用户认证模块（JWT 登录/注册/Token 刷新/个人资料）
- 首页门户（8 张导航卡片 + Layout 布局）
- 项目管理（Project CRUD）
- 文档管理（多格式上传/解析/OCR/查看/删除）
- AI 测试管理（测试点提取/测试用例生成/异步任务/Excel导出）
- 知识库（ChromaDB 向量库/文档分块/RAG 检索）
- 系统设置（LLM 配置/飞书通知/运行时热更新）

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

### 后端任务（Phase 1：文档管理）
- [x] Document ORM 模型（project_id/filename/file_path/file_type/content/uploaded_at）
- [x] 文档上传 API（multipart/form-data，类型校验：pdf/docx/md/yaml/csv）
- [x] DocumentParser 服务（PyMuPDF/pdf2image+Tesseract/python-docx/pyyaml/pandas）
- [x] CJK 乱码检测 + OCR 降级策略
- [x] 文档查看/删除 API

### 前端任务（Phase 1：文档管理）
- [x] Documents 组件（Upload Dragger + Table + Modal 预览）
- [x] 项目详情页改为 Tabs 布局（基本信息 + 文档管理）
- [x] 侧边栏启用"AI用例生成"菜单，指向项目管理

### 后端任务（Phase 2：AI 测试管理）
- [x] TestPoint 模型（项目/文档外键、优先级/分类/确认状态）
- [x] TestCase 模型（项目/测试点外键、用例编号 TC-{tp_id}-{seq}）
- [x] TaskBatch 模型（任务类型/状态/进度/错误信息）
- [x] 测试点 CRUD API + AI 提取端点
- [x] 测试用例 CRUD API + AI 生成端点
- [x] 任务批次 API（列表/详情/取消）
- [x] LLMService（LiteLLM 统一接口，extract_test_points / generate_test_cases）
- [x] TaskProcessor（独立 AsyncSession 异步任务，逐个文档/测试点 try-catch）
- [x] ExcelExporter（openpyxl，蓝色表头/自动换行/冻结首行）
- [x] 知识库 RAG 上下文注入（query_documents → LLM 增强）

### 前端任务（Phase 2：AI 测试管理）
- [x] TestPoints 组件（优先级/分类/状态 Tag，AI 提取按钮，行选择）
- [x] TestCases 组件（用例编号/步骤详情弹窗/导出 Excel）
- [x] BatchTracker 组件（3 秒轮询/进度条/状态变化通知/取消）
- [x] 项目详情页 Tabs 增加：测试点/测试用例/任务追踪

### 后端任务（Phase 3：知识库 & 系统设置）
- [x] KnowledgeBase/KnowledgeDocument ORM 模型（chroma_collection_name）
- [x] 知识库 CRUD API + ChromaDB 集合同步
- [x] 知识库文档上传 API（解析→分块→向量化写入 chroma）
- [x] SystemSettings ORM 模型（key-value，唯一键约束）
- [x] 系统设置 CRUD API（upsert + 热更新）
- [x] RAGService（ChromaDB PersistentClient，分块/写入/检索）
- [x] ConfigSync（运行时配置热更新）
- [x] FeishuService（异步任务完成通知）
- [x] 数据库迁移：三张新表（knowledge_bases/knowledge_documents/system_settings）

### 前端任务（Phase 3：知识库 & 系统设置）
- [x] KnowledgeBases 组件（卡片列表/新建/展开查看文档/上传文档）
- [x] Settings 页面（LLM 配置 + 飞书通知两个 Tab）
- [x] 侧边栏启用配置中心菜单，指向 /settings
- [x] 项目详情页 Tabs 增加：知识库

---

## 开发日志

### 2026-06-03 V1.0 初版 + FastAPI 迁移完成
- **后端迁移**：Django 4.2 + DRF → FastAPI 0.136 + SQLAlchemy 2.0（async）
- **数据库切换**：SQLite → MySQL 9.6.0（`testplate` 数据库，utf8mb4）
- **API 兼容**：保持 DRF 兼容的响应格式（分页、日期格式、status_display），前端零改动
- **异步架构**：asyncmy 异步 MySQL 驱动 + uvicorn ASGI 服务器
- **迁移工具**：Alembic 自动迁移管理

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
- **侧边栏**：启用"AI用例生成"菜单项
- **迁移**：Alembic 自动迁移 237e90162b2f 已应用

### 2026-06-03 Phase 0：数据库迁移 & 项目更名
- **数据库迁移**：迁移至 testplate 新库，所有表迁移（projects/users/refresh_token_blacklist）
- **项目更名**：项目正式更名为 TestPlate（代码/配置/文档/前端品牌统一更新）
- **旧库清理**：删除旧数据库中的项目表（还原为非此项目版本）
- **权限修复**：MySQL GRANT ALL PRIVILEGES ON testplate.* TO 'snow'@'localhost'
- **Alembic 对齐**：stamp + upgrade head 修复部分迁移状态

### 2026-06-03 V1.0 用户认证模块 + 登录问题修复
- **用户认证 API**：基于 python-jose + passlib 的 JWT 认证系统（8 个端点）
- **前端认证**：登录/注册/个人资料页面 + Zustand auth-store + Axios 拦截器
- **国际化路由**：next-intl middleware 实现 `/zh-cn/*` / `/en/*` 自动语言检测与跳转
- **问题修复**：
  - 修复缺失 `User` 类型定义导致的 TypeScript 编译错误
  - 修复根路径 `/` 返回 404（添加 middleware 自动重定向到 locale 前缀路径）
  - 修复 i18n JSON 中重复 `home` 键导致的翻译丢失问题
  - 修复登录失败无任何提示的静默错误（catch 块补全错误消息展示）

### 2026-06-04 数据流修复：组件间状态协调
- **问题**：项目详情页 Tabs 组件间数据流断裂 — Documents 上传后不通知 TestPoints，TestPoints 选择的 IDs 不传递给 TestCases
- **Documents.tsx**：新增 `onDocumentsChange` 回调，上传/删除文档后自动通知父组件最新 documentIds
- **TestPoints.tsx**：新增 `onSelectionChange` 回调，选中测试点时同步将 IDs 上报给父组件
- **ProjectDetailPage**：新增 `documentIds` 状态协调，连接 Documents → TestPoints → TestCases 数据链
- **ProjectFormModal.tsx**：修复 `destroyOnHidden` → `destroyOnClose`，`await onSuccess()` 确保刷新完成后关闭
- **KnowledgeBases**：移除未使用的 `projectId` prop（知识库为全局资源，后端模型无 project_id 字段）

### 2026-06-04 ChromaDB ONNX 嵌入模型国内网络修复
- **问题**：ChromaDB 的 ONNX 嵌入模型默认从 AWS S3 下载，在国内网络超时导致知识库上传文档 500 错误
- **修复**：使用 `HF_ENDPOINT=https://hf-mirror.com` 从国内 HuggingFace 镜像下载 all-MiniLM-L6-v2 模型
- **目录结构**：模型文件必须放在 `~/.cache/chroma/onnx_models/all-MiniLM-L6-v2/onnx/` 子目录（ChromaDB 的 ONNXMiniLM_L6_V2 类硬编码路径）
- **便捷脚本**：新增 `backend/scripts/download_onnx_model.py`，方便用户自行下载
- **错误处理**：RAGService 初始化时检查模型存在性，缺失时提示用户运行下载脚本

### 2026-06-04 全量代码审查与修复（Day 2）
- **llm_service.py**：修复 Prompt 模板双花括号 `{{"title":...}}` → `{"title":...}`（普通字符串中 `{{` 输出就是 `{{`，LLM 看到双花括号示例可能输出非法 JSON 导致 `json.loads()` 失败）；删除 `_build_rag_context` 死代码（定义但从未调用）
- **main.py**：修复 CORS `allow_origins=["*"]` + `allow_credentials=True` 冲突（浏览器忽略 credentialed 请求），改为显式 `localhost:3000` 源列表
- **auth/api.py**：`/users` 接口添加 `Depends(get_current_user)` 鉴权；`refresh_token` 添加 `int(user_id)` 异常处理；`change_password` 改用 `db.flush()` 保持一致性
- **auth/dependencies.py**：`get_current_user` 添加 `int(user_id)` try/except
- **auth/crud.py**：`create_user`/`update_user`/`blacklist_token` 改用 `db.flush()` 代替 `db.commit()`，避免与 `get_db` 的自动提交冲突
- **knowledge_bases/api.py**：ChromaDB 同步调用（`create_collection`/`delete_collection`/`add_documents`）使用 `asyncio.to_thread` 避免阻塞事件循环
- **task_processor.py**：每次进度更新后加 `await db.commit()`，让 API 端能实时看到进度（原 `db.flush()` 在任务结束前不可见）；`_query_rag_context` 中同步 `rag.query_documents` 使用 `asyncio.to_thread`
- **BatchTracker.tsx**：轮询间隔改用 `loadBatches()`（带状态变化通知），修复轮询时无通知的 bug
- **TestPoints.tsx**：`handleDelete`/`handleVerify`/`handleSave` 添加 try/catch 错误处理 + 用户提示
- **TestCases.tsx**：`handleDelete`/`handleSave` 添加 try/catch 错误处理
- **KnowledgeBases.tsx**：`handleCreate`/`handleDelete`/`handleUpload` 添加 try/catch 错误处理
- **Topbar.tsx**：修复语言切换仅调用 `setLanguage` + `router.refresh()` 但不切换 URL locale 的问题，改为替换 pathname 前缀触发 next-intl middleware 加载对应语言；移除未使用的 `SettingOutlined` 导入
- **package.json**：添加 `dayjs` 为显式依赖（之前依赖 antd 的传递依赖）

