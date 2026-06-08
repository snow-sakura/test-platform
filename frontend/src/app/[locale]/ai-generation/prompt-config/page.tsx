'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, message,
  Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import {
  listPromptConfigs, createPromptConfig, updatePromptConfig,
  deletePromptConfig, loadDefaultPrompt,
  type PromptConfig, type PromptConfigCreate, type PromptConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const { TextArea } = Input;
const PROMPT_TYPES = [
  { label: 'testcase_writer', value: 'testcase_writer' },
  { label: 'testcase_reviewer', value: 'testcase_reviewer' },
];

export default function PromptConfigPage() {
  const t = useTranslations('aiGeneration');
  const tc = useTranslations('common');
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromptConfig | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listPromptConfigs()).data); }
    catch { message.error(t('promptConfig.loadFailed')); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updatePromptConfig(editing.id, values as PromptConfigUpdate); message.success(t('promptConfig.updateSuccess')); }
      else { await createPromptConfig(values as PromptConfigCreate); message.success(t('promptConfig.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || t('promptConfig.operationFailed')); }
  };

  const handleLoadDefault = async (r: PromptConfig) => {
    try { await loadDefaultPrompt(r.id); message.success(t('promptConfig.defaultLoaded')); load(); }
    catch (e: any) { message.error(e?.response?.data?.detail || t('promptConfig.loadFailed')); }
  };

  const openEdit = (r: PromptConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ prompt_type: 'testcase_writer' }); setModalOpen(true); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('promptConfig.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('promptConfig.addConfig')}</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: t('promptConfig.name'), dataIndex: 'name' },
            { title: t('promptConfig.type'), dataIndex: 'prompt_type', width: 160, render: (v: string) => PROMPT_TYPES.find(t => t.value === v)?.label || v },
            { title: t('promptConfig.contentPreview'), dataIndex: 'content', ellipsis: true, render: (v: string) => v?.substring(0, 100) },
            { title: t('promptConfig.enabled'), dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">{t('promptConfig.yes')}</Tag> : <Tag>{t('promptConfig.no')}</Tag> },
            { title: tc('action'), width: 240, render: (_: any, r: PromptConfig) => (
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => handleLoadDefault(r)}>{t('promptConfig.loadDefault')}</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>{t('promptConfig.edit')}</Button>
                <Popconfirm title={t('promptConfig.deleteConfirm')} onConfirm={async () => { await deletePromptConfig(r.id); message.success(t('promptConfig.deleted')); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
          expandable={{ expandedRowRender: (r: PromptConfig) => <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 300, overflow: 'auto' }}>{r.content}</pre> }}
        />
      </Card>
      <Modal title={editing ? t('promptConfig.editConfig') : t('promptConfig.addConfig')} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={700}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('promptConfig.name')} rules={[{ required: true }]}><Input placeholder={tc('inputPlaceholder')} /></Form.Item>
          <Form.Item name="prompt_type" label={t('promptConfig.type')} rules={[{ required: true }]}><Select options={PROMPT_TYPES} /></Form.Item>
          <Form.Item name="content" label={t('promptConfig.content')} rules={[{ required: true }]}><TextArea rows={12} placeholder={tc('inputPlaceholder')} /></Form.Item>
          <Form.Item name="is_active" label={t('promptConfig.enabled')} valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
