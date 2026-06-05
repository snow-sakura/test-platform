'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card, Descriptions, Tag, Button, Table, Spin, message, Row, Col, Statistic,
} from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getAIExecutionReport, exportExecutionPdf } from '@/lib/api/ai-smart';
import type { ExecutionReport } from '@/lib/api/ai-smart';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'default' },
  running: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  failed: { label: '失败', color: 'red' },
  cancelled: { label: '已取消', color: 'orange' },
};

export default function AIReportDetailPage() {
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
      .catch(() => message.error('加载报告失败'))
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
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!report) {
    return <div style={{ textAlign: 'center', padding: 80 }}>报告不存在</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>返回</Button>
        <Button type="primary" icon={<FilePdfOutlined />} loading={exporting} onClick={handleExportPdf}>
          导出 PDF
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="状态"
              value={report.status === 'completed' ? '通过' : report.status === 'failed' ? '失败' : '已取消'}
              valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="完成步骤" value={report.steps_completed} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="耗时" value={report.duration_seconds} suffix="s" /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="ID" value={report.record_id} /></Card>
        </Col>
      </Row>

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="用例名称">{report.case_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="任务描述">{report.task_description}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={STATUS_MAP[report.status]?.color || 'default'}>
              {STATUS_MAP[report.status]?.label || report.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">{report.started_at || '-'}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{report.completed_at || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {report.summary && (
        <Card title="执行总结" style={{ marginBottom: 16 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{report.summary}</pre>
        </Card>
      )}

      {report.execution_log && report.execution_log.length > 0 && (
        <Card title="执行日志" style={{ marginBottom: 16 }}>
          <Table
            dataSource={report.execution_log as Record<string, unknown>[]}
            rowKey={(r: any) => `${r.time}-${r.step}`}
            size="small" pagination={false}
            columns={[
              { title: '时间', dataIndex: 'time', width: 80 },
              { title: '步骤', dataIndex: 'step' },
              {
                title: '状态', dataIndex: 'status', width: 80,
                render: (v: string) => (
                  <Tag color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'blue'}>{v}</Tag>
                ),
              },
            ]}
          />
        </Card>
      )}

      {report.planned_tasks && report.planned_tasks.length > 0 && (
        <Card title="计划任务">
          <Table
            dataSource={report.planned_tasks as Record<string, unknown>[]}
            rowKey="task"
            size="small" pagination={false}
            columns={[
              { title: '任务', dataIndex: 'task', ellipsis: true },
              { title: '状态', dataIndex: 'status', width: 100 },
            ]}
          />
        </Card>
      )}

      {report.gif_recording && (
        <Card title="GIF 录制" style={{ marginTop: 16 }}>
          <img
            src={`/${report.gif_recording}`}
            alt="录制回放"
            style={{ maxWidth: '100%', border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </Card>
      )}
    </div>
  );
}
