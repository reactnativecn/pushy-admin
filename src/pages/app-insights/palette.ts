import type { HitOutcome } from './types';

// 请求结果的固定配色：颜色跟着类别走，不随当天有哪些类别而变。
// 命中更新的三类用蓝紫青，"已是最新"用中性灰，拒绝类用红橙，暂停/过期用黄褐。
export const HIT_OUTCOME_COLORS: Record<HitOutcome, string> = {
  uptodate: '#94a3b8',
  hdiff: '#2563eb',
  pdiff: '#7c3aed',
  full: '#0e7490',
  paused: '#ca8a04',
  expired: '#a16207',
  blocked: '#dc2626',
  unknown_package: '#ea580c',
};
