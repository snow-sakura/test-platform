'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

const PRIORITY_MAP: Record<string, { color: string; label: string }> = {
  HIGH: { color: 'red', label: '高' },
  MEDIUM: { color: 'orange', label: '中' },
  LOW: { color: 'blue', label: '低' },
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_review: { color: 'processing', label: '待评审' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = Number(params.id);
  const [data, setData] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCase = () => {
    setLoading(true);
    getCase(caseId).then((res) => setData(res.data)).catch(() => {
      message.error('加载失败');
      router.back();
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadCase(); }, [caseId]);

  const handleStatusChange = async (status: string) => {
    try {
      await updateCase(caseId, { status });
      message.success('状态已更新');
      loadCase();
    } catch { message.error('更新失败'); }
  };

  const handleDelete = async () => {
    try {
      await deleteCase(caseId);
      message.success('已删除');
      router.back();
    } catch { message.error('删除失败'); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await createCaseComment(caseId, commentText);
      setCommentText('');
      loadCase();
    } catch { message.error('添加评论失败'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteCaseComment(caseId, commentId);
      loadCase();
    } catch { message.error('删除评论失败'); }
  };

  const handleUpload = async (file: File) => {
    try {
      await uploadCaseAttachment(caseId, file);
      message.success('上传成功');
      loadCase();
    } catch { message.error('上传失败'); }
    return false;
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteCaseAttachment(caseId, attachmentId);
      message.success('已删除');
      loadCase();
    } catch { message.error('删除失败'); }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '60px auto' }} />;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 960 }}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ padding: 0, marginBottom: 16 }}>
        返回用例列表
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
                { label: '草稿', value: 'draft' },
                { label: '待评审', value: 'pending_review' },
                { label: '已通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
              ]}
            />
            <Popconfirm title="确定删除此用例？" onConfirm={handleDelete}>
              <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={3} size="small">
          <Descriptions.Item label="优先级">
            <Tag color={PRIORITY_MAP[data.priority]?.color}>{PRIORITY_MAP[data.priority]?.label || data.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={STATUS_MAP[data.status]?.color}>{STATUS_MAP[data.status]?.label || data.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="类型">{data.case_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="前置条件" span={3}>{data.preconditions || '-'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={3}>{data.description || '-'}</Descriptions.Item>
        </Descriptions>

        <Divider orientation="left">测试步骤</Divider>
        {data.steps.length === 0 ? (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>无步骤</div>
        ) : (
          <Table
            rowKey="id"
            dataSource={data.steps}
            pagination={false}
            size="small"
            columns={[
              { title: '#', dataIndex: 'step_number', width: 50 },
              { title: '操作描述', dataIndex: 'action' },
              { title: '预期结果', dataIndex: 'expected_result' },
            ]}
          />
        )}

        <Divider orientation="left">评论</Divider>
        <List
          dataSource={data.comments}
          locale={{ emptyText: '暂无评论' }}
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
            placeholder="添加评论..."
            rows={2}
            style={{ flex: 1 }}
          />
          <Button type="primary" loading={submitting} onClick={handleAddComment}>发表</Button>
        </Space>

        <Divider orientation="left">附件</Divider>
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>上传附件</Button>
        </Upload>
        <List
          dataSource={data.attachments}
          locale={{ emptyText: '无附件' }}
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
