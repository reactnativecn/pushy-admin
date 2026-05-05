import { describe, expect, test } from 'bun:test';
import { cn, isExpVersion, isPasswordValid } from './helper';

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

describe('cn', () => {
  test('should combine multiple valid strings', () => {
    expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
  });

  test('should ignore undefined values', () => {
    expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
  });

  test('should ignore empty strings', () => {
    expect(cn('class1', '', 'class2')).toBe('class1 class2');
  });

  test('should return empty string when handling an empty input list', () => {
    expect(cn()).toBe('');
  });

  test('should return empty string when all inputs are falsy', () => {
    expect(cn('', undefined)).toBe('');
  });
});
