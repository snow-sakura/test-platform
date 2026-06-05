'use client';

import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Card, Button, message, Row, Col, Statistic } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { getExecutions } from '@/lib/api/performance';
import type { PerformanceExecution } from '@/lib/api/performance';

const STATUS_COLORS: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'success', failed: 'error',
};

export default function PerformanceExecutionsPage() {
  const [data, setData] = useState<{ count: number; results: PerformanceExecution[] }>({ count: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExecutions({ page, page_size: 20 });
      setData(res.data);
    } catch { message.error('加载执行记录失败'); }
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
    { title: '场景 ID', dataIndex: 'scene_id', key: 'scene_id', width: 90 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: '并发数', dataIndex: 'concurrent_users', key: 'concurrent_users', width: 80, render: (v: number | null) => v ?? '-' },
    { title: '总请求', dataIndex: 'total_requests', key: 'total_requests', width: 90, render: (v: number | null) => v ?? '-' },
    {
      title: '平均响应', dataIndex: 'avg_response_time_ms', key: 'avg_response_time_ms', width: 100,
      render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-',
    },
    {
      title: 'P90', dataIndex: 'p90_response_time_ms', key: 'p90_response_time_ms', width: 80,
      render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-',
    },
    {
      title: '错误率', dataIndex: 'error_rate', key: 'error_rate', width: 80,
      render: (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : '-',
    },
    {
      title: '吞吐量', dataIndex: 'throughput', key: 'throughput', width: 90,
      render: (v: number | null) => v != null ? `${v.toFixed(1)}/s` : '-',
    },
    { title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 180, render: (v: string | null) => v || '-' },
    {
      title: '耗时', dataIndex: 'total_duration_ms', key: 'total_duration_ms', width: 80,
      render: (v: number | null) => v != null ? `${(v / 1000).toFixed(1)}s` : '-',
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总执行" value={stats.total} suffix="次" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="执行中" value={stats.running} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已失败" value={stats.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card
        size="small" title="执行记录"
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>}
      >
        <Table
          dataSource={data.results} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total: data.count, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
          size="small"
        />
      </Card>
    </div>
  );
}
