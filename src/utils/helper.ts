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
