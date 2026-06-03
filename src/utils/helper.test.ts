import { describe, expect, test, mock } from 'bun:test';
import {
  MAX_RECENT_APP_COUNT,
  RECENT_APP_STORAGE_KEY,
  getRecentAppIds,
  isExpVersion,
  isPasswordValid,
  rememberRecentApp,
} from './helper';

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
});

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
});

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
});

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
});
