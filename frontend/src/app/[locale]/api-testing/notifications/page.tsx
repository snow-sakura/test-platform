'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tabs, message,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getNotifications, createNotification, updateNotification,
  deleteNotification, testNotification, getNotificationLogs,
} from '@/lib/api/api-testing';
import type { ApiNotificationConfig, ApiNotificationLog } from '@/lib/api/api-testing';

/** 通知管理页面 */
export default function NotificationsPage() {
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
      message.success('保存成功');
      setModalOpen(false);
      fetchNotifies();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await testNotification(id);
      message.success(res.data?.message || '发送成功');
      fetchLogs();
    } catch {
      message.error('测试发送失败');
    }
  };

  const notifyColumns: ColumnsType<ApiNotificationConfig> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'notify_type', key: 'notify_type', width: 120,
      render: (v: string) => {
        const labels: Record<string, string> = { feishu: '飞书', wechat: '企业微信', dingtalk: '钉钉' };
        return <Tag>{labels[v] || v}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleTest(record.id)}>
            测试
          </Button>
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await deleteNotification(record.id);
            message.success('已删除');
            fetchNotifies();
          }}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const logColumns: ColumnsType<ApiNotificationLog> = [
    { title: '事件类型', dataIndex: 'event_type', key: 'event_type', width: 120 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'success' ? 'success' : 'error'}>{v === 'success' ? '成功' : '失败'}</Tag>
      ),
    },
    { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '发送时间', dataIndex: 'sent_at', key: 'sent_at', width: 180 },
  ];

  const notifyTypeOptions = [
    { value: 'feishu', label: '飞书机器人' },
    { value: 'wechat', label: '企业微信机器人' },
    { value: 'dingtalk', label: '钉钉机器人' },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'config',
            label: '通知配置',
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    setEditRecord(null);
                    form.resetFields();
                    setModalOpen(true);
                  }}>
                    新建通知配置
                  </Button>
                </div>
                <Table rowKey="id" columns={notifyColumns} dataSource={notifies} loading={loading} pagination={false} />
              </div>
            ),
          },
          {
            key: 'logs',
            label: '发送日志',
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
        title={editRecord ? '编辑通知配置' : '新建通知配置'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={550}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="如：测试团队飞书群" />
          </Form.Item>
          <Form.Item name="notify_type" label="通知类型" rules={[{ required: true }]}>
            <Select options={notifyTypeOptions} />
          </Form.Item>
          <Form.Item name="webhook_url" label="Webhook 地址" rules={[{ required: true }]}>
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
          </Form.Item>
          <Form.Item name="secret" label="签名密钥">
            <Input placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
