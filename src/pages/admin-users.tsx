import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
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
  DatePicker,
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
import { UserDetailDrawer } from '@/components/user-detail-drawer';
import JsonEditor from '@/pages/manage/components/json-editor';
import { adminApi } from '@/services/admin-api';
import type { AdminUser, Quota, Tier } from '@/types';
import { adminKeys } from '@/utils/query-keys';
import { useModalWidth } from '@/utils/responsive';
import {
  getTablePagination,
  usePageClamp,
  useUrlTableState,
} from '@/utils/table-state';
import {
  defaultPremiumQuotaText,
  expiryShortcutDays,
  FILTER_KEYS,
  getExtendedTierExpiry,
  getInitialQuotaValue,
  getTierOptions,
  parseQuotaInput,
  SORTABLE_COLUMNS,
  statusMeta,
} from './admin-users.logic';

const { Title } = Typography;

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tableState = useUrlTableState({
    sortableColumns: SORTABLE_COLUMNS,
    filterKeys: FILTER_KEYS,
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
  const editModalWidth = useModalWidth(600);
  const bulkModalWidth = useModalWidth(560);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkPreview, setBulkPreview] = useState<{
    matched: number;
    sample: Array<{
      id: number;
      email: string;
      dormantMarkedAt: string | null;
    }>;
  } | null>(null);
  const [form] = Form.useForm();
  const [quotaValue, setQuotaValue] = useState('');

  const tierOptions = getTierOptions(t);
  const tierLabelMap = new Map(
    tierOptions.map((option) => [option.value, option.label]),
  );

  const statusFilter = searchParams.get('status') ?? undefined;
  const tierFilter = searchParams.get('tier') ?? undefined;

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: [
      ...adminKeys.users(searchQuery),
      statusFilter,
      tierFilter,
      orderBy,
      order,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      adminApi.searchUsers({
        search: searchQuery || undefined,
        status: statusFilter,
        tier: tierFilter,
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
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminUser> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      message.success(t('admin_users.user_updated'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: (result) => {
      message.success(t('admin_users.user_deleted', { email: result.email }));
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  const bulkPreviewMutation = useMutation({
    mutationFn: (minDormantDays: number) =>
      adminApi.bulkDeleteDormant({ minDormantDays, dryRun: true }),
    onSuccess: (r) => {
      setBulkPreview({ matched: r.matched ?? 0, sample: r.sample ?? [] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (minDormantDays: number) =>
      adminApi.bulkDeleteDormant({ minDormantDays, dryRun: false }),
    onSuccess: (r) => {
      message.success(t('admin_users.bulk_deleted', { count: r.deleted ?? 0 }));
      setBulkOpen(false);
      setBulkPreview(null);
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  const handleDelete = (record: { id: number; email: string }) => {
    Modal.confirm({
      title: t('admin_users.delete_confirm_title', { email: record.email }),
      content: t('admin_users.delete_confirm_desc'),
      okText: t('admin_users.delete'),
      okButtonProps: { danger: true },
      cancelText: t('admin_users.cancel'),
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id);
        if (viewingUserId === record.id) {
          setIsDetailOpen(false);
        }
      },
    });
  };

  const handleEdit = (record: AdminUser) => {
    setEditingUser(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      tier: record.tier,
      status: record.status,
      tierExpiresAt: record.tierExpiresAt ? dayjs(record.tierExpiresAt) : null,
    });
    setQuotaValue(getInitialQuotaValue(record));
    setIsModalOpen(true);
  };

  const handleTierChange = (tier: Tier) => {
    if (tier === 'custom' && !quotaValue.trim()) {
      setQuotaValue(defaultPremiumQuotaText);
    }
  };

  const handleSave = async () => {
    let values: Record<string, any>;
    try {
      values = await form.validateFields();
    } catch {
      // 校验失败时表单已内联提示,不再额外弹 toast
      return;
    }
    if (!editingUser) return;

    const updateData: Partial<AdminUser> = {
      name: values.name,
      email: values.email,
      tier: values.tier,
      status: values.status,
      tierExpiresAt: values.tierExpiresAt
        ? values.tierExpiresAt.toISOString()
        : null,
    };

    const parsedQuota = parseQuotaInput(quotaValue);
    if (!parsedQuota) {
      message.error(t('admin_users.invalid_quota'));
      return;
    }
    updateData.quota = parsedQuota.quota;

    updateMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const handleExtendTierExpiry = (
    days: (typeof expiryShortcutDays)[number],
  ) => {
    form.setFieldValue(
      'tierExpiresAt',
      getExtendedTierExpiry(form.getFieldValue('tierExpiresAt'), days),
    );
  };

  const handleResetTierExpiry = () => {
    form.setFieldValue(
      'tierExpiresAt',
      editingUser?.tierExpiresAt ? dayjs(editingUser.tierExpiresAt) : null,
    );
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: t('admin_users.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 80,
      sorter: true,
      sortOrder: sortOrderOf('id'),
    },
    {
      title: t('admin_users.col_email'),
      dataIndex: 'email',
      key: 'email',
      sorter: true,
      sortOrder: sortOrderOf('email'),
    },
    {
      title: t('admin_users.col_name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderOf('name'),
    },
    {
      title: t('admin_users.col_status'),
      dataIndex: 'status',
      key: 'status',
      responsive: ['sm'],
      width: 110,
      sorter: true,
      sortOrder: sortOrderOf('status'),
      filterMultiple: false,
      filters: [
        { text: t('admin_users.status_normal'), value: 'normal' },
        { text: t('admin_users.status_unverified'), value: 'unverified' },
        { text: t('admin_users.status_dormant'), value: 'dormant' },
      ],
      filteredValue: statusFilter ? [statusFilter] : null,
      render: (status: string | null) => {
        const meta = statusMeta(status, t);
        return <span className={meta.cls}>{meta.label}</span>;
      },
    },
    {
      title: t('admin_users.col_tier'),
      dataIndex: 'tier',
      key: 'tier',
      responsive: ['sm'],
      width: 120,
      sorter: true,
      sortOrder: sortOrderOf('tier'),
      filterMultiple: false,
      filters: tierOptions.map((option) => ({
        text: option.label,
        value: option.value,
      })),
      filteredValue: tierFilter ? [tierFilter] : null,
      render: (tier: string) => tierLabelMap.get(tier) || tier || '-',
    },
    {
      title: t('admin_users.col_created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      width: 160,
      sorter: true,
      sortOrder: sortOrderOf('createdAt'),
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: t('admin_users.col_tier_expires'),
      dataIndex: 'tierExpiresAt',
      key: 'tierExpiresAt',
      responsive: ['lg'],
      width: 160,
      sorter: true,
      sortOrder: sortOrderOf('tierExpiresAt'),
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('admin_users.col_custom_quota'),
      dataIndex: 'quota',
      key: 'quota',
      responsive: ['md'],
      width: 100,
      render: (quota: Quota | null) =>
        quota ? t('admin_users.has_quota') : '-',
    },
    {
      title: t('admin_users.col_actions'),
      key: 'action',
      width: 210,
      render: (_value, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingUserId(record.id);
              setIsDetailOpen(true);
            }}
          >
            {t('admin_users.view')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('admin_users.edit')}
          </Button>
          {(record.status === 'dormant' || record.status === 'unverified') && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={
                deleteMutation.isPending &&
                deleteMutation.variables === record.id
              }
              onClick={() => handleDelete(record)}
            >
              {t('admin_users.delete')}
            </Button>
          )}
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
              {t('admin_users.title')}
            </Title>
            <div className="text-sm text-gray-500">
              {t('admin_users.description')}
            </div>
          </div>
          <Space wrap>
            {statusFilter === 'dormant' && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => setBulkOpen(true)}
              >
                {t('admin_users.bulk_cleanup')}
              </Button>
            )}
            <Input
              placeholder={t('admin_users.search_placeholder')}
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              allowClear
              className="w-full md:w-72"
            />
          </Space>
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            size={isMobile ? 'small' : 'middle'}
            onChange={handleTableChange}
            pagination={getTablePagination(tableState, total, (count) =>
              t('admin_users.users_count', { count }),
            )}
            scroll={{ x: 760 }}
          />
        </Spin>
      </Card>

      <Modal
        title={t('admin_users.edit_title', { email: editingUser?.email })}
        open={isModalOpen}
        width={editModalWidth}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            {t('admin_users.cancel')}
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            {t('admin_users.save')}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item
              name="name"
              label={t('admin_users.form_name')}
              className="mb-0!"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label={t('admin_users.form_email')}
              className="mb-0!"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="tier"
              label={t('admin_users.form_tier')}
              className="mb-0!"
            >
              <Select
                options={tierOptions}
                optionFilterProp="label"
                showSearch
                onChange={handleTierChange}
              />
            </Form.Item>
            <Form.Item
              name="status"
              label={t('admin_users.form_status')}
              className="mb-0!"
            >
              <Select
                options={[
                  {
                    value: 'normal',
                    label: t('admin_users.form_status_normal'),
                  },
                  {
                    value: 'unverified',
                    label: t('admin_users.form_status_unverified'),
                  },
                  {
                    value: 'dormant',
                    label: t('admin_users.form_status_dormant'),
                  },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t('admin_users.form_tier_expires')}
              className="mb-0!"
            >
              <Space direction="vertical" size="small" className="w-full">
                <Form.Item name="tierExpiresAt" noStyle>
                  <DatePicker showTime className="w-full" />
                </Form.Item>
                <Space wrap size={[8, 8]}>
                  {expiryShortcutDays.map((days) => (
                    <Button
                      key={days}
                      size="small"
                      onClick={() => handleExtendTierExpiry(days)}
                    >
                      {t('admin_users.expiry_plus_days', { days })}
                    </Button>
                  ))}
                  <Button size="small" onClick={handleResetTierExpiry}>
                    {t('admin_users.reset')}
                  </Button>
                </Space>
              </Space>
            </Form.Item>
            <Form.Item
              label={t('admin_users.custom_quota_label')}
              className="mb-0!"
            >
              <JsonEditor
                // 编辑器只会撑满它的直接容器,高度要透传到内层 div
                className={`${isMobile ? 'h-[180px]' : 'h-[200px]'} [&>div:last-child]:h-full`}
                content={{ text: quotaValue }}
                onChange={(content) => {
                  setQuotaValue(
                    'text' in content
                      ? content.text
                      : JSON.stringify(content.json, null, 2),
                  );
                }}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      <UserDetailDrawer
        userId={viewingUserId}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isMobile={isMobile}
        onDelete={handleDelete}
        isDeleting={
          deleteMutation.isPending && deleteMutation.variables === viewingUserId
        }
      />

      {/* 批量清理休眠用户:先预览计数,确认后真删(不可逆) */}
      <Modal
        title={t('admin_users.bulk_cleanup')}
        open={bulkOpen}
        onCancel={() => {
          setBulkOpen(false);
          setBulkPreview(null);
        }}
        footer={null}
        width={bulkModalWidth}
      >
        <Space direction="vertical" size="middle" className="w-full">
          <div className="text-sm text-gray-500">
            {t('admin_users.bulk_desc')}
          </div>
          <Space>
            <span>{t('admin_users.bulk_min_days')}</span>
            <Select
              value={bulkDays}
              onChange={(v) => {
                setBulkDays(v);
                setBulkPreview(null);
              }}
              options={[7, 30, 60, 90, 180].map((d) => ({
                value: d,
                label: `${d}`,
              }))}
              style={{ width: 100 }}
            />
            <Button
              onClick={() => bulkPreviewMutation.mutate(bulkDays)}
              loading={bulkPreviewMutation.isPending}
            >
              {t('admin_users.bulk_preview')}
            </Button>
          </Space>

          {bulkPreview && (
            <>
              <div>
                {t('admin_users.bulk_matched', { count: bulkPreview.matched })}
              </div>
              {bulkPreview.sample.length > 0 && (
                <Table
                  size="small"
                  dataSource={bulkPreview.sample}
                  rowKey="id"
                  pagination={false}
                  scroll={{ y: 200 }}
                  columns={[
                    {
                      title: t('admin_users.col_email'),
                      dataIndex: 'email',
                      key: 'email',
                    },
                    {
                      title: t('admin_users.dormant_marked_at'),
                      dataIndex: 'dormantMarkedAt',
                      key: 'dormantMarkedAt',
                      render: (v: string | null) =>
                        v ? dayjs(v).format('YYYY-MM-DD') : '-',
                    },
                  ]}
                />
              )}
              <Button
                danger
                type="primary"
                block
                disabled={bulkPreview.matched === 0}
                loading={bulkDeleteMutation.isPending}
                onClick={() =>
                  Modal.confirm({
                    title: t('admin_users.bulk_confirm_title', {
                      count: bulkPreview.matched,
                    }),
                    content: t('admin_users.delete_confirm_desc'),
                    okText: t('admin_users.delete'),
                    okButtonProps: { danger: true },
                    cancelText: t('admin_users.cancel'),
                    onOk: () => bulkDeleteMutation.mutateAsync(bulkDays),
                  })
                }
              >
                {t('admin_users.bulk_delete_now', {
                  count: bulkPreview.matched,
                })}
              </Button>
            </>
          )}
        </Space>
      </Modal>
    </div>
  );
};
