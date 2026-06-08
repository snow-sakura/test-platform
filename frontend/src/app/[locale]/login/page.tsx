'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';

const { Title, Text } = Typography;

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success(t('loginSuccess'));
      router.push('/home');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || t('loginFailed');
      const fallback = t('loginFailed');
      message.error(detail || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#f0f2f5',
    }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>TestPlate</Title>
          <Text type="secondary">{t('loginTitle')}</Text>
        </div>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('usernameRequired') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('username')} />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('password')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('login')}
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Text>
              {t('noAccount')}{' '}
              <Button type="link" onClick={() => router.push('/register')}>
                {t('registerNow')}
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
