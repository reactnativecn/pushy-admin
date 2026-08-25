import { MutationCache, QueryClient } from '@tanstack/react-query';
import { message } from 'antd';

/** 变更失败的兜底提示：请求层没弹过的错误在这里统一弹一次。 */
const notifyMutationError = (error: unknown) => {
  if ((error as { handled?: boolean } | null)?.handled) {
    return;
  }
  const text = error instanceof Error ? error.message : String(error);
  if (text) {
    message.error(text);
  }
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // 需要自定义错误展示的变更可用 meta.silentError 退出兜底。
      if (mutation.meta?.silentError) {
        return;
      }
      notifyMutationError(error);
    },
  }),
  defaultOptions: {
    queries: {
      // 30s keeps tab refocus from refetching every list; realtime pages
      // override freshness with their own refetchInterval.
      staleTime: 30_000,
      retry: false,
    },
  },
});
