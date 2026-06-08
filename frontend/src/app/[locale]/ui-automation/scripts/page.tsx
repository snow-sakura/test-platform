'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Tag, Card, Row, Col, Statistic,
  InputNumber, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, CaretRightOutlined } from '@ant-design/icons';
import {
  getUiProjects, getUiScripts, getUiScript, createUiScript, updateUiScript, deleteUiScript,
  executeUiScript, getUiEnvironments,
} from '@/lib/api/ui-automation';
import type { UiProject, UiTestScript, UiScriptStep, UiEnvironment, UiExecuteScriptResult } from '@/lib/api/ui-automation';

const { TextArea } = Input;

export default function UiScriptsPage() {
  const t = useTranslations();

  const ACTION_OPTIONS = [
    { label: t('uiAutomation.script.navigate'), value: 'navigate' },
    { label: t('uiAutomation.script.click'), value: 'click' },
    { label: t('uiAutomation.script.input'), value: 'input' },
    { label: 'Select', value: 'select' },
    { label: t('uiAutomation.script.wait'), value: 'wait' },
    { label: t('uiAutomation.script.assertion'), value: 'assert' },
    { label: 'Scroll', value: 'scroll' },
    { label: 'Hover', value: 'hover' },
    { label: t('uiAutomation.script.screenshot'), value: 'screenshot' },
  ];
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [scripts, setScripts] = useState<UiTestScript[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [currentScript, setCurrentScript] = useState<UiTestScript | null>(null);
  const [execResult, setExecResult] = useState<UiExecuteScriptResult | null>(null);
  const [environments, setEnvironments] = useState<UiEnvironment[]>([]);
  const [editing, setEditing] = useState<UiTestScript | null>(null);
  const [form] = Form.useForm();

  const loadScripts = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiScripts({ project_id: selectedProjectId, page_size: 100 });
      setScripts(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  useEffect(() => { loadScripts(); }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiScript(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createUiScript(values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadScripts();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getUiScript(id);
      setCurrentScript(res.data);
      setDetailOpen(true);
    } catch { message.error(t('common.loadFailed')); }
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeUiScript(id);
      setExecResult(res.data);
      setResultOpen(true);
    } catch { message.error(t('common.execute') + t('common.failed')); }
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ steps: [{ step_number: 1, action_type: 'navigate' }] });
    setModalOpen(true);
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            placeholder={t('common.selectProject')} allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={openCreateModal}
          >{t('uiAutomation.script.title')}</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={scripts}
        pagination={{ total, pageSize: 20, showTotal: (n) => t('common.totalCount', { count: n }) }} size="small"
        columns={[
          { title: t('uiAutomation.script.name'), dataIndex: 'name', width: 200 },
          { title: 'Steps', dataIndex: 'step_count', width: 80 },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 240,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>{t('common.detail')}</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >{t('common.execute')}</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteUiScript(record.id); message.success(t('common.deleted')); loadScripts(); } catch { message.error(t('common.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* Create/Edit script modal */}
      <Modal title={editing ? t('common.edit') : t('uiAutomation.script.title')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={700}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label={t('uiAutomation.script.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.script.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <div>
                <Typography.Text strong>Steps</Typography.Text>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginTop: 8 }}>
                    <Row gutter={8} align="middle">
                      <Col span={3}><Form.Item {...rest} name={[name, 'step_number']} label="#">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'action_type']} label={t('common.action')} rules={[{ required: true }]}>
                        <Select options={ACTION_OPTIONS} />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'input_value']} label={t('uiAutomation.script.input')}>
                        <Input placeholder="URL/Text/Wait seconds" />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'expected_result']} label="Expected">
                        <Input placeholder="Assertion text" />
                      </Form.Item></Col>
                      <Col span={4}><Form.Item {...rest} name={[name, 'wait_seconds']} label={t('uiAutomation.script.wait') + '(s)'}>
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                      </Form.Item></Col>
                      <Col span={2}>
                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 22 }} />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" block style={{ marginTop: 8 }} onClick={() => add({ step_number: fields.length + 1 })}>
                  + Add Step
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Script detail modal */}
      <Modal title={`${t('common.detail')} - ${currentScript?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentScript?.steps || []} rowKey="id" size="small" pagination={false}
          columns={[
            { title: '#', dataIndex: 'step_number', width: 50 },
            { title: t('common.action'), dataIndex: 'action_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: t('uiAutomation.script.input'), dataIndex: 'input_value', ellipsis: true },
            { title: 'Expected', dataIndex: 'expected_result', ellipsis: true },
            { title: t('uiAutomation.script.wait') + '(s)', dataIndex: 'wait_seconds', width: 80 },
          ]}
        />
      </Modal>

      {/* Execution result modal */}
      <Modal title={'Script Result'} open={resultOpen}
        onCancel={() => setResultOpen(false)} footer={null} width={500}
      >
        {execResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title={t('common.status')} value={execResult.passed ? t('common.passed') : t('common.failed')}
                  valueStyle={{ color: execResult.passed ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="Duration" value={execResult.duration_ms} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic title={t('uiAutomation.script.name')} value={execResult.script_name} />
              </Col>
            </Row>
            {execResult.error && (
              <Card size="small" title="Error" style={{ marginBottom: 16 }}>
                <Typography.Text type="danger">{execResult.error}</Typography.Text>
              </Card>
            )}
            <Typography.Text strong>Step Details</Typography.Text>
            <Table dataSource={execResult.steps || []} rowKey="step_number" size="small" pagination={false}
              columns={[
                { title: '#', dataIndex: 'step_number', width: 50 },
                { title: t('common.action'), dataIndex: 'action', width: 80 },
                {
                  title: 'Result', dataIndex: 'success', width: 70,
                  render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? t('common.passed') : t('common.failed')}</Tag>,
                },
                { title: t('common.error'), dataIndex: 'error', ellipsis: true },
                { title: 'Duration', dataIndex: 'elapsed_ms', width: 80, render: (v: number) => `${v?.toFixed(0)}ms` },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
