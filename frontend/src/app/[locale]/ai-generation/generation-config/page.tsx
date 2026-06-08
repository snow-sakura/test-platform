'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select,
  Switch, message, Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  listGenerationConfigs, createGenerationConfig, updateGenerationConfig,
  deleteGenerationConfig,
  type GenerationConfig, type GenerationConfigCreate, type GenerationConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const TEST_LEVELS = [
  { label: 'functional', value: 'functional' }, { label: 'performance', value: 'performance' },
  { label: 'security', value: 'security' }, { label: 'compatibility', value: 'compatibility' },
  { label: 'ui', value: 'ui' }, { label: 'integration', value: 'integration' }, { label: 'e2e', value: 'e2e' },
];
const PRIORITIES = [
  { label: 'HIGH', value: 'HIGH' }, { label: 'MEDIUM', value: 'MEDIUM' }, { label: 'LOW', value: 'LOW' },
];

export default function GenerationConfigPage() {
  const t = useTranslations('aiGeneration');
  const tc = useTranslations('common');
  const [configs, setConfigs] = useState<GenerationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GenerationConfig | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listGenerationConfigs()).data); }
    catch { message.error(t('generationConfig.loadFailed')); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateGenerationConfig(editing.id, values as GenerationConfigUpdate); message.success(t('generationConfig.updateSuccess')); }
      else { await createGenerationConfig(values as GenerationConfigCreate); message.success(t('generationConfig.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || t('generationConfig.operationFailed')); }
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
        <Title level={4} style={{ margin: 0 }}>{t('generationConfig.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('generationConfig.addConfig')}</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: t('generationConfig.name'), dataIndex: 'name' },
            { title: t('generationConfig.testLevels'), dataIndex: 'test_level', render: (v: string) => TEST_LEVELS.find(t => t.value === v)?.label || v },
            { title: t('generationConfig.defaultPriority'), dataIndex: 'test_priority', render: (v: string) => <Tag color={v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green'}>{v}</Tag> },
            { title: t('generationConfig.caseCount'), dataIndex: 'test_case_count' },
            { title: t('generationConfig.autoReview'), dataIndex: 'auto_review', render: (v: boolean) => v ? <Tag color="green">{t('generationConfig.on')}</Tag> : <Tag>{t('generationConfig.off')}</Tag> },
            { title: t('generationConfig.reviewTimeout'), dataIndex: 'review_timeout' },
            { title: t('generationConfig.activate'), dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">{t('generationConfig.on')}</Tag> : <Tag>{t('generationConfig.off')}</Tag> },
            { title: tc('action'), width: 160, render: (_: any, r: GenerationConfig) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>{t('generationConfig.edit')}</Button>
                <Popconfirm title={t('generationConfig.deleteConfirm')} onConfirm={async () => { await deleteGenerationConfig(r.id); message.success(t('generationConfig.deleted')); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <Modal title={editing ? t('generationConfig.editConfig') : t('generationConfig.addConfig')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('generationConfig.name')} rules={[{ required: true }]}><Input placeholder={tc('inputPlaceholder')} /></Form.Item>
          <Form.Item name="test_level" label={t('generationConfig.testLevels')}><Select options={TEST_LEVELS} /></Form.Item>
          <Form.Item name="test_priority" label={t('generationConfig.defaultPriority')}><Select options={PRIORITIES} /></Form.Item>
          <Form.Item name="test_case_count" label={t('generationConfig.caseCountLabel')}><InputNumber min={1} max={100} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="auto_review" label={t('generationConfig.autoReview')} valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="review_timeout" label={t('generationConfig.reviewTimeout')}><InputNumber min={30} max={3600} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="is_active" label={t('generationConfig.activate')} valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
