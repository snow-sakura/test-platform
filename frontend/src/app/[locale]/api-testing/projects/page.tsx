'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { ColumnsType } from 'antd/es/table';
import { getApiProjects, deleteApiProject } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';
import ApiProjectFormModal from '@/components/api-testing/ApiProjectFormModal';

/** API project management page */
export default function ApiProjectsPage() {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiProject | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getApiProjects({ page_size: 100 })
      .then((res) => setProjects(res.data.results))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    try {
      await deleteApiProject(id);
      message.success(t('project.deleted'));
      fetchData();
    } catch {
      message.error(t('project.deleteFailed'));
    }
  };

  const columns: ColumnsType<ApiProject> = [
    { title: tc('name'), dataIndex: 'name', key: 'name' },
    { title: tc('type'), dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => <Tag>{v || 'HTTP'}</Tag>,
    },
    { title: t('project.interfaceCount'), dataIndex: 'request_count', key: 'request_count', width: 80 },
    { title: t('project.collectionCount'), dataIndex: 'collection_count', key: 'collection_count', width: 80 },
    { title: tc('status'), dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => (
        <Tag color={v === 'active' ? 'success' : 'default'}>{v === 'active' ? t('project.active') : t('project.archived')}</Tag>
      ),
    },
    { title: tc('createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: tc('action'), key: 'actions', width: 120,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditRecord(record); setModalOpen(true); }}>
            {tc('edit')}
          </Button>
          <Popconfirm title={t('project.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small">{tc('delete')}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); setModalOpen(true); }}>
          {t('project.create')}
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={projects}
        loading={loading}
        pagination={false}
      />

      <ApiProjectFormModal
        open={modalOpen}
        editRecord={editRecord}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
