import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  cn,
  filterAppsByQuery,
  getFatalDepsViolation,
  isPasswordValid,
  packageSupportsForceBoot,
  parseDepVersion,
  patchSearchParams,
  testUrls,
} from './helper';

// ─── isPasswordValid ────────────────────────────────────────────────

describe('isPasswordValid', () => {
  test('should return true for valid passwords', () => {
    expect(isPasswordValid('Passw0rd')).toBe(true);
    expect(isPasswordValid('UPPER123')).toBe(true);
    expect(isPasswordValid('Valid123')).toBe(true);
  });

  test('should return false for passwords that are too short', () => {
    expect(isPasswordValid('Short')).toBe(false); // 5 chars
    expect(isPasswordValid('A1b')).toBe(false); // 3 chars
  });

  test('should return false for passwords that are too long', () => {
    expect(isPasswordValid('ThisPasswordIsWayTooLong123')).toBe(false); // > 16 chars
  });

  test('should return false for passwords with only digits', () => {
    expect(isPasswordValid('12345678')).toBe(false);
  });

  test('should return false for passwords with only lowercase letters', () => {
    expect(isPasswordValid('lowercase')).toBe(false);
  });

  test('should return false for passwords with no uppercase letters', () => {
    expect(isPasswordValid('lower123')).toBe(false);
    expect(isPasswordValid('noupper!')).toBe(false);
  });

  test('should accept boundary length 6', () => {
    expect(isPasswordValid('Abc123')).toBe(true);
  });

  test('should accept boundary length 16', () => {
    expect(isPasswordValid('Abcdefghij123456')).toBe(true);
  });

  test('should reject length 5', () => {
    expect(isPasswordValid('Ab123')).toBe(false);
  });

  test('should reject length 17', () => {
    expect(isPasswordValid('Abcdefghij1234567')).toBe(false);
  });

  test('should return false for empty string', () => {
    expect(isPasswordValid('')).toBe(false);
  });

  test('should accept passwords with special characters', () => {
    expect(isPasswordValid('Ab1!@#$')).toBe(true);
  });

  test('should accept uppercase-only with digits', () => {
    expect(isPasswordValid('ABCDEF1')).toBe(true);
  });
});

// ─── cn ─────────────────────────────────────────────────────────────

describe('cn', () => {
  test('joins class names with space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  test('filters out undefined values', () => {
    expect(cn('a', undefined, 'b', undefined)).toBe('a b');
  });

  test('returns empty string for all undefined', () => {
    expect(cn(undefined, undefined)).toBe('');
  });

  test('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  test('handles single class name', () => {
    expect(cn('only')).toBe('only');
  });

  test('filters empty string arguments (falsy)', () => {
    expect(cn('', 'a')).toBe('a');
  });
});

// ─── testUrls (hedged endpoint race) ────────────────────────────────

describe('testUrls', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('returns null for empty or missing urls', async () => {
    expect(await testUrls([])).toBeNull();
    expect(await testUrls(undefined)).toBeNull();
  });

  test('only pings the first url when it answers within the hedge delay', async () => {
    const fetchMock = mock(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 5)),
    );
    globalThis.fetch = fetchMock as any;

    const result = await testUrls(
      ['https://a/status', 'https://b/status'],
      500,
    );
    expect(result).toBe('https://a/status');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('does not wait for a slow first url and aborts the loser', async () => {
    const signals: Record<string, AbortSignal | undefined> = {};
    const fetchMock = mock(
      (url: string, options?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          signals[url] = options?.signal;
          const ms = url === 'https://slow/status' ? 1900 : 10;
          const timer = setTimeout(() => resolve({ status: 200 }), ms);
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(Error('aborted'));
          });
        }),
    );
    globalThis.fetch = fetchMock as any;

    const start = Date.now();
    const result = await testUrls(
      ['https://slow/status', 'https://fast/status'],
      20,
    );
    const elapsed = Date.now() - start;

    expect(result).toBe('https://fast/status');
    expect(elapsed < 500).toBe(true);
    expect(signals['https://slow/status']?.aborted).toBe(true);
    expect(signals['https://fast/status']?.aborted).toBe(false);
  });

  test('hedges immediately when a ping fails before the delay elapses', async () => {
    const fetchMock = mock((url: string) => {
      if (url === 'https://bad/status') {
        return Promise.reject(Error('down'));
      }
      return new Promise((resolve) =>
        setTimeout(() => resolve({ status: 200 }), 5),
      );
    });
    globalThis.fetch = fetchMock as any;

    const start = Date.now();
    const result = await testUrls(
      ['https://bad/status', 'https://good/status'],
      1500,
    );
    const elapsed = Date.now() - start;

    expect(result).toBe('https://good/status');
    expect(elapsed < 500).toBe(true);
  });

  test('falls back to the first url when every ping fails', async () => {
    const fetchMock = mock(() => Promise.resolve({ status: 500 }));
    globalThis.fetch = fetchMock as any;

    const result = await testUrls(['https://a/status', 'https://b/status'], 0);
    expect(result).toBe('https://a/status');
  });
});

