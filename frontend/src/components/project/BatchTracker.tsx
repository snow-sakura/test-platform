'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table, Tag, Progress, Button, Modal, notification, Space,
} from 'antd';
import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getProjectBatches, cancelBatch } from '@/lib/api/batch';
import type { TaskBatch } from '@/lib/api/batch';

const statusColors: Record<string, string> = {
  PENDING: 'default',
  RUNNING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};

const taskTypeLabels: Record<string, string> = {
  extract_test_points: '提取测试点',
  generate_test_cases: '生成测试用例',
};

interface Props {
  projectId: number;
}

export default function BatchTracker({ projectId }: Props) {
  const t = useTranslations();
  const [batches, setBatches] = useState<TaskBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<TaskBatch | null>(null);
  const prevStates = useRef<Record<number, string>>({});

  const fetchData = () => {
    setLoading(true);
    loadBatches().finally(() => setLoading(false));
  };

  const loadBatches = async () => {
    try {
      const res = await getProjectBatches(projectId);
      const data = res.data?.results ?? [];
      setBatches(data);

      // 检测状态变化并通知
      data.forEach((batch) => {
        const prevStatus = prevStates.current[batch.id];
        if (prevStatus && prevStatus !== batch.status) {
          if (batch.status === 'COMPLETED') {
            notification.success({
              message: '任务完成',
              description: `${taskTypeLabels[batch.task_type] || batch.task_type} 已完成`,
            });
          } else if (batch.status === 'FAILED') {
            notification.error({
              message: '任务失败',
              description: batch.error_message || `${taskTypeLabels[batch.task_type] || batch.task_type} 执行失败`,
            });
          }
        }
        prevStates.current[batch.id] = batch.status;
      });
      return data;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadBatches();
    // 每 3 秒轮询（仅在存在 PENDING/RUNNING 批次时）
    const interval = setInterval(async () => {
      const data = await loadBatches();
      const hasActive = data.some((b: TaskBatch) => b.status === 'PENDING' || b.status === 'RUNNING');
      if (!hasActive) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId]);

  const handleCancel = async (batch: TaskBatch) => {
    try {
      await cancelBatch(batch.id);
      notification.success({ message: '任务已取消' });
      fetchData();
    } catch {
      // 错误已由拦截器处理
    }
  };

  const handleViewDetail = (record: TaskBatch) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const columns: ColumnsType<TaskBatch> = [
    {
      title: '任务类型',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 150,
      render: (type: string) => (
        <Tag>{taskTypeLabels[type] || type}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 200,
      render: (_, record) => (
        <Progress
          percent={record.progress}
          size="small"
          status={record.status === 'FAILED' ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: '完成数',
      key: 'count',
      width: 120,
      render: (_, record) => `${record.completed_count} / ${record.total_count}`,
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (v: string | null) => v || '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('common.action'),
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            {t('common.detail')}
          </Button>
          {(record.status === 'PENDING' || record.status === 'RUNNING') && (
            <Button type="link" danger size="small" icon={<StopOutlined />} onClick={() => handleCancel(record)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
          刷新
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={batches}
        loading={loading}
        pagination={false}
      />

      <Modal
        title="批次详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
      >
        {detailRecord && (
          <div>
            <p><strong>ID：</strong>{detailRecord.id}</p>
            <p><strong>任务类型：</strong>{taskTypeLabels[detailRecord.task_type] || detailRecord.task_type}</p>
            <p><strong>状态：</strong><Tag color={statusColors[detailRecord.status]}>{detailRecord.status}</Tag></p>
            <p><strong>进度：</strong>{detailRecord.progress}%</p>
            <p><strong>完成数/总数：</strong>{detailRecord.completed_count} / {detailRecord.total_count}</p>
            <p><strong>开始时间：</strong>{detailRecord.started_at || '-'}</p>
            <p><strong>完成时间：</strong>{detailRecord.completed_at || '-'}</p>
            {detailRecord.error_message && (
              <p><strong>错误信息：</strong><span style={{ color: 'red' }}>{detailRecord.error_message}</span></p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
