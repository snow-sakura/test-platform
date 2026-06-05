'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, Card, Tag, Button, Select, Space, Typography, message,
} from 'antd';
import {
  EyeOutlined, ReloadOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import {
  listTasks, saveTaskToLibrary,
  type TaskItem,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' },
  generating: { color: 'processing', label: '生成中' },
  reviewing: { color: 'processing', label: '评审中' },
  revising: { color: 'processing', label: '修订中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
  cancelled: { color: 'warning', label: '已取消' },
};

export default function GeneratedCasesPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTasks(page, 20, statusFilter);
      setTasks(res.data.results || []);
      setTotal(res.data.count);
    } catch { message.error('加载任务列表失败'); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleSave = async (taskId: string) => {
    try { const res = await saveTaskToLibrary(taskId); message.success(res.data.message); loadTasks(); }
    catch (e: any) { message.error(e?.response?.data?.detail || '保存失败'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>生成任务列表</Title>
        <Space>
          <Select placeholder="状态筛选" allowClear style={{ width: 140 }} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: '等待中', value: 'pending' }, { label: '生成中', value: 'generating' },
              { label: '已完成', value: 'completed' }, { label: '失败', value: 'failed' }, { label: '已取消', value: 'cancelled' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>刷新</Button>
        </Space>
      </div>
      <Card>
        <Table
          dataSource={tasks} rowKey="id" loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => `共 ${t} 条` }}
          columns={[
            { title: '任务 ID', dataIndex: 'task_id', width: 200 },
            { title: '来源', dataIndex: 'source_type', width: 80, render: (v: string) => v === 'document' ? '文档' : '文本' },
            { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => { const s = STATUS_MAP[v]; return <Tag color={s?.color || 'default'}>{s?.label || v}</Tag>; } },
            { title: '进度', dataIndex: 'progress', width: 120, render: (_: number, r: TaskItem) => r.status === 'completed' ? <Tag color="success">100%</Tag> : r.status === 'failed' ? <Tag color="error">失败</Tag> : <Tag color="processing">{r.progress}%</Tag> },
            { title: '已保存', dataIndex: 'is_saved_to_records', width: 80, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
            { title: '创建时间', dataIndex: 'created_at', width: 170 },
            {
              title: '操作', width: 200,
              render: (_: any, record: TaskItem) => (
                <Space>
                  <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => router.push(`/ai-generation/tasks/${record.task_id}`)}>详情</Button>
                  {record.status === 'completed' && !record.is_saved_to_records && (
                    <Button size="small" type="link" icon={<CheckCircleOutlined />} onClick={() => handleSave(record.task_id)}>保存到用例库</Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
