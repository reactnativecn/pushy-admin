/**
 * localStorage 在 Safari 隐私模式、禁用站点数据或配额耗尽时会直接抛错。
 * 所有持久化偏好都走这里：读不到就当没存过，写不进就静默放弃，页面照常渲染。
 */
const createSafeStorage = (
  pick: (win: Window & typeof globalThis) => Storage,
) => {
  const getStorage = (): Storage | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return pick(window);
    } catch {
      return null;
    }
  };

  return {
    get(key: string): string | null {
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key: string, value: string): boolean {
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): boolean {
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
};

export const safeStorage = createSafeStorage((win) => win.localStorage);

/** 仅在当前标签页有效的 sessionStorage，容错方式同 safeStorage。 */
export const safeSessionStorage = createSafeStorage(
  (win) => win.sessionStorage,
);
