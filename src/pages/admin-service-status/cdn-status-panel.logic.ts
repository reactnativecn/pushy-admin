const DAY_SECONDS = 86_400;

/** 窗口内发送的平均带宽；节点历史不足一个窗口时按实际覆盖的时长计算。 */
export function averageMbps(bytes: number, coveredSeconds: number) {
  if (!(coveredSeconds > 0) || !Number.isFinite(bytes)) {
    return null;
  }
  return (bytes * 8) / coveredSeconds / 1_000_000;
}

export function formatMbps(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return '-';
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} Mbps`;
}

/** 分母为 0 时没有意义，返回 null，展示为「-」。 */
export function safeRatio(part: number, total: number) {
  return total > 0 ? part / total : null;
}

export function averageGetMs(sumMs: number, getRequests: number) {
  return getRequests > 0 ? sumMs / getRequests : null;
}

/** certNotAfter 为 0 表示节点读不到证书。向下取整，临近过期时宁可少报。 */
export function certDaysLeft(notAfter: number, nowMs: number) {
  if (!(notAfter > 0)) {
    return null;
  }
  return Math.floor((notAfter - nowMs / 1000) / DAY_SECONDS);
}
