# snow-platform 研发详细说明

> 基于代码仓储全量分析的技术实现文档

---

## 一、项目结构

```
snow-platform/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # 应用入口 + 启动/关闭事件
│   │   ├── api/                       # API 路由层
│   │   │   ├── projects.py            # 项目管理 + 文档管理 API
│   │   │   ├── test_points.py         # 测试点管理 + 异步提取任务
│   │   │   ├── test_cases.py          # 测试用例管理 + 异步生成任务 + Excel 导出
│   │   │   ├── knowledge_bases.py     # 知识库管理 API
│   │   │   ├── settings.py           # 系统设置 API + 运行时配置同步
│   │   │   └── batches.py            # 任务批次查询 + 取消
│   │   ├── core/                      # 核心基础设施
│   │   │   ├── config.py              # Pydantic Settings + .env 加载
│   │   │   └── database.py            # SQLAlchemy 异步引擎 + Session 管理
│   │   ├── models/                    # SQLAlchemy ORM 模型
│   │   │   └── __init__.py            # 8 张表全部定义在此文件
│   │   ├── schemas/                   # Pydantic v2 请求/响应模型
│   │   │   └── __init__.py            # 全部 Schema 定义在此文件
│   │   └── services/                  # 业务逻辑服务层
│   │       ├── document_parser.py     # 多格式文档解析器
│   │       ├── llm_service.py         # LiteLLM 封装
│   │       ├── rag_service.py         # ChromaDB RAG 服务
│   │       ├── feishu_service.py      # 飞书 Webhook 通知
│   │       └── excel_exporter.py      # openpyxl Excel 导出
│   ├── uploads/                       # 项目上传文档存储目录
│   ├── knowledge_base/                # ChromaDB 持久化 + 知识库文档
│   ├── logs/                          # 应用日志
│   ├── alembic/                       # 数据库迁移
│   ├── seed_data.py                   # 种子数据脚本
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── main.ts                    # 入口：Vue 3 + Pinia + Element Plus
    │   ├── App.vue                    # 根组件
    │   ├── router/index.ts            # Vue Router 路由配置
    │   ├── utils/request.ts           # Axios 封装（统一错误处理）
    │   ├── api/                       # API 封装层
    │   │   ├── project.ts             # 项目 + 文档 API
    │   │   ├── test.ts                # 测试点 + 测试用例 + 任务批次 API
    │   │   ├── knowledgeBase.ts       # 知识库 API
    │   │   └── settings.ts            # 系统设置 API
    │   └── views/                     # 页面组件
    │       ├── Layout.vue             # 侧边栏布局
    │       ├── ProjectList.vue        # 项目列表首页
    │       ├── ProjectDetail.vue      # 项目详情（含 Tabs）
    │       ├── Documents.vue          # 文档管理
    │       ├── TestPoints.vue         # 测试点管理
    │       ├── TestCases.vue          # 测试用例管理
    │       ├── KnowledgeBases.vue     # 知识库管理
    │       ├── BatchTracker.vue       # 任务批次追踪
    │       └── Settings.vue           # 系统设置
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 二、后端技术实现

### 2.1 应用入口（main.py）

```python
# 核心配置
app = FastAPI(title="AI测试用例生成平台", version="1.0.0")

# 生命周期
@app.on_event("startup")   # 自动建表（Base.metadata.create_all）
@app.on_event("shutdown")  # 关闭数据库连接池

# 中间件
CORSMiddleware（允许 settings.CORS_ORIGINS 列表中的域名）

# 路由注册
app.include_router(projects.router, prefix="/api/v1")
app.include_router(test_points.router, prefix="/api/v1")
...共 6 个路由模块
```

**启动流程：**
1. loguru 配置（stderr + 文件双输出，10MB 自动轮转）
2. 加载 .env 配置
3. 创建 uploads/ 和 knowledge_base/ 目录
4. 连接 MySQL，自动执行 create_all 建表
5. 注册 API 路由
6. CORS 配置

### 2.2 数据库层

#### 连接配置（database.py）
```python
engine = create_async_engine(
    settings.DATABASE_URL,  # mysql+aiomysql://user:pass@host:3306/db
    echo=True,              # SQL 日志输出
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True      # 连接健康检查
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, ...)

