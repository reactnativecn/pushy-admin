import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  createStoredPreference,
  useStoredPreference,
} from './stored-preference';

const KEY = 'stored_preference_test';

const createModePreference = () =>
  createStoredPreference<'a' | 'b'>({
    changeEvent: 'stored-preference-test-change',
    key: KEY,
    parse: (raw) => (raw === 'b' ? 'b' : 'a'),
    serialize: (value) => (value === 'a' ? null : value),
  });

// Bun 自带的 CustomEvent 不是 happy-dom 的 Event，派发到 happy-dom 的 window 会被拒绝
const originalCustomEvent = globalThis.CustomEvent;
beforeEach(() => {
  globalThis.CustomEvent = (window as unknown as typeof globalThis).CustomEvent;
});

afterEach(() => {
  globalThis.CustomEvent = originalCustomEvent;
  cleanup();
  localStorage.removeItem(KEY);
});

describe('createStoredPreference', () => {
  test('读写存储，默认值由 parse 决定', () => {
    const preference = createModePreference();
    expect(preference.get()).toBe('a');

    preference.set('b');
    expect(localStorage.getItem(KEY)).toBe('b');
    expect(preference.get()).toBe('b');

    // serialize 返回 null 时删除键
    preference.set('a');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  test('set 通知同页订阅方，storage 事件只认自己的键', () => {
    const preference = createModePreference();
    const onChange = mock(() => {});
    const unsubscribe = preference.subscribe(onChange);

    preference.set('b');
    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    preference.set('a');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  test('存储写不进去时退回内存', () => {
    const preference = createModePreference();
    const originalWindow = globalThis.window;
    // 模拟禁用站点数据：读不到、写入抛错
    (globalThis as { window: unknown }).window = {
      dispatchEvent: () => true,
      localStorage: {
        getItem: () => null,
        removeItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
      },
    };
    try {
      preference.set('b');
      expect(preference.get()).toBe('b');
    } finally {
      globalThis.window = originalWindow;
    }

    // 存储恢复后以存储为准
    preference.set('a');
    expect(preference.get()).toBe('a');
  });
});

describe('useStoredPreference', () => {
  test('值变化时重新渲染', () => {
    const preference = createModePreference();
    const { result } = renderHook(() => useStoredPreference(preference));
    expect(result.current).toBe('a');

    act(() => preference.set('b'));
    expect(result.current).toBe('b');

    act(() => {
      localStorage.setItem(KEY, 'a');
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });
    expect(result.current).toBe('a');
  });
});
