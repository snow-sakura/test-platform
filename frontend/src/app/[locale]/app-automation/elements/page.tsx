'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Tag, Space, InputNumber, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppElements, getAppImageCategories, getAppPackages,
  createAppElement, updateAppElement, deleteAppElement,
  createAppImageCategory, deleteAppImageCategory,
} from '@/lib/api/app-automation';
import type { AppProject, AppElement, AppImageCategory } from '@/lib/api/app-automation';

const ELEMENT_TYPES = [
  { label: '图片匹配', value: 'image' },
  { label: '坐标点击', value: 'coordinate' },
  { label: '区域点击', value: 'region' },
  { label: '文本匹配', value: 'text' },
];

export default function AppElementsPage() {
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [elements, setElements] = useState<AppElement[]>([]);
  const [categories, setCategories] = useState<AppImageCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppElement | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch(() => {});
  }, []);

  const loadCategories = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await getAppImageCategories(selectedProjectId);
      setCategories(res.data || []);
    } catch { /* ignore */ }
  };

  const loadElements = async (page = 1) => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getAppElements({ project_id: selectedProjectId, page, page_size: 20 });
      setElements(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); loadElements(); }, [selectedProjectId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAppElement(editing.id, values); message.success('更新成功'); }
      else { await createAppElement(values); message.success('创建成功'); }
      setModalOpen(false); setEditing(null); form.resetFields(); loadElements();
    } catch { message.error('操作失败'); }
  };

  const handleCreateCategory = async () => {
    const values = await form.validateFields();
    try {
      await createAppImageCategory({ project_id: selectedProjectId!, ...values });
      message.success('分类创建成功');
      setCatModalOpen(false);
      form.resetFields();
      loadCategories();
    } catch { message.error('创建失败'); }
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
          <Space>
            <Button type="primary" icon={<PlusOutlined />} disabled={!selectedProjectId}
              onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}
            >新建元素</Button>
            <Button onClick={() => { form.resetFields(); setCatModalOpen(true); }} disabled={!selectedProjectId}>管理分类</Button>
          </Space>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={elements} size="small"
        pagination={{ total, pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        columns={[
          { title: '元素名称', dataIndex: 'name', width: 150 },
          {
            title: '定位方式', dataIndex: 'element_type', width: 100,
            render: (v: string) => ELEMENT_TYPES.find((t) => t.value === v)?.label || v,
          },
          { title: '阈值', dataIndex: 'threshold', width: 70, render: (v: number | null) => v ?? '-' },
          { title: '坐标', dataIndex: 'coordinates', width: 120, render: (v: Record<string, number> | null) => v ? JSON.stringify(v) : '-' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '创建时间', dataIndex: 'created_at', width: 170 },
          {
            title: '操作', width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                />
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppElement(record.id); message.success('已删除'); loadElements(); } catch { message.error('删除失败'); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? '编辑元素' : '新建元素'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="元素名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录按钮" />
          </Form.Item>
          <Form.Item name="element_type" label="定位方式" rules={[{ required: true }]} initialValue="image">
            <Select options={ELEMENT_TYPES} />
          </Form.Item>
          <Form.Item name="threshold" label="匹配阈值 (0-1)">
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} placeholder="如 0.8" />
          </Form.Item>
          <Form.Item name="coordinates" label="坐标 (JSON)">
            <Input.TextArea rows={2} placeholder='{"x": 100, "y": 200} 或 {"x": 100, "y": 200, "w": 50, "h": 80}' />
          </Form.Item>
          <Form.Item name="image_category_id" label="图片分类">
            <Select allowClear placeholder="选择分类（可选）"
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="新建图片分类" open={catModalOpen} onOk={handleCreateCategory} onCancel={() => setCatModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录页面元素" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
