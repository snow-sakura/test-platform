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

/* i18n key → 快捷操作配置 */
const QUICK_ACTION_KEYS: Record<string, string> = {
  projects: 'home.createProject',
  testManagement: 'home.newTestCase',
  apiTesting: 'home.newInterface',
  uiAutomation: 'home.newScript',
  appAutomation: 'home.deviceManagement',
  performance: 'home.newScene',
  aiGeneration: 'home.aiGenerate',
  aiIntelligent: 'home.aiExecute',
  aiReviewer: 'home.aiChat',
  dataFactory: 'home.generateData',
  configuration: 'home.systemSettings',
};

const QUICK_ACTION_PATHS: Record<string, string> = {
  projects: '/projects',
  testManagement: '/test-management/cases/create',
  apiTesting: '/api-testing/interfaces',
  uiAutomation: '/ui-automation/scripts',
  appAutomation: '/app-automation/devices',
  performance: '/performance/scenarios',
  aiGeneration: '/ai-generation/requirement-analysis',
  aiIntelligent: '/ai-smart',
  aiReviewer: '/ai-evaluator',
  dataFactory: '/data-factory',
  configuration: '/settings',
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
                actions={
                  QUICK_ACTION_KEYS[key]
                    ? [
                        <Button
                          key={key}
                          type="link"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={(e) => handleQuickAction(e, QUICK_ACTION_PATHS[key])}
                        >
                          {t(QUICK_ACTION_KEYS[key])}
                        </Button>,
                      ]
                    : undefined
                }
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
                          {status?.count && status.count > 0 ? `${status.count}${t('home.count')}` : t('home.ready')}
                        </Tag>
                      </Space>
                    ) : (
                      <Tag icon={<MinusCircleFilled />} color="default">
                        {t('home.notConfigured')}
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
