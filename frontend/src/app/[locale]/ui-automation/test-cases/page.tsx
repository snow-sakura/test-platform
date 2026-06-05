'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Tag, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiProjects, getUiTestCases, createUiTestCase, updateUiTestCase, deleteUiTestCase,
} from '@/lib/api/ui-automation';
import type { UiProject, UiTestCase } from '@/lib/api/ui-automation';

const PRIORITY_OPTIONS = [
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'MEDIUM' },
  { label: '低', value: 'LOW' },
];

const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '就绪', value: 'ready' },
  { label: '活跃', value: 'active' },
  { label: '已归档', value: 'archived' },
];

const PRIORITY_COLOR_MAP: Record<string, string> = {
  HIGH: 'red', MEDIUM: 'orange', LOW: 'green',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  draft: 'default', ready: 'blue', active: 'green', archived: 'default',
};

export default function UiTestCasesPage() {
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [cases, setCases] = useState<UiTestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiTestCase | null>(null);
  const [form] = Form.useForm();

  const loadCases = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiTestCases({ project_id: selectedProjectId, page, page_size: 20 });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [selectedProjectId]);

  useEffect(() => { loadCases(); }, [selectedProjectId, page]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiTestCase(editing.id, values);
        message.success('更新成功');
      } else {
        await createUiTestCase(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadCases();
    } catch { message.error('操作失败'); }
  };

  const handleDelete = (record: UiTestCase) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除测试用例「${record.name}」吗？此操作不可恢复。`,
      okText: '确认删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUiTestCase(record.id);
          message.success('已删除');
          loadCases();
        } catch { message.error('删除失败'); }
      },
    });
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder="选择项目" allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ project_id: selectedProjectId, priority: 'MEDIUM', status: 'draft' }); setModalOpen(true); }}
          >新建用例</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={cases}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '用例名称', dataIndex: 'name', width: 250 },
          { title: '优先级', dataIndex: 'priority', width: 90,
            render: (v: string) => <Tag color={PRIORITY_COLOR_MAP[v] || 'default'}>{v}</Tag>,
          },
          { title: '状态', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLOR_MAP[v] || 'default'}>{v}</Tag>,
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 160,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >编辑</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑测试用例' : '新建测试用例'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="用例名称" rules={[{ required: true, message: '请输入用例名称' }]}>
            <Input placeholder="如 登录流程测试" />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
