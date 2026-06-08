'use client';

import { useEffect } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { createApiProject, updateApiProject } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';

interface Props {
  open: boolean;
  editRecord: ApiProject | null;
  onClose: () => void;
  onSuccess: () => void;
}

/** API project create/edit modal */
export default function ApiProjectFormModal({ open, editRecord, onClose, onSuccess }: Props) {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editRecord) {
        form.setFieldsValue(editRecord);
      } else {
        form.resetFields();
      }
    }
  }, [open, editRecord, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateApiProject(editRecord.id, values);
      } else {
        await createApiProject(values);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  return (
    <Modal
      title={editRecord ? t('project.edit') : t('project.create')}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label={t('project.name')} rules={[{ required: true, message: tc('inputPlaceholder') }]}>
          <Input placeholder={tc('inputPlaceholder')} />
        </Form.Item>
        <Form.Item name="description" label={tc('description')}>
          <Input.TextArea rows={3} placeholder={tc('inputPlaceholder')} />
        </Form.Item>
        <Form.Item name="type" label={tc('type')} initialValue="HTTP">
          <Select>
            <Select.Option value="HTTP">HTTP</Select.Option>
            <Select.Option value="WebSocket">WebSocket</Select.Option>
            <Select.Option value="gRPC">gRPC</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="status" label={tc('status')} initialValue="active">
          <Select>
            <Select.Option value="active">{t('project.active')}</Select.Option>
            <Select.Option value="archived">{t('project.archived')}</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
