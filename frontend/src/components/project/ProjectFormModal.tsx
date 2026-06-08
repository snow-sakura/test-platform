'use client';

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { useTranslations } from 'next-intl';
import dayjs from 'dayjs';
import { createProject, updateProject, Project } from '@/lib/api/project';
import request from '@/lib/request';

interface Props {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: number;
  username: string;
}

export default function ProjectFormModal({ open, project, onClose, onSuccess }: Props) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const [users, setUsers] = useState<UserOption[]>([]);

  // Load users for member selection
  useEffect(() => {
    if (open) {
      request.get<{ id: number; username: string }[]>('/api/auth/users')
        .then((res) => setUsers(res.data || []))
        .catch((e) => console.warn('加载用户列表失败', e));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (project) {
        form.setFieldsValue({
          name: project.name,
          description: project.description,
          status: project.status,
          start_date: project.start_date ? dayjs(project.start_date) : null,
          end_date: project.end_date ? dayjs(project.end_date) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, project, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        start_date: values.start_date ? values.start_date.toISOString().split('T')[0] : null,
        end_date: values.end_date ? values.end_date.toISOString().split('T')[0] : null,
      };

      if (project) {
        await updateProject(project.id, data);
        message.success(t('common.updateSuccess'));
      } else {
        await createProject(data);
        message.success(t('common.createSuccess'));
      }
      await onSuccess();
      onClose();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
    }
  };

  return (
    <Modal
      title={project ? t('project.editProject') : t('project.createProject')}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={{ status: 'active' }}>
        <Form.Item
          name="name"
          label={t('project.name')}
          rules={[{ required: true, message: t('project.nameRequired') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label={t('project.description')}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="status" label={t('project.status')}>
          <Select
            options={[
              { value: 'active', label: t('project.active') },
              { value: 'archived', label: t('project.archived') },
              { value: 'completed', label: t('project.completed') },
            ]}
          />
        </Form.Item>
        <Form.Item name="start_date" label={t('project.startDate')}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="end_date" label={t('project.endDate')}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        {!project && (
          <Form.Item name="member_ids" label={t('project.projectMembers')}>
            <Select
              mode="multiple"
              placeholder={t('project.projectMembersPlaceholder')}
              options={users.map((u) => ({ label: u.username, value: u.id }))}
              filterOption
              showSearch
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
