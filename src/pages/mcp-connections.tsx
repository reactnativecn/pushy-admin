import { ApiOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewTokenRevealModal } from '@/components/new-token-reveal-modal';
import { getTokenColumns } from '@/components/token-columns';
import {
  TokenAppsFormItem,
  TokenCreateModal,
} from '@/components/token-create-modal';
import { MCP_SCOPE_DESC_KEY } from '@/constants/i18n-keys';
import { MCP_SCOPES } from '@/constants/token-scopes';
import { api } from '@/services/api';
import { resolveApiBaseUrl } from '@/services/request';
import type { McpToken } from '@/types';
import { useAppOptions } from '@/utils/app-options';
import { useCustomBaseUrl } from '@/utils/endpoint';
import { endpointKeys, mcpTokenKeys } from '@/utils/query-keys';
import { useIsMobile } from '@/utils/responsive';

const DEFAULT_SCOPES = ['pushy:apps:read', 'pushy:diagnose'];
// 服务端硬上限 365 天,不传默认 90 天
const EXPIRY_OPTIONS = [30, 90, 180, 365];

const { Paragraph, Text } = Typography;

function McpConnectionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();
  const customBaseUrl = useCustomBaseUrl();
  // 端点必须跟请求走同一个基址(切换端点/自部署时才正确)；
  // resolveApiBaseUrl 内部已优先取自定义端点，key 里带上它只为切换后重新解析
  const { data: apiBase = '' } = useQuery({
    queryKey: endpointKeys.apiBase(customBaseUrl),
    queryFn: () => resolveApiBaseUrl(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { appOptions, appNameById } = useAppOptions({
    enabled: createModalVisible,
  });

  const { data, isLoading } = useQuery({
    queryKey: mcpTokenKeys.all(),
    queryFn: api.listMcpTokens,
  });

  // 失败提示由 MutationCache 兜底；失败时不关弹窗，让用户改完重试
  const createMutation = useMutation({
    mutationFn: api.createMcpToken,
    onSuccess: (result) => {
      if (result?.token) {
        setNewToken(result.token);
        setCreateModalVisible(false);
        message.success(t('mcp.create_success'));
        queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all() });
        form.resetFields();
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeMcpToken,
    onSuccess: () => {
      message.success(t('mcp.revoke_success'));
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all() });
    },
  });

  const handleCreate = (values: {
    name: string;
    clientId: string;
    scopes?: string[];
    appIds?: number[];
    expiresIn: number;
  }) => {
    createMutation.mutate({
      name: values.name,
      clientId: values.clientId,
      scopes: values.scopes?.length ? values.scopes : undefined,
      appIds: values.appIds?.length ? values.appIds : undefined,
      expiresAt: dayjs().add(values.expiresIn, 'day').toISOString(),
    });
  };

  const tokenColumns = getTokenColumns<McpToken>({
    icon: <ApiOutlined />,
    appNameById,
    onRevoke: (id) => revokeMutation.mutate(id),
    expiresFormat: 'YYYY-MM-DD',
    allAppsTagColor: 'orange',
    texts: {
      colName: t('mcp.col_name'),
      revoked: t('mcp.revoked'),
      expired: t('mcp.expired'),
      colToken: t('mcp.col_token'),
      colApps: t('mcp.col_apps'),
      allApps: t('mcp.all_apps'),
      nApps: (count) => t('mcp.n_apps', { count }),
      colExpires: t('mcp.col_expires'),
      never: t('mcp.never'),
      colLastUsed: t('mcp.col_last_used'),
      neverUsed: t('mcp.never_used'),
      colAction: t('mcp.col_action'),
      revokeTitle: t('mcp.revoke_title'),
      revokeDesc: t('mcp.revoke_desc'),
      revokeButton: t('mcp.revoke_button'),
      yes: t('mcp.yes'),
      no: t('mcp.no'),
    },
  });

  const columns: ColumnsType<McpToken> = [
    tokenColumns.name,
    {
      title: t('mcp.col_client'),
      dataIndex: 'clientId',
      key: 'clientId',
      responsive: ['md'],
      render: (clientId: string) => (
        <span className="font-mono text-xs">{clientId}</span>
      ),
    },
    tokenColumns.tokenSuffix,
    {
      title: t('mcp.col_scopes'),
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: string[]) => (
        <Space wrap size={[4, 4]}>
          {scopes.map((scope) => (
            <Tag key={scope} color="geekblue" className="font-mono">
              {scope}
            </Tag>
          ))}
        </Space>
      ),
    },
    tokenColumns.apps,
    tokenColumns.expires,
    tokenColumns.lastUsed,
    tokenColumns.action,
  ];

  const endpoint = apiBase ? `${apiBase.replace(/\/$/, '')}/mcp` : '';

  return (
    <div className="rounded-lg border border-slate-200 bg-container p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold">{t('mcp.title')}</div>
          <Paragraph type="secondary" className="mb-0 mt-1">
            {t('mcp.description')}{' '}
            <a
              target="_blank"
              href="https://pushy.reactnative.cn/docs/mcp"
              rel="noopener noreferrer"
            >
              {t('mcp.docs_link')}
            </a>
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<ApiOutlined />}
          onClick={() => setCreateModalVisible(true)}
          className="w-full md:w-auto"
        >
          {t('mcp.create_token')}
        </Button>
      </div>

      <Alert
        type="info"
        showIcon
        className="mb-4"
        message={t('mcp.endpoint_label')}
        description={
          <Space direction="vertical" size={4} className="w-full">
            <Text copyable className="font-mono text-xs break-all">
              {endpoint}
            </Text>
            <Text type="secondary" className="text-xs">
              {t('mcp.privacy_notice')}
            </Text>
          </Space>
        }
      />

      <Table
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        size={isMobile ? 'small' : 'middle'}
        pagination={false}
        scroll={{ x: 860 }}
      />

      <TokenCreateModal
        title={t('mcp.create_modal_title')}
        open={createModalVisible}
        width={560}
        onCancel={() => setCreateModalVisible(false)}
        form={form}
        onFinish={handleCreate}
        loading={createMutation.isPending}
        submitText={t('mcp.create_button')}
        nameLabel={t('mcp.token_name')}
        nameRequired={t('mcp.token_name_required')}
        namePlaceholder={t('mcp.token_name_placeholder')}
      >
        <Form.Item
          label={t('mcp.client_id')}
          name="clientId"
          extra={t('mcp.client_id_hint')}
          rules={[{ required: true, message: t('mcp.client_id_required') }]}
        >
          <Input placeholder="claude-desktop" maxLength={64} />
        </Form.Item>
        <Form.Item
          label={t('mcp.scopes')}
          name="scopes"
          initialValue={DEFAULT_SCOPES}
          extra={t('mcp.scopes_hint')}
          rules={[{ required: true, message: t('mcp.scopes_required') }]}
        >
          <Select
            mode="multiple"
            allowClear
            options={MCP_SCOPES.map((scope) => ({
              label: `${scope} — ${t(MCP_SCOPE_DESC_KEY[scope])}`,
              value: scope,
            }))}
          />
        </Form.Item>
        <TokenAppsFormItem
          label={t('mcp.col_apps')}
          extra={t('mcp.apps_hint')}
          placeholder={t('mcp.all_apps')}
          options={appOptions}
        />
        <Form.Item
          label={t('mcp.expiration')}
          name="expiresIn"
          initialValue={90}
          extra={t('mcp.expiration_hint')}
        >
          <Select
            options={EXPIRY_OPTIONS.map((days) => ({
              value: days,
              label: t('mcp.exp_days', { count: days }),
            }))}
          />
        </Form.Item>
      </TokenCreateModal>

      <NewTokenRevealModal
        token={newToken}
        onClose={() => setNewToken(null)}
        width={560}
        title={t('mcp.created_title')}
        okText={t('mcp.created_ok')}
        warning={t('mcp.created_warning')}
        copyText={t('mcp.copy_button')}
        copiedText={t('mcp.copied')}
      >
        <Paragraph type="secondary" className="mt-4 mb-1">
          {t('mcp.client_config_hint')}
        </Paragraph>
        <Input.TextArea
          readOnly
          autoSize
          className="font-mono text-xs"
          value={JSON.stringify(
            {
              mcpServers: {
                pushy: {
                  type: 'http',
                  url: endpoint,
                  headers: { Authorization: `Bearer ${newToken ?? ''}` },
                },
              },
            },
            null,
            2,
          )}
        />
      </NewTokenRevealModal>
    </div>
  );
}

export const Component = McpConnectionsPage;
