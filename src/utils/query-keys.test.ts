import { describe, expect, test } from 'bun:test';
import {
  activateKeys,
  adminKeys,
  apiTokenKeys,
  appKeys,
  auditKeys,
  bindingKeys,
  metricsKeys,
  packageKeys,
  userKeys,
  versionKeys,
} from './query-keys';

describe('versionKeys', () => {
  describe('byApp', () => {
    test('returns correct query key for app', () => {
      expect(versionKeys.byApp(1)).toEqual(['versions', 1]);
    });

    test('works with different app ids', () => {
      expect(versionKeys.byApp(42)).toEqual(['versions', 42]);
      expect(versionKeys.byApp(0)).toEqual(['versions', 0]);
    });

    test('returns a readonly tuple', () => {
      const key = versionKeys.byApp(1);
      expect(key).toHaveLength(2);
      expect(key[0]).toBe('versions');
      expect(key[1]).toBe(1);
    });
  });

  describe('page', () => {
    test('returns correct paged query key', () => {
      expect(versionKeys.page(1, 0, 10)).toEqual([
        'versions',
        1,
        'page',
        0,
        10,
      ]);
    });

    test('handles non-zero offset', () => {
      expect(versionKeys.page(5, 20, 10)).toEqual([
        'versions',
        5,
        'page',
        20,
        10,
      ]);
    });

    test('different offsets produce different keys', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(1, 10, 10);
      expect(key1).not.toEqual(key2);
    });

    test('different limits produce different keys', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(1, 0, 20);
      expect(key1).not.toEqual(key2);
    });
  });

  describe('all', () => {
    test('returns correct "all" query key', () => {
      expect(versionKeys.all(1)).toEqual(['versions', 1, 'all']);
    });

    test('differs from byApp key', () => {
      expect(versionKeys.all(1)).not.toEqual(versionKeys.byApp(1));
    });

    test('differs from page key', () => {
      expect(versionKeys.all(1)).not.toEqual(versionKeys.page(1, 0, 10));
    });
  });

  describe('key isolation', () => {
    test('keys for different app ids are unique', () => {
      const key1 = versionKeys.byApp(1);
      const key2 = versionKeys.byApp(2);
      expect(key1).not.toEqual(key2);
    });

    test('page keys include app id for isolation', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(2, 0, 10);
      expect(key1).not.toEqual(key2);
    });
  });
});

describe('domain key factories', () => {
  test('appKeys', () => {
    expect(appKeys.list()).toEqual(['appList']);
    expect(appKeys.detail(3)).toEqual(['app', 3]);
  });

  test('packageKeys / bindingKeys', () => {
    expect(packageKeys.byApp(7)).toEqual(['packages', 7]);
    expect(bindingKeys.byApp(7)).toEqual(['bindings', 7]);
  });

  test('userKeys', () => {
    expect(userKeys.info()).toEqual(['userInfo']);
    expect(userKeys.orderBillingConfig()).toEqual(['orderBillingConfig']);
    expect(userKeys.accountQuotaVersions(1)).toEqual([
      'accountQuotaVersions',
      1,
    ]);
    expect(userKeys.orderQuotes(['pro', undefined, 100])).toEqual([
      'orderQuotes',
      'pro',
      undefined,
      100,
    ]);
  });

  test('auditKeys / apiTokenKeys / activateKeys', () => {
    expect(auditKeys.all()).toEqual(['auditLogs']);
    expect(apiTokenKeys.all()).toEqual(['apiTokens']);
    expect(activateKeys.byToken('t')).toEqual(['activate', 't']);
    expect(activateKeys.byToken(null)).toEqual(['activate', null]);
  });

  test('metricsKeys', () => {
    expect(metricsKeys.global('a', 'b', 'pv')).toEqual([
      'globalMetrics',
      'a',
      'b',
      'pv',
    ]);
    expect(metricsKeys.internal('main')).toEqual(['internalMetrics', 'main']);
    expect(metricsKeys.internalApi5xxEvents('main', 20)).toEqual([
      'internalApi5xxEvents',
      'main',
      20,
    ]);
  });

  describe('adminKeys.users partial matching', () => {
    test('base key is a prefix of the searched key', () => {
      const base = adminKeys.users();
      const searched = adminKeys.users('alice');
      expect(base).toEqual(['adminUsers']);
      expect(searched).toEqual(['adminUsers', 'alice']);
      // invalidateQueries(base) must match the more specific searched key
      expect(searched.slice(0, base.length)).toEqual(base);
    });
  });

  describe('adminKeys.apps partial matching', () => {
    test('base key is a prefix of the paged key', () => {
      const base = adminKeys.apps();
      const paged = adminKeys.apps('q', 2, 10);
      expect(base).toEqual(['adminApps']);
      expect(paged).toEqual(['adminApps', 'q', 2, 10]);
      expect(paged.slice(0, base.length)).toEqual(base);
    });
  });

  test('adminKeys.userDetail / config', () => {
    expect(adminKeys.userDetail(5)).toEqual(['adminUserDetail', 5]);
    expect(adminKeys.config()).toEqual(['adminConfig']);
  });
});
