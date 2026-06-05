'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Space, Switch, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiEnvironments, createUiEnvironment, updateUiEnvironment, deleteUiEnvironment, getUiProjects,
} from '@/lib/api/ui-automation';
import type { UiEnvironment, UiProject } from '@/lib/api/ui-automation';

export default function UiEnvironmentsPage() {
  const [environments, setEnvironments] = useState<UiEnvironment[]>([]);
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiEnvironment | null>(null);
  const [form] = Form.useForm();

  const loadEnvs = async () => {
    setLoading(true);
    try {
      const res = await getUiEnvironments();
      setEnvironments(res.data || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadEnvs();
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiEnvironment(editing.id, values);
        message.success('更新成功');
      } else {
        await createUiEnvironment(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadEnvs();
    } catch { message.error('操作失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
        >新建环境</Button>
      </div>

      <Table rowKey="id" loading={loading} dataSource={environments} size="small"
        pagination={false}
        columns={[
          { title: '环境名称', dataIndex: 'name', width: 150 },
          { title: '浏览器', dataIndex: 'browser_type', width: 100 },
          { title: '分辨率', width: 120, render: (_, r) => `${r.window_width}x${r.window_height}` },
          { title: '超时(ms)', dataIndex: 'timeout_ms', width: 100 },
          {
            title: '无头模式', dataIndex: 'headless', width: 90,
            render: (v: boolean) => v ? '是' : '否',
          },
          {
            title: '失败截图', dataIndex: 'screenshot_on_failure', width: 90,
            render: (v: boolean) => v ? '是' : '否',
          },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >编辑</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteUiEnvironment(record.id); message.success('已删除'); loadEnvs(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑环境' : '新建环境'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true }]}>
            <Input placeholder="如 生产环境" />
          </Form.Item>
          <Form.Item name="project_id" label="关联项目">
            <Select allowClear placeholder="全局环境（不选择）"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="browser_type" label="浏览器类型" initialValue="chromium">
                <Select options={[
                  { label: 'Chromium', value: 'chromium' },
                  { label: 'Firefox', value: 'firefox' },
                  { label: 'WebKit', value: 'webkit' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="timeout_ms" label="超时(ms)" initialValue={30000}>
                <InputNumber min={1000} step={5000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="window_width" label="窗口宽度" initialValue={1280}>
                <InputNumber min={800} max={3840} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="window_height" label="窗口高度" initialValue={720}>
                <InputNumber min={600} max={2160} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Space size="large">
            <Form.Item name="headless" label="无头模式" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="screenshot_on_failure" label="失败截图" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="record_video" label="录制视频" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
