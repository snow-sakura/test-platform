'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Tag, Space, Row, Col, Select,
} from 'antd';
import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { getUiExecutions, abortUiExecution, deleteUiExecution } from '@/lib/api/ui-automation';
import type { UiTestExecution } from '@/lib/api/ui-automation';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待执行', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已中止', value: 'aborted' },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'success',
  failed: 'error', aborted: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待执行', running: '运行中', completed: '已完成',
  failed: '失败', aborted: '已中止',
};

const RESULT_COLOR_MAP: Record<string, string> = {
  passed: 'green', failed: 'red',
};

export default function UiExecutionsPage() {
  const [executions, setExecutions] = useState<UiTestExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await getUiExecutions(params);
      setExecutions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, [page, statusFilter]);

  const handleAbort = async (id: number) => {
    try {
      await abortUiExecution(id);
      message.success('已中止执行');
      loadExecutions();
    } catch { message.error('中止失败'); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder="执行状态" allowClear style={{ width: '100%' }}
            value={statusFilter || undefined} onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={STATUS_OPTIONS}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadExecutions}>刷新</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={executions}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '套件 ID', dataIndex: 'suite_id', width: 80, render: (v: number | null) => v ?? '-' },
          { title: '用例 ID', dataIndex: 'test_case_id', width: 80, render: (v: number | null) => v ?? '-' },
          {
            title: '状态', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLOR_MAP[v] || 'default'}>{STATUS_LABEL_MAP[v] || v}</Tag>,
          },
          {
            title: '结果', dataIndex: 'result', width: 80,
            render: (v: string | null) => v
              ? <Tag color={RESULT_COLOR_MAP[v] || 'default'}>{v === 'passed' ? '通过' : '失败'}</Tag>
              : '-',
          },
          { title: '开始时间', dataIndex: 'started_at', width: 170, render: (v: string | null) => v ?? '-' },
          { title: '完成时间', dataIndex: 'completed_at', width: 170, render: (v: string | null) => v ?? '-' },
          { title: '耗时(ms)', dataIndex: 'duration_ms', width: 90, render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-' },
          { title: '错误信息', dataIndex: 'error_message', ellipsis: true, render: (v: string | null) => v ?? '-' },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                {(record.status === 'pending' || record.status === 'running') && (
                  <Button type="link" size="small" icon={<StopOutlined />}
                    onClick={() => handleAbort(record.id)}
                  >中止</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
