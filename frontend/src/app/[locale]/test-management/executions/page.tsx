'use client';

import { useState, useEffect } from 'react';
import { Button, Select, message, Table, Tag } from 'antd';
import { getPlans, getRun } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestPlan } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useTranslations } from 'next-intl';

export default function ExecutionsPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  const loadPlans = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getPlans(projectId);
      setPlans(res.data.results || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); }, [projectId]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('common.selectProject')}
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
          { title: t('testManagement.plan.name'), dataIndex: 'name' },
          { title: t('testManagement.plan.executionRounds'), dataIndex: 'run_count', width: 100 },
          { title: t('testManagement.execution.isActive'), dataIndex: 'is_active', width: 80,
            render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? t('common.yes') : t('common.no')}</Tag>,
          },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Button type="link" size="small">{t('testManagement.execution.viewExecution')}</Button>
            ),
          },
        ]}
      />
    </div>
  );
}
