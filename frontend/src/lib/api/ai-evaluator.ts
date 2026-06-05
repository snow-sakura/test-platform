/** AI 评测师 - API 封装 */
import request from '../request';


/* ====== Dify 配置 ====== */

export interface DifyConfig {
  id: number;
  name: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DifyConfigCreate {
  name: string;
  api_url: string;
  api_key: string;
  is_active?: boolean;
}

export interface DifyConfigUpdate {
  name?: string;
  api_url?: string;
  api_key?: string;
  is_active?: boolean;
}

export interface DifyTestResult {
  success: boolean;
  message: string;
}

/** 获取 Dify 配置列表 */
export function getDifyConfigs() {
  return request.get<DifyConfig[]>('/api/ai-evaluator/configs');
}

/** 创建 Dify 配置 */
export function createDifyConfig(data: DifyConfigCreate) {
  return request.post<DifyConfig>('/api/ai-evaluator/configs', data);
}

/** 更新 Dify 配置 */
export function updateDifyConfig(id: number, data: DifyConfigUpdate) {
  return request.put<DifyConfig>(`/api/ai-evaluator/configs/${id}`, data);
}

/** 删除 Dify 配置 */
export function deleteDifyConfig(id: number) {
  return request.delete<void>(`/api/ai-evaluator/configs/${id}`);
}

/** 测试 Dify 连接 */
export function testDifyConfig(id: number) {
  return request.post<DifyTestResult>(`/api/ai-evaluator/configs/${id}/test`);
}


/* ====== 会话 ====== */

export interface Session {
  id: number;
  user_id: number;
  session_id: string;
  conversation_id?: string | null;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
  message_count: number;
}

export interface Message {
  id: number;
  session_id: number;
  role: string;
  content: string;
  conversation_id?: string | null;
  message_id?: string | null;
  created_at?: string;
}

/** 获取会话列表 */
export function getSessions() {
  return request.get<Session[]>('/api/ai-evaluator/sessions');
}

/** 创建会话 */
export function createSession(title?: string) {
  return request.post<Session>('/api/ai-evaluator/sessions', { title });
}

/** 获取会话详情 */
export function getSession(sessionId: string) {
  return request.get<Session>(`/api/ai-evaluator/sessions/${sessionId}`);
}

/** 更新会话（修改标题等） */
export function updateSession(sessionId: string, data: { title?: string }) {
  return request.put<Session>(`/api/ai-evaluator/sessions/${sessionId}`, data);
}

/** 删除会话 */
export function deleteSession(sessionId: string) {
  return request.delete<void>(`/api/ai-evaluator/sessions/${sessionId}`);
}

/** 获取会话消息 */
export function getSessionMessages(sessionId: string) {
  return request.get<Message[]>(`/api/ai-evaluator/sessions/${sessionId}/messages`);
}


/* ====== 对话 ====== */

export interface ChatRequest {
  session_id: string;
  query: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id?: string;
  message_id?: string;
}

/** 发送消息（非流式） */
export function sendMessage(data: ChatRequest) {
  return request.post<ChatResponse>('/api/ai-evaluator/chat', data);
}

/** 发送消息（SSE 流式） */
export function sendMessageStream(
  data: ChatRequest,
  onMessage: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch('/api/ai-evaluator/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok) {
      onError(`HTTP ${response.status}`);
      return;
    }
    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.event === 'done') {
              onDone();
              return;
            }
            if (parsed.event === 'error') {
              onError(parsed.error || '未知错误');
              return;
            }
            if (parsed.answer) {
              onMessage(parsed.answer);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(String(err));
    }
  });

  return controller;
}
