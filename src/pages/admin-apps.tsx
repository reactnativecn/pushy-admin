import {
  CopyOutlined,
  EditOutlined,
  LineChartOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';
import { patchSearchParams } from '@/utils/helper';

const { Title } = Typography;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const Component = () => {
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminApp | null>(null);
  const [form] = Form.useForm();

  const searchQuery = searchParams.get('search')?.trim() ?? '';
  const currentPage = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    isMobile ? 10 : 20,
  );
  const [searchKeyword, setSearchKeyword] = useState(searchQuery);

  useEffect(() => {
    setSearchKeyword(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmedKeyword = searchKeyword.trim();
    if (trimmedKeyword === searchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      patchSearchParams(setSearchParams, {
        search: trimmedKeyword || undefined,
        page: '1',
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchKeyword, searchQuery, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminApps', searchQuery, currentPage, pageSize],
    queryFn: () =>
      adminApi.searchApps({
        search: searchQuery || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      }),
  });

  const total = data?.count ?? data?.data.length ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (currentPage > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [currentPage, maxPage, setSearchParams]);

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

  const columns: ColumnsType<AdminApp> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
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
      width: 220,
      render: (key: string) => (
        <Space wrap size={[4, 8]}>
          <span className="font-mono text-xs break-all">{key}</span>
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
        <span
          className={
            platform === 'ios'
              ? 'text-blue-600'
              : platform === 'android'
                ? 'text-green-600'
                : 'text-orange-600'
          }
        >
          {platform}
        </span>
      ),
    },
    {
      title: '检查次数',
      dataIndex: 'checkCount',
      key: 'checkCount',
      responsive: ['md'],
      width: 100,
      render: (value: number | undefined) => (value ?? 0).toLocaleString(),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      responsive: ['lg'],
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      responsive: ['md'],
      width: 80,
      render: (status: string | null) => status || '-',
    },
    {
      title: '忽略构建时间',
      dataIndex: 'ignoreBuildTime',
      key: 'ignoreBuildTime',
      responsive: ['lg'],
      width: 120,
      render: (value: string | null) => (
        <span className={value === 'enabled' ? 'text-green-600' : ''}>
          {value === 'enabled' ? '是' : value === 'disabled' ? '否' : '-'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      width: 160,
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 136 : 220,
      render: (_value, record) => (
        <Space size={[0, 0]} wrap>
          <Link to={rootRouterPath.versions(String(record.id))}>
            <Button type="link" icon={<LinkOutlined />}>
              打开
            </Button>
          </Link>
          <Link
            to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
              appKey: record.appKey,
            }).toString()}`}
          >
            <Button type="link" icon={<LineChartOutlined />}>
              实时数据
            </Button>
          </Link>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0!">
              应用管理
            </Title>
            <div className="text-sm text-gray-500">
              搜索条件会保留在 URL 中，刷新后仍然能回到同一视图。
            </div>
          </div>
          <Input
            placeholder="搜索应用名称或 App Key"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            allowClear
            className="w-full md:w-72"
          />
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            size={isMobile ? 'small' : 'middle'}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              simple: isMobile,
              showQuickJumper: !isMobile,
              showSizeChanger: !isMobile,
              showTotal: isMobile ? undefined : (count) => `共 ${count} 个应用`,
              onChange: (page, nextPageSize) => {
                patchSearchParams(setSearchParams, {
                  page: String(page),
                  pageSize: String(nextPageSize),
                });
              },
            }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        title={`编辑应用: ${editingApp?.name}`}
        open={isModalOpen}
        width={isMobile ? 'calc(100vw - 32px)' : 600}
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
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item
              name="name"
              label="名称"
              className="mb-0!"
              rules={[{ required: true }]}
            >
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
            <Form.Item
              name="ignoreBuildTime"
              label="忽略构建时间"
              className="mb-0!"
            >
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
