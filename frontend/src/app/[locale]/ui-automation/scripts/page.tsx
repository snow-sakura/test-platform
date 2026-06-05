'use client';

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

const ACTION_OPTIONS = [
  { label: '导航', value: 'navigate' },
  { label: '点击', value: 'click' },
  { label: '输入', value: 'input' },
  { label: '选择', value: 'select' },
  { label: '等待', value: 'wait' },
  { label: '断言', value: 'assert' },
  { label: '滚动', value: 'scroll' },
  { label: '悬停', value: 'hover' },
  { label: '截图', value: 'screenshot' },
];

const { TextArea } = Input;

export default function UiScriptsPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  useEffect(() => { loadScripts(); }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiScript(editing.id, values);
        message.success('更新成功');
      } else {
        await createUiScript(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadScripts();
    } catch { message.error('操作失败'); }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getUiScript(id);
      setCurrentScript(res.data);
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeUiScript(id);
      setExecResult(res.data);
      setResultOpen(true);
    } catch { message.error('执行失败'); }
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
            placeholder="选择项目" allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={openCreateModal}
          >新建脚本</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={scripts}
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }} size="small"
        columns={[
          { title: '脚本名称', dataIndex: 'name', width: 200 },
          { title: '步骤数', dataIndex: 'step_count', width: 80 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 240,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>详情</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >执行</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >编辑</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteUiScript(record.id); message.success('已删除'); loadScripts(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* 新建/编辑脚本 */}
      <Modal title={editing ? '编辑脚本' : '新建脚本'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={700}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="脚本名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录流程测试" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <div>
                <Typography.Text strong>步骤列表</Typography.Text>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginTop: 8 }}>
                    <Row gutter={8} align="middle">
                      <Col span={3}><Form.Item {...rest} name={[name, 'step_number']} label="序号">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'action_type']} label="操作" rules={[{ required: true }]}>
                        <Select options={ACTION_OPTIONS} />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'input_value']} label="输入值">
                        <Input placeholder="URL/文本/等待秒数" />
                      </Form.Item></Col>
                      <Col span={5}><Form.Item {...rest} name={[name, 'expected_result']} label="预期结果">
                        <Input placeholder="断言文本" />
                      </Form.Item></Col>
                      <Col span={4}><Form.Item {...rest} name={[name, 'wait_seconds']} label="等待(秒)">
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                      </Form.Item></Col>
                      <Col span={2}>
                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 22 }} />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" block style={{ marginTop: 8 }} onClick={() => add({ step_number: fields.length + 1 })}>
                  + 添加步骤
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 脚本详情 */}
      <Modal title={`脚本详情 - ${currentScript?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentScript?.steps || []} rowKey="id" size="small" pagination={false}
          columns={[
            { title: '#', dataIndex: 'step_number', width: 50 },
            { title: '操作', dataIndex: 'action_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: '输入值', dataIndex: 'input_value', ellipsis: true },
            { title: '预期结果', dataIndex: 'expected_result', ellipsis: true },
            { title: '等待(秒)', dataIndex: 'wait_seconds', width: 80 },
          ]}
        />
      </Modal>

      {/* 执行结果 */}
      <Modal title="脚本执行结果" open={resultOpen}
        onCancel={() => setResultOpen(false)} footer={null} width={500}
      >
        {execResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title="状态" value={execResult.passed ? '通过' : '失败'}
                  valueStyle={{ color: execResult.passed ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="耗时" value={execResult.duration_ms} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic title="脚本" value={execResult.script_name} />
              </Col>
            </Row>
            {execResult.error && (
              <Card size="small" title="错误信息" style={{ marginBottom: 16 }}>
                <Typography.Text type="danger">{execResult.error}</Typography.Text>
              </Card>
            )}
            <Typography.Text strong>步骤执行详情</Typography.Text>
            <Table dataSource={execResult.steps || []} rowKey="step_number" size="small" pagination={false}
              columns={[
                { title: '#', dataIndex: 'step_number', width: 50 },
                { title: '操作', dataIndex: 'action', width: 80 },
                {
                  title: '结果', dataIndex: 'success', width: 70,
                  render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '通过' : '失败'}</Tag>,
                },
                { title: '错误', dataIndex: 'error', ellipsis: true },
                { title: '耗时', dataIndex: 'elapsed_ms', width: 80, render: (v: number) => `${v?.toFixed(0)}ms` },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
