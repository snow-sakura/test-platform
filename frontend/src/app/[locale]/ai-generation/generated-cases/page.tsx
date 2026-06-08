'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, Card, Tag, Button, Select, Space, Typography, message,
} from 'antd';
import {
  EyeOutlined, ReloadOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  listTasks, saveTaskToLibrary,
  type TaskItem,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;

const getStatusLabel = (status: string, t: any) => {
  const map: Record<string, string> = {
    pending: t('task.waiting'),
    generating: t('task.generating'),
    reviewing: t('task.reviewing'),
    revising: t('task.revising'),
    completed: t('task.completed'),
    failed: t('task.failed'),
    cancelled: t('task.cancelled'),
  };
  return map[status] || status;
};

export default function GeneratedCasesPage() {
  const t = useTranslations('aiGeneration');
  const tc = useTranslations('common');
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
    } catch { message.error(t('task.loadFailed')); }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleSave = async (taskId: string) => {
    try { const res = await saveTaskToLibrary(taskId); message.success(res.data.message); loadTasks(); }
    catch (e: any) { message.error(e?.response?.data?.detail || t('task.saveFailed')); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('task.title')}</Title>
        <Space>
          <Select placeholder={t('task.filterStatus')} allowClear style={{ width: 140 }} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: t('task.waiting'), value: 'pending' }, { label: t('task.generating'), value: 'generating' },
              { label: t('task.completed'), value: 'completed' }, { label: t('task.failed'), value: 'failed' }, { label: t('task.cancelled'), value: 'cancelled' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>{t('task.refresh')}</Button>
        </Space>
      </div>
      <Card>
        <Table
          dataSource={tasks} rowKey="id" loading={loading}
          pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t: number) => tc('totalCount', { count: t }) }}
          columns={[
            { title: t('task.id'), dataIndex: 'task_id', width: 200 },
            { title: t('task.source'), dataIndex: 'source_type', width: 80, render: (v: string) => v === 'document' ? t('task.document') : t('task.text') },
            { title: t('task.status'), dataIndex: 'status', width: 100, render: (v: string) => (
              <Tag>{getStatusLabel(v, t)}</Tag>
            )},
            { title: t('task.progress'), dataIndex: 'progress', width: 120, render: (_: number, r: TaskItem) => r.status === 'completed' ? <Tag color="success">{t('task.percent')}</Tag> : r.status === 'failed' ? <Tag color="error">{t('task.failed')}</Tag> : <Tag color="processing">{r.progress}%</Tag> },
            { title: t('task.saved'), dataIndex: 'is_saved_to_records', width: 80, render: (v: boolean) => v ? <Tag color="green">{t('task.yes')}</Tag> : <Tag>{t('task.no')}</Tag> },
            { title: t('task.createdAt'), dataIndex: 'created_at', width: 170 },
            {
              title: tc('action'), width: 200,
              render: (_: any, record: TaskItem) => (
                <Space>
                  <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => router.push(`/ai-generation/tasks/${record.task_id}`)}>{t('task.detail')}</Button>
                  {record.status === 'completed' && !record.is_saved_to_records && (
                    <Button size="small" type="link" icon={<CheckCircleOutlined />} onClick={() => handleSave(record.task_id)}>{t('task.saveToCaseLib')}</Button>
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
