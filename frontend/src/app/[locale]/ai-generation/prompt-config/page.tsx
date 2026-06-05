'use client';

import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Switch, message,
  Space, Tag, Typography, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listPromptConfigs, createPromptConfig, updatePromptConfig,
  deletePromptConfig, loadDefaultPrompt,
  type PromptConfig, type PromptConfigCreate, type PromptConfigUpdate,
} from '@/lib/api/requirement-analysis';

const { Title } = Typography;
const { TextArea } = Input;
const PROMPT_TYPES = [
  { label: 'Writer（用例生成）', value: 'testcase_writer' },
  { label: 'Reviewer（用例评审）', value: 'testcase_reviewer' },
];

export default function PromptConfigPage() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromptConfig | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setConfigs((await listPromptConfigs()).data); }
    catch { message.error('加载失败'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updatePromptConfig(editing.id, values as PromptConfigUpdate); message.success('更新成功'); }
      else { await createPromptConfig(values as PromptConfigCreate); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); load();
    } catch (e: any) { if (e?.response) message.error(e.response.data?.detail || '操作失败'); }
  };

  const handleLoadDefault = async (r: PromptConfig) => {
    try { await loadDefaultPrompt(r.id); message.success('已加载默认提示词'); load(); }
    catch (e: any) { message.error(e?.response?.data?.detail || '加载失败'); }
  };

  const openEdit = (r: PromptConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };
  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ prompt_type: 'testcase_writer' }); setModalOpen(true); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>提示词配置</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增提示词</Button>
      </div>
      <Card>
        <Table dataSource={configs} rowKey="id" loading={loading}
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '类型', dataIndex: 'prompt_type', width: 160, render: (v: string) => PROMPT_TYPES.find(t => t.value === v)?.label || v },
            { title: '内容预览', dataIndex: 'content', ellipsis: true, render: (v: string) => v?.substring(0, 100) },
            { title: '启用', dataIndex: 'is_active', width: 70, render: (v: boolean) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
            { title: '操作', width: 240, render: (_: any, r: PromptConfig) => (
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => handleLoadDefault(r)}>加载默认</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
                <Popconfirm title="确定删除？" onConfirm={async () => { await deletePromptConfig(r.id); message.success('已删除'); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
          expandable={{ expandedRowRender: (r: PromptConfig) => <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, maxHeight: 300, overflow: 'auto' }}>{r.content}</pre> }}
        />
      </Card>
      <Modal title={editing ? '编辑提示词' : '新增提示词'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={700}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}><Input placeholder="如：标准 Writer 提示词" /></Form.Item>
          <Form.Item name="prompt_type" label="提示词类型" rules={[{ required: true }]}><Select options={PROMPT_TYPES} /></Form.Item>
          <Form.Item name="content" label="提示词内容" rules={[{ required: true }]}><TextArea rows={12} placeholder="输入提示词内容..." /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
