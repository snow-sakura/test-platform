'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Tag, message, Space } from 'antd';
import { getAppExecutions } from '@/lib/api/app-automation';
import type { AppTestExecution } from '@/lib/api/app-automation';

export default function ReportsPage() {
  const t = useTranslations();
  const [data, setData] = useState<AppTestExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAppExecutions({ page_size: 100 });
      setData(res.data.results || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resultColors: Record<string, string> = { passed: 'green', failed: 'red' };
  const resultLabels: Record<string, string> = { passed: 'common.passed', failed: 'common.failed' };

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Reports</h3>
      <Table rowKey="id" loading={loading} dataSource={data} size="small"
        columns={[
          { title: t('appAutomation.execution.id'), dataIndex: 'id', width: 80 },
          { title: 'Test Case ID', dataIndex: 'test_case_id', width: 80 },
          { title: 'Suite ID', dataIndex: 'suite_id', width: 80 },
          {
            title: 'Result', dataIndex: 'result', width: 80,
            render: (v: string) => <Tag color={resultColors[v] || 'default'}>{t(resultLabels[v] || 'common.unknown')}</Tag>,
          },
          { title: t('appAutomation.execution.duration'), dataIndex: 'duration_ms', width: 100 },
          {
            title: 'Start Time', dataIndex: 'started_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString() : '-',
          },
          {
            title: 'End Time', dataIndex: 'completed_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString() : '-',
          },
          { title: 'Error', dataIndex: 'error_message', width: 200, ellipsis: true },
        ]}
      />
    </div>
  );
}
