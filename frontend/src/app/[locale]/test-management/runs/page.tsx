'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Table, Tag, Space, message, Select, Row, Col,
} from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getRuns, getPlans } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestRun } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';

const RUN_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待执行' },
  in_progress: { color: 'processing', label: '执行中' },
  completed: { color: 'success', label: '已完成' },
};

const CASE_STATUS_MAP: Record<string, { color: string; label: string }> = {
  passed: { color: 'success', label: '通过' },
  failed: { color: 'error', label: '失败' },
  blocked: { color: 'warning', label: '阻塞' },
  untested: { color: 'default', label: '未测' },
};

export default function RunListPage() {
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  // 项目列表（仅用于加载计划）
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);

  // 计划列表（用于计划筛选器）
  const [plans, setPlans] = useState<{ id: number; name: string }[]>([]);

  // 执行列表
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // 加载项目列表
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch(() => {});
  }, []);

  // 加载计划列表（用于筛选器）
  useEffect(() => {
    if (!projectId) { setPlans([]); return; }
    getPlans(projectId, { page_size: 100 }).then((res) => {
      setPlans(res.data.results?.map((p: any) => ({ id: p.id, name: p.name })) || []);
    }).catch(() => setPlans([]));
  }, [projectId]);

  // 加载执行列表
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
      message.error('加载失败');
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
      title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/runs/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '计划 ID', dataIndex: 'plan_id', key: 'plan_id', width: 80,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const s = RUN_STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '通过', dataIndex: 'passed', key: 'passed', width: 60,
      render: (v: number) => <Tag color="success">{v}</Tag>,
    },
    {
      title: '失败', dataIndex: 'failed', key: 'failed', width: 60,
      render: (v: number) => <Tag color="error">{v}</Tag>,
    },
    {
      title: '阻塞', dataIndex: 'blocked', key: 'blocked', width: 60,
      render: (v: number) => <Tag color="warning">{v}</Tag>,
    },
    {
      title: '未测', dataIndex: 'untested', key: 'untested', width: 60,
      render: (v: number) => <Tag>{v}</Tag>,
    },
    {
      title: '总用例', dataIndex: 'total_cases', key: 'total_cases', width: 70,
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />}
          onClick={() => router.push(`/${locale}/test-management/runs/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col span={5}>
          <Select
            placeholder="选择项目（加载计划）"
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
            placeholder="按计划筛选"
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
            placeholder="按状态筛选"
            allowClear
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: '待执行', value: 'pending' },
              { label: '执行中', value: 'in_progress' },
              { label: '已完成', value: 'completed' },
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
          showTotal: (t) => `共 ${t} 条`,
        }}
        size="small"
      />
    </div>
  );
}
