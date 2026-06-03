'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Descriptions, Tag, Popconfirm, message, Spin, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getProject, deleteProject, Project } from '@/lib/api/project';
import ProjectFormModal from '@/components/project/ProjectFormModal';

const statusColors: Record<string, string> = {
  active: 'green',
  archived: 'orange',
  completed: 'default',
};

export default function ProjectDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getProject(id)
      .then((res) => setProject(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    await deleteProject(id);
    message.success(t('common.deleteSuccess'));
    router.push('/projects');
  };

  if (loading) {
    return <Spin style={{ display: 'block', marginTop: 100 }} />;
  }

  if (!project) {
    return <div>{t('common.noData')}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/projects')}>
            {t('common.back')}
          </Button>
          <h2 style={{ margin: 0 }}>{t('project.projectDetail')}</h2>
        </Space>
        <Space>
          <Button onClick={() => setModalOpen(true)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.confirmDelete')} onConfirm={handleDelete}>
            <Button danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Descriptions bordered column={1}>
        <Descriptions.Item label={t('project.name')}>{project.name}</Descriptions.Item>
        <Descriptions.Item label={t('project.status')}>
          <Tag color={statusColors[project.status] || 'default'}>{project.status_display}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('project.description')}>{project.description || '-'}</Descriptions.Item>
        <Descriptions.Item label={t('project.startDate')}>{project.start_date || '-'}</Descriptions.Item>
        <Descriptions.Item label={t('project.endDate')}>{project.end_date || '-'}</Descriptions.Item>
        <Descriptions.Item label={t('project.createdAt')}>{project.created_at}</Descriptions.Item>
        <Descriptions.Item label={t('project.updatedAt')}>{project.updated_at}</Descriptions.Item>
      </Descriptions>

      <ProjectFormModal
        open={modalOpen}
        project={project}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          getProject(id).then((res) => setProject(res.data));
        }}
      />
    </div>
  );
}
