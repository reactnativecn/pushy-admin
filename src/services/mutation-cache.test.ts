import { describe, expect, test } from 'bun:test';
import type { App } from '@/types';
import {
  type ListCache,
  removeItemsFromList,
  updateAppDetailCache,
  updateItemInList,
} from './mutation-cache';

const apps: App[] = [
  { id: 1, name: 'one', platform: 'android', appKey: 'key-1' },
  { id: 2, name: 'two', platform: 'ios', appKey: 'key-2' },
];

describe('app mutation cache updaters', () => {
  test('leave missing caches missing instead of synthesizing partial data', () => {
    expect(removeItemsFromList<ListCache<App>>(undefined, [1])).toBeUndefined();
    expect(
      updateItemInList<ListCache<App>>(undefined, 1, { name: 'renamed' }),
    ).toBeUndefined();
    expect(
      updateAppDetailCache(undefined, { name: 'renamed' }),
    ).toBeUndefined();
  });

  test('remove only the requested app from an existing list', () => {
    expect(removeItemsFromList({ data: apps }, [1])).toEqual({
      data: [apps[1]],
    });
  });

  test('update existing list and detail entries without mutating the source', () => {
    const list = { data: apps };
    const detail = apps[0];

    expect(updateItemInList(list, 1, { name: 'renamed' })).toEqual({
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

describe('generic list cache updaters', () => {
  type Item = { id: number; note?: string };
  const items: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];

  test('keep extra cache fields such as count', () => {
    const cache = { data: items, count: 10 };

    expect(updateItemInList(cache, 2, { note: 'x' })).toEqual({
      data: [{ id: 1 }, { id: 2, note: 'x' }, { id: 3 }],
      count: 10,
    });
    expect(removeItemsFromList(cache, [1, 3])).toEqual({
      data: [{ id: 2 }],
      count: 10,
    });
  });

  test('ignore unknown ids and leave the source untouched', () => {
    const cache = { data: items };

    expect(updateItemInList(cache, 99, { note: 'x' })).toEqual(cache);
    expect(removeItemsFromList(cache, [99])).toEqual(cache);
    expect(cache.data).toHaveLength(3);
    expect(cache.data[1]?.note).toBeUndefined();
  });

  test('keep a cache without data as is', () => {
    expect(updateItemInList<ListCache<Item>>({}, 1, { note: 'x' })).toEqual({
      data: undefined,
    });
    expect(removeItemsFromList<ListCache<Item>>({}, [1])).toEqual({
      data: undefined,
    });
  });
});