// ─── patchSearchParams ──────────────────────────────────────────────

describe('patchSearchParams', () => {
  test('sets new params', () => {
    let current = new URLSearchParams('');
    const setter = mock((fn: any) => {
      current = fn(current);
    });

    patchSearchParams(setter, { foo: 'bar', baz: 'qux' });
    expect(current.get('foo')).toBe('bar');
    expect(current.get('baz')).toBe('qux');
  });

  test('deletes params when value is null', () => {
    let current = new URLSearchParams('foo=bar&baz=qux');
    const setter = mock((fn: any) => {
      current = fn(current);
    });

    patchSearchParams(setter, { foo: null });
    expect(current.get('foo')).toBeNull();
    expect(current.get('baz')).toBe('qux');
  });

  test('deletes params when value is undefined', () => {
    let current = new URLSearchParams('key=val');
    const setter = mock((fn: any) => {
      current = fn(current);
    });

    patchSearchParams(setter, { key: undefined });
    expect(current.get('key')).toBeNull();
  });

  test('overwrites existing params', () => {
    let current = new URLSearchParams('page=1');
    const setter = mock((fn: any) => {
      current = fn(current);
    });

    patchSearchParams(setter, { page: '5' });
    expect(current.get('page')).toBe('5');
  });

  test('passes default navigateOptions to setter', () => {
    const setter = mock((_fn: any, opts: any) => {
      expect(opts).toEqual({ replace: true });
    });

    patchSearchParams(setter, { x: '1' });
    expect(setter).toHaveBeenCalled();
  });

  test('supports custom navigateOptions', () => {
    let current = new URLSearchParams('');
    const customOpts = { replace: false };
    const setter = mock((fn: any, opts: any) => {
      current = fn(current);
      expect(opts).toBe(customOpts);
    });

    patchSearchParams(setter, { a: 'b' }, customOpts);
  });
});

// ─── isValidExternalUrl (expanded) ──────────────────────────────────

describe('isValidExternalUrl', () => {
  const { isValidExternalUrl } = require('./helper');

  test('should return true for valid https URLs with trusted domains', () => {
    expect(isValidExternalUrl('https://react-native.cn/path')).toBe(true);
    expect(isValidExternalUrl('https://sub.react-native.cn/path')).toBe(true);
    expect(isValidExternalUrl('https://reactnative.cn/')).toBe(true);
    expect(isValidExternalUrl('https://rnupdate.online/foo')).toBe(true);
    expect(isValidExternalUrl('https://alipay.com/pay')).toBe(true);
    expect(isValidExternalUrl('https://openapi.alipay.com/gateway.do')).toBe(
      true,
    );
  });

  test('should return false for http protocol', () => {
    expect(isValidExternalUrl('http://react-native.cn/path')).toBe(false);
    expect(isValidExternalUrl('http://alipay.com')).toBe(false);
  });

  test('should return false for untrusted domains', () => {
    expect(isValidExternalUrl('https://evil.com/path')).toBe(false);
    expect(isValidExternalUrl('https://google.com')).toBe(false);
    expect(isValidExternalUrl('https://react-native.cnevil.com')).toBe(false);
  });

  test('should return false for malformed URLs', () => {
    expect(isValidExternalUrl('not a url')).toBe(false);
    expect(isValidExternalUrl('://bad-url')).toBe(false);
  });

  test('should return false for javascript uris', () => {
    expect(isValidExternalUrl('javascript:alert(1)')).toBe(false);
  });

  test('should return false for empty string', () => {
    expect(isValidExternalUrl('')).toBe(false);
  });

  test('should return false for ftp protocol', () => {
    expect(isValidExternalUrl('ftp://react-native.cn/file')).toBe(false);
  });

  test('should return false for domain that is a suffix but not subdomain', () => {
    expect(isValidExternalUrl('https://xreact-native.cn/path')).toBe(false);
  });

  test('should handle URLs with query and fragment', () => {
    expect(isValidExternalUrl('https://react-native.cn/path?a=b#section')).toBe(
      true,
    );
  });
});

