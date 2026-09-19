// Preserve missingness: an absent observation is not an observed zero.
export function observationNumber(
  value: number | null | undefined,
  missing: string,
): string {
  return value == null || !Number.isFinite(value)
    ? missing
    : value.toLocaleString();
}

export function observationPercent(
  value: number | null | undefined,
  missing: string,
): string {
  return value == null || !Number.isFinite(value)
    ? missing
    : `${(value * 100).toFixed(1)}%`;
}

export function observationBytes(
  value: number | null | undefined,
  missing: string,
): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return missing;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}
