'use client';

import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ScanOutlined, CameraOutlined, LockOutlined, UnlockOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import {
  getDevices, createDevice, updateDevice, deleteDevice, discoverDevices, getAppProjects,
  screenshotDevice, lockDevice, unlockDevice, connectDevice, disconnectDevice,
} from '@/lib/api/app-automation';
import type { Device, AppProject } from '@/lib/api/app-automation';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [form] = Form.useForm();

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await getDevices({ page_size: 1000 });
      setDevices(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadDevices();
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await discoverDevices();
      const newDevices = res.data || [];
      message.success(`发现 ${newDevices.length} 台设备`);
      loadDevices();
    } catch { message.error('设备发现失败'); }
    finally { setDiscovering(false); }
  };

  const handleDeviceAction = async (deviceId: number, action: string, actionFn: () => Promise<any>, actionLabel: string) => {
    setActionLoading((prev) => ({ ...prev, [`${action}_${deviceId}`]: true }));
    try {
      const res = await actionFn();
      if (res.data?.success !== false) {
        message.success(`${actionLabel}成功`);
      } else {
        message.error(`${actionLabel}失败: ${res.data?.error || '未知错误'}`);
      }
    } catch { message.error(`${actionLabel}失败`); }
    finally { setActionLoading((prev) => ({ ...prev, [`${action}_${deviceId}`]: false })); }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateDevice(editing.id, values); message.success('更新成功'); }
      else { await createDevice(values); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadDevices();
    } catch { message.error('操作失败'); }
  };

  const statusColors: Record<string, string> = { available: 'green', occupied: 'orange', disconnected: 'default' };
  const statusLabels: Record<string, string> = { available: '可用', occupied: '占用中', disconnected: '未连接' };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="总设备" value={devices.length} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="可用" value={devices.filter((d) => d.status === 'available').length} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="占用" value={devices.filter((d) => d.status === 'occupied').length} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="离线" value={devices.filter((d) => d.status === 'disconnected').length} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<ScanOutlined />} loading={discovering} onClick={handleDiscover}>ADB 发现设备</Button>
          <Button icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>手动添加</Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} dataSource={devices} size="small" pagination={false}
        columns={[
          { title: '设备名称', dataIndex: 'name', width: 160 },
          { title: 'ADB ID', dataIndex: 'device_id', width: 180, ellipsis: true },
          { title: '平台', dataIndex: 'platform', width: 70, render: (v: string) => <Tag>{v}</Tag> },
          { title: '版本', dataIndex: 'platform_version', width: 80 },
          { title: '类型', dataIndex: 'device_type', width: 80, render: (v: string) => <Tag color={v === 'real' ? 'blue' : 'purple'}>{v === 'real' ? '真机' : '模拟器'}</Tag> },
          { title: '分辨率', dataIndex: 'resolution', width: 100 },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
          },
          {
            title: '操作', width: 280,
            render: (_, record) => (
              <Space size="small" wrap>
                <Button type="link" size="small" icon={<CameraOutlined />}
                  loading={actionLoading[`screenshot_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'screenshot', () => screenshotDevice(record.id), '截图')}
                />
                <Button type="link" size="small" icon={<LockOutlined />}
                  loading={actionLoading[`lock_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'lock', () => lockDevice(record.id), '锁定')}
                />
                <Button type="link" size="small" icon={<UnlockOutlined />}
                  loading={actionLoading[`unlock_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'unlock', () => unlockDevice(record.id), '解锁')}
                />
                <Button type="link" size="small" icon={<LinkOutlined />}
                  loading={actionLoading[`connect_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'connect', () => connectDevice(record.id), '连接')}
                />
                <Button type="link" size="small" icon={<DisconnectOutlined />}
                  loading={actionLoading[`disconnect_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'disconnect', () => disconnectDevice(record.id), '断开')}
                />
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteDevice(record.id); message.success('已删除'); loadDevices(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑设备' : '添加设备'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="device_id" label="设备标识" rules={[{ required: true }]}>
            <Input placeholder="ADB 序列号或 UDID" />
          </Form.Item>
          <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
            <Input placeholder="如 Pixel 6" />
          </Form.Item>
          <Form.Item name="platform" label="平台" initialValue="android">
            <Select options={[{ label: 'Android', value: 'android' }, { label: 'iOS', value: 'ios' }]} />
          </Form.Item>
          <Form.Item name="device_type" label="设备类型" initialValue="real">
            <Select options={[{ label: '真机', value: 'real' }, { label: '模拟器', value: 'emulator' }]} />
          </Form.Item>
          <Form.Item name="project_id" label="关联项目">
            <Select allowClear placeholder="选择项目（可选）"
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
