'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, Col, Row, Tag, Space, Button, Spin, message } from 'antd';
import {
  ThunderboltOutlined,
  ApiOutlined,
  MonitorOutlined,
  DatabaseOutlined,
  MobileOutlined,
  RobotOutlined,
  MessageOutlined,
  SettingOutlined,
  PlusOutlined,
  RightCircleOutlined,
  CheckCircleFilled,
  MinusCircleFilled,
  ExperimentOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { getModuleStatus, ModuleStatusMap } from '@/lib/api/dashboard';

/* 模块路由映射 */
const ROUTE_MAP: Record<string, string> = {
  projects: '/projects',
  testManagement: '/test-management',
  apiTesting: '/api-testing',
  uiAutomation: '/ui-automation',
  appAutomation: '/app-automation',
  performance: '/performance',
  aiGeneration: '/ai-generation',
  aiIntelligent: '/ai-smart',
  aiReviewer: '/ai-evaluator',
  dataFactory: '/data-factory',
  configuration: '/settings',
};

/* 模块图标映射 */
const ICON_MAP: Record<string, React.ReactNode> = {
  projects: <ThunderboltOutlined />,
  testManagement: <ExperimentOutlined />,
  apiTesting: <ApiOutlined />,
  uiAutomation: <MonitorOutlined />,
  appAutomation: <MobileOutlined />,
  performance: <BarChartOutlined />,
  aiGeneration: <ThunderboltOutlined />,
  aiIntelligent: <RobotOutlined />,
  aiReviewer: <MessageOutlined />,
  dataFactory: <DatabaseOutlined />,
  configuration: <SettingOutlined />,
};

/* 模块的快捷操作配置 */
const QUICK_ACTIONS: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
  projects: [{ label: '创建项目', path: '/projects', icon: <PlusOutlined /> }],
  testManagement: [{ label: '新建用例', path: '/test-management/cases/create', icon: <PlusOutlined /> }],
  apiTesting: [{ label: '新建接口', path: '/api-testing/interfaces', icon: <PlusOutlined /> }],
  uiAutomation: [{ label: '新建脚本', path: '/ui-automation/scripts', icon: <PlusOutlined /> }],
  appAutomation: [{ label: '设备管理', path: '/app-automation/devices', icon: <PlusOutlined /> }],
  performance: [{ label: '新建场景', path: '/performance/scenarios', icon: <PlusOutlined /> }],
  aiGeneration: [{ label: 'AI 生成', path: '/ai-generation/requirement-analysis', icon: <PlusOutlined /> }],
  aiIntelligent: [{ label: 'AI 执行', path: '/ai-smart', icon: <RightCircleOutlined /> }],
  aiReviewer: [{ label: 'AI 对话', path: '/ai-evaluator', icon: <MessageOutlined /> }],
  dataFactory: [{ label: '生成数据', path: '/data-factory', icon: <PlusOutlined /> }],
  configuration: [{ label: '系统设置', path: '/settings', icon: <SettingOutlined /> }],
};

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const [moduleStatus, setModuleStatus] = useState<ModuleStatusMap | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getModuleStatus();
      setModuleStatus(res.data);
    } catch {
      // 静默失败，使用离线判定
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleClick = (key: string) => {
    const path = ROUTE_MAP[key];
    if (path) router.push(path);
  };

  const handleQuickAction = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    router.push(path);
  };

  /* 所有模块配置（按固定顺序显示） */
  const moduleKeys = [
    'projects', 'testManagement', 'apiTesting', 'uiAutomation',
    'appAutomation', 'performance', 'aiGeneration', 'aiIntelligent', 'aiReviewer',
    'dataFactory', 'configuration',
  ];

  return (
    <div>
      {/* 标题区域 */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t('home.welcome')}</h1>
        <p style={{ fontSize: 16, color: '#666', marginBottom: 0 }}>{t('home.subtitle')}</p>
      </div>

      {/* 加载中 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {/* 导航卡片网格 */}
      <Row gutter={[16, 16]}>
        {moduleKeys.map((key) => {
          const status = moduleStatus?.[key];
          const configured = status?.configured ?? false;

          return (
            <Col key={key} lg={6} md={8} sm={12} xs={24}>
              <Card
                hoverable
                onClick={() => handleClick(key)}
                style={{ cursor: 'pointer', height: '100%' }}
                actions={[
                  ...(QUICK_ACTIONS[key] || []).map((action) => (
                    <Button
                      key={action.label}
                      type="link"
                      size="small"
                      icon={action.icon}
                      onClick={(e) => handleQuickAction(e, action.path)}
                    >
                      {action.label}
                    </Button>
                  )),
                ]}
              >
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  {/* 图标 */}
                  <div style={{ fontSize: 36, marginBottom: 12 }}>
                    {ICON_MAP[key] || <ThunderboltOutlined />}
                  </div>

                  {/* 标题 */}
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    {t(`home.cards.${key}.title`)}
                  </div>

                  {/* 描述 */}
                  <div style={{ fontSize: 13, color: '#999', marginTop: 8, minHeight: 36 }}>
                    {t(`home.cards.${key}.desc`)}
                  </div>

                  {/* 状态标签 */}
                  <div style={{ marginTop: 10 }}>
                    {configured ? (
                      <Space>
                        <Tag icon={<CheckCircleFilled />} color="success">
                          {status?.count && status.count > 0 ? `${status.count} 项` : '已就绪'}
                        </Tag>
                      </Space>
                    ) : (
                      <Tag icon={<MinusCircleFilled />} color="default">
                        未配置
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
