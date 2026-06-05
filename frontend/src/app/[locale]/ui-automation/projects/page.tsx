'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiProjects, createUiProject, updateUiProject, deleteUiProject,
} from '@/lib/api/ui-automation';
import type { UiProject } from '@/lib/api/ui-automation';

export default function UiProjectsPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiProject(editing.id, values);
        message.success('更新成功');
      } else {
        await createUiProject(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadProjects();
    } catch { message.error('操作失败'); }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后所有关联数据将被清除，不可恢复。',
      onOk: async () => {
        try {
          await deleteUiProject(id);
          message.success('已删除');
          loadProjects();
        } catch { message.error('删除失败'); }
      },
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>新建项目</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={projects}
        pagination={{ total, pageSize: 20, onChange: loadProjects, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: '项目名称', dataIndex: 'name', width: 200 },
          { title: '目标 URL', dataIndex: 'url', ellipsis: true },
          { title: '浏览器', dataIndex: 'browser_type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
          { title: '元素数', dataIndex: 'element_count', width: 80 },
          { title: '页面对象数', dataIndex: 'page_object_count', width: 100 },
          { title: '脚本数', dataIndex: 'script_count', width: 80 },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '启用' : v}</Tag>,
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >编辑</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                >删除</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑项目' : '新建项目'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="如 Web 应用测试" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="url" label="目标 URL">
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Form.Item name="browser_type" label="浏览器类型" initialValue="chromium">
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
