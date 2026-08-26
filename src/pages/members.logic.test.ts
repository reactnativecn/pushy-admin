import { describe, expect, test } from 'bun:test';
import type { MemberRole, Workspace } from '@/types';
import { canManageMember, getMemberPermissions } from './members.logic';

const makeWorkspace = (
  accountId: number,
  role: MemberRole,
  status: Workspace['status'] = 'active',
): Workspace => ({
  id: accountId * 10,
  role,
  status,
  appIds: null,
  createdAt: '2026-01-01T00:00:00Z',
  account: {
    id: accountId,
    email: `${accountId}@x.y`,
    name: `acc${accountId}`,
  },
});

describe('getMemberPermissions', () => {
  const workspaces = [
    makeWorkspace(1, 'admin'),
    makeWorkspace(2, 'developer'),
    makeWorkspace(3, 'admin', 'pending'),
  ];

  test('no workspace selected means acting as the account owner', () => {
    expect(getMemberPermissions(workspaces, null)).toEqual({
      currentMembership: undefined,
      canManage: true,
      isOwner: true,
    });
  });

  test('an active admin membership can manage but is not the owner', () => {
    const perms = getMemberPermissions(workspaces, 1);
    expect(perms.currentMembership).toBe(workspaces[0]);
    expect(perms.canManage).toBe(true);
    expect(perms.isOwner).toBe(false);
  });

  test('developer or pending memberships cannot manage', () => {
    expect(getMemberPermissions(workspaces, 2)).toMatchObject({
      canManage: false,
      isOwner: false,
    });
    // pending 的 admin 邀请还没接受,不算成员
    const pending = getMemberPermissions(workspaces, 3);
    expect(pending.currentMembership).toBeUndefined();
    expect(pending.canManage).toBe(false);
  });

  test('an unknown workspace id yields no permissions', () => {
    expect(getMemberPermissions(workspaces, 99)).toMatchObject({
      currentMembership: undefined,
      canManage: false,
      isOwner: false,
    });
  });
});

describe('canManageMember', () => {
  const owner = { canManage: true, isOwner: true };
  const admin = { canManage: true, isOwner: false };
  const viewer = { canManage: false, isOwner: false };

  test('owner can manage anyone', () => {
    expect(canManageMember('admin', owner)).toBe(true);
    expect(canManageMember('developer', owner)).toBe(true);
  });

  test('admin member cannot touch other admins', () => {
    expect(canManageMember('admin', admin)).toBe(false);
    expect(canManageMember('developer', admin)).toBe(true);
    expect(canManageMember('viewer', admin)).toBe(true);
  });

  test('non-managers cannot manage at all', () => {
    expect(canManageMember('viewer', viewer)).toBe(false);
  });
});
