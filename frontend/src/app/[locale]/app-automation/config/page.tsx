'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Card, Table, Button, message, Modal, Form, Input, InputNumber, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAppConfigs, createAppConfig, updateAppConfig, deleteAppConfig } from '@/lib/api/app-automation';
import type { AppConfig } from '@/lib/api/app-automation';

export default function ConfigPage() {
  const t = useTranslations();
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppConfig | null>(null);
  const [form] = Form.useForm();

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await getAppConfigs();
      setConfigs(res.data || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConfigs(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppConfig(editing.id, values); message.success(t('common.updateSuccess')); }
      else { await createAppConfig(values); message.success(t('common.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadConfigs();
    } catch { message.error(t('common.operationFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
          >{t('appAutomation.environment.create')}</Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} dataSource={configs} size="small" pagination={false}
        columns={[
          { title: t('common.name'), dataIndex: 'name', width: 160 },
          { title: t('appAutomation.adbPath'), dataIndex: 'adb_path', width: 200 },
          { title: t('appAutomation.deviceTimeout'), dataIndex: 'device_timeout', width: 120 },
          { title: t('appAutomation.screenshotDir'), dataIndex: 'screenshot_dir', width: 200 },
          {
            title: t('common.createdAt'), dataIndex: 'created_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          {
            title: t('common.action'), width: 100,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => {
                    try { await deleteAppConfig(record.id); message.success(t('common.deleted')); loadConfigs(); }
                    catch { message.error(t('common.deleteFailed')); }
                  }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('appAutomation.editEnvironment') : t('appAutomation.environment.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('appAutomation.environment.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="adb_path" label={t('appAutomation.adbPath')} initialValue="adb">
            <Input placeholder={t('appAutomation.adbPathPlaceholder')} />
          </Form.Item>
          <Form.Item name="device_timeout" label={t('appAutomation.deviceTimeout')} initialValue={30}>
            <InputNumber min={5} max={300} />
          </Form.Item>
          <Form.Item name="screenshot_dir" label={t('appAutomation.screenshotDir')} initialValue="screenshots">
            <Input placeholder={t('appAutomation.screenshotDirPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
