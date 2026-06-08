'use client';

import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, message, Space, Tag, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import request from '@/lib/request';

interface ReviewTemplate {
  id: number;
  name: string;
  description: string | null;
  checklist: string[];
  default_reviewers: number[];
  is_active: boolean;
  created_at: string | null;
}

export default function ReviewTemplatesPage() {
  const t = useTranslations();
  const [data, setData] = useState<ReviewTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReviewTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await request.get<{ count: number; results: ReviewTemplate[] }>('/api/test-management/review-templates');
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
        await request.put(`/api/test-management/review-templates/${editing.id}`, values);
        message.success(t('common.updateSuccess'));
      } else {
        await request.post('/api/test-management/review-templates', values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch { message.error(t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/api/test-management/review-templates/${id}`);
      message.success(t('common.deleted'));
      loadData();
    } catch { message.error(t('common.deleteFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >{t('testManagement.reviewTemplate.create')}</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={data} size="small" pagination={false}
        columns={[
          { title: t('common.id'), dataIndex: 'id', width: 60 },
          { title: t('testManagement.reviewTemplate.name'), dataIndex: 'name', width: 200 },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          {
            title: t('testManagement.reviewTemplate.checklist'), dataIndex: 'checklist', width: 120,
            render: (v: string[]) => v ? t('common.itemCount', { count: v.length }) : '-',
          },
          {
            title: t('common.status'), dataIndex: 'is_active', width: 80,
            render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? t('common.enable') : t('common.disable')}</Tag>,
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('testManagement.reviewTemplate.edit') : t('testManagement.reviewTemplate.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('testManagement.reviewTemplate.name')} rules={[{ required: true }]}>
            <Input placeholder={t('testManagement.reviewTemplate.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} placeholder={t('testManagement.reviewTemplate.descriptionPlaceholder')} />
          </Form.Item>
          <Form.Item name="checklist" label={t('testManagement.reviewTemplate.checklistLabel')}
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(v) => ({ value: Array.isArray(v) ? v.join('\n') : '' })}
          >
            <Input.TextArea rows={4} placeholder={t('testManagement.reviewTemplate.checklistPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
