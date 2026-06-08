'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Tag, Space, Row, Col, Card, Statistic, Typography,
} from 'antd';
import {
  DeleteOutlined, StopOutlined, FileTextOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import {
  getAIExecutions, getAIExecution, deleteAIExecution, stopAIExecution,
  batchDeleteAIExecutions, getAIExecutionReport, exportExecutionPdf,
} from '@/lib/api/ai-smart';
import type { AIExecutionRecord, ExecutionReport } from '@/lib/api/ai-smart';

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'green', failed: 'red', cancelled: 'orange',
};

const STATUS_KEYS: Record<string, string> = {
  pending: 'waiting', running: 'running', completed: 'completed', failed: 'failed', cancelled: 'cancelled',
};

export default function AIExecutionsPage() {
  const t = useTranslations();
  const [executions, setExecutions] = useState<AIExecutionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AIExecutionRecord | null>(null);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const getStatusLabel = (status: string) => {
    const key = STATUS_KEYS[status] || status;
    return t(`aiSmart.executionRecord.${key}`) || status;
  };

  const loadExecutions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAIExecutions({ page, page_size: 20 });
      setExecutions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('aiSmart.executionRecord.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, []);

  const viewDetail = async (id: number) => {
    try {
      const res = await getAIExecution(id);
      setCurrentRecord(res.data);
      setDetailOpen(true);
    } catch { message.error(t('aiSmart.executionRecord.loadDetailFailed')); }
  };

  const viewReport = async (id: number) => {
    try {
      const res = await getAIExecutionReport(id);
      setReport(res.data);
      setReportOpen(true);
    } catch { message.error(t('aiSmart.executionRecord.loadReportFailed')); }
  };

  const handleStop = async (id: number) => {
    try {
      await stopAIExecution(id);
      message.success(t('aiSmart.executionRecord.stopped'));
      loadExecutions();
    } catch { message.error(t('aiSmart.executionRecord.operationFailed')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await batchDeleteAIExecutions(selectedRowKeys);
      message.success(t('aiSmart.executionRecord.batchDeleteSuccess'));
      setSelectedRowKeys([]);
      loadExecutions();
    } catch { message.error(t('aiSmart.executionRecord.deleteFailed')); }
  };

  const handleExportPdf = async (id: number) => {
    try {
      const res = await exportExecutionPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success(t('aiSmart.executionRecord.exportSuccess'));
    } catch { message.error(t('aiSmart.executionRecord.exportFailed')); }
  };

  return (
    <div>
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            {t('aiSmart.executionRecord.deleteSelected')} ({selectedRowKeys.length})
          </Button>
        </div>
      )}

      <Table rowKey="id" loading={loading} dataSource={executions} size="small"
        pagination={{ total, pageSize: 20, onChange: loadExecutions, showTotal: (totalCount) => t('common.totalCount', { count: totalCount }) }}
        rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as number[]) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: t('aiSmart.executionRecord.taskDesc'), dataIndex: 'task_description', ellipsis: true },
          { title: t('aiSmart.executionRecord.stepsCompleted'), dataIndex: 'steps_completed', width: 80 },
          {
            title: t('aiSmart.executionRecord.status'), dataIndex: 'status', width: 90,
            render: (v: string) => {
              return <Tag color={STATUS_COLORS[v] || 'default'}>{getStatusLabel(v)}</Tag>;
            },
          },
          { title: t('aiSmart.executionRecord.startTime'), dataIndex: 'started_at', width: 170 },
          {
            title: t('common.action'), width: 200,
            render: (_, record) => (
              <Space>
                <a onClick={() => viewDetail(record.id)}>{t('aiSmart.executionRecord.detail')}</a>
                <a onClick={() => viewReport(record.id)}>{t('aiSmart.executionRecord.report')}</a>
                <Button type="link" size="small" icon={<FilePdfOutlined />}
                  onClick={() => handleExportPdf(record.id)}
                >PDF</Button>
                {record.status === 'running' && (
                  <Button type="link" size="small" icon={<StopOutlined />}
                    onClick={() => handleStop(record.id)}
                  >{t('aiSmart.executionRecord.stop')}</Button>
                )}
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAIExecution(record.id); message.success(t('aiSmart.executionRecord.deleted')); loadExecutions(); } catch { message.error(t('aiSmart.executionRecord.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* detail modal */}
      <Modal title={`${t('aiSmart.executionRecord.executionDetail')} #${currentRecord?.id}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        {currentRecord && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Statistic title={t('aiSmart.executionRecord.status')} value={getStatusLabel(currentRecord.status)} /></Col>
              <Col span={6}><Statistic title={t('aiSmart.executionRecord.stepsCompleted')} value={currentRecord.steps_completed} /></Col>
              <Col span={6}><Statistic title={t('aiSmart.executionRecord.gifRecording')} value={currentRecord.enable_gif ? t('common.yes') : t('common.no')} /></Col>
              <Col span={6}><Statistic title={t('aiSmart.executionRecord.mode')} value={currentRecord.execution_mode === 'vision' ? t('aiSmart.executionRecord.vision') : t('aiSmart.executionRecord.text')} /></Col>
            </Row>
            <Text strong>{t('aiSmart.executionRecord.taskDesc')}：</Text>
            <p>{currentRecord.task_description}</p>
            {currentRecord.summary && (
              <>
                <Text strong>{t('aiSmart.executionRecord.summary')}：</Text>
                <p>{currentRecord.summary}</p>
              </>
            )}
            {currentRecord.execution_log && currentRecord.execution_log.length > 0 && (
              <>
                <Text strong>{t('aiSmart.executionRecord.log')}：</Text>
                <Table dataSource={currentRecord.execution_log as Record<string, unknown>[]} rowKey={(r: any) => `${r.time}-${r.step}`}
                  size="small" pagination={false}
                  columns={[
                    { title: t('aiSmart.executionRecord.time'), dataIndex: 'time', width: 80 },
                    { title: t('aiSmart.executionRecord.step'), dataIndex: 'step' },
                    {
                      title: t('aiSmart.executionRecord.status'), dataIndex: 'status', width: 80,
                      render: (v: string) => <Tag color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'blue'}>{v}</Tag>,
                    },
                  ]}
                />
              </>
            )}
            {currentRecord.gif_recording && (
              <div style={{ marginTop: 8 }}>
                <Text strong>{t('aiSmart.executionRecord.gifPlayback')}：</Text>
                <img src={`/${currentRecord.gif_recording}`} alt="recording" style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* report modal */}
      <Modal title={t('aiSmart.executionRecord.executionReport')} open={reportOpen}
        onCancel={() => setReportOpen(false)} footer={null} width={600}
      >
        {report && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title={t('aiSmart.executionRecord.status')} value={report.status === 'completed' ? t('aiSmart.executionRecord.passed') : report.status === 'failed' ? t('aiSmart.executionRecord.failed') : t('aiSmart.executionRecord.cancelled')}
                valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }} /></Col>
              <Col span={8}><Statistic title={t('aiSmart.executionRecord.stepsCompleted')} value={report.steps_completed} /></Col>
              <Col span={8}><Statistic title={t('aiSmart.executionRecord.duration')} value={report.duration_seconds} suffix="s" /></Col>
            </Row>
            <p><strong>{t('aiSmart.executionRecord.taskDesc')}：</strong>{report.task_description}</p>
            {report.summary && <p><strong>{t('aiSmart.executionRecord.summary')}：</strong>{report.summary}</p>}
            {report.gif_recording && (
              <div style={{ marginTop: 8 }}>
                <strong>{t('aiSmart.executionRecord.gifRecording')}：</strong>
                <img src={`/${report.gif_recording}`} alt="recording" style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
