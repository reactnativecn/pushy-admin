import { CopyOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
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
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import type { ApiToken } from '@/types';
import { apiTokenKeys } from '@/utils/query-keys';

const { Paragraph } = Typography;

function ApiTokensPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: apiTokenKeys.all(),
    queryFn: api.listApiTokens,
  });

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
    onError: (error: Error) => {
      message.error(error.message || t('api_tokens.create_failed'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeApiToken,
    onSuccess: () => {
      message.success(t('api_tokens.revoke_success'));
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.all() });
    },
    onError: (error: Error) => {
      message.error(error.message || t('api_tokens.revoke_failed'));
    },
  });

  const handleCreate = async (values: {
    name: string;
    permissions: string[];
    expiresIn?: number;
  }) => {
    const permissions = {
      read: values.permissions?.includes('read'),
      write: values.permissions?.includes('write'),
      delete: values.permissions?.includes('delete'),
    };
    const expiresAt = values.expiresIn
      ? dayjs().add(values.expiresIn, 'day').toISOString()
      : undefined;
    await createMutation.mutateAsync({
      name: values.name,
      permissions,
      expiresAt,
    });
  };

  const columns: ColumnsType<ApiToken> = [
    {
      title: t('api_tokens.col_id'),
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
      width: 60,
    },
    {
      title: t('api_tokens.col_name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiToken) => (
        <Space wrap size={[4, 8]}>
          <KeyOutlined />
          {name}
          {record.isRevoked && <Tag color="red">{t('api_tokens.revoked')}</Tag>}
          {record.isExpired && !record.isRevoked && (
            <Tag color="orange">{t('api_tokens.expired')}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('api_tokens.col_token'),
      dataIndex: 'tokenSuffix',
      key: 'tokenSuffix',
      render: (tokenSuffix: string) => (
        <span className="font-mono text-xs text-gray-500 break-all">
          ****{tokenSuffix}
        </span>
      ),
    },
    {
      title: t('api_tokens.col_permissions'),
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: ApiToken['permissions']) => (
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
    {
      title: t('api_tokens.col_expires'),
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      responsive: ['sm'],
      render: (expiresAt: string | null) =>
        expiresAt
          ? dayjs(expiresAt).format('YYYY-MM-DD HH:mm')
          : t('api_tokens.never'),
    },
    {
      title: t('api_tokens.col_last_used'),
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      responsive: ['lg'],
      render: (lastUsedAt: string | null) =>
        lastUsedAt
          ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm')
          : t('api_tokens.never_used'),
    },
    {
      title: t('api_tokens.col_created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (createdAt: string) =>
        dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('api_tokens.col_action'),
      key: 'action',
      render: (_: unknown, record: ApiToken) => (
        <Popconfirm
          title={t('api_tokens.revoke_title')}
          description={t('api_tokens.revoke_desc')}
          onConfirm={() => revokeMutation.mutate(record.id)}
          okText={t('api_tokens.yes')}
          cancelText={t('api_tokens.no')}
          disabled={record.isRevoked}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.isRevoked}
          >
            {t('api_tokens.revoke_button')}
          </Button>
        </Popconfirm>
      ),
    },
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

      <Modal
        title={t('api_tokens.create_modal_title')}
        open={createModalVisible}
        width={isMobile ? 'calc(100vw - 32px)' : 520}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label={t('api_tokens.token_name')}
            name="name"
            rules={[
              { required: true, message: t('api_tokens.token_name_required') },
            ]}
          >
            <Input
              placeholder={t('api_tokens.token_name_placeholder')}
              maxLength={100}
            />
          </Form.Item>
          <Form.Item
            label={t('api_tokens.permissions')}
            name="permissions"
            rules={[
              { required: true, message: t('api_tokens.permissions_required') },
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
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              block
            >
              {t('api_tokens.create_button')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('api_tokens.created_title')}
        open={!!newToken}
        width={isMobile ? 'calc(100vw - 32px)' : 520}
        onOk={() => setNewToken(null)}
        onCancel={() => setNewToken(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText={t('api_tokens.created_ok')}
      >
        <div className="my-4">
          <Paragraph type="warning" className="mb-2">
            {t('api_tokens.created_warning')}
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
                message.success(t('api_tokens.copied'));
              }
            }}
          >
            {t('api_tokens.copy_button')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export const Component = ApiTokensPage;
