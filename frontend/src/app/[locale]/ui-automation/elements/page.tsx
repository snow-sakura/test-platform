'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
    } catch { message.error(t('uiAutomation.element.loadGroupsFailed')); }
  };

  const loadElements = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiElements({ project_id: selectedProjectId, group_id: selectedGroupId });
      setElements(res.data.results || []);
    } catch { message.error(t('uiAutomation.element.loadElementsFailed')); }
    finally { setLoading(false); }
  };

  const loadPageObjects = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await getUiPageObjects({ project_id: selectedProjectId, page_size: 100 });
      setPageObjects(res.data.results || []);
    } catch { message.error(t('uiAutomation.element.loadPageObjectsFailed')); }
  };

  useEffect(() => { loadGroups(); loadElements(); loadPageObjects(); }, [selectedProjectId, selectedGroupId]);

  // Build group tree
  const buildTreeData = (parentId = 0): DataNode[] => {
    return groups.filter((g) => g.parent_id === parentId).map((g) => ({
      key: `group-${g.id}`,
      title: `${g.name} (${g.element_count})`,
      children: buildTreeData(g.id),
    }));
  };

  const treeData: DataNode[] = [
    { key: 'all', title: `${t('uiAutomation.element.allElements')} (${elements.length})` },
    ...buildTreeData(),
  ];

  // Element operations
  const handleCreateGroup = async () => {
    const values = await form.validateFields();
    try {
      await createUiElementGroup({ project_id: selectedProjectId!, ...values });
      message.success(t('uiAutomation.element.groupCreated'));
      setGroupModalOpen(false);
      form.resetFields();
      loadGroups();
    } catch { message.error(t('uiAutomation.element.createFailed')); }
  };

  const handleElementSubmit = async () => {
    const values = await form.validateFields();
    try {
      const data = { ...values, project_id: selectedProjectId };
      if (editingElement) {
        await updateUiElement(editingElement.id, data);
        message.success(t('uiAutomation.element.updateSuccess'));
      } else {
        await createUiElement(data);
        message.success(t('uiAutomation.element.updateSuccess'));
      }
      setElementModalOpen(false);
      setEditingElement(null);
      form.resetFields();
      loadElements();
    } catch { message.error(t('uiAutomation.element.operationFailed')); }
  };

  const handleCreatePO = async () => {
    const values = await form.validateFields();
    try {
      await createUiPageObject({ project_id: selectedProjectId!, ...values });
      message.success(t('common.createSuccess'));
      setPoModalOpen(false);
      form.resetFields();
      loadPageObjects();
    } catch { message.error(t('common.createFailed')); }
  };

  const handleGenerateCode = async (id: number) => {
    try {
      const res = await generateUiPageObjectCode(id);
      setGeneratedCode(res.data.code);
      setCodeModalOpen(true);
    } catch { message.error(t('uiAutomation.element.operationFailed')); }
  };

  const handleValidate = async (id: number) => {
    try {
      const res = await validateUiElement(id);
      if (res.data.found) {
        message.success(t('uiAutomation.element.locatorVerified'));
      } else {
        message.warning(`${t('uiAutomation.element.locatorFailed')}: ${res.data.error || t('common.unknown')}`);
      }
    } catch { message.error(t('uiAutomation.element.verifyFailed')); }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card
            size="small" title={t('uiAutomation.element.title')}
            extra={<Button size="small" icon={<FolderAddOutlined />} onClick={() => { form.resetFields(); setGroupModalOpen(true); }} />}
          >
            <Select
              placeholder={t('common.selectProject')} allowClear style={{ width: '100%', marginBottom: 8 }}
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
                key: 'elements', label: t('uiAutomation.element.title'),
                children: (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" icon={<PlusOutlined />}
                        disabled={!selectedProjectId}
                        onClick={() => { setEditingElement(null); form.resetFields(); setElementModalOpen(true); }}
                      >{t('uiAutomation.element.createElement')}</Button>
                    </div>
                    <Table rowKey="id" loading={loading} dataSource={elements} size="small"
                      pagination={false}
                      columns={[
                        { title: t('uiAutomation.element.name'), dataIndex: 'name', width: 150 },
                        { title: t('uiAutomation.element.strategy'), dataIndex: 'locator_type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                        { title: t('uiAutomation.element.locatorValue'), dataIndex: 'locator_value', ellipsis: true },
                        { title: t('uiAutomation.element.pageUrl'), dataIndex: 'page_url', ellipsis: true },
                        {
                          title: t('common.action'), width: 180,
                          render: (_, record) => (
                            <Space>
                              <Button type="link" size="small" icon={<EditOutlined />}
                                onClick={() => { setEditingElement(record); form.setFieldsValue(record); setElementModalOpen(true); }}
                              >{t('uiAutomation.element.edit')}</Button>
                              <Button type="link" size="small" onClick={() => handleValidate(record.id)}>{t('uiAutomation.element.verify')}</Button>
                              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                                onClick={async () => { try { await deleteUiElement(record.id); message.success(t('uiAutomation.element.deleted')); loadElements(); } catch { message.error(t('uiAutomation.element.deleteFailed')); } }}
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
                key: 'page-objects', label: t('uiAutomation.element.pageObjects'),
                children: (
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Button type="primary" icon={<PlusOutlined />}
                        disabled={!selectedProjectId}
                        onClick={() => { form.resetFields(); setPoModalOpen(true); }}
                      >{t('uiAutomation.element.pageObjects')}</Button>
                    </div>
                    <Table rowKey="id" dataSource={pageObjects} size="small" pagination={false}
                      columns={[
                        { title: t('uiAutomation.element.name'), dataIndex: 'name', width: 150 },
                        { title: 'URL', dataIndex: 'url', ellipsis: true },
                        { title: t('uiAutomation.element.pageUrl'), dataIndex: 'element_count', width: 100 },
                        {
                          title: t('common.action'), width: 160,
                          render: (_, record) => (
                            <Space>
                              <Button type="link" size="small" onClick={() => handleGenerateCode(record.id)}>{t('uiAutomation.element.generateCode')}</Button>
                              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                                onClick={async () => { try { await deleteUiPageObject(record.id); message.success(t('uiAutomation.element.deleted')); loadPageObjects(); } catch { message.error(t('uiAutomation.element.deleteFailed')); } }}
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

      {/* Create group modal */}
      <Modal title={t('uiAutomation.element.createGroup')} open={groupModalOpen} onOk={handleCreateGroup} onCancel={() => setGroupModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('uiAutomation.element.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.element.name')} />
          </Form.Item>
          <Form.Item name="parent_id" label={t('common.name')}>
            <Select allowClear placeholder={t('common.selectPlaceholder')}
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create/Edit element modal */}
      <Modal title={editingElement ? t('uiAutomation.element.edit') : t('uiAutomation.element.createElement')} open={elementModalOpen}
        onOk={handleElementSubmit} onCancel={() => { setElementModalOpen(false); setEditingElement(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('uiAutomation.element.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.element.name')} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="locator_type" label={t('uiAutomation.element.strategy')} rules={[{ required: true }]} initialValue="css">
                <Select options={[
                  { label: t('uiAutomation.element.cssSelector'), value: 'css' },
                  { label: 'XPath', value: 'xpath' },
                  { label: 'ID', value: 'id' },
                  { label: 'Name', value: 'name' },
                  { label: 'Class Name', value: 'class' },
                  { label: t('uiAutomation.element.text'), value: 'text' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="locator_value" label={t('uiAutomation.element.locatorValue')} rules={[{ required: true }]}>
                <Input placeholder={t('uiAutomation.element.locatorPlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="page_url" label={t('uiAutomation.element.pageUrl')}>
            <Input placeholder="https://example.com/login" />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="group_id" label={t('uiAutomation.element.name')}>
            <Select allowClear placeholder={t('common.selectPlaceholder')}
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create page object modal */}
      <Modal title={t('uiAutomation.element.pageObjects')} open={poModalOpen} onOk={handleCreatePO} onCancel={() => setPoModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('uiAutomation.element.name')} rules={[{ required: true }]}>
            <Input placeholder={t('uiAutomation.element.name')} />
          </Form.Item>
          <Form.Item name="url" label={t('uiAutomation.element.pageUrl')}>
            <Input placeholder="https://example.com/login" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Generate code modal */}
      <Modal title={t('uiAutomation.element.pageObjectCode')} open={codeModalOpen} onCancel={() => setCodeModalOpen(false)}
        footer={<Button onClick={() => { navigator.clipboard.writeText(generatedCode); message.success(t('uiAutomation.element.codeCopied')); }}>{t('uiAutomation.element.copyCode')}</Button>}
        width={700}
      >
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto', maxHeight: 400 }}>
          <code>{generatedCode}</code>
        </pre>
      </Modal>
    </div>
  );
}
