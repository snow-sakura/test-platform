'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, message } from 'antd';
import { getUiExecutions } from '@/lib/api/ui-automation';
import type { UiTestExecution } from '@/lib/api/ui-automation';

export default function UiReportsPage() {
  const [data, setData] = useState<UiTestExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getUiExecutions({ page_size: 100 });
      setData(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resultColors: Record<string, string> = { passed: 'green', failed: 'red', running: 'blue', pending: 'orange' };
  const resultLabels: Record<string, string> = { passed: '通过', failed: '失败', running: '运行中', pending: '待执行' };

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>UI 自动化执行报告</h3>
      <Table rowKey="id" loading={loading} dataSource={data} size="small"
        columns={[
          { title: '执行 ID', dataIndex: 'id', width: 80 },
          { title: '用例 ID', dataIndex: 'test_case_id', width: 90 },
          { title: '套件 ID', dataIndex: 'suite_id', width: 90 },
          {
            title: '结果', dataIndex: 'result', width: 90,
            render: (v: string) => <Tag color={resultColors[v] || 'default'}>{resultLabels[v] || v}</Tag>,
          },
          { title: '耗时(ms)', dataIndex: 'duration_ms', width: 100 },
          {
            title: '开始时间', dataIndex: 'started_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          {
            title: '完成时间', dataIndex: 'completed_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          { title: '错误信息', dataIndex: 'error_message', ellipsis: true },
        ]}
      />
    </div>
  );
}
