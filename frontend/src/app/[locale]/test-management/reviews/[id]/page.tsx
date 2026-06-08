'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button, Card, Descriptions, Tag, Table, message, Spin, Space, Progress, List, Input, Divider,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getReview, getCases, submitReview } from '@/lib/api/test-management';
import type { TestCaseListItem } from '@/lib/api/test-management';

export default function ReviewDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();

  const STATUS_MAP = useMemo(() => ({
    draft: { color: 'default', label: t('testManagement.case.draft') },
    in_progress: { color: 'processing', label: t('common.running') },
    completed: { color: 'success', label: t('common.completed') },
  }), [t]);

  const PRIORITY_MAP = useMemo(() => ({
    HIGH: { color: 'red', label: t('testManagement.case.high') },
    MEDIUM: { color: 'orange', label: t('testManagement.case.medium') },
    LOW: { color: 'blue', label: t('testManagement.case.low') },
  }), [t]);
  const reviewId = Number(params.id);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReview = () => {
    setLoading(true);
    getReview(reviewId).then((res) => setReview(res.data)).catch(() => {
      message.error(t('common.loadFailed'));
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadReview(); }, [reviewId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReview(reviewId, { comment: commentText });
      message.success(t('common.success'));
      setCommentText('');
      loadReview();
    } catch { message.error(t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!review) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Card title={review.title}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label={t('testManagement.case.status')}>
            <Tag color={STATUS_MAP[review.status as keyof typeof STATUS_MAP]?.color}>{STATUS_MAP[review.status as keyof typeof STATUS_MAP]?.label || review.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('testManagement.case.priority')}>
            <Tag color={PRIORITY_MAP[review.priority as keyof typeof PRIORITY_MAP]?.color}>{PRIORITY_MAP[review.priority as keyof typeof PRIORITY_MAP]?.label || review.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('common.updatedAt')}>{review.deadline || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('testManagement.caseCount')}>{review.case_count || 0}</Descriptions.Item>
        </Descriptions>

        {review.description && <p style={{ color: '#666', marginTop: 8 }}>{review.description}</p>}

        {/* Review progress */}
        {review.progress && (
          <div style={{ margin: '16px 0' }}>
            <strong>{t('common.progress')}：</strong>
            <Progress
              percent={review.progress.total > 0
                ? Math.round((review.progress.completed / review.progress.total) * 100) : 0}
              size="small"
              format={() => `${review.progress.completed}/${review.progress.total}`}
            />
          </div>
        )}

        {/* Review assignments */}
        <Divider orientation="left">{t('testManagement.review.title')}</Divider>
        <List
          dataSource={review.assignments || []}
          locale={{ emptyText: t('common.noData') }}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={`Reviewer #${item.reviewer_id}`}
                description={item.comment || t('testManagement.review.noComment')}
              />
              <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                {item.status === 'completed' ? t('common.completed') : t('testManagement.case.pendingReview')}
              </Tag>
            </List.Item>
          )}
        />

        {/* Review cases */}
        <Divider orientation="left">{t('testManagement.cases')}</Divider>
        <Table
          rowKey="id" dataSource={review.cases || []} pagination={false} size="small"
          locale={{ emptyText: t('common.noData') }}
          columns={[
            { title: t('testManagement.case.titleLabel'), dataIndex: 'title', ellipsis: true },
            { title: t('testManagement.case.priority'), dataIndex: 'priority', width: 80,
              render: (v: string) => <Tag color={PRIORITY_MAP[v as keyof typeof PRIORITY_MAP]?.color}>{PRIORITY_MAP[v as keyof typeof PRIORITY_MAP]?.label || v}</Tag>,
            },
            { title: t('testManagement.case.status'), dataIndex: 'status', width: 80,
              render: (v: string) => STATUS_MAP[v as keyof typeof STATUS_MAP]?.label || v,
            },
          ]}
        />

        {/* Submit review (only visible when current user is assigned reviewer and not completed) */}
        {review.status !== 'completed' && (
          <>
            <Divider orientation="left">{t('testManagement.review.edit')}</Divider>
            <Space style={{ width: '100%', alignItems: 'flex-start' }}>
              <Input.TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('common.inputPlaceholder')}
                rows={3}
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<CheckCircleOutlined />}
                loading={submitting} onClick={handleSubmit}
                disabled={!commentText.trim()}
              >
                {t('common.submit')}
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
}
