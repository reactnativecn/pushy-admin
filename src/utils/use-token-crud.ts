import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { message } from 'antd';

/**
 * API Key / MCP 连接这类「列表 + 创建 + 吊销」令牌页共用的查询与变更。
 * 失败提示由 MutationCache 兜底；创建失败时调用方不关弹窗，让用户改完重试。
 */
export function useTokenCrud<TToken extends { token?: string }, TCreateParams>({
  queryKey,
  list,
  create,
  revoke,
  createSuccessText,
  revokeSuccessText,
  onCreated,
}: {
  queryKey: QueryKey;
  list: () => Promise<{ data: TToken[] } | undefined>;
  create: (params: TCreateParams) => Promise<TToken | undefined>;
  revoke: (tokenId: number) => Promise<unknown>;
  createSuccessText: string;
  revokeSuccessText: string;
  /** 创建成功、拿到明文令牌时调用（明文只在这一次返回） */
  onCreated: (token: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey, queryFn: list });

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: (result) => {
      if (result?.token) {
        onCreated(result.token);
        message.success(createSuccessText);
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revoke,
    onSuccess: () => {
      message.success(revokeSuccessText);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    tokens: data?.data,
    isLoading,
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    revoke: revokeMutation.mutate,
  };
}
