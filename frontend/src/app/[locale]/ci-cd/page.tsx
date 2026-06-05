'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table, Tag, Button, Card, Row, Col, Statistic, message, Space, Typography,
} from 'antd';
import { ReloadOutlined, RedoOutlined, GitlabOutlined, GithubOutlined } from '@ant-design/icons';

import {
  getPipelines, rerunPipeline, PIPELINE_STATUS_MAP, MODULE_TYPE_OPTIONS,
} from '@/lib/api/ci-cd';
import type { PipelineResponse, PipelineStepResponse } from '@/lib/api/ci-cd';

const { Text } = Typography;

const CI_ICONS: Record<string, React.ReactNode> = {
  gitlab: <GitlabOutlined />,
  github: <GithubOutlined />,
  jenkins: <span>⚙</span>,
};

function getModuleLabel(type: string): string {
  const opt = MODULE_TYPE_OPTIONS.find(o => o.value === type);
  return opt?.label || type;
}

export default function CiCdPipelinesPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ count: number; results: PipelineResponse[] }>({ count: 0, results: [] });
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPipelines({ page, page_size: 20 });
      setData(res.data);
    } catch {
      message.error('加载管道列表失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRerun = async (id: number) => {
    try {
      await rerunPipeline(id);
      message.success('管道已重新执行');
      fetchData();
    } catch {
      message.error('重新执行失败');
    }
  };

  const stats = useMemo(() => {
    const total = data.count || 0;
    let completed = 0, failed = 0, running = 0;
    for (const p of data.results) {
      if (p.status === 'completed') completed++;
      else if (p.status === 'failed') failed++;
      else if (p.status === 'running') running++;
    }
    return { total, completed, failed, running };
  }, [data]);

  const columns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 80,
    },
    {
      title: t('ciCd.ciType'), dataIndex: 'ci_type', key: 'ci_type', width: 100,
      render: (v: string) => (
        <span>{CI_ICONS[v] || v} {v?.toUpperCase()}</span>
      ),
    },
    {
      title: t('ciCd.triggerEvent'), dataIndex: 'trigger_event', key: 'trigger_event', width: 120,
    },
    {
      title: t('ciCd.commitMessage'), dataIndex: 'commit_message', key: 'commit_message', ellipsis: true,
    },
    {
      title: t('ciCd.author'), dataIndex: 'author', key: 'author', width: 120,
    },
    {
      title: t('ciCd.status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => {
        const s = PIPELINE_STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: t('ciCd.totalSteps'), key: 'steps', width: 160,
      render: (_: any, r: PipelineResponse) => (
        <span>
          <Text type="success">{r.passed_steps}</Text>
          /<Text type="danger">{r.failed_steps}</Text>
          /{r.total_steps}
        </span>
      ),
    },
    {
      title: t('ciCd.duration'), dataIndex: 'duration_ms', key: 'duration_ms', width: 100,
      render: (v: number | null) => v ? `${(v / 1000).toFixed(1)}s` : '-',
    },
    {
      title: t('ciCd.createdAt'), dataIndex: 'created_at', key: 'created_at', width: 160,
    },
    {
      title: t('common.action'), key: 'action', width: 100,
      render: (_: any, r: PipelineResponse) => (
        <Button
          type="link" size="small" icon={<RedoOutlined />}
          disabled={r.status === 'running'}
          onClick={() => handleRerun(r.id)}
        >
          {t('ciCd.rerun')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总执行" value={stats.total} suffix="次" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="执行中" value={stats.running} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已通过" value={stats.completed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已失败" value={stats.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card
        size="small" title={t('ciCd.pipelines')}
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>}
      >
        <Table
          dataSource={data.results}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page, total: data.count, pageSize: 20,
            onChange: setPage, showTotal: (total) => `共 ${total} 条`,
          }}
          expandable={{
            expandedRowRender: (record) => <PipelineSteps pipelineId={record.id} />,
            rowExpandable: () => true,
          }}
          size="small"
        />
      </Card>
    </div>
  );
}

function PipelineSteps({ pipelineId }: { pipelineId: number }) {
  const [steps, setSteps] = useState<PipelineStepResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getPipeline } = await import('@/lib/api/ci-cd');
        const res = await getPipeline(pipelineId);
        if (!cancelled) setSteps(res.data.steps || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [pipelineId]);

  if (loading) return <Text type="secondary">加载中...</Text>;

  return (
    <Table
      dataSource={steps}
      columns={[
        { title: '顺序', dataIndex: 'step_order', key: 'step_order', width: 60 },
        { title: '模块', dataIndex: 'module_type', key: 'module_type', width: 120, render: (v: string) => getModuleLabel(v) },
        { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
          const { STEP_STATUS_MAP } = require('@/lib/api/ci-cd');
          const s = STEP_STATUS_MAP[v] || { color: 'default', label: v };
          return <Tag color={s.color}>{s.label}</Tag>;
        }},
        { title: '结果', dataIndex: 'result', key: 'result', render: (v: any) => v ? `通过: ${v.passed || 0} / 失败: ${v.failed || 0}` : '-' },
        { title: '耗时', dataIndex: 'duration_ms', key: 'duration_ms', width: 80, render: (v: number | null) => v ? `${(v / 1000).toFixed(1)}s` : '-' },
        { title: '错误', dataIndex: 'error_message', key: 'error_message', ellipsis: true },
      ]}
      rowKey="id" pagination={false} size="small"
    />
  );
}
