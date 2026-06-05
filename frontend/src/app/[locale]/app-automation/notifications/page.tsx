'use client';

import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Tabs } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getAppNotificationLogs } from '@/lib/api/app-automation';
import type { AppNotificationLog } from '@/lib/api/app-automation';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<AppNotificationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getAppNotificationLogs({ page_size: 100 });
      setLogs(res.data.results || []);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  const statusColors: Record<string, string> = { success: 'green', failed: 'red' };
  const statusLabels: Record<string, string> = { success: '成功', failed: '失败' };

  return (
    <div>
      <Tabs defaultActiveKey="logs"
        items={[
          {
            key: 'logs',
            label: '发送日志',
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadLogs}>刷新</Button>
                  </Space>
                </div>
                <Table rowKey="id" loading={loading} dataSource={logs} size="small" pagination={{ pageSize: 20 }}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: '配置 ID', dataIndex: 'config_id', width: 80 },
                    { title: '事件类型', dataIndex: 'event_type', width: 120 },
                    {
                      title: '状态', dataIndex: 'status', width: 80,
                      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{statusLabels[v] || v}</Tag>,
                    },
                    { title: '消息', dataIndex: 'message', width: 200, ellipsis: true },
                    { title: '响应', dataIndex: 'response', width: 200, ellipsis: true },
                    {
                      title: '发送时间', dataIndex: 'sent_at', width: 170,
                      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
