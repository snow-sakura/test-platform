'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, message, Card, Space, Tag, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, CodeOutlined } from '@ant-design/icons';

import {
  getScenes, createScene, updateScene, deleteScene, executeScene,
} from '@/lib/api/performance';
import { getApiProjects } from '@/lib/api/api-testing';
import type { PerformanceScene } from '@/lib/api/performance';
import type { ApiProject } from '@/lib/api/api-testing';

const SCENE_TYPES = [
  { label: 'HTTP 压测 (httpx)', value: 'httpx' },
  { label: 'JMeter 压测', value: 'jmeter' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'default', ready: 'blue', archived: 'warning',
};

export default function PerformanceScenesPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<PerformanceScene[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getScenes({ project_id: projectId, page, page_size: 20 });
      setScenes(res.data.results || []);
      setTotal(res.data.count);
    } catch { message.error('加载场景列表失败'); }
    finally { setLoading(false); }
  }, [projectId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await createScene(projectId!, {
        name: values.name,
        description: values.description,
        scenario_type: values.scenario_type || 'httpx',
        config: values.config ? JSON.parse(values.config) : {},
      });
      message.success('场景创建成功');
      setCreateOpen(false);
      form.resetFields();
      setPage(1);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('创建场景失败');
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `场景: ${name}`,
      okText: '确定', cancelText: '取消', okType: 'danger',
      onOk: async () => {
        try {
          await deleteScene(id);
          message.success('场景已删除');
          fetchData();
        } catch { message.error('删除失败'); }
      },
    });
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeScene(id);
      message.success('执行已触发');
    } catch { message.error('执行失败'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: '场景名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '类型', dataIndex: 'scenario_type', key: 'scenario_type', width: 130,
      render: (v: string) => <Tag>{v === 'jmeter' ? 'JMeter' : 'HTTP (httpx)'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180 },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, record: PerformanceScene) => (
        <Space>
          <Button type="link" size="small" icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record.id)}>执行</Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 项目选择 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="请选择项目"
          style={{ width: 300 }}
          value={projectId}
          onChange={(v) => { setProjectId(v); setPage(1); }}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch filterOption
        />
      </div>

      <Card
        size="small" title="压测场景"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} disabled={!projectId}>新建场景</Button>}
      >
        <Table
          dataSource={scenes} columns={columns} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
          size="small"
        />
      </Card>

      <Modal title="新建压测场景" open={createOpen} onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }} okText="确定" cancelText="取消">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
            <Input placeholder="例如: 登录接口压测" />
          </Form.Item>
          <Form.Item name="scenario_type" label="压测类型" initialValue="httpx">
            <Select options={SCENE_TYPES} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="压测描述" />
          </Form.Item>
          <Form.Item name="config" label="配置 (JSON)" extra='{"url":"http://...","method":"GET","concurrent_users":10,"duration_seconds":30}'>
            <Input.TextArea rows={4} placeholder='输入 JSON 配置...' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
