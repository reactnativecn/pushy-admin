import type { Workspace } from '@/types';

/**
 * 当前选中的工作空间对应的成员关系;没切工作空间(accountId 为空)或
 * 成员关系不是 active(待接受、已移除)时返回 undefined。
 */
export const findActiveWorkspace = (
  workspaces: readonly Workspace[] | undefined,
  accountId: number | null,
) =>
  accountId
    ? workspaces?.find(
        (workspace) =>
          workspace.account.id === accountId && workspace.status === 'active',
      )
    : undefined;
