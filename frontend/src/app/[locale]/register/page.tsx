'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth-store';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        first_name: values.first_name || '',
        last_name: values.last_name || '',
      });
      message.success(t('registerSuccess'));
      router.push('/home');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '注册失败';
      message.error(detail);
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
          <Title level={3}>TestHub</Title>
          <Text type="secondary">{t('registerTitle')}</Text>
        </div>
        <Form
          name="register"
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
            name="email"
            rules={[
              { required: true, message: t('emailRequired') },
              { type: 'email', message: t('emailInvalid') },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder={t('email')} />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('password')} />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            rules={[
              { required: true, message: t('confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('confirmPassword')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('register')}
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Text>
              {t('hasAccount')}{' '}
              <Button type="link" onClick={() => router.push('/login')}>
                {t('loginNow')}
              </Button>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
