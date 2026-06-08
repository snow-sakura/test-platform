'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Descriptions, Tag, Popconfirm, message, Spin, Space, Tabs, Typography, Badge, Table,
} from 'antd';
import { ArrowLeftOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import { getProject, deleteProject, getProjectMembers, removeProjectMember } from '@/lib/api/project';
import type { Project, ProjectMember } from '@/lib/api/project';
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
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const handleDocumentsChange = useCallback((ids: number[]) => {
    setDocumentIds(ids);
  }, []);

  const handleSelectionChange = useCallback((ids: number[]) => {
    setSelectedTestPointIds(ids);
  }, []);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const res = await getProjectMembers(id);
      setMembers(res.data || []);
    } catch { message.error(t('project.loadMembersFailed')); }
    finally { setMembersLoading(false); }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await removeProjectMember(id, userId);
      message.success(t('project.memberRemoved'));
      loadMembers();
    } catch { message.error(t('project.removeFailed')); }
  };

  const roleLabels: Record<string, string> = {
    admin: t('project.admin'),
    member: t('project.member'),
    viewer: t('project.observer'),
  };

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
            <Descriptions.Item label={t('project.creator')}>{project.creator_name || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('project.members')}>{project.member_count}</Descriptions.Item>
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
      label: t('project.testPoints'),
      children: <TestPoints projectId={id} documentIds={documentIds} onSelectionChange={handleSelectionChange} />,
    },
    {
      key: 'test_cases',
      label: t('project.testCases'),
      children: <TestCases projectId={id} selectedTestPointIds={selectedTestPointIds} />,
    },
    {
      key: 'knowledge_base',
      label: t('project.knowledgeBase'),
      children: <KBTab />,
    },
    {
      key: 'members',
      label: <span><TeamOutlined /> {t('project.member')}</span>,
      children: (
        <Table rowKey="id" loading={membersLoading} dataSource={members} size="small" pagination={false}
          columns={[
            { title: t('auth.username'), dataIndex: 'username', width: 160 },
            {
              title: t('project.memberRole'), dataIndex: 'role_display', width: 100,
              render: (v: string, r: ProjectMember) => <Tag color={r.role === 'admin' ? 'gold' : r.role === 'member' ? 'blue' : 'default'}>{v}</Tag>,
            },
            { title: t('project.joinTime'), dataIndex: 'created_at', width: 170 },
            {
              title: t('common.action'), width: 100,
              render: (_: unknown, r: ProjectMember) => (
                r.role !== 'admin' ? (
                  <Popconfirm title={t('project.confirmRemove')} onConfirm={() => handleRemoveMember(r.user_id)}>
                    <Button size="small" danger>{t('project.remove')}</Button>
                  </Popconfirm>
                ) : null
              ),
            },
          ]}
        />
      ),
    },
    {
      key: 'batches',
      label: <Badge status="processing" text={t('project.taskTracking')} />,
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

      <Tabs items={tabItems} onChange={(key) => { if (key === 'members') loadMembers(); }} />

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
