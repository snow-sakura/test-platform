'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table, Button, Modal, Form, Input, InputNumber, message, Tag, Card, Space, Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';

import {
  getApiTokens, createApiToken, deleteApiToken,
} from '@/lib/api/ci-cd';
import type { ApiTokenResponse, ApiTokenCreateResponse } from '@/lib/api/ci-cd';

const { Text, Paragraph } = Typography;

export default function CiCdTokensPage() {
  const t = useTranslations();
  const [tokens, setTokens] = useState<ApiTokenResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState<ApiTokenCreateResponse | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApiTokens();
      setTokens(res.data);
    } catch {
      message.error('加载 Token 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const res = await createApiToken({
        name: values.name,
        expires_in_days: values.expires_in_days || null,
      });
      message.success(t('ciCd.tokenCreated'));
      setCreateOpen(false);
      form.resetFields();
      setShowTokenModal(res.data);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('创建 Token 失败');
    }
  };

  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: t('ciCd.deleteConfirm'),
      content: `Token: ${name}`,
      okText: '确定', cancelText: '取消', okType: 'danger',
      onOk: async () => {
        try {
          await deleteApiToken(id);
          message.success(t('ciCd.tokenDeleted'));
          fetchData();
        } catch { message.error('删除失败'); }
      },
    });
  };

  const columns = [
    { title: t('ciCd.tokenName'), dataIndex: 'name', key: 'name' },
    {
      title: t('ciCd.status'), dataIndex: 'is_active', key: 'is_active', width: 100,
      render: (v: boolean) => v
        ? <Tag color="success">{t('ciCd.active')}</Tag>
        : <Tag color="error">{t('ciCd.disabled')}</Tag>,
    },
    { title: t('ciCd.lastUsed'), dataIndex: 'last_used_at', key: 'last_used_at', width: 180, render: (v: string | null) => v || '-' },
    { title: t('ciCd.expiresIn'), dataIndex: 'expires_at', key: 'expires_at', width: 180, render: (v: string | null) => v || t('ciCd.neverExpires') },
    { title: t('ciCd.createdAt'), dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: t('common.action'), key: 'action', width: 100,
      render: (_: any, record: ApiTokenResponse) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.name)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        size="small" title={t('ciCd.tokens')}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{t('ciCd.createToken')}</Button>}
      >
        <Table dataSource={tokens} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      </Card>

      <Modal
        title={t('ciCd.createToken')} open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        okText="确定" cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('ciCd.tokenName')} rules={[{ required: true, message: '请输入 Token 名称' }]}>
            <Input placeholder="例如: GitLab CI Token" />
          </Form.Item>
          <Form.Item name="expires_in_days" label={t('ciCd.expiresIn')}>
            <InputNumber min={1} max={3650} placeholder={t('ciCd.neverExpires')} style={{ width: '100%' }} addonAfter="天" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('ciCd.tokenCreated')} open={!!showTokenModal}
        onCancel={() => setShowTokenModal(null)} footer={null} width={560}
      >
        <Paragraph><Text type="warning">{t('ciCd.copyToken')}</Text></Paragraph>
        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', position: 'relative' }}>
          {showTokenModal?.token}
          <Button type="text" icon={<CopyOutlined />} style={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => { navigator.clipboard.writeText(showTokenModal?.token || ''); message.success(t('ciCd.copied')); }} />
        </div>
        <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
          <Text type="secondary">{t('ciCd.expiresIn')}: {showTokenModal?.expires_at || t('ciCd.neverExpires')}</Text>
        </Paragraph>
      </Modal>
    </div>
  );
}
