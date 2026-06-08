'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, Tag, Button, message, Space, Tabs } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getAppNotificationLogs } from '@/lib/api/app-automation';
import type { AppNotificationLog } from '@/lib/api/app-automation';

export default function NotificationsPage() {
  const t = useTranslations();
  const [logs, setLogs] = useState<AppNotificationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getAppNotificationLogs({ page_size: 100 });
      setLogs(res.data.results || []);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  const statusColors: Record<string, string> = { success: 'green', failed: 'red' };
  const statusLabels: Record<string, string> = { success: 'common.success', failed: 'common.failed' };

  return (
    <div>
      <Tabs defaultActiveKey="logs"
        items={[
          {
            key: 'logs',
            label: t('appAutomation.sendLogs'),
            children: (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadLogs}>{t('common.refresh')}</Button>
                  </Space>
                </div>
                <Table rowKey="id" loading={loading} dataSource={logs} size="small" pagination={{ pageSize: 20 }}
                  columns={[
                    { title: 'ID', dataIndex: 'id', width: 60 },
                    { title: t('appAutomation.configId'), dataIndex: 'config_id', width: 80 },
                    { title: t('appAutomation.eventType'), dataIndex: 'event_type', width: 120 },
                    {
                      title: t('common.status'), dataIndex: 'status', width: 80,
                      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{t(statusLabels[v]) || v}</Tag>,
                    },
                    { title: t('appAutomation.message'), dataIndex: 'message', width: 200, ellipsis: true },
                    { title: t('appAutomation.response'), dataIndex: 'response', width: 200, ellipsis: true },
                    {
                      title: t('appAutomation.sentAt'), dataIndex: 'sent_at', width: 170,
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
