'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select,
  Switch, message, Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  listGenerationConfigs, createGenerationConfig, updateGenerationConfig,
  deleteGenerationConfig,
  type GenerationConfig, type GenerationConfigCreate, type GenerationConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const TEST_LEVELS = [
  { label: '功能测试', value: 'functional' }, { label: '性能测试', value: 'performance' },
  { label: '安全测试', value: 'security' }, { label: '兼容性测试', value: 'compatibility' },
  { label: 'UI 测试', value: 'ui' }, { label: '集成测试', value: 'integration' }, { label: '端到端测试', value: 'e2e' },
];
const PRIORITIES = [
  { label: '高 (HIGH)', value: 'HIGH' }, { label: '中 (MEDIUM)', value: 'MEDIUM' }, { label: '低 (LOW)', value: 'LOW' },
];

export default function GenerationConfigPage() {
  const [configs, setConfigs] = useState<GenerationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GenerationConfig | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listGenerationConfigs()).data); }
    catch { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateGenerationConfig(editing.id, values as GenerationConfigUpdate); message.success('更新成功'); }
      else { await createGenerationConfig(values as GenerationConfigCreate); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || '操作失败'); }
  };

  const openEdit = (r: GenerationConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openCreate = () => {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ test_level: 'functional', test_priority: 'MEDIUM', test_case_count: 10, auto_review: true, review_timeout: 300 });
    setModalOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>生成行为配置</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增配置</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '测试级别', dataIndex: 'test_level', render: (v: string) => TEST_LEVELS.find(t => t.value === v)?.label || v },
            { title: '默认优先级', dataIndex: 'test_priority', render: (v: string) => <Tag color={v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green'}>{v}</Tag> },
            { title: '用例数量', dataIndex: 'test_case_count' },
            { title: '自动评审', dataIndex: 'auto_review', render: (v: boolean) => v ? <Tag color="green">开启</Tag> : <Tag>关闭</Tag> },
            { title: '评审超时(s)', dataIndex: 'review_timeout' },
            { title: '激活', dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
            { title: '操作', width: 160, render: (_: any, r: GenerationConfig) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={async () => { await deleteGenerationConfig(r.id); message.success('已删除'); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑生成配置' : '新增生成配置'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}><Input placeholder="如：标准功能测试配置" /></Form.Item>
          <Form.Item name="test_level" label="测试级别"><Select options={TEST_LEVELS} /></Form.Item>
          <Form.Item name="test_priority" label="默认优先级"><Select options={PRIORITIES} /></Form.Item>
          <Form.Item name="test_case_count" label="生成用例数量"><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="auto_review" label="自动评审" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="review_timeout" label="评审超时（秒）"><InputNumber min={30} max={3600} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="is_active" label="激活" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
