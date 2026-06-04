# API 接口文档

**基础 URL**：`http://localhost:8000`

---

## 1. 健康检查

### `GET /health`

检查后端服务是否正常运行。

**响应示例**：
```json
{
  "status": "healthy",
  "service": "autogen-chat-api"
}
```

---

## 2. 创建会话

### `POST /api/session`

创建一个新的对话会话，后端会初始化 AutoGen 多代理团队。

**请求体**：无

**响应示例**：
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

## 3. 发送消息

### `POST /api/chat`

发送用户消息到指定会话。支持附件文本。

**请求体**：
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "content": "帮我编写登录功能的测试用例",
  "attachment": "附件文本内容（可选）"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 是 | 会话唯一标识 |
| content | string | 是 | 用户消息内容 |
| attachment | string | 否 | 文件解析后的文本内容 |

**响应**：
```json
{
  "status": "message_sent"
}
```

**错误响应**：
```json
{
  "detail": "Session not found"
}
```

**可能错误码**：

| 状态码 | 说明 |
|--------|------|
| 404 | 会话不存在 |
| 400 | 会话不在活跃状态 / 已有对话在进行 / 无可用的 SSE 连接 |

---

## 4. SSE 流式响应

### `GET /api/stream/{session_id}`

建立 SSE 连接，接收 AI 智能体的流式响应。

**请求头**：无特殊要求

**SSE 事件格式**：

### 4.1 连接确认事件

```yaml
event: connected
data: {"session_id": "...", "status": "connected"}
```

### 4.2 处理中事件

```yaml
event: processing
data: {"status": "processing"}
```

### 4.3 智能体响应事件

```yaml
event: AgentResponse
data: {
  "type": "AgentResponse",
  "source": "coordinator",          # 来源智能体名称
  "content": "智能体的回复内容...",   # 消息正文
  "timestamp": "2026-06-04T12:00:00"  # 时间戳
}
```

**source 可能值**：

| source | 智能体 | 说明 |
|--------|--------|------|
| coordinator | 流程协调员 | 紫色标识 🎯 |
| test_writer | 测试用例编写员 | 绿色标识 ✍️ |
| test_reviewer | 测试用例评审员 | 橙色标识 🔍 |
| assistant | AI 助手 | 蓝色标识 🤖（兼容旧会话） |

### 4.4 完成事件

```yaml
event: done
data: {"status": "completed"}
```

### 4.5 错误事件

```yaml
event: error
data: {"type": "error", "content": "错误描述"}
```

### 4.6 保活机制

SSE 连接每 60 秒发送一次 keep-alive 注释，防止连接超时断开：

```
: keep-alive
```

---

## 5. 文件上传

### `POST /api/upload`

上传文件并提取文本内容。支持 PDF 和 TXT 格式。

**请求方式**：`multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 上传的文件（.pdf 或 .txt） |

**响应示例**：
```json
{
  "filename": "需求文档.pdf",
  "content": "提取的文本内容..."
}
```

**错误响应**：
```json
{
  "detail": "不支持的文件类型: file.docx，仅支持PDF和TXT文件"
}
```

---

## 6. 错误码汇总

| 状态码 | 错误详情 | 触发场景 |
|--------|----------|----------|
| 200 | - | 请求成功 |
| 400 | Session not found | session_id 无效 |
| 400 | Session is not active | 会话已过期 |
| 400 | A conversation is already in progress | 上一轮对话未完成 |
| 400 | No active SSE stream | 未建立 SSE 连接 |
| 400 | 文件格式不支持 | 上传非 PDF/TXT 文件 |
| 500 | 内部错误 | 服务器异常或 API 调用失败 |

---

## 7. 前端 API 调用示例

### 创建会话并连接 SSE

```javascript
// 创建会话
const sessionRes = await fetch('http://localhost:8000/api/session', { method: 'POST' });
const { session_id } = await sessionRes.json();

// 建立 SSE 连接
const es = new EventSource(`http://localhost:8000/api/stream/${session_id}`);

es.addEventListener('AgentResponse', (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.source}: ${data.content}`);
});

es.addEventListener('done', () => {
  console.log('对话完成');
});
```

### 发送消息

```javascript
await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: session_id,
    content: '帮我编写登录功能的测试用例'
  })
});
```
