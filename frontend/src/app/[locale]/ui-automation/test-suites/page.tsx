'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Row, Col, Descriptions,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import {
  getUiProjects, getUiTestSuites, getUiTestSuite, createUiTestSuite, updateUiTestSuite, deleteUiTestSuite,
} from '@/lib/api/ui-automation';
import type { UiProject, UiTestSuite, UiTestCase } from '@/lib/api/ui-automation';

export default function UiTestSuitesPage() {
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [suites, setSuites] = useState<UiTestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<{ suite: UiTestSuite; cases: UiTestCase[] } | null>(null);
  const [editing, setEditing] = useState<UiTestSuite | null>(null);
  const [form] = Form.useForm();

  const loadSuites = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiTestSuites({ project_id: selectedProjectId, page, page_size: 20 });
      setSuites(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [selectedProjectId]);

  useEffect(() => { loadSuites(); }, [selectedProjectId, page]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiTestSuite(editing.id, values);
        message.success('更新成功');
      } else {
        await createUiTestSuite(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadSuites();
    } catch { message.error('操作失败'); }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await getUiTestSuite(id);
      const data = res.data as any;
      setDetailData({
        suite: data,
        cases: data.cases || [],
      });
      setDetailOpen(true);
    } catch { message.error('加载详情失败'); }
  };

  const handleDelete = (record: UiTestSuite) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除测试套件「${record.name}」吗？此操作不可恢复。`,
      okText: '确认删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUiTestSuite(record.id);
          message.success('已删除');
          loadSuites();
        } catch { message.error('删除失败'); }
      },
    });
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
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ project_id: selectedProjectId }); setModalOpen(true); }}
          >新建套件</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={suites}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '套件名称', dataIndex: 'name', width: 250 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '用例数', dataIndex: 'case_count', width: 80 },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 240,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record.id)}
                >查看</Button>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >编辑</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Space>
            ),
          },
        ]}
      />

      {/* 新建/编辑套件 */}
      <Modal title={editing ? '编辑测试套件' : '新建测试套件'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="套件名称" rules={[{ required: true, message: '请输入套件名称' }]}>
            <Input placeholder="如 登录功能测试套件" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="套件描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 套件详情 */}
      <Modal title={`套件详情 - ${detailData?.suite?.name || ''}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        {detailData && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="套件名称">{detailData.suite.name}</Descriptions.Item>
              <Descriptions.Item label="用例数">{detailData.suite.case_count}</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{detailData.suite.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>{detailData.suite.created_at}</Descriptions.Item>
            </Descriptions>
            <Table
              dataSource={detailData.cases} rowKey="id" size="small" pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 60 },
                { title: '用例名称', dataIndex: 'name', width: 200 },
                { title: '优先级', dataIndex: 'priority', width: 80 },
                { title: '状态', dataIndex: 'status', width: 80 },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
