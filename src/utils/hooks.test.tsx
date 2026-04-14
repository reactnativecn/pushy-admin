import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
} from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useLocalStorageCooldown } from './hooks';

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
    window.localStorage.setItem(STORAGE_KEY, String(1000000)); // Started right now

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(5); // 5000ms = 5s
  });

  test('should initialize with partial cooldown if time has elapsed', () => {
    // Started 2 seconds ago (2000ms)
    window.localStorage.setItem(STORAGE_KEY, String(1000000 - 2000));

    const { result } = renderHook(() =>
      useLocalStorageCooldown({
        storageKey: STORAGE_KEY,
        durationMs: DURATION_MS,
      }),
    );

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(3); // 3 seconds remaining
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

    // Advance time by 2000ms
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

    // Advance time past the duration
    act(() => {
      setSystemTime(new Date(1006000)); // +6000ms
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
