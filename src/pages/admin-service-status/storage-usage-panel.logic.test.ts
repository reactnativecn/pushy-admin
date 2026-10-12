import { describe, expect, test } from 'bun:test';
import type { StorageUsageTable } from '@/services/admin-api';
import { buildTableRows } from './storage-usage-panel.logic';

const table = (name: string, dataBytes: number, indexBytes = 0) =>
  ({
    name,
    rowsEstimate: 1,
    dataBytes,
    indexBytes,
    freeBytes: 0,
    totalBytes: dataBytes + indexBytes,
  }) satisfies StorageUsageTable;

describe('buildTableRows', () => {
  test('keeps every table when under the limit, sorted by size', () => {
    const rows = buildTableRows(
      [table('b', 10), table('a', 30, 10)],
      5,
      'other',
    );
    expect(rows.map((row) => row.name)).toEqual(['a', 'b']);
    expect(rows[0]?.share).toBe(0.8);
  });

  test('folds the tail into one row', () => {
    const rows = buildTableRows(
      [table('a', 50), table('b', 30), table('c', 15), table('d', 5)],
      2,
      'other',
    );
    expect(rows.map((row) => row.name)).toEqual(['a', 'b', 'other']);
    expect(rows[2]?.totalBytes).toBe(20);
    expect(rows[2]?.rowsEstimate).toBe(2);
    expect(rows[2]?.share).toBe(0.2);
    expect(rows[2]?.other).toBe(true);
    expect(rows[0]?.other).toBeUndefined();
  });

  test('reports zero share for an empty schema', () => {
    expect(buildTableRows([table('a', 0)], 5, 'other')[0]?.share).toBe(0);
  });
});