# 依赖注入
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session        # 路由使用
        await session.commit()  # 正常退出提交
        # 异常退出自动 rollback
```

#### ORM 模型（models/__init__.py）

采用单文件定义所有模型，SQLAlchemy 2.0 async 风格，使用 `DeclarativeBase`。

**8 张表：**

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `projects` | 项目 | name, description |
| `documents` | 项目文档 | project_id(FK), filename, file_path, file_type, content |
| `test_points` | 测试点 | project_id(FK), document_id(FK), title, description, priority, category, is_verified |
| `test_cases` | 测试用例 | project_id(FK), test_point_id(FK), case_number, title, steps(JSON) |
| `knowledge_bases` | 知识库 | name, chroma_collection_name(UNIQUE) |
| `knowledge_documents` | 知识库文档 | knowledge_base_id(FK), filename, chunk_count |
| `task_batches` | 任务批次 | project_id(FK), task_type, status, progress |
| `system_settings` | 系统设置 | key(UNIQUE), value |

### 2.3 API 设计

通用规范：
- 基础路径：`/api/v1`
- 响应格式：直接返回 Pydantic 模型或 dict
- 文件上传：`multipart/form-data`
- 分页：当前无分页

#### API 端点总览（共 30+ 个端点）

```
项目管理（projects.py）
├── GET    /projects/                                     # 列表（含统计）
├── POST   /projects/                                     # 创建
├── GET    /projects/{id}                                 # 详情
├── PUT    /projects/{id}                                 # 更新
├── DELETE /projects/{id}                                 # 删除
├── POST   /projects/{id}/documents/upload                # 上传文档
├── GET    /projects/{id}/documents                       # 文档列表
├── GET    /projects/{id}/documents/{doc_id}              # 文档详情（含内容）
└── DELETE /projects/{id}/documents/{doc_id}              # 删除文档

测试点管理（test_points.py）
├── POST   /test-points/extract                           # AI提取（异步）
├── GET    /test-points/project/{project_id}              # 项目测试点列表
├── POST   /test-points/?project_id={id}                  # 手动创建
├── PUT    /test-points/{id}                              # 更新
└── DELETE /test-points/{id}                              # 删除

测试用例管理（test_cases.py）
├── POST   /test-cases/generate                           # AI生成（异步）
├── GET    /test-cases/project/{project_id}               # 项目用例列表
├── GET    /test-cases/{id}                               # 用例详情
├── POST   /test-cases/?project_id={id}                   # 手动创建
├── PUT    /test-cases/{id}                               # 更新
├── DELETE /test-cases/{id}                               # 删除
└── GET    /test-cases/export/{project_id}                 # 导出Excel

知识库管理（knowledge_bases.py）
├── GET    /knowledge-bases/                              # 列表
├── POST   /knowledge-bases/                              # 创建（含Chroma集合）
├── PUT    /knowledge-bases/{id}                          # 更新
├── DELETE /knowledge-bases/{id}                          # 删除（含Chroma集合）
├── POST   /knowledge-bases/{id}/documents/upload         # 上传文档
└── GET    /knowledge-bases/{id}/documents                # 文档列表

系统设置（settings.py）
├── GET    /settings/                                     # 所有配置
├── POST   /settings/                                     # 创建/更新（upsert）
├── GET    /settings/{key}                                # 单个配置
└── PUT    /settings/{key}                                # 更新值

任务批次（batches.py）
├── GET    /batches/                                      # 所有批次
├── GET    /batches/{id}                                  # 批次详情
├── GET    /batches/project/{project_id}                  # 项目批次列表
└── PUT    /batches/{id}/cancel                           # 取消任务

通用
├── GET    /                                              # 根信息
└── GET    /health                                        # 健康检查
```

### 2.4 服务层实现

#### LLMService（llm_service.py）

```
技术选型：LiteLLM（统一接口调用 100+ 模型）
初始化：从 settings 读取 api_key / model / base_url
核心方法：

