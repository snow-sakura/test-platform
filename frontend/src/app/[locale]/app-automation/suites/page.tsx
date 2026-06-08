'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Table, Button, message, Modal, Form, Input, Select, Space, Tag, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppTestSuites, getAppTestSuite,
  createAppTestSuite, deleteAppTestSuite, executeAppTestSuite,
} from '@/lib/api/app-automation';
import type { AppProject, AppTestSuite, AppTestCase } from '@/lib/api/app-automation';

export default function AppSuitesPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>();
  const [suites, setSuites] = useState<AppTestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentSuite, setCurrentSuite] = useState<(AppTestSuite & { cases: AppTestCase[] }) | null>(null);
  const [form] = Form.useForm();

  const loadSuites = async (page = 1) => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await getAppTestSuites({ project_id: selectedProjectId, page, page_size: 20 });
      setSuites(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getAppProjects({ page_size: 100 }).then((r) => setProjects(r.data.results || [])).catch((e) => console.warn(t('common.loadFailed'), e));
  }, []);

  useEffect(() => { loadSuites(); }, [selectedProjectId]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createAppTestSuite({ ...values, project_id: selectedProjectId });
      message.success(t('common.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      loadSuites();
    } catch { message.error(t('common.createFailed')); }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppTestSuite(id);
      setCurrentSuite(res.data);
      setDetailOpen(true);
    } catch { message.error(t('common.loadFailed')); }
  };

  const handleExecute = async (id: number) => {
    try {
      await executeAppTestSuite(id);
      message.success(t('appAutomation.suite.executionTriggered'));
    } catch { message.error(t('common.operationFailed')); }
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
            onClick={() => { form.resetFields(); setModalOpen(true); }}
          >{t('common.create')}</Button>
        </Col>
      </Row>

      <Table rowKey="id" loading={loading} dataSource={suites} size="small"
        pagination={{ total, pageSize: 20, showTotal: (n) => t('common.totalCount', { count: n }) }}
        columns={[
          { title: t('appAutomation.suite.name'), dataIndex: 'name', width: 200 },
          { title: t('appAutomation.suite.caseCount'), dataIndex: 'case_count', width: 80 },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('common.createdAt'), dataIndex: 'created_at', width: 170 },
          {
            title: t('common.action'), width: 220,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" onClick={() => viewDetail(record.id)}>{t('common.detail')}</Button>
                <Button type="link" size="small" icon={<PlayCircleOutlined />}
                  onClick={() => handleExecute(record.id)}
                >{t('common.execute')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={async () => { try { await deleteAppTestSuite(record.id); message.success(t('appAutomation.suite.deleted')); loadSuites(); } catch { message.error(t('common.deleteFailed')); } }}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={t('common.create')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder={t('common.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`${t('common.detail')} - ${currentSuite?.name}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={700}
      >
        <Table dataSource={currentSuite?.cases || []} rowKey="id" size="small" pagination={false}
          columns={[
            { title: t('appAutomation.suite.caseName'), dataIndex: 'name', width: 200 },
            { title: t('common.priority'), dataIndex: 'priority', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          ]}
        />
      </Modal>
    </div>
  );
}
