import { usePackages } from "@/utils/hooks";
import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

const noop = () => {};
// const asyncNoop = () => Promise.resolve();

export const defaultManageContext = {
  appId: 0,
  deepLink: "",
  setDeepLink: noop,
  packages: [],
  unusedPackages: [],
};

export const ManageContext = createContext<{
  appId: number;
  deepLink: string;
  setDeepLink: (deepLink: string) => void;
  packages: Package[];
  unusedPackages: Package[];
  packagesLoading?: boolean;
}>(defaultManageContext);

export const useManageContext = () => useContext(ManageContext);

export const ManageProvider = ({
  children,
  appId,
}: { children: ReactNode; appId: number }) => {
  const [deepLink, setDeepLink] = useState(
    window.localStorage.getItem(`${appId}_deeplink`) ?? "",
  );
  const {
    packages = [],
    unusedPackages = [],
    isLoading: packagesLoading,
  } = usePackages(appId);
  const contextValue = useMemo(
    () => ({
      appId,
      deepLink,
      setDeepLink,
      packages,
      unusedPackages,
      packagesLoading,
    }),
    [appId, deepLink, packages, unusedPackages, packagesLoading],
  );
  return (
    <ManageContext.Provider value={contextValue}>
      {children}
    </ManageContext.Provider>
  );
};