extract_test_points(doc_content, rag_context?)
  → System Prompt: 专业测试工程师从PRD提取测试点
  → 返回 JSON 数组 [{title, description, priority, category}]
  → LLM 参数: temperature=0.3, max_tokens=4000

generate_test_cases(test_point_dict, rag_context?)
  → System Prompt: 资深测试工程师根据测试点生成详细用例
  → 返回 JSON 数组 [{title, precondition, steps[{step, expected_result}], priority, case_type}]
  → LLM 参数同上

注意事项：
- 响应 JSON 解析使用 json.loads(content)，LLM 输出格式异常会导致异常
- 所有异常直接抛出，由调用方（异步任务）处理
```

#### RAGService（rag_service.py）

```
技术选型：ChromaDB PersistentClient
持久化路径：backend/knowledge_base/（含 chroma.sqlite3）

核心方法：
├── create_collection(name)       → 创建 Chroma 集合
├── delete_collection(name)       → 删除 Chroma 集合
├── add_documents(coll, texts)    → 分块文本 → 生成 embedding → 存入 Chroma
├── query_documents(coll, query)  → 生成 query embedding → 语义检索
└── chunk_text(text, 500, 50)     → 文本分块（500字符/块，50字符重叠，句边界分割）

⚠️ 当前重要技术债务：
- generate_embedding() 使用基于字符哈希的简单实现（384维，字符编码累加+L2归一化）
- 已安装 sentence-transformers 但未接入，哈希向量无法表达语义
- 因此当前 RAG 检索效果较差
```

#### DocumentParser（document_parser.py）

```
多格式解析策略：

PDF：   PyMuPDF(fitz.get_text) → CJK字符比例检测 → 乱码则降级Tesseract OCR
DOCX：  python-docx (段落遍历)
MD：    直接 UTF-8 读取
YAML：  pyyaml.safe_load → str()
CSV：   pandas.read_csv → to_string()

PDF 乱码检测算法（_has_valid_chinese）：
1. 统计 CJK 统一汉字（Unicode 范围 一-鿿）在非空白字符中的比例
2. 比例 < 15% 且文本长度 ≥ 50 判定为乱码
3. 乱码时降级为 OCR（pdf2image 200DPI → Tesseract chi_sim+eng）
```

#### ExcelExporter（excel_exporter.py）

```
技术选型：openpyxl
表头：用例编号 / 用例标题 / 前置条件 / 测试步骤 / 预期结果 / 优先级 / 用例类型
样式：蓝色表头（#4472C4，白色粗体）、自动换行、列宽预设
输出：BytesIO → bytes
```

#### FeishuService（feishu_service.py）

```
技术选型：httpx.AsyncClient
消息格式：飞书 post 富文本（zh_cn）
通知内容：
  - 测试点提取完成：项目【{name}】已完成测试点提取，共提取 {count} 个测试点
  - 测试用例生成完成：项目【{name}】已完成测试用例生成，共生成 {count} 个测试用例
```

### 2.5 异步任务实现

使用 FastAPI `BackgroundTasks` 而非 Celery。任务函数定义在对应的 API 路由文件中。

关键实现要点：

```python
# 后台任务必须使用独立数据库会话
from app.core.database import AsyncSessionLocal
async with AsyncSessionLocal() as db:
    # ... 任务逻辑

# 单个失败不阻断整体
for doc in documents:
    try:
        # 处理单个文档
    except Exception as e:
        batch.error_message = f"文档 {doc.filename} 处理失败: {str(e)}"
        continue

# 状态流转
batch.status = "PENDING"  →  "RUNNING"  →  "COMPLETED"
                                        →  "FAILED"
