'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Tag, Space, Row, Col, Switch,
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined, EditOutlined } from '@ant-design/icons';
import {
  getAICases, createAICase, updateAICase, deleteAICase, runAICase,
} from '@/lib/api/ai-smart';
import type { AICase } from '@/lib/api/ai-smart';

export default function AICasesPage() {
  const [cases, setCases] = useState<AICase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AICase | null>(null);
  const [form] = Form.useForm();

  const loadCases = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAICases({ page, page_size: 20 });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCases(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateAICase(editing.id, values);
        message.success('更新成功');
      } else {
        await createAICase(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadCases();
    } catch { message.error('操作失败'); }
  };

  const handleRun = async (id: number) => {
    try {
      await runAICase(id);
      message.success('任务已提交执行');
      loadCases();
    } catch { message.error('执行失败'); }
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: 'default', ready: 'blue', running: 'processing', completed: 'green', failed: 'red',
  };
  const STATUS_LABELS: Record<string, string> = {
    draft: '草稿', ready: '就绪', running: '执行中', completed: '已完成', failed: '失败',
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >新建 AI 用例</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={cases} size="small"
        pagination={{ total, pageSize: 20, onChange: loadCases, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '用例名称', dataIndex: 'name', width: 200 },
          { title: '目标 URL', dataIndex: 'target_url', ellipsis: true, width: 200 },
          {
            title: '模式', dataIndex: 'execution_mode', width: 90,
            render: (v: string) => <Tag>{v === 'vision' ? '视觉' : '文本'}</Tag>,
          },
          { title: 'GIF', dataIndex: 'enable_gif', width: 60, render: (v: boolean) => v ? <Tag color="green">开</Tag> : '-' },
          {
            title: '状态', dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_LABELS[v] || v}</Tag>,
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 200,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleRun(record.id)}
                  disabled={record.status === 'running'}
                >执行</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAICase(record.id); message.success('已删除'); loadCases(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑 AI 用例' : '新建 AI 用例'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="用例名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录流程自动化测试" />
          </Form.Item>
          <Form.Item name="task_description" label="任务描述">
            <Input.TextArea rows={3} placeholder="用自然语言描述测试任务" />
          </Form.Item>
          <Form.Item name="target_url" label="目标 URL">
            <Input placeholder="https://example.com" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="execution_mode" label="执行模式" initialValue="text">
                <Select options={[
                  { label: '文本模式 (text)', value: 'text' },
                  { label: '视觉模式 (vision)', value: 'vision' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enable_gif" label="录制 GIF" valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
