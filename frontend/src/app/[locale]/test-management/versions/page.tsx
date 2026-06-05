'use client';

import { useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Switch, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getVersions, createVersion, deleteVersion } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestVersion } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';

export default function VersionsPage() {
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await getVersions({ project_id: selectedProjectId });
      setVersions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadVersions(); }, [selectedProjectId]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createVersion(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadVersions();
    } catch { message.error('创建失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteVersion(id);
      message.success('已删除');
      loadVersions();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          placeholder="按项目筛选"
          allowClear
          style={{ width: 250 }}
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch
          filterOption
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建版本</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={versions}
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }} size="small"
        columns={[
          { title: '版本名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: '基线', dataIndex: 'is_baseline', width: 70,
            render: (v: boolean) => v ? <Tag color="blue">基线</Tag> : '-',
          },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作', width: 80,
            render: (_, record) => (
              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              >删除</Button>
            ),
          },
        ]}
      />

      <Modal title="新建版本" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="版本名称" rules={[{ required: true, message: '请输入版本名称' }]}>
            <Input placeholder="如 v1.0, v2.0" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="版本描述（可选）" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="is_baseline" label="基线版本" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="project_ids" label="关联项目">
            <Select mode="multiple" placeholder="选择关联项目（可选）"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