```

---

## 三、前端技术实现

### 3.1 技术栈

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) | |
| 构建工具 | Vite 5 | 代理 `/api` 到 `localhost:8000` |
| UI 组件 | Element Plus 2.5 | 中文语言包（zhCn） |
| 状态管理 | Pinia | 已安装但当前未使用 |
| 路由 | Vue Router 4 | History 模式 |
| HTTP | Axios 1.6 | baseURL: `/api/v1`, timeout: 30s |
| 图标 | @element-plus/icons-vue | 全局注册 |
| 日期 | dayjs | |

### 3.2 路由结构

```
/                                    → Layout.vue（侧边栏：深色导航 #2c3e50）
├── /                                → ProjectList.vue（项目列表）
├── /project/:id                     → ProjectDetail.vue（Tabs 导航）
│   ├── documents                    → Documents.vue（文档管理）
│   ├── test-points                  → TestPoints.vue（测试点管理）
│   ├── knowledge-bases              → KnowledgeBases.vue（知识库管理）
│   ├── test-cases                   → TestCases.vue（测试用例管理）
│   └── batches                      → BatchTracker.vue（任务批次追踪）
└── /settings                        → Settings.vue（系统设置）
```

### 3.3 前端 API 封装

```
src/api/
├── project.ts        → Project + Document 的完整 CRUD
├── test.ts           → TestPoint + TestCase + TaskBatch + 导出
├── knowledgeBase.ts  → KnowledgeBase + KnowledgeDocument
└── settings.ts       → SystemSettings CRUD
```

### 3.4 页面组件详解

#### ProjectList.vue（项目列表）
- **布局：** CSS Grid，自适应列宽 280px
- **卡片展示：** 项目名、描述、统计数字（文档/测试点/用例）
- **操作：** 编辑弹窗、删除确认、点击进入详情
- **空状态：** el-empty 提示

#### ProjectDetail.vue（项目详情）
- **标签页：** 文档管理 / 测试点 / 知识库 / 测试用例 / 任务批次
- **Badge：** 任务批次 Tab 显示 RUNGING 任务数
- **默认 Tab：** 文档管理

#### Documents.vue（文档管理）
- **上传：** el-upload，直接使用 action 属性指向后端
- **操作栏：** 上传按钮 + AI 提取（多选文档后启用）
- **表格：** 文件名、类型（el-tag 大写）、上传时间、查看/删除
- **提取对话框：** 关联知识库选择（el-select 多选动态加载）

#### TestPoints.vue（测试点管理）
- **筛选：** 优先级 + 分类（前端 computed 过滤）
- **操作栏：** 手动新增 + 批量生成用例 + 批量删除
- **表格：** 多选、标题、描述（tooltip）、优先级（彩色 tag）、分类、确认状态
- **确认按钮：** 调用 updateTestPoint 设置 is_verified=true

#### TestCases.vue（测试用例管理）
- **筛选：** 优先级 + 类型（computed 过滤）
- **操作栏：** 手动新增 + 导出 Excel + 批量删除
- **表格：** 多选、编号、标题、前置条件、优先级、类型
- **详情弹窗：** 显示完整步骤（序号 + 操作 + 预期）
- **导出：** responseType: 'blob' → a 标签下载

#### KnowledgeBases.vue（知识库管理）
- **卡片列表：** 名称（含文档数 tag）、描述
- **展开：** 上传/编辑/删除，文档表格（文件名/类型/分块数/上传时间）
- **懒加载：** 展开时加载文档列表

#### BatchTracker.vue（任务批次追踪）
- **轮询：** 每 3 秒查询，仅在有 RUNNING/PENDING 任务时
- **展示：** 类型 tag、状态 tag、进度条、完成数/总数
- **详情弹窗：** 创建/开始/完成时间、错误信息
- **通知：** 通过 prevStates 检测状态变化，ElNotification 弹出

#### Settings.vue（系统设置）
- **Tabs：** LLM 配置 / 飞书通知配置
- **LLM：** API Key（密码框）、模型名称、Base URL（可选）
- **飞书：** Webhook URL
- **启动加载：** onMounted 从 API 加载历史配置

---

## 四、关键技术细节

### 4.1 数据库会话管理
- 路由中：`get_db()` 依赖注入 → yield session → 自动 commit/rollback
- 后台任务中：`AsyncSessionLocal()` 创建独立 session

### 4.2 测试用例 steps 字段
- 数据库：MySQL JSON 类型
- 后端操作：直接赋值 dict/list
- Schema 转换：`TestCaseStep(step, expected_result)` → `step.model_dump()`

### 4.3 文件上传
- 项目文档：保存到 `backend/uploads/`，UUID 前缀防重名
- 知识库文档：保存到 `backend/knowledge_base/`，同上
- 上传时自动解析内容存入数据库
- 删除时同步删除物理文件

### 4.4 PDF 乱码降级方案
- **问题根源：** macOS Quartz PDFContext 生成的 PDF 缺少 ToUnicode CMap
- **检测：** CJK 字符比例 < 15% 判定为乱码
- **降级：** pdf2image（200DPI）→ Tesseract OCR（chi_sim+eng）
- **系统依赖：** tesseract + tesseract-lang + poppler

### 4.5 系统设置热更新
```python
# settings.py 中的同步函数
def update_runtime_config(key, value):
    if key == "LLM_API_KEY":     settings.LLM_API_KEY = value
    elif key == "LLM_MODEL":     settings.LLM_MODEL = value
    elif key == "LLM_BASE_URL":  settings.LLM_BASE_URL = value
    elif key == "FEISHU_WEBHOOK_URL": settings.FEISHU_WEBHOOK_URL = value
