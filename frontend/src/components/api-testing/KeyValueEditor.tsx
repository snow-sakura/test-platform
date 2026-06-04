'use client';

import { Button, Input, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

interface KeyValuePair {
  key: string;
  value: string;
}

interface Props {
  value?: Record<string, string>;
  onChange?: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

/** 键值对编辑器组件（用于请求头、URL参数、环境变量等） */
export default function KeyValueEditor({
  value = {},
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  disabled = false,
}: Props) {
  const [pairs, setPairs] = useState<KeyValuePair[]>([]);

  useEffect(() => {
    // 将 Record<string,string> 转为 [{key, value}]
    const entries = Object.entries(value || {});
    if (entries.length === 0) {
      setPairs([{ key: '', value: '' }]);
    } else {
      setPairs(entries.map(([k, v]) => ({ key: k, value: v })));
    }
  }, []);

  const notifyChange = (newPairs: KeyValuePair[]) => {
    const result: Record<string, string> = {};
    newPairs.forEach((p) => {
      if (p.key) result[p.key] = p.value;
    });
    onChange?.(result);
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    const newPairs = pairs.map((p, i) => (i === index ? { ...p, [field]: val } : p));
    setPairs(newPairs);
    notifyChange(newPairs);
  };

  const handleAdd = () => {
    const newPairs = [...pairs, { key: '', value: '' }];
    setPairs(newPairs);
  };

  const handleRemove = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    setPairs(newPairs.length === 0 ? [{ key: '', value: '' }] : newPairs);
    notifyChange(newPairs.length === 0 ? [{ key: '', value: '' }] : newPairs);
  };

  return (
    <div>
      {pairs.map((pair, index) => (
        <Space key={index} style={{ display: 'flex', marginBottom: 4, width: '100%' }} align="baseline">
          <Input
            value={pair.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            disabled={disabled}
            style={{ width: 200 }}
            size="small"
          />
          <Input
            value={pair.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            disabled={disabled}
            style={{ width: 300 }}
            size="small"
          />
          {!disabled && (
            <MinusCircleOutlined onClick={() => handleRemove(index)} style={{ color: '#ff4d4f' }} />
          )}
        </Space>
      ))}
      {!disabled && (
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd} size="small" style={{ marginTop: 4 }}>
          添加
        </Button>
      )}
    </div>
  );
}
