'use client';

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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'default' },
  running: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  failed: { label: '失败', color: 'red' },
  cancelled: { label: '已取消', color: 'orange' },
};

export default function AIExecutionsPage() {
  const [executions, setExecutions] = useState<AIExecutionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AIExecutionRecord | null>(null);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const loadExecutions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAIExecutions({ page, page_size: 20 });
      setExecutions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, []);

  const viewDetail = async (id: number) => {
    try {
      const res = await getAIExecution(id);
      setCurrentRecord(res.data);
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  const viewReport = async (id: number) => {
    try {
      const res = await getAIExecutionReport(id);
      setReport(res.data);
      setReportOpen(true);
    } catch { message.error('加载报告失败'); }
  };

  const handleStop = async (id: number) => {
    try {
      await stopAIExecution(id);
      message.success('已停止');
      loadExecutions();
    } catch { message.error('操作失败'); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await batchDeleteAIExecutions(selectedRowKeys);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      loadExecutions();
    } catch { message.error('删除失败'); }
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
      message.success('导出成功');
    } catch { message.error('导出失败'); }
  };

  return (
    <div>
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
            删除选中 ({selectedRowKeys.length})
          </Button>
        </div>
      )}

      <Table rowKey="id" loading={loading} dataSource={executions} size="small"
        pagination={{ total, pageSize: 20, onChange: loadExecutions, showTotal: (t) => `共 ${t} 条` }}
        rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as number[]) }}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '任务描述', dataIndex: 'task_description', ellipsis: true },
          { title: '完成步骤', dataIndex: 'steps_completed', width: 80 },
          {
            title: '状态', dataIndex: 'status', width: 90,
            render: (v: string) => {
              const s = STATUS_MAP[v] || { label: v, color: 'default' };
              return <Tag color={s.color}>{s.label}</Tag>;
            },
          },
          { title: '开始时间', dataIndex: 'started_at', width: 170 },
          {
            title: '操作', width: 200,
            render: (_, record) => (
              <Space>
                <a onClick={() => viewDetail(record.id)}>详情</a>
                <a onClick={() => viewReport(record.id)}>报告</a>
                <Button type="link" size="small" icon={<FilePdfOutlined />}
                  onClick={() => handleExportPdf(record.id)}
                >PDF</Button>
                {record.status === 'running' && (
                  <Button type="link" size="small" icon={<StopOutlined />}
                    onClick={() => handleStop(record.id)}
                  >停止</Button>
                )}
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAIExecution(record.id); message.success('已删除'); loadExecutions(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* 详情弹窗 */}
      <Modal title={`执行详情 #${currentRecord?.id}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        {currentRecord && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Statistic title="状态" value={STATUS_MAP[currentRecord.status]?.label || currentRecord.status} /></Col>
              <Col span={6}><Statistic title="完成步骤" value={currentRecord.steps_completed} /></Col>
              <Col span={6}><Statistic title="GIF 录制" value={currentRecord.enable_gif ? '是' : '否'} /></Col>
              <Col span={6}><Statistic title="模式" value={currentRecord.execution_mode === 'vision' ? '视觉' : '文本'} /></Col>
            </Row>
            <Text strong>任务描述：</Text>
            <p>{currentRecord.task_description}</p>
            {currentRecord.summary && (
              <>
                <Text strong>总结：</Text>
                <p>{currentRecord.summary}</p>
              </>
            )}
            {currentRecord.execution_log && currentRecord.execution_log.length > 0 && (
              <>
                <Text strong>执行日志：</Text>
                <Table dataSource={currentRecord.execution_log as Record<string, unknown>[]} rowKey={(_, i) => String(i)}
                  size="small" pagination={false}
                  columns={[
                    { title: '时间', dataIndex: 'time', width: 80 },
                    { title: '步骤', dataIndex: 'step' },
                    {
                      title: '状态', dataIndex: 'status', width: 80,
                      render: (v: string) => <Tag color={v === 'completed' ? 'green' : v === 'failed' ? 'red' : 'blue'}>{v}</Tag>,
                    },
                  ]}
                />
              </>
            )}
            {currentRecord.gif_recording && (
              <div style={{ marginTop: 8 }}>
                <Text strong>GIF 回放：</Text>
                <img src={`/${currentRecord.gif_recording}`} alt="录制" style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 报告弹窗 */}
      <Modal title="执行报告" open={reportOpen}
        onCancel={() => setReportOpen(false)} footer={null} width={600}
      >
        {report && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title="状态" value={report.status === 'completed' ? '通过' : report.status === 'failed' ? '失败' : '已取消'}
                valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }} /></Col>
              <Col span={8}><Statistic title="完成步骤" value={report.steps_completed} /></Col>
              <Col span={8}><Statistic title="耗时" value={report.duration_seconds} suffix="s" /></Col>
            </Row>
            <p><strong>任务：</strong>{report.task_description}</p>
            {report.summary && <p><strong>总结：</strong>{report.summary}</p>}
            {report.gif_recording && (
              <div style={{ marginTop: 8 }}>
                <strong>GIF 录制：</strong>
                <img src={`/${report.gif_recording}`} alt="录制" style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
