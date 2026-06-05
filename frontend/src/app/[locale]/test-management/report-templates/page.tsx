'use client';

import { useEffect, useState } from 'react';
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await request.put(`/api/test-management/report-templates/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await request.post('/api/test-management/report-templates', {
          ...values,
          template_config: { sections: ['summary', 'details', 'charts'] },
        });
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadData();
    } catch { message.error(editing ? '更新失败' : '创建失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/api/test-management/report-templates/${id}`);
      message.success('已删除');
      loadData();
    } catch { message.error('删除失败'); }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await request.put(`/api/test-management/report-templates/${id}`, { is_default: true });
      message.success('已设为默认模板');
      loadData();
    } catch { message.error('设置失败'); }
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
          新建报告模板
        </Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={data} size="small" pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '模板名称', dataIndex: 'name', width: 200 },
          {
            title: '默认', dataIndex: 'is_default', width: 80,
            render: (v: boolean) => v ? <Tag color="gold">默认</Tag> : '-',
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 200,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
                {!record.is_default && (
                  <Button size="small" icon={<StarOutlined />} onClick={() => handleSetDefault(record.id)}>
                    设为默认
                  </Button>
                )}
                <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑报告模板' : '新建报告模板'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="如 标准测试报告" />
          </Form.Item>
          <Form.Item name="template_config" label="配置（JSON 格式）">
            <Input.TextArea rows={6}
              placeholder='{"sections": ["summary", "details", "charts"]}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
