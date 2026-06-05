'use client';

import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, message, Space, Tag, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await request.put(`/api/test-management/review-templates/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await request.post('/api/test-management/review-templates', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch { message.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/api/test-management/review-templates/${id}`);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >新建评审模板</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={data} size="small" pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '模板名称', dataIndex: 'name', width: 200 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: '检查项', dataIndex: 'checklist', width: 120,
            render: (v: string[]) => v ? `${v.length} 项` : '-',
          },
          {
            title: '状态', dataIndex: 'is_active', width: 80,
            render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑评审模板' : '新建评审模板'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="如 标准功能评审" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="模板描述（可选）" />
          </Form.Item>
          <Form.Item name="checklist" label="检查清单（每行一项）"
            getValueFromEvent={(e) => e.target.value.split('\n').filter(Boolean)}
            getValueProps={(v) => ({ value: Array.isArray(v) ? v.join('\n') : '' })}
          >
            <Input.TextArea rows={4} placeholder="检查项1&#10;检查项2&#10;检查项3" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
