import { Card, Steps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import SendEmail from './components/send-email';
import SetPassword from './components/set-password';
import Success from './components/success';

const body = {
  '0': <SendEmail />,
  '1': <SetPassword />,
  '3': <Success />,
};

export const ResetPassword = () => {
  const { t } = useTranslation();
  const { step = '0' } = useParams() as { step?: keyof typeof body };
  return (
    <Card className="reset-card">
      <Steps
        className="mb-12"
        current={Number(step)}
        items={[
          { title: t('reset_password.step_email') },
          { title: t('reset_password.step_password') },
          { title: t('reset_password.step_success') },
        ]}
      />
      {body[step]}
    </Card>
  );
};

export const Component = ResetPassword;
