'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Card, Input, Button, message, Switch, Row, Col, Typography, Space,
  Spin, Alert, Timeline, Tag, Statistic, Select,
} from 'antd';
import {
  PlayCircleOutlined, StopOutlined, RobotOutlined, LinkOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import { runAdhocAI, getAIExecution, stopAIExecution, getAIExecutionReport } from '@/lib/api/ai-smart';
import type { AIExecutionRecord, ExecutionReport } from '@/lib/api/ai-smart';

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function AISmartPage() {
  const t = useTranslations();
  const [taskDescription, setTaskDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [executionMode, setExecutionMode] = useState<'text' | 'vision'>('text');
  const [enableGif, setEnableGif] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const [executionLog, setExecutionLog] = useState<Record<string, unknown>[]>([]);
  const [report, setReport] = useState<ExecutionReport | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((id: number) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getAIExecution(id);
        const record = res.data;
        if (record.execution_log) {
          setExecutionLog(record.execution_log);
        }
        if (record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') {
          stopPolling();
          setExecuting(false);
          // load report
          const reportRes = await getAIExecutionReport(id);
          setReport(reportRes.data);
        }
      } catch {
        stopPolling();
        setExecuting(false);
      }
    }, 2000);
  }, [stopPolling]);

  const handleRun = async () => {
    if (!taskDescription.trim()) {
      message.warning(t('aiSmart.execution.taskPlaceholder'));
      return;
    }
    setExecuting(true);
    setExecutionLog([]);
    setReport(null);
    try {
      const res = await runAdhocAI({
        task_description: taskDescription,
        target_url: targetUrl || undefined,
        execution_mode: executionMode,
        enable_gif: enableGif,
      });
      setExecutionId(res.data.execution_id);
      startPolling(res.data.execution_id);
      message.success(t('aiSmart.execution.submitted'));
    } catch {
      message.error(t('aiSmart.execution.submitFailed'));
      setExecuting(false);
    }
  };

  const handleStop = async () => {
    if (!executionId) return;
    try {
      await stopAIExecution(executionId);
      message.success(t('aiSmart.execution.stopped'));
      stopPolling();
      setExecuting(false);
    } catch {
      message.error(t('aiSmart.execution.stopFailed'));
    }
  };

  // cleanup interval
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <div>
      <Row gutter={16}>
        {/* left: task input */}
        <Col span={12}>
          <Card title={<><RobotOutlined /> {t('aiSmart.execution.title')}</>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>{t('aiSmart.execution.taskDesc')}</Text>
                <TextArea
                  rows={4}
                  placeholder={t('aiSmart.execution.taskHint')}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  disabled={executing}
                />
              </div>
              <div>
                <Text strong>{t('aiSmart.execution.targetUrl')}</Text>
                <Input
                  prefix={<LinkOutlined />}
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  disabled={executing}
                />
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>{t('aiSmart.execution.mode')}</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={executionMode}
                    onChange={setExecutionMode}
                    disabled={executing}
                    options={[
                      { label: t('aiSmart.execution.textMode'), value: 'text' },
                      { label: t('aiSmart.execution.visionMode'), value: 'vision' },
                    ]}
                  />
                </Col>
                <Col span={8}>
                  <Space style={{ marginTop: 16 }}>
                    <Text strong>{t('aiSmart.execution.recordGif')}</Text>
                    <Switch checked={enableGif} onChange={setEnableGif} disabled={executing} />
                  </Space>
                </Col>
              </Row>
              <Space>
                <Button type="primary" icon={<PlayCircleOutlined />}
                  loading={executing} onClick={handleRun}
                  disabled={!taskDescription.trim()}
                >{t('aiSmart.execution.execute')}</Button>
                <Button danger icon={<StopOutlined />}
                  disabled={!executing} onClick={handleStop}
                >{t('aiSmart.execution.stop')}</Button>
              </Space>
            </Space>
          </Card>

          {/* execution report */}
          {report && (
            <Card title={t('aiSmart.execution.result')} style={{ marginTop: 16 }} size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title={t('aiSmart.execution.status')} value={report.status === 'completed' ? t('aiSmart.execution.success') : report.status === 'failed' ? t('aiSmart.execution.failed') : t('aiSmart.execution.cancelled')}
                    valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title={t('aiSmart.execution.stepsCompleted')} value={report.steps_completed} />
                </Col>
                <Col span={8}>
                  <Statistic title={t('aiSmart.execution.duration')} value={report.duration_seconds} suffix="s" />
                </Col>
              </Row>
              {report.summary && (
                <Alert message={report.summary} type={report.status === 'completed' ? 'success' : 'error'}
                  style={{ marginTop: 8 }} showIcon
                />
              )}
              {report.gif_recording && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>{t('aiSmart.execution.gifPlayback')}</Text>
                  <img src={`/${report.gif_recording}`} alt="AI execution recording"
                    style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }}
                  />
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* right: real-time log */}
        <Col span={12}>
          <Card title={t('aiSmart.execution.log')} extra={executing && <Spin size="small" />}>
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {executionLog.length === 0 && !executing && (
                <Text type="secondary">{t('aiSmart.execution.inputHint')}</Text>
              )}
              <Timeline
                items={executionLog.map((entry, i) => {
                  const e = entry as Record<string, string>;
                  return {
                    key: i,
                    color: e.status === 'completed' ? 'green' : e.status === 'failed' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Space>
                          <Tag>{e.time}</Tag>
                          <Text strong>{e.step}</Text>
                          <Tag color={e.status === 'completed' ? 'green' : e.status === 'failed' ? 'red' : 'processing'}>
                            {e.status === 'completed' ? t('aiSmart.execution.completed') : e.status === 'failed' ? t('aiSmart.execution.failed') : t('aiSmart.execution.running')}
                          </Tag>
                        </Space>
                        {e.detail && (
                          <pre style={{ fontSize: 12, margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {e.detail}
                          </pre>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
