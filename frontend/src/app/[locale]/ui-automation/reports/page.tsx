'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Tag, message } from 'antd';
import { getUiExecutions } from '@/lib/api/ui-automation';
import type { UiTestExecution } from '@/lib/api/ui-automation';

export default function UiReportsPage() {
  const t = useTranslations();
  const [data, setData] = useState<UiTestExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUiExecutions({ page_size: 100 });
      setData(res.data.results || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resultColors: Record<string, string> = { passed: 'green', failed: 'red', running: 'blue', pending: 'orange' };
  const resultLabels: Record<string, string> = { passed: 'common.passed', failed: 'common.failed', running: 'common.running', pending: 'common.pending' };

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>{t('uiAutomation.executionReport')}</h3>
      <Table rowKey="id" loading={loading} dataSource={data} size="small"
        columns={[
          { title: t('uiAutomation.executionId'), dataIndex: 'id', width: 80 },
          { title: t('uiAutomation.caseId'), dataIndex: 'test_case_id', width: 90 },
          { title: t('uiAutomation.suiteId'), dataIndex: 'suite_id', width: 90 },
          {
            title: t('uiAutomation.result'), dataIndex: 'result', width: 90,
            render: (v: string) => <Tag color={resultColors[v] || 'default'}>{t(resultLabels[v]) || v}</Tag>,
          },
          { title: t('uiAutomation.duration'), dataIndex: 'duration_ms', width: 100 },
          {
            title: t('uiAutomation.startTime'), dataIndex: 'started_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          {
            title: t('uiAutomation.endTime'), dataIndex: 'completed_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          { title: t('uiAutomation.errorMessage'), dataIndex: 'error_message', ellipsis: true },
        ]}
      />
    </div>
  );
}
