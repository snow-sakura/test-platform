'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Tag, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  getUiProjects, getUiTestCases, createUiTestCase, updateUiTestCase, deleteUiTestCase,
} from '@/lib/api/ui-automation';
import type { UiProject, UiTestCase } from '@/lib/api/ui-automation';

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'common.high',
  MEDIUM: 'common.medium',
  LOW: 'common.low',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'common.draft',
  ready: 'uiAutomation.testCase.ready',
  active: 'uiAutomation.testCase.active',
  archived: 'uiAutomation.testCase.archived',
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  HIGH: 'red', MEDIUM: 'orange', LOW: 'green',
};

const STATUS_COLOR_MAP: Record<string, string> = {
  draft: 'default', ready: 'blue', active: 'green', archived: 'default',
};

export default function UiTestCasesPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<UiProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [cases, setCases] = useState<UiTestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UiTestCase | null>(null);
  const [form] = Form.useForm();

  const loadCases = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getUiTestCases({ project_id: selectedProjectId, page, page_size: 20 });
      setCases(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  useEffect(() => { setPage(1); }, [selectedProjectId]);

  useEffect(() => { loadCases(); }, [selectedProjectId, page]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiTestCase(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createUiTestCase(values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadCases();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleDelete = (record: UiTestCase) => {
    Modal.confirm({
      title: t('uiAutomation.testCase.deleteConfirm'),
      content: t('uiAutomation.testCase.deleteConfirmItem', { name: record.name }),
      okText: t('common.confirm'), okType: 'danger', cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteUiTestCase(record.id);
          message.success(t('uiAutomation.testCase.deleted'));
          loadCases();
        } catch { message.error(t('common.deleteFailed')); }
      },
    });
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
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ project_id: selectedProjectId, priority: 'MEDIUM', status: 'draft' }); setModalOpen(true); }}
          >{t('uiAutomation.testCase.create')}</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={cases}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (n) => t('common.totalCount', { count: n }) }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: t('uiAutomation.testCase.name'), dataIndex: 'name', width: 250 },
          { title: t('uiAutomation.testCase.priority'), dataIndex: 'priority', width: 90,
            render: (v: string) => <Tag color={PRIORITY_COLOR_MAP[v] || 'default'}>{t(PRIORITY_LABELS[v] || 'common.unknown')}</Tag>,
          },
          { title: t('common.status'), dataIndex: 'status', width: 90,
            render: (v: string) => <Tag color={STATUS_COLOR_MAP[v] || 'default'}>{t(STATUS_LABELS[v] || 'common.unknown')}</Tag>,
          },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 160,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }}
                >{t('common.edit')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('uiAutomation.testCase.edit') : t('uiAutomation.testCase.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label={t('uiAutomation.testCase.name')} rules={[{ required: true, message: t('common.inputPlaceholder') }]}>
            <Input placeholder={t('uiAutomation.testCase.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="priority" label={t('uiAutomation.testCase.priority')}>
            <Select options={[
              { label: t('common.high'), value: 'HIGH' },
              { label: t('common.medium'), value: 'MEDIUM' },
              { label: t('common.low'), value: 'LOW' },
            ]} />
          </Form.Item>
          <Form.Item name="status" label={t('common.status')}>
            <Select options={[
              { label: t('common.draft'), value: 'draft' },
              { label: t('uiAutomation.testCase.ready'), value: 'ready' },
              { label: t('uiAutomation.testCase.active'), value: 'active' },
              { label: t('common.archived'), value: 'archived' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
