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
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('aiGeneration');
  const tc = useTranslations('common');
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
      message.success(t('requirement.uploadSuccess'));
      setFileList([]);
      loadDocs();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || t('requirement.uploadFailed'));
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
      message.success(t('requirement.analysisComplete'));
    } catch (e: any) {
      message.error(e?.response?.data?.detail || t('requirement.analysisFailed'));
    }
    setAnalyzing(false);
  };

  const handleAnalyzeText = async () => {
    if (!rawText.trim()) { message.warning(t('requirement.inputRequirement')); return; }
    setAnalyzing(true);
    setRequirements([]);
    try {
      const res = await analyzeText(rawText);
      setCurrentAnalysisId(res.data.id);
      const reqs = await getAnalysisRequirements(res.data.id);
      setRequirements(reqs.data);
      message.success(t('requirement.analysisComplete'));
    } catch (e: any) {
      message.error(e?.response?.data?.detail || t('requirement.analysisFailed'));
    }
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    if (!currentAnalysisId) { message.warning(t('requirement.analyzeFirst')); return; }
    if (!selectedWriter) { message.warning(t('requirement.selectWriter')); return; }
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
      message.success(t('requirement.taskStarted'));
      router.push('/ai-generation/generated-cases');
    } catch (e: any) {
      message.error(e?.response?.data?.detail || t('requirement.taskFailed'));
    }
    setGenerating(false);
  };

  const canGenerate = configStatus?.writer_model?.configured;

  return (
    <div>
      <Title level={4}>{t('requirement.title')}</Title>
      <Text type="secondary">{t('requirement.uploadDoc')}</Text>
      <Divider />

      {configStatus && !canGenerate && (
        <Alert
          type="warning" showIcon
          message={t('requirement.configIncomplete')}
          description={t('requirement.selectWriter')}
          action={<Button size="small" onClick={() => router.push('/ai-generation/ai-model-config')}>{t('requirement.goToConfig')}</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card title={tc('upload')} size="small" style={{ flex: 1, minWidth: 350 }}>
          <Dragger
            fileList={fileList}
            onChange={(info) => setFileList(info.fileList.slice(-1))}
            beforeUpload={() => false}
            accept=".pdf,.docx,.md,.txt,.csv,.yaml,.yml"
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p>{t('requirement.clickToUpload')}</p>
            <p style={{ fontSize: 12 }}>PDF / DOCX / MD / TXT / CSV / YAML</p>
          </Dragger>
          <Button type="primary" onClick={handleUpload} loading={uploading} disabled={fileList.length === 0} icon={<UploadOutlined />} style={{ marginTop: 12 }} block>
            {tc('upload')}
          </Button>
          <div style={{ marginTop: 16 }}>
            <Text strong>{t('requirement.uploadedDoc')}</Text>
            <Table
              dataSource={docs} rowKey="id" loading={loadingDocs} size="small" pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: tc('name'), dataIndex: 'title', ellipsis: true },
                { title: tc('type'), dataIndex: 'file_type', width: 70 },
                {
                  title: tc('action'), width: 120,
                  render: (_: any, record: RequirementDocument) => (
                    <Button size="small" type="link" loading={analyzing && selectedDocId === record.id} onClick={() => handleAnalyzeDoc(record.id)}>
                      {t('requirement.analyze')}
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card title={t('requirement.inputRequirement')} size="small" style={{ flex: 1, minWidth: 350 }}>
          <TextArea
            rows={6}
            placeholder={t('requirement.inputPlaceholder')}
            value={rawText} onChange={(e) => setRawText(e.target.value)}
          />
          <Button type="primary" onClick={handleAnalyzeText} loading={analyzing && !selectedDocId} disabled={!rawText.trim()} icon={<FileTextOutlined />} style={{ marginTop: 12 }} block>
            {t('requirement.analyzeText')}
          </Button>
        </Card>
      </div>

      {analyzing && <Card style={{ marginTop: 16 }}><Spin tip={`${tc('loading')}`} /></Card>}

      {requirements.length > 0 && (
        <Card title={`${t('requirement.businessRequirement')}（${tc('totalCount', { count: requirements.length })}）`} style={{ marginTop: 16 }}>
          <Table
            dataSource={requirements} rowKey="id" size="small" pagination={{ pageSize: 10 }}
            columns={[
              { title: t('requirement.title'), dataIndex: 'title', ellipsis: true },
              { title: tc('description'), dataIndex: 'description', ellipsis: true },
              {
                title: tc('priority'), dataIndex: 'priority', width: 90,
                render: (v: string) => {
                  const color = v === 'HIGH' ? 'red' : v === 'MEDIUM' ? 'orange' : 'green';
                  return <Tag color={color}>{v}</Tag>;
                },
              },
              { title: tc('type'), dataIndex: 'category', width: 80 },
            ]}
          />
          <Divider />
          <Title level={5}>{t('requirement.startGeneration')}</Title>
          <Space wrap style={{ marginBottom: 16 }}>
            <Select
              placeholder={t('requirement.selectWriter')} style={{ width: 220 }}
              value={selectedWriter} onChange={setSelectedWriter}
              options={modelConfigs.map((m: any) => ({ label: `${m.name} (${m.model_name})`, value: m.id }))}
            />
            <Select
              placeholder={tc('selectPlaceholder')} style={{ width: 220 }}
              value={selectedPrompt} onChange={setSelectedPrompt} allowClear
              options={promptConfigs.filter((p: any) => p.prompt_type === 'testcase_writer').map((p: any) => ({ label: p.name, value: p.id }))}
            />
            <Select
              placeholder={tc('selectPlaceholder')} style={{ width: 220 }}
              value={selectedGenConfig} onChange={setSelectedGenConfig} allowClear
              options={genConfigs.map((g: any) => ({ label: g.name, value: g.id }))}
            />
          </Space>
          <div>
            <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={handleGenerate} loading={generating} disabled={!selectedWriter}>
              {t('requirement.startGeneration')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
