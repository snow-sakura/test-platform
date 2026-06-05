'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Table, Tag, Space, message, Modal, Form, Input, Select, Row, Col, Popconfirm, Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getPlans, createPlan, updatePlan, deletePlan } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import { getVersions } from '@/lib/api/test-management';
import type { TestPlan } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import type { TestVersion } from '@/lib/api/test-management';

export default function PlanListPage() {
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  // 项目列表
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);

  // 版本映射
  const [versions, setVersions] = useState<TestVersion[]>([]);

  // 计划列表
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 项目名称映射
  const projectMap = useMemo(() => {
    const map: Record<number, string> = {};
    projects.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // 版本名称映射
  const versionMap = useMemo(() => {
    const map: Record<number, string> = {};
    versions.forEach((v) => { map[v.id] = v.name; });
    return map;
  }, [versions]);

  // 加载项目列表
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  // 加载版本列表
  useEffect(() => {
    getVersions({ page_size: 100 }).then((res) => {
      setVersions(res.data.results || []);
    }).catch((e) => console.warn('加载版本列表失败', e));
  }, []);

  // 加载计划列表
  const loadPlans = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getPlans(projectId, {
        page, page_size: 20, search: search || undefined,
      });
      setPlans(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, search]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 打开新建弹窗
  const handleOpenCreate = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEdit = (record: TestPlan) => {
    setEditingPlan(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      version_id: record.version_id,
      is_active: record.is_active,
    });
    setModalOpen(true);
  };

  // 提交表单（新建/编辑）
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingPlan) {
        await updatePlan(editingPlan.id, values);
        message.success('更新成功');
      } else {
        await createPlan(projectId!, values);
        message.success('创建成功');
      }
      setModalOpen(false);
      form.resetFields();
      loadPlans();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单验证失败
      message.error(editingPlan ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 删除计划
  const handleDelete = async (id: number) => {
    try {
      await deletePlan(id);
      message.success('已删除');
      loadPlans();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<TestPlan> = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 60,
    },
    {
      title: '名称', dataIndex: 'name', key: 'name', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/plans/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '项目', dataIndex: 'project_id', key: 'project_id', width: 120,
      render: (v: number) => projectMap[v] || `项目#${v}`,
    },
    {
      title: '版本', dataIndex: 'version_id', key: 'version_id', width: 100,
      render: (v: number | null | undefined) => (v ? (versionMap[v] || `版本#${v}`) : '-'),
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '激活' : '未激活'}</Tag>,
    },
    {
      title: '运行次数', dataIndex: 'run_count', key: 'run_count', width: 90,
    },
    {
      title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170,
    },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除此计划？" onConfirm={() => handleDelete(record.id)}>
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
        <Col span={6}>
          <Input
            placeholder="搜索计划名称"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => setPage(1)}
            allowClear
            onClear={() => setPage(1)}
          />
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />}
            disabled={!projectId}
            onClick={handleOpenCreate}
          >
            新建计划
          </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={plans}
        loading={loading}
        pagination={{
          current: page, total, pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `共 ${t} 条`,
        }}
        size="small"
      />

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingPlan ? '编辑计划' : '新建计划'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
            <Input placeholder="计划名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="计划描述（可选）" />
          </Form.Item>
          <Form.Item name="version_id" label="关联版本">
            <Select
              placeholder="选择版本（可选）"
              allowClear
              options={versions.map((v) => ({ label: v.name, value: v.id }))}
            />
          </Form.Item>
          {editingPlan && (
            <Form.Item name="is_active" label="状态" valuePropName="checked">
              <Switch checkedChildren="激活" unCheckedChildren="未激活" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
