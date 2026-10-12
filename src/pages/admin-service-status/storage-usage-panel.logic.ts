import type { StorageUsageTable } from '@/services/admin-api';

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
