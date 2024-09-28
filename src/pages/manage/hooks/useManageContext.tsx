import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

const noop = () => {};
// const asyncNoop = () => Promise.resolve();

export const defaultManageContext = {
  appId: 0,
  deepLink: '',
  setDeepLink: noop,
};

export const ManageContext = createContext<{
  appId: number;
  deepLink: string;
  setDeepLink: (deepLink: string) => void;
}>(defaultManageContext);

export const useManageContext = () => useContext(ManageContext);

export const ManageProvider = ({ children, appId }: { children: ReactNode; appId: number }) => {
  const [deepLink, setDeepLink] = useState(window.localStorage.getItem(`${appId}_deeplink`) ?? '');
  const contextValue = useMemo(() => ({ appId, deepLink, setDeepLink }), [appId, deepLink]);
  return <ManageContext.Provider value={contextValue}>{children}</ManageContext.Provider>;
};
