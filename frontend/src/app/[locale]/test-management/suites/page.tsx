'use client';

import { useState } from 'react';
import { Table, Button, Space, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createSuite, deleteSuite, getSuites } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestSuite } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuitesPage() {
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch(() => {});
  }, []);

  const loadSuites = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getSuites(projectId);
      setSuites(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSuites(); }, [projectId]);

  const handleCreate = async () => {
    if (!projectId) return;
    const values = await form.validateFields();
    try {
      await createSuite(projectId, values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadSuites();
    } catch { message.error('创建失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSuite(id);
      message.success('已删除');
      loadSuites();
    } catch { message.error('删除失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          placeholder="请选择项目"
          style={{ width: 300 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch
          filterOption
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!projectId} onClick={() => setModalOpen(true)}>
          新建套件
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={suites}
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '用例数', dataIndex: 'case_count', width: 80 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small"
                  onClick={() => router.push(`/${locale}/test-management/suites/${record.id}`)}
                >详情</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                >删除</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建套件" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="套件名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
