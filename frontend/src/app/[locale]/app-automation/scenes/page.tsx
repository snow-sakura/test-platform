'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Tag, Space, Card, Row, Col,
  Typography, Statistic,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import {
  getAppProjects, getAppTestCases, getAppTestCase,
  createAppTestCase, updateAppTestCase, deleteAppTestCase,
  executeAppTestCase, getDevices, getAppPackages,
} from '@/lib/api/app-automation';
import type { AppProject, AppTestCase, Device, AppPackage, ExecuteSceneResult } from '@/lib/api/app-automation';

export default function ScenesPage() {
  const t = useTranslations();

  const ACTION_OPTIONS = [
    { label: t('appAutomation.scene.click'), value: 'click' },
    { label: t('appAutomation.scene.swipe'), value: 'swipe' },
    { label: t('appAutomation.scene.input'), value: 'input' },
    { label: t('appAutomation.scene.wait'), value: 'wait' },
    { label: t('appAutomation.scene.assertion'), value: 'assert' },
    { label: t('appAutomation.scene.screenshot'), value: 'screenshot' },
  ];
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [cases, setCases] = useState<AppTestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [currentCase, setCurrentCase] = useState<AppTestCase | null>(null);
  const [execResult, setExecResult] = useState<ExecuteSceneResult | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [packages, setPackages] = useState<AppPackage[]>([]);
  const [editing, setEditing] = useState<AppTestCase | null>(null);
  const [form] = Form.useForm();

  const loadCases = async (page = 1) => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getAppTestCases({ project_id: selectedProjectId, page, page_size: 50 });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadCases();
      getDevices({ project_id: selectedProjectId }).then((r) => setDevices(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
      getAppPackages(selectedProjectId).then((r) => setPackages(r.data || [])).catch((e) => console.warn(t('common.loadFailed'), e));
    }
  }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      const data = { ...values, project_id: selectedProjectId };
      if (editing) { await updateAppTestCase(editing.id, data); message.success(t('common.updateSuccess')); }
      else { await createAppTestCase(data); message.success(t('common.createSuccess')); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadCases();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeAppTestCase(id);
      setExecResult(res.data);
      setResultOpen(true);
    } catch { message.error(t('appAutomation.scene.executeFailed')); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppTestCase(id);
      setCurrentCase(res.data);
      setDetailOpen(true);
    } catch { message.error(t('appAutomation.scene.loadDetailFailed')); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select placeholder={t('common.selectProject')} allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ scene_data: [{ action: 'click' }] }); setModalOpen(true); }}
          >{t('common.create')}</Button>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={cases} size="small"
        pagination={{ total, pageSize: 50, showTotal: (n) => t('common.totalCount', { count: n }) }}
        columns={[
          { title: t('appAutomation.scene.name'), dataIndex: 'name', width: 200 },
          { title: t('common.priority'), dataIndex: 'priority', width: 80, render: (v: string) => <Tag>{v}</Tag> },
          { title: t('appAutomation.scene.stepCount'), width: 70, render: (_, r) => (r.scene_data || []).length },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 250,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => viewDetail(record.id)}>{t('common.detail')}</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >{t('common.execute')}</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppTestCase(record.id); message.success(t('appAutomation.scene.deleted')); loadCases(); } catch { message.error(t('appAutomation.scene.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* Create/Edit scene modal */}
      <Modal title={editing ? t('common.edit') : t('common.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('appAutomation.scene.name')} rules={[{ required: true }]}>
            <Input placeholder={t('appAutomation.scene.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="package_id" label={t('appAutomation.scene.targetApp')}>
              <Select allowClear placeholder={t('common.selectPlaceholder')} style={{ width: 250 }}
                options={packages.map((p) => ({ label: `${p.app_name} (${p.package_name})`, value: p.id }))}
              />
            </Form.Item>
            <Form.Item name="device_id" label={t('appAutomation.scene.device')}>
              <Select allowClear placeholder={t('appAutomation.scene.autoSelect')} style={{ width: 200 }}
                options={devices.filter((d) => d.status === 'available').map((d) => ({ label: d.name, value: d.id }))}
              />
            </Form.Item>
          </Space>

          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>{t('appAutomation.scene.stepEditor')}</Typography.Text>
          <Form.List name="scene_data">
            {(fields, { add, remove }) => (
              <div>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginTop: 8 }}>
                    <Row gutter={8} align="middle">
                      <Col span={5}>
                        <Form.Item {...rest} name={[name, 'action']} label={t('common.action')} rules={[{ required: true }]} initialValue="click">
                          <Select options={ACTION_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item {...rest} name={[name, 'element_id']} label="Element ID">
                          <Input placeholder={t('common.selectPlaceholder')} type="number" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...rest} name={[name, 'params']} label={t('appAutomation.scene.params')}>
                          <Input placeholder='{"text": "hello"} / {"x": 100, "y": 200}' />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 22 }} />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" block style={{ marginTop: 8 }} onClick={() => add({ action: 'click' })}>
                  + {t('appAutomation.scene.addStep')}
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Scene detail modal */}
      <Modal title={`${t('common.detail')} - ${currentCase?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentCase?.scene_data || []} rowKey={(_, i) => String(i)} size="small" pagination={false}
          columns={[
            { title: '#', render: (_, __, i) => i + 1, width: 50 },
            { title: t('common.action'), dataIndex: 'action', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: 'Element ID', dataIndex: 'element_id', width: 80 },
            { title: 'Params', dataIndex: 'params', render: (v: Record<string, unknown>) => v ? JSON.stringify(v) : '-' },
          ]}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {currentCase?.description}
        </Typography.Text>
      </Modal>

      {/* Execution result modal */}
      <Modal title={t('appAutomation.scene.executionResult')} open={resultOpen}
        onCancel={() => setResultOpen(false)} footer={null} width={500}
      >
        {execResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title={t('common.status')} value={execResult.passed ? t('common.passed') : t('common.failed')} valueStyle={{ color: execResult.passed ? '#52c41a' : '#ff4d4f' }} /></Col>
              <Col span={8}><Statistic title="Duration" value={execResult.duration_ms} suffix="ms" /></Col>
              <Col span={8}><Statistic title={t('appAutomation.scene.stepCount')} value={execResult.steps?.length || 0} /></Col>
            </Row>
            {execResult.error && <Card size="small" title={t('appAutomation.scene.errorMessage')} style={{ marginBottom: 16 }}><Typography.Text type="danger">{execResult.error}</Typography.Text></Card>}
            <Typography.Text strong>{t('appAutomation.scene.stepDetail')}</Typography.Text>
            <Table dataSource={execResult.steps || []} rowKey="action" size="small" pagination={false}
              columns={[
                { title: t('common.action'), dataIndex: 'action', width: 80 },
                { title: t('appAutomation.scene.result'), dataIndex: 'success', width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? t('common.passed') : t('common.failed')}</Tag> },
                { title: 'Error', dataIndex: 'error', ellipsis: true },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
