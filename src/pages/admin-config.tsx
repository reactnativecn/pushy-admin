import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type Content,
  createJSONEditor,
  Mode,
  type OnChange,
} from 'vanilla-jsoneditor';
import { adminApi } from '@/services/admin-api';
import { adminKeys } from '@/utils/query-keys';

const { Title } = Typography;

interface ConfigItem {
  key: string;
  value: string;
}

// JSON Editor wrapper component
const JsonEditorWrapper = ({
  height = 300,
  value,
  onChange,
}: {
  height?: number;
  value: string;
  onChange: (value: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: create the editor only once
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

      editorRef.current = createJSONEditor({
        target: containerRef.current,
        props: {
          content: { text: value },
          onChange: handleChange,
          mode: Mode.text,
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
      editorRef.current.updateProps({ content: { text: value } });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height }} />;
};

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [form] = Form.useForm();
  const [jsonValue, setJsonValue] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: adminKeys.config(),
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
        message.error(t('admin_config.invalid_json'));
        return;
      }

      const compactValue = JSON.stringify(parsedValue);
      await adminApi.setConfig(key, compactValue);
      message.success(t('admin_config.saved'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await adminApi.deleteConfig(key);
      message.success(t('admin_config.deleted'));
      refetch();
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns: ColumnsType<ConfigItem> = [
    {
      title: t('admin_config.col_key'),
      dataIndex: 'key',
      key: 'key',
      width: 200,
    },
    {
      title: t('admin_config.col_value'),
      dataIndex: 'value',
      key: 'value',
      responsive: ['sm'],
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
      title: t('admin_config.col_action'),
      key: 'action',
      width: 150,
      render: (_: unknown, record: ConfigItem) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            {t('admin_config.edit')}
          </Button>
          <Popconfirm
            title={t('admin_config.delete_title')}
            onConfirm={() => handleDelete(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <Title level={4} className="m-0!">
            {t('admin_config.title')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className="w-full md:w-auto"
          >
            {t('admin_config.add_config')}
          </Button>
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={configList}
            columns={columns}
            rowKey="key"
            size={isMobile ? 'small' : 'middle'}
            pagination={false}
            scroll={{ x: 720 }}
          />
        </Spin>
      </Card>

      <Modal
        title={
          editingItem
            ? t('admin_config.edit_modal_title')
            : t('admin_config.add_modal_title')
        }
        open={isModalOpen}
        width={isMobile ? 'calc(100vw - 32px)' : 700}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            {t('admin_config.cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            {t('admin_config.save')}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label={t('admin_config.col_key')}
            rules={[
              { required: true, message: t('admin_config.key_required') },
            ]}
          >
            <Input
              disabled={!!editingItem}
              placeholder={t('admin_config.key_placeholder')}
            />
          </Form.Item>
          <Form.Item label={t('admin_config.value_label')}>
            <JsonEditorWrapper
              height={isMobile ? 220 : 300}
              value={jsonValue}
              onChange={setJsonValue}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
