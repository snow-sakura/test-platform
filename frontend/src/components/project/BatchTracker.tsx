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

const taskTypeKeys: Record<string, string> = {
  extract_test_points: 'project.extractTestPoints',
  generate_test_cases: 'project.generateTestCases',
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
              message: t('project.taskCompleted'),
              description: t('project.taskCompletedDesc', { type: t(taskTypeKeys[batch.task_type]) || batch.task_type }),
            });
          } else if (batch.status === 'FAILED') {
            notification.error({
              message: t('project.taskFailed'),
              description: batch.error_message || t('project.taskFailedDesc', { type: t(taskTypeKeys[batch.task_type]) || batch.task_type }),
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
      notification.success({ message: t('project.taskCancelled') });
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
      title: t('project.batchTaskType'),
      dataIndex: 'task_type',
      key: 'task_type',
      width: 150,
      render: (type: string) => (
        <Tag>{t(taskTypeKeys[type]) || type}</Tag>
      ),
    },
    {
      title: t('project.batchStatus'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: t('project.batchProgress'),
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
      title: t('project.batchCompletedCount'),
      key: 'count',
      width: 120,
      render: (_, record) => `${record.completed_count} / ${record.total_count}`,
    },
    {
      title: t('project.batchStartTime'),
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('project.batchEndTime'),
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
              {t('common.cancel')}
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
          {t('common.refresh')}
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
        title={t('project.batchDetail')}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
      >
        {detailRecord && (
          <div>
            <p><strong>ID：</strong>{detailRecord.id}</p>
            <p><strong>{t('project.batchTaskType')}：</strong>{t(taskTypeKeys[detailRecord.task_type]) || detailRecord.task_type}</p>
            <p><strong>{t('project.batchStatus')}：</strong><Tag color={statusColors[detailRecord.status]}>{detailRecord.status}</Tag></p>
            <p><strong>{t('project.batchProgress')}：</strong>{detailRecord.progress}%</p>
            <p><strong>{t('project.batchCompletedCountTotal')}：</strong>{detailRecord.completed_count} / {detailRecord.total_count}</p>
            <p><strong>{t('project.batchStartTime')}：</strong>{detailRecord.started_at || '-'}</p>
            <p><strong>{t('project.batchEndTime')}：</strong>{detailRecord.completed_at || '-'}</p>
            {detailRecord.error_message && (
              <p><strong>{t('project.batchError')}：</strong><span style={{ color: 'red' }}>{detailRecord.error_message}</span></p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
