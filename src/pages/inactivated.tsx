import { useMutation } from '@tanstack/react-query';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { rootRouterPath, router } from '../router';

export const Inactivated = () => {
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

  const { mutate: sendEmail, isPending } = useMutation({
    mutationFn: () => api.sendEmail({ email: getUserEmail() }),
    onSuccess: () => {
      startCooldown();
      message.info('邮件发送成功，请注意查收');
    },
    onError: () => {
      message.error('邮件发送失败');
    },
  });
  return (
    <Result
      title="您的账号还未激活，请查看您的邮箱"
      subTitle="如未收到激活邮件，请点击"
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown ? `${remainingSeconds}s 后可再次发送` : '再次发送'}
        </Button>,
        <Button key="back" href="/user">
          返回登录
        </Button>,
      ]}
    />
  );
};

export const Component = Inactivated;
