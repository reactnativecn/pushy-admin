import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { JSONEditor, type Content, type OnChange } from 'vanilla-jsoneditor';
import { adminApi } from '@/services/admin-api';

const { Title } = Typography;

interface ConfigItem {
  key: string;
  value: string;
}

// JSON Editor wrapper component
const JsonEditorWrapper = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const handleChange: OnChange = (
        content: Content,
        _previousContent: Content,
        { contentErrors },
      ) => {
        if (!contentErrors) {
          if ('json' in content && content.json !== undefined) {
            onChange(JSON.stringify(content.json, null, 2));
          } else if ('text' in content) {
            onChange(content.text);
          }
        }
      };

      editorRef.current = new JSONEditor({
        target: containerRef.current,
        props: {
          content: { text: value },
          onChange: handleChange,
          mode: 'text',
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.update({ text: value });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height: 300 }} />;
};

export const Component = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [form] = Form.useForm();
  const [jsonValue, setJsonValue] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminConfig'],
    queryFn: () => adminApi.getConfig(),
  });

  const configList: ConfigItem[] = data?.data
    ? Object.entries(data.data).map(([key, value]) => ({ key, value }))
    : [];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setJsonValue('');
    setIsModalOpen(true);
  };

  const handleEdit = (record: ConfigItem) => {
    setEditingItem(record);
    form.setFieldsValue({ key: record.key });
    // Pretty print JSON if possible
    try {
      setJsonValue(JSON.stringify(JSON.parse(record.value), null, 2));
    } catch {
      setJsonValue(record.value);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const key = values.key;

      // Validate JSON and submit a compact string
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(jsonValue);
      } catch {
        message.error('请输入有效的 JSON 格式');
        return;
      }

      const compactValue = JSON.stringify(parsedValue);
      await adminApi.setConfig(key, compactValue);
      message.success('保存成功');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminConfig'] });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        await adminApi.deleteConfig(key);
        message.success('已删除');
        refetch();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
    [refetch],
  );

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 200,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return (
            <pre className="m-0 max-h-24 overflow-auto text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          return <span className="text-gray-600">{value}</span>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: ConfigItem) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此配置？"
            onConfirm={() => handleDelete(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="m-0!">
            动态配置管理
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加配置
          </Button>
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={configList}
            columns={columns}
            rowKey="key"
            pagination={false}
          />
        </Spin>
      </Card>

      <Modal
        title={editingItem ? '编辑配置' : '添加配置'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            保存
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="Key"
            rules={[{ required: true, message: '请输入配置键名' }]}
          >
            <Input disabled={!!editingItem} placeholder="配置键名" />
          </Form.Item>
          <Form.Item label="Value (JSON)">
            <JsonEditorWrapper value={jsonValue} onChange={setJsonValue} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
