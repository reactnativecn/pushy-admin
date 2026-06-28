import { useMutation } from '@tanstack/react-query';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { rootRouterPath, router } from '../router';

export const Inactivated = () => {
  const { t } = useTranslation();
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
      message.info(t('inactivated.email_sent'));
    },
    onError: () => {
      message.error(t('inactivated.send_failed'));
    },
  });
  return (
    <Result
      title={t('inactivated.title')}
      subTitle={t('inactivated.no_email')}
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown ? t('inactivated.resend_countdown', { seconds: remainingSeconds }) : t('inactivated.resend_button')}
        </Button>,
        <Button key="back" href="/user">
          {t('inactivated.back_login')}
        </Button>,
      ]}
    />
  );
};

export const Component = Inactivated;
