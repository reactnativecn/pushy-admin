import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { App, Binding, Package, VersionDiffSummary } from '@/types';
import {
  type PackageMetricWarnings,
  useBinding,
  useDiffStatus,
  usePackageMetricWarnings,
  usePackages,
} from '@/utils/hooks';

const noop = () => {};

export const defaultManageContext = {
  appId: 0,
  app: undefined,
  deepLink: '',
  setDeepLink: noop,
  packages: [],
  unusedPackages: [],
  bindings: [],
  packageMap: new Map(),
  packageMetricWarnings: new Map(),
  diffStatusByVersion: new Map(),
};

export const ManageContext = createContext<{
  appId: number;
  app?: App;
  deepLink: string;
  setDeepLink: (deepLink: string) => void;
  packages: Package[];
  unusedPackages: Package[];
  packagesLoading?: boolean;
  packageMap: Map<number, Package>;
  bindings: Binding[];
  bindingsLoading?: boolean;
  packageMetricWarnings: Map<number, PackageMetricWarnings>;
  packageMetricWarningsLoading?: boolean;
  diffStatusByVersion: Map<number, VersionDiffSummary>;
}>(defaultManageContext);

export const useManageContext = () => useContext(ManageContext);

function hasLegacyVersionBinding(pkg: Package) {
  return pkg.versions !== null && pkg.versions !== undefined;
}

export const ManageProvider = ({
  children,
  appId,
  app,
}: {
  children: ReactNode;
  appId: number;
  app?: App;
}) => {
  const [deepLink, setDeepLink] = useState(
    window.localStorage.getItem(`${appId}_deeplink`) ?? '',
  );
  const {
    packages,
    isLoading: packagesLoading,
    packageMap,
  } = usePackages(appId);

  const { bindings, isLoading: bindingsLoading } = useBinding(appId);
  const unusedPackages = useMemo(() => {
    if (bindingsLoading) {
      return [];
    }

    const boundPackageIds = new Set(
      bindings.map((binding) => binding.packageId),
    );
    return packages.filter(
      (pkg) => !hasLegacyVersionBinding(pkg) && !boundPackageIds.has(pkg.id),
    );
  }, [bindings, bindingsLoading, packages]);
  const { packageMetricWarnings, isLoading: packageMetricWarningsLoading } =
    usePackageMetricWarnings({
      appId,
      app,
      packages,
    });

  const { diffStatusByVersion } = useDiffStatus({
    appId,
    enabled:
      !bindingsLoading &&
      !packagesLoading &&
      (bindings.length > 0 || packages.some(hasLegacyVersionBinding)),
  });

  const value = useMemo(
    () => ({
      appId,
      app,
      deepLink,
      setDeepLink,
      packages,
      packageMap,
      unusedPackages,
      packagesLoading,
      bindings,
      bindingsLoading,
      packageMetricWarnings,
      packageMetricWarningsLoading,
      diffStatusByVersion,
    }),
    [
      app,
      appId,
      bindings,
      bindingsLoading,
      deepLink,
      diffStatusByVersion,
      packageMap,
      packages,
      packagesLoading,
      packageMetricWarnings,
      packageMetricWarningsLoading,
      unusedPackages,
    ],
  );

  return (
    <ManageContext.Provider value={value}>{children}</ManageContext.Provider>
  );
};
