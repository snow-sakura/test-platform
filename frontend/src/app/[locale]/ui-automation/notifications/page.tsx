'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag, Switch, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiNotifications, createUiNotification, updateUiNotification, deleteUiNotification,
  testUiNotification, getUiNotificationLogs,
} from '@/lib/api/ui-automation';
import type { UiNotificationConfig, UiNotificationLog } from '@/lib/api/ui-automation';

export default function UiNotificationsPage() {
  const t = useTranslations();
  const [configs, setConfigs] = useState<UiNotificationConfig[]>([]);
  const [logs, setLogs] = useState<UiNotificationLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [configLoading, setConfigLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiNotificationConfig | null>(null);
  const [form] = Form.useForm();

  const loadConfigs = async () => {
    setConfigLoading(true);
    try {
      const res = await getUiNotifications();
      setConfigs(res.data || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setConfigLoading(false); }
  };

  const loadLogs = async (page = 1) => {
    try {
      const res = await getUiNotificationLogs({ page, page_size: 20 });
      setLogs(res.data.results || []);
      setLogTotal(res.data.count || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadConfigs(); loadLogs(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiNotification(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createUiNotification(values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadConfigs();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await testUiNotification(id);
      if (res.data.success) {
        message.success(t('apiTesting.notification.testSuccess'));
      } else {
        message.warning(t('apiTesting.notification.testFailed') + ': ' + (res.data.error || ''));
      }
    } catch { message.error(t('common.operationFailed')); }
  };

  return (
    <div>
      <Tabs items={[
        {
          key: 'configs', label: t('uiAutomation.notificationConfigs'),
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
                >{t('apiTesting.notification.create')}</Button>
              </div>
              <Table rowKey="id" loading={configLoading} dataSource={configs} size="small" pagination={false}
                columns={[
                  { title: t('common.name'), dataIndex: 'name', width: 150 },
                  { title: t('common.type'), dataIndex: 'notify_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                  { title: 'Webhook URL', dataIndex: 'webhook_url', ellipsis: true },
                  {
                    title: t('apiTesting.notification.enabled'), dataIndex: 'is_active', width: 60,
                    render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? t('common.yes') : t('common.no')}</Tag>,
                  },
                  { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
                  {
                    title: t('common.action'), width: 200,
                    render: (_, record) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => handleTest(record.id)}>{t('common.test')}</Button>
                        <Button type="link" size="small" icon={<EditOutlined />}
                          onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                        >{t('common.edit')}</Button>
                        <Button type="link" danger size="small" icon={<DeleteOutlined />}
                          onClick={async () => { try { await deleteUiNotification(record.id); message.success(t('common.deleted')); loadConfigs(); } catch { message.error(t('common.deleteFailed')); } }}
                        />
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
          ),
        },
        {
          key: 'logs', label: t('uiAutomation.notificationLogs'),
          children: (
            <Table rowKey="id" dataSource={logs}
              pagination={{ total: logTotal, pageSize: 20, onChange: loadLogs, showTotal: (n) => t('common.totalCount', { count: n }) }}
              size="small"
              columns={[
                { title: t('appAutomation.eventType'), dataIndex: 'event_type', width: 100 },
                {
                  title: t('common.status'), dataIndex: 'status', width: 80,
                  render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v}</Tag>,
                },
                { title: t('appAutomation.message'), dataIndex: 'message', ellipsis: true },
                { title: t('appAutomation.sentAt'), dataIndex: 'sent_at', width: 170 },
              ]}
            />
          ),
        },
      ]} />

      <Modal title={editing ? t('apiTesting.notification.edit') : t('apiTesting.notification.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('common.inputPlaceholder')} />
          </Form.Item>
          <Form.Item name="notify_type" label={t('apiTesting.notification.type')} rules={[{ required: true }]} initialValue="feishu">
            <Select options={[
              { label: t('apiTesting.notification.feishu'), value: 'feishu' },
              { label: t('apiTesting.notification.wechat'), value: 'wechat' },
              { label: t('apiTesting.notification.dingtalk'), value: 'dingtalk' },
            ]} />
          </Form.Item>
          <Form.Item name="webhook_url" label="Webhook URL" rules={[{ required: true }]}>
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </Form.Item>
          <Form.Item name="secret" label={t('apiTesting.notification.signKey')}>
            <Input.Password placeholder={t('common.optional')} />
          </Form.Item>
          <Form.Item name="is_active" label={t('apiTesting.notification.enabled')} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
