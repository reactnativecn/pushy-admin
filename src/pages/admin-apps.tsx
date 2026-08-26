import {
  CopyOutlined,
  EditOutlined,
  LineChartOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { UserDetailDrawer } from '@/components/user-detail-drawer';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';
import type { AdminApp } from '@/types';
import { adminKeys } from '@/utils/query-keys';
import { useModalWidth } from '@/utils/responsive';
import {
  getTablePagination,
  parseOptionalPositiveInt,
  usePageClamp,
  useUrlTableState,
} from '@/utils/table-state';
import {
  FILTER_KEYS,
  normalizeFilter,
  parsePlatformFilter,
  parseStatusFilter,
  SORTABLE_COLUMNS,
} from './admin-apps.logic';

const { Title } = Typography;

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tableState = useUrlTableState({
    sortableColumns: SORTABLE_COLUMNS,
    filterKeys: FILTER_KEYS,
    normalizeFilter,
  });
  const {
    searchParams,
    isMobile,
    page: currentPage,
    pageSize,
    searchQuery,
    searchInput,
    setSearchInput,
    orderBy,
    order,
    sortOrderOf,
    handleTableChange,
  } = tableState;
  const modalWidth = useModalWidth(600);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [editingApp, setEditingApp] = useState<AdminApp | null>(null);
  const [form] = Form.useForm();

  const platformFilter = parsePlatformFilter(searchParams.get('platform'));
  const statusFilter = parseStatusFilter(searchParams.get('status'));
  const userIdFilter = parseOptionalPositiveInt(searchParams.get('userId'));

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      ...adminKeys.apps(searchQuery, currentPage, pageSize),
      platformFilter,
      statusFilter,
      userIdFilter,
      orderBy,
      order,
    ],
    queryFn: () =>
      adminApi.searchApps({
        search: searchQuery || undefined,
        platform: platformFilter,
        status: statusFilter,
        userId: userIdFilter,
        orderBy,
        order,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      }),
    // 翻页/筛选切换期间保留上一份数据,total 不会瞬间归零
    placeholderData: keepPreviousData,
  });

  const total = data?.count ?? data?.data.length ?? 0;
  usePageClamp(tableState, total, data !== undefined && !isPlaceholderData);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminApp> }) =>
      adminApi.updateApp(id, data),
    onSuccess: () => {
      message.success(t('admin_apps.app_updated'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.apps() });
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
    let values: Record<string, any>;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败时表单已内联提示,不再额外弹 toast
      return;
    }
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
  };

  const copyAppKey = async (key: string) => {
    // 非安全上下文没有 clipboard,写入也可能被权限拒绝,失败要告诉用户
    try {
      await navigator.clipboard.writeText(key);
      message.success(t('admin_apps.copied'));
    } catch {
      message.error(t('admin_apps.copy_failed'));
    }
  };

  const columns: ColumnsType<AdminApp> = [
    {
      title: t('admin_apps.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 80,
      sorter: true,
      sortOrder: sortOrderOf('id'),
    },
    {
      title: t('admin_apps.col_name'),
      dataIndex: 'name',
      key: 'name',
      width: 150,
      sorter: true,
      sortOrder: sortOrderOf('name'),
    },
    {
      title: t('admin_apps.col_app_key'),
      dataIndex: 'appKey',
      key: 'appKey',
      width: 220,
      sorter: true,
      sortOrder: sortOrderOf('appKey'),
      render: (key: string) => (
        <Space wrap size={[4, 8]}>
          <span className="font-mono text-xs break-all">{key}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyAppKey(key)}
          />
        </Space>
      ),
    },
    {
      title: t('admin_apps.col_platform'),
      dataIndex: 'platform',
      key: 'platform',
      width: 110,
      sorter: true,
      sortOrder: sortOrderOf('platform'),
      filterMultiple: false,
      filters: [
        { text: 'iOS', value: 'ios' },
        { text: 'Android', value: 'android' },
        { text: 'HarmonyOS', value: 'harmony' },
      ],
      filteredValue: platformFilter ? [platformFilter] : null,
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
      width: 120,
      sorter: true,
      sortOrder: sortOrderOf('userId'),
      // 用户 id 的取值是开放的,用输入框而不是枚举列表来筛选。
      filteredValue: userIdFilter ? [String(userIdFilter)] : null,
      filterIcon: (filtered: boolean) => (
        <SearchOutlined className={filtered ? 'text-blue-500' : undefined} />
      ),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div className="p-2">
          <Input
            type="number"
            placeholder={t('admin_apps.filter_user_id_placeholder')}
            value={selectedKeys[0] as string | undefined}
            onChange={(event) =>
              setSelectedKeys(event.target.value ? [event.target.value] : [])
            }
            onPressEnter={() => confirm()}
            // 输入框里的按键不该冒泡到下拉面板的键盘导航上
            onKeyDown={(event) => event.stopPropagation()}
            className="mb-2 block w-40"
          />
          <Space>
            <Button type="primary" size="small" onClick={() => confirm()}>
              {t('admin_apps.filter_confirm')}
            </Button>
            <Button
              size="small"
              onClick={() => {
                clearFilters?.();
                confirm();
              }}
            >
              {t('admin_apps.filter_reset')}
            </Button>
          </Space>
        </div>
      ),
      render: (userId: number | null) =>
        userId ? (
          <Button
            type="link"
            className="p-0!"
            onClick={() => {
              setViewingUserId(userId);
              setIsDetailOpen(true);
            }}
          >
            {userId}
          </Button>
        ) : (
          '-'
        ),
    },
    {
      title: t('admin_apps.col_status'),
      dataIndex: 'status',
      key: 'status',
      responsive: ['md'],
      width: 100,
      sorter: true,
      sortOrder: sortOrderOf('status'),
      filterMultiple: false,
      filters: [
        { text: t('admin_apps.status_normal'), value: 'normal' },
        { text: t('admin_apps.status_paused'), value: 'paused' },
      ],
      filteredValue: statusFilter ? [statusFilter] : null,
      render: (status: string | null) =>
        status === 'paused' ? (
          <span className="text-orange-500">
            {t('admin_apps.status_paused')}
          </span>
        ) : status === 'normal' ? (
          <span className="text-green-600">
            {t('admin_apps.status_normal')}
          </span>
        ) : (
          status || '-'
        ),
    },
    {
      title: t('admin_apps.col_ignore_build_time'),
      dataIndex: 'ignoreBuildTime',
      key: 'ignoreBuildTime',
      responsive: ['lg'],
      width: 140,
      sorter: true,
      sortOrder: sortOrderOf('ignoreBuildTime'),
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
      sorter: true,
      sortOrder: sortOrderOf('createdAt'),
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
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
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
            onChange={handleTableChange}
            pagination={getTablePagination(tableState, total, (count) =>
              t('admin_apps.apps_count', { count }),
            )}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <UserDetailDrawer
        userId={viewingUserId}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isMobile={isMobile}
      />

      <Modal
        title={t('admin_apps.edit_title', { name: editingApp?.name ?? '' })}
        open={isModalOpen}
        width={modalWidth}
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
