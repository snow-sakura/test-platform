'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Table, Button, Space, message, Modal, Form, Input, Select, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getReviews, createReview, getMyReviewTasks } from '@/lib/api/test-management';
import type { TestReview } from '@/lib/api/test-management';
import { useEffect } from 'react';

export default function ReviewsPage() {
  const t = useTranslations();

  const STATUS_MAP = useMemo(() => ({
    draft: { color: 'default', label: t('testManagement.case.draft') },
    in_progress: { color: 'processing', label: t('testManagement.review.inProgress') },
    completed: { color: 'success', label: t('common.completed') },
  }), [t]);
  const [reviews, setReviews] = useState<TestReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await getReviews();
      setReviews(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReviews(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createReview(values);
      message.success(t('common.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      loadReviews();
    } catch { message.error(t('common.createFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#666' }}>{t('testManagement.review.title')}</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t('testManagement.review.create')}</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={reviews}
        pagination={{ total, pageSize: 20, showTotal: (totalCount) => t('common.totalCount', { count: totalCount }) }} size="small"
        columns={[
          { title: t('testManagement.case.titleLabel'), dataIndex: 'title' },
          { title: t('testManagement.case.status'), dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={STATUS_MAP[v as keyof typeof STATUS_MAP]?.color}>{STATUS_MAP[v as keyof typeof STATUS_MAP]?.label || v}</Tag>,
          },
          { title: t('testManagement.case.priority'), dataIndex: 'priority', width: 80 },
          { title: t('common.updatedAt'), dataIndex: 'deadline', width: 120 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Button type="link" size="small">{record.status === 'completed' ? t('common.detail') : t('testManagement.review.edit')}</Button>
            ),
          },
        ]}
      />

      <Modal title={t('testManagement.review.create')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('testManagement.case.titleLabel')} rules={[{ required: true }]}>
            <Input placeholder={t('testManagement.case.titleLabel')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="priority" label={t('testManagement.case.priority')} initialValue="MEDIUM">
              <Select style={{ width: 120 }}
                options={[
                  { label: t('testManagement.case.high'), value: 'HIGH' },
                  { label: t('testManagement.case.medium'), value: 'MEDIUM' },
                  { label: t('testManagement.case.low'), value: 'LOW' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
