'use client';

import { Button, Input, Select } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

interface BodyEditorProps {
  bodyType: string;
  body: any;
  onBodyTypeChange: (type: string) => void;
  onBodyChange: (body: any) => void;
  disabled?: boolean;
}

/** Request body editor: supports JSON/FormData/FormUrlencoded/none */
export default function BodyEditor({
  bodyType, body, onBodyTypeChange, onBodyChange, disabled = false,
}: BodyEditorProps) {
  const t = useTranslations('apiTesting');
  const tc = useTranslations('common');
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
    const entries: [string, unknown][] = body && typeof body === 'object' && !Array.isArray(body)
      ? Object.entries(body) : [];

    const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
      const list = entries.map(([k, v], i) => {
        if (i !== idx) return [k, v] as [string, unknown];
        if (field === 'key') return [val, v] as [string, unknown];
        return [k, val] as [string, unknown];
      });
      const result: Record<string, string> = {};
      list.forEach(([k, v]) => { if (k) result[k] = String(v || ''); });
      onBodyChange(result);
    };

    const addEntry = () => {
      const result = { ...(body as Record<string, unknown> || {}), '': '' };
      onBodyChange(result);
    };

    const removeEntry = (idx: number) => {
      const list = entries.filter((_, i) => i !== idx);
      const result: Record<string, string> = {};
      list.forEach(([k, v]) => { if (k) result[k] = String(v || ''); });
      onBodyChange(result);
    };

    return (
      <div>
        {entries.map(([key, value], idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <Input
              value={key}
              onChange={(e) => updateEntry(idx, 'key', e.target.value)}
              placeholder={t('interface.paramName')}
              disabled={disabled}
              style={{ width: 200 }}
              size="small"
            />
            <Input
              value={String(value || '')}
              onChange={(e) => updateEntry(idx, 'value', e.target.value)}
              placeholder={t('interface.paramValue')}
              disabled={disabled}
              style={{ flex: 1 }}
              size="small"
            />
            {!disabled && (
              <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeEntry(idx)} />
            )}
          </div>
        ))}
        {!disabled && (
          <Button type="dashed" icon={<PlusOutlined />} onClick={addEntry} size="small" style={{ marginTop: 4 }}>
            {t('interface.addField')}
          </Button>
        )}
      </div>
    );
  };

  const editors: Record<string, () => React.ReactNode> = {
    none: () => <div style={{ color: '#999', padding: 20 }}>{t('interface.noBody')}</div>,
    json: renderJsonEditor,
    'form-data': renderFormDataEditor,
    'x-www-form-urlencoded': renderFormDataEditor,
  };

  return (
    <div>
      <Select
        value={bodyType || 'none'}
        onChange={onBodyTypeChange}
        size="small"
        disabled={disabled}
        style={{ width: 200, marginBottom: 8 }}
        options={[
          { value: 'none', label: 'None' },
          { value: 'json', label: 'JSON' },
          { value: 'form-data', label: 'FormData' },
          { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
        ]}
      />
      <div style={{ marginTop: 8 }}>
        {(editors[bodyType || 'none'] || renderJsonEditor)()}
      </div>
    </div>
  );
}
