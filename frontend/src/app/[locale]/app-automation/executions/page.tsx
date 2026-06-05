'use client';

import { useEffect, useState } from 'react';
import { Table, message, Modal, Tag, Space, Row, Col, Card, Statistic } from 'antd';
import {
  getAppExecutions, getAppExecution,
} from '@/lib/api/app-automation';
import type { AppTestExecution } from '@/lib/api/app-automation';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  running: { label: '执行中', color: 'processing' },
  passed: { label: '通过', color: 'green' },
  failed: { label: '失败', color: 'red' },
  skipped: { label: '跳过', color: 'default' },
};

export default function AppExecutionsPage() {
  const [executions, setExecutions] = useState<AppTestExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentExec, setCurrentExec] = useState<AppTestExecution | null>(null);

  const loadExecutions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAppExecutions({ page, page_size: 20 });
      setExecutions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, []);

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppExecution(id);
      setCurrentExec(res.data);
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  return (
    <div>
      <Table rowKey="id" loading={loading} dataSource={executions} size="small"
        pagination={{ total, pageSize: 20, onChange: loadExecutions, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '执行 ID', dataIndex: 'id', width: 80 },
          {
            title: '类型', width: 100,
            render: (_, r) => r.test_case_id ? '单用例' : r.suite_id ? '套件' : '-',
          },
          {
            title: '结果', dataIndex: 'result', width: 80,
            render: (v: string) => {
              const s = STATUS_MAP[v] || { label: v || '未知', color: 'default' };
              return <Tag color={s.color}>{s.label}</Tag>;
            },
          },
          { title: '耗时(ms)', dataIndex: 'duration_ms', width: 100, render: (v: number | null) => v ?? '-' },
          { title: '错误信息', dataIndex: 'error_message', ellipsis: true },
          { title: '执行时间', dataIndex: 'started_at', width: 170 },
          {
            title: '操作', width: 80,
            render: (_, record) => (
              <a onClick={() => viewDetail(record.id)}>详情</a>
            ),
          },
        ]}
      />

      <Modal title={`执行详情 #${currentExec?.id}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={600}
      >
        {currentExec && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="状态"
                  value={STATUS_MAP[currentExec.result || '']?.label || '未知'}
                  valueStyle={{ color: currentExec.result === 'passed' ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="耗时" value={currentExec.duration_ms ?? 0} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic title="截图数" value={currentExec.screenshots?.length || 0} />
              </Col>
            </Row>
            {currentExec.error_message && (
              <Card size="small" title="错误信息" style={{ marginBottom: 16 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{currentExec.error_message}</pre>
              </Card>
            )}
            {currentExec.screenshots?.length > 0 && (
              <div>
                <strong>截图</strong>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {currentExec.screenshots.map((s) => (
                    <Col key={s.id} span={12}>
                      <img src={s.image_path} alt={`截图 ${s.id}`} style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 4 }} />
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
