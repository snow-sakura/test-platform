'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, message, Space } from 'antd';
import { getAppExecutions } from '@/lib/api/app-automation';
import type { AppTestExecution } from '@/lib/api/app-automation';

export default function ReportsPage() {
  const [data, setData] = useState<AppTestExecution[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAppExecutions({ page_size: 100 });
      setData(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resultColors: Record<string, string> = { passed: 'green', failed: 'red' };
  const resultLabels: Record<string, string> = { passed: '通过', failed: '失败' };

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>执行报告</h3>
      <Table rowKey="id" loading={loading} dataSource={data} size="small"
        columns={[
          { title: '执行 ID', dataIndex: 'id', width: 80 },
          { title: '用例 ID', dataIndex: 'test_case_id', width: 80 },
          { title: '套件 ID', dataIndex: 'suite_id', width: 80 },
          {
            title: '结果', dataIndex: 'result', width: 80,
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
          { title: '错误信息', dataIndex: 'error_message', width: 200, ellipsis: true },
        ]}
      />
    </div>
  );
}
