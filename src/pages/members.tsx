import {
  DeleteOutlined,
  MailOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
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
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components';
import { api } from '@/services/api';
import {
  getWorkspaceAccountId,
  setWorkspaceAccountId,
} from '@/services/workspace';
import type { AccountMember, MemberRole, Workspace } from '@/types';
import { useUserInfo } from '@/utils/hooks';
import { appKeys, memberKeys } from '@/utils/query-keys';

const ROLE_COLORS: Record<MemberRole, string> = {
  admin: 'gold',
  developer: 'blue',
  viewer: 'default',
};

function RoleTag({ role }: { role: MemberRole }) {
  const { t } = useTranslation();
  return <Tag color={ROLE_COLORS[role]}>{t(`members.role_${role}`)}</Tag>;
}

function MembersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useUserInfo();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm] = Form.useForm();
  const workspaceAccountId = getWorkspaceAccountId();

  const { data: workspacesData } = useQuery({
    queryKey: memberKeys.workspaces(),
    queryFn: api.listWorkspaces,
  });
  const workspaces = workspacesData?.data ?? [];
  const currentMembership = workspaceAccountId
    ? workspaces.find(
        (workspace) =>
          workspace.account.id === workspaceAccountId &&
          workspace.status === 'active',
      )
    : undefined;
  // owner of the current account, or an admin member of the workspace
  const canManage = !workspaceAccountId || currentMembership?.role === 'admin';
  // admin members may not appoint/modify/remove admins — owner only
  const isOwner = !workspaceAccountId;

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: memberKeys.list(),
    queryFn: api.listMembers,
    enabled: canManage,
    retry: false,
  });

  const { data: appsData } = useQuery({
    queryKey: appKeys.list(),
    queryFn: api.appList,
    enabled: canManage,
  });
  const appOptions = useMemo(
    () =>
      (appsData?.data ?? []).map((app) => ({
        label: app.name,
        value: app.id,
      })),
    [appsData],
  );

  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    queryClient.invalidateQueries({ queryKey: memberKeys.workspaces() });
  };

  const inviteMutation = useMutation({
    mutationFn: api.inviteMember,
    onSuccess: () => {
      message.success(t('members.invite_success'));
      setInviteModalOpen(false);
      inviteForm.resetFields();
      invalidateMembers();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...params
    }: {
      id: number;
      role?: MemberRole;
      appIds?: number[] | null;
    }) => api.updateMember(id, params),
    onSuccess: () => {
      message.success(t('members.update_success'));
      invalidateMembers();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: api.removeMember,
    onSuccess: () => {
      message.success(t('members.remove_success'));
      invalidateMembers();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const acceptMutation = useMutation({
    mutationFn: api.acceptInvite,
    onSuccess: () => {
      message.success(t('members.accept_success'));
      invalidateMembers();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: api.leaveWorkspace,
    onSuccess: (_, accountId) => {
      message.success(t('members.leave_success'));
      if (getWorkspaceAccountId() === accountId) {
        setWorkspaceAccountId(null);
        window.location.reload();
        return;
      }
      invalidateMembers();
    },
    onError: (error: Error) => message.error(error.message),
  });

  const memberColumns: ColumnsType<AccountMember> = [
    {
      title: t('members.col_member'),
      key: 'member',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.member.name}</span>
          <Typography.Text type="secondary" className="text-xs">
            {record.member.email}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: t('members.col_role'),
      key: 'role',
      width: 160,
      render: (_, record) => {
        // admin 成员的角色只有 owner 能改
        const editable =
          canManage && (isOwner || record.role !== 'admin') && user;
        if (!editable) {
          return <RoleTag role={record.role} />;
        }
        return (
          <Select<MemberRole>
            size="small"
            value={record.role}
            style={{ width: 140 }}
            onChange={(role) => updateMutation.mutate({ id: record.id, role })}
            options={(['admin', 'developer', 'viewer'] as MemberRole[]).map(
              (role) => ({
                label: t(`members.role_${role}`),
                value: role,
                disabled: role === 'admin' && !isOwner,
              }),
            )}
          />
        );
      },
    },
    {
      title: t('members.col_apps'),
      key: 'apps',
      responsive: ['md'],
      render: (_, record) =>
        record.appIds === null ? (
          <Tag>{t('members.all_apps')}</Tag>
        ) : (
          <Tag color="blue">
            {t('members.n_apps', { count: record.appIds.length })}
          </Tag>
        ),
    },
    {
      title: t('members.col_status'),
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.status === 'active' ? (
          <Tag color="green">{t('members.status_active')}</Tag>
        ) : (
          <Tag color="orange">{t('members.status_pending')}</Tag>
        ),
    },
    {
      title: t('members.col_actions'),
      key: 'actions',
      width: 90,
      render: (_, record) => {
        const removable = canManage && (isOwner || record.role !== 'admin');
        if (!removable) {
          return null;
        }
        return (
          <Popconfirm
            title={t('members.remove_confirm')}
            onConfirm={() => removeMutation.mutate(record.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        );
      },
    },
  ];

  const workspaceColumns: ColumnsType<Workspace> = [
    {
      title: t('members.col_account'),
      key: 'account',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.account.name}</span>
          <Typography.Text type="secondary" className="text-xs">
            {record.account.email}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: t('members.col_role'),
      key: 'role',
      width: 110,
      render: (_, record) => <RoleTag role={record.role} />,
    },
    {
      title: t('members.col_status'),
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.status === 'active' ? (
          <Tag color="green">{t('members.status_joined')}</Tag>
        ) : (
          <Tag color="orange">{t('members.status_pending')}</Tag>
        ),
    },
    {
      title: t('members.col_actions'),
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              onClick={() => acceptMutation.mutate(record.account.id)}
            >
              {t('members.accept')}
            </Button>
          )}
          <Popconfirm
            title={
              record.status === 'pending'
                ? t('members.decline_confirm')
                : t('members.leave_confirm')
            }
            onConfirm={() => leaveMutation.mutate(record.account.id)}
          >
            <Button danger size="small">
              {record.status === 'pending'
                ? t('members.decline')
                : t('members.leave')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Space direction="vertical" size="large" className="w-full">
        {canManage && (
          <Card
            title={
              <Space>
                <TeamOutlined />
                {t('members.team_title')}
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setInviteModalOpen(true)}
              >
                {t('members.invite')}
              </Button>
            }
          >
            {membersError ? (
              <Alert type="warning" message={(membersError as Error).message} />
            ) : (
              <Table
                rowKey="id"
                size={isMobile ? 'small' : 'middle'}
                loading={membersLoading}
                columns={memberColumns}
                dataSource={membersData?.data ?? []}
                pagination={false}
                locale={{ emptyText: t('members.empty') }}
              />
            )}
          </Card>
        )}

        <Card
          title={
            <Space>
              <MailOutlined />
              {t('members.workspaces_title')}
            </Space>
          }
        >
          <Table
            rowKey="id"
            size={isMobile ? 'small' : 'middle'}
            columns={workspaceColumns}
            dataSource={workspaces}
            pagination={false}
            locale={{ emptyText: t('members.workspaces_empty') }}
          />
        </Card>
      </Space>

      <Modal
        title={t('members.invite_title')}
        open={inviteModalOpen}
        onCancel={() => setInviteModalOpen(false)}
        onOk={() => inviteForm.submit()}
        confirmLoading={inviteMutation.isPending}
        destroyOnHidden
      >
        <Form
          form={inviteForm}
          layout="vertical"
          initialValues={{ role: 'developer' }}
          onFinish={(values: {
            email: string;
            role: MemberRole;
            appIds?: number[];
          }) =>
            inviteMutation.mutate({
              email: values.email,
              role: values.role,
              appIds: values.appIds?.length ? values.appIds : undefined,
            })
          }
        >
          <Form.Item
            name="email"
            label={t('members.invite_email')}
            rules={[{ required: true, type: 'email' }]}
            extra={t('members.invite_email_hint')}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item
            name="role"
            label={t('members.col_role')}
            rules={[{ required: true }]}
          >
            <Select
              options={(['admin', 'developer', 'viewer'] as MemberRole[]).map(
                (role) => ({
                  label: `${t(`members.role_${role}`)} — ${t(`members.role_${role}_desc`)}`,
                  value: role,
                  disabled: role === 'admin' && !isOwner,
                }),
              )}
            />
          </Form.Item>
          <Form.Item
            name="appIds"
            label={t('members.col_apps')}
            extra={t('members.apps_hint')}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('members.all_apps')}
              options={appOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

export const Component = MembersPage;
export default MembersPage;
