'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getAppProjects, createAppProject, updateAppProject, deleteAppProject } from '@/lib/api/app-automation';
import type { AppProject } from '@/lib/api/app-automation';

export default function AppProjectsPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProjects(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppProject(editing.id, values); message.success('更新成功'); }
      else { await createAppProject(values); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadProjects();
    } catch { message.error('操作失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <span />
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >新建项目</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={projects} size="small"
        pagination={{ total, pageSize: 20, onChange: loadProjects, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '项目名称', dataIndex: 'name', width: 200 },
          { title: '平台', dataIndex: 'platform', width: 80, render: (v: string) => <Tag>{v}</Tag> },
          { title: '设备数', dataIndex: 'device_count', width: 80 },
          { title: '元素数', dataIndex: 'element_count', width: 80 },
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
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppProject(record.id); message.success('已删除'); loadProjects(); } catch { message.error('删除失败'); } }}
                />
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
            <Input placeholder="如 电商 APP 测试" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="platform" label="平台" initialValue="android">
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
