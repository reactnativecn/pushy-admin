import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import { getPackageTimestampWarnings, useLocalStorageCooldown } from './hooks';

// ─── getPackageTimestampWarnings ─────────────────────────────────────

describe('getPackageTimestampWarnings', () => {
  const makePackage = (id: number, name: string, buildTime?: string) =>
    ({
      id,
      name,
      hash: `hash-${id}`,
      buildTime,
    }) as unknown as import('@/types').Package;

  test('returns empty map when dict is undefined', () => {
    const result = getPackageTimestampWarnings({
      dict: undefined,
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('returns empty map when dict is empty', () => {
    const result = getPackageTimestampWarnings({
      dict: [],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('returns empty map when packages is empty', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_2024-06-01'],
      packages: [],
    });
    expect(result.size).toBe(0);
  });

  test('returns empty map when no metric entries match prefix', () => {
    const result = getPackageTimestampWarnings({
      dict: ['someOtherMetric_value', 'anotherPrefix_123'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('returns empty map when all entries match current buildTime', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_2024-01-01'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('detects warning when buildTime differs', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_2024-06-01'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(['2024-06-01']);
  });

  test('ignores entries with "unknown" timestamp', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_unknown'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('ignores entries with "0" timestamp', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_0'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });

  test('handles multiple packages with different warnings', () => {
    const result = getPackageTimestampWarnings({
      dict: [
        'packageVersion_buildTime\x1fcom.app1_2024-06-01',
        'packageVersion_buildTime\x1fcom.app2_2024-07-01',
      ],
      packages: [
        makePackage(1, 'com.app1', '2024-01-01'),
        makePackage(2, 'com.app2', '2024-02-01'),
      ],
    });
    expect(result.size).toBe(2);
    expect(result.get(1)).toEqual(['2024-06-01']);
    expect(result.get(2)).toEqual(['2024-07-01']);
  });

  test('collects multiple different timestamps for same package', () => {
    const result = getPackageTimestampWarnings({
      dict: [
        'packageVersion_buildTime\x1fcom.app_2024-03-01',
        'packageVersion_buildTime\x1fcom.app_2024-06-01',
      ],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(['2024-03-01', '2024-06-01']);
  });

  test('deduplicates same timestamps', () => {
    const result = getPackageTimestampWarnings({
      dict: [
        'packageVersion_buildTime\x1fcom.app_2024-06-01',
        'packageVersion_buildTime\x1fcom.app_2024-06-01',
      ],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(['2024-06-01']);
  });

  test('handles package with no current buildTime (undefined)', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.app_2024-06-01'],
      packages: [makePackage(1, 'com.app', undefined)],
    });
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(['2024-06-01']);
  });

  test('handles package names that contain underscores', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1fcom.my_app_2024-06-01'],
      packages: [makePackage(1, 'com.my_app', '2024-01-01')],
    });
    expect(result.size).toBe(1);
    expect(result.get(1)).toEqual(['2024-06-01']);
  });

  test('timestamps are sorted in output', () => {
    const result = getPackageTimestampWarnings({
      dict: [
        'packageVersion_buildTime\x1fcom.app_2024-12-01',
        'packageVersion_buildTime\x1fcom.app_2024-03-01',
        'packageVersion_buildTime\x1fcom.app_2024-06-01',
      ],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    const timestamps = result.get(1)!;
    expect(timestamps).toEqual(['2024-03-01', '2024-06-01', '2024-12-01']);
  });

  test('metric value with no content after prefix is ignored', () => {
    const result = getPackageTimestampWarnings({
      dict: ['packageVersion_buildTime\x1f'],
      packages: [makePackage(1, 'com.app', '2024-01-01')],
    });
    expect(result.size).toBe(0);
  });
});

// ─── useLocalStorageCooldown ────────────────────────────────────────

describe('useLocalStorageCooldown', () => {
  const STORAGE_KEY = 'test_cooldown';
  const DURATION_MS = 5000;

  beforeEach(() => {
    window.localStorage.clear();
    setSystemTime(new Date(1000000));
  });

  afterEach(() => {
    cleanup();
  });

  test('should initialize with 0 remaining seconds and not cooling down', () => {
    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  test('should initialize correctly when cooldown is already active in localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, String(1000000));

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(5);
  });

  test('should initialize with partial cooldown if time has elapsed', () => {
    window.localStorage.setItem(STORAGE_KEY, String(1000000 - 2000));

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(3);
  });

  test('should start cooldown and update localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    act(() => {
      result.current.startCooldown();
    });

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(5);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1000000');
  });

  test('should decrease remaining seconds over time', () => {
    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    act(() => {
      result.current.startCooldown();
    });

    expect(result.current.remainingSeconds).toBe(5);

    act(() => {
      setSystemTime(new Date(1002000));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.remainingSeconds).toBe(3);
  });

  test('should stop cooling down and clear localStorage when duration is reached', () => {
    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    act(() => {
      result.current.startCooldown();
    });

    act(() => {
      setSystemTime(new Date(1006000));
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('should not react to storage events for other keys', () => {
    window.localStorage.setItem(STORAGE_KEY, String(1000000));

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(true);

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other_key' }));
    });

    expect(result.current.isCoolingDown).toBe(true);
  });

  test('should handle invalid stored value gracefully', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-a-number');

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  test('should handle negative stored value gracefully', () => {
    window.localStorage.setItem(STORAGE_KEY, '-1000');

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });
});
