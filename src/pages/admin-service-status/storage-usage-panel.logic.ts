import type { StorageUsageTable } from '@/services/admin-api';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 1024 进制，覆盖从单页表（16 KB）到整桶（TB）的跨度。 */
export function formatStorageBytes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '-';
  }
  let scaled = value;
  let unit = 0;
  while (scaled >= 1024 && unit < UNITS.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  if (unit === 0) {
    return `${scaled} B`;
  }
  return `${scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2)} ${UNITS[unit]}`;
}

/** 占比保留一位小数；分母为 0 时不显示。 */
export function formatShare(part: number, total: number) {
  if (!(total > 0) || !Number.isFinite(part)) {
    return '-';
  }
  return `${((part / total) * 100).toFixed(1)}%`;
}

export type StorageTableRow = StorageUsageTable & {
  share: number;
  /** 合并后的「其他」行，不是真实表名。 */
  other?: boolean;
};

/**
 * 按占用降序取前 limit 张表，其余合并成一行「其他」，避免几十张小表撑长卡片。
 * 服务端已排序，这里仍排一次，不依赖响应顺序。
 */
export function buildTableRows(
  tables: StorageUsageTable[],
  limit: number,
  otherLabel: string,
): StorageTableRow[] {
  const total = tables.reduce((sum, table) => sum + table.totalBytes, 0);
  const sorted = [...tables].sort(
    (left, right) =>
      right.totalBytes - left.totalBytes || left.name.localeCompare(right.name),
  );
  const withShare = (table: StorageUsageTable): StorageTableRow => ({
    ...table,
    share: total > 0 ? table.totalBytes / total : 0,
  });
  if (sorted.length <= limit) {
    return sorted.map(withShare);
  }
  const rest = sorted.slice(limit).reduce<StorageUsageTable>(
    (sum, table) => ({
      name: sum.name,
      rowsEstimate: sum.rowsEstimate + table.rowsEstimate,
      dataBytes: sum.dataBytes + table.dataBytes,
      indexBytes: sum.indexBytes + table.indexBytes,
      freeBytes: sum.freeBytes + table.freeBytes,
      totalBytes: sum.totalBytes + table.totalBytes,
    }),
    {
      name: otherLabel,
      rowsEstimate: 0,
      dataBytes: 0,
      indexBytes: 0,
      freeBytes: 0,
      totalBytes: 0,
    },
  );
  return [
    ...sorted.slice(0, limit).map(withShare),
    { ...withShare(rest), other: true },
  ];
}
