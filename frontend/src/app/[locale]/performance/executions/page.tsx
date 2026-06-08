'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Row, Col, Statistic } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { getExecutions } from '@/lib/api/performance';
import type { PerformanceExecution } from '@/lib/api/performance';

const STATUS_COLORS: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'success', failed: 'error',
};

export default function PerformanceExecutionsPage() {
  const t = useTranslations();
  const [data, setData] = useState<{ count: number; results: PerformanceExecution[] }>({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExecutions({ page, page_size: 20 });
      setData(res.data);
    } catch { message.error(t('performance.execution.loadFailed')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: data.count || 0,
    completed: data.results.filter(e => e.status === 'completed').length,
    failed: data.results.filter(e => e.status === 'failed').length,
    running: data.results.filter(e => e.status === 'running').length,
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: t('performance.execution.sceneId'), dataIndex: 'scene_id', key: 'scene_id', width: 90 },
    {
      title: t('performance.execution.status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: t('performance.execution.concurrency'), dataIndex: 'concurrent_users', key: 'concurrent_users', width: 80, render: (v: number | null) => v ?? '-' },
    { title: t('performance.execution.totalRequests'), dataIndex: 'total_requests', key: 'total_requests', width: 90, render: (v: number | null) => v ?? '-' },
    {
      title: t('performance.execution.avgResponse'), dataIndex: 'avg_response_time_ms', key: 'avg_response_time_ms', width: 100,
      render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-',
    },
    {
      title: 'P90', dataIndex: 'p90_response_time_ms', key: 'p90_response_time_ms', width: 80,
      render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-',
    },
    {
      title: t('performance.execution.errorRate'), dataIndex: 'error_rate', key: 'error_rate', width: 80,
      render: (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: t('performance.execution.throughput'), dataIndex: 'throughput', key: 'throughput', width: 90,
      render: (v: number | null) => v != null ? `${v.toFixed(1)}/s` : '-',
    },
    { title: t('performance.execution.startTime'), dataIndex: 'started_at', key: 'started_at', width: 180, render: (v: string | null) => v || '-' },
    {
      title: t('performance.execution.duration'), dataIndex: 'total_duration_ms', key: 'total_duration_ms', width: 80,
      render: (v: number | null) => v != null ? `${(v / 1000).toFixed(1)}s` : '-',
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title={t('performance.execution.totalExecutions')} value={stats.total} suffix={t('performance.execution.count')} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('performance.execution.running')} value={stats.running} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('performance.execution.completed')} value={stats.completed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('performance.execution.failed')} value={stats.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card
        size="small" title={t('performance.execution.title')}
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>{t('performance.execution.refresh')}</Button>}
      >
        <Table
          dataSource={data.results} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total: data.count, pageSize: 20, onChange: setPage, showTotal: (total) => t('common.totalCount', { count: total }) }}
          size="small"
        />
      </Card>
    </div>
  );
}
