'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, message,
  Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from '@ant-design/icons';
import {
  listModelConfigs, createModelConfig, updateModelConfig,
  deleteModelConfig, testModelConfig,
  type AIModelConfig, type AIModelConfigCreate, type AIModelConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const MODEL_TYPES = [
  { label: 'DeepSeek', value: 'deepseek' }, { label: '通义千问 (Qwen)', value: 'qwen' },
  { label: 'SiliconFlow', value: 'siliconflow' }, { label: 'OpenAI', value: 'openai' }, { label: '其他', value: 'other' },
];
const ROLES = [
  { label: '测试用例 Writer', value: 'testcase_writer' }, { label: '测试用例 Reviewer', value: 'testcase_reviewer' },
];

export default function AIModelConfigPage() {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AIModelConfig | null>(null);
  const [form] = Form.useForm();
  const [testingId, setTestingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listModelConfigs()).data); }
    catch { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateModelConfig(editing.id, values as AIModelConfigUpdate); message.success('更新成功'); }
      else { await createModelConfig(values as AIModelConfigCreate); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || '操作失败'); }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try { const res = await testModelConfig(id); message.success(res.data.message || '连接成功'); }
    catch (e: any) { message.error(e?.response?.data?.detail || '连接失败'); }
    setTestingId(null);
  };

  const openEdit = (r: AIModelConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ role: 'testcase_writer', temperature: 0.7, max_tokens: 4096 }); setModalOpen(true); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>AI 模型配置</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增配置</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: '名称', dataIndex: 'name' }, { title: '类型', dataIndex: 'model_type' },
            { title: '角色', dataIndex: 'role', render: (v: string) => ROLES.find(r => r.value === v)?.label || v },
            { title: '模型', dataIndex: 'model_name' }, { title: 'API 地址', dataIndex: 'api_base', ellipsis: true },
            { title: 'Temperature', dataIndex: 'temperature', width: 100 },
            { title: 'Max Tokens', dataIndex: 'max_tokens', width: 100 },
            { title: '启用', dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
            { title: '操作', width: 200, render: (_: any, r: AIModelConfig) => (
              <Space>
                <Button size="small" icon={<ApiOutlined />} loading={testingId === r.id} onClick={() => handleTest(r.id)}>测试</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={async () => { await deleteModelConfig(r.id); message.success('已删除'); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑模型配置' : '新增模型配置'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}><Input placeholder="如：DeepSeek Writer" /></Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={ROLES} /></Form.Item>
          <Form.Item name="model_type" label="模型类型" rules={[{ required: true }]}><Select options={MODEL_TYPES} /></Form.Item>
          <Form.Item name="api_base" label="API 地址" rules={[{ required: true }]}><Input placeholder="https://api.deepseek.com" /></Form.Item>
          <Form.Item name="api_key" label="API 密钥" rules={[{ required: !editing }]}><Input.Password placeholder={editing ? '留空则不修改' : ''} /></Form.Item>
          <Form.Item name="model_name" label="模型名称" rules={[{ required: true }]}><Input placeholder="deepseek-chat" /></Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="temperature" label="Temperature" style={{ flex: 1 }}><Input type="number" step={0.1} /></Form.Item>
            <Form.Item name="max_tokens" label="Max Tokens" style={{ flex: 1 }}><Input type="number" /></Form.Item>
          </div>
          <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
