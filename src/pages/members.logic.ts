import type { MemberRole, Workspace } from '@/types';
import { findActiveWorkspace } from '@/utils/active-workspace';

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
  const currentMembership = findActiveWorkspace(workspaces, workspaceAccountId);
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

// 可分配的角色,顺序即下拉框顺序
export const ASSIGNABLE_ROLES: readonly MemberRole[] = [
  'admin',
  'developer',
  'viewer',
];

/** 角色下拉选项;只有 owner 能任命 admin */
export const getRoleOptions = (
  isOwner: boolean,
  getLabel: (role: MemberRole) => string,
) =>
  ASSIGNABLE_ROLES.map((role) => ({
    label: getLabel(role),
    value: role,
    disabled: role === 'admin' && !isOwner,
  }));
