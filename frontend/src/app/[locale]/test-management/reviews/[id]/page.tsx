'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button, Card, Descriptions, Tag, Table, message, Spin, Space, Progress, List, Input, Divider,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getReview, getCases, submitReview } from '@/lib/api/test-management';
import type { TestCaseListItem } from '@/lib/api/test-management';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  in_progress: { color: 'processing', label: '进行中' },
  completed: { color: 'success', label: '已完成' },
};

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  HIGH: { color: 'red', label: '高' },
  MEDIUM: { color: 'orange', label: '中' },
  LOW: { color: 'blue', label: '低' },
};

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = Number(params.id);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReview = () => {
    setLoading(true);
    getReview(reviewId).then((res) => setReview(res.data)).catch(() => {
      message.error('加载失败');
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadReview(); }, [reviewId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReview(reviewId, { comment: commentText });
      message.success('评审已提交');
      setCommentText('');
      loadReview();
    } catch { message.error('提交失败'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!review) return null;

  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回评审列表
      </Button>

      <Card title={review.title}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="状态">
            <Tag color={STATUS_MAP[review.status]?.color}>{STATUS_MAP[review.status]?.label || review.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={PRIORITY_MAP[review.priority]?.color}>{PRIORITY_MAP[review.priority]?.label || review.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="截止日期">{review.deadline || '-'}</Descriptions.Item>
          <Descriptions.Item label="用例数">{review.case_count || 0}</Descriptions.Item>
        </Descriptions>

        {review.description && <p style={{ color: '#666', marginTop: 8 }}>{review.description}</p>}

        {/* 评审进度 */}
        {review.progress && (
          <div style={{ margin: '16px 0' }}>
            <strong>评审进度：</strong>
            <Progress
              percent={review.progress.total > 0
                ? Math.round((review.progress.completed / review.progress.total) * 100) : 0}
              size="small"
              format={() => `${review.progress.completed}/${review.progress.total}`}
            />
          </div>
        )}

        {/* 评审分配 */}
        <Divider orientation="left">评审人</Divider>
        <List
          dataSource={review.assignments || []}
          locale={{ emptyText: '暂无评审人' }}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={`评审人 #${item.reviewer_id}`}
                description={item.comment || '尚未提交意见'}
              />
              <Tag color={item.status === 'completed' ? 'success' : 'processing'}>
                {item.status === 'completed' ? '已完成' : '待评审'}
              </Tag>
            </List.Item>
          )}
        />

        {/* 评审用例 */}
        <Divider orientation="left">评审用例</Divider>
        <Table
          rowKey="id" dataSource={review.cases || []} pagination={false} size="small"
          locale={{ emptyText: '暂无用例' }}
          columns={[
            { title: '标题', dataIndex: 'title', ellipsis: true },
            { title: '优先级', dataIndex: 'priority', width: 80,
              render: (v: string) => <Tag color={PRIORITY_MAP[v]?.color}>{PRIORITY_MAP[v]?.label || v}</Tag>,
            },
            { title: '状态', dataIndex: 'status', width: 80,
              render: (v: string) => STATUS_MAP[v]?.label || v,
            },
          ]}
        />

        {/* 提交评审意见（仅当前用户是被分配评审人且未完成时显示） */}
        {review.status !== 'completed' && (
          <>
            <Divider orientation="left">提交评审意见</Divider>
            <Space style={{ width: '100%', alignItems: 'flex-start' }}>
              <Input.TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="请输入评审意见..."
                rows={3}
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<CheckCircleOutlined />}
                loading={submitting} onClick={handleSubmit}
                disabled={!commentText.trim()}
              >
                提交评审
              </Button>
            </Space>
          </>
        )}
      </Card>
    </div>
  );
}
