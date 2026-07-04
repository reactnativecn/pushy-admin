import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
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
import type { Tier } from '@/types';
import { patchSearchParams } from '@/utils/helper';

const { Title } = Typography;

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

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    queryKey: ['adminUsers', searchQuery],
    queryFn: () => adminApi.searchUsers(searchQuery || undefined),
  });

  const total = data?.data.length ?? 0;
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
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

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

  const columns: ColumnsType<AdminUser> = [
    {
      title: t('admin_users.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 80,
    },
    {
      title: t('admin_users.col_email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('admin_users.col_name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('admin_users.col_status'),
      dataIndex: 'status',
      key: 'status',
      responsive: ['sm'],
      width: 100,
      render: (status: string) => (
        <span
          className={status === 'normal' ? 'text-green-600' : 'text-orange-500'}
        >
          {status === 'normal'
            ? t('admin_users.status_normal')
            : t('admin_users.status_unverified')}
        </span>
      ),
    },
    {
      title: t('admin_users.col_tier'),
      dataIndex: 'tier',
      key: 'tier',
      responsive: ['sm'],
      width: 120,
      render: (tier: string) => tierLabelMap.get(tier) || tier || '-',
    },
    {
      title: t('admin_users.col_tier_expires'),
      dataIndex: 'tierExpiresAt',
      key: 'tierExpiresAt',
      responsive: ['lg'],
      width: 180,
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
      width: 80,
      render: (_value, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          {t('admin_users.edit')}
        </Button>
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
              onChange: (page, nextPageSize) => {
                patchSearchParams(setSearchParams, {
                  page: String(page),
                  pageSize: String(nextPageSize),
                });
              },
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
    </div>
  );
};
