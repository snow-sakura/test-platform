'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Form, Input, Button, Tabs, Descriptions, message, Tag } from 'antd';
import { useAuthStore } from '@/stores/auth-store';
import * as authApi from '@/lib/api/auth';

export default function ProfilePage() {
  const t = useTranslations('auth');
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const onUpdateProfile = async (values: any) => {
    setProfileLoading(true);
    try {
      await updateProfile(values);
      message.success(t('updateSuccess'));
    } catch {
      // 拦截器已处理
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (values: any) => {
    setPwdLoading(true);
    try {
      await authApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
      message.success(t('passwordChanged'));
    } catch {
      // 拦截器已处理
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  const tabItems = [
    {
      key: 'info',
      label: t('basicInfo'),
      children: (
        <div>
          <Descriptions column={2} style={{ marginBottom: 24 }}>
            <Descriptions.Item label={t('username')}>{user.username}</Descriptions.Item>
            <Descriptions.Item label={t('email')}>{user.email}</Descriptions.Item>
            <Descriptions.Item label={t('firstName')}>{user.first_name || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('lastName')}>{user.last_name || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('department')}>{user.department || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('position')}>{user.position || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('status')}>
              {user.is_active ? <Tag color="green">{t('active')}</Tag> : <Tag color="red">{t('disabled')}</Tag>}
            </Descriptions.Item>
          </Descriptions>
          <Card title={t('editProfile')} size="small">
            <Form
              layout="vertical"
              onFinish={onUpdateProfile}
              initialValues={{
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                department: user.department,
                position: user.position,
              }}
              style={{ maxWidth: 480 }}
            >
              <Form.Item name="email" label={t('email')}
                rules={[{ required: true }, { type: 'email', message: t('emailInvalid') }]}>
                <Input />
              </Form.Item>
              <Form.Item name="first_name" label={t('firstName')}><Input /></Form.Item>
              <Form.Item name="last_name" label={t('lastName')}><Input /></Form.Item>
              <Form.Item name="department" label={t('department')}><Input /></Form.Item>
              <Form.Item name="position" label={t('position')}><Input /></Form.Item>
              <Button type="primary" htmlType="submit" loading={profileLoading}>
                {t('save')}
              </Button>
            </Form>
          </Card>
        </div>
      ),
    },
    {
      key: 'password',
      label: t('changePassword'),
      children: (
        <Form
          layout="vertical"
          onFinish={onChangePassword}
          style={{ maxWidth: 480 }}
        >
          <Form.Item
            name="old_password"
            label={t('oldPassword')}
            rules={[{ required: true, message: t('oldPasswordRequired') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password"
            label={t('newPassword')}
            rules={[{ required: true, message: t('newPasswordRequired') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label={t('confirmPassword')}
            rules={[
              { required: true, message: t('confirmPasswordRequired') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={pwdLoading}>
            {t('changePassword')}
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>{t('profile')}</h2>
      <Tabs items={tabItems} />
    </div>
  );
}