describe('binding deps helpers', () => {
  test('parseDepVersion tolerates range prefixes and rejects garbage', () => {
    expect(parseDepVersion('0.73.2')).toEqual([0, 73, 2]);
    expect(parseDepVersion('^10.51.0')).toEqual([10, 51, 0]);
    expect(parseDepVersion('workspace:*')).toBeNull();
    expect(parseDepVersion(undefined)).toBeNull();
  });

  test('getFatalDepsViolation enforces the two hard rules only', () => {
    expect(
      getFatalDepsViolation(
        { 'react-native': '0.73.2' },
        { 'react-native': '0.74.0' },
      ),
    ).toBe('rn_mismatch');
    expect(
      getFatalDepsViolation(
        { 'react-native-update': '10.51.0' },
        { 'react-native-update': '10.50.0' },
      ),
    ).toBe('rnu_downgrade');
    // 升级与相同版本放行;缺失不拦(与服务端一致)
    expect(
      getFatalDepsViolation(
        { 'react-native': '0.73.2', 'react-native-update': '10.51.0' },
        { 'react-native': '~0.73.2', 'react-native-update': '10.52.0' },
      ),
    ).toBeNull();
    expect(
      getFatalDepsViolation(undefined, { 'react-native': '1.0.0' }),
    ).toBeNull();
  });

  test('packageSupportsForceBoot gates on rnu >= 10.52.1', () => {
    // Uniform floor across platforms: full rescue capability (crash-moment
    // rescue + resumable downloads, and the harmony bridging fix) ships in
    // 10.52.1.
    expect(packageSupportsForceBoot({ 'react-native-update': '10.52.1' })).toBe(
      true,
    );
    expect(
      packageSupportsForceBoot({ 'react-native-update': '^10.53.0' }),
    ).toBe(true);
    expect(packageSupportsForceBoot({ 'react-native-update': '10.52.0' })).toBe(
      false,
    );
    expect(packageSupportsForceBoot({ 'react-native-update': '10.51.0' })).toBe(
      false,
    );
    expect(packageSupportsForceBoot({})).toBe(false);
    expect(packageSupportsForceBoot(undefined)).toBe(false);
  });
});

describe('filterAppsByQuery', () => {
  const apps = [
    { id: 1, name: 'Shop', appKey: 'abc123', platform: 'ios' },
    { id: 2, name: 'Blog', appKey: 'xyz789', platform: 'android' },
    { id: 3, name: null, appKey: null, platform: 'harmony' },
  ];

  test('空关键字原样返回', () => {
    expect(filterAppsByQuery(apps, '   ')).toBe(apps);
  });

  test('名称 / appKey / 平台任一命中，忽略大小写与首尾空格', () => {
    expect(filterAppsByQuery(apps, ' shop ').map((a) => a.id)).toEqual([1]);
    expect(filterAppsByQuery(apps, 'XYZ').map((a) => a.id)).toEqual([2]);
    expect(filterAppsByQuery(apps, 'harm').map((a) => a.id)).toEqual([3]);
  });

  test('空字段不参与匹配', () => {
    expect(filterAppsByQuery(apps, 'null')).toEqual([]);
  });
});
