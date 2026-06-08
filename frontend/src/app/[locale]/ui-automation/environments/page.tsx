'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Space, Switch, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiEnvironments, createUiEnvironment, updateUiEnvironment, deleteUiEnvironment, getUiProjects,
} from '@/lib/api/ui-automation';
import type { UiEnvironment, UiProject } from '@/lib/api/ui-automation';

export default function UiEnvironmentsPage() {
  const t = useTranslations();
  const [environments, setEnvironments] = useState<UiEnvironment[]>([]);
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiEnvironment | null>(null);
  const [form] = Form.useForm();

  const loadEnvs = async () => {
    setLoading(true);
    try {
      const res = await getUiEnvironments();
      setEnvironments(res.data || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadEnvs();
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiEnvironment(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createUiEnvironment(values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadEnvs();
    } catch { message.error(t('common.operationFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >{t('uiAutomation.environment.create')}</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={environments} size="small"
        pagination={false}
        columns={[
          { title: t('uiAutomation.environment.name'), dataIndex: 'name', width: 150 },
          { title: t('uiAutomation.environment.browser'), dataIndex: 'browser_type', width: 100 },
          { title: t('uiAutomation.environment.resolution'), width: 120, render: (_, r) => `${r.window_width}x${r.window_height}` },
          { title: t('uiAutomation.environment.timeout'), dataIndex: 'timeout_ms', width: 100 },
          {
            title: t('uiAutomation.environment.headless'), dataIndex: 'headless', width: 90,
            render: (v: boolean) => v ? t('uiAutomation.environment.yes') : t('uiAutomation.environment.no'),
          },
          {
            title: t('uiAutomation.environment.failScreenshot'), dataIndex: 'screenshot_on_failure', width: 90,
            render: (v: boolean) => v ? t('uiAutomation.environment.yes') : t('uiAutomation.environment.no'),
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteUiEnvironment(record.id); message.success(t('uiAutomation.environment.deleted')); loadEnvs(); } catch { message.error(t('uiAutomation.environment.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('uiAutomation.environment.edit') : t('uiAutomation.environment.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('uiAutomation.environment.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.environment.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="project_id" label={t('uiAutomation.environment.project')}>
            <Select allowClear placeholder={t('uiAutomation.environment.global')}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="browser_type" label={t('uiAutomation.environment.browserType')} initialValue="chromium">
                <Select options={[
                  { label: 'Chromium', value: 'chromium' },
                  { label: 'Firefox', value: 'firefox' },
                  { label: 'WebKit', value: 'webkit' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="timeout_ms" label={t('uiAutomation.environment.timeout')} initialValue={30000}>
                <InputNumber min={1000} step={5000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="window_width" label={t('uiAutomation.environment.windowWidth')} initialValue={1280}>
                <InputNumber min={800} max={3840} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="window_height" label={t('uiAutomation.environment.windowHeight')} initialValue={720}>
                <InputNumber min={600} max={2160} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Space size="large">
            <Form.Item name="headless" label={t('uiAutomation.environment.headless')} valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="screenshot_on_failure" label={t('uiAutomation.environment.failScreenshot')} valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="record_video" label={t('uiAutomation.environment.recordVideo')} valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
