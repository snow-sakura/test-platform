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
      message.error(t('ciCd.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRerun = async (id: number) => {
    try {
      await rerunPipeline(id);
      message.success(t('ciCd.rerunSuccess'));
      fetchData();
    } catch {
      message.error(t('ciCd.rerunFailed'));
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
        <Col span={6}><Card size="small"><Statistic title={t('ciCd.totalExecutions')} value={stats.total} suffix={t('ciCd.count')} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('ciCd.running')} value={stats.running} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('ciCd.passed')} value={stats.completed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('ciCd.failed')} value={stats.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card
        size="small" title={t('ciCd.pipelines')}
        extra={<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>{t('ciCd.refresh')}</Button>}
      >
        <Table
          dataSource={data.results}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page, total: data.count, pageSize: 20,
            onChange: setPage, showTotal: (total) => t('common.totalCount', { count: total }),
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
  const t = useTranslations();
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

  if (loading) return <Text type="secondary">{t('ciCd.loading')}</Text>;

  return (
    <Table
      dataSource={steps}
      columns={[
        { title: t('ciCd.order'), dataIndex: 'step_order', key: 'step_order', width: 60 },
        { title: t('ciCd.module'), dataIndex: 'module_type', key: 'module_type', width: 120, render: (v: string) => getModuleLabel(v) },
        { title: t('ciCd.status'), dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
          const { STEP_STATUS_MAP } = require('@/lib/api/ci-cd');
          const s = STEP_STATUS_MAP[v] || { color: 'default', label: v };
          return <Tag color={s.color}>{s.label}</Tag>;
        }},
        { title: t('ciCd.result'), dataIndex: 'result', key: 'result', render: (v: any) => v ? `${t('ciCd.through')}: ${v.passed || 0} / ${t('ciCd.fail')}: ${v.failed || 0}` : '-' },
        { title: t('ciCd.duration'), dataIndex: 'duration_ms', key: 'duration_ms', width: 80, render: (v: number | null) => v ? `${(v / 1000).toFixed(1)}s` : '-' },
        { title: t('ciCd.error'), dataIndex: 'error_message', key: 'error_message', ellipsis: true },
      ]}
      rowKey="id" pagination={false} size="small"
    />
  );
}
