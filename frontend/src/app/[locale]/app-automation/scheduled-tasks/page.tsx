'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, PauseCircleOutlined, CaretRightOutlined } from '@ant-design/icons';
import {
  getAppScheduledTasks, createAppScheduledTask, deleteAppScheduledTask,
  pauseAppScheduledTask, resumeAppScheduledTask,
} from '@/lib/api/app-automation';
import type { AppScheduledTask } from '@/lib/api/app-automation';

export default function AppScheduledTasksPage() {
  const t = useTranslations();
  const [tasks, setTasks] = useState<AppScheduledTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadTasks = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAppScheduledTasks({ page, page_size: 20 });
      setTasks(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createAppScheduledTask(values);
      message.success(t('common.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      loadTasks();
    } catch { message.error(t('common.createFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t('appAutomation.scheduledTasks.create')}</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={tasks}
        pagination={{ total, pageSize: 20, onChange: loadTasks, showTotal: (n) => t('common.totalCount', { count: n }) }}
        size="small"
        columns={[
          { title: t('appAutomation.scheduledTasks.name'), dataIndex: 'name', width: 200 },
          { title: t('appAutomation.scheduledTasks.cronExpression'), dataIndex: 'cron_expression', width: 140 },
          { title: t('appAutomation.scheduledTasks.triggerType'), dataIndex: 'trigger_type', width: 80 },
          {
            title: t('common.status'), dataIndex: 'status', width: 80,
            render: (v: string) => (
              <Tag color={v === 'active' ? 'green' : v === 'paused' ? 'orange' : 'default'}>
                {v === 'active' ? t('common.running') : v === 'paused' ? t('common.paused') : v}
              </Tag>
            ),
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 220,
            render: (_, record) => (
              <Space>
                {record.status === 'active' ? (
                  <Button type="link" size="small" icon={<PauseCircleOutlined />}
                    onClick={async () => { try { await pauseAppScheduledTask(record.id); message.success(t('common.paused')); loadTasks(); } catch { message.error(t('common.operationFailed')); } }}
                  >{t('common.pause')}</Button>
                ) : (
                  <Button type="link" size="small" icon={<CaretRightOutlined />}
                    onClick={async () => { try { await resumeAppScheduledTask(record.id); message.success(t('common.restore')); loadTasks(); } catch { message.error(t('common.operationFailed')); } }}
                  >{t('common.restore')}</Button>
                )}
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppScheduledTask(record.id); message.success(t('common.deleted')); loadTasks(); } catch { message.error(t('common.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={t('appAutomation.scheduledTasks.create')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('appAutomation.scheduledTasks.name')} rules={[{ required: true }]}>
            <Input placeholder={t('appAutomation.scheduledTasks.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="cron_expression" label={t('appAutomation.scheduledTasks.cronExpression')} initialValue="0 9 * * 1-5">
            <Input placeholder="0 9 * * 1-5" />
          </Form.Item>
          <Form.Item name="trigger_type" label={t('appAutomation.scheduledTasks.triggerType')} initialValue="cron">
            <Select options={[
              { label: t('appAutomation.scheduledTasks.cron'), value: 'cron' },
              { label: t('appAutomation.scheduledTasks.fixedInterval'), value: 'interval' },
            ]} />
          </Form.Item>
          <Form.Item name="suite_id" label={t('appAutomation.scheduledTasks.relatedSuite')}>
            <Input placeholder={t('appAutomation.scheduledTasks.suiteIdPlaceholder')} type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
