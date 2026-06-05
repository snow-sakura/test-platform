'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, PauseCircleOutlined, CaretRightOutlined } from '@ant-design/icons';
import {
  getAppScheduledTasks, createAppScheduledTask, deleteAppScheduledTask,
  pauseAppScheduledTask, resumeAppScheduledTask,
} from '@/lib/api/app-automation';
import type { AppScheduledTask } from '@/lib/api/app-automation';

export default function AppScheduledTasksPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createAppScheduledTask(values);
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
      loadTasks();
    } catch { message.error('创建失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建定时任务</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={tasks}
        pagination={{ total, pageSize: 20, onChange: loadTasks, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: '任务名称', dataIndex: 'name', width: 200 },
          { title: 'CRON 表达式', dataIndex: 'cron_expression', width: 140 },
          { title: '触发类型', dataIndex: 'trigger_type', width: 80 },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (v: string) => (
              <Tag color={v === 'active' ? 'green' : v === 'paused' ? 'orange' : 'default'}>
                {v === 'active' ? '运行中' : v === 'paused' ? '已暂停' : v}
              </Tag>
            ),
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 220,
            render: (_, record) => (
              <Space>
                {record.status === 'active' ? (
                  <Button type="link" size="small" icon={<PauseCircleOutlined />}
                    onClick={async () => { try { await pauseAppScheduledTask(record.id); message.success('已暂停'); loadTasks(); } catch { message.error('操作失败'); } }}
                  >暂停</Button>
                ) : (
                  <Button type="link" size="small" icon={<CaretRightOutlined />}
                    onClick={async () => { try { await resumeAppScheduledTask(record.id); message.success('已恢复'); loadTasks(); } catch { message.error('操作失败'); } }}
                  >恢复</Button>
                )}
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppScheduledTask(record.id); message.success('已删除'); loadTasks(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title="新建定时任务" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
            <Input placeholder="如 每日回归测试" />
          </Form.Item>
          <Form.Item name="cron_expression" label="CRON 表达式" initialValue="0 9 * * 1-5">
            <Input placeholder="0 9 * * 1-5" />
          </Form.Item>
          <Form.Item name="trigger_type" label="触发类型" initialValue="cron">
            <Select options={[
              { label: 'Cron 表达式', value: 'cron' },
              { label: '固定间隔', value: 'interval' },
            ]} />
          </Form.Item>
          <Form.Item name="suite_id" label="关联套件">
            <Input placeholder="套件 ID（可选）" type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
