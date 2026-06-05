'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Tag, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppTestSuites, getAppTestSuite,
  createAppTestSuite, deleteAppTestSuite, executeAppTestSuite,
} from '@/lib/api/app-automation';
import type { AppProject, AppTestSuite, AppTestCase } from '@/lib/api/app-automation';

export default function AppSuitesPage() {
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [suites, setSuites] = useState<AppTestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentSuite, setCurrentSuite] = useState<(AppTestSuite & { cases: AppTestCase[] }) | null>(null);
  const [form] = Form.useForm();

  const loadSuites = async (page = 1) => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getAppTestSuites({ project_id: selectedProjectId, page, page_size: 20 });
      setSuites(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  useEffect(() => { loadSuites(); }, [selectedProjectId]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createAppTestSuite({ ...values, project_id: selectedProjectId });
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadSuites();
    } catch { message.error('创建失败'); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppTestSuite(id);
      setCurrentSuite(res.data);
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  const handleExecute = async (id: number) => {
    try {
      await executeAppTestSuite(id);
      message.success('套件执行已触发');
    } catch { message.error('执行失败'); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select placeholder="选择项目" allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={() => { form.resetFields(); setModalOpen(true); }}
          >新建套件</Button>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={suites} size="small"
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '套件名称', dataIndex: 'name', width: 200 },
          { title: '用例数', dataIndex: 'case_count', width: 80 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 220,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => viewDetail(record.id)}>详情</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >执行</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppTestSuite(record.id); message.success('已删除'); loadSuites(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建套件" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套件名称" rules={[{ required: true }]}>
            <Input placeholder="如 回归测试套件" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`套件详情 - ${currentSuite?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentSuite?.cases || []} rowKey="id" size="small" pagination={false}
          columns={[
            { title: '用例名称', dataIndex: 'name', width: 200 },
            { title: '优先级', dataIndex: 'priority', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: '描述', dataIndex: 'description', ellipsis: true },
          ]}
        />
      </Modal>
    </div>
  );
}
