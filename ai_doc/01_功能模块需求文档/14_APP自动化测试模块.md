# 14 - APP 自动化测试模块

## 模块定位
基于 Airtest 框架的 Android APP 自动化测试平台。支持设备管理、元素捕获/管理、包名管理、场景编排、测试用例/套件和定时任务。

---

## 后端需求

### 14.1 模型体系

**AppProject**：项目名称、描述、包名、状态、成员

**AppConfig（APP 配置）**：项目、Adb 路径、设备超时、截图设置

**Device（设备）**：
| 字段 | 类型 | 说明 |
|------|------|------|
| device_id | CharField(100) | 设备 ID |
| device_name | CharField(200) | 设备名称 |
| platform | CharField(20) | Android/iOS |
| status | CharField(20) | available/locked/online/offline |
| connected_at | DateTimeField | 连接时间 |

**AppPackage（应用包名）**：
| 字段 | 类型 | 说明 |
|------|------|------|
| project | FK(AppProject) | 关联项目 |
| app_name | CharField(200) | 应用名称 |
| package_name | CharField(200) | 包名 |
| version_name | CharField(50) | 版本名称 |

**AppElement（UI 元素）**：
| 字段 | 类型 | 说明 |
|------|------|------|
| project | FK(AppProject) | 关联项目 |
| name | CharField(200) | 元素名称 |
| element_type | CharField(20) | image/coordinate/region/text |
| image | ImageField | 元素截图 |
| coordinates | JSONField | 坐标 {x, y, width, height} |
| threshold | FloatField | 图像匹配阈值 |
| image_category | FK(ImageCategory) | 图片分类 |

**AppImageCategory（图片分类）**：名称、项目、排序

**AppTestCase（测试用例）**：项目、名称、描述、场景编排数据、状态、优先级

**AppTestSuite（测试套件）**：项目、名称、testcases（M2M + order）

**AppTestExecution（执行记录）**：suite、status（pending/running/completed/error/stopped）、result、started_at、completed_at

**AppComponentLibrary（组件库）**：
| 字段 | 类型 | 说明 |
|------|------|------|
| project | FK(AppProject) | 关联项目 |
| name | CharField(200) | 组件名称 |
| component_type | CharField(20) | basic/custom |
| element_data | JSONField | 元素数据 |

**AppScheduledTask**：定时任务配置（CRUD + pause/resume/run_now）

**AppNotificationLog**：通知日志（retry 重试）

### 14.2 API 端点

**设备管理**：
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/app-automation/devices/` | GET | 设备列表 |
| `/api/app-automation/devices/{id}/screenshot/` | POST | 截取设备屏幕（15s 超时） |
| `/api/app-automation/devices/{id}/lock/` | POST | 锁定设备 |
| `/api/app-automation/devices/{id}/unlock/` | POST | 解锁设备 |
| `/api/app-automation/devices/{id}/connect/` | POST | 连接设备 |
| `/api/app-automation/devices/{id}/disconnect/` | POST | 断开设备 |
| `/api/app-automation/devices/discover/` | POST | **发现/扫描设备** |
| `/api/app-automation/devices/{id}/` | DELETE | 删除设备 |

**元素管理**：CRUD + 上传元素图片 + 图片分类 CRUD

**包名管理**：CRUD

**测试用例**：CRUD + executeTestCase

**执行记录**：CRUD + detail + stopExecution + WebSocket 实时状态

**测试套件**：CRUD + 用例管理（add/remove/order）+ runTestSuite + 执行记录

**组件库**：基础组件列表 + 自定义组件 CRUD + 导入导出

**定时任务**：CRUD + pause/resume/run_now

**通知**：通知日志 + retry

**仪表盘**：dashboardStatistics

### 14.3 核心业务逻辑
- **设备发现**：通过 ADB 扫描连接的 Android 设备
- **元素捕获**：截取设备屏幕 → 用户在截图上框选区域 → 保存为图片元素
- **图像匹配**：执行时使用 Airtest 图像识别在屏幕上查找元素
- **坐标定位**：支持直接点击坐标或区域
- **场景编排**：将多个操作步骤组合为测试场景
- **WebSocket**：执行过程中通过 WebSocket 推送实时状态

---

## 前端需求

### 14.4 页面组件（16 个页面 + 3 个组件）

| 页面 | 路由 | 功能 |
|------|------|------|
| Index.vue | `/app-automation` | 模块首页，功能卡片导航 |
| Dashboard.vue | `/app-automation/dashboard` | APP 仪表盘统计 |
| ProjectList.vue | `/app-automation/projects` | APP 项目 CRUD |
| DeviceList.vue | `/app-automation/devices` | Android 设备管理 |
| PackageList.vue | `/app-automation/packages` | 应用包名 CRUD |
| ElementList.vue | `/app-automation/elements` | UI 元素管理 |
| TestCaseList.vue | `/app-automation/test-cases` | 测试用例列表 |
| SceneBuilder.vue | `/app-automation/scene-builder` | **场景编排器** |
| SuiteList.vue | `/app-automation/suites` | 测试套件管理 |
| ExecutionList.vue | `/app-automation/executions` | 执行记录 |
| ReportList.vue | `/app-automation/reports` | 测试报告 |
| ScheduledTasks.vue | `/app-automation/scheduled-tasks` | 定时任务 |
| NotificationLogs.vue | `/app-automation/notifications` | 通知日志 |
| AppSettings.vue | `/configuration/app-environment` | APP 环境配置 |

**子组件**：
- `CaptureElementDialog.vue`：截图捕获元素对话框（设备截图 → 框选 → 保存）
- `ManualElementDialog.vue`：手动添加元素对话框（输入坐标/区域/文本）

### 14.5 设备管理功能
- **设备列表**：设备 ID、名称、平台、状态标签、连接时间、操作
- **操作按钮**：连接/断开、锁定/解锁、截图、发现设备
- **设备截图**：点击截图 → 展示设备当前屏幕 → 可用于元素捕获

### 14.6 场景编排器功能
- **可视化编排**：拖拽操作步骤，构建测试场景
- **步骤类型**：点击、滑动、输入、等待、断言、截图
- **元素选择**：从元素库选择已捕获的元素
- **参数配置**：输入文本、等待时间、点击坐标等
- **预览执行**：编排完成后直接执行

---

## 数据流向
```
设备发现 → POST /devices/discover/ → ADB scan → 返回设备列表
元素捕获 → 截图 → 框选区域 → 保存坐标/图片 → AppElement
场景编排 → SceneBuilder → 构建步骤 JSON → 保存到 AppTestCase.scene_data
执行用例 → executeTestCase → Airtest API → 图像匹配/坐标点击 → WebSocket推送状态
```
