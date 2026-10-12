import { describe, expect, mock, test } from 'bun:test';
import {
  getManageAppDrawerCollapsed,
  getManageAppDrawerPlacement,
  getRecentAppIds,
  MAX_RECENT_APP_COUNT,
  RECENT_APP_STORAGE_KEY,
  rememberRecentApp,
  setManageAppDrawerCollapsed,
  setManageAppDrawerPlacement,
} from './app-preferences';

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
    const storage: Record<string, string> = {
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
    const storage: Record<string, string> = {};
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
