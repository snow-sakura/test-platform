'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Tag, Space, Row, Col, Select,
} from 'antd';
import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { getUiExecutions, abortUiExecution, deleteUiExecution } from '@/lib/api/ui-automation';
import type { UiTestExecution } from '@/lib/api/ui-automation';

const STATUS_OPTIONS = [
  { label: 'common.all', value: '' },
  { label: 'common.pending', value: 'pending' },
  { label: 'common.running', value: 'running' },
  { label: 'common.completed', value: 'completed' },
  { label: 'common.failed', value: 'failed' },
  { label: 'common.aborted', value: 'aborted' },
];

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'default', running: 'processing', completed: 'success',
  failed: 'error', aborted: 'warning',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'common.pending', running: 'common.running', completed: 'common.completed',
  failed: 'common.failed', aborted: 'common.aborted',
};

const RESULT_COLOR_MAP: Record<string, string> = {
  passed: 'green', failed: 'red',
};

export default function UiExecutionsPage() {
  const t = useTranslations();
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
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, [page, statusFilter]);

  const handleAbort = async (id: number) => {
    try {
      await abortUiExecution(id);
      message.success(t('common.executionAborted'));
      loadExecutions();
    } catch { message.error(t('common.abortFailed')); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder={t('uiAutomation.executionStatus')} allowClear style={{ width: '100%' }}
            value={statusFilter || undefined} onChange={(v) => { setStatusFilter(v || ''); setPage(1); }}
            options={STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadExecutions}>{t('common.refresh')}</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={executions}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (n) => t('common.totalCount', { count: n }) }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: t('uiAutomation.suiteId'), dataIndex: 'suite_id', width: 80, render: (v: number | null) => v ?? '-' },
          { title: t('uiAutomation.caseId'), dataIndex: 'test_case_id', width: 80, render: (v: number | null) => v ?? '-' },
          {
            title: t('common.status'), dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLOR_MAP[v] || 'default'}>{t(STATUS_LABEL_MAP[v]) || v}</Tag>,
          },
          {
            title: t('uiAutomation.result'), dataIndex: 'result', width: 80,
            render: (v: string | null) => v
              ? <Tag color={RESULT_COLOR_MAP[v] || 'default'}>{v === 'passed' ? t('common.passed') : t('common.failed')}</Tag>
              : '-',
          },
          { title: t('uiAutomation.startTime'), dataIndex: 'started_at', width: 170, render: (v: string | null) => v ?? '-' },
          { title: t('uiAutomation.endTime'), dataIndex: 'completed_at', width: 170, render: (v: string | null) => v ?? '-' },
          { title: t('uiAutomation.duration'), dataIndex: 'duration_ms', width: 90, render: (v: number | null) => v != null ? `${v.toFixed(0)}ms` : '-' },
          { title: t('uiAutomation.errorMessage'), dataIndex: 'error_message', ellipsis: true, render: (v: string | null) => v ?? '-' },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                {(record.status === 'pending' || record.status === 'running') && (
                  <Button type="link" size="small" icon={<StopOutlined />}
                    onClick={() => handleAbort(record.id)}
                  >{t('common.abort')}</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
