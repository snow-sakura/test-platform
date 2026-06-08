'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, message, Modal, Form, Input, Select, Tag, Space, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ScanOutlined, CameraOutlined, LockOutlined, UnlockOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import {
  getDevices, createDevice, updateDevice, deleteDevice, discoverDevices, getAppProjects,
  screenshotDevice, lockDevice, unlockDevice, connectDevice, disconnectDevice,
} from '@/lib/api/app-automation';
import type { Device, AppProject } from '@/lib/api/app-automation';

export default function DevicesPage() {
  const t = useTranslations();
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
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadDevices();
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await discoverDevices();
      const newDevices = res.data || [];
      message.success(`Discovered ${newDevices.length} device(s)`);
      loadDevices();
    } catch { message.error(t('common.operationFailed')); }
    finally { setDiscovering(false); }
  };

  const handleDeviceAction = async (deviceId: number, action: string, actionFn: () => Promise<any>, actionLabel: string) => {
    setActionLoading((prev) => ({ ...prev, [`${action}_${deviceId}`]: true }));
    try {
      const res = await actionFn();
      if (res.data?.success !== false) {
        message.success(`${actionLabel} ${t('common.success')}`);
      } else {
        message.error(`${actionLabel} ${t('common.failed')}: ${res.data?.error || t('common.unknown')}`);
      }
    } catch { message.error(`${actionLabel} ${t('common.failed')}`); }
    finally { setActionLoading((prev) => ({ ...prev, [`${action}_${deviceId}`]: false })); }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateDevice(editing.id, values); message.success(t('common.updateSuccess')); }
      else { await createDevice(values); message.success(t('common.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadDevices();
    } catch { message.error(t('common.operationFailed')); }
  };

  const statusColors: Record<string, string> = { available: 'green', occupied: 'orange', disconnected: 'default' };
  const statusLabels: Record<string, string> = { available: 'Available', occupied: 'Occupied', disconnected: 'Disconnected' };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="Total" value={devices.length} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Available" value={devices.filter((d) => d.status === 'available').length} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Occupied" value={devices.filter((d) => d.status === 'occupied').length} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Offline" value={devices.filter((d) => d.status === 'disconnected').length} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<ScanOutlined />} loading={discovering} onClick={handleDiscover}>Discover</Button>
          <Button icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('common.create')}</Button>
        </Space>
      </div>

      <Table rowKey="id" loading={loading} dataSource={devices} size="small" pagination={false}
        columns={[
          { title: t('common.name'), dataIndex: 'name', width: 160 },
          { title: 'ADB ID', dataIndex: 'device_id', width: 180, ellipsis: true },
          { title: t('common.type'), dataIndex: 'platform', width: 70, render: (v: string) => <Tag>{v}</Tag> },
          { title: t('common.status'), dataIndex: 'platform_version', width: 80 },
          { title: t('common.type'), dataIndex: 'device_type', width: 80, render: (v: string) => <Tag color={v === 'real' ? 'blue' : 'purple'}>{v === 'real' ? 'Real' : 'Emulator'}</Tag> },
          { title: 'Resolution', dataIndex: 'resolution', width: 100 },
          {
            title: t('common.status'), dataIndex: 'status', width: 80,
            render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
          },
          {
            title: t('common.action'), width: 280,
            render: (_, record) => (
              <Space size="small" wrap>
                <Button type="link" size="small" icon={<CameraOutlined />}
                  loading={actionLoading[`screenshot_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'screenshot', () => screenshotDevice(record.id), 'Screenshot')}
                />
                <Button type="link" size="small" icon={<LockOutlined />}
                  loading={actionLoading[`lock_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'lock', () => lockDevice(record.id), 'Lock')}
                />
                <Button type="link" size="small" icon={<UnlockOutlined />}
                  loading={actionLoading[`unlock_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'unlock', () => unlockDevice(record.id), 'Unlock')}
                />
                <Button type="link" size="small" icon={<LinkOutlined />}
                  loading={actionLoading[`connect_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'connect', () => connectDevice(record.id), 'Connect')}
                />
                <Button type="link" size="small" icon={<DisconnectOutlined />}
                  loading={actionLoading[`disconnect_${record.id}`]}
                  onClick={() => handleDeviceAction(record.id, 'disconnect', () => disconnectDevice(record.id), 'Disconnect')}
                />
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteDevice(record.id); message.success(t('common.deleted')); loadDevices(); } catch { message.error(t('common.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('common.edit') : 'Add Device'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="device_id" label="Device ID" rules={[{ required: true }]}>
            <Input placeholder="ADB serial or UDID" />
          </Form.Item>
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('common.name')} />
          </Form.Item>
          <Form.Item name="platform" label={t('common.type')} initialValue="android">
            <Select options={[{ label: 'Android', value: 'android' }, { label: 'iOS', value: 'ios' }]} />
          </Form.Item>
          <Form.Item name="device_type" label={t('common.type')} initialValue="real">
            <Select options={[{ label: 'Real', value: 'real' }, { label: 'Emulator', value: 'emulator' }]} />
          </Form.Item>
          <Form.Item name="project_id" label="Project">
            <Select allowClear placeholder={t('common.selectProject')}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
