'use client';

import { useState } from 'react';
import { Table, Button, Space, message, Modal, Form, Input, Select, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getReviews, createReview, getMyReviewTasks } from '@/lib/api/test-management';
import type { TestReview } from '@/lib/api/test-management';
import { useEffect } from 'react';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  in_progress: { color: 'processing', label: '进行中' },
  completed: { color: 'success', label: '已完成' },
};

export default function ReviewsPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReviews(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createReview(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadReviews();
    } catch { message.error('创建失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#666' }}>评审管理 — 创建和跟踪测试用例评审流程</span>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建评审</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={reviews}
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }} size="small"
        columns={[
          { title: '标题', dataIndex: 'title' },
          { title: '状态', dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
          },
          { title: '优先级', dataIndex: 'priority', width: 80 },
          { title: '截止日期', dataIndex: 'deadline', width: 120 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Button type="link" size="small">{record.status === 'completed' ? '查看' : '进行评审'}</Button>
            ),
          },
        ]}
      />

      <Modal title="新建评审" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="评审标题" rules={[{ required: true }]}>
            <Input placeholder="评审标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="priority" label="优先级" initialValue="MEDIUM">
              <Select style={{ width: 120 }}
                options={[
                  { label: '高', value: 'HIGH' },
                  { label: '中', value: 'MEDIUM' },
                  { label: '低', value: 'LOW' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
