import { describe, expect, mock, test } from 'bun:test';
import {
  isLegacyPushyRegistration,
  LEGACY_PUSHY_CACHE_PREFIX,
  retireLegacyPwaState,
} from './service-worker-retirement';

const PAGE_ORIGIN = 'https://admin.example.com';

describe('isLegacyPushyRegistration', () => {
  test('matches the retired root worker through any registration slot', () => {
    const unregister = mock(async () => true);

    expect(
      isLegacyPushyRegistration(
        {
          active: { scriptURL: `${PAGE_ORIGIN}/sw.js` },
          unregister,
        },
        PAGE_ORIGIN,
      ),
    ).toBe(true);
    expect(
      isLegacyPushyRegistration(
        {
          waiting: { scriptURL: `${PAGE_ORIGIN}/sw.js?build=old` },
          unregister,
        },
        PAGE_ORIGIN,
      ),
    ).toBe(true);
  });

  test('rejects unrelated paths, origins and unknown registrations', () => {
    const unregister = mock(async () => true);

    expect(
      isLegacyPushyRegistration(
        {
          active: { scriptURL: `${PAGE_ORIGIN}/other-sw.js` },
          unregister,
        },
        PAGE_ORIGIN,
      ),
    ).toBe(false);
    expect(
      isLegacyPushyRegistration(
        {
          active: { scriptURL: 'https://other.example.com/sw.js' },
          unregister,
        },
        PAGE_ORIGIN,
      ),
    ).toBe(false);
    expect(isLegacyPushyRegistration({ unregister }, PAGE_ORIGIN)).toBe(false);
  });
});

describe('retireLegacyPwaState', () => {
  test('unregisters only the legacy worker and deletes only pushy-admin caches', async () => {
    const unregisterLegacy = mock(async () => true);
    const unregisterUnrelated = mock(async () => true);
    const deleteCache = mock(async () => true);

    await retireLegacyPwaState({
      pageOrigin: PAGE_ORIGIN,
      serviceWorker: {
        getRegistrations: async () => [
          {
            active: { scriptURL: `${PAGE_ORIGIN}/sw.js` },
            unregister: unregisterLegacy,
          },
          {
            active: { scriptURL: `${PAGE_ORIGIN}/other-sw.js` },
            unregister: unregisterUnrelated,
          },
        ],
      },
      cacheStorage: {
        keys: async () => [
          `${LEGACY_PUSHY_CACHE_PREFIX}v2`,
          'unrelated-cache',
          `${LEGACY_PUSHY_CACHE_PREFIX}v3`,
        ],
        delete: deleteCache,
      },
    });

    expect(unregisterLegacy).toHaveBeenCalledTimes(1);
    expect(unregisterUnrelated).not.toHaveBeenCalled();
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('pushy-admin-v2');
    expect(deleteCache).toHaveBeenCalledWith('pushy-admin-v3');
    expect(deleteCache).not.toHaveBeenCalledWith('unrelated-cache');
  });

  test('keeps cleaning other state when one operation fails', async () => {
    const deleteCache = mock(async () => true);

    await expect(
      retireLegacyPwaState({
        pageOrigin: PAGE_ORIGIN,
        serviceWorker: {
          getRegistrations: async () => {
            throw new Error('registration lookup failed');
          },
        },
        cacheStorage: {
          keys: async () => ['pushy-admin-v2'],
          delete: deleteCache,
        },
      }),
    ).resolves.toBeUndefined();

    expect(deleteCache).toHaveBeenCalledWith('pushy-admin-v2');
  });
});
