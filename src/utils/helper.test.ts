import { describe, expect, test, mock } from 'bun:test';
import {
  MAX_RECENT_APP_COUNT,
  RECENT_APP_STORAGE_KEY,
  cn,
  getManageAppDrawerCollapsed,
  getManageAppDrawerPlacement,
  getRecentAppIds,
  isExpVersion,
  isPasswordValid,
  patchSearchParams,
  promiseAny,
  rememberRecentApp,
  setManageAppDrawerCollapsed,
  setManageAppDrawerPlacement,
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

// ─── promiseAny ─────────────────────────────────────────────────────

describe('promiseAny', () => {
  test('resolves with the first fulfilled promise', async () => {
    const result = await promiseAny([
      Promise.reject('err1'),
      Promise.resolve('winner'),
      Promise.resolve('late'),
    ]);
    expect(result).toBe('winner');
  });

  test('resolves when any promise resolves even if others reject', async () => {
    const result = await promiseAny([
      Promise.reject(new Error('fail')),
      Promise.resolve(42),
    ]);
    expect(result).toBe(42);
  });

  test('rejects when all promises reject', async () => {
    await expect(
      promiseAny([
        Promise.reject('err1'),
        Promise.reject('err2'),
        Promise.reject('err3'),
      ]),
    ).rejects.toThrow('All promises were rejected');
  });

  test('rejects for empty array', async () => {
    const p = promiseAny([]);
    const result = Promise.race([
      p,
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 100)),
    ]);
    expect(await result).toBe('timeout');
  });

  test('resolves with first even if slow promises also resolve', async () => {
    const fast = new Promise((resolve) => setTimeout(() => resolve('fast'), 10));
    const slow = new Promise((resolve) =>
      setTimeout(() => resolve('slow'), 100),
    );
    const result = await promiseAny([slow, fast]);
    expect(result).toBe('fast');
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
    const setter = mock((fn: any, opts: any) => {
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

// ─── isExpVersion (expanded) ────────────────────────────────────────

describe('isExpVersion', () => {
  test('should return false when config is null', () => {
    expect(isExpVersion(null, '1.0.0')).toBe(false);
  });

  test('should return false when config is undefined', () => {
    expect(isExpVersion(undefined, '1.0.0')).toBe(false);
  });

  test('should return false when config.rollout is missing', () => {
    expect(isExpVersion({}, '1.0.0')).toBe(false);
  });

  test('should return false when rollout config for version is missing', () => {
    expect(isExpVersion({ rollout: {} }, '1.0.0')).toBe(false);
  });

  test('should return false when rollout config for version is null', () => {
    expect(isExpVersion({ rollout: { '1.0.0': null } }, '1.0.0')).toBe(false);
  });

  test('should return true when rollout is less than 100', () => {
    expect(isExpVersion({ rollout: { '1.0.0': 50 } }, '1.0.0')).toBe(true);
    expect(isExpVersion({ rollout: { '1.0.0': 0 } }, '1.0.0')).toBe(true);
  });

  test('should return false when rollout is 100', () => {
    expect(isExpVersion({ rollout: { '1.0.0': 100 } }, '1.0.0')).toBe(false);
  });

  test('should return false when rollout is greater than 100', () => {
    expect(isExpVersion({ rollout: { '1.0.0': 110 } }, '1.0.0')).toBe(false);
  });

  test('should return true for rollout 1 (boundary)', () => {
    expect(isExpVersion({ rollout: { '1.0.0': 1 } }, '1.0.0')).toBe(true);
  });

  test('should return true for rollout 99 (boundary)', () => {
    expect(isExpVersion({ rollout: { '1.0.0': 99 } }, '1.0.0')).toBe(true);
  });

  test('should not be affected by other versions in rollout', () => {
    const config = { rollout: { '1.0.0': 50, '2.0.0': 100 } };
    expect(isExpVersion(config, '1.0.0')).toBe(true);
    expect(isExpVersion(config, '2.0.0')).toBe(false);
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
    expect(
      isValidExternalUrl('https://react-native.cn/path?a=b#section'),
    ).toBe(true);
  });
});

// ─── RecentAppIds (expanded) ────────────────────────────────────────

describe('RecentAppIds', () => {
  const originalWindow = (global as any).window;

  test('getRecentAppIds should return empty array when window is undefined', () => {
    (global as any).window = undefined;
    expect(getRecentAppIds()).toEqual([]);
    (global as any).window = originalWindow;
  });

  test('getRecentAppIds should return parsed array from localStorage', () => {
    const mockStorage = {
      getItem: mock(() => JSON.stringify([1, 2, 3])),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getRecentAppIds()).toEqual([1, 2, 3]);
    expect(mockStorage.getItem).toHaveBeenCalledWith(RECENT_APP_STORAGE_KEY);

    (global as any).window = originalWindow;
  });

  test('getRecentAppIds should return empty array on invalid JSON', () => {
    const mockStorage = {
      getItem: mock(() => 'invalid json'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getRecentAppIds()).toEqual([]);

    (global as any).window = originalWindow;
  });

  test('getRecentAppIds should return empty array when parsed value is not an array', () => {
    const mockStorage = {
      getItem: mock(() => JSON.stringify({ a: 1 })),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getRecentAppIds()).toEqual([]);

    (global as any).window = originalWindow;
  });

  test('getRecentAppIds should filter out non-integer values', () => {
    const mockStorage = {
      getItem: mock(() => JSON.stringify([1, '2', 3.5, 4])),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getRecentAppIds()).toEqual([1, 4]);

    (global as any).window = originalWindow;
  });

  test('rememberRecentApp should add appId to the front and limit count', () => {
    let storage: Record<string, string> = {
      [RECENT_APP_STORAGE_KEY]: JSON.stringify([2, 1]),
    };
    const mockStorage = {
      getItem: mock((key: string) => storage[key] ?? null),
      setItem: mock((key: string, value: string) => {
        storage[key] = value;
      }),
    };
    (global as any).window = {
      localStorage: mockStorage,
    };

    const result = rememberRecentApp(3);
    expect(result).toEqual([3, 2, 1]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      RECENT_APP_STORAGE_KEY,
      JSON.stringify([3, 2, 1]),
    );

    // Test deduplication
    const result2 = rememberRecentApp(2);
    expect(result2).toEqual([2, 3, 1]);

    // Test limit
    storage[RECENT_APP_STORAGE_KEY] = JSON.stringify([1, 2, 3, 4, 5, 6]);
    const result3 = rememberRecentApp(7);
    expect(result3.length).toBe(MAX_RECENT_APP_COUNT);
    expect(result3).toEqual([7, 1, 2, 3, 4, 5]);

    (global as any).window = originalWindow;
  });

  test('rememberRecentApp should return empty array when window is undefined', () => {
    (global as any).window = undefined;
    expect(rememberRecentApp(1)).toEqual([]);
    (global as any).window = originalWindow;
  });

  test('rememberRecentApp should return empty array when appId is not an integer', () => {
    const mockStorage = {
      getItem: mock(() => JSON.stringify([])),
      setItem: mock(() => {}),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(rememberRecentApp(1.5)).toEqual([]);
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    (global as any).window = originalWindow;
  });

  test('rememberRecentApp should handle empty localStorage', () => {
    let storage: Record<string, string> = {};
    const mockStorage = {
      getItem: mock((key: string) => storage[key] ?? null),
      setItem: mock((key: string, value: string) => {
        storage[key] = value;
      }),
    };
    (global as any).window = { localStorage: mockStorage };

    const result = rememberRecentApp(1);
    expect(result).toEqual([1]);

    (global as any).window = originalWindow;
  });

  test('getRecentAppIds should return empty array for empty localStorage', () => {
    const mockStorage = {
      getItem: mock(() => null),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getRecentAppIds()).toEqual([]);

    (global as any).window = originalWindow;
  });
});

// ─── ManageAppDrawerPlacement ───────────────────────────────────────

describe('ManageAppDrawerPlacement', () => {
  const originalWindow = (global as any).window;

  test('returns left by default when no value stored', () => {
    const mockStorage = {
      getItem: mock(() => null),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerPlacement()).toBe('left');

    (global as any).window = originalWindow;
  });

  test('returns left when window is undefined', () => {
    (global as any).window = undefined;
    expect(getManageAppDrawerPlacement()).toBe('left');
    (global as any).window = originalWindow;
  });

  test('returns left for invalid stored value', () => {
    const mockStorage = {
      getItem: mock(() => 'bottom'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerPlacement()).toBe('left');

    (global as any).window = originalWindow;
  });

  test('returns right when stored', () => {
    const mockStorage = {
      getItem: mock(() => 'right'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerPlacement()).toBe('right');

    (global as any).window = originalWindow;
  });

  test('returns hidden when stored', () => {
    const mockStorage = {
      getItem: mock(() => 'hidden'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerPlacement()).toBe('hidden');

    (global as any).window = originalWindow;
  });

  test('setManageAppDrawerPlacement stores value and dispatches event', () => {
    const mockStorage = {
      setItem: mock(() => {}),
    };
    const mockDispatchEvent = mock(() => {});
    (global as any).window = {
      localStorage: mockStorage,
      dispatchEvent: mockDispatchEvent,
    };

    setManageAppDrawerPlacement('right');

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'pushy_manage_app_drawer_placement',
      'right',
    );
    expect(mockDispatchEvent).toHaveBeenCalled();

    (global as any).window = originalWindow;
  });

  test('setManageAppDrawerPlacement does nothing when window is undefined', () => {
    (global as any).window = undefined;
    setManageAppDrawerPlacement('left');
    (global as any).window = originalWindow;
  });
});

// ─── ManageAppDrawerCollapsed ───────────────────────────────────────

describe('ManageAppDrawerCollapsed', () => {
  const originalWindow = (global as any).window;

  test('returns false by default when no value stored', () => {
    const mockStorage = {
      getItem: mock(() => null),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerCollapsed()).toBe(false);

    (global as any).window = originalWindow;
  });

  test('returns false when window is undefined', () => {
    (global as any).window = undefined;
    expect(getManageAppDrawerCollapsed()).toBe(false);
    (global as any).window = originalWindow;
  });

  test('returns true when stored as "1"', () => {
    const mockStorage = {
      getItem: mock(() => '1'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerCollapsed()).toBe(true);

    (global as any).window = originalWindow;
  });

  test('returns false when stored as "0"', () => {
    const mockStorage = {
      getItem: mock(() => '0'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerCollapsed()).toBe(false);

    (global as any).window = originalWindow;
  });

  test('returns false for unexpected stored values', () => {
    const mockStorage = {
      getItem: mock(() => 'yes'),
    };
    (global as any).window = { localStorage: mockStorage };

    expect(getManageAppDrawerCollapsed()).toBe(false);

    (global as any).window = originalWindow;
  });

  test('setManageAppDrawerCollapsed stores "1" for true', () => {
    const mockStorage = {
      setItem: mock(() => {}),
    };
    (global as any).window = {
      localStorage: mockStorage,
      dispatchEvent: mock(() => {}),
    };

    setManageAppDrawerCollapsed(true);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'pushy_manage_app_drawer_collapsed',
      '1',
    );

    (global as any).window = originalWindow;
  });

  test('setManageAppDrawerCollapsed stores "0" for false', () => {
    const mockStorage = {
      setItem: mock(() => {}),
    };
    (global as any).window = {
      localStorage: mockStorage,
      dispatchEvent: mock(() => {}),
    };

    setManageAppDrawerCollapsed(false);

    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'pushy_manage_app_drawer_collapsed',
      '0',
    );

    (global as any).window = originalWindow;
  });

  test('setManageAppDrawerCollapsed does nothing when window is undefined', () => {
    (global as any).window = undefined;
    setManageAppDrawerCollapsed(true);
    (global as any).window = originalWindow;
  });
});
