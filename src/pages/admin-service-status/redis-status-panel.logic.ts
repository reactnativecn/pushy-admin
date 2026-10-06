export type UsageLevel = 'normal' | 'warning' | 'danger';

/** 已用 / 上限；上限为 0（未设置 maxmemory、maxclients）时返回 null。 */
export function usageRatio(used: number, max: number) {
  if (!(max > 0) || !Number.isFinite(used)) {
    return null;
  }
  return used / max;
}

/** 80% 起提示，90% 起告警：volatile-lru 下接近上限就会开始淘汰。 */
export function usageLevel(ratio: number | null): UsageLevel {
  if (ratio == null) {
    return 'normal';
  }
  if (ratio >= 0.9) {
    return 'danger';
  }
  return ratio >= 0.8 ? 'warning' : 'normal';
}

/** INFO 的 instantaneous_*_kbps 实际是 KB/s。 */
export function formatKBps(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '-';
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} MB/s`;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} KB/s`;
}

/** 平均 TTL：Redis 只对带过期时间的键取样，0 表示没有样本。 */
export function formatTtl(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return '-';
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`;
  }
  if (seconds < 3600) {
    return `${(seconds / 60).toFixed(0)}m`;
  }
  if (seconds < 86_400) {
    return `${(seconds / 3600).toFixed(1)}h`;
  }
  return `${(seconds / 86_400).toFixed(1)}d`;
}

/** 往返延迟保留到 0.1 ms，INFO 在内网通常 1 ms 左右。 */
export function formatLatency(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '-';
  }
  return ms >= 100 ? `${ms.toFixed(0)} ms` : `${ms.toFixed(1)} ms`;
}

/** 向下取整，避免 1,520,414 / 1,520,423 显示成 100.0% 而误以为全部带过期。 */
export function formatExpiringShare(expires: number, keys: number) {
  if (!(keys > 0) || !Number.isFinite(expires)) {
    return '-';
  }
  return `${(Math.floor((expires / keys) * 1000) / 10).toFixed(1)}%`;
}
