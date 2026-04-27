import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom';

export function isPasswordValid(password: string) {
  return /(?!^[0-9]+$)(?!^[a-z]+$)(?!^[^A-Z]+$)^.{6,16}$/.test(password);
}

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function promiseAny<T>(promises: Promise<T>[]) {
  return new Promise<T>((resolve, reject) => {
    let count = 0;

    for (const promise of promises) {
      Promise.resolve(promise)
        .then(resolve)
        .catch(() => {
          count++;
          if (count === promises.length) {
            reject(Error('All promises were rejected'));
          }
        });
    }
  });
}

export const ping = async (url: string) => {
  return Promise.race([
    fetch(url, {
      method: 'HEAD',
    })
      .then(({ status }) => {
        if (status === 200) {
          return url;
        }
        throw Error('ping failed');
      })
      .catch(() => {
        throw Error('ping error');
      }),
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(Error('ping timeout'));
      }, 2000),
    ),
  ]) as Promise<string | null>;
};

export const testUrls = async (urls?: string[]) => {
  if (!urls?.length) {
    return null;
  }
  const ret = await promiseAny(urls.map(ping));
  if (ret) {
    return ret;
  }
  return urls[0];
};

export const isExpVersion = (
  config: VersionConfig | null | undefined,
  packageVersion: string,
): boolean => {
  if (!config?.rollout) return false;

  const rollout = config.rollout[packageVersion];
  if (rollout === null) return false;

  return rollout < 100;
};

export const patchSearchParams = (
  setSearchParams: SetURLSearchParams,
  patch: Record<string, string | null | undefined>,
  navigateOptions: NavigateOptions = { replace: true },
) => {
  setSearchParams((prev) => {
    const next = new URLSearchParams(prev);

    for (const [key, value] of Object.entries(patch)) {
      if (value == null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }

    return next;
  }, navigateOptions);
};

const RECENT_APP_STORAGE_KEY = 'pushy_recent_app_ids';
const MAX_RECENT_APP_COUNT = 6;

export const getRecentAppIds = () => {
  if (typeof window === 'undefined') {
    return [] as number[];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_APP_STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is number => Number.isInteger(value));
  } catch {
    return [];
  }
};

export const rememberRecentApp = (appId: number) => {
  if (typeof window === 'undefined' || !Number.isInteger(appId)) {
    return [] as number[];
  }

  const next = [appId, ...getRecentAppIds().filter((id) => id !== appId)].slice(
    0,
    MAX_RECENT_APP_COUNT,
  );
  window.localStorage.setItem(RECENT_APP_STORAGE_KEY, JSON.stringify(next));
  return next;
};
