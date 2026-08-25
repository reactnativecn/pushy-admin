import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import JsonEditor from '@/pages/manage/components/json-editor';
import { adminApi } from '@/services/admin-api';
import { adminKeys } from '@/utils/query-keys';
import { useIsMobile, useModalWidth } from '@/utils/responsive';

const { Title } = Typography;

interface ConfigItem {
  key: string;
  value: string;
}

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const modalWidth = useModalWidth(700);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [form] = Form.useForm();
  const [jsonValue, setJsonValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: adminKeys.config(),
    queryFn: () => adminApi.getConfig(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.setConfig(key, value),
    onSuccess: () => {
      message.success(t('admin_config.saved'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => adminApi.deleteConfig(key),
    onSuccess: () => {
      message.success(t('admin_config.deleted'));
      queryClient.invalidateQueries({ queryKey: adminKeys.config() });
    },
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
    let values: Record<string, any>;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败时表单已内联提示,不再额外弹 toast
      return;
    }

    // 先校验 JSON,再以压缩后的字符串提交
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(jsonValue);
    } catch {
      message.error(t('admin_config.invalid_json'));
      return;
    }

    saveMutation.mutate({
      key: values.key,
      value: JSON.stringify(parsedValue),
    });
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
            onConfirm={() => deleteMutation.mutate(record.key)}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === record.key
              }
            />
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
        width={modalWidth}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            {t('admin_config.cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
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
            <JsonEditor
              // 编辑器只会撑满它的直接容器,高度要透传到内层 div
              className={`${isMobile ? 'h-[220px]' : 'h-[300px]'} [&>div:last-child]:h-full`}
              content={{ text: jsonValue }}
              onChange={(content) => {
                setJsonValue(
                  'text' in content
                    ? content.text
                    : JSON.stringify(content.json, null, 2),
                );
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
