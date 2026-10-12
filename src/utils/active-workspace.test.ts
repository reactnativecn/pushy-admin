import { describe, expect, test } from 'bun:test';
import type { Workspace } from '@/types';
import { findActiveWorkspace } from './active-workspace';

const makeWorkspace = (
  accountId: number,
  status: Workspace['status'],
): Workspace => ({
  id: accountId * 10,
  role: 'developer',
  status,
  appIds: null,
  createdAt: '2026-01-01T00:00:00Z',
  account: {
    id: accountId,
    email: `${accountId}@x.y`,
    name: `acc${accountId}`,
  },
});

describe('findActiveWorkspace', () => {
  const workspaces = [makeWorkspace(1, 'active'), makeWorkspace(2, 'pending')];

  test('finds the active membership of the selected account', () => {
    expect(findActiveWorkspace(workspaces, 1)).toBe(workspaces[0]);
  });

  test('ignores non-active memberships, missing lists and no selection', () => {
    expect(findActiveWorkspace(workspaces, 2)).toBeUndefined();
    expect(findActiveWorkspace(workspaces, 3)).toBeUndefined();
    expect(findActiveWorkspace(undefined, 1)).toBeUndefined();
    expect(findActiveWorkspace(workspaces, null)).toBeUndefined();
  });
});
