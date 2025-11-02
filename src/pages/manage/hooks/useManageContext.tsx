import { useBinding, usePackages } from "@/utils/hooks";
import { type ReactNode, createContext, useContext, useState } from "react";

const noop = () => {};
// const asyncNoop = () => Promise.resolve();

export const defaultManageContext = {
  appId: 0,
  deepLink: "",
  setDeepLink: noop,
  packages: [],
  unusedPackages: [],
  bindings: [],
  packageMap: new Map(),
};

export const ManageContext = createContext<{
  appId: number;
  deepLink: string;
  setDeepLink: (deepLink: string) => void;
  packages: Package[];
  unusedPackages: Package[];
  packagesLoading?: boolean;
  packageMap: Map<number, Package>;
  bindings: Binding[];
  bindingsLoading?: boolean;
}>(defaultManageContext);

export const useManageContext = () => useContext(ManageContext);

export const ManageProvider = ({
  children,
  appId,
}: {
  children: ReactNode;
  appId: number;
}) => {
  const [deepLink, setDeepLink] = useState(
    window.localStorage.getItem(`${appId}_deeplink`) ?? ""
  );
  const {
    packages,
    unusedPackages,
    isLoading: packagesLoading,
    packageMap,
  } = usePackages(appId);

  const { bindings, isLoading: bindingsLoading } = useBinding(appId);

  return (
    <ManageContext.Provider
      value={{
        appId,
        deepLink,
        setDeepLink,
        packages,
        packageMap,
        unusedPackages,
        packagesLoading,
        bindings,
        bindingsLoading,
      }}
    >
      {children}
    </ManageContext.Provider>
  );
};
