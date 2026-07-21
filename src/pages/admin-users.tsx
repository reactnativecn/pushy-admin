import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
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
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  type Content,
  createJSONEditor,
  Mode,
  type OnChange,
} from 'vanilla-jsoneditor';
import { quotas } from '@/constants/quotas';
import { adminApi } from '@/services/admin-api';
import type { AdminUser, Quota, Tier } from '@/types';
import { patchSearchParams } from '@/utils/helper';
import { adminKeys } from '@/utils/query-keys';

const { Title } = Typography;

const SORTABLE_COLUMNS = new Set([
  'id',
  'email',
  'name',
  'createdAt',
  'tier',
  'status',
  'tierExpiresAt',
]);

const statusMeta = (
  status: string | null | undefined,
  t: (key: string) => string,
) => {
  if (status === 'unverified') {
    return {
      cls: 'text-orange-500',
      label: t('admin_users.status_unverified'),
    };
  }
  if (status === 'dormant') {
    return { cls: 'text-gray-400', label: t('admin_users.status_dormant') };
  }
  return { cls: 'text-green-600', label: t('admin_users.status_normal') };
};

const getTierOptions = (t: (key: string) => string) => [
  { value: 'free', label: t('admin_users.tier_free') },
  { value: 'standard', label: t('admin_users.tier_standard') },
  { value: 'premium', label: t('admin_users.tier_premium') },
  { value: 'pro', label: t('admin_users.tier_pro') },
  { value: 'vip1', label: t('admin_users.tier_vip1') },
  { value: 'vip2', label: t('admin_users.tier_vip2') },
  { value: 'vip3', label: t('admin_users.tier_vip3') },
  { value: 'custom', label: t('admin_users.tier_custom') },
];

const defaultPremiumQuotaText = JSON.stringify(quotas.premium, null, 2);
const expiryShortcutDays = [7, 30, 365] as const;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getInitialQuotaValue = (record: AdminUser) => {
  if (record.quota) {
    return JSON.stringify(record.quota, null, 2);
  }

  return record.tier === 'custom' ? defaultPremiumQuotaText : '';
};

