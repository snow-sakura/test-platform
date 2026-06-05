'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Card, Table, message, Spin, Tag, Select, Input, Space, Progress, Statistic, Row, Col,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getRun, updateRunCaseStatus } from '@/lib/api/test-management';
import type { TestRun } from '@/lib/api/test-management';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  untested: { color: 'default', label: '未执行' },
  passed: { color: 'success', label: '通过' },
  failed: { color: 'error', label: '失败' },
  blocked: { color: 'warning', label: '阻塞' },
};

export default function RunExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const runId = Number(params.id);
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRun = () => {
    setLoading(true);
    getRun(runId).then((res) => setRun(res.data)).catch(() => {
      message.error('加载失败');
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadRun(); }, [runId]);

  const handleStatusUpdate = async (runCaseId: number, status: string) => {
    try {
      await updateRunCaseStatus(runId, runCaseId, { status });
      message.success('状态已更新');
      loadRun();
    } catch { message.error('更新失败'); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!run) return null;

  const passRate = run.total_cases > 0 ? Math.round((run.passed / run.total_cases) * 100) : 0;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回
      </Button>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总用例" value={run.total_cases} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="通过" value={run.passed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="失败" value={run.failed} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="阻塞" value={run.blocked} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      <Card title={run.name}>
        <Progress percent={passRate} size="small" />
        <p style={{ marginTop: 8, color: '#666' }}>状态：<Tag color={run.status === 'completed' ? 'success' : 'processing'}>{run.status === 'completed' ? '已完成' : '进行中'}</Tag></p>

        <Table
          rowKey="id"
          dataSource={(run as any).run_cases || []}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无用例' }}
          columns={[
            { title: 'ID', dataIndex: 'case_id', width: 60 },
            {
              title: '状态', dataIndex: 'status', width: 120,
              render: (v: string, record: any) => (
                <Select
                  value={v || 'untested'}
                  size="small"
                  style={{ width: 100 }}
                  onChange={(val) => handleStatusUpdate(record.id, val)}
                  options={[
                    { label: '通过', value: 'passed' },
                    { label: '失败', value: 'failed' },
                    { label: '阻塞', value: 'blocked' },
                    { label: '未执行', value: 'untested' },
                  ]}
                />
              ),
            },
            { title: '实际结果', dataIndex: 'actual_result', ellipsis: true },
            { title: '备注', dataIndex: 'comments', ellipsis: true },
            { title: '耗时(秒)', dataIndex: 'elapsed_time', width: 80 },
          ]}
        />
      </Card>
    </div>
  );
}
