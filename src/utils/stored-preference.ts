import { useSyncExternalStore } from 'react';
import { safeStorage } from '@/utils/storage';

// 快照必须是原始值：useSyncExternalStore 靠 Object.is 判断是否变化
type PreferenceValue = string | number | boolean | null;

export type StoredPreference<T extends PreferenceValue> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (onChange: () => void) => () => void;
};

/**
 * 存在 localStorage 里、多个组件共用的界面偏好（抽屉位置、自定义接口地址等）。
 * - 同一页面：set 后派发 changeEvent，所有订阅的组件一起刷新；
 * - 其他标签页：监听 storage 事件；
 * - 存储写不进去（禁用站点数据等）：退回内存，本页会话内照样生效。
 */
export function createStoredPreference<T extends PreferenceValue>({
  changeEvent,
  key,
  parse,
  serialize,
}: {
  changeEvent: string;
  key: string;
  /** 把存储里的原始值解析成偏好值；没存过时为 null。 */
  parse: (raw: string | null) => T;
  /** 返回 null 表示删掉这个键（恢复默认）。 */
  serialize: (value: T) => string | null;
}): StoredPreference<T> {
  // 存储写入失败时的内存兜底；undefined 表示以存储为准
  let fallback: string | null | undefined;

  const get = () => {
    if (typeof window === 'undefined') {
      return parse(null);
    }
    return parse(fallback !== undefined ? fallback : safeStorage.get(key));
  };

  const set = (value: T) => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = serialize(value);
    const saved =
      raw === null ? safeStorage.remove(key) : safeStorage.set(key, raw);
    fallback = saved ? undefined : raw;
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: value }));
  };

  const subscribe = (onChange: () => void) => {
    const onStorage = (event: StorageEvent) => {
      // key 为 null 表示其他标签页清空了整个存储
      if (event.key === null || event.key === key) {
        onChange();
      }
    };
    window.addEventListener(changeEvent, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(changeEvent, onChange);
      window.removeEventListener('storage', onStorage);
    };
  };

  return { get, set, subscribe };
}

/** 订阅一个 StoredPreference，值变化（本页或其他标签页）时重新渲染。 */
export function useStoredPreference<T extends PreferenceValue>(
  preference: StoredPreference<T>,
): T {
  return useSyncExternalStore(
    preference.subscribe,
    preference.get,
    preference.get,
  );
}
