'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Card, Space, Tag, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, CodeOutlined } from '@ant-design/icons';

import {
  getScenes, createScene, updateScene, deleteScene, executeScene,
} from '@/lib/api/performance';
import { getApiProjects } from '@/lib/api/api-testing';
import type { PerformanceScene } from '@/lib/api/performance';
import type { ApiProject } from '@/lib/api/api-testing';

const SCENE_TYPE_VALUES = ['httpx', 'jmeter'] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'default', ready: 'blue', archived: 'warning',
};

export default function PerformanceScenesPage() {
  const t = useTranslations();
  const SCENE_TYPES = [
    { label: t('performance.scene.http'), value: 'httpx' },
    { label: t('performance.scene.jmeter'), value: 'jmeter' },
  ];
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<PerformanceScene[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn(t('performance.scene.loadProjectsFailed'), e));
  }, []);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getScenes({ project_id: projectId, page, page_size: 20 });
      setScenes(res.data.results || []);
      setTotal(res.data.count);
    } catch { message.error(t('performance.scene.loadScenesFailed')); }
    finally { setLoading(false); }
  }, [projectId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await createScene(projectId!, {
        name: values.name,
        description: values.description,
        scenario_type: values.scenario_type || 'httpx',
        config: values.config ? JSON.parse(values.config) : {},
      });
      message.success(t('performance.scene.createSuccess'));
      setCreateOpen(false);
      form.resetFields();
      setPage(1);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(t('performance.scene.createFailed'));
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: t('performance.scene.deleteConfirm'),
      content: t('performance.scene.deleteContent', { name }),
      okText: t('common.confirm'), cancelText: t('common.cancel'), okType: 'danger',
      onOk: async () => {
        try {
          await deleteScene(id);
          message.success(t('performance.scene.deleted'));
          fetchData();
        } catch { message.error(t('performance.scene.deleteFailed')); }
      },
    });
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeScene(id);
      message.success(t('performance.scene.executionTriggered'));
    } catch { message.error(t('performance.scene.executeFailed')); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: t('performance.scene.name'), dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: t('performance.scene.type'), dataIndex: 'scenario_type', key: 'scenario_type', width: 130,
      render: (v: string) => <Tag>{v === 'jmeter' ? t('performance.scene.jmeter') : t('performance.scene.http')}</Tag>,
    },
    {
      title: t('performance.scene.status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: t('performance.scene.updatedAt'), dataIndex: 'updated_at', key: 'updated_at', width: 180 },
    {
      title: t('common.action'), key: 'action', width: 160,
      render: (_: any, record: PerformanceScene) => (
        <Space>
          <Button type="link" size="small" icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record.id)}>{t('performance.scene.execute')}</Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}>{t('performance.scene.delete')}</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* project selector */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('performance.scene.selectProject')}
          style={{ width: 300 }}
          value={projectId}
          onChange={(v) => { setProjectId(v); setPage(1); }}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch filterOption
        />
      </div>

      <Card
        size="small" title={t('performance.scene.title')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} disabled={!projectId}>{t('performance.scene.create')}</Button>}
      >
        <Table
          dataSource={scenes} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (total) => t('common.totalCount', { count: total }) }}
          size="small"
        />
      </Card>

      <Modal title={t('performance.scene.edit')} open={createOpen} onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }} okText={t('common.confirm')} cancelText={t('common.cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('performance.scene.name')} rules={[{ required: true, message: t('performance.scene.nameRequired') }]}>
            <Input placeholder={t('performance.scene.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="scenario_type" label={t('performance.scene.type')} initialValue="httpx">
            <Select options={SCENE_TYPES} />
          </Form.Item>
          <Form.Item name="description" label={t('performance.scene.description')}>
            <Input.TextArea rows={2} placeholder={t('performance.scene.descriptionPlaceholder')} />
          </Form.Item>
          <Form.Item name="config" label={t('performance.scene.config')} extra='{"url":"http://...","method":"GET","concurrent_users":10,"duration_seconds":30}'>
            <Input.TextArea rows={4} placeholder={t('performance.scene.configPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
