import { KeyOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Form,
  message,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { NewTokenRevealModal } from '@/components/new-token-reveal-modal';
import { getTokenColumns } from '@/components/token-columns';
import {
  TokenAppsFormItem,
  TokenCreateModal,
} from '@/components/token-create-modal';
import { API_TOKEN_SCOPE_DESC_KEY } from '@/constants/i18n-keys';
import { API_TOKEN_SCOPES } from '@/constants/token-scopes';
import { api } from '@/services/api';
import type { ApiToken } from '@/types';
import { useAppOptions } from '@/utils/app-options';
import { apiTokenKeys } from '@/utils/query-keys';
import { useIsMobile } from '@/utils/responsive';

const { Paragraph } = Typography;

function ApiTokensPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();
  const permissionMode = Form.useWatch('mode', form) ?? 'classic';

  const { appOptions, appNameById } = useAppOptions({
    enabled: createModalVisible,
  });

  const { data, isLoading } = useQuery({
    queryKey: apiTokenKeys.all(),
    queryFn: api.listApiTokens,
  });

  // 失败提示由 MutationCache 兜底；失败时不关弹窗，让用户改完重试
  const createMutation = useMutation({
    mutationFn: api.createApiToken,
    onSuccess: (result) => {
      if (result?.token) {
        setNewToken(result.token);
        setCreateModalVisible(false);
        message.success(t('api_tokens.create_success'));
        queryClient.invalidateQueries({ queryKey: apiTokenKeys.all() });
        form.resetFields();
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeApiToken,
    onSuccess: () => {
      message.success(t('api_tokens.revoke_success'));
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.all() });
    },
  });

  const handleCreate = (values: {
    name: string;
    mode: 'classic' | 'scoped';
    permissions?: string[];
    scopes?: string[];
    appIds?: number[];
    expiresIn?: number;
  }) => {
    const expiresAt = values.expiresIn
      ? dayjs().add(values.expiresIn, 'day').toISOString()
      : undefined;
    const appIds = values.appIds?.length ? values.appIds : undefined;
    if (values.mode === 'scoped') {
      createMutation.mutate({
        name: values.name,
        scopes: values.scopes,
        appIds,
        expiresAt,
      });
      return;
    }
    createMutation.mutate({
      name: values.name,
      permissions: {
        read: values.permissions?.includes('read'),
        write: values.permissions?.includes('write'),
        delete: values.permissions?.includes('delete'),
      },
      appIds,
      expiresAt,
    });
  };

  const tokenColumns = getTokenColumns<ApiToken>({
    icon: <KeyOutlined />,
    appNameById,
    onRevoke: (id) => revokeMutation.mutate(id),
    texts: {
      colName: t('api_tokens.col_name'),
      revoked: t('api_tokens.revoked'),
      expired: t('api_tokens.expired'),
      colToken: t('api_tokens.col_token'),
      colApps: t('api_tokens.col_apps'),
      allApps: t('api_tokens.all_apps'),
      nApps: (count) => t('api_tokens.n_apps', { count }),
      colExpires: t('api_tokens.col_expires'),
      never: t('api_tokens.never'),
      colLastUsed: t('api_tokens.col_last_used'),
      neverUsed: t('api_tokens.never_used'),
      colAction: t('api_tokens.col_action'),
      revokeTitle: t('api_tokens.revoke_title'),
      revokeDesc: t('api_tokens.revoke_desc'),
      revokeButton: t('api_tokens.revoke_button'),
      yes: t('api_tokens.yes'),
      no: t('api_tokens.no'),
    },
  });

  const columns: ColumnsType<ApiToken> = [
    {
      title: t('api_tokens.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 60,
    },
    tokenColumns.name,
    tokenColumns.tokenSuffix,
    {
      title: t('api_tokens.col_permissions'),
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: ApiToken['permissions'], record: ApiToken) =>
        record.scopes?.length ? (
          <Space wrap size={[4, 4]}>
            {record.scopes.map((scope) => (
              <Tag key={scope} color="geekblue" className="font-mono">
                {scope}
              </Tag>
            ))}
          </Space>
        ) : (
          <Space>
            {permissions?.read && (
              <Tag color="blue">{t('api_tokens.perm_read')}</Tag>
            )}
            {permissions?.write && (
              <Tag color="green">{t('api_tokens.perm_write')}</Tag>
            )}
            {permissions?.delete && (
              <Tag color="red">{t('api_tokens.perm_delete')}</Tag>
            )}
          </Space>
        ),
    },
    tokenColumns.apps,
    tokenColumns.expires,
    tokenColumns.lastUsed,
    {
      title: t('api_tokens.col_created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (createdAt: string) =>
        dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    tokenColumns.action,
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-container p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold">{t('api_tokens.title')}</div>
          <Paragraph type="secondary" className="mb-0 mt-1">
            {t('api_tokens.description_prefix')}{' '}
            <a
              target="_blank"
              href="https://update.reactnative.cn/api/openapi"
              rel="noopener noreferrer"
            >
              {t('api_tokens.pushy_api')}
            </a>
            {t('api_tokens.description_suffix')}
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<KeyOutlined />}
          onClick={() => setCreateModalVisible(true)}
          className="w-full md:w-auto"
        >
          {t('api_tokens.create_token')}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        size={isMobile ? 'small' : 'middle'}
        pagination={false}
        scroll={{ x: 720 }}
      />

      <TokenCreateModal
        title={t('api_tokens.create_modal_title')}
        open={createModalVisible}
        width={520}
        onCancel={() => setCreateModalVisible(false)}
        form={form}
        onFinish={handleCreate}
        loading={createMutation.isPending}
        submitText={t('api_tokens.create_button')}
        nameLabel={t('api_tokens.token_name')}
        nameRequired={t('api_tokens.token_name_required')}
        namePlaceholder={t('api_tokens.token_name_placeholder')}
      >
        <Form.Item
          label={t('api_tokens.mode')}
          name="mode"
          initialValue="classic"
        >
          <Radio.Group
            options={[
              { label: t('api_tokens.mode_classic'), value: 'classic' },
              { label: t('api_tokens.mode_scoped'), value: 'scoped' },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        {permissionMode === 'scoped' && (
          <Form.Item
            label={t('api_tokens.scopes')}
            name="scopes"
            extra={t('api_tokens.scopes_hint')}
            rules={[
              { required: true, message: t('api_tokens.scopes_required') },
            ]}
          >
            <Select
              mode="multiple"
              allowClear
              options={API_TOKEN_SCOPES.map((scope) => ({
                label: `${scope} — ${t(API_TOKEN_SCOPE_DESC_KEY[scope])}`,
                value: scope,
              }))}
            />
          </Form.Item>
        )}
        <TokenAppsFormItem
          label={t('api_tokens.col_apps')}
          extra={t('api_tokens.apps_hint')}
          placeholder={t('api_tokens.all_apps')}
          options={appOptions}
        />
        <Form.Item
          label={t('api_tokens.permissions')}
          name="permissions"
          hidden={permissionMode !== 'classic'}
          rules={[
            {
              required: permissionMode === 'classic',
              message: t('api_tokens.permissions_required'),
            },
          ]}
        >
          <Checkbox.Group>
            <Space direction="vertical">
              <Checkbox value="read">
                <Trans
                  i18nKey="api_tokens.perm_read_desc"
                  components={{ b: <b /> }}
                />
              </Checkbox>
              <Checkbox value="write">
                <Trans
                  i18nKey="api_tokens.perm_write_desc"
                  components={{ b: <b /> }}
                />
              </Checkbox>
              <Checkbox value="delete">
                <Trans
                  i18nKey="api_tokens.perm_delete_desc"
                  components={{ b: <b /> }}
                />
              </Checkbox>
              <div className="text-xs text-gray-500 mt-1">
                {t('api_tokens.perm_note')}
              </div>
            </Space>
          </Checkbox.Group>
        </Form.Item>
        <Form.Item
          label={t('api_tokens.expiration')}
          name="expiresIn"
          initialValue={180}
        >
          <Select
            options={[
              { value: 0, label: t('api_tokens.exp_never') },
              { value: 30, label: t('api_tokens.exp_30') },
              { value: 90, label: t('api_tokens.exp_90') },
              { value: 180, label: t('api_tokens.exp_180') },
              { value: 360, label: t('api_tokens.exp_360') },
            ]}
          />
        </Form.Item>
      </TokenCreateModal>

      <NewTokenRevealModal
        token={newToken}
        onClose={() => setNewToken(null)}
        width={520}
        title={t('api_tokens.created_title')}
        okText={t('api_tokens.created_ok')}
        warning={t('api_tokens.created_warning')}
        copyText={t('api_tokens.copy_button')}
        copiedText={t('api_tokens.copied')}
      />
    </div>
  );
}

export const Component = ApiTokensPage;
