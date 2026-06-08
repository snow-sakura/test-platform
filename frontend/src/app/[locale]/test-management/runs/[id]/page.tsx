'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Card, Table, message, Spin, Tag, Select, Input, Space, Progress, Statistic, Row, Col,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getRun, updateRunCaseStatus } from '@/lib/api/test-management';
import type { TestRun } from '@/lib/api/test-management';

export default function RunExecutionPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const runId = Number(params.id);
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_MAP = useMemo(() => ({
    untested: { color: 'default' as const, label: t('common.untested') },
    passed: { color: 'success' as const, label: t('common.passed') },
    failed: { color: 'error' as const, label: t('common.failed') },
    blocked: { color: 'warning' as const, label: t('common.blocked') },
  }), [t]);

  const loadRun = () => {
    setLoading(true);
    getRun(runId).then((res) => setRun(res.data)).catch(() => {
      message.error(t('common.loadFailed'));
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadRun(); }, [runId]);

  const handleStatusUpdate = async (runCaseId: number, status: string) => {
    try {
      await updateRunCaseStatus(runId, runCaseId, { status });
      message.success(t('common.updateSuccess'));
      loadRun();
    } catch { message.error(t('common.updateFailed')); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!run) return null;

  const passRate = run.total_cases > 0 ? Math.round((run.passed / run.total_cases) * 100) : 0;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title={t('testManagement.run.totalCases')} value={run.total_cases} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('common.passed')} value={run.passed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('common.failed')} value={run.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('common.blocked')} value={run.blocked} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      <Card title={run.name}>
        <Progress percent={passRate} size="small" />
        <p style={{ marginTop: 8, color: '#666' }}>{t('common.status')}：<Tag color={run.status === 'completed' ? 'success' : 'processing'}>{run.status === 'completed' ? t('common.completed') : t('common.inProgress')}</Tag></p>

        <Table
          rowKey="id"
          dataSource={(run as any).run_cases || []}
          pagination={false}
          size="small"
          locale={{ emptyText: t('testManagement.suiteDetail.noCases') }}
          columns={[
            { title: t('common.id'), dataIndex: 'case_id', width: 60 },
            {
              title: t('common.status'), dataIndex: 'status', width: 120,
              render: (v: string, record: any) => (
                <Select
                  value={v || 'untested'}
                  size="small"
                  style={{ width: 100 }}
                  onChange={(val) => handleStatusUpdate(record.id, val)}
                  options={[
                    { label: t('common.passed'), value: 'passed' },
                    { label: t('common.failed'), value: 'failed' },
                    { label: t('common.blocked'), value: 'blocked' },
                    { label: t('common.untested'), value: 'untested' },
                  ]}
                />
              ),
            },
            { title: t('testManagement.run.actualResult'), dataIndex: 'actual_result', ellipsis: true },
            { title: t('testManagement.run.comments'), dataIndex: 'comments', ellipsis: true },
            { title: t('testManagement.run.elapsedTimeSeconds'), dataIndex: 'elapsed_time', width: 80 },
          ]}
        />
      </Card>
    </div>
  );
}
