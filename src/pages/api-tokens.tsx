import { KeyOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  message,
  Modal,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

const { Paragraph } = Typography;

function ApiTokensPage() {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['apiTokens'],
    queryFn: api.listApiTokens,
  });

  const createMutation = useMutation({
    mutationFn: api.createApiToken,
    onSuccess: (result) => {
      if (result?.token) {
        setNewToken(result.token);
        setCreateModalVisible(false);
        message.success('API Token 创建成功');
        queryClient.invalidateQueries({ queryKey: ['apiTokens'] });
        form.resetFields();
      }
    },
    onError: (error: Error) => {
      message.error(error.message || '创建失败');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeApiToken,
    onSuccess: () => {
      message.success('Token 已撤销');
      queryClient.invalidateQueries({ queryKey: ['apiTokens'] });
    },
    onError: (error: Error) => {
      message.error(error.message || '撤销失败');
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiToken) => (
        <Space>
          <KeyOutlined />
          {name}
          {record.isRevoked && <Tag color="red">已撤销</Tag>}
          {record.isExpired && !record.isRevoked && (
            <Tag color="orange">已过期</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Token',
      dataIndex: 'tokenSuffix',
      key: 'tokenSuffix',
      render: (tokenSuffix: string) => (
        <span className="font-mono text-gray-500">****{tokenSuffix}</span>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: ApiToken['permissions']) => (
        <Space>
          {permissions?.read && <Tag color="blue">读取</Tag>}
          {permissions?.write && <Tag color="green">写入</Tag>}
          {permissions?.delete && <Tag color="red">删除</Tag>}
        </Space>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (expiresAt: string | null) =>
        expiresAt ? dayjs(expiresAt).format('YYYY-MM-DD HH:mm') : '永不过期',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (lastUsedAt: string | null) =>
        lastUsedAt ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm') : '从未使用',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ApiToken) => (
        <Popconfirm
          title="确认撤销"
          description="撤销后此 Token 将无法再使用，确定要撤销吗？"
          onConfirm={() => revokeMutation.mutate(record.id)}
          okText="确定"
          cancelText="取消"
          disabled={record.isRevoked}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.isRevoked}
          >
            撤销
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="body">
      <Card
        title="API Token 管理"
        extra={
          <Button
            type="primary"
            icon={<KeyOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建 Token
          </Button>
        }
      >
        <Paragraph type="secondary" className="mb-4">
          API Token 可用于 CI/CD 流程或自动化脚本中调用 Pushy API。每个用户最多可创建
          10 个 Token。
        </Paragraph>
        <Table
          columns={columns}
          dataSource={data?.data}
          loading={isLoading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="创建 API Token"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Token 名称"
            name="name"
            rules={[{ required: true, message: '请输入 Token 名称' }]}
          >
            <Input placeholder="例如：CI/CD Pipeline" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="权限"
            name="permissions"
            rules={[{ required: true, message: '请至少选择一个权限' }]}
          >
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="read">
                  <b>读取 (read)</b> - 查看应用、版本、原生包信息
                </Checkbox>
                <Checkbox value="write">
                  <b>写入 (write)</b> - 创建和更新应用、发布版本、上传原生包
                </Checkbox>
                <Checkbox value="delete">
                  <b>删除 (delete)</b> - 删除应用、版本、原生包
                </Checkbox>
                <div className="text-xs text-gray-500 mt-1">
                  注意：写入权限不包括读取权限，如需同时读取请勾选读取权限
                </div>
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item label="过期时间" name="expiresIn" initialValue={180}>
            <Select
              options={[
                { value: 0, label: '永不过期' },
                { value: 30, label: '30 天' },
                { value: 90, label: '90 天' },
                { value: 180, label: '180 天' },
                { value: 360, label: '360 天' },
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
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Token 创建成功"
        open={!!newToken}
        onOk={() => setNewToken(null)}
        onCancel={() => setNewToken(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已保存"
      >
        <div className="my-4">
          <Paragraph type="warning" className="mb-2">
            ⚠️ 请立即复制并安全保存此 Token，关闭后将无法再次查看！
          </Paragraph>
          <Input.TextArea
            value={newToken || ''}
            readOnly
            autoSize={{ minRows: 2 }}
            className="font-mono"
          />
          <Button
            icon={<CopyOutlined />}
            className="mt-2"
            onClick={() => {
              if (newToken) {
                navigator.clipboard.writeText(newToken);
                message.success('已复制到剪贴板');
              }
            }}
          >
            复制 Token
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export const Component = ApiTokensPage;
