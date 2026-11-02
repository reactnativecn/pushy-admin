import { describe, expect, mock, test } from 'bun:test';
import {
  getManageAppDrawerCollapsed,
  getManageAppDrawerPlacement,
  getPinnedAppIds,
  getRecentAppIds,
  MAX_RECENT_APP_COUNT,
  movePinnedApp,
  PINNED_APP_STORAGE_KEY,
  RECENT_APP_STORAGE_KEY,
  rememberRecentApp,
  setManageAppDrawerCollapsed,
  setManageAppDrawerPlacement,
  sortAppsByPinned,
  togglePinnedApp,
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

// ─── PinnedApps ─────────────────────────────────────────────────────

describe('PinnedApps', () => {
  const originalWindow = (global as any).window;

  const installStorage = (initial: string | null) => {
    const store = new Map<string, string>();
    if (initial !== null) {
      store.set(PINNED_APP_STORAGE_KEY, initial);
    }
    (global as any).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
      dispatchEvent: mock(() => true),
    };
  };

  test('togglePinnedApp 新置顶的排最前，再次切换则取消', () => {
    installStorage(null);
    togglePinnedApp(1);
    togglePinnedApp(2);
    expect(getPinnedAppIds()).toEqual([2, 1]);
    togglePinnedApp(2);
    expect(getPinnedAppIds()).toEqual([1]);
    (global as any).window = originalWindow;
  });

  test('movePinnedApp 向上向下都挪到目标位置', () => {
    installStorage(JSON.stringify([1, 2, 3, 4]));
    movePinnedApp(4, 2);
    expect(getPinnedAppIds()).toEqual([1, 4, 2, 3]);
    movePinnedApp(1, 2);
    expect(getPinnedAppIds()).toEqual([4, 2, 1, 3]);
    (global as any).window = originalWindow;
  });

  test('movePinnedApp 任一方未置顶或目标是自己时不变', () => {
    installStorage(JSON.stringify([1, 2]));
    movePinnedApp(1, 99);
    movePinnedApp(99, 1);
    movePinnedApp(1, 1);
    expect(getPinnedAppIds()).toEqual([1, 2]);
    (global as any).window = originalWindow;
  });

  test('getPinnedAppIds 遇到损坏的存储值返回空数组', () => {
    installStorage('invalid json');
    expect(getPinnedAppIds()).toEqual([]);
    (global as any).window = originalWindow;
  });

  test('sortAppsByPinned 置顶在前，其余保持原有顺序', () => {
    const apps = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(sortAppsByPinned(apps, [3, 2])).toEqual([
      { id: 3 },
      { id: 2 },
      { id: 1 },
      { id: 4 },
    ]);
  });

  test('sortAppsByPinned 没有置顶时返回原数组', () => {
    const apps = [{ id: 1 }];
    expect(sortAppsByPinned(apps, [])).toBe(apps);
  });

  test('sortAppsByPinned 忽略不存在的和重复的 id', () => {
    const apps = [{ id: 1 }, { id: 2 }];
    expect(sortAppsByPinned(apps, [99, 2, 2])).toEqual([{ id: 2 }, { id: 1 }]);
  });
});
