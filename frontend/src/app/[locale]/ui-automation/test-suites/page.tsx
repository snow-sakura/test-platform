'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUiProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn('load projects failed', e));
  }, []);

  useEffect(() => { setPage(1); }, [selectedProjectId]);

  useEffect(() => { loadSuites(); }, [selectedProjectId, page]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateUiTestSuite(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createUiTestSuite(values);
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadSuites();
    } catch { message.error(t('common.operationFailed')); }
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
    } catch { message.error(t('common.loadFailed')); }
  };

  const handleDelete = (record: UiTestSuite) => {
    Modal.confirm({
      title: t('common.confirmDelete'),
      content: t('uiAutomation.testCase.deleteConfirmItem', { name: record.name }),
      okText: t('common.confirmDelete'), okType: 'danger', cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteUiTestSuite(record.id);
          message.success(t('common.deleted'));
          loadSuites();
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
            onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ project_id: selectedProjectId }); setModalOpen(true); }}
          >{t('testManagement.suite.create')}</Button>
        </Col>
      </Row>

      <Table
        rowKey="id" loading={loading} dataSource={suites}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (n) => t('common.totalCount', { count: n }) }}
        size="small"
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: t('testManagement.suite.name'), dataIndex: 'name', width: 250 },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('testManagement.suite.caseCount'), dataIndex: 'case_count', width: 80 },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 240,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record.id)}
                >{t('common.view')}</Button>
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

      {/* New / Edit suite modal */}
      <Modal title={editing ? t('testManagement.suite.edit') : t('testManagement.suite.create')} open={modalOpen}
        onOk={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }}
      >
        <Form form={form} layout="vertical" initialValues={{ project_id: selectedProjectId }}>
          <Form.Item name="project_id" hidden><Input /></Form.Item>
          <Form.Item name="name" label={t('testManagement.suite.name')} rules={[{ required: true, message: t('testManagement.suite.nameRequired') }]}>
            <Input placeholder={t('uiAutomation.testCase.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder={t('common.description')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Suite detail modal */}
      <Modal title={`${t('testManagement.suite.detail')} - ${detailData?.suite?.name || ''}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        {detailData && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('testManagement.suite.name')}>{detailData.suite.name}</Descriptions.Item>
              <Descriptions.Item label={t('testManagement.suite.caseCount')}>{detailData.suite.case_count}</Descriptions.Item>
              <Descriptions.Item label={t('common.description')} span={2}>{detailData.suite.description || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.createdAt')} span={2}>{detailData.suite.created_at}</Descriptions.Item>
            </Descriptions>
            <Table
              dataSource={detailData.cases || []} rowKey="id" size="small" pagination={false}
              columns={[
                { title: 'ID', dataIndex: 'id', width: 60 },
                { title: t('uiAutomation.testCase.name'), dataIndex: 'name', width: 200 },
                { title: t('common.priority'), dataIndex: 'priority', width: 80 },
                { title: t('common.status'), dataIndex: 'status', width: 80 },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
