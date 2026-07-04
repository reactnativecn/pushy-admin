import { useMutation } from '@tanstack/react-query';
import { Button, message, Result } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { activationEmailResendCooldownStorageKey } from '@/constants/local-storage';
import { api } from '@/services/api';
import { getUserEmail } from '@/services/auth';
import { useLocalStorageCooldown } from '@/utils/hooks';
import { rootRouterPath, router } from '../router';

export const Welcome = () => {
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
      message.info(t('welcome.email_sent'));
    },
    onError: () => {
      message.error(t('welcome.send_failed'));
    },
  });

  return (
    <Result
      title={
        <>
          {t('welcome.thanks_line1')}
          <br />
          {t('welcome.thanks_line2')}
          <br />
          {t('welcome.thanks_line3')}
          <div className="h-6" />
        </>
      }
      subTitle={t('welcome.no_email')}
      extra={
        <Button
          type="primary"
          onClick={() => sendEmail()}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown
            ? t('welcome.resend_countdown', { seconds: remainingSeconds })
            : t('welcome.resend_button')}
        </Button>
      }
    />
  );
};

export const Component = Welcome;
