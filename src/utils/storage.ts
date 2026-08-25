/**
 * localStorage 在 Safari 隐私模式、禁用站点数据或配额耗尽时会直接抛错。
 * 所有持久化偏好都走这里：读不到就当没存过，写不进就静默放弃，页面照常渲染。
 */
const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const safeStorage = {
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
