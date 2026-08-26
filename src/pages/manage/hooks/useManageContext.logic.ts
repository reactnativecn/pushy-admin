import type { Binding, Package } from '@/types';

/** 管理页上下文里的纯推导:哪些原生包还没绑过任何热更版本 */

// 旧数据把版本直接挂在 package.versions 上,没有 binding 记录也算已绑定
export function hasLegacyVersionBinding(pkg: Package) {
  return pkg.versions !== null && pkg.versions !== undefined;
}

// bindings 还在加载时不能下结论,否则会把所有包都当成未使用
export function getUnusedPackages(
  packages: Package[],
  bindings: Binding[],
  bindingsLoading: boolean,
): Package[] {
  if (bindingsLoading) {
    return [];
  }

  const boundPackageIds = new Set(bindings.map((binding) => binding.packageId));
  return packages.filter(
    (pkg) => !hasLegacyVersionBinding(pkg) && !boundPackageIds.has(pkg.id),
  );
}

/** 没有任何绑定就不必去拉 diff 状态 */
export function shouldLoadDiffStatus({
  bindings,
  bindingsLoading,
  packages,
  packagesLoading,
}: {
  bindings: Binding[];
  bindingsLoading: boolean;
  packages: Package[];
  packagesLoading: boolean;
}) {
  return (
    !bindingsLoading &&
    !packagesLoading &&
    (bindings.length > 0 || packages.some(hasLegacyVersionBinding))
  );
}
