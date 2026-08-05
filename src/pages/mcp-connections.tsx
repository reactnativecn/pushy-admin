import { ApiOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  useQuery as useAppsQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  Button,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { resolveApiBaseUrl } from '@/services/request';
import type { McpToken } from '@/types';
import { useCustomBaseUrl } from '@/utils/endpoint';
import { appKeys, mcpTokenKeys } from '@/utils/query-keys';

// 只列出当前真有工具支撑的 scope;服务端 ALL_MCP_SCOPES 比这里宽,
// 新工具上线时再把对应项加进来。
const MCP_SCOPES = ['pushy:apps:read', 'pushy:diagnose'] as const;

const DEFAULT_SCOPES = ['pushy:apps:read', 'pushy:diagnose'];
// 服务端硬上限 365 天,不传默认 90 天
const EXPIRY_OPTIONS = [30, 90, 180, 365];

const { Paragraph, Text } = Typography;

function McpConnectionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();
  const customBaseUrl = useCustomBaseUrl();
  // 端点必须跟请求走同一个基址(切换端点/自部署时才正确)
  const [apiBase, setApiBase] = useState('');
  useEffect(() => {
    let cancelled = false;
    // 自定义端点优先;直接读它,依赖数组才是真的(否则 lint 认为多余)
    const resolving = customBaseUrl
      ? Promise.resolve(customBaseUrl)
      : resolveApiBaseUrl();
    resolving.then((base) => {
      if (!cancelled) {
        setApiBase(base);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customBaseUrl]);

  const { data: appsData } = useAppsQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled: createModalVisible,
  });
  const appOptions = (appsData?.data ?? []).map((app) => ({
    label: app.name,
    value: app.id,
  }));
  const appNameById = new Map(appOptions.map((o) => [o.value, o.label]));

  const { data, isLoading } = useQuery({
    queryKey: mcpTokenKeys.all(),
    queryFn: api.listMcpTokens,
  });

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
    onError: (error: Error) => {
      message.error(error.message || t('mcp.create_failed'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeMcpToken,
    onSuccess: () => {
      message.success(t('mcp.revoke_success'));
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all() });
    },
    onError: (error: Error) => {
      message.error(error.message || t('mcp.revoke_failed'));
    },
  });

  const handleCreate = async (values: {
    name: string;
    clientId: string;
    scopes?: string[];
    appIds?: number[];
    expiresIn: number;
  }) => {
    await createMutation.mutateAsync({
      name: values.name,
      clientId: values.clientId,
      scopes: values.scopes?.length ? values.scopes : undefined,
      appIds: values.appIds?.length ? values.appIds : undefined,
      expiresAt: dayjs().add(values.expiresIn, 'day').toISOString(),
    });
  };

  const columns: ColumnsType<McpToken> = [
    {
      title: t('mcp.col_name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: McpToken) => (
        <Space wrap size={[4, 8]}>
          <ApiOutlined />
          {name}
          {record.isRevoked && <Tag color="red">{t('mcp.revoked')}</Tag>}
          {record.isExpired && !record.isRevoked && (
            <Tag color="orange">{t('mcp.expired')}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('mcp.col_client'),
      dataIndex: 'clientId',
      key: 'clientId',
      responsive: ['md'],
      render: (clientId: string) => (
        <span className="font-mono text-xs">{clientId}</span>
      ),
    },
    {
      title: t('mcp.col_token'),
      dataIndex: 'tokenSuffix',
      key: 'tokenSuffix',
      render: (tokenSuffix: string) => (
        <span className="font-mono text-xs text-gray-500 break-all">
          ****{tokenSuffix}
        </span>
      ),
    },
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
    {
      title: t('mcp.col_apps'),
      dataIndex: 'appIds',
      key: 'appIds',
      responsive: ['md'],
      render: (appIds: McpToken['appIds']) =>
        appIds?.length ? (
          <Tooltip
            title={appIds
              .map((id) => appNameById.get(id) ?? `#${id}`)
              .join(', ')}
          >
            <Tag color="blue">{t('mcp.n_apps', { count: appIds.length })}</Tag>
          </Tooltip>
        ) : (
          <Tag color="orange">{t('mcp.all_apps')}</Tag>
        ),
    },
    {
      title: t('mcp.col_expires'),
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      responsive: ['sm'],
      render: (expiresAt: string | null) =>
        expiresAt ? dayjs(expiresAt).format('YYYY-MM-DD') : t('mcp.never'),
    },
    {
      title: t('mcp.col_last_used'),
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      responsive: ['lg'],
      render: (lastUsedAt: string | null) =>
        lastUsedAt
          ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm')
          : t('mcp.never_used'),
    },
    {
      title: t('mcp.col_action'),
      key: 'action',
      render: (_: unknown, record: McpToken) => (
        <Popconfirm
          title={t('mcp.revoke_title')}
          description={t('mcp.revoke_desc')}
          onConfirm={() => revokeMutation.mutate(record.id)}
          okText={t('mcp.yes')}
          cancelText={t('mcp.no')}
          disabled={record.isRevoked}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.isRevoked}
          >
            {t('mcp.revoke_button')}
          </Button>
        </Popconfirm>
      ),
    },
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

      <Modal
        title={t('mcp.create_modal_title')}
        open={createModalVisible}
        width={isMobile ? 'calc(100vw - 32px)' : 560}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label={t('mcp.token_name')}
            name="name"
            rules={[{ required: true, message: t('mcp.token_name_required') }]}
          >
            <Input
              placeholder={t('mcp.token_name_placeholder')}
              maxLength={100}
            />
          </Form.Item>
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
                label: `${scope} — ${t(`mcp.scope_${scope.replace(/[:.]/g, '_')}`)}`,
                value: scope,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={t('mcp.col_apps')}
            name="appIds"
            extra={t('mcp.apps_hint')}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('mcp.all_apps')}
              options={appOptions}
            />
          </Form.Item>
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
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              block
            >
              {t('mcp.create_button')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('mcp.created_title')}
        open={!!newToken}
        width={isMobile ? 'calc(100vw - 32px)' : 560}
        onOk={() => setNewToken(null)}
        onCancel={() => setNewToken(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText={t('mcp.created_ok')}
      >
        <div className="my-4">
          <Paragraph type="warning" className="mb-2">
            {t('mcp.created_warning')}
          </Paragraph>
          <Input.TextArea
            value={newToken || ''}
            readOnly
            autoSize={{ minRows: 2 }}
            className="font-mono"
          />
          <Button
            icon={<CopyOutlined />}
            className="mt-2 w-full sm:w-auto"
            block={isMobile}
            onClick={() => {
              if (newToken) {
                navigator.clipboard.writeText(newToken);
                message.success(t('mcp.copied'));
              }
            }}
          >
            {t('mcp.copy_button')}
          </Button>
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
        </div>
      </Modal>
    </div>
  );
}

export const Component = McpConnectionsPage;
