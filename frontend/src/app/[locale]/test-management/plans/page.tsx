'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';

  // Project list
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Version mapping
  const [versions, setVersions] = useState<TestVersion[]>([]);

  // Plan list
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Project name mapping
  const projectMap = useMemo(() => {
    const map: Record<number, string> = {};
    projects.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [projects]);

  // Version name mapping
  const versionMap = useMemo(() => {
    const map: Record<number, string> = {};
    versions.forEach((v) => { map[v.id] = v.name; });
    return map;
  }, [versions]);

  // Load project list
  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => {
      setProjects(res.data.results || []);
    }).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  // Load version list
  useEffect(() => {
    getVersions({ page_size: 100 }).then((res) => {
      setVersions(res.data.results || []);
    }).catch((e) => console.warn('Failed to load version list', e));
  }, []);

  // Load plan list
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
      message.error(t('testManagement.plan.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, page, search]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Open create modal
  const handleOpenCreate = () => {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  // Open edit modal
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

  // Submit form (create/edit)
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingPlan) {
        await updatePlan(editingPlan.id, values);
        message.success(t('testManagement.plan.updateSuccess'));
      } else {
        await createPlan(projectId!, values);
        message.success(t('testManagement.plan.createSuccess'));
      }
      setModalOpen(false);
      form.resetFields();
      loadPlans();
    } catch (err: any) {
      if (err?.errorFields) return; // Form validation failed
      message.error(editingPlan ? t('testManagement.plan.updateFailed') : t('testManagement.plan.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete plan
  const handleDelete = async (id: number) => {
    try {
      await deletePlan(id);
      message.success(t('testManagement.plan.deleted'));
      loadPlans();
    } catch {
      message.error(t('testManagement.plan.deleteFailed'));
    }
  };

  const columns: ColumnsType<TestPlan> = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 60,
    },
    {
      title: t('testManagement.plan.name'), dataIndex: 'name', key: 'name', ellipsis: true,
      render: (text: string, record) => (
        <a onClick={() => router.push(`/${locale}/test-management/plans/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: t('testManagement.plan.project'), dataIndex: 'project_id', key: 'project_id', width: 120,
      render: (v: number) => projectMap[v] || `Project#${v}`,
    },
    {
      title: t('testManagement.plan.version'), dataIndex: 'version_id', key: 'version_id', width: 100,
      render: (v: number | null | undefined) => (v ? (versionMap[v] || `Version#${v}`) : '-'),
    },
    {
      title: t('testManagement.plan.status'), dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? t('testManagement.plan.active') : t('testManagement.plan.inactive')}</Tag>,
    },
    {
      title: t('testManagement.plan.runCount'), dataIndex: 'run_count', key: 'run_count', width: 90,
    },
    {
      title: t('common.createdAt'), dataIndex: 'created_at', key: 'created_at', width: 170,
    },
    {
      title: t('common.action'), key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('testManagement.plan.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>{t('common.delete')}</Button>
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
            placeholder={t('common.selectProject')}
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
            placeholder={t('testManagement.plan.searchPlaceholder')}
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
            {t('testManagement.plan.create')}
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
          showTotal: (totalCount) => t('common.totalCount', { count: totalCount }),
        }}
        size="small"
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingPlan ? t('testManagement.plan.edit') : t('testManagement.plan.create')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('testManagement.plan.name')} rules={[{ required: true }]}>
            <Input placeholder={t('testManagement.plan.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('testManagement.plan.description')}>
            <Input.TextArea rows={3} placeholder={t('testManagement.plan.description')} />
          </Form.Item>
          <Form.Item name="version_id" label={t('testManagement.plan.versionLabel')}>
            <Select
              placeholder={t('testManagement.plan.selectVersion')}
              allowClear
              options={versions.map((v) => ({ label: v.name, value: v.id }))}
            />
          </Form.Item>
          {editingPlan && (
            <Form.Item name="is_active" label={t('testManagement.plan.status')} valuePropName="checked">
              <Switch checkedChildren={t('testManagement.plan.active')} unCheckedChildren={t('testManagement.plan.inactive')} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
