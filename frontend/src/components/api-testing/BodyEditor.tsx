'use client';

import { Select, Input, Tabs } from 'antd';

interface BodyEditorProps {
  bodyType: string;
  body: any;
  onBodyTypeChange: (type: string) => void;
  onBodyChange: (body: any) => void;
  disabled?: boolean;
}

/** 请求体编辑器：支持 JSON/FormData/FormUrlencoded/none */
export default function BodyEditor({
  bodyType, body, onBodyTypeChange, onBodyChange, disabled = false,
}: BodyEditorProps) {
  const renderJsonEditor = () => (
    <Input.TextArea
      value={typeof body === 'string' ? body : (body ? JSON.stringify(body, null, 2) : '')}
      onChange={(e) => {
        const val = e.target.value;
        try {
          onBodyChange(val ? JSON.parse(val) : {});
        } catch {
          onBodyChange(val);
        }
      }}
      rows={8}
      placeholder='{"key": "value"}'
      disabled={disabled}
      style={{ fontFamily: 'monospace', fontSize: 13 }}
    />
  );

  const renderFormDataEditor = () => {
    const entries = body && typeof body === 'object' && !Array.isArray(body)
      ? Object.entries(body) : [];

    return (
      <div>
        {entries.map(([key, value], idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <Input
              value={key}
              placeholder="字段名"
              disabled={disabled}
              style={{ width: 200 }}
              size="small"
            />
            <Input
              value={String(value || '')}
              placeholder="值"
              disabled={disabled}
              style={{ flex: 1 }}
              size="small"
            />
          </div>
        ))}
        {entries.length === 0 && (
          <Input.TextArea
            rows={4}
            placeholder="form-data 格式，每行: 字段名=值"
            disabled={disabled}
          />
        )}
      </div>
    );
  };

  const tabItems = [
    { key: 'none', label: '无', children: <div style={{ color: '#999', padding: 20 }}>无请求体</div> },
    { key: 'json', label: 'JSON', children: renderJsonEditor() },
    { key: 'form-data', label: 'FormData', children: renderFormDataEditor() },
    { key: 'x-www-form-urlencoded', label: 'URL编码', children: renderFormDataEditor() },
  ];

  return (
    <div>
      <Select
        value={bodyType || 'none'}
        onChange={onBodyTypeChange}
        size="small"
        disabled={disabled}
        style={{ width: 200, marginBottom: 8 }}
        options={[
          { value: 'none', label: '无' },
          { value: 'json', label: 'JSON' },
          { value: 'form-data', label: 'FormData' },
          { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
        ]}
      />
      {tabItems.find((t) => t.key === (bodyType || 'none'))?.children || renderJsonEditor()}
    </div>
  );
}
