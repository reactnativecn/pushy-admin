import { describe, expect, mock, test } from 'bun:test';
import {
  LEGACY_PUSHY_CACHE_PREFIX,
  retireLegacyPwaState,
} from './service-worker-retirement';

describe('retireLegacyPwaState', () => {
  test('unregisters workers and deletes only pushy-admin caches', async () => {
    const unregisterA = mock(async () => true);
    const unregisterB = mock(async () => true);
    const deleteCache = mock(async () => true);

    await retireLegacyPwaState({
      serviceWorker: {
        getRegistrations: async () => [
          { unregister: unregisterA },
          { unregister: unregisterB },
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

    expect(unregisterA).toHaveBeenCalledTimes(1);
    expect(unregisterB).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('pushy-admin-v2');
    expect(deleteCache).toHaveBeenCalledWith('pushy-admin-v3');
    expect(deleteCache).not.toHaveBeenCalledWith('unrelated-cache');
  });

  test('keeps cleaning other state when one operation fails', async () => {
    const deleteCache = mock(async () => true);

    await expect(
      retireLegacyPwaState({
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
