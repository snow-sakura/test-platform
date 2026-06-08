'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Tag, Space, InputNumber, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppElements, getAppImageCategories, getAppPackages,
  createAppElement, updateAppElement, deleteAppElement,
  createAppImageCategory, deleteAppImageCategory,
} from '@/lib/api/app-automation';
import type { AppProject, AppElement, AppImageCategory } from '@/lib/api/app-automation';

export default function AppElementsPage() {
  const t = useTranslations();

  const ELEMENT_TYPES = [
    { label: t('appAutomation.scene.imageMatch'), value: 'image' },
    { label: t('appAutomation.scene.coordClick'), value: 'coordinate' },
    { label: t('appAutomation.scene.areaClick'), value: 'region' },
    { label: 'Text Match', value: 'text' },
  ];

  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [elements, setElements] = useState<AppElement[]>([]);
  const [categories, setCategories] = useState<AppImageCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppElement | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  const loadCategories = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await getAppImageCategories(selectedProjectId);
      setCategories(res.data || []);
    } catch { /* ignore */ }
  };

  const loadElements = async (page = 1) => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getAppElements({ project_id: selectedProjectId, page, page_size: 20 });
      setElements(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); loadElements(); }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppElement(editing.id, values); message.success(t('common.updateSuccess')); }
      else { await createAppElement(values); message.success(t('common.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadElements();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleCreateCategory = async () => {
    const values = await form.validateFields();
    try {
      await createAppImageCategory({ project_id: selectedProjectId!, ...values });
      message.success(t('common.createSuccess'));
      setCatModalOpen(false);
      form.resetFields();
      loadCategories();
    } catch { message.error(t('common.createFailed')); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select placeholder={t('common.selectProject')} allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
              onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
            >{t('common.create')}</Button>
            <Button onClick={() => { form.resetFields(); setCatModalOpen(true); }} disabled={!selectedProjectId}>Categories</Button>
          </Space>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={elements} size="small"
        pagination={{ total, pageSize: 20, showTotal: (n) => t('common.totalCount', { count: n }) }}
        columns={[
          { title: t('common.name'), dataIndex: 'name', width: 150 },
          {
            title: t('common.type'), dataIndex: 'element_type', width: 100,
            render: (v: string) => ELEMENT_TYPES.find((t) => t.value === v)?.label || v,
          },
          { title: 'Threshold', dataIndex: 'threshold', width: 70, render: (v: number | null) => v ?? '-' },
          { title: 'Coordinates', dataIndex: 'coordinates', width: 120, render: (v: Record<string, number> | null) => v ? JSON.stringify(v) : '-' },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppElement(record.id); message.success(t('common.deleted')); loadElements(); } catch { message.error(t('common.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('common.edit') : t('common.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('common.name')} />
          </Form.Item>
          <Form.Item name="element_type" label={t('common.type')} rules={[{ required: true }]} initialValue="image">
            <Select options={ELEMENT_TYPES} />
          </Form.Item>
          <Form.Item name="threshold" label="Threshold (0-1)">
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} placeholder="e.g. 0.8" />
          </Form.Item>
          <Form.Item name="coordinates" label="Coordinates (JSON)">
            <Input.TextArea rows={2} placeholder='{"x": 100, "y": 200} or {"x": 100, "y": 200, "w": 50, "h": 80}' />
          </Form.Item>
          <Form.Item name="image_category_id" label="Category">
            <Select allowClear placeholder={t('common.selectPlaceholder')}
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Create Category" open={catModalOpen} onOk={handleCreateCategory} onCancel={() => setCatModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('common.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
