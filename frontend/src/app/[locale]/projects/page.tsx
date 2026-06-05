'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Table, Tag, Popconfirm, message, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getProjects, deleteProject, Project, ProjectListParams } from '@/lib/api/project';
import ProjectFormModal from '@/components/project/ProjectFormModal';

const statusColors: Record<string, string> = {
  active: 'green',
  archived: 'orange',
  completed: 'default',
};

export default function ProjectsPage() {
  const t = useTranslations();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [params, setParams] = useState<ProjectListParams>({
    page: 1,
    page_size: 10,
    search: '',
    status: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProjects(params);
      setData(res.data.results);
      setTotal(res.data.count);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: number) => {
    await deleteProject(id);
    message.success(t('common.deleteSuccess'));
    fetchData();
  };

  const columns: ColumnsType<Project> = [
    { title: t('project.name'), dataIndex: 'name', key: 'name', width: 200 },
    {
      title: t('project.status'),
      dataIndex: 'status_display',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={statusColors[record.status] || 'default'}>{record.status_display}</Tag>
      ),
    },
    { title: '创建者', dataIndex: 'creator_name', key: 'creator_name', width: 100 },
    { title: '成员', dataIndex: 'member_count', key: 'member_count', width: 60 },
    {
      title: t('project.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('project.startDate'),
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
      render: (val: string | null) => val || '-',
    },
    {
      title: t('project.endDate'),
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
      render: (val: string | null) => val || '-',
    },
    {
      title: t('common.action'),
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => router.push(`/projects/${record.id}`)}>
            {t('common.detail')}
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditingProject(record);
              setModalOpen(true);
            }}
          >
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>{t('project.projectList')}</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          {t('project.createProject')}
        </Button>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <Input.Search
          placeholder={t('project.placeholderSearch')}
          allowClear
          onSearch={(val) => setParams((p) => ({ ...p, search: val, page: 1 }))}
          style={{ width: 300 }}
        />
        <Select
          allowClear
          placeholder={t('project.status')}
          style={{ width: 150 }}
          onChange={(val) => setParams((p) => ({ ...p, status: val || '', page: 1 }))}
          options={[
            { value: 'active', label: t('project.active') },
            { value: 'archived', label: t('project.archived') },
            { value: 'completed', label: t('project.completed') },
          ]}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: params.page,
          pageSize: params.page_size,
          total,
          showTotal: (count) => t('project.total', { count }),
          onChange: (page, pageSize) => setParams((p) => ({ ...p, page, page_size: pageSize })),
        }}
      />

      <ProjectFormModal
        open={modalOpen}
        project={editingProject}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={fetchData}
      />
    </div>
  );
}
