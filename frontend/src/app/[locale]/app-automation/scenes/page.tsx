'use client';

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

const ACTION_OPTIONS = [
  { label: '点击', value: 'click' },
  { label: '滑动', value: 'swipe' },
  { label: '输入', value: 'input' },
  { label: '等待', value: 'wait' },
  { label: '断言', value: 'assert' },
  { label: '截图', value: 'screenshot' },
];

export default function ScenesPage() {
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
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn('加载项目列表失败', e));
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadCases();
      getDevices({ project_id: selectedProjectId }).then((r) => setDevices(r.data.results || [])).catch((e) => console.warn('加载设备列表失败', e));
      getAppPackages(selectedProjectId).then((r) => setPackages(r.data || [])).catch((e) => console.warn('加载包列表失败', e));
    }
  }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      const data = { ...values, project_id: selectedProjectId };
      if (editing) { await updateAppTestCase(editing.id, data); message.success('更新成功'); }
      else { await createAppTestCase(data); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadCases();
    } catch { message.error('操作失败'); }
  };

  const handleExecute = async (id: number) => {
    try {
      const res = await executeAppTestCase(id);
      setExecResult(res.data);
      setResultOpen(true);
    } catch { message.error('执行失败'); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppTestCase(id);
      setCurrentCase(res.data);
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select placeholder="选择项目" allowClear style={{ width: '100%' }}
            value={selectedProjectId} onChange={setSelectedProjectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ scene_data: [{ action: 'click' }] }); setModalOpen(true); }}
          >新建场景</Button>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={cases} size="small"
        pagination={{ total, pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '场景名称', dataIndex: 'name', width: 200 },
          { title: '优先级', dataIndex: 'priority', width: 80, render: (v: string) => <Tag>{v}</Tag> },
          { title: '步骤数', width: 70, render: (_, r) => (r.scene_data || []).length },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 250,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => viewDetail(record.id)}>详情</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >执行</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppTestCase(record.id); message.success('已删除'); loadCases(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* 新建/编辑场景 */}
      <Modal title={editing ? '编辑场景' : '新建场景'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="场景名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录流程" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="package_id" label="目标应用">
              <Select allowClear placeholder="选择应用" style={{ width: 250 }}
                options={packages.map((p) => ({ label: `${p.app_name} (${p.package_name})`, value: p.id }))}
              />
            </Form.Item>
            <Form.Item name="device_id" label="执行设备">
              <Select allowClear placeholder="自动选择" style={{ width: 200 }}
                options={devices.filter((d) => d.status === 'available').map((d) => ({ label: d.name, value: d.id }))}
              />
            </Form.Item>
          </Space>

          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>场景步骤编排</Typography.Text>
          <Form.List name="scene_data">
            {(fields, { add, remove }) => (
              <div>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginTop: 8 }}>
                    <Row gutter={8} align="middle">
                      <Col span={5}>
                        <Form.Item {...rest} name={[name, 'action']} label="操作" rules={[{ required: true }]} initialValue="click">
                          <Select options={ACTION_OPTIONS} />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item {...rest} name={[name, 'element_id']} label="元素 ID">
                          <Input placeholder="可选" type="number" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...rest} name={[name, 'params']} label="参数 (JSON)">
                          <Input placeholder='{"text": "hello"} 或 {"x": 100, "y": 200}' />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: 22 }} />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" block style={{ marginTop: 8 }} onClick={() => add({ action: 'click' })}>
                  + 添加步骤
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 场景详情 */}
      <Modal title={`场景详情 - ${currentCase?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentCase?.scene_data || []} rowKey={(_, i) => String(i)} size="small" pagination={false}
          columns={[
            { title: '#', render: (_, __, i) => i + 1, width: 50 },
            { title: '操作', dataIndex: 'action', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: '元素 ID', dataIndex: 'element_id', width: 80 },
            { title: '参数', dataIndex: 'params', render: (v: Record<string, unknown>) => v ? JSON.stringify(v) : '-' },
          ]}
        />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {currentCase?.description}
        </Typography.Text>
      </Modal>

      {/* 执行结果 */}
      <Modal title="场景执行结果" open={resultOpen}
        onCancel={() => setResultOpen(false)} footer={null} width={500}
      >
        {execResult && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title="状态" value={execResult.passed ? '通过' : '失败'} valueStyle={{ color: execResult.passed ? '#52c41a' : '#ff4d4f' }} /></Col>
              <Col span={8}><Statistic title="耗时" value={execResult.duration_ms} suffix="ms" /></Col>
              <Col span={8}><Statistic title="步骤数" value={execResult.steps?.length || 0} /></Col>
            </Row>
            {execResult.error && <Card size="small" title="错误信息" style={{ marginBottom: 16 }}><Typography.Text type="danger">{execResult.error}</Typography.Text></Card>}
            <Typography.Text strong>步骤执行详情</Typography.Text>
            <Table dataSource={execResult.steps || []} rowKey="action" size="small" pagination={false}
              columns={[
                { title: '操作', dataIndex: 'action', width: 80 },
                { title: '结果', dataIndex: 'success', width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '通过' : '失败'}</Tag> },
                { title: '错误', dataIndex: 'error', ellipsis: true },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
