'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, Button, Space, message, Modal, Form, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createSuite, deleteSuite, getSuites } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestSuite } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuitesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : 'zh-cn';
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  const loadSuites = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getSuites(projectId);
      setSuites(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('testManagement.suite.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSuites(); }, [projectId]);

  const handleCreate = async () => {
    if (!projectId) return;
    const values = await form.validateFields();
    try {
      await createSuite(projectId, values);
      message.success(t('testManagement.suite.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      loadSuites();
    } catch { message.error(t('testManagement.suite.createFailed')); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSuite(id);
      message.success(t('testManagement.suite.deleted'));
      loadSuites();
    } catch { message.error(t('testManagement.suite.deleteFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          placeholder={t('testManagement.suite.selectProject')}
          style={{ width: 300 }}
          value={projectId}
          onChange={setProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch
          filterOption
        />
        <Button type="primary" icon={<PlusOutlined />} disabled={!projectId} onClick={() => setModalOpen(true)}>
          {t('testManagement.suite.create')}
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={suites}
        pagination={{ total, pageSize: 20, showTotal: (totalCount) => t('common.totalCount', { count: totalCount }) }}
        size="small"
        columns={[
          { title: t('testManagement.suite.name'), dataIndex: 'name' },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          { title: t('testManagement.suite.caseCount'), dataIndex: 'case_count', width: 80 },
          {
            title: t('common.action'), width: 120,
            render: (_, record) => (
              <Space>
                <Button type="link" size="small"
                  onClick={() => router.push(`/${locale}/test-management/suites/${record.id}`)}
                >{t('testManagement.suite.detail')}</Button>
                <Button type="link" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                >{t('testManagement.suite.delete')}</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal title={t('testManagement.suite.create')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('testManagement.suite.name')} rules={[{ required: true }]}>
            <Input placeholder={t('testManagement.suite.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('testManagement.suite.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
