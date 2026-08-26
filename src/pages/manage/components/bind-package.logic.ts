import { packageSupportsForceBoot } from '@/utils/helper';

/** 绑定原生包的纯逻辑:依赖变更对比、灰度菜单规则、forceBoot 入口 */

export type DepChangeType = 'added' | 'removed' | 'changed';

export type DepChangeRow = {
  key: string;
  dependency: string;
  oldVersion: string;
  newVersion: string;
  changeType: DepChangeType;
};

export type DepChangeSummary = {
  added: number;
  removed: number;
  changed: number;
};

export type DepChangeFilters = Record<DepChangeType, boolean>;

export type PublishPackage = {
  id: number;
  name: string;
  deps?: Record<string, string>;
};

export type DepsChangePackage = {
  pkg: PublishPackage;
  changes: DepChangeRow[];
};

/** 灰度菜单可选的百分比档位 */
export const ROLLOUT_PERCENTAGES = [1, 2, 5, 10, 20, 50];

export function getDepsChangeSummary(
  changes: DepChangeRow[],
): DepChangeSummary {
  return changes.reduce(
    (acc, item) => {
      if (item.changeType === 'added') {
        acc.added += 1;
      } else if (item.changeType === 'removed') {
        acc.removed += 1;
      } else {
        acc.changed += 1;
      }
      return acc;
    },
    { added: 0, removed: 0, changed: 0 },
  );
}

// 任一侧没有依赖清单(旧 CLI 上传)就无从比较,返回 null 而不是空数组
export function getDepsChanges(
  oldDeps?: Record<string, string>,
  newDeps?: Record<string, string>,
): DepChangeRow[] | null {
  if (!oldDeps || !newDeps) {
    return null;
  }
  const rows: DepChangeRow[] = [];
  const keys = Array.from(
    new Set([...Object.keys(oldDeps || {}), ...Object.keys(newDeps || {})]),
  ).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const oldValue = oldDeps[key];
    const newValue = newDeps[key];
    if (oldValue === undefined && newValue !== undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: '-',
        newVersion: newValue,
        changeType: 'added',
      });
      continue;
    }
    if (oldValue !== undefined && newValue === undefined) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: '-',
        changeType: 'removed',
      });
      continue;
    }
    if (
      oldValue !== newValue &&
      oldValue !== undefined &&
      newValue !== undefined
    ) {
      rows.push({
        key,
        dependency: key,
        oldVersion: oldValue,
        newVersion: newValue,
        changeType: 'changed',
      });
    }
  }
  return rows;
}

/** 只留下依赖确实有变化的包,发布前逐包确认 */
export function getDepsChangedPackages(
  pkgs: PublishPackage[],
  versionDeps?: Record<string, string>,
): DepsChangePackage[] {
  return pkgs.reduce<DepsChangePackage[]>((acc, pkg) => {
    const changes = getDepsChanges(pkg.deps, versionDeps);
    if (changes?.length) {
      acc.push({ pkg, changes });
    }
    return acc;
  }, []);
}

/**
 * 已绑定包的灰度状态:rollout 缺省或 100 视为全量;
 * 未到 50% 时还能往上调,只列出比当前更大的档位。
 */
export function getBindingRolloutState(rollout: number | null | undefined) {
  const isFull = rollout === 100 || rollout === undefined || rollout === null;
  const rolloutNumber = Number(rollout);
  const canStage = rolloutNumber < 50 && !isFull;
  return {
    isFull,
    rolloutNumber,
    stagedOptions: canStage
      ? ROLLOUT_PERCENTAGES.filter((percentage) => percentage > rolloutNumber)
      : [],
  };
}

// 已开启的绑定即使包本身不满足版本要求也要能关掉,否则标记就摘不下来
export function canToggleForceBoot(
  packageDeps: Record<string, string> | undefined,
  forceBootOn: boolean,
) {
  return packageSupportsForceBoot(packageDeps) || forceBootOn;
}

/** 「全部包」菜单只有在每个包都支持时才提供强制启动,避免半批成功 */
export function canForceBootAll(pkgs: PublishPackage[]) {
  return pkgs.every((pkg) => packageSupportsForceBoot(pkg.deps));
}
