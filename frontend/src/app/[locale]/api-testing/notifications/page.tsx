'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tabs, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { ColumnsType } from 'antd/es/table';
import {
  getNotifications, createNotification, updateNotification,
  deleteNotification, testNotification, getNotificationLogs,
} from '@/lib/api/api-testing';
import type { ApiNotificationConfig, ApiNotificationLog } from '@/lib/api/api-testing';

/** Notification management page */
export default function NotificationsPage() {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [notifies, setNotifies] = useState<ApiNotificationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiNotificationConfig | null>(null);
  const [form] = Form.useForm();

  // 通知日志
  const [logs, setLogs] = useState<ApiNotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  const fetchNotifies = useCallback(() => {
    setLoading(true);
    getNotifications()
      .then((res) => setNotifies(res.data))
      .finally(() => setLoading(false));
  }, []);

  const fetchLogs = useCallback(() => {
    setLogsLoading(true);
    getNotificationLogs({ page: logsPage, page_size: 20 })
      .then((res) => {
        setLogs(res.data.results);
        setLogsTotal(res.data.count);
      })
      .finally(() => setLogsLoading(false));
  }, [logsPage]);

  useEffect(() => { fetchNotifies(); }, [fetchNotifies]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateNotification(editRecord.id, values);
      } else {
        await createNotification(values);
      }
      message.success(t('notification.saveSuccess'));
      setModalOpen(false);
      fetchNotifies();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await testNotification(id);
      message.success(res.data?.message || t('notification.testSuccess'));
      fetchLogs();
    } catch {
      message.error(t('notification.testFailed'));
    }
  };

  const notifyColumns: ColumnsType<ApiNotificationConfig> = [
    { title: tc('name'), dataIndex: 'name', key: 'name' },
    {
      title: tc('type'), dataIndex: 'notify_type', key: 'notify_type', width: 120,
      render: (v: string) => {
        const labels: Record<string, string> = { feishu: t('notification.feishu'), wechat: t('notification.wechat'), dingtalk: t('notification.dingtalk') };
        return <Tag>{labels[v] || v}</Tag>;
      },
    },
    {
      title: tc('status'), dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? t('notification.enabled') : t('notification.disabled')}</Tag>,
    },
    { title: tc('createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: tc('action'), key: 'actions', width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleTest(record.id)}>
            {t('notification.test')}
          </Button>
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>{tc('edit')}</Button>
          <Popconfirm title={t('notification.deleteConfirm')} onConfirm={async () => {
            await deleteNotification(record.id);
            message.success(t('notification.deleted'));
            fetchNotifies();
          }}>
            <Button type="link" danger size="small">{tc('delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const logColumns: ColumnsType<ApiNotificationLog> = [
    { title: tc('type'), dataIndex: 'event_type', key: 'event_type', width: 120 },
    {
      title: tc('status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'success' ? 'success' : 'error'}>{v === 'success' ? t('notification.success') : t('notification.failed')}</Tag>
      ),
    },
    { title: tc('description'), dataIndex: 'message', key: 'message', ellipsis: true },
    { title: tc('createdAt'), dataIndex: 'sent_at', key: 'sent_at', width: 180 },
  ];

  const notifyTypeOptions = [
    { value: 'feishu', label: t('notification.feishu') },
    { value: 'wechat', label: t('notification.wechat') },
    { value: 'dingtalk', label: t('notification.dingtalk') },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'config',
            label: t('notification.title'),
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    setEditRecord(null);
                    form.resetFields();
                    setModalOpen(true);
                  }}>
                    {t('notification.create')}
                  </Button>
                </div>
                <Table rowKey="id" columns={notifyColumns} dataSource={notifies} loading={loading} pagination={false} />
              </div>
            ),
          },
          {
            key: 'logs',
            label: t('notification.logs'),
            children: (
              <Table
                rowKey="id"
                columns={logColumns}
                dataSource={logs}
                loading={logsLoading}
                pagination={{
                  current: logsPage,
                  total: logsTotal,
                  pageSize: 20,
                  onChange: setLogsPage,
                }}
              />
            ),
          },
        ]}
        onChange={(key) => { if (key === 'logs') fetchLogs(); }}
      />

      <Modal
        title={editRecord ? t('notification.edit') : t('notification.create')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={550}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('notification.name')} rules={[{ required: true }]}>
            <Input placeholder={tc('inputPlaceholder')} />
          </Form.Item>
          <Form.Item name="notify_type" label={tc('type')} rules={[{ required: true }]}>
            <Select options={notifyTypeOptions} />
          </Form.Item>
          <Form.Item name="webhook_url" label="Webhook URL" rules={[{ required: true }]}>
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
          </Form.Item>
          <Form.Item name="secret" label={t('notification.signKey')}>
            <Input placeholder={tc('selectPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
