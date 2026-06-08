'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Table, Button, message, Modal, Form, Input, Switch, Select, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getVersions, createVersion, deleteVersion } from '@/lib/api/test-management';
import { getApiProjects } from '@/lib/api/api-testing';
import type { TestVersion } from '@/lib/api/test-management';
import type { ApiProject } from '@/lib/api/api-testing';
import { useEffect } from 'react';

export default function VersionsPage() {
  const t = useTranslations();
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [form] = Form.useForm();

  useEffect(() => {
    getApiProjects({ page_size: 100 }).then((res) => setProjects(res.data.results || [])).catch((e) => console.warn('Failed to load project list', e));
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await getVersions({ project_id: selectedProjectId });
      setVersions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('testManagement.version.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadVersions(); }, [selectedProjectId]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try {
      await createVersion(values);
      message.success(t('testManagement.version.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      loadVersions();
    } catch { message.error(t('testManagement.version.createFailed')); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteVersion(id);
      message.success(t('testManagement.version.deleted'));
      loadVersions();
    } catch { message.error(t('testManagement.version.deleteFailed')); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Select
          placeholder={t('testManagement.version.filterByProject')}
          allowClear
          style={{ width: 250 }}
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          showSearch
          filterOption
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t('testManagement.version.create')}</Button>
      </div>

      <Table
        rowKey="id" loading={loading} dataSource={versions}
        pagination={{ total, pageSize: 20, showTotal: (totalCount) => t('common.totalCount', { count: totalCount }) }} size="small"
        columns={[
          { title: t('testManagement.version.name'), dataIndex: 'name' },
          { title: t('testManagement.version.description'), dataIndex: 'description', ellipsis: true },
          {
            title: t('testManagement.version.baseline'), dataIndex: 'is_baseline', width: 70,
            render: (v: boolean) => v ? <Tag color="blue">{t('testManagement.version.baselineVersion')}</Tag> : '-',
          },
          { title: t('testManagement.version.createdAt'), dataIndex: 'created_at', width: 180 },
          {
            title: t('common.action'), width: 80,
            render: (_, record) => (
              <Button type="link" danger size="small" icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
              >{t('common.delete')}</Button>
            ),
          },
        ]}
      />

      <Modal title={t('testManagement.version.create')} open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('testManagement.version.name')} rules={[{ required: true, message: t('testManagement.version.nameRequired') }]}>
            <Input placeholder={t('testManagement.version.name')} />
          </Form.Item>
          <Form.Item name="description" label={t('testManagement.version.description')}>
            <Input.TextArea rows={2} placeholder={t('testManagement.version.description')} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="is_baseline" label={t('testManagement.version.baselineVersion')} valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="project_ids" label={t('testManagement.version.project')}>
            <Select mode="multiple" placeholder={t('common.selectPlaceholder')}
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
