import type { MemberRole, Workspace } from '@/types';

/** 成员页的权限推导:当前是账号 owner 还是别人工作区里的成员 */

export type MemberPermissions = {
  currentMembership: Workspace | undefined;
  /** owner of the current account, or an admin member of the workspace */
  canManage: boolean;
  /** admin members may not appoint/modify/remove admins — owner only */
  isOwner: boolean;
};

// 没切工作区就是在自己账号下;切了则只有 active 的 admin 成员才能管人
export function getMemberPermissions(
  workspaces: Workspace[],
  workspaceAccountId: number | null,
): MemberPermissions {
  const currentMembership = workspaceAccountId
    ? workspaces.find(
        (workspace) =>
          workspace.account.id === workspaceAccountId &&
          workspace.status === 'active',
      )
    : undefined;
  return {
    currentMembership,
    canManage: !workspaceAccountId || currentMembership?.role === 'admin',
    isOwner: !workspaceAccountId,
  };
}

// admin 成员的角色/去留只有 owner 能动
export function canManageMember(
  role: MemberRole,
  { canManage, isOwner }: Pick<MemberPermissions, 'canManage' | 'isOwner'>,
) {
  return canManage && (isOwner || role !== 'admin');
}
