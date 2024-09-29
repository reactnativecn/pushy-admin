import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
    },
  },
});

export const resetAppList = () => {
  queryClient.resetQueries({ queryKey: ['appList'] });
};

export const resetPackages = (appId: number) => {
  queryClient.resetQueries({ queryKey: ['packages', appId] });
};

export const resetVersions = (appId: number) => {
  queryClient.resetQueries({ queryKey: ['versions', appId] });
};

export const resetApp = (appId: number) => {
  queryClient.resetQueries({ queryKey: ['app', appId] });
};
