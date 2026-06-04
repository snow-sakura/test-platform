'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Descriptions, Tag, Popconfirm, message, Spin, Space, Tabs, Typography, Badge,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getProject, deleteProject } from '@/lib/api/project';
import type { Project } from '@/lib/api/project';
import ProjectFormModal from '@/components/project/ProjectFormModal';
import Documents from '@/components/project/Documents';
import TestPoints from '@/components/project/TestPoints';
import TestCases from '@/components/project/TestCases';
import BatchTracker from '@/components/project/BatchTracker';
import KBTab from '@/components/project/KBTab';

const { Title } = Typography;

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
  const [selectedTestPointIds, setSelectedTestPointIds] = useState<number[]>([]);
  const [documentIds, setDocumentIds] = useState<number[]>([]);

  const handleDocumentsChange = useCallback((ids: number[]) => {
    setDocumentIds(ids);
  }, []);

  const handleSelectionChange = useCallback((ids: number[]) => {
    setSelectedTestPointIds(ids);
  }, []);

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

  const tabItems = [
    {
      key: 'basic',
      label: t('common.basicInfo'),
      children: (
        <div>
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
        </div>
      ),
    },
    {
      key: 'documents',
      label: t('project.documents'),
      children: <Documents projectId={id} onDocumentsChange={handleDocumentsChange} />,
    },
    {
      key: 'test_points',
      label: '测试点',
      children: <TestPoints projectId={id} documentIds={documentIds} onSelectionChange={handleSelectionChange} />,
    },
    {
      key: 'test_cases',
      label: '测试用例',
      children: <TestCases projectId={id} selectedTestPointIds={selectedTestPointIds} />,
    },
    {
      key: 'knowledge_base',
      label: '知识库',
      children: <KBTab />,
    },
    {
      key: 'batches',
      label: <Badge status="processing" text="任务追踪" />,
      children: <BatchTracker projectId={id} />,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/projects')}>
            {t('common.back')}
          </Button>
          <Title level={4} style={{ margin: 0 }}>{project.name}</Title>
        </Space>
        <Space>
          <Button onClick={() => setModalOpen(true)}>{t('common.edit')}</Button>
          <Popconfirm title={t('common.confirmDelete')} onConfirm={handleDelete}>
            <Button danger>{t('common.delete')}</Button>
          </Popconfirm>
        </Space>
      </div>

      <Tabs items={tabItems} />

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