const JsonEditorWrapper = ({
  height = 200,
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

const UserDetailDrawer = ({
  userId,
  open,
  onClose,
  isMobile,
}: {
  userId: number | null;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.userDetail(userId),
    queryFn: () => (userId ? adminApi.getUserDetail(userId) : null),
    enabled: !!userId && open,
  });

  const translate = (key: string) => t(key);

  const detail = data;

  return (
    <Drawer
      title={translate('admin_users.detail_title')}
      width={isMobile ? '100%' : 720}
      onClose={onClose}
      open={open}
      destroyOnHidden
    >
      <Spin spinning={isLoading}>
        {detail && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions
              title={translate('admin_users.basic_info')}
              bordered
              column={2}
            >
              <Descriptions.Item label="ID">{detail.user.id}</Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_name')}>
                {detail.user.name}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_email')}
                span={2}
              >
                {detail.user.email}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_status')}>
                <Badge
                  status={
                    detail.user.status === 'normal'
                      ? 'success'
                      : detail.user.status === 'dormant'
                        ? 'default'
                        : 'warning'
                  }
                  text={
                    detail.user.status === 'normal'
                      ? translate('admin_users.status_normal')
                      : detail.user.status === 'dormant'
                        ? translate('admin_users.status_dormant')
                        : translate('admin_users.status_unverified')
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_tier')}>
                {detail.user.tier}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.col_tier_expires')}
                span={2}
              >
                {detail.user.tierExpiresAt
                  ? dayjs(detail.user.tierExpiresAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.col_created')}>
                {detail.user.createdAt
                  ? dayjs(detail.user.createdAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.last_operation')}
              >
                {detail.activity?.lastOperationAt
                  ? dayjs(detail.activity.lastOperationAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.dormant_marked_at')}
                span={2}
              >
                {detail.activity?.dormantMarkedAt
                  ? dayjs(detail.activity.dormantMarkedAt).format(
                      'YYYY-MM-DD HH:mm',
                    )
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title={translate('admin_users.quota_usage')}
              bordered
              column={2}
            >
              <Descriptions.Item label={translate('admin_users.pv_limit')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.limit.pv,
                })}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.today_used')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.todayUsed,
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.today_remaining')}
              >
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.todayRemaining,
                })}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.avg_7_days')}>
                {t('admin_users.checks_value', {
                  value: detail.quotaDetail.last7Days.avg,
                })}
              </Descriptions.Item>
              <Descriptions.Item
                label={translate('admin_users.last_7_days_details')}
                span={2}
              >
                {detail.quotaDetail.last7Days.counts
                  .slice()
                  .reverse()
                  .map((c, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ordered day list, index is the stable identity
                    <span key={i} className="mr-3 inline-block">
                      {t('admin_users.day_label', { day: i + 1 })}:{' '}
                      <strong>{c}</strong>
                    </span>
                  ))}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.app_limit')}>
                {detail.apps.length} / {detail.quotaDetail.limit.app}
              </Descriptions.Item>
              <Descriptions.Item label={translate('admin_users.package_limit')}>
                {t('admin_users.packages_value', {
                  value: detail.quotaDetail.limit.package,
                })}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div
                className="ant-descriptions-title"
                style={{ marginBottom: 12 }}
              >
                {translate('admin_users.apps_and_packages')}
              </div>
              <Collapse>
                {detail.apps.map((app) => (
                  <Collapse.Panel
                    key={app.id}
                    header={
                      <div className="flex w-full justify-between pr-4 items-center">
                        <span>
                          <strong>{app.name}</strong> ({app.platform})
                        </span>
                        <Space size="middle">
                          <span>
                            PV: <strong>{app.checkCount}</strong>
                          </span>
                          <span>
                            {translate('admin_users.packages_count')}:{' '}
                            <strong>{app.packagesCount}</strong>
                          </span>
                        </Space>
                      </div>
                    }
                  >
                    <Space direction="vertical" className="w-full">
                      <div className="text-xs text-gray-500 mb-2">
                        App Key: <code>{app.appKey}</code>
                      </div>
                      <Table
                        dataSource={app.packages}
                        rowKey="id"
                        pagination={{ pageSize: 5, size: 'small' }}
                        size="small"
                        columns={[
                          {
                            title: 'ID',
                            dataIndex: 'id',
                            key: 'id',
                            width: 60,
                          },
                          {
                            title: translate('admin_users.pkg_name'),
                            dataIndex: 'name',
                            key: 'name',
                          },
                          {
                            title: 'Hash',
                            dataIndex: 'hash',
                            key: 'hash',
                            width: 100,
                            render: (h: string) => (
                              <code className="text-xs">{h.slice(0, 8)}</code>
                            ),
                          },
                          {
                            title: 'Build',
                            key: 'build',
                            render: (_, r) =>
                              `${r.buildNumber || '-'}(${r.buildTime || '-'})`,
                          },
                          {
                            title: translate('admin_users.col_status'),
                            dataIndex: 'status',
                            key: 'status',
                            width: 80,
                          },
                          {
                            title: translate('admin_users.col_note'),
                            dataIndex: 'note',
                            key: 'note',
                          },
                        ]}
                      />
                    </Space>
                  </Collapse.Panel>
                ))}
              </Collapse>
            </div>
          </Space>
        )}
      </Spin>
    </Drawer>
  );
};

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();
  const [quotaValue, setQuotaValue] = useState('');

  const tierOptions = getTierOptions(t);
  const tierLabelMap = new Map(
    tierOptions.map((option) => [option.value, option.label]),
  );

  const searchQuery = searchParams.get('search')?.trim() ?? '';
  const currentPage = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    isMobile ? 10 : 20,
  );
  const statusFilter = searchParams.get('status') ?? undefined;
  const tierFilter = searchParams.get('tier') ?? undefined;
  const orderByParam = searchParams.get('orderBy') ?? undefined;
  const orderBy =
    orderByParam && SORTABLE_COLUMNS.has(orderByParam)
      ? orderByParam
      : undefined;
  const order =
    searchParams.get('order') === 'asc' ? 'asc' : orderBy ? 'desc' : undefined;
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
  });

  const total = data?.count ?? data?.data.length ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (currentPage > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [currentPage, maxPage, setSearchParams]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminUser> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      message.success(t('admin_users.user_updated'));
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: (result) => {
      message.success(t('admin_users.user_deleted', { email: result.email }));
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const handleDelete = (record: AdminUser) => {
    Modal.confirm({
      title: t('admin_users.delete_confirm_title', { email: record.email }),
      content: t('admin_users.delete_confirm_desc'),
      okText: t('admin_users.delete'),
      okButtonProps: { danger: true },
      cancelText: t('admin_users.cancel'),
      onOk: () => deleteMutation.mutateAsync(record.id),
    });
  };

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<AdminUser> | SorterResult<AdminUser>[],
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const field =
      single?.order && typeof single.field === 'string'
        ? single.field
        : undefined;
    patchSearchParams(setSearchParams, {
      page: String(pagination.current ?? 1),
      pageSize: String(pagination.pageSize ?? pageSize),
      status: (filters.status?.[0] as string | undefined) || undefined,
      tier: (filters.tier?.[0] as string | undefined) || undefined,
      orderBy: field && SORTABLE_COLUMNS.has(field) ? field : undefined,
      order:
        field && single?.order
          ? single.order === 'ascend'
            ? 'asc'
            : 'desc'
          : undefined,
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
    try {
      const values = await form.validateFields();
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

      if (quotaValue.trim()) {
        try {
          updateData.quota = JSON.parse(quotaValue);
        } catch {
          message.error(t('admin_users.invalid_quota'));
          return;
        }
      } else {
        updateData.quota = null;
      }

      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleExtendTierExpiry = (
    days: (typeof expiryShortcutDays)[number],
  ) => {
    const currentValue = form.getFieldValue('tierExpiresAt');
    const currentExpiry = currentValue ? dayjs(currentValue) : null;
    const baseDate = currentExpiry?.isValid() ? currentExpiry : dayjs();

    form.setFieldValue('tierExpiresAt', baseDate.add(days, 'day'));
  };

  const handleResetTierExpiry = () => {
    form.setFieldValue(
      'tierExpiresAt',
      editingUser?.tierExpiresAt ? dayjs(editingUser.tierExpiresAt) : null,
    );
  };

  const sortOrderOf = (field: string) =>
    orderBy === field ? (order === 'asc' ? 'ascend' : 'descend') : undefined;

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
          <Input
            placeholder={t('admin_users.search_placeholder')}
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
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              simple: isMobile,
              showQuickJumper: !isMobile,
              showSizeChanger: !isMobile,
              showTotal: isMobile
                ? undefined
                : (count) => t('admin_users.users_count', { count }),
            }}
            scroll={{ x: 760 }}
          />
        </Spin>
      </Card>

      <Modal
        title={t('admin_users.edit_title', { email: editingUser?.email })}
        open={isModalOpen}
        width={isMobile ? 'calc(100vw - 32px)' : 600}
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
              <JsonEditorWrapper
                height={isMobile ? 180 : 200}
                value={quotaValue}
                onChange={setQuotaValue}
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
      />
    </div>
  );
};
