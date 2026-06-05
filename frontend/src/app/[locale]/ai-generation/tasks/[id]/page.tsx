'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Tag, Button, Typography, message, Space, Steps, Spin, Alert, Progress,
} from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined, StopOutlined, SaveOutlined,
} from '@ant-design/icons';
import { getTask, cancelTask, saveTaskToLibrary, type TaskDetail } from '@/lib/api/requirement-analysis';

const { Title, Text } = Typography;
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' }, generating: { color: 'processing', label: '生成中' },
  reviewing: { color: 'processing', label: '评审中' }, revising: { color: 'processing', label: '修订中' },
  completed: { color: 'success', label: '已完成' }, failed: { color: 'error', label: '失败' }, cancelled: { color: 'warning', label: '已取消' },
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamContent, setStreamContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const loadTask = async () => {
    setLoading(true);
    try {
      const res = await getTask(taskId);
      setTask(res.data);
      if (res.data.stream_buffer) setStreamContent(res.data.stream_buffer);
    } catch { message.error('加载任务详情失败'); }
    setLoading(false);
  };

  useEffect(() => { loadTask(); }, [taskId]);

  useEffect(() => {
    if (!task || task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') return;
    const es = new EventSource(`/api/requirement-analysis/tasks/${taskId}/stream-progress`);
    es.addEventListener('progress', (e) => setTask((prev) => prev ? { ...prev, progress: parseInt(e.data) } : prev));
    es.addEventListener('content', (e) => {
      try { const { delta } = JSON.parse(e.data); setStreamContent((prev) => prev + delta); } catch { /* ignore */ }
    });
    es.addEventListener('completed', () => { es.close(); loadTask(); });
    es.addEventListener('error', (e) => {
      try { const d = JSON.parse((e as MessageEvent).data); setTask((prev) => prev ? { ...prev, status: 'failed', error_message: d.error } : prev); } catch { /* ignore */ }
    });
    es.addEventListener('cancelled', () => setTask((prev) => prev ? { ...prev, status: 'cancelled' } : prev));
    es.addEventListener('done', () => es.close());
    return () => es.close();
  }, [task?.status, taskId]);

  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight; }, [streamContent]);

  const handleCancel = async () => {
    try { await cancelTask(taskId); message.success('任务已取消'); loadTask(); } catch (e: any) { message.error(e?.response?.data?.detail || '取消失败'); }
  };
  const handleSave = async () => {
    try { const res = await saveTaskToLibrary(taskId); message.success(res.data.message); loadTask(); } catch (e: any) { message.error(e?.response?.data?.detail || '保存失败'); }
  };

  const parseCases = (content: string | null | undefined) => {
    if (!content) return [];
    const lines = content.split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length < 3) return [];
    const headers = lines[0].split('|').filter((h) => h.trim()).map((h) => h.trim());
    return lines.slice(2).filter(l => l.includes('|')).map((row) => {
      const cells = row.split('|').filter((c) => c.trim()).map((c) => c.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { if (cells[i]) obj[h] = cells[i]; });
      return obj;
    });
  };

  if (loading && !task) return <Spin tip="加载中..." style={{ display: 'block', marginTop: 80 }} />;
  if (!task) return <Alert type="error" message="任务不存在" />;

  const si = STATUS_MAP[task.status] || { color: 'default', label: task.status };
  const running = ['generating', 'reviewing', 'revising'].includes(task.status);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/ai-generation/generated-cases')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>任务 {task.task_id}</Title>
          <Tag color={si.color}>{si.label}</Tag>
        </Space>
        <Space>
          {running && <Button danger icon={<StopOutlined />} onClick={handleCancel}>取消</Button>}
          {!running && <Button icon={<ReloadOutlined />} onClick={loadTask}>刷新</Button>}
          {task.status === 'completed' && !task.is_saved_to_records && <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存到用例库</Button>}
        </Space>
      </div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Progress type="circle" percent={task.progress} size={60} status={task.status === 'failed' ? 'exception' : undefined} />
          <Steps size="small" current={task.status === 'pending' ? 0 : task.status === 'generating' ? 1 : task.status === 'reviewing' ? 2 : task.status === 'revising' ? 3 : 4}
            status={task.status === 'failed' ? 'error' : task.status === 'cancelled' ? 'wait' : 'process'}
            items={[{ title: '准备' }, { title: '生成' }, { title: '评审' }, { title: '修订' }, { title: '完成' }]} style={{ flex: 1 }} />
        </div>
        {task.error_message && <Alert type="error" message={task.error_message} style={{ marginTop: 12 }} showIcon />}
      </Card>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 400 }}>
          <Card title="生成内容" size="small">
            <div ref={contentRef} style={{ maxHeight: 500, overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, background: '#fafafa', padding: 12, borderRadius: 4 }}>
              {streamContent || task.generated_content || '暂无生成内容'}
            </div>
          </Card>
          {task.review_feedback && (
            <Card title="AI 评审反馈" size="small" style={{ marginTop: 16 }}>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>{task.review_feedback}</div>
            </Card>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 400 }}>
          <Card title="最终用例" size="small">
            {(() => {
              const rows = parseCases(task.final_test_cases);
              if (rows.length === 0) return <Text type="secondary">暂无最终用例</Text>;
              const cols = Object.keys(rows[0] || {});
              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#fafafa' }}>
                      {cols.map((h) => <th key={h} style={{ border: '1px solid #f0f0f0', padding: '8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{rows.map((r, i) => (
                      <tr key={i}>{cols.map((h) => <td key={h} style={{ border: '1px solid #f0f0f0', padding: '6px 8px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[h]}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
