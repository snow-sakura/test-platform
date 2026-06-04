'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message,
} from 'antd';
import { PlusOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getScheduledTasks, createScheduledTask, updateScheduledTask,
  deleteScheduledTask, pauseScheduledTask, resumeScheduledTask,
  runScheduledTaskNow,
} from '@/lib/api/api-testing';
import type { ApiScheduledTask } from '@/lib/api/api-testing';

/** 定时任务管理页面 */
export default function ScheduledTasksPage() {
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
      message.success('保存成功');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const columns: ColumnsType<ApiScheduledTask> = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'task_type', key: 'task_type', width: 100,
      render: (v: string) => <Tag>{v === 'suite' ? '套件' : '请求'}</Tag>,
    },
    { title: 'Cron 表达式', dataIndex: 'cron_expression', key: 'cron_expression', width: 150 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'success' : 'default'}>
          {v === 'active' ? '运行中' : '已暂停'}
        </Tag>
      ),
    },
    { title: '上次执行', dataIndex: 'last_executed_at', key: 'last_executed_at', width: 180 },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'actions', width: 250,
      render: (_, record) => (
        <Space>
          {record.status === 'active' ? (
            <Button type="link" size="small" icon={<PauseCircleOutlined />} onClick={async () => {
              await pauseScheduledTask(record.id);
              message.success('已暂停');
              fetchData();
            }}>暂停</Button>
          ) : (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={async () => {
              await resumeScheduledTask(record.id);
              message.success('已恢复');
              fetchData();
            }}>恢复</Button>
          )}
          <Button type="link" size="small" onClick={async () => {
            await runScheduledTaskNow(record.id);
            message.success('已触发执行');
          }}>立即执行</Button>
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await deleteScheduledTask(record.id);
            message.success('已删除');
            fetchData();
          }}>
            <Button type="link" danger size="small">删除</Button>
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
          新建定时任务
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
        title={editRecord ? '编辑定时任务' : '新建定时任务'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="如：每日回归测试" />
          </Form.Item>
          <Form.Item name="task_type" label="任务类型" initialValue="suite">
            <Select>
              <Select.Option value="suite">套件执行</Select.Option>
              <Select.Option value="request">单请求</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="cron_expression" label="Cron 表达式" rules={[{ required: true }]}
            initialValue="0 9 * * 1-5"
            help="格式: 分 时 日 月 周（如 0 9 * * 1-5 表示工作日每天9点）"
          >
            <Input placeholder="0 9 * * 1-5" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
