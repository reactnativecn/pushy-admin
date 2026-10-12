import type { ConfigType } from 'dayjs';
import dayjs from '@/utils/dayjs';

// 展示用的格式化统一放这里。缺失值（null / undefined / NaN / Infinity）
// 一律显示 missing（默认 '-'），不当成 0：没观测到和观测到 0 是两回事。

const MISSING = '-';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** 千分位计数，原样保留小数。 */
export function formatCount(
  value: number | null | undefined,
  missing = MISSING,
) {
  return isFiniteNumber(value) ? value.toLocaleString() : missing;
}

/** 四舍五入到整数后再加千分位，用于平均值等可能带小数的计数。 */
export function formatInteger(
  value: number | null | undefined,
  missing = MISSING,
) {
  return isFiniteNumber(value) ? Math.round(value).toLocaleString() : missing;
}

/** 比例（0~1）转百分比。 */
export function formatPercent(
  ratio: number | null | undefined,
  digits = 1,
  missing = MISSING,
) {
  return isFiniteNumber(ratio) ? `${(ratio * 100).toFixed(digits)}%` : missing;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 1024 进制，B 到 PB 自动换单位；数值越大保留的小数越少。 */
export function formatBytes(
  value: number | null | undefined,
  missing = MISSING,
) {
  if (!isFiniteNumber(value) || value < 0) {
    return missing;
  }
  let scaled = value;
  let unit = 0;
  while (scaled >= 1024 && unit < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  if (unit === 0) {
    return `${scaled} B`;
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(digits)} ${BYTE_UNITS[unit]}`;
}

export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const DATE_TIME_SECONDS_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/** 日期时间；空值或无法解析时显示 missing。 */
export function formatDateTime(
  value: ConfigType | null | undefined,
  { seconds = false, missing = MISSING } = {},
) {
  if (value == null || value === '') {
    return missing;
  }
  const date = dayjs(value);
  if (!date.isValid()) {
    return missing;
  }
  return date.format(seconds ? DATE_TIME_SECONDS_FORMAT : DATE_TIME_FORMAT);
}
