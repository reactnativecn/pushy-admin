import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s keeps tab refocus from refetching every list; realtime pages
      // override freshness with their own refetchInterval.
      staleTime: 30_000,
      retry: false,
    },
  },
});
