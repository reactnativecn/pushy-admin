import { describe, expect, test } from 'bun:test';
import { versionKeys } from './query-keys';

describe('versionKeys', () => {
  describe('byApp', () => {
    test('returns correct query key for app', () => {
      expect(versionKeys.byApp(1)).toEqual(['versions', 1]);
    });

    test('works with different app ids', () => {
      expect(versionKeys.byApp(42)).toEqual(['versions', 42]);
      expect(versionKeys.byApp(0)).toEqual(['versions', 0]);
    });

    test('returns a readonly tuple', () => {
      const key = versionKeys.byApp(1);
      expect(key).toHaveLength(2);
      expect(key[0]).toBe('versions');
      expect(key[1]).toBe(1);
    });
  });

  describe('page', () => {
    test('returns correct paged query key', () => {
      expect(versionKeys.page(1, 0, 10)).toEqual([
        'versions',
        1,
        'page',
        0,
        10,
      ]);
    });

    test('handles non-zero offset', () => {
      expect(versionKeys.page(5, 20, 10)).toEqual([
        'versions',
        5,
        'page',
        20,
        10,
      ]);
    });

    test('different offsets produce different keys', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(1, 10, 10);
      expect(key1).not.toEqual(key2);
    });

    test('different limits produce different keys', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(1, 0, 20);
      expect(key1).not.toEqual(key2);
    });
  });

  describe('all', () => {
    test('returns correct "all" query key', () => {
      expect(versionKeys.all(1)).toEqual(['versions', 1, 'all']);
    });

    test('differs from byApp key', () => {
      expect(versionKeys.all(1)).not.toEqual(versionKeys.byApp(1));
    });

    test('differs from page key', () => {
      expect(versionKeys.all(1)).not.toEqual(versionKeys.page(1, 0, 10));
    });
  });

  describe('key isolation', () => {
    test('keys for different app ids are unique', () => {
      const key1 = versionKeys.byApp(1);
      const key2 = versionKeys.byApp(2);
      expect(key1).not.toEqual(key2);
    });

    test('page keys include app id for isolation', () => {
      const key1 = versionKeys.page(1, 0, 10);
      const key2 = versionKeys.page(2, 0, 10);
      expect(key1).not.toEqual(key2);
    });
  });
});
