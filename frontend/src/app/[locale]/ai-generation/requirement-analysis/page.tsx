'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card, Upload, Button, Input, Select, Table, message, Space, Typography,
  Tag, Divider, Spin, Alert,
} from 'antd';
import {
  UploadOutlined, FileTextOutlined, ThunderboltOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload';
import {
  uploadDocument, listDocuments, analyzeDocument,
  analyzeText, getAnalysisRequirements,
  createTask, listModelConfigs, listPromptConfigs,
  listGenerationConfigs, getConfigStatus, startGeneration,
  type RequirementDocument, type BusinessRequirement,
  type ConfigStatusResponse,
} from '@/lib/api/requirement-analysis';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Title, Text } = Typography;

export default function RequirementAnalysisPage() {
  const router = useRouter();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [docs, setDocs] = useState<RequirementDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [requirements, setRequirements] = useState<BusinessRequirement[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatusResponse | null>(null);
  const [modelConfigs, setModelConfigs] = useState<any[]>([]);
  const [promptConfigs, setPromptConfigs] = useState<any[]>([]);
  const [genConfigs, setGenConfigs] = useState<any[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<number | undefined>();
  const [selectedPrompt, setSelectedPrompt] = useState<number | undefined>();
  const [selectedGenConfig, setSelectedGenConfig] = useState<number | undefined>();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDocs();
    loadConfigStatus();
    loadConfigs();
  }, []);

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await listDocuments(1, 50);
      setDocs(res.data.results || []);
    } catch { /* ignore */ }
    setLoadingDocs(false);
  };

  const loadConfigStatus = async () => {
    try { setConfigStatus((await getConfigStatus()).data); } catch { /* ignore */ }
  };

  const loadConfigs = async () => {
    try {
      const [models, prompts, gens] = await Promise.all([
        listModelConfigs(), listPromptConfigs(), listGenerationConfigs(),
      ]);
      setModelConfigs(models.data);
      setPromptConfigs(prompts.data);
      setGenConfigs(gens.data);
    } catch { /* ignore */ }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const file = fileList[0].originFileObj as File;
      await uploadDocument(file);
      message.success('上传成功');
      setFileList([]);
      loadDocs();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '上传失败');
    }
    setUploading(false);
  };

  const handleAnalyzeDoc = async (docId: number) => {
    setSelectedDocId(docId);
    setAnalyzing(true);
    setRequirements([]);
    try {
      const res = await analyzeDocument(docId);
      setCurrentAnalysisId(res.data.id);
      const reqs = await getAnalysisRequirements(res.data.id);
      setRequirements(reqs.data);
      message.success('分析完成');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '分析失败');
    }
    setAnalyzing(false);
  };

  const handleAnalyzeText = async () => {
    if (!rawText.trim()) { message.warning('请输入需求文本'); return; }
    setAnalyzing(true);
    setRequirements([]);
    try {
      const res = await analyzeText(rawText);
      setCurrentAnalysisId(res.data.id);
      const reqs = await getAnalysisRequirements(res.data.id);
      setRequirements(reqs.data);
      message.success('分析完成');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '分析失败');
    }
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    if (!currentAnalysisId) { message.warning('请先完成需求分析'); return; }
    if (!selectedWriter) { message.warning('请选择 Writer 模型'); return; }
    setGenerating(true);
    try {
      const task = await createTask({
        source_type: selectedDocId ? 'document' : 'text',
        source_id: currentAnalysisId,
        mode: 'stream',
      });
      await startGeneration(task.data.task_id, {
        writer_config_id: selectedWriter,
        writer_prompt_id: selectedPrompt,
        generation_config_id: selectedGenConfig,
      });
      message.success('生成任务已启动');
      router.push('/ai-generation/generated-cases');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '启动失败');
    }
    setGenerating(false);
  };

  const canGenerate = configStatus?.writer_model?.configured;

  return (
    <div>
      <Title level={4}>需求导入与分析</Title>
      <Text type="secondary">上传需求文档或输入需求文本，提取业务需求，启动 AI 用例生成</Text>
      <Divider />

      {configStatus && !canGenerate && (
        <Alert
          type="warning" showIcon
          message="配置不完整"
          description="请先在「模型配置」中添加并激活 Writer 模型配置"
          action={<Button size="small" onClick={() => router.push('/ai-generation/ai-model-config')}>前往配置</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card title="上传文档" size="small" style={{ flex: 1, minWidth: 350 }}>
          <Dragger
            fileList={fileList}
            onChange={(info) => setFileList(info.fileList.slice(-1))}
            beforeUpload={() => false}
            accept=".pdf,.docx,.md,.txt,.csv,.yaml,.yml"
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p>点击或拖拽文件上传</p>
            <p style={{ fontSize: 12 }}>支持 PDF / DOCX / MD / TXT / CSV / YAML</p>
          </Dragger>
          <Button type="primary" onClick={handleUpload} loading={uploading} disabled={fileList.length === 0} icon={<UploadOutlined />} style={{ marginTop: 12 }} block>
            上传
          </Button>
          <div style={{ marginTop: 16 }}>
            <Text strong>已上传文档</Text>
            <Table
              dataSource={docs} rowKey="id" loading={loadingDocs} size="small" pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: '标题', dataIndex: 'title', ellipsis: true },
                { title: '类型', dataIndex: 'file_type', width: 70 },
                {
                  title: '操作', width: 120,
                  render: (_: any, record: RequirementDocument) => (
                    <Button size="small" type="link" loading={analyzing && selectedDocId === record.id} onClick={() => handleAnalyzeDoc(record.id)}>
                      分析
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card title="输入需求文本" size="small" style={{ flex: 1, minWidth: 350 }}>
          <TextArea
            rows={6}
            placeholder="在此粘贴需求文本内容，多个段落用空行分隔..."
            value={rawText} onChange={(e) => setRawText(e.target.value)}
          />
          <Button type="primary" onClick={handleAnalyzeText} loading={analyzing && !selectedDocId} disabled={!rawText.trim()} icon={<FileTextOutlined />} style={{ marginTop: 12 }} block>
            分析文本
          </Button>
        </Card>
      </div>

      {analyzing && <Card style={{ marginTop: 16 }}><Spin tip="正在分析需求..." /></Card>}

      {requirements.length > 0 && (
        <Card title={`业务需求（共 ${requirements.length} 条）`} style={{ marginTop: 16 }}>
          <Table
            dataSource={requirements} rowKey="id" size="small" pagination={{ pageSize: 10 }}
            columns={[
              { title: '标题', dataIndex: 'title', ellipsis: true },
              { title: '描述', dataIndex: 'description', ellipsis: true },
              {
                title: '优先级', dataIndex: 'priority', width: 90,
                render: (v: string) => {
                  const color = v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green';
                  return <Tag color={color}>{v}</Tag>;
                },
              },
              { title: '分类', dataIndex: 'category', width: 80 },
            ]}
          />
          <Divider />
          <Title level={5}>启动 AI 用例生成</Title>
          <Space wrap style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择 Writer 模型 *" style={{ width: 220 }}
              value={selectedWriter} onChange={setSelectedWriter}
              options={modelConfigs.map((m: any) => ({ label: `${m.name} (${m.model_name})`, value: m.id }))}
            />
            <Select
              placeholder="选择 Writer 提示词（可选）" style={{ width: 220 }}
              value={selectedPrompt} onChange={setSelectedPrompt} allowClear
              options={promptConfigs.filter((p: any) => p.prompt_type === 'testcase_writer').map((p: any) => ({ label: p.name, value: p.id }))}
            />
            <Select
              placeholder="选择生成配置（可选）" style={{ width: 220 }}
              value={selectedGenConfig} onChange={setSelectedGenConfig} allowClear
              options={genConfigs.map((g: any) => ({ label: g.name, value: g.id }))}
            />
          </Space>
          <div>
            <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={handleGenerate} loading={generating} disabled={!selectedWriter}>
              开始生成用例
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