```

### 4.6 配置（Vite 代理）
```typescript
// vite.config.ts
server: {
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
}
```

---

## 五、Schema 一览

### 请求 Schema（Pydantic v2）
```python
ProjectCreate(name: str, description: Optional[str])
ProjectUpdate(name: Optional[str], description: Optional[str])
TestPointCreate(title: str, description: Optional[str], priority: str="MEDIUM", category: Optional[str])
TestPointUpdate(title: Optional[str], description: Optional[str], priority: Optional[str], category: Optional[str], is_verified: Optional[bool])
TestCaseStep(step: str, expected_result: str)
TestCaseCreate(test_point_id: int, title: str, precondition: Optional[str], steps: List[TestCaseStep]=[], ...)
TestCaseUpdate(title: Optional[str], precondition: Optional[str], steps: Optional[List[TestCaseStep]], ...)
KnowledgeBaseCreate(name: str, description: Optional[str])
KnowledgeBaseUpdate(name: Optional[str], description: Optional[str])
SystemSettingsCreate(key: str, value: str, description: Optional[str])
SystemSettingsUpdate(value: str)
ExtractTestPointsRequest(document_ids: List[int], knowledge_base_ids: Optional[List[int]])
GenerateTestCasesRequest(test_point_ids: List[int], knowledge_base_ids: Optional[List[int]])
```

### 响应 Schema（全部配置 from_attributes=True）
```
ProjectResponse, DocumentResponse, DocumentDetailResponse
TestPointResponse, TestCaseResponse
KnowledgeBaseResponse, KnowledgeDocumentResponse
TaskBatchResponse, SystemSettingsResponse
```

---

## 六、环境与配置

### .env 配置项
```ini
DATABASE_URL=mysql+aiomysql://snow:password@localhost:3306/test_platform
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4
LLM_BASE_URL=https://api.xxx.com/v1    # 可选
FEISHU_WEBHOOK_URL=                     # 可选
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### 启动命令
```bash
# 后端
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend
npm run dev     # → http://localhost:5173
npm run build   # 生产构建
```

---

## 七、已知技术债务

1. **RAG Embedding 实现**：当前使用哈希向量而非语义向量（sentence-transformers 已安装但未接入），语义检索效果差
2. **冷启动配置恢复**：应用重启后不会从 SystemSettings 加载运行时配置
3. **手动创建测试用例的步骤编辑**：前端创建/编辑表单中无 steps 编辑界面（但后端支持）
4. **TypeScript 类型**：部分组件使用 `ref<any[]>`，类型不够严格
5. **错误处理**：部分 API 直接抛出 500，前端捕获后提示不够友好
6. **无分页**：列表全量返回
7. **异步任务**：基于 BackgroundTasks（单进程），不适合高并发
