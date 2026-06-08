'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Card, Descriptions, Tag, Table, message, Spin, Space, Input, Select,
  List, Upload, Divider, Popconfirm,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import {
  getCase, updateCase, deleteCase, createCaseComment, deleteCaseComment,
  uploadCaseAttachment, deleteCaseAttachment,
} from '@/lib/api/test-management';
import type { TestCaseDetail } from '@/lib/api/test-management';

export default function CaseDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();

  const PRIORITY_MAP = useMemo(() => ({
    HIGH: { color: 'red', label: t('testManagement.case.high') },
    MEDIUM: { color: 'orange', label: t('testManagement.case.medium') },
    LOW: { color: 'blue', label: t('testManagement.case.low') },
  }), [t]);

  const STATUS_MAP = useMemo(() => ({
    draft: { color: 'default', label: t('testManagement.case.draft') },
    pending_review: { color: 'processing', label: t('testManagement.case.pendingReview') },
    approved: { color: 'success', label: t('testManagement.case.approved') },
    rejected: { color: 'error', label: t('testManagement.case.rejected') },
  }), [t]);
  const caseId = Number(params.id);
  const [data, setData] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCase = () => {
    setLoading(true);
    getCase(caseId).then((res) => setData(res.data)).catch(() => {
      message.error(t('testManagement.case.loadFailed'));
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadCase(); }, [caseId]);

  const handleStatusChange = async (status: string) => {
    try {
      await updateCase(caseId, { status });
      message.success(t('testManagement.case.updateSuccess'));
      loadCase();
    } catch { message.error(t('testManagement.case.updateFailed')); }
  };

  const handleDelete = async () => {
    try {
      await deleteCase(caseId);
      message.success(t('testManagement.case.deleted'));
      router.back();
    } catch { message.error(t('testManagement.case.deleteFailed')); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await createCaseComment(caseId, commentText);
      setCommentText('');
      loadCase();
    } catch { message.error(t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteCaseComment(caseId, commentId);
      loadCase();
    } catch { message.error(t('common.operationFailed')); }
  };

  const handleUpload = async (file: File) => {
    try {
      await uploadCaseAttachment(caseId, file);
      message.success(t('common.uploadSuccess'));
      loadCase();
    } catch { message.error(t('common.uploadFailed')); }
    return false;
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteCaseAttachment(caseId, attachmentId);
      message.success(t('testManagement.case.deleted'));
      loadCase();
    } catch { message.error(t('testManagement.case.deleteFailed')); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 960 }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Card
        title={data.title}
        extra={
          <Space>
            <Select
              value={data.status} size="small"
              style={{ width: 100 }}
              onChange={handleStatusChange}
              options={[
                { label: t('testManagement.case.draft'), value: 'draft' },
                { label: t('testManagement.case.pendingReview'), value: 'pending_review' },
                { label: t('testManagement.case.approved'), value: 'approved' },
                { label: t('testManagement.case.rejected'), value: 'rejected' },
              ]}
            />
            <Popconfirm title={t('testManagement.case.deleteConfirm')} onConfirm={handleDelete}>
              <Button danger size="small" icon={<DeleteOutlined />}>{t('common.delete')}</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={3} size="small">
          <Descriptions.Item label={t('testManagement.case.priority')}>
            <Tag color={PRIORITY_MAP[data.priority as keyof typeof PRIORITY_MAP]?.color}>{PRIORITY_MAP[data.priority as keyof typeof PRIORITY_MAP]?.label || data.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('testManagement.case.status')}>
            <Tag color={STATUS_MAP[data.status as keyof typeof STATUS_MAP]?.color}>{STATUS_MAP[data.status as keyof typeof STATUS_MAP]?.label || data.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('testManagement.case.type')}>{data.case_type || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('testManagement.case.precondition')} span={3}>{data.preconditions || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('testManagement.case.description')} span={3}>{data.description || '-'}</Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">{t('testManagement.case.steps')}</Divider>
        {data.steps.length === 0 ? (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>{t('testManagement.case.noSteps')}</div>
        ) : (
          <Table
            rowKey="id"
            dataSource={data.steps}
            pagination={false}
            size="small"
            columns={[
              { title: '#', dataIndex: 'step_number', width: 50 },
              { title: t('testManagement.case.stepDesc'), dataIndex: 'action' },
              { title: t('testManagement.case.expectedResult'), dataIndex: 'expected_result' },
            ]}
          />
        )}

        <Divider orientation="left">{t('testManagement.case.comments')}</Divider>
        <List
          dataSource={data.comments}
          locale={{ emptyText: t('testManagement.case.noComments') }}
          renderItem={(comment) => (
            <List.Item
              actions={[
                <Button key="del" type="text" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDeleteComment(comment.id)}
                />,
              ]}
            >
              <List.Item.Meta description={new Date(comment.created_at).toLocaleString()} />
              <div>{comment.content}</div>
            </List.Item>
          )}
        />
        <Space style={{ marginTop: 8, width: '100%' }}>
          <Input.TextArea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={t('testManagement.case.postComment') + '...'}
            rows={2}
            style={{ flex: 1 }}
          />
          <Button type="primary" loading={submitting} onClick={handleAddComment}>{t('testManagement.case.postComment')}</Button>
        </Space>

        <Divider orientation="left">{t('testManagement.case.attachments')}</Divider>
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>{t('testManagement.case.uploadAttachment')}</Button>
        </Upload>
        <List
          dataSource={data.attachments}
          locale={{ emptyText: t('testManagement.case.noAttachments') }}
          style={{ marginTop: 8 }}
          renderItem={(att) => (
            <List.Item
              actions={[
                <Button key="del" type="text" danger size="small" icon={<DeleteOutlined />}
                  onClick={() => handleDeleteAttachment(att.id)}
                />,
              ]}
            >
              <List.Item.Meta title={att.filename} description={`${(att.file_size / 1024).toFixed(1)} KB`} />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
