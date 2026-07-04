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
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';
import type { AdminApp } from '@/types';
import { patchSearchParams } from '@/utils/helper';
import { adminKeys } from '@/utils/query-keys';

const { Title } = Typography;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const Component = () => {
  const { t } = useTranslation();
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
    queryKey: adminKeys.apps(searchQuery, currentPage, pageSize),
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
      message.success(t('admin_apps.app_updated'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.apps() });
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
      title: t('admin_apps.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 60,
    },
    {
      title: t('admin_apps.col_name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: t('admin_apps.col_app_key'),
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
              message.success(t('admin_apps.copied'));
            }}
          />
        </Space>
      ),
    },
    {
      title: t('admin_apps.col_platform'),
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
      title: t('admin_apps.col_checks'),
      dataIndex: 'checkCount',
      key: 'checkCount',
      responsive: ['md'],
      width: 100,
      render: (value: number | undefined) => (value ?? 0).toLocaleString(),
    },
    {
      title: t('admin_apps.col_user_id'),
      dataIndex: 'userId',
      key: 'userId',
      responsive: ['lg'],
      width: 80,
    },
    {
      title: t('admin_apps.col_status'),
      dataIndex: 'status',
      key: 'status',
      responsive: ['md'],
      width: 80,
      render: (status: string | null) => status || '-',
    },
    {
      title: t('admin_apps.col_ignore_build_time'),
      dataIndex: 'ignoreBuildTime',
      key: 'ignoreBuildTime',
      responsive: ['lg'],
      width: 120,
      render: (value: string | null) => (
        <span className={value === 'enabled' ? 'text-green-600' : ''}>
          {value === 'enabled'
            ? t('admin_apps.ignore_build_yes')
            : value === 'disabled'
              ? t('admin_apps.ignore_build_no')
              : '-'}
        </span>
      ),
    },
    {
      title: t('admin_apps.col_created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      width: 160,
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('admin_apps.col_actions'),
      key: 'action',
      width: isMobile ? 136 : 220,
      render: (_value, record) => (
        <Space size={[0, 0]} wrap>
          <Link to={rootRouterPath.versions(String(record.id))}>
            <Button type="link" icon={<LinkOutlined />}>
              {t('admin_apps.open')}
            </Button>
          </Link>
          <Link
            to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
              appKey: record.appKey,
            }).toString()}`}
          >
            <Button type="link" icon={<LineChartOutlined />}>
              {t('admin_apps.metrics')}
            </Button>
          </Link>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('admin_apps.edit')}
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
              {t('admin_apps.title')}
            </Title>
            <div className="text-sm text-gray-500">
              {t('admin_apps.description')}
            </div>
          </div>
          <Input
            placeholder={t('admin_apps.search_placeholder')}
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
              showTotal: isMobile
                ? undefined
                : (count) => t('admin_apps.apps_count', { count }),
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
        title={t('admin_apps.edit_title', { name: editingApp?.name ?? '' })}
        open={isModalOpen}
        width={isMobile ? 'calc(100vw - 32px)' : 600}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            {t('admin_apps.cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            {t('admin_apps.save')}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item
              name="name"
              label={t('admin_apps.form_name')}
              className="mb-0!"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="appKey"
              label={t('admin_apps.col_app_key')}
              className="mb-0!"
            >
              <Input placeholder={t('admin_apps.placeholder_keep')} />
            </Form.Item>
            <Form.Item
              name="platform"
              label={t('admin_apps.form_platform')}
              className="mb-0!"
            >
              <Select
                options={[
                  { value: 'ios', label: 'iOS' },
                  { value: 'android', label: 'Android' },
                  { value: 'harmony', label: 'HarmonyOS' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="userId"
              label={t('admin_apps.form_user_id')}
              className="mb-0!"
            >
              <Input
                type="number"
                placeholder={t('admin_apps.placeholder_no_owner')}
              />
            </Form.Item>
            <Form.Item
              name="downloadUrl"
              label={t('admin_apps.form_download_url')}
              className="mb-0!"
            >
              <Input placeholder={t('admin_apps.placeholder_store')} />
            </Form.Item>
            <Form.Item
              name="status"
              label={t('admin_apps.form_status')}
              className="mb-0!"
            >
              <Input placeholder={t('admin_apps.placeholder_status')} />
            </Form.Item>
            <Form.Item
              name="ignoreBuildTime"
              label={t('admin_apps.form_ignore_build_time')}
              className="mb-0!"
            >
              <Select
                allowClear
                options={[
                  {
                    value: 'enabled',
                    label: t('admin_apps.ignore_build_enabled'),
                  },
                  {
                    value: 'disabled',
                    label: t('admin_apps.ignore_build_disabled'),
                  },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
