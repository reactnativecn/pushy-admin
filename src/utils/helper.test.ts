import { describe, expect, test } from 'bun:test';
import { isExpVersion, isPasswordValid } from './helper';

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

import { afterEach } from 'bun:test';
import { getRecentAppIds, RECENT_APP_STORAGE_KEY } from './helper';

describe('getRecentAppIds', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  test('should return empty array when localStorage contains invalid JSON', () => {
    window.localStorage.setItem(RECENT_APP_STORAGE_KEY, 'invalid json');
    expect(getRecentAppIds()).toEqual([]);
  });

  test('should return empty array when localStorage contains non-array JSON', () => {
    window.localStorage.setItem(RECENT_APP_STORAGE_KEY, '{"a": 1}');
    expect(getRecentAppIds()).toEqual([]);
  });

  test('should return filtered array of integers when localStorage contains valid array', () => {
    window.localStorage.setItem(RECENT_APP_STORAGE_KEY, '[1, "2", 3.5, 4]');
    expect(getRecentAppIds()).toEqual([1, 4]);
  });

  test('should return empty array when window is undefined', () => {
    const originalWindow = global.window;
    // @ts-expect-error
    delete global.window;
    expect(getRecentAppIds()).toEqual([]);
    global.window = originalWindow;
  });
});
