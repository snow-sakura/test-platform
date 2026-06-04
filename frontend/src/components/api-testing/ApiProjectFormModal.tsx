'use client';

import { useEffect } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import { createApiProject, updateApiProject } from '@/lib/api/api-testing';
import type { ApiProject } from '@/lib/api/api-testing';

interface Props {
  open: boolean;
  editRecord: ApiProject | null;
  onClose: () => void;
  onSuccess: () => void;
}

/** API 项目创建/编辑弹窗 */
export default function ApiProjectFormModal({ open, editRecord, onClose, onSuccess }: Props) {
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
      title={editRecord ? '编辑 API 项目' : '新建 API 项目'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="例如：电商平台API" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="可选描述" />
        </Form.Item>
        <Form.Item name="type" label="类型" initialValue="HTTP">
          <Select>
            <Select.Option value="HTTP">HTTP</Select.Option>
            <Select.Option value="WebSocket">WebSocket</Select.Option>
            <Select.Option value="gRPC">gRPC</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="status" label="状态" initialValue="active">
          <Select>
            <Select.Option value="active">启用</Select.Option>
            <Select.Option value="archived">归档</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
