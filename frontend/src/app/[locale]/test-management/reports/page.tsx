'use client';

import { useState } from 'react';
import { Table, Button, Select, message } from 'antd';
import { getReports, createReport } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestReport } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';

export default function ReportsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch(() => {});
  }, []);

  const loadReports = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getReports(projectId);
      setReports(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, [projectId]);

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
        rowKey="id" loading={loading} dataSource={reports}
        pagination={false} size="small"
        columns={[
          { title: '报告名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'report_type', width: 100 },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
        ]}
      />
    </div>
  );
}
