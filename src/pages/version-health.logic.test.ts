import { describe, expect, test } from 'bun:test';
import {
  buildVersionHealth,
  CATEGORY_SEPARATOR,
  type EventType,
  parseEventCategory,
} from './version-health.logic';

const category = (...parts: string[]) => parts.join(CATEGORY_SEPARATOR);

const labels: Record<EventType, string> = {
  download_success: 'ok',
  download_fail: 'dl-fail',
  patch_fail: 'patch-fail',
  rollback: 'rollback',
  mark_success: 'marked',
};

describe('parseEventCategory', () => {
  test('parses type, version and decoded package version', () => {
    expect(
      parseEventCategory(
        category('rollback', 'v1', encodeURIComponent('2.0 (1)')),
      ),
    ).toEqual({ type: 'rollback', version: 'v1', packageVersion: '2.0 (1)' });
  });

  test('old categories without a package version fall back to unknown', () => {
    expect(parseEventCategory(category('mark_success', 'v1'))).toEqual({
      type: 'mark_success',
      version: 'v1',
      packageVersion: 'unknown',
    });
    expect(parseEventCategory(category('mark_success', 'v1', ''))).toEqual({
      type: 'mark_success',
      version: 'v1',
      packageVersion: 'unknown',
    });
  });

  test('rejects unknown types, missing versions and bad encoding', () => {
    expect(parseEventCategory('rollback')).toBeNull();
    expect(parseEventCategory(category('other', 'v1'))).toBeNull();
    expect(parseEventCategory(category('rollback', ''))).toBeNull();
    expect(
      parseEventCategory(category('rollback', 'v1', '%E0%A4%A')),
    ).toBeNull();
  });
});

describe('buildVersionHealth', () => {
  test('returns empty results without data', () => {
    expect(buildVersionHealth(undefined, labels)).toEqual({
      rows: [],
      trendData: [],
    });
  });

  test('aggregates rows per version + package and trend per time + type', () => {
    const dict = [
      category('rollback', 'v1', '1.0'),
      category('mark_success', 'v1', '1.0'),
      category('download_fail', 'v2', '1.0'),
      category('download_success', 'v2', '1.0'),
      'junk',
    ];
    const { rows, trendData } = buildVersionHealth(
      {
        dict,
        data: [
          {
            time: '2026-01-02T00:00:00Z',
            data: [
              [0, 1],
              [1, 3],
              [4, 99],
            ],
          },
          {
            time: '2026-01-01T00:00:00Z',
            data: [
              [2, 2],
              [3, 6],
              [0, 1],
            ],
          },
        ],
      },
      labels,
    );

    expect(rows).toHaveLength(2);
    // 有回滚率的排前面
    expect(rows[0]).toMatchObject({
      version: 'v1',
      packageVersion: '1.0',
      rollbackRate: 0.4,
      downloadFailRate: null,
      total: 5,
    });
    expect(rows[1]).toMatchObject({
      version: 'v2',
      rollbackRate: null,
      downloadFailRate: 0.25,
      total: 8,
    });

    // 按时间升序；同一时间内保持首次出现的顺序
    expect(trendData).toEqual([
      { time: '2026-01-01T00:00:00Z', value: 2, category: 'dl-fail' },
      { time: '2026-01-01T00:00:00Z', value: 6, category: 'ok' },
      { time: '2026-01-01T00:00:00Z', value: 1, category: 'rollback' },
      { time: '2026-01-02T00:00:00Z', value: 1, category: 'rollback' },
      { time: '2026-01-02T00:00:00Z', value: 3, category: 'marked' },
    ]);
  });
});
