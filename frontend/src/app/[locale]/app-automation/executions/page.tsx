'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Table, message, Modal, Tag, Space, Row, Col, Card, Statistic } from 'antd';
import {
  getAppExecutions, getAppExecution,
} from '@/lib/api/app-automation';
import type { AppTestExecution } from '@/lib/api/app-automation';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  running: { label: 'appAutomation.execution.running', color: 'processing' },
  passed: { label: 'appAutomation.execution.passed', color: 'green' },
  failed: { label: 'appAutomation.execution.failed', color: 'red' },
  skipped: { label: 'appAutomation.execution.skipped', color: 'default' },
};

export default function AppExecutionsPage() {
  const t = useTranslations();
  const [executions, setExecutions] = useState<AppTestExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentExec, setCurrentExec] = useState<AppTestExecution | null>(null);

  const loadExecutions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAppExecutions({ page, page_size: 20 });
      setExecutions(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error(t('common.loadFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExecutions(); }, []);

  const viewDetail = async (id: number) => {
    try {
      const res = await getAppExecution(id);
      setCurrentExec(res.data);
      setDetailOpen(true);
    } catch { message.error(t('common.loadFailed')); }
  };

  return (
    <div>
      <Table rowKey="id" loading={loading} dataSource={executions} size="small"
        pagination={{ total, pageSize: 20, onChange: loadExecutions, showTotal: (n) => t('common.totalCount', { count: n }) }}
        columns={[
          { title: t('appAutomation.execution.id'), dataIndex: 'id', width: 80 },
          {
            title: t('common.type'), width: 100,
            render: (_, r) => r.test_case_id ? t('appAutomation.execution.singleCase') : r.suite_id ? t('appAutomation.execution.suite') : '-',
          },
          {
            title: t('appAutomation.execution.status'), dataIndex: 'result', width: 80,
            render: (v: string) => {
              const s = STATUS_MAP[v] || { label: 'common.unknown', color: 'default' };
              return <Tag color={s.color}>{t(s.label)}</Tag>;
            },
          },
          { title: t('appAutomation.execution.duration'), dataIndex: 'duration_ms', width: 100, render: (v: number | null) => v ?? '-' },
          { title: t('appAutomation.execution.errorMessage'), dataIndex: 'error_message', ellipsis: true },
          { title: t('common.createdAt'), dataIndex: 'started_at', width: 170 },
          {
            title: t('common.action'), width: 80,
            render: (_, record) => (
              <a onClick={() => viewDetail(record.id)}>{t('appAutomation.execution.detail')}</a>
            ),
          },
        ]}
      />

      <Modal title={`${t('appAutomation.execution.executionDetail')} #${currentExec?.id}`} open={detailOpen}
        onCancel={() => setDetailOpen(false)} footer={null} width={600}
      >
        {currentExec && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic title={t('common.status')}
                  value={t(STATUS_MAP[currentExec.result || '']?.label || 'common.unknown')}
                  valueStyle={{ color: currentExec.result === 'passed' ? '#52c41a' : '#ff4d4f' }}
                />
              </Col>
              <Col span={8}>
                <Statistic title={t('appAutomation.execution.duration')} value={currentExec.duration_ms ?? 0} suffix="ms" />
              </Col>
              <Col span={8}>
                <Statistic title={t('appAutomation.execution.screenshotCount')} value={currentExec.screenshots?.length || 0} />
              </Col>
            </Row>
            {currentExec.error_message && (
              <Card size="small" title={t('appAutomation.execution.errorMessage')} style={{ marginBottom: 16 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{currentExec.error_message}</pre>
              </Card>
            )}
            {currentExec.screenshots?.length > 0 && (
              <div>
                <strong>{t('appAutomation.execution.screenshot')}</strong>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {currentExec.screenshots.map((s) => (
                    <Col key={s.id} span={12}>
                      <img src={s.image_path} alt={`Screenshot ${s.id}`} style={{ width: '100%', border: '1px solid #d9d9d9', borderRadius: 4 }} />
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
