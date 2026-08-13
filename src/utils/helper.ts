import type { NavigateOptions, SetURLSearchParams } from 'react-router-dom';
import type { VersionConfig } from '@/types';

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

export const ping = async (url: string, signal?: AbortSignal) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await (Promise.race([
      fetch(url, {
        method: 'HEAD',
        signal,
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
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(Error('ping timeout'));
        }, 2000);
      }),
    ]) as Promise<string | null>);
  } finally {
    clearTimeout(timer);
  }
};

const HEDGE_DELAY_MS = 250;

// Hedged race instead of pinging every endpoint at once: the preferred (first)
// url is tried immediately, each following one only after HEDGE_DELAY_MS of
// silence (or immediately when a previous ping failed). The first success wins
// and the losing pings are aborted. Falls back to urls[0] when all fail.
export const testUrls = async (
  urls?: string[],
  hedgeDelayMs: number = HEDGE_DELAY_MS,
) => {
  if (!urls?.length) {
    return null;
  }
  return new Promise<string>((resolve) => {
    const controllers: AbortController[] = [];
    let nextIndex = 0;
    let pending = 0;
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (
      winner: string | null,
      winnerController?: AbortController,
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
      }
      for (const controller of controllers) {
        if (controller !== winnerController) {
          controller.abort();
        }
      }
      resolve(winner ?? urls[0]);
    };

    const launchNext = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = undefined;
      }
      if (settled || nextIndex >= urls.length) {
        return;
      }
      const url = urls[nextIndex++];
      const controller = new AbortController();
      controllers.push(controller);
      pending++;
      ping(url, controller.signal).then(
        () => finish(url, controller),
        () => {
          pending--;
          if (settled) {
            return;
          }
          if (nextIndex < urls.length) {
            // A failure frees its slot: hedge the next url right away.
            launchNext();
          } else if (pending === 0) {
            finish(null);
          }
        },
      );
      if (!settled && nextIndex < urls.length) {
        hedgeTimer = setTimeout(launchNext, hedgeDelayMs);
      }
    };

    launchNext();
  });
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

export const RECENT_APP_STORAGE_KEY = 'pushy_recent_app_ids';
export const MAX_RECENT_APP_COUNT = 6;
const MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY =
  'pushy_manage_app_drawer_placement';
const MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY =
  'pushy_manage_app_drawer_collapsed';

export type ManageAppDrawerPlacement = 'left' | 'right' | 'hidden';

export const manageAppDrawerPlacementChangeEvent =
  'manage-app-drawer-placement-change';
export const manageAppDrawerCollapsedChangeEvent =
  'manage-app-drawer-collapsed-change';

export const getManageAppDrawerPlacement = (): ManageAppDrawerPlacement => {
  if (typeof window === 'undefined') {
    return 'left';
  }

  const stored = window.localStorage.getItem(
    MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY,
  );
  if (stored === 'right' || stored === 'hidden') {
    return stored;
  }
  return 'left';
};

export const setManageAppDrawerPlacement = (
  placement: ManageAppDrawerPlacement,
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    MANAGE_APP_DRAWER_PLACEMENT_STORAGE_KEY,
    placement,
  );
  window.dispatchEvent(
    new CustomEvent(manageAppDrawerPlacementChangeEvent, {
      detail: placement,
    }),
  );
};

export const getManageAppDrawerCollapsed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const stored = window.localStorage.getItem(
    MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY,
  );
  if (stored === '1') {
    return true;
  }
  if (stored === '0') {
    return false;
  }
  return false;
};

export const setManageAppDrawerCollapsed = (collapsed: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    MANAGE_APP_DRAWER_COLLAPSED_STORAGE_KEY,
    collapsed ? '1' : '0',
  );
  window.dispatchEvent(
    new CustomEvent(manageAppDrawerCollapsedChangeEvent, {
      detail: collapsed,
    }),
  );
};

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

export const isValidExternalUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }
    const trustedDomains = [
      'react-native.cn',
      'reactnative.cn',
      'rnupdate.online',
      'alipay.com',
    ];
    return trustedDomains.some(
      (domain) =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
};

// ---- 绑定依赖校验(服务端为权威,这里预检提前挡住并给出可读原因) ----

/** 容忍 ^ ~ >= 等 range 前缀,取第一个 x.y.z;解析失败返回 null */
export function parseDepVersion(raw?: string): [number, number, number] | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const matched = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!matched) {
    return null;
  }
  return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
}

export function compareDepVersions(
  a: [number, number, number],
  b: [number, number, number],
) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
}

/**
 * 绑定硬规则(与服务端 bindingDeps 一致):RN 版本不同 / react-native-update
 * 降级 → 禁止绑定。deps 缺失或解析失败不拦(存量数据,服务端同样放行)。
 */
export function getFatalDepsViolation(
  packageDeps: Record<string, string> | undefined,
  versionDeps: Record<string, string> | undefined,
): 'rn_mismatch' | 'rnu_downgrade' | null {
  const pkgRn = parseDepVersion(packageDeps?.['react-native']);
  const verRn = parseDepVersion(versionDeps?.['react-native']);
  if (pkgRn && verRn && compareDepVersions(pkgRn, verRn) !== 0) {
    return 'rn_mismatch';
  }
  const pkgRnu = parseDepVersion(packageDeps?.['react-native-update']);
  const verRnu = parseDepVersion(versionDeps?.['react-native-update']);
  if (pkgRnu && verRnu && compareDepVersions(verRnu, pkgRnu) < 0) {
    return 'rnu_downgrade';
  }
  return null;
}

/**
 * forceBoot 只对 react-native-update >= 10.52.1 的原生包展示入口——统一
 * 以完整救援能力(崩溃时刻救援 + 断点续传,且鸿蒙桥接修复后原生检测真实
 * 可用)作为门槛,不按平台分叉。低于门槛或未知一律不展示。
 */
export function packageSupportsForceBoot(
  packageDeps?: Record<string, string>,
): boolean {
  const rnu = parseDepVersion(packageDeps?.['react-native-update']);
  return !!rnu && compareDepVersions(rnu, [10, 52, 1]) >= 0;
}
