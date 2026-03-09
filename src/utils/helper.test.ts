import { describe, expect, test } from 'bun:test';
import { isExpVersion, isSafeRedirect } from './helper';

describe('isSafeRedirect', () => {
  test('should return true for internal paths', () => {
    expect(isSafeRedirect('/dashboard')).toBe(true);
    expect(isSafeRedirect('/user/profile')).toBe(true);
    expect(isSafeRedirect('/')).toBe(true);
  });

  test('should return false for empty or nullish values', () => {
    expect(isSafeRedirect(null)).toBe(false);
    expect(isSafeRedirect(undefined)).toBe(false);
    expect(isSafeRedirect('')).toBe(false);
  });

  test('should return false for external URLs', () => {
    expect(isSafeRedirect('https://google.com')).toBe(false);
    expect(isSafeRedirect('http://malicious.com')).toBe(false);
    expect(isSafeRedirect('ftp://server.com')).toBe(false);
  });

  test('should return false for protocol-relative URLs', () => {
    expect(isSafeRedirect('//google.com')).toBe(false);
  });

  test('should return false for backslash-prefixed paths (potential bypass)', () => {
    expect(isSafeRedirect('/\\google.com')).toBe(false);
  });

  test('should return false for paths that do not start with /', () => {
    expect(isSafeRedirect('user/profile')).toBe(false);
    expect(isSafeRedirect('javascript:alert(1)')).toBe(false);
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
    // @ts-expect-error
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
