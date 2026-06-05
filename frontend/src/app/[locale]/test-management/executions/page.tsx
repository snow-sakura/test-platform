'use client';

import { useState } from 'react';
import { Button, Select, message, Table, Tag, Space } from 'antd';
import { getPlans, createPlan, getRun } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestPlan } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';

export default function ExecutionsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch(() => {});
  }, []);

  const loadPlans = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getPlans(projectId);
      setPlans(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, [projectId]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="请选择项目"
          style={{ width: 300 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch
          filterOption
        />
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={plans}
        pagination={false} size="small"
        columns={[
          { title: '计划名称', dataIndex: 'name' },
          { title: '执行轮次', dataIndex: 'run_count', width: 100 },
          { title: '是否激活', dataIndex: 'is_active', width: 80,
            render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '是' : '否'}</Tag>,
          },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Button type="link" size="small">查看执行</Button>
            ),
          },
        ]}
      />
    </div>
  );
}
