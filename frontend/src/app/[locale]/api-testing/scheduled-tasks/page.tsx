'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message,
} from 'antd';
import { PlusOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { ColumnsType } from 'antd/es/table';
import {
  getScheduledTasks, createScheduledTask, updateScheduledTask,
  deleteScheduledTask, pauseScheduledTask, resumeScheduledTask,
  runScheduledTaskNow,
} from '@/lib/api/api-testing';
import type { ApiScheduledTask } from '@/lib/api/api-testing';

/** Scheduled task management page */
export default function ScheduledTasksPage() {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [tasks, setTasks] = useState<ApiScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiScheduledTask | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(() => {
    setLoading(true);
    getScheduledTasks({ page, page_size: 20 })
      .then((res) => {
        setTasks(res.data.results);
        setTotal(res.data.count);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateScheduledTask(editRecord.id, values);
      } else {
        await createScheduledTask(values);
      }
      message.success(t('scheduledTask.saveSuccess'));
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const columns: ColumnsType<ApiScheduledTask> = [
    { title: t('scheduledTask.name'), dataIndex: 'name', key: 'name' },
    {
      title: tc('type'), dataIndex: 'task_type', key: 'task_type', width: 100,
      render: (v: string) => <Tag>{v === 'suite' ? t('scheduledTask.suite') : t('scheduledTask.request')}</Tag>,
    },
    { title: t('scheduledTask.cron'), dataIndex: 'cron_expression', key: 'cron_expression', width: 150 },
    {
      title: tc('status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'success' : 'default'}>
          {v === 'active' ? t('scheduledTask.running') : t('scheduledTask.paused')}
        </Tag>
      ),
    },
    { title: t('scheduledTask.lastRun'), dataIndex: 'last_executed_at', key: 'last_executed_at', width: 180 },
    { title: tc('createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: tc('action'), key: 'actions', width: 250,
      render: (_, record) => (
        <Space>
          {record.status === 'active' ? (
            <Button type="link" size="small" icon={<PauseCircleOutlined />} onClick={async () => {
              await pauseScheduledTask(record.id);
              message.success(t('scheduledTask.pause'));
              fetchData();
            }}>{t('scheduledTask.pause')}</Button>
          ) : (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={async () => {
              await resumeScheduledTask(record.id);
              message.success(t('scheduledTask.resume'));
              fetchData();
            }}>{t('scheduledTask.resume')}</Button>
          )}
          <Button type="link" size="small" onClick={async () => {
            await runScheduledTaskNow(record.id);
            message.success(t('scheduledTask.executeNow'));
          }}>{t('scheduledTask.executeNow')}</Button>
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>{tc('edit')}</Button>
          <Popconfirm title={t('scheduledTask.deleteConfirm')} onConfirm={async () => {
            await deleteScheduledTask(record.id);
            message.success(t('scheduledTask.deleted'));
            fetchData();
          }}>
            <Button type="link" danger size="small">{tc('delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditRecord(null);
          form.resetFields();
          setModalOpen(true);
        }}>
          {t('scheduledTask.create')}
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={tasks}
        loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
      />

      <Modal
        title={editRecord ? t('scheduledTask.edit') : t('scheduledTask.create')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('scheduledTask.name')} rules={[{ required: true }]}>
            <Input placeholder={tc('inputPlaceholder')} />
          </Form.Item>
          <Form.Item name="task_type" label={tc('type')} initialValue="suite">
            <Select>
              <Select.Option value="suite">{t('scheduledTask.suiteExec')}</Select.Option>
              <Select.Option value="request">{t('scheduledTask.singleRequest')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="cron_expression" label={t('scheduledTask.cron')} rules={[{ required: true }]}
            initialValue="0 9 * * 1-5"
            help={t('scheduledTask.cron') + ': ' + 'min hour day month weekday (e.g. 0 9 * * 1-5 = weekdays at 9am)'}
          >
            <Input placeholder="0 9 * * 1-5" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
