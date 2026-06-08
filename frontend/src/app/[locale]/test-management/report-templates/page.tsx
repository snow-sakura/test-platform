'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Card, Table, Button, Modal, Form, Input, message, Space, Popconfirm, Switch, Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons';
import request from '@/lib/request';

interface ReportTemplate {
  id: number;
  name: string;
  template_config: Record<string, unknown>;
  is_default: boolean;
  created_at: string | null;
}

export default function ReportTemplatesPage() {
  const t = useTranslations();
  const [data, setData] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await request.get<{ count: number; results: ReportTemplate[] }>('/api/test-management/report-templates');
      setData(res.data.results || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await request.put(`/api/test-management/report-templates/${editing.id}`, values);
        message.success(t('common.updateSuccess'));
      } else {
        await request.post('/api/test-management/report-templates', {
          ...values,
          template_config: { sections: ['summary', 'details', 'charts'] },
        });
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch { message.error(editing ? t('common.updateFailed') : t('common.createFailed')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/api/test-management/report-templates/${id}`);
      message.success(t('common.deleted'));
      loadData();
    } catch { message.error(t('common.deleteFailed')); }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await request.put(`/api/test-management/report-templates/${id}`, { is_default: true });
      message.success(t('testManagement.reportTemplate.setDefaultSuccess'));
      loadData();
    } catch { message.error(t('testManagement.reportTemplate.setDefaultFailed')); }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: ReportTemplate) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      template_config: JSON.stringify(record.template_config, null, 2),
    });
    setModalOpen(true);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('testManagement.reportTemplate.create')}
        </Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={data} size="small" pagination={false}
        columns={[
          { title: t('common.id'), dataIndex: 'id', width: 60 },
          { title: t('testManagement.reportTemplate.name'), dataIndex: 'name', width: 200 },
          {
            title: t('testManagement.reportTemplate.isDefault'), dataIndex: 'is_default', width: 80,
            render: (v: boolean) => v ? <Tag color="gold">{t('testManagement.reportTemplate.isDefault')}</Tag> : '-',
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 200,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>{t('common.edit')}</Button>
                {!record.is_default && (
                  <Button size="small" icon={<StarOutlined />} onClick={() => handleSetDefault(record.id)}>
                    {t('testManagement.reportTemplate.setDefault')}
                  </Button>
                )}
                <Popconfirm title={t('testManagement.reportTemplate.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('testManagement.reportTemplate.edit') : t('testManagement.reportTemplate.create')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('testManagement.reportTemplate.name')} rules={[{ required: true, message: t('testManagement.reportTemplate.nameRequired') }]}>
            <Input placeholder={t('testManagement.reportTemplate.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="template_config" label={t('testManagement.reportTemplate.configJSON')}>
            <Input.TextArea rows={6}
              placeholder='{"sections": ["summary", "details", "charts"]}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
