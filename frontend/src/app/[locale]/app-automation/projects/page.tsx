'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getAppProjects, createAppProject, updateAppProject, deleteAppProject } from '@/lib/api/app-automation';
import type { AppProject } from '@/lib/api/app-automation';

export default function AppProjectsPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppProject | null>(null);
  const [form] = Form.useForm();

  const loadProjects = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAppProjects({ page, page_size: 20 });
      setProjects(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppProject(editing.id, values); message.success(t('common.updateSuccess')); }
      else { await createAppProject(values); message.success(t('common.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadProjects();
    } catch { message.error(t('common.operationFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span />
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >{t('common.create')}</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={projects} size="small"
        pagination={{ total, pageSize: 20, onChange: loadProjects, showTotal: (n) => t('common.totalCount', { count: n }) }}
        columns={[
          { title: t('common.name'), dataIndex: 'name', width: 200 },
          { title: t('common.type'), dataIndex: 'platform', width: 80, render: (v: string) => <Tag>{v}</Tag> },
          { title: t('common.items'), dataIndex: 'device_count', width: 80 },
          { title: t('common.items'), dataIndex: 'element_count', width: 80 },
          {
            title: t('common.status'), dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? t('common.enable') : v}</Tag>,
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppProject(record.id); message.success(t('common.deleted')); loadProjects(); } catch { message.error(t('common.deleteFailed')); } }}
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
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="platform" label={t('common.type')} initialValue="android">
            <Select options={[
              { label: 'Android', value: 'android' },
              { label: 'iOS', value: 'ios' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
