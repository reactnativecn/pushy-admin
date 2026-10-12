import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResendActivationEmail } from '@/pages/auth/use-resend-activation-email';
import { rootRouterPath } from '@/router';

const Inactivated = () => {
  const { t } = useTranslation();
  const { sendEmail, isPending, isCoolingDown, remainingSeconds } =
    useResendActivationEmail({
      sentMessage: t('inactivated.email_sent'),
      failedMessage: t('inactivated.send_failed'),
    });

  return (
    <Result
      title={t('inactivated.title')}
      subTitle={t('inactivated.no_email')}
      extra={[
        <Button
          key="resend"
          type="primary"
          onClick={sendEmail}
          loading={isPending}
          disabled={isCoolingDown}
        >
          {isCoolingDown
            ? t('inactivated.resend_countdown', { seconds: remainingSeconds })
            : t('inactivated.resend_button')}
        </Button>,
        <Button key="back" href={rootRouterPath.login}>
          {t('inactivated.back_login')}
        </Button>,
      ]}
    />
  );
};

export const Component = Inactivated;
