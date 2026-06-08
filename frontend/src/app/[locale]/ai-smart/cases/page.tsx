'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
    } catch { message.error(t('aiSmart.case.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCases(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateAICase(editing.id, values);
        message.success(t('aiSmart.case.updateSuccess'));
      } else {
        await createAICase(values);
        message.success(t('aiSmart.case.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadCases();
    } catch { message.error(t('aiSmart.case.operationFailed')); }
  };

  const handleRun = async (id: number) => {
    try {
      await runAICase(id);
      message.success(t('aiSmart.case.executionSubmitted'));
      loadCases();
    } catch { message.error(t('aiSmart.case.executeFailed')); }
  };

  const STATUS_COLORS: Record<string, string> = {
    draft: 'default', ready: 'blue', running: 'processing', completed: 'green', failed: 'red',
  };
  const STATUS_LABELS: Record<string, string> = {
    draft: t('aiSmart.case.draft'), ready: t('aiSmart.case.ready'), running: t('aiSmart.case.running'), completed: t('aiSmart.case.completed'), failed: t('aiSmart.case.failed'),
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >{t('aiSmart.case.create')}</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={cases} size="small"
        pagination={{ total, pageSize: 20, onChange: loadCases, showTotal: (totalCount) => t('common.totalCount', { count: totalCount }) }}
        columns={[
          { title: t('aiSmart.case.name'), dataIndex: 'name', width: 200 },
          { title: t('aiSmart.case.targetUrl'), dataIndex: 'target_url', ellipsis: true, width: 200 },
          {
            title: t('aiSmart.case.mode'), dataIndex: 'execution_mode', width: 90,
            render: (v: string) => <Tag>{v === 'vision' ? t('aiSmart.case.vision') : t('aiSmart.case.text')}</Tag>,
          },
          { title: 'GIF', dataIndex: 'enable_gif', width: 60, render: (v: boolean) => v ? <Tag color="green">{t('aiSmart.case.gifEnabled')}</Tag> : '-' },
          {
            title: t('aiSmart.case.status'), dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_LABELS[v] || v}</Tag>,
          },
          { title: t('aiSmart.case.createTime'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 200,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleRun(record.id)}
                  disabled={record.status === 'running'}
                >{t('aiSmart.case.execute')}</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAICase(record.id); message.success(t('aiSmart.case.deleted')); loadCases(); } catch { message.error(t('aiSmart.case.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('aiSmart.case.edit') : t('aiSmart.case.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('aiSmart.case.name')} rules={[{ required: true }]}>
            <Input placeholder={t('aiSmart.case.name')} />
          </Form.Item>
          <Form.Item name="task_description" label={t('aiSmart.case.taskDesc')}>
            <Input.TextArea rows={3} placeholder={t('aiSmart.case.taskDesc')} />
          </Form.Item>
          <Form.Item name="target_url" label={t('aiSmart.case.targetUrl')}>
            <Input placeholder={t('aiSmart.case.targetUrl')} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="execution_mode" label={t('aiSmart.case.mode')} initialValue="text">
                <Select options={[
                  { label: t('aiSmart.case.textMode'), value: 'text' },
                  { label: t('aiSmart.case.visionMode'), value: 'vision' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enable_gif" label={t('aiSmart.case.recordGif')} valuePropName="checked" initialValue={false}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
