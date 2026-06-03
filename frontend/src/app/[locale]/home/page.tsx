'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, Col, Row, message } from 'antd';
import {
  ThunderboltOutlined,
  ApiOutlined,
  MonitorOutlined,
  DatabaseOutlined,
  MobileOutlined,
  RobotOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const cards = [
  { key: 'aiGeneration', icon: <ThunderboltOutlined />, locale: true, disabled: true },
  { key: 'apiTesting', icon: <ApiOutlined />, locale: true, disabled: true },
  { key: 'uiAutomation', icon: <MonitorOutlined />, locale: true, disabled: true },
  { key: 'dataFactory', icon: <DatabaseOutlined />, locale: true, disabled: true },
  { key: 'appAutomation', icon: <MobileOutlined />, locale: true, disabled: true },
  { key: 'aiIntelligent', icon: <RobotOutlined />, locale: true, disabled: true },
  { key: 'aiReviewer', icon: <MessageOutlined />, locale: true, disabled: true },
  { key: 'configuration', icon: <SettingOutlined />, locale: true, disabled: true },
];

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();

  const handleClick = (item: (typeof cards)[0]) => {
    if (item.disabled) {
      message.info(t('common.comingSoon'));
      return;
    }
    if (item.key === 'projects') {
      router.push('/projects');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>{t('home.welcome')}</h1>
      <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>{t('home.subtitle')}</p>
      <Row gutter={[16, 16]}>
        {cards.map((item) => (
          <Col key={item.key} lg={6} md={12} sm={24}>
            <Card
              hoverable
              onClick={() => handleClick(item)}
              style={{
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.6 : 1,
              }}
            >
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {t(`home.cards.${item.key}.title`)}
                </div>
                <div style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
                  {t(`home.cards.${item.key}.desc`)}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
