import { CopyOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '@/services/admin-api';
import { api } from '@/services/api';

const { Title } = Typography;

export const Component = () => {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminApp | null>(null);
  const [form] = Form.useForm();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminApps', debouncedSearch],
    queryFn: () => adminApi.searchApps(debouncedSearch || undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminApp> }) =>
      adminApi.updateApp(id, data),
    onSuccess: () => {
      message.success('应用信息已更新');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminApps'] });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const handleEdit = (record: AdminApp) => {
    setEditingApp(record);
    form.setFieldsValue({
      name: record.name,
      appKey: record.appKey,
      platform: record.platform,
      userId: record.userId,
      downloadUrl: record.downloadUrl || '',
      status: record.status || '',
      ignoreBuildTime: record.ignoreBuildTime,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!editingApp) return;

      const updateData: Partial<AdminApp> = {
        name: values.name,
        appKey: values.appKey || undefined,
        platform: values.platform,
        userId: values.userId || null,
        downloadUrl: values.downloadUrl || null,
        status: values.status || null,
        ignoreBuildTime: values.ignoreBuildTime || null,
      };

      updateMutation.mutate({ id: editingApp.id, data: updateData });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: 'App Key',
      dataIndex: 'appKey',
      key: 'appKey',
      width: 200,
      render: (key: string) => (
        <Space>
          <span className="font-mono text-xs">{key}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(key);
              message.success('已复制');
            }}
          />
        </Space>
      ),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 80,
      render: (platform: string) => (
        <span className={
          platform === 'ios' ? 'text-blue-600' :
          platform === 'android' ? 'text-green-600' : 'text-orange-600'
        }>
          {platform}
        </span>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string | null) => status || '-',
    },
    {
      title: '忽略构建时间',
      dataIndex: 'ignoreBuildTime',
      key: 'ignoreBuildTime',
      width: 120,
      render: (v: string | null) => (
        <span className={v === 'enabled' ? 'text-green-600' : ''}>
          {v === 'enabled' ? '是' : v === 'disabled' ? '否' : '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AdminApp) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <Title level={4} className="m-0!">
            应用管理
          </Title>
          <Input
            placeholder="搜索应用名称或 App Key"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            className="w-full md:w-72"
          />
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        title={`编辑应用: ${editingApp?.name}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            保存
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item name="name" label="名称" className="mb-0!" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="appKey" label="App Key" className="mb-0!">
              <Input placeholder="留空保持不变" />
            </Form.Item>
            <Form.Item name="platform" label="平台" className="mb-0!">
              <Select
                options={[
                  { value: 'ios', label: 'iOS' },
                  { value: 'android', label: 'Android' },
                  { value: 'harmony', label: 'HarmonyOS' },
                ]}
              />
            </Form.Item>
            <Form.Item name="userId" label="用户ID" className="mb-0!">
              <Input type="number" placeholder="留空表示无归属" />
            </Form.Item>
            <Form.Item name="downloadUrl" label="下载链接" className="mb-0!">
              <Input placeholder="应用商店链接" />
            </Form.Item>
            <Form.Item name="status" label="状态" className="mb-0!">
              <Input placeholder="自定义状态" />
            </Form.Item>
            <Form.Item name="ignoreBuildTime" label="忽略构建时间" className="mb-0!">
              <Select
                allowClear
                options={[
                  { value: 'enabled', label: '启用' },
                  { value: 'disabled', label: '禁用' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
