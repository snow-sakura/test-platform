'use client';

import { useEffect, useState } from 'react';
import { Card, Table, Button, message, Modal, Form, Input, InputNumber, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAppConfigs, createAppConfig, updateAppConfig, deleteAppConfig } from '@/lib/api/app-automation';
import type { AppConfig } from '@/lib/api/app-automation';

export default function ConfigPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadConfigs(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppConfig(editing.id, values); message.success('更新成功'); }
      else { await createAppConfig(values); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadConfigs();
    } catch { message.error('操作失败'); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
          >新增环境配置</Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} dataSource={configs} size="small" pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name', width: 160 },
          { title: 'ADB 路径', dataIndex: 'adb_path', width: 200 },
          { title: '设备超时(秒)', dataIndex: 'device_timeout', width: 120 },
          { title: '截图目录', dataIndex: 'screenshot_dir', width: 200 },
          {
            title: '创建时间', dataIndex: 'created_at', width: 170,
            render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
          },
          {
            title: '操作', width: 100,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => {
                    try { await deleteAppConfig(record.id); message.success('已删除'); loadConfigs(); }
                    catch { message.error('删除失败'); }
                  }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑环境配置' : '新增环境配置'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true }]}>
            <Input placeholder="如 测试环境配置" />
          </Form.Item>
          <Form.Item name="adb_path" label="ADB 路径" initialValue="adb">
            <Input placeholder="adb 命令路径" />
          </Form.Item>
          <Form.Item name="device_timeout" label="设备超时(秒)" initialValue={30}>
            <InputNumber min={5} max={300} />
          </Form.Item>
          <Form.Item name="screenshot_dir" label="截图目录" initialValue="screenshots">
            <Input placeholder="截图保存目录" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
