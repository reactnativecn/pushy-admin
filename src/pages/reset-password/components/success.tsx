import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';

export default function Success() {
  const { t } = useTranslation();
  return (
    <Result
      status="success"
      title={t('reset_password.password_updated')}
      extra={[
        <Button key="login" type="primary" href="/#/login">
          {t('reset_password.login_button')}
        </Button>,
      ]}
    />
  );
}
