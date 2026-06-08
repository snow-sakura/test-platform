'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Table, Tag, Space, message, Select, Row, Col,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getRuns, getPlans } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestRun } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';

export default function RunListPage() {
  const t = useTranslations();
  const router = useRouter();

  const RUN_STATUS_MAP = useMemo(() => ({
    pending: { color: 'default', label: t('common.pending') },
    in_progress: { color: 'processing', label: t('common.running') },
    completed: { color: 'success', label: t('common.completed') },
  }), [t]);

  const CASE_STATUS_MAP = useMemo(() => ({
    passed: { color: 'success', label: t('common.passed') },
    failed: { color: 'error', label: t('common.failed') },
    blocked: { color: 'warning', label: t('common.blocked') },
    untested: { color: 'default', label: t('common.untested') },
  }), [t]);
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  // Project list (for loading plans)
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Plan list (for filter)
  const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);

  // Run list
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // Load project list
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  // Load plan list (for filter)
  useEffect(() => {
    if (!projectId) { setPlans([]); return; }
    getPlans(projectId, { page_size: 100 }).then((res) => {
      setPlans(res.data.results?.map((p: any) => ({ id: p.id, name: p.name })) || []);
    }).catch(() => setPlans([]));
  }, [projectId]);

  // Load run list
  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRuns({
        plan_id: planFilter,
        status: statusFilter,
        page,
        page_size: 20,
      });
      setRuns(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch {
      message.error(t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, planFilter, statusFilter]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const columns: ColumnsType<TestRun> = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 60,
    },
    {
      title: t('common.name'), dataIndex: 'name', key: 'name', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/runs/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: t('testManagement.plan.title'), dataIndex: 'plan_id', key: 'plan_id', width: 80,
    },
    {
      title: t('common.status'), dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const s = RUN_STATUS_MAP[v as keyof typeof RUN_STATUS_MAP] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: t('common.passed'), dataIndex: 'passed', key: 'passed', width: 60,
      render: (v: number) => <Tag color="success">{v}</Tag>,
    },
    {
      title: t('common.failed'), dataIndex: 'failed', key: 'failed', width: 60,
      render: (v: number) => <Tag color="error">{v}</Tag>,
    },
    {
      title: t('common.blocked'), dataIndex: 'blocked', key: 'blocked', width: 60,
      render: (v: number) => <Tag color="warning">{v}</Tag>,
    },
    {
      title: t('common.untested'), dataIndex: 'untested', key: 'untested', width: 60,
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: t('common.total'), dataIndex: 'total_cases', key: 'total_cases', width: 70,
    },
    {
      title: t('common.createdAt'), dataIndex: 'created_at', key: 'created_at', width: 170,
    },
    {
      title: t('common.action'), key: 'action', width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />}
          onClick={() => router.push(`/${locale}/test-management/runs/${record.id}`)}
        >
          {t('common.detail')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col span={5}>
          <Select
            placeholder={t('common.selectProject')}
            style={{ width: '100%' }}
            value={projectId}
            onChange={(v) => { setProjectId(v); setPlanFilter(undefined); }}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            showSearch
            filterOption
            allowClear
          />
        </Col>
        <Col span={5}>
          <Select
            placeholder={t('testManagement.plan.title')}
            allowClear
            style={{ width: '100%' }}
            value={planFilter}
            onChange={(v) => { setPlanFilter(v); setPage(1); }}
            options={plans.map((p) => ({ label: p.name, value: p.id }))}
            disabled={!projectId}
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder={t('common.status')}
            allowClear
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: t('common.pending'), value: 'pending' },
              { label: t('common.running'), value: 'in_progress' },
              { label: t('common.completed'), value: 'completed' },
            ]}
          />
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={runs}
        loading={loading}
        pagination={{
          current: page, total, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (totalCount) => t('common.totalCount', { count: totalCount }),
        }}
        size="small"
      />
    </div>
  );
}
