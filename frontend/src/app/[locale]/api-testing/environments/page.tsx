'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tabs, Tag, Space, message, Popconfirm, Modal, Form, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { ColumnsType } from 'antd/es/table';
import {
  getEnvironments, createEnvironment, updateEnvironment,
  deleteEnvironment, activateEnvironment,
} from '@/lib/api/api-testing';
import type { ApiEnvironment } from '@/lib/api/api-testing';
import KeyValueEditor from '@/components/api-testing/KeyValueEditor';

/** Environment management page */
export default function EnvironmentsPage() {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [envs, setEnvs] = useState<ApiEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiEnvironment | null>(null);
  const [form] = Form.useForm();

  const envType = activeTab === 'global' ? 'global' : 'local';

  const fetchData = useCallback(() => {
    setLoading(true);
    getEnvironments({ env_type: envType })
      .then((res) => setEnvs(res.data))
      .finally(() => setLoading(false));
  }, [envType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateEnvironment(editRecord.id, values);
      } else {
        await createEnvironment({ ...values, env_type: envType });
      }
      message.success(t('environment.saveSuccess'));
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateEnvironment(id);
      message.success(t('environment.active'));
      fetchData();
    } catch {
      message.error(t('environment.activateFailed'));
    }
  };

  const columns: ColumnsType<ApiEnvironment> = [
    { title: tc('name'), dataIndex: 'name', key: 'name' },
    {
      title: t('environment.variableCount'), key: 'var_count',
      render: (_, r) => Object.keys(r.variables || {}).length,
    },
    {
      title: tc('status'), dataIndex: 'is_active', key: 'is_active', width: 100,
      render: (v: boolean) => v ? <Tag icon={<CheckCircleOutlined />} color="success">{t('environment.active')}</Tag> : <Tag>{t('environment.inactive')}</Tag>,
    },
    { title: tc('createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: tc('action'), key: 'actions', width: 200,
      render: (_, record) => (
        <Space>
          {!record.is_active && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleActivate(record.id)}>
              {t('environment.activate')}
            </Button>
          )}
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>{tc('edit')}</Button>
          <Popconfirm title={t('environment.deleteConfirm')} onConfirm={async () => {
            await deleteEnvironment(record.id);
            message.success(t('environment.deleted'));
            fetchData();
          }}>
            <Button type="link" danger size="small">{tc('delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'global', label: t('environment.global') },
          { key: 'local', label: t('environment.project') },
        ]}
        tabBarExtraContent={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditRecord(null);
            form.resetFields();
            setModalOpen(true);
          }}>
            {t('environment.create')}
          </Button>
        }
      />

      <Table rowKey="id" columns={columns} dataSource={envs} loading={loading} pagination={false} />

      <Modal
        title={editRecord ? t('environment.editEnv') : t('environment.create')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('environment.name')} rules={[{ required: true }]}>
            <Input placeholder={tc('inputPlaceholder')} />
          </Form.Item>
          <Form.Item name="variables" label={t('environment.variables')} initialValue={[]}>
            <KeyValueEditor
              keyPlaceholder={t('environment.varName')}
              valuePlaceholder={t('environment.varValue')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
