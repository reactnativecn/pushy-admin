import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect } from 'react';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { rootRouterPath, router } from '@/router';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';

/**
 * 激活邮件重发：没有待激活邮箱时跳回登录页，发送成功后进入 60 秒冷却。
 * 欢迎页与未激活页共用；提示文案由调用方按各自命名空间传入。
 */
export function useResendActivationEmail({
  sentMessage,
  failedMessage,
}: {
  sentMessage: string;
  failedMessage: string;
}) {
  useEffect(() => {
    if (!getUserEmail()) {
      router.navigate(rootRouterPath.login);
    }
  }, []);

  const { isCoolingDown, remainingSeconds, startCooldown } =
    useLocalStorageCooldown({
      storageKey: activationEmailResendCooldownStorageKey,
      durationMs: 60_000,
    });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      startCooldown();
      message.info(sentMessage);
    },
    onError: () => {
      message.error(failedMessage);
    },
  });

  return {
    sendEmail: () => mutate(),
    isPending,
    isCoolingDown,
    remainingSeconds,
  };
}
