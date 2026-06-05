'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Table, Tag, Space, message, Modal, Select, Input, Row, Col, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getCases, deleteCase, batchDeleteCases } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestCaseListItem } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  HIGH: { color: 'red', label: '高' },
  MEDIUM: { color: 'orange', label: '中' },
  LOW: { color: 'blue', label: '低' },
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_review: { color: 'processing', label: '待评审' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function CaseListPage() {
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [cases, setCases] = useState<TestCaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 加载项目列表
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch(() => {});
  }, []);

  // 加载用例列表
  const loadCases = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getCases({
        project_id: projectId, page, page_size: 20,
        search: search || undefined,
        status: statusFilter,
        priority: priorityFilter,
      });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // 删除单个用例
  const handleDelete = async (id: number) => {
    try {
      await deleteCase(id);
      message.success('已删除');
      loadCases();
    } catch {
      message.error('删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    Modal.confirm({
      title: `确定删除选中的 ${selectedRowKeys.length} 个用例？`,
      onOk: async () => {
        try {
          await batchDeleteCases(selectedRowKeys as number[]);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          loadCases();
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  const columns: ColumnsType<TestCaseListItem> = [
    {
      title: '标题', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/cases/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => {
        const p = PRIORITY_MAP[v] || { color: 'default', label: v };
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const s = STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    { title: '类型', dataIndex: 'case_type', key: 'case_type', width: 80 },
    { title: '步骤', dataIndex: 'step_count', key: 'step_count', width: 60 },
    { title: '评论', dataIndex: 'comment_count', key: 'comment_count', width: 60 },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => router.push(`/${locale}/test-management/cases/${record.id}`)}
          >
            查看
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col span={6}>
          <Select
            placeholder="请选择项目"
            style={{ width: '100%' }}
            value={projectId}
            onChange={(v) => { setProjectId(v); setPage(1); }}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            showSearch
            filterOption
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={[
              { label: '草稿', value: 'draft' },
              { label: '待评审', value: 'pending_review' },
              { label: '已通过', value: 'approved' },
              { label: '已驳回', value: 'rejected' },
            ]}
          />
        </Col>
        <Col span={3}>
          <Select
            placeholder="优先级"
            allowClear
            style={{ width: '100%' }}
            value={priorityFilter}
            onChange={(v) => { setPriorityFilter(v); setPage(1); }}
            options={[
              { label: '高', value: 'HIGH' },
              { label: '中', value: 'MEDIUM' },
              { label: '低', value: 'LOW' },
            ]}
          />
        </Col>
        <Col span={5}>
          <Input
            placeholder="搜索标题"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => setPage(1)}
            allowClear
            onClear={() => setPage(1)}
          />
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Space>
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                删除 {selectedRowKeys.length} 项
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />}
              disabled={!projectId}
              onClick={() => router.push(`/${locale}/test-management/cases/create?project_id=${projectId}`)}
            >
              新建用例
            </Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={cases}
        loading={loading}
        pagination={{
          current: page, total, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `共 ${t} 条`,
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        size="small"
      />
    </div>
  );
}
