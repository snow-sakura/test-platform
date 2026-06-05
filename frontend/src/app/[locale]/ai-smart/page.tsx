'use client';

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
          // 加载报告
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
      message.warning('请输入任务描述');
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
      message.success('任务已提交');
    } catch {
      message.error('提交失败');
      setExecuting(false);
    }
  };

  const handleStop = async () => {
    if (!executionId) return;
    try {
      await stopAIExecution(executionId);
      message.success('任务已停止');
      stopPolling();
      setExecuting(false);
    } catch {
      message.error('停止失败');
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return (
    <div>
      <Row gutter={16}>
        {/* 左侧：任务输入 */}
        <Col span={12}>
          <Card title={<><RobotOutlined /> AI 智能浏览器代理</>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>任务描述</Text>
                <TextArea
                  rows={4}
                  placeholder="用自然语言描述要执行的测试任务，如：登录测试账号、搜索商品'手机'、验证搜索结果中包含目标商品"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  disabled={executing}
                />
              </div>
              <div>
                <Text strong>目标 URL（可选）</Text>
                <Input
                  prefix={<LinkOutlined />}
                  placeholder="如 https://example.com/login"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  disabled={executing}
                />
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>执行模式</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={executionMode}
                    onChange={setExecutionMode}
                    disabled={executing}
                    options={[
                      { label: '文本模式 (text)', value: 'text' },
                      { label: '视觉模式 (vision)', value: 'vision' },
                    ]}
                  />
                </Col>
                <Col span={8}>
                  <Space style={{ marginTop: 16 }}>
                    <Text strong>录制 GIF</Text>
                    <Switch checked={enableGif} onChange={setEnableGif} disabled={executing} />
                  </Space>
                </Col>
              </Row>
              <Space>
                <Button type="primary" icon={<PlayCircleOutlined />}
                  loading={executing} onClick={handleRun}
                  disabled={!taskDescription.trim()}
                >执行</Button>
                <Button danger icon={<StopOutlined />}
                  disabled={!executing} onClick={handleStop}
                >停止</Button>
              </Space>
            </Space>
          </Card>

          {/* 执行报告 */}
          {report && (
            <Card title="执行结果" style={{ marginTop: 16 }} size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="状态" value={report.status === 'completed' ? '成功' : report.status === 'failed' ? '失败' : '已取消'}
                    valueStyle={{ color: report.status === 'completed' ? '#52c41a' : '#ff4d4f' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic title="完成步骤" value={report.steps_completed} />
                </Col>
                <Col span={8}>
                  <Statistic title="耗时" value={report.duration_seconds} suffix="s" />
                </Col>
              </Row>
              {report.summary && (
                <Alert message={report.summary} type={report.status === 'completed' ? 'success' : 'error'}
                  style={{ marginTop: 8 }} showIcon
                />
              )}
              {report.gif_recording && (
                <div style={{ marginTop: 8 }}>
                  <Text strong>GIF 录制回放</Text>
                  <img src={`/${report.gif_recording}`} alt="AI 执行录制"
                    style={{ width: '100%', marginTop: 4, border: '1px solid #d9d9d9', borderRadius: 4 }}
                  />
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* 右侧：实时日志 */}
        <Col span={12}>
          <Card title="执行日志" extra={executing && <Spin size="small" />}>
            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {executionLog.length === 0 && !executing && (
                <Text type="secondary">输入任务并点击执行，AI 将自动分析并执行浏览器操作</Text>
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
                            {e.status === 'completed' ? '完成' : e.status === 'failed' ? '失败' : '执行中'}
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
