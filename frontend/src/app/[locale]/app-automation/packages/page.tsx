'use client';

import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getAppProjects, getAppPackages, createAppPackage, updateAppPackage, deleteAppPackage,
} from '@/lib/api/app-automation';
import type { AppProject, AppPackage } from '@/lib/api/app-automation';

export default function PackagesPage() {
  const [projects, setProjects] = useState<AppProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [packages, setPackages] = useState<AppPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppPackage | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    getAppProjects({ page_size: 200 }).then((r) => {
      const list = r.data.results || [];
      setProjects(list);
      if (list.length > 0) setSelectedProject(list[0].id);
    }).catch(() => message.error('加载项目列表失败'));
  }, []);

  useEffect(() => {
    if (!selectedProject) { setPackages([]); return; }
    setLoading(true);
    getAppPackages(selectedProject).then((r) => setPackages(r.data || []))
      .catch(() => message.error('加载包列表失败'))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateAppPackage(editing.id, values);
        message.success('更新成功');
      } else {
        await createAppPackage({ ...values, project_id: selectedProject });
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      if (selectedProject) {
        const res = await getAppPackages(selectedProject);
        setPackages(res.data || []);
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAppPackage(id);
      message.success('已删除');
      if (selectedProject) {
        const res = await getAppPackages(selectedProject);
        setPackages(res.data || []);
      }
    } catch {
      message.error('删除失败');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (pkg: AppPackage) => {
    setEditing(pkg);
    form.setFieldsValue(pkg);
    setModalOpen(true);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={selectedProject}
          onChange={setSelectedProject}
          options={projects.map((p) => ({ label: p.name, value: p.id }))}
          style={{ width: 240 }}
          placeholder="选择项目"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedProject}>
          添加应用包
        </Button>
      </Space>

      <Table rowKey="id" loading={loading} dataSource={packages} size="small"
        columns={[
          { title: '包名', dataIndex: 'package_name', width: 200 },
          { title: '应用名称', dataIndex: 'app_name', width: 160 },
          { title: '主 Activity', dataIndex: 'main_activity', width: 200, ellipsis: true },
          { title: '版本', dataIndex: 'version', width: 100 },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: '操作', width: 120, fixed: 'right' as const,
            render: (_: unknown, record: AppPackage) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
                <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>删除</Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? '编辑应用包' : '添加应用包'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="package_name" label="包名" rules={[{ required: true, message: '请输入包名' }]}>
            <Input placeholder="com.example.app" />
          </Form.Item>
          <Form.Item name="app_name" label="应用名称" rules={[{ required: true, message: '请输入应用名称' }]}>
            <Input placeholder="应用名称" />
          </Form.Item>
          <Form.Item name="main_activity" label="主 Activity">
            <Input placeholder=".MainActivity" />
          </Form.Item>
          <Form.Item name="version" label="版本">
            <Input placeholder="1.0.0" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
