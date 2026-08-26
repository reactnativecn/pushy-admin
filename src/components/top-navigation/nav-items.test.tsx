import { describe, expect, mock, test } from 'bun:test';
import { getSelectedKeys } from './nav-items';

// 真实 router 会把整棵页面树拉进来,而且别的用例已经把 @/router 换成了
// 只含少数路径的桩(bun 的模块 mock 跨文件泄漏),这里用完整路径表覆盖回去
mock.module('@/router', () => ({
  rootRouterPath: {
    home: '/',
    apps: '/apps',
    user: '/user',
    auditLogs: '/audit-logs',
    realtimeMetrics: '/realtime-metrics',
    versionHealth: '/version-health',
    adminConfig: '/admin-config',
    adminUsers: '/admin-users',
    adminApps: '/admin-apps',
    adminMetrics: '/admin-metrics',
    adminServiceStatus: '/admin-service-status',
    apiTokens: '/api-tokens',
    mcpConnections: '/mcp-connections',
    members: '/members',
    login: '/login',
    inactivated: '/inactivated',
  },
  router: {
    state: { location: { search: '', pathname: '' } },
    navigate: () => {},
  },
}));

describe('getSelectedKeys', () => {
  test('home and apps both highlight the apps entry', () => {
    expect(getSelectedKeys('/')).toEqual(['apps']);
    expect(getSelectedKeys('/apps')).toEqual(['apps']);
  });

  test('each top-level page maps to its own key', () => {
    const cases: Array<[string, string]> = [
      ['/user', 'user'],
      ['/api-tokens', 'api-tokens'],
      ['/mcp-connections', 'mcp-connections'],
      ['/members', 'members'],
      ['/audit-logs', 'audit-logs'],
      ['/realtime-metrics', 'realtime-metrics'],
      ['/admin-config', 'admin-config'],
      ['/admin-users', 'admin-users'],
      ['/admin-apps', 'admin-apps'],
      ['/admin-metrics', 'admin-metrics'],
      ['/admin-service-status', 'admin-service-status'],
    ];
    for (const [pathname, key] of cases) {
      expect(getSelectedKeys(pathname)).toEqual([key]);
    }
  });

  test('nested or unknown paths select nothing', () => {
    expect(getSelectedKeys('/apps/12')).toEqual([]);
    expect(getSelectedKeys('/version-health')).toEqual([]);
    expect(getSelectedKeys('/nope')).toEqual([]);
  });
});
