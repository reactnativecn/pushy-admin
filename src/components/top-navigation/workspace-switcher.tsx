import { SwapOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Dropdown, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import {
  getWorkspaceAccountId,
  setWorkspaceAccountId,
} from '@/services/workspace';
import { memberKeys } from '@/utils/query-keys';

/**
 * Workspace (sub-account) switcher. Hidden entirely for users with no
 * memberships and no pending invitations, so the existing single-user
 * experience is untouched.
 */
export function WorkspaceSwitcher({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const currentAccountId = getWorkspaceAccountId();

  const { data } = useQuery({
    queryKey: memberKeys.workspaces(),
    queryFn: api.listWorkspaces,
    staleTime: 60_000,
  });
  const workspaces = data?.data ?? [];
  const active = workspaces.filter(
    (workspace) => workspace.status === 'active',
  );
  const pendingCount = workspaces.length - active.length;

  if (!currentAccountId && active.length === 0 && pendingCount === 0) {
    return null;
  }

  const current = currentAccountId
    ? active.find((workspace) => workspace.account.id === currentAccountId)
    : undefined;

  const switchTo = (accountId: number | null) => {
    if (accountId === getWorkspaceAccountId()) {
      return;
    }
    setWorkspaceAccountId(accountId);
    // Every cached query belongs to the previous workspace — reload wholesale
    window.location.reload();
  };

  const items = [
    {
      key: 'own',
      icon: <UserOutlined />,
      label: t('workspace.own_account'),
      onClick: () => switchTo(null),
    },
    ...active.map((workspace) => ({
      key: `ws-${workspace.account.id}`,
      icon: <TeamOutlined />,
      label: (
        <span>
          {workspace.account.name}{' '}
          <Tag className="ml-1">{t(`members.role_${workspace.role}`)}</Tag>
        </span>
      ),
      onClick: () => switchTo(workspace.account.id),
    })),
    ...(pendingCount > 0
      ? [
          { type: 'divider' as const },
          {
            key: 'invitations',
            label: (
              <Link to={rootRouterPath.members}>
                {t('workspace.pending_invitations', { count: pendingCount })}
              </Link>
            ),
          },
        ]
      : []),
  ];

  const label = current
    ? current.account.name
    : t(currentAccountId ? 'workspace.unknown' : 'workspace.own_account');

  return (
    <Dropdown
      menu={{
        items,
        selectedKeys: [current ? `ws-${current.account.id}` : 'own'],
      }}
    >
      <Badge count={pendingCount} size="small" offset={[-4, 4]}>
        <Button size="small" icon={<SwapOutlined />}>
          {compact ? null : label}
        </Button>
      </Badge>
    </Dropdown>
  );
}
