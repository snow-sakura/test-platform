'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppPackages, createAppPackage, updateAppPackage, deleteAppPackage,
} from '@/lib/api/app-automation';
import type { AppProject, AppPackage } from '@/lib/api/app-automation';

export default function PackagesPage() {
  const t = useTranslations();
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [packages, setPackages] = useState<AppPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppPackage | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    getAppProjects({ page_size: 200 }).then((r) => {
      const list = r.data.results || [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    }).catch(() => message.error(t('common.loadFailed')));
  }, []);

  useEffect(() => {
    if (!selectedProject) { setPackages([]); return; }
    setLoading(true);
    getAppPackages(selectedProject).then((r) => setPackages(r.data || []))
      .catch(() => message.error(t('common.loadFailed')))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateAppPackage(editing.id, values);
        message.success(t('common.updateSuccess'));
      } else {
        await createAppPackage({ ...values, project_id: selectedProject });
        message.success(t('common.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      if (selectedProject) {
        const res = await getAppPackages(selectedProject);
        setPackages(res.data || []);
      }
    } catch {
      message.error(t('common.operationFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAppPackage(id);
      message.success(t('common.deleted'));
      if (selectedProject) {
        const res = await getAppPackages(selectedProject);
        setPackages(res.data || []);
      }
    } catch {
      message.error(t('common.deleteFailed'));
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (pkg: AppPackage) => {
    setEditing(pkg);
    form.setFieldsValue(pkg);
    setModalOpen(true);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={selectedProject}
          onChange={setSelectedProject}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          style={{ width: 240 }}
          placeholder={t('common.selectProject')}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedProject}>
          {t('appAutomation.packages.addPackage')}
        </Button>
      </Space>

      <Table rowKey="id" loading={loading} dataSource={packages} size="small"
        columns={[
          { title: t('appAutomation.packages.packageName'), dataIndex: 'package_name', width: 200 },
          { title: t('appAutomation.packages.appName'), dataIndex: 'app_name', width: 160 },
          { title: t('appAutomation.packages.mainActivity'), dataIndex: 'main_activity', width: 200, ellipsis: true },
          { title: t('appAutomation.packages.version'), dataIndex: 'version', width: 100 },
          { title: t('common.description'), dataIndex: 'description', ellipsis: true },
          {
            title: t('common.action'), width: 120, fixed: 'right' as const,
            render: (_: unknown, record: AppPackage) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>{t('common.edit')}</Button>
                <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>{t('common.delete')}</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('appAutomation.packages.editPackage') : t('appAutomation.packages.addPackage')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="package_name" label={t('appAutomation.packages.packageName')} rules={[{ required: true, message: t('appAutomation.packages.packageNameRequired') }]}>
            <Input placeholder="com.example.app" />
          </Form.Item>
          <Form.Item name="app_name" label={t('appAutomation.packages.appName')} rules={[{ required: true, message: t('appAutomation.packages.appNameRequired') }]}>
            <Input placeholder={t('appAutomation.packages.appName')} />
          </Form.Item>
          <Form.Item name="main_activity" label={t('appAutomation.packages.mainActivity')}>
            <Input placeholder=".MainActivity" />
          </Form.Item>
          <Form.Item name="version" label={t('appAutomation.packages.version')}>
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder={t('common.description')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
