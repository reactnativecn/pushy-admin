import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
    },
  },
});

export const resetAppList = () => {
  queryClient.invalidateQueries({ queryKey: ['appList'] });
};

export const resetPackages = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: ['packages', appId] });
};

export const resetVersions = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: ['versions', appId] });
};

export const resetApp = (appId: number) => {
  queryClient.invalidateQueries({ queryKey: ['app', appId] });
};
