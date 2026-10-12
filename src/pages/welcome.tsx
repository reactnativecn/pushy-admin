import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { useResendActivationEmail } from '@/pages/auth/use-resend-activation-email';

const Welcome = () => {
  const { t } = useTranslation();
  const { sendEmail, isPending, isCoolingDown, remainingSeconds } =
    useResendActivationEmail({
      sentMessage: t('welcome.email_sent'),
      failedMessage: t('welcome.send_failed'),
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
          onClick={sendEmail}
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
