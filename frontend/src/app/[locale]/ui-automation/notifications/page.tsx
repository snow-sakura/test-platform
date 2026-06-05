'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag, Switch, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiNotifications, createUiNotification, updateUiNotification, deleteUiNotification,
  testUiNotification, getUiNotificationLogs,
} from '@/lib/api/ui-automation';
import type { UiNotificationConfig, UiNotificationLog } from '@/lib/api/ui-automation';

export default function UiNotificationsPage() {
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
    } catch { message.error('加载失败'); }
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
        message.success('更新成功');
      } else {
        await createUiNotification(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadConfigs();
    } catch { message.error('操作失败'); }
  };

  const handleTest = async (id: number) => {
    try {
      const res = await testUiNotification(id);
      if (res.data.success) {
        message.success('通知发送成功');
      } else {
        message.warning(`发送失败: ${res.data.error || ''}`);
      }
    } catch { message.error('测试失败'); }
  };

  return (
    <div>
      <Tabs items={[
        {
          key: 'configs', label: '通知配置',
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
                >新建通知配置</Button>
              </div>
              <Table rowKey="id" loading={configLoading} dataSource={configs} size="small" pagination={false}
                columns={[
                  { title: '名称', dataIndex: 'name', width: 150 },
                  { title: '类型', dataIndex: 'notify_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                  { title: 'Webhook URL', dataIndex: 'webhook_url', ellipsis: true },
                  {
                    title: '启用', dataIndex: 'is_active', width: 60,
                    render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '是' : '否'}</Tag>,
                  },
                  { title: '创建时间', dataIndex: 'created_at', width: 170 },
                  {
                    title: '操作', width: 200,
                    render: (_, record) => (
                      <Space>
                        <Button type="link" size="small" onClick={() => handleTest(record.id)}>测试</Button>
                        <Button type="link" size="small" icon={<EditOutlined />}
                          onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                        >编辑</Button>
                        <Button type="link" danger size="small" icon={<DeleteOutlined />}
                          onClick={async () => { try { await deleteUiNotification(record.id); message.success('已删除'); loadConfigs(); } catch { message.error('删除失败'); } }}
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
          key: 'logs', label: '通知日志',
          children: (
            <Table rowKey="id" dataSource={logs}
              pagination={{ total: logTotal, pageSize: 20, onChange: loadLogs, showTotal: (t) => `共 ${t} 条` }}
              size="small"
              columns={[
                { title: '事件类型', dataIndex: 'event_type', width: 100 },
                {
                  title: '状态', dataIndex: 'status', width: 80,
                  render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v}</Tag>,
                },
                { title: '消息', dataIndex: 'message', ellipsis: true },
                { title: '发送时间', dataIndex: 'sent_at', width: 170 },
              ]}
            />
          ),
        },
      ]} />

      <Modal title={editing ? '编辑通知配置' : '新建通知配置'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如 飞书-测试通知群" />
          </Form.Item>
          <Form.Item name="notify_type" label="通知类型" rules={[{ required: true }]} initialValue="feishu">
            <Select options={[
              { label: '飞书', value: 'feishu' },
              { label: '企业微信', value: 'wechat' },
              { label: '钉钉', value: 'dingtalk' },
            ]} />
          </Form.Item>
          <Form.Item name="webhook_url" label="Webhook URL" rules={[{ required: true }]}>
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </Form.Item>
          <Form.Item name="secret" label="签名密钥">
            <Input.Password placeholder="可选" />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
