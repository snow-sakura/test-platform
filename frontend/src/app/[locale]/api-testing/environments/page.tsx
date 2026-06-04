'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Table, Tabs, Tag, Space, message, Popconfirm, Modal, Form, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getEnvironments, createEnvironment, updateEnvironment,
  deleteEnvironment, activateEnvironment,
} from '@/lib/api/api-testing';
import type { ApiEnvironment } from '@/lib/api/api-testing';
import KeyValueEditor from '@/components/api-testing/KeyValueEditor';

/** 环境管理页面 */
export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<ApiEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ApiEnvironment | null>(null);
  const [form] = Form.useForm();

  const envType = activeTab === 'global' ? 'global' : 'local';

  const fetchData = useCallback(() => {
    setLoading(true);
    getEnvironments({ env_type: envType })
      .then((res) => setEnvs(res.data))
      .finally(() => setLoading(false));
  }, [envType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        await updateEnvironment(editRecord.id, values);
      } else {
        await createEnvironment({ ...values, env_type: envType });
      }
      message.success('保存成功');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateEnvironment(id);
      message.success('环境已激活');
      fetchData();
    } catch {
      message.error('激活失败');
    }
  };

  const columns: ColumnsType<ApiEnvironment> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '变量数', key: 'var_count',
      render: (_, r) => Object.keys(r.variables || {}).length,
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 100,
      render: (v: boolean) => v ? <Tag icon={<CheckCircleOutlined />} color="success">已激活</Tag> : <Tag>未激活</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 180 },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, record) => (
        <Space>
          {!record.is_active && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleActivate(record.id)}>
              激活
            </Button>
          )}
          <Button type="link" size="small" onClick={() => {
            setEditRecord(record);
            form.setFieldsValue(record);
            setModalOpen(true);
          }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={async () => {
            await deleteEnvironment(record.id);
            message.success('已删除');
            fetchData();
          }}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'global', label: '全局环境' },
          { key: 'local', label: '项目环境' },
        ]}
        tabBarExtraContent={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditRecord(null);
            form.resetFields();
            setModalOpen(true);
          }}>
            新建环境
          </Button>
        }
      />

      <Table rowKey="id" columns={columns} dataSource={envs} loading={loading} pagination={false} />

      <Modal
        title={editRecord ? '编辑环境' : '新建环境'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="环境名称" rules={[{ required: true }]}>
            <Input placeholder="如：测试环境、预发布环境" />
          </Form.Item>
          <Form.Item name="variables" label="环境变量" initialValue={[]}>
            <KeyValueEditor
              keyPlaceholder="变量名（如：base_url）"
              valuePlaceholder="变量值（如：http://localhost:8080）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
