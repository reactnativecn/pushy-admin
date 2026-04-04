import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  useBinding,
  usePackages,
  usePackageTimestampWarnings,
} from '@/utils/hooks';

const noop = () => {};
// const asyncNoop = () => Promise.resolve();

export const defaultManageContext = {
  appId: 0,
  app: undefined,
  deepLink: '',
  setDeepLink: noop,
  packages: [],
  unusedPackages: [],
  bindings: [],
  packageMap: new Map(),
  packageTimestampWarnings: new Map(),
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
  packageTimestampWarnings: Map<number, string[]>;
  packageTimestampWarningsLoading?: boolean;
}>(defaultManageContext);

export const useManageContext = () => useContext(ManageContext);

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
    unusedPackages,
    isLoading: packagesLoading,
    packageMap,
  } = usePackages(appId);

  const { bindings, isLoading: bindingsLoading } = useBinding(appId);
  const {
    packageTimestampWarnings,
    isLoading: packageTimestampWarningsLoading,
  } = usePackageTimestampWarnings({
    appId,
    app,
    packages,
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
      packageTimestampWarnings,
      packageTimestampWarningsLoading,
    }),
    [
      app,
      appId,
      bindings,
      bindingsLoading,
      deepLink,
      packageMap,
      packages,
      packagesLoading,
      packageTimestampWarnings,
      packageTimestampWarningsLoading,
      unusedPackages,
    ],
  );

  return (
    <ManageContext.Provider value={value}>{children}</ManageContext.Provider>
  );
};
