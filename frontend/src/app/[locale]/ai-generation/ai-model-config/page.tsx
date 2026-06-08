'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, message,
  Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  listModelConfigs, createModelConfig, updateModelConfig,
  deleteModelConfig, testModelConfig,
  type AIModelConfig, type AIModelConfigCreate, type AIModelConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const MODEL_TYPES = [
  { label: 'DeepSeek', value: 'deepseek' }, { label: 'Qwen', value: 'qwen' },
  { label: 'SiliconFlow', value: 'siliconflow' }, { label: 'OpenAI', value: 'openai' }, { label: 'Other', value: 'other' },
];
const ROLES = [
  { label: 'Writer', value: 'testcase_writer' }, { label: 'Reviewer', value: 'testcase_reviewer' },
];

export default function AIModelConfigPage() {
  const t = useTranslations('aiGeneration');
  const tc = useTranslations('common');
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AIModelConfig | null>(null);
  const [form] = Form.useForm();
  const [testingId, setTestingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listModelConfigs()).data); }
    catch { message.error(t('modelConfig.loadFailed')); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateModelConfig(editing.id, values as AIModelConfigUpdate); message.success(t('modelConfig.updateSuccess')); }
      else { await createModelConfig(values as AIModelConfigCreate); message.success(t('modelConfig.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || t('modelConfig.operationFailed')); }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try { const res = await testModelConfig(id); message.success(res.data.message || t('modelConfig.testSuccess')); }
    catch (e: any) { message.error(e?.response?.data?.detail || t('modelConfig.testFailed')); }
    setTestingId(null);
  };

  const openEdit = (r: AIModelConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ role: 'testcase_writer', temperature: 0.7, max_tokens: 4096 }); setModalOpen(true); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('modelConfig.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('modelConfig.addConfig')}</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: t('modelConfig.name'), dataIndex: 'name' }, { title: t('modelConfig.type'), dataIndex: 'model_type' },
            { title: t('modelConfig.role'), dataIndex: 'role', render: (v: string) => ROLES.find(r => r.value === v)?.label || v },
            { title: t('modelConfig.model'), dataIndex: 'model_name' }, { title: t('modelConfig.apiUrl'), dataIndex: 'api_base', ellipsis: true },
            { title: 'Temperature', dataIndex: 'temperature', width: 100 },
            { title: 'Max Tokens', dataIndex: 'max_tokens', width: 100 },
            { title: t('modelConfig.enabled'), dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">{t('modelConfig.yes')}</Tag> : <Tag>{t('modelConfig.no')}</Tag> },
            { title: tc('action'), width: 200, render: (_: any, r: AIModelConfig) => (
              <Space>
                <Button size="small" icon={<ApiOutlined />} loading={testingId === r.id} onClick={() => handleTest(r.id)}>{t('modelConfig.test')}</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>{tc('edit')}</Button>
                <Popconfirm title={t('modelConfig.deleteConfirm')} onConfirm={async () => { await deleteModelConfig(r.id); message.success(t('modelConfig.deleted')); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <Modal title={editing ? t('modelConfig.editConfig') : t('modelConfig.addConfig')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('modelConfig.name')} rules={[{ required: true }]}><Input placeholder={tc('inputPlaceholder')} /></Form.Item>
          <Form.Item name="role" label={t('modelConfig.role')} rules={[{ required: true }]}><Select options={ROLES} /></Form.Item>
          <Form.Item name="model_type" label={t('modelConfig.type')} rules={[{ required: true }]}><Select options={MODEL_TYPES} /></Form.Item>
          <Form.Item name="api_base" label={t('modelConfig.apiUrl')} rules={[{ required: true }]}><Input placeholder={tc('inputPlaceholder')} /></Form.Item>
          <Form.Item name="api_key" label={t('modelConfig.apiKey')} rules={[{ required: !editing }]}><Input.Password placeholder={editing ? t('modelConfig.placeholderApiKey') : ''} /></Form.Item>
          <Form.Item name="model_name" label={t('modelConfig.model')} rules={[{ required: true }]}><Input placeholder={tc('inputPlaceholder')} /></Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="temperature" label="Temperature" style={{ flex: 1 }}><Input type="number" step={0.1} /></Form.Item>
            <Form.Item name="max_tokens" label="Max Tokens" style={{ flex: 1 }}><Input type="number" /></Form.Item>
          </div>
          <Form.Item name="is_active" label={t('modelConfig.enabled')} valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
