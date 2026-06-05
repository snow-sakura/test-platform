'use client';

import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Tree, Space, Card, Row, Col, Tag,
  Typography, Tabs, InputNumber,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderAddOutlined } from '@ant-design/icons';
import {
  getUiProjects, getUiElementGroups, getUiElements, getUiPageObjects,
  createUiElementGroup, createUiElement, createUiPageObject, updateUiElement,
  deleteUiElementGroup, deleteUiElement, deleteUiPageObject, generateUiPageObjectCode,
  validateUiElement,
} from '@/lib/api/ui-automation';
import type { UiProject, UiElementGroup, UiElement, UiPageObject } from '@/lib/api/ui-automation';
import type { DataNode } from 'antd/es/tree';

const { TextArea } = Input;

export default function UiElementsPage() {
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [groups, setGroups] = useState<UiElementGroup[]>([]);
  const [elements, setElements] = useState<UiElement[]>([]);
  const [pageObjects, setPageObjects] = useState<UiPageObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>();

  // Modals
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [elementModalOpen, setElementModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [editingElement, setEditingElement] = useState<UiElement | null>(null);
  const [form] = Form.useForm();

  const loadProjects = async () => {
    try {
      const res = await getUiProjects({ page_size: 100 });
      setProjects(res.data.results || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadProjects(); }, []);

  const loadGroups = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await getUiElementGroups(selectedProjectId);
      setGroups(res.data || []);
    } catch { message.error('加载分组失败'); }
  };

  const loadElements = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiElements({ project_id: selectedProjectId, group_id: selectedGroupId });
      setElements(res.data.results || []);
    } catch { message.error('加载元素失败'); }
    finally { setLoading(false); }
  };

  const loadPageObjects = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await getUiPageObjects({ project_id: selectedProjectId, page_size: 100 });
      setPageObjects(res.data.results || []);
    } catch { message.error('加载页面对象失败'); }
  };

  useEffect(() => { loadGroups(); loadElements(); loadPageObjects(); }, [selectedProjectId, selectedGroupId]);

  // 构建分组树
  const buildTreeData = (parentId = 0): DataNode[] => {
    return groups.filter((g) => g.parent_id === parentId).map((g) => ({
      key: `group-${g.id}`,
      title: `${g.name} (${g.element_count})`,
      children: buildTreeData(g.id),
    }));
  };

  const treeData: DataNode[] = [
    { key: 'all', title: `全部元素 (${elements.length})` },
    ...buildTreeData(),
  ];

  // 元素操作
  const handleCreateGroup = async () => {
    const values = await form.validateFields();
    try {
      await createUiElementGroup({ project_id: selectedProjectId!, ...values });
      message.success('分组创建成功');
      setGroupModalOpen(false);
      form.resetFields();
      loadGroups();
    } catch { message.error('创建失败'); }
  };

  const handleElementSubmit = async () => {
    const values = await form.validateFields();
    try {
      const data = { ...values, project_id: selectedProjectId };
      if (editingElement) {
        await updateUiElement(editingElement.id, data);
        message.success('更新成功');
      } else {
        await createUiElement(data);
        message.success('创建成功');
      }
      setElementModalOpen(false);
      setEditingElement(null);
      form.resetFields();
      loadElements();
    } catch { message.error('操作失败'); }
  };

  const handleCreatePO = async () => {
    const values = await form.validateFields();
    try {
      await createUiPageObject({ project_id: selectedProjectId!, ...values });
      message.success('页面对象创建成功');
      setPoModalOpen(false);
      form.resetFields();
      loadPageObjects();
    } catch { message.error('创建失败'); }
  };

  const handleGenerateCode = async (id: number) => {
    try {
      const res = await generateUiPageObjectCode(id);
      setGeneratedCode(res.data.code);
      setCodeModalOpen(true);
    } catch { message.error('生成失败'); }
  };

  const handleValidate = async (id: number) => {
    try {
      const res = await validateUiElement(id);
      if (res.data.found) {
        message.success('元素定位验证通过');
      } else {
        message.warning(`定位失败: ${res.data.error || '未知错误'}`);
      }
    } catch { message.error('验证请求失败'); }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card
            size="small" title="元素分组"
            extra={<Button size="small" icon={<FolderAddOutlined />} onClick={() => { form.resetFields(); setGroupModalOpen(true); }} />}
          >
            <Select
              placeholder="选择项目" allowClear style={{ width: '100%', marginBottom: 8 }}
              value={selectedProjectId} onChange={(v) => { setSelectedProjectId(v); setSelectedGroupId(undefined); }}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
            {selectedProjectId && (
              <Tree
                treeData={treeData}
                onSelect={(keys) => {
                  const key = keys[0] as string;
                  setSelectedGroupId(key === 'all' ? undefined : parseInt(key.replace('group-', '')));
                }}
                defaultExpandAll
              />
            )}
          </Card>
        </Col>
        <Col span={18}>
          <Tabs
            items={[
              {
                key: 'elements', label: '元素管理',
                children: (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" icon={<PlusOutlined />}
                        disabled={!selectedProjectId}
                        onClick={() => { setEditingElement(null); form.resetFields(); setElementModalOpen(true); }}
                      >新建元素</Button>
                    </div>
                    <Table rowKey="id" loading={loading} dataSource={elements} size="small"
                      pagination={false}
                      columns={[
                        { title: '元素名称', dataIndex: 'name', width: 150 },
                        { title: '定位策略', dataIndex: 'locator_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                        { title: '定位值', dataIndex: 'locator_value', ellipsis: true },
                        { title: '页面 URL', dataIndex: 'page_url', ellipsis: true },
                        {
                          title: '操作', width: 180,
                          render: (_, record) => (
                            <Space>
                              <Button type="link" size="small" icon={<EditOutlined />}
                                onClick={() => { setEditingElement(record); form.setFieldsValue(record); setElementModalOpen(true); }}
                              >编辑</Button>
                              <Button type="link" size="small" onClick={() => handleValidate(record.id)}>验证</Button>
                              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                                onClick={async () => { try { await deleteUiElement(record.id); message.success('已删除'); loadElements(); } catch { message.error('删除失败'); } }}
                              />
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                key: 'page-objects', label: '页面对象',
                children: (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" icon={<PlusOutlined />}
                        disabled={!selectedProjectId}
                        onClick={() => { form.resetFields(); setPoModalOpen(true); }}
                      >新建页面对象</Button>
                    </div>
                    <Table rowKey="id" dataSource={pageObjects} size="small" pagination={false}
                      columns={[
                        { title: '页面名称', dataIndex: 'name', width: 150 },
                        { title: 'URL', dataIndex: 'url', ellipsis: true },
                        { title: '关联元素数', dataIndex: 'element_count', width: 100 },
                        {
                          title: '操作', width: 160,
                          render: (_, record) => (
                            <Space>
                              <Button type="link" size="small" onClick={() => handleGenerateCode(record.id)}>生成代码</Button>
                              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                                onClick={async () => { try { await deleteUiPageObject(record.id); message.success('已删除'); loadPageObjects(); } catch { message.error('删除失败'); } }}
                              />
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Col>
      </Row>

      {/* 新建分组弹窗 */}
      <Modal title="新建分组" open={groupModalOpen} onOk={handleCreateGroup} onCancel={() => setGroupModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分组名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录页面" />
          </Form.Item>
          <Form.Item name="parent_id" label="父分组">
            <Select allowClear placeholder="顶级分组（可选）"
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建/编辑元素弹窗 */}
      <Modal title={editingElement ? '编辑元素' : '新建元素'} open={elementModalOpen}
        onOk={handleElementSubmit} onCancel={() => { setElementModalOpen(false); setEditingElement(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="元素名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录按钮" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="locator_type" label="定位策略" rules={[{ required: true }]} initialValue="css">
                <Select options={[
                  { label: 'CSS 选择器', value: 'css' },
                  { label: 'XPath', value: 'xpath' },
                  { label: 'ID', value: 'id' },
                  { label: 'Name', value: 'name' },
                  { label: 'Class Name', value: 'class' },
                  { label: '文本', value: 'text' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="locator_value" label="定位值" rules={[{ required: true }]}>
                <Input placeholder='如 #login-btn 或 //button[@id="login"]' />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="page_url" label="页面 URL">
            <Input placeholder="https://example.com/login" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="group_id" label="所属分组">
            <Select allowClear placeholder="选择分组（可选）"
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建页面对象弹窗 */}
      <Modal title="新建页面对象" open={poModalOpen} onOk={handleCreatePO} onCancel={() => setPoModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="页面名称" rules={[{ required: true }]}>
            <Input placeholder="如 登录页面" />
          </Form.Item>
          <Form.Item name="url" label="页面 URL">
            <Input placeholder="https://example.com/login" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 生成代码弹窗 */}
      <Modal title="Page Object 代码" open={codeModalOpen} onCancel={() => setCodeModalOpen(false)}
        footer={<Button onClick={() => { navigator.clipboard.writeText(generatedCode); message.success('已复制'); }}>复制代码</Button>}
        width={700}
      >
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>
          <code>{generatedCode}</code>
        </pre>
      </Modal>
    </div>
  );
}
