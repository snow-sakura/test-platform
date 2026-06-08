'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Descriptions, Tag, Button, Table, Spin, message, Row, Col, Statistic,
} from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getAIExecutionReport, exportExecutionPdf } from '@/lib/api/ai-smart';
import type { ExecutionReport } from '@/lib/api/ai-smart';

const STATUS_COLORS: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'green', failed: 'red', cancelled: 'orange',
};

const STATUS_KEYS: Record<string, string> = {
  pending: 'waiting', running: 'running', completed: 'completed', failed: 'failed', cancelled: 'cancelled',
};

export default function AIReportDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAIExecutionReport(id)
      .then((res) => setReport(res.data))
      .catch(() => message.error(t('aiSmart.report.loadFailed')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await exportExecutionPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success(t('aiSmart.report.exportSuccess'));
    } catch {
      message.error(t('aiSmart.report.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!report) {
    return <div style={{ textAlign: 'center', padding: 80 }}>{t('aiSmart.report.notFound')}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>{t('aiSmart.report.back')}</Button>
        <Button type="primary" icon={<FilePdfOutlined />} loading={exporting} onClick={handleExportPdf}>
          {t('aiSmart.report.exportPdf')}
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('aiSmart.report.status')}
              value={report.status === 'completed' ? t('aiSmart.report.passed') : report.status === 'failed' ? t('aiSmart.report.failed') : t('aiSmart.report.cancelled')}
              valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title={t('aiSmart.report.stepsCompleted')} value={report.steps_completed} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title={t('aiSmart.report.duration')} value={report.duration_seconds} suffix="s" /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="ID" value={report.record_id} /></Card>
        </Col>
      </Row>

      <Card title={t('aiSmart.report.basicInfo')} style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('aiSmart.report.caseName')}>{report.case_name || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('aiSmart.report.taskDesc')}>{report.task_description}</Descriptions.Item>
          <Descriptions.Item label={t('aiSmart.report.status')}>
            <Tag color={STATUS_COLORS[report.status] || 'default'}>
              {t(`aiSmart.report.${STATUS_KEYS[report.status] || report.status}`) || report.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('aiSmart.report.startTime')}>{report.started_at || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('aiSmart.report.endTime')}>{report.completed_at || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {report.summary && (
        <Card title={t('aiSmart.report.summary')} style={{ marginBottom: 16 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.summary}</pre>
        </Card>
      )}

      {report.execution_log && report.execution_log.length > 0 && (
        <Card title={t('aiSmart.report.log')} style={{ marginBottom: 16 }}>
          <Table
            dataSource={report.execution_log as Record<string, unknown>[]}
            rowKey={(r: any) => `${r.time}-${r.step}`}
            size="small" pagination={false}
            columns={[
              { title: t('aiSmart.report.time'), dataIndex: 'time', width: 80 },
              { title: t('aiSmart.report.step'), dataIndex: 'step' },
              {
                title: t('aiSmart.report.status'), dataIndex: 'status', width: 80,
                render: (v: string) => (
                  <Tag color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'blue'}>{v}</Tag>
                ),
              },
            ]}
          />
        </Card>
      )}

      {report.planned_tasks && report.planned_tasks.length > 0 && (
        <Card title={t('aiSmart.report.plannedTask')}>
          <Table
            dataSource={report.planned_tasks as Record<string, unknown>[]}
            rowKey="task"
            size="small" pagination={false}
            columns={[
              { title: t('aiSmart.report.task'), dataIndex: 'task', ellipsis: true },
              { title: t('aiSmart.report.status'), dataIndex: 'status', width: 100 },
            ]}
          />
        </Card>
      )}

      {report.gif_recording && (
        <Card title={t('aiSmart.report.gifRecording')} style={{ marginTop: 16 }}>
          <img
            src={`/${report.gif_recording}`}
            alt={t('aiSmart.report.gifPlayback')}
            style={{ maxWidth: '100%', border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </Card>
      )}
    </div>
  );
}
