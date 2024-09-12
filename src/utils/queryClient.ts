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

export const resetAllQueries = () => {
  queryClient.invalidateQueries();
};
