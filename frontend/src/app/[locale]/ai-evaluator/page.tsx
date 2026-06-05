'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Layout, List, Typography, Input, Button, message, Popconfirm, Badge, Spin, Empty,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SendOutlined, MessageOutlined,
} from '@ant-design/icons';
import {
  getSessions, createSession, deleteSession, getSessionMessages, sendMessageStream,
} from '@/lib/api/ai-evaluator';
import type { Session, Message } from '@/lib/api/ai-evaluator';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

export default function AIEvaluatorPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await getSessions();
      setSessions(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // 切换会话，加载消息
  const switchSession = async (session: Session) => {
    if (sending) return;
    setActiveSession(session);
    setStreamingText('');
    setLoadingMessages(true);
    try {
      const res = await getSessionMessages(session.session_id);
      setMessages(res.data);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 新建会话
  const handleCreate = async () => {
    try {
      const res = await createSession();
      const session = res.data;
      setSessions((prev) => [session, ...prev]);
      setActiveSession(session);
      setMessages([]);
      setStreamingText('');
    } catch {
      message.error('创建会话失败');
    }
  };

  // 删除会话
  const handleDelete = async (session: Session) => {
    try {
      await deleteSession(session.session_id);
      setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
      if (activeSession?.session_id === session.session_id) {
        setActiveSession(null);
        setMessages([]);
        setStreamingText('');
      }
    } catch {
      message.error('删除会话失败');
    }
  };

  // 发送消息
  const handleSend = async () => {
    const query = input.trim();
    if (!query || !activeSession || sending) return;

    setInput('');
    setSending(true);
    setStreamingText('');

    // 添加用户消息到界面
    const userMsg: Message = {
      id: Date.now(),
      session_id: activeSession.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 占位 AI 回复
    const aiMsg: Message = {
      id: Date.now() + 1,
      session_id: activeSession.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    let fullAnswer = '';

    abortRef.current = sendMessageStream(
      { session_id: activeSession.session_id, query },
      (text) => {
        fullAnswer += text;
        setStreamingText(fullAnswer);
      },
      () => {
        // done
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            last.content = fullAnswer;
          }
          return updated;
        });
        setStreamingText('');
        setSending(false);
        abortRef.current = null;
        // 刷新会话列表（更新标题）
        loadSessions();
      },
      (err) => {
        message.error(`请求失败: ${err}`);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            last.content = fullAnswer || '服务暂时不可用，请稍后重试';
          }
          return updated;
        });
        setStreamingText('');
        setSending(false);
        abortRef.current = null;
      },
    );
  };

  // 停止生成
  const handleStop = () => {
    abortRef.current?.abort();
    setSending(false);
    setStreamingText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout style={{ height: 'calc(100vh - 140px)', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
      {/* 左侧会话列表 */}
      <Sider
        width={280}
        style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Button type="primary" block icon={<PlusOutlined />} onClick={handleCreate}>
            新建对话
          </Button>
        </div>
        <List
          loading={loadingSessions}
          dataSource={sessions}
          locale={{ emptyText: <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          renderItem={(item) => (
            <List.Item
              onClick={() => switchSession(item)}
              style={{
                cursor: 'pointer',
                padding: '12px 16px',
                background: activeSession?.session_id === item.session_id ? '#e6f4ff' : undefined,
              }}
              actions={[
                <Popconfirm
                  key="delete"
                  title="确认删除此对话？"
                  onConfirm={() => handleDelete(item)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<MessageOutlined style={{ fontSize: 16, color: '#999' }} />}
                title={
                  <Text ellipsis style={{ maxWidth: 160 }}>
                    {item.title || '新对话'}
                  </Text>
                }
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.message_count} 条消息
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Sider>

      {/* 右侧聊天区 */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="选择或创建一个对话开始使用 AI 评测师" />
          </div>
        ) : (
          <>
            {/* 消息列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                  <Spin />
                </div>
              ) : messages.length === 0 && !streamingText ? (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                  <Title level={4} type="secondary">开始与 AI 评测师对话</Title>
                  <Text type="secondary">输入您的测试问题或需求，AI 将为您提供专业的测试建议</Text>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isLastAssistant = !isUser && idx === messages.length - 1;
                  const content = isLastAssistant && streamingText ? streamingText : msg.content;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: isUser ? '#1677ff' : '#f5f5f5',
                          color: isUser ? '#fff' : 'inherit',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {content}
                        {isLastAssistant && streamingText && (
                          <span style={{ animation: 'blink 1s infinite' }}>|</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                  rows={2}
                  disabled={sending}
                />
                {sending ? (
                  <Button danger onClick={handleStop}>停止</Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    发送
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Content>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </Layout>
  );
}
