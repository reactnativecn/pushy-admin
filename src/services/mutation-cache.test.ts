import { describe, expect, test } from 'bun:test';
import type { App } from '@/types';
import {
  removeAppFromListCache,
  updateAppDetailCache,
  updateAppInListCache,
} from './mutation-cache';

const apps: App[] = [
  { id: 1, name: 'one', platform: 'android', appKey: 'key-1' },
  { id: 2, name: 'two', platform: 'ios', appKey: 'key-2' },
];

describe('app mutation cache updaters', () => {
  test('leave missing caches missing instead of synthesizing partial data', () => {
    expect(removeAppFromListCache(undefined, 1)).toBeUndefined();
    expect(
      updateAppInListCache(undefined, 1, { name: 'renamed' }),
    ).toBeUndefined();
    expect(
      updateAppDetailCache(undefined, { name: 'renamed' }),
    ).toBeUndefined();
  });

  test('remove only the requested app from an existing list', () => {
    expect(removeAppFromListCache({ data: apps }, 1)).toEqual({
      data: [apps[1]],
    });
  });

  test('update existing list and detail entries without mutating the source', () => {
    const list = { data: apps };
    const detail = apps[0];

    expect(updateAppInListCache(list, 1, { name: 'renamed' })).toEqual({
      data: [{ ...apps[0], name: 'renamed' }, apps[1]],
    });
    expect(updateAppDetailCache(detail, { name: 'renamed' })).toEqual({
      ...detail,
      name: 'renamed',
    });
    expect(list.data?.[0]?.name).toBe('one');
    expect(detail?.name).toBe('one');
  });
});
