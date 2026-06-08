'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiProjects, createUiProject, updateUiProject, deleteUiProject,
} from '@/lib/api/ui-automation';
import type { UiProject } from '@/lib/api/ui-automation';

export default function UiProjectsPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiProject | null>(null);
  const [form] = Form.useForm();

  const loadProjects = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getUiProjects({ page, page_size: 20 });
      setProjects(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('uiAutomation.project.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiProject(editing.id, values);
        message.success(t('uiAutomation.project.updateSuccess'));
      } else {
        await createUiProject(values);
        message.success(t('uiAutomation.project.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadProjects();
    } catch { message.error(t('uiAutomation.project.operationFailed')); }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: t('uiAutomation.project.deleteConfirm'),
      content: t('uiAutomation.project.deleteWarning'),
      onOk: async () => {
        try {
          await deleteUiProject(id);
          message.success(t('uiAutomation.project.deleted'));
          loadProjects();
        } catch { message.error(t('uiAutomation.project.deleteFailed')); }
      },
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('uiAutomation.project.create')}</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={projects}
        pagination={{ total, pageSize: 20, onChange: loadProjects, showTotal: (n) => t('common.totalCount', { count: n }) }}
        size="small"
        columns={[
          { title: t('uiAutomation.project.name'), dataIndex: 'name', width: 200 },
          { title: t('uiAutomation.project.targetUrl'), dataIndex: 'url', ellipsis: true },
          { title: t('uiAutomation.project.browser'), dataIndex: 'browser_type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: t('uiAutomation.project.elementCount'), dataIndex: 'element_count', width: 80 },
          { title: t('uiAutomation.project.pageObjectCount'), dataIndex: 'page_object_count', width: 100 },
          { title: t('uiAutomation.project.scriptCount'), dataIndex: 'script_count', width: 80 },
          {
            title: t('common.status'), dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? t('uiAutomation.project.enabled') : v}</Tag>,
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
                  onClick={() => handleDelete(record.id)}
                >{t('common.delete')}</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('uiAutomation.project.edit') : t('uiAutomation.project.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('uiAutomation.project.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.project.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('uiAutomation.project.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="url" label={t('uiAutomation.project.targetUrl')}>
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="browser_type" label={t('uiAutomation.project.browser')} initialValue="chromium">
            <Select options={[
              { label: 'Chromium', value: 'chromium' },
              { label: 'Firefox', value: 'firefox' },
              { label: 'WebKit', value: 'webkit' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
